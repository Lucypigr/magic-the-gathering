// ============================================================
// 天梯對手的套牌：有人拿網路上的完整套牌，有人自己改過，
// 也有人拿入門套牌、自組的部族牌，甚至是亂湊、地數不對的雜牌。
// ============================================================
import { COLLECTIBLE, STANDARD_STARTERS, STARTER_DECKS, aiDecksFor, isStandardLegal, type DeckList, type Format } from '../data';
import { colorsOf, manaValue } from '../engine/mana';
import type { CardDef, Color } from '../engine/types';
import { getDef, hasDef } from '../engine/registry';
import { SUB_ZH } from '../ui/i18n';

function defOf(id: string): CardDef | undefined {
  return hasDef(id) ? getDef(id) : undefined;
}

export type DeckKind = 'meta' | 'tuned' | 'starter' | 'homebrew' | 'tribal' | 'jank';

export const DECK_KIND_ZH: Record<DeckKind, string> = {
  meta: '環境套牌',
  tuned: '改版的環境套牌',
  starter: '入門套牌',
  homebrew: '自組套牌',
  tribal: '部族套牌',
  jank: '雜牌',
};

/** 各段位的套牌種類分布：[環境, 改版, 入門, 自組, 部族, 雜牌] */
const KIND_MIX: number[][] = [
  [8, 8, 25, 25, 12, 22],
  [15, 15, 15, 25, 12, 18],
  [25, 22, 6, 25, 12, 10],
  [38, 28, 2, 18, 9, 5],
  [52, 30, 0, 12, 5, 1],
  [65, 27, 0, 6, 2, 0],
];
const KINDS: DeckKind[] = ['meta', 'tuned', 'starter', 'homebrew', 'tribal', 'jank'];

const BASIC: Record<Color, string> = { W: 'plains', U: 'island', B: 'swamp', R: 'mountain', G: 'forest' };
const COLOR_ZH: Record<Color, string> = { W: '白', U: '藍', B: '黑', R: '紅', G: '綠' };
const ALL_COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];

type Rnd = () => number;

function pick<T>(arr: readonly T[], rnd: Rnd): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function weightedIndex(ws: number[], rnd: Rnd): number {
  const total = ws.reduce((a, b) => a + b, 0);
  let x = rnd() * total;
  for (let i = 0; i < ws.length; i++) if ((x -= ws[i]) < 0) return i;
  return ws.length - 1;
}

function shuffle<T>(arr: T[], rnd: Rnd): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const poolCache = new Map<Format, CardDef[]>();
function poolFor(format: Format): CardDef[] {
  let p = poolCache.get(format);
  if (!p) {
    p = COLLECTIBLE.filter((c) => !c.token && ['C', 'U', 'R', 'M'].includes(c.rarity) && (format === 'free' || isStandardLegal(c)));
    poolCache.set(format, p);
  }
  return p;
}

const isLand = (c: CardDef) => c.types.includes('Land');
const onColor = (c: CardDef, cols: Color[]) => colorsOf(c).every((k) => cols.includes(k));

function sizeOf(cards: Record<string, number>): number {
  return Object.values(cards).reduce((a, b) => a + b, 0);
}

/** 依顏色比例補基本地 */
function addBasics(cards: Record<string, number>, cols: Color[], n: number, rnd: Rnd): void {
  if (n <= 0) return;
  const weights = cols.map((k) => {
    let w = 0.5;
    for (const [id, cnt] of Object.entries(cards)) {
      const def = defOf(id);
      if (def && !isLand(def) && colorsOf(def).includes(k)) w += cnt;
    }
    return w;
  });
  for (let i = 0; i < n; i++) {
    const k = cols[weightedIndex(weights, rnd)];
    cards[BASIC[k]] = (cards[BASIC[k]] ?? 0) + 1;
  }
}

function styleOf(cards: Record<string, number>): DeckList['style'] {
  let creatures = 0;
  let mvSum = 0;
  let spells = 0;
  for (const [id, n] of Object.entries(cards)) {
    const def = defOf(id);
    if (!def || isLand(def)) continue;
    spells += n;
    mvSum += manaValue(def) * n;
    if (def.types.includes('Creature')) creatures += n;
  }
  const avg = spells ? mvSum / spells : 3;
  if (creatures < spells * 0.35) return 'control';
  if (avg < 2.6 && creatures >= spells * 0.55) return 'aggro';
  return 'midrange';
}

interface BuildOpts {
  size: number;
  lands: number;
  /** 每張卡的張數分布：[1張, 2張, 3張, 4張] */
  copies: number[];
  /** 依總費用的權重（索引 = 總費用，6 以上用最後一格） */
  curve: number[];
  /** 生物的比重 */
  creatureBias: number;
  /** 稀有度權重 */
  rarity: Partial<Record<CardDef['rarity'], number>>;
  duals: number;
  must?: CardDef[];
}

/** 從卡池中照權重組牌 */
function buildFromPool(pool: CardDef[], cols: Color[], o: BuildOpts, rnd: Rnd): Record<string, number> {
  const cards: Record<string, number> = {};
  const spellsTarget = o.size - o.lands;
  const add = (c: CardDef, n: number) => {
    const cur = cards[c.id] ?? 0;
    const room = Math.min(4 - cur, spellsTarget - (sizeOf(cards) - landCount()));
    if (room > 0) cards[c.id] = cur + Math.min(n, room);
  };
  const landCount = () =>
    Object.entries(cards).reduce((s, [id, n]) => {
      const d = defOf(id);
      return s + (d && isLand(d) ? n : 0);
    }, 0);
  for (const c of o.must ?? []) add(c, 1 + weightedIndex(o.copies, rnd));
  const spells = pool.filter((c) => !isLand(c) && onColor(c, cols));
  const w = spells.map((c) => {
    const mv = Math.min(manaValue(c), o.curve.length - 1);
    return o.curve[mv] * (o.rarity[c.rarity] ?? 1) * (c.types.includes('Creature') ? o.creatureBias : 1);
  });
  for (let guard = 0; guard < 400 && sizeOf(cards) - landCount() < spellsTarget && spells.length; guard++) {
    const c = spells[weightedIndex(w, rnd)];
    add(c, 1 + weightedIndex(o.copies, rnd));
  }
  // 非基本地
  const duals = shuffle(
    pool.filter((c) => isLand(c) && (c.produces ?? []).length > 0 && (c.produces ?? []).every((m) => cols.includes(m as Color) || m === 'C')),
    rnd,
  );
  let dualsLeft = o.duals;
  for (const d of duals) {
    if (dualsLeft <= 0) break;
    const n = Math.min(dualsLeft, 1 + Math.floor(rnd() * 4));
    cards[d.id] = n;
    dualsLeft -= n;
  }
  addBasics(cards, cols, o.size - sizeOf(cards), rnd);
  return cards;
}

function randomColors(n: number, rnd: Rnd): Color[] {
  return shuffle(ALL_COLORS, rnd).slice(0, n);
}

function colorName(cols: Color[]): string {
  if (cols.length === 1) return `單${COLOR_ZH[cols[0]]}`;
  if (cols.length >= 4) return `${cols.length}色`;
  return cols.map((k) => COLOR_ZH[k]).join('');
}

function colorsIn(cards: Record<string, number>): Color[] {
  const set = new Set<Color>();
  for (const id of Object.keys(cards)) {
    const d = defOf(id);
    if (d && !isLand(d)) for (const k of colorsOf(d)) set.add(k);
  }
  return ALL_COLORS.filter((k) => set.has(k));
}

const NORMAL_CURVE = [0.3, 1.2, 1.6, 1.5, 1.1, 0.7, 0.35];
const AGGRO_CURVE = [0.3, 1.8, 1.8, 1.1, 0.5, 0.2, 0.1];
const BIG_CURVE = [0.2, 0.6, 1, 1.3, 1.4, 1.2, 1];
const JANK_CURVE = [0.5, 1, 1, 1, 1, 1, 1.2];

function makeHomebrew(format: Format, rnd: Rnd, uid: string): DeckList {
  const pool = poolFor(format);
  const cols = randomColors(rnd() < 0.2 ? 1 : rnd() < 0.85 ? 2 : 3, rnd);
  const size = format === 'free' && rnd() < 0.45 ? 40 : 60;
  const flavor = pick(['快攻', '中速', '大隻', '控制'] as const, rnd);
  const curve = flavor === '快攻' ? AGGRO_CURVE : flavor === '大隻' ? BIG_CURVE : NORMAL_CURVE;
  const cards = buildFromPool(
    pool,
    cols,
    {
      size,
      lands: Math.round(size * (flavor === '快攻' ? 0.38 : flavor === '大隻' ? 0.43 : 0.41)),
      copies: [2, 3, 3, 3],
      curve,
      creatureBias: flavor === '控制' ? 0.6 : flavor === '快攻' ? 1.8 : 1.3,
      rarity: { C: 1.2, U: 1, R: 0.7, M: 0.45 },
      duals: cols.length > 1 ? Math.floor(rnd() * 7) : 0,
    },
    rnd,
  );
  const suffix = pick(['', '', '（自組）', ' v2', '（測試中）', '（改）'], rnd);
  return { id: `opp-${uid}`, name: `${colorName(cols)}${flavor}${suffix}`, desc: '對手自組的套牌', colors: cols, cards, style: styleOf(cards) };
}

function makeTribal(format: Format, rnd: Rnd, uid: string): DeckList {
  const pool = poolFor(format);
  const byType = new Map<string, CardDef[]>();
  for (const c of pool) {
    if (!c.types.includes('Creature')) continue;
    for (const t of c.subtypes ?? []) {
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(c);
    }
  }
  const tribes = [...byType.entries()].filter(([, list]) => list.length >= 12);
  const [tribe, members] = pick(tribes, rnd);
  // 選這個部族最常見的兩個顏色
  const count: Record<string, number> = {};
  for (const m of members) for (const k of colorsOf(m)) count[k] = (count[k] ?? 0) + 1;
  const cols = (Object.entries(count) as [Color, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, rnd() < 0.3 ? 1 : 2)
    .map(([k]) => k);
  if (!cols.length) cols.push(pick(ALL_COLORS, rnd));
  const must = shuffle(
    members.filter((m) => onColor(m, cols)),
    rnd,
  ).slice(0, 12);
  const size = 60;
  const cards = buildFromPool(
    pool,
    cols,
    {
      size,
      lands: 24,
      copies: [3, 3, 2, 2],
      curve: NORMAL_CURVE,
      creatureBias: 1,
      rarity: { C: 1, U: 1, R: 0.8, M: 0.6 },
      duals: cols.length > 1 ? Math.floor(rnd() * 5) : 0,
      must,
    },
    rnd,
  );
  const zh = SUB_ZH[tribe] ?? tribe;
  const name = pick([`${zh}部族`, `${zh}大軍`, `我的${zh}`, `${colorName(cols)}${zh}`], rnd);
  return { id: `opp-${uid}`, name, desc: '對手自組的部族套牌', colors: colorsIn(cards), cards, style: styleOf(cards) };
}

function makeJank(format: Format, rnd: Rnd, uid: string): DeckList {
  const pool = poolFor(format);
  const cols = randomColors(2 + Math.floor(rnd() * 4), rnd);
  const min = format === 'standard' ? 60 : 40;
  const size = min + (rnd() < 0.5 ? 0 : Math.floor(rnd() * 25));
  // 地數常常不對：太少或太多
  const lands = Math.max(12, Math.round(size * (rnd() < 0.5 ? 0.24 + rnd() * 0.12 : 0.44 + rnd() * 0.1)));
  const cards = buildFromPool(
    pool,
    cols,
    {
      size,
      lands,
      copies: [5, 3, 1, 1],
      curve: JANK_CURVE,
      creatureBias: 1,
      rarity: { C: 1, U: 1, R: 1.1, M: 1.2 },
      duals: Math.floor(rnd() * 4),
    },
    rnd,
  );
  const name = pick(['隨便組的', '收藏大雜燴', `${colorName(cols)}什麼都放`, '抽到什麼打什麼', '新手亂組', '好卡全放', '我的第一副牌', '開包開到的'], rnd);
  return { id: `opp-${uid}`, name, desc: '對手亂湊的套牌', colors: colorsIn(cards), cards, style: 'midrange' };
}

/** 環境套牌拿掉幾張，換成自己喜歡的卡 */
function makeTuned(base: DeckList, format: Format, rnd: Rnd, uid: string): DeckList {
  const pool = poolFor(format);
  const cards = { ...base.cards };
  const cols = base.colors.length ? base.colors : colorsIn(cards);
  const nonland = Object.keys(cards).filter((id) => {
    const d = defOf(id);
    return d && !isLand(d);
  });
  let removed = 0;
  const target = 3 + Math.floor(rnd() * 8);
  for (const id of shuffle(nonland, rnd)) {
    if (removed >= target) break;
    const n = Math.min(cards[id], 1 + Math.floor(rnd() * cards[id]), target - removed);
    cards[id] -= n;
    removed += n;
    if (cards[id] <= 0) delete cards[id];
  }
  const options = pool.filter((c) => !isLand(c) && onColor(c, cols));
  for (let guard = 0; removed > 0 && guard < 100; guard++) {
    const c = pick(options, rnd);
    const cur = cards[c.id] ?? 0;
    if (cur >= 4) continue;
    const n = Math.min(removed, 4 - cur, 1 + Math.floor(rnd() * 3));
    cards[c.id] = cur + n;
    removed -= n;
  }
  // 偶爾多放或少放一張地
  const basicIds = cols.map((k) => BASIC[k]);
  for (let i = 0; i < removed; i++) {
    const b = pick(basicIds, rnd);
    cards[b] = (cards[b] ?? 0) + 1;
  }
  if (rnd() < 0.2) {
    const b = pick(basicIds, rnd);
    cards[b] = (cards[b] ?? 0) + 1;
  }
  const name = pick([`${base.name}（改）`, `${base.name}（自改版）`, base.name, `${base.name} 預算版`], rnd);
  return { ...base, id: `opp-${uid}`, name, cards };
}

/** 入門套牌，可能加了幾張開包拿到的卡 */
function makeStarter(format: Format, rnd: Rnd, uid: string): DeckList {
  const base = pick(format === 'standard' ? STANDARD_STARTERS : STARTER_DECKS, rnd);
  if (rnd() < 0.5) return base;
  return { ...makeTuned(base, format, rnd, uid), name: `${base.name.replace(/（.*）/, '')}（加了新卡）` };
}

export function buildOpponentDeck(format: Format, tier: number, rnd: Rnd = Math.random): { deck: DeckList; kind: DeckKind } {
  const uid = Math.floor(rnd() * 1e9).toString(36);
  const kind = KINDS[weightedIndex(KIND_MIX[Math.min(tier, 5)], rnd)];
  switch (kind) {
    case 'meta':
      return { deck: pick(aiDecksFor(format), rnd), kind };
    case 'tuned':
      return { deck: makeTuned(pick(aiDecksFor(format), rnd), format, rnd, uid), kind };
    case 'starter':
      return { deck: makeStarter(format, rnd, uid), kind };
    case 'homebrew':
      return { deck: makeHomebrew(format, rnd, uid), kind };
    case 'tribal':
      return { deck: makeTribal(format, rnd, uid), kind };
    case 'jank':
      return { deck: makeJank(format, rnd, uid), kind };
  }
}
