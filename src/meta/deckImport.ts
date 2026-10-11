// ============================================================
// 抄牌組：解析各抄牌網的牌表文字／網址，對應到遊戲內的卡牌
// ============================================================
import { BASIC_LANDS, COLLECTIBLE, STANDARD_AI_DECKS, isStandardLegal } from '../data';
import { zhName } from '../data/names';
import { colorsOf, manaValue } from '../engine/mana';
import { getDef } from '../engine/registry';
import type { CardDef, Color, Rarity } from '../engine/types';
import { MAX_COPIES, isBasic, type Profile } from './profile';

export interface DeckLine {
  n: number;
  name: string;
}

export interface ParsedDeck {
  name?: string;
  main: DeckLine[];
  side: DeckLine[];
}

/** 熱門牌組快照（public/netdecks.json）中的一副牌 */
export interface NetDeck {
  id: string;
  source: 'mtggoldfish' | 'mtgtop8';
  url: string;
  archetypeUrl?: string;
  name: string;
  player?: string;
  event?: string;
  rank?: string;
  players?: number;
  date?: string;
  share?: number;
  colors?: string;
  main: [number, string][];
  side: [number, string][];
}

export interface NetDeckSnapshot {
  updated: string;
  decks: NetDeck[];
  /** 卡名 → 類別、法術力值、顏色（colors 為 "WU" 這樣的字串） */
  cards?: Record<string, { land: boolean; creature: boolean; mv: number; colors: string }>;
}

/** 把快照裡的卡牌資訊轉成 resolveDeck 用的格式 */
export function snapshotInfo(snap: NetDeckSnapshot): Record<string, CardInfo> {
  const out: Record<string, CardInfo> = {};
  for (const [name, c] of Object.entries(snap.cards ?? {})) out[normName(name)] = { ...c, colors: [...c.colors].filter((x): x is Color => 'WUBRG'.includes(x)) };
  return out;
}

// ---------- 牌表文字 ----------

const SECTION_SIDE = /^(sideboard|side ?board:?|備牌|sb:?)$/i;
const SECTION_MAIN = /^(deck|main ?deck|maindeck|main|主牌|套牌)$/i;
const SECTION_SKIP = /^(commander|companion|maybeboard|considering|tokens?)$/i;

/**
 * 解析常見的牌表格式：
 * - MTG Arena：「4 Lightning Strike (FDN) 149」，含 Deck／Sideboard 標題與 About／Name 區段
 * - MTGO／MTGGoldfish／MTGTop8：「4 Lightning Strike」，空行或 Sideboard 之後為備牌
 * - .dec：「4 [FDN] Lightning Strike」、「SB: 2 Negate」
 * - 「4x Lightning Strike」、「Lightning Strike x4」
 */
export function parseDeckText(text: string): ParsedDeck {
  const out: ParsedDeck = { main: [], side: [] };
  let cur: DeckLine[] | null = out.main;
  let sawMainHeader = false;
  let inAbout = false;
  for (const raw of text.replace(/ /g, ' ').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      inAbout = false;
      // MTGO 匯出：主牌與備牌之間以空行分隔（Arena 格式則有明確的標題）
      if (cur === out.main && out.main.length && !sawMainHeader) cur = out.side;
      continue;
    }
    if (line.startsWith('//')) {
      const m = line.match(/^\/\/\s*NAME\s*:\s*(.+)$/i);
      if (m && m[1].trim()) out.name = m[1].trim();
      continue;
    }
    if (/^about$/i.test(line)) {
      inAbout = true;
      continue;
    }
    if (inAbout) {
      const m = line.match(/^name\s+(.+)$/i);
      if (m) out.name = m[1].trim();
      continue;
    }
    const head = line.replace(/:$/, '');
    if (SECTION_SIDE.test(head)) {
      cur = out.side;
      continue;
    }
    if (SECTION_MAIN.test(head)) {
      cur = out.main;
      sawMainHeader = true;
      continue;
    }
    if (SECTION_SKIP.test(head)) {
      cur = null;
      continue;
    }
    let target = cur;
    let body = line;
    const sb = body.match(/^SB:\s*(.+)$/i);
    if (sb) {
      target = out.side;
      body = sb[1];
    }
    if (!target) continue;
    let m = body.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    let n: number;
    let name: string;
    if (m) {
      n = +m[1];
      name = m[2];
    } else {
      m = body.match(/^(.+?)\s+[xX]?(\d+)$/);
      if (!m) continue;
      n = +m[2];
      name = m[1];
    }
    name = name
      .replace(/^\[[^\]]*\]\s*/, '') // .dec 的 [SET]
      .replace(/\s+\([A-Za-z0-9]{2,6}\)(\s+[\w-]+)?\s*$/, '') // Arena 的 (SET) 編號
      .replace(/\s+\*[A-Z]+\*$/, '') // *F* 之類的標記
      .replace(/\s+#\S+$/, '')
      .trim();
    if (!name || n <= 0) continue;
    const prev = target.find((x) => normName(x.name) === normName(name));
    if (prev) prev.n += n;
    else target.push({ n, name });
  }
  return out;
}

// ---------- 卡名對應 ----------

export function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s*\/\/?\s*/g, ' // ')
    .replace(/^a-/, '') // Alchemy 重製版的 A- 前綴
    .replace(/\s+/g, ' ')
    .trim();
}

let index: Map<string, string> | null = null;

function buildIndex(): Map<string, string> {
  const m = new Map<string, string>();
  const put = (k: string | undefined, id: string) => {
    if (!k) return;
    const key = normName(k);
    if (!m.has(key)) m.set(key, id);
  };
  for (const d of [...COLLECTIBLE, ...BASIC_LANDS.map(getDef)]) {
    put(d.name, d.id);
    put(d.imageName, d.id);
    if (d.imageName?.includes('//')) put(d.imageName.split('//')[0], d.id);
    put(d.back?.name, d.id);
    put(d.adventure?.name, d.id);
  }
  // 基本地的中文名稱
  for (const id of BASIC_LANDS) put(getDef(id).zh, id);
  return m;
}

/** 依卡名（英文、雙面卡任一面、冒險名稱、中文名）找遊戲內的卡；找不到回傳 null */
export function findCard(name: string): CardDef | null {
  index ??= buildIndex();
  const key = normName(name);
  let id = index.get(key) ?? index.get(key.split(' // ')[0]);
  if (!id) {
    // 中文卡名在載入中文資料後才有，所以每次現查
    const hit = COLLECTIBLE.find((d) => zhName(d) === name.trim());
    id = hit?.id;
  }
  return id ? getDef(id) : null;
}

// ---------- 套用到收藏 ----------

/** 用金幣購買單卡的價格（約為出售價的 4～5 倍） */
export const BUY_PRICE: Record<Rarity, number> = { C: 20, U: 50, R: 150, M: 300, L: 0, T: 0 };

/** 遊戲未收錄的卡的基本資訊（向 Scryfall 查詢） */
export interface CardInfo {
  land: boolean;
  creature: boolean;
  mv: number;
  colors: Color[];
}

export interface ResolvedLine {
  name: string;
  n: number;
  /** 遊戲內對應的卡（未收錄時為代替卡，見 sub） */
  def: CardDef | null;
  /** def 是代替卡（原卡未收錄） */
  sub?: boolean;
  /** 未收錄的地，改用基本地 */
  landSub?: boolean;
  /** 已擁有、可以放進套牌的數量 */
  owned: number;
  /** 還缺幾張 */
  missing: number;
}

export interface ImportPlan {
  lines: ResolvedLine[];
  /** 牌表的主牌總數 */
  total: number;
  /** 原卡就有收錄的張數 */
  exact: number;
  /** 未收錄的地由基本地代替的張數 */
  landSubs: number;
  /** 由代替卡補上的張數 */
  spellSubs: number;
  /** 完全沒辦法放入的張數 */
  dropped: number;
  /** 補齊缺卡需要的金幣 */
  cost: number;
}

const RARITY_SCORE: Record<Rarity, number> = { M: 3, R: 2, U: 1, C: 0, L: 0, T: 0 };
let popular: Map<string, number> | null = null;

/** AI 的競技套牌用到的卡，當作代替卡的優先人選 */
function popularity(): Map<string, number> {
  if (popular) return popular;
  popular = new Map();
  for (const d of STANDARD_AI_DECKS) for (const [id, n] of Object.entries(d.cards)) popular.set(id, (popular.get(id) ?? 0) + n);
  return popular;
}

/** 依顏色、法術力值、是否為生物，從遊戲有收錄的卡中挑一張代替 */
function pickSubstitute(info: CardInfo, deckColors: Set<Color>, used: Map<string, number>, standard: boolean): CardDef | null {
  const pop = popularity();
  let best: CardDef | null = null;
  let bestScore = Infinity;
  for (const d of COLLECTIBLE) {
    if (d.types.includes('Land') || (used.get(d.id) ?? 0) >= MAX_COPIES) continue;
    if (standard && !isStandardLegal(d)) continue;
    const cs = colorsOf(d);
    if (cs.some((c) => !deckColors.has(c))) continue;
    const creature = d.types.includes('Creature');
    let score = Math.abs(manaValue(d) - info.mv) * 3 + (creature !== info.creature ? 6 : 0);
    // 顏色和原卡相同比較好
    if (info.colors.length) score += info.colors.some((c) => cs.includes(c)) ? 0 : 2;
    score -= RARITY_SCORE[d.rarity] * 0.6 + Math.min(8, pop.get(d.id) ?? 0) * 0.5;
    // 已經用過的代替卡優先（湊成 4 張比較像正常的套牌）
    if (used.has(d.id)) score -= 1;
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export interface ResolveOptions {
  /** 未收錄的卡的資訊（Scryfall），以 normName 為鍵 */
  info?: Record<string, CardInfo>;
  /** 未收錄的非地卡自動找代替卡 */
  substitute?: boolean;
  /** 代替卡只用標準賽合法的卡 */
  standard?: boolean;
}

export function resolveDeck(p: Profile, deck: ParsedDeck, opts: ResolveOptions = {}): ImportPlan {
  const info = opts.info ?? {};
  const merged = new Map<string, ResolvedLine>();
  const unknown: DeckLine[] = [];
  for (const l of deck.main) {
    const def = findCard(l.name);
    if (!def) {
      unknown.push(l);
      continue;
    }
    const cur = merged.get(def.id);
    if (cur) cur.n += l.n;
    else merged.set(def.id, { name: l.name, n: l.n, def, owned: 0, missing: 0 });
  }
  const lines = [...merged.values()];
  const exact = lines.reduce((s, l) => s + (isBasic(l.def!.id) ? l.n : Math.min(l.n, MAX_COPIES)), 0);

  // 套牌顏色：收錄的非地卡 + 未收錄卡（Scryfall 查到的顏色）
  const deckColors = new Set<Color>();
  for (const l of lines) if (!l.def!.types.includes('Land')) colorsOf(l.def!).forEach((c) => deckColors.add(c));
  for (const l of unknown) info[normName(l.name)]?.colors.forEach((c) => deckColors.add(c));
  if (!deckColors.size) (['W', 'U', 'B', 'R', 'G'] as Color[]).forEach((c) => deckColors.add(c));

  const used = new Map<string, number>(lines.map((l) => [l.def!.id, Math.min(l.n, MAX_COPIES)]));
  let landSubs = 0;
  let spellSubs = 0;
  let dropped = 0;
  for (const l of unknown) {
    const ci = info[normName(l.name)] ?? info[normName(l.name.split(' // ')[0])];
    if (ci?.land) {
      landSubs += l.n;
      lines.push({ name: l.name, n: l.n, def: null, landSub: true, owned: 0, missing: 0 });
      continue;
    }
    if (!opts.substitute || !ci) {
      dropped += l.n;
      lines.push({ name: l.name, n: l.n, def: null, owned: 0, missing: 0 });
      continue;
    }
    // 一張卡最多 4 張，不夠時再找下一張代替卡
    let left = l.n;
    while (left > 0) {
      const sub = pickSubstitute(ci, deckColors, used, !!opts.standard);
      if (!sub) break;
      const k = Math.min(left, MAX_COPIES - (used.get(sub.id) ?? 0));
      used.set(sub.id, (used.get(sub.id) ?? 0) + k);
      lines.push({ name: l.name, n: k, def: sub, sub: true, owned: 0, missing: 0 });
      spellSubs += k;
      left -= k;
    }
    if (left > 0) {
      dropped += left;
      lines.push({ name: l.name, n: left, def: null, owned: 0, missing: 0 });
    }
  }

  // 收藏：同一張卡（原卡與代替卡合計）最多 4 張
  let cost = 0;
  const have = new Map<string, number>();
  for (const l of lines) {
    if (!l.def) continue;
    if (isBasic(l.def.id)) {
      l.owned = l.n;
      continue;
    }
    const want = Math.min(l.n, MAX_COPIES);
    const left = Math.max(0, (p.collection[l.def.id] ?? 0) - (have.get(l.def.id) ?? 0));
    l.owned = Math.min(want, left);
    have.set(l.def.id, (have.get(l.def.id) ?? 0) + l.owned);
    l.missing = want - l.owned;
    cost += l.missing * BUY_PRICE[l.def.rarity];
  }
  const total = deck.main.reduce((s, l) => s + l.n, 0);
  return { lines, total, exact, landSubs, spellSubs, dropped, cost };
}

const BASIC_OF: Record<Color, string> = { W: 'plains', U: 'island', B: 'swamp', R: 'mountain', G: 'forest' };

/**
 * 依照計畫組出套牌。
 * - withMissing：包含收藏不足的卡（之後買齊或開包取得）
 * - 未收錄的地依套牌顏色比例換成基本地
 */
export function buildCards(plan: ImportPlan, withMissing: boolean): Record<string, number> {
  const cards: Record<string, number> = {};
  for (const l of plan.lines) {
    if (!l.def) continue;
    const n = isBasic(l.def.id) ? l.n : withMissing ? Math.min(l.n, MAX_COPIES) : l.owned;
    if (n > 0) cards[l.def.id] = Math.min((cards[l.def.id] ?? 0) + n, isBasic(l.def.id) ? Infinity : MAX_COPIES);
  }
  if (plan.landSubs > 0) {
    const pips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const l of plan.lines) {
      if (!l.def || l.def.types.includes('Land')) continue;
      for (const c of (l.def.cost ?? '').match(/[WUBRG]/g) ?? []) pips[c as Color] += l.n;
    }
    let colors = (Object.keys(pips) as Color[]).filter((c) => pips[c] > 0);
    if (!colors.length) colors = ['W', 'U', 'B', 'R', 'G'];
    const total = colors.reduce((s, c) => s + (pips[c] || 1), 0);
    const alloc = colors.map((c) => ({ c, n: Math.floor((plan.landSubs * (pips[c] || 1)) / total) }));
    let left = plan.landSubs - alloc.reduce((s, a) => s + a.n, 0);
    alloc.sort((a, b) => (pips[b.c] || 1) - (pips[a.c] || 1));
    for (let i = 0; left > 0; i = (i + 1) % alloc.length, left--) alloc[i].n++;
    for (const a of alloc) if (a.n > 0) cards[BASIC_OF[a.c]] = (cards[BASIC_OF[a.c]] ?? 0) + a.n;
  }
  return cards;
}

/** 買下缺少的卡（金幣不足時回傳 false，不做任何變更） */
export function buyMissing(p: Profile, plan: ImportPlan): boolean {
  if (p.gold < plan.cost) return false;
  p.gold -= plan.cost;
  for (const l of plan.lines) if (l.def && l.missing > 0) p.collection[l.def.id] = (p.collection[l.def.id] ?? 0) + l.missing;
  return true;
}

export function snapshotToParsed(d: NetDeck): ParsedDeck {
  return {
    name: d.name,
    main: d.main.map(([n, name]) => ({ n, name })),
    side: d.side.map(([n, name]) => ({ n, name })),
  };
}

// ---------- 網址 ----------

export interface UrlPlan {
  site: string;
  /** 依序嘗試的下載網址 */
  fetch: string[];
  kind: 'text' | 'archidekt' | 'moxfield' | 'goldfish-page';
  /** 對應到快照中的 id（若有） */
  snapshotId?: string;
}

/** 從抄牌網的網址判斷要下載哪個匯出連結 */
export function planUrl(input: string): UrlPlan | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'mtgtop8.com') {
    const d = u.searchParams.get('d');
    if (!d) return null;
    return { site: 'MTGTop8', fetch: [`https://mtgtop8.com/mtgo?d=${d}`], kind: 'text', snapshotId: `t8-${d}` };
  }
  if (host === 'mtggoldfish.com') {
    const m = u.pathname.match(/^\/deck\/(?:download\/|arena_download\/|visual\/)?(\d+)/);
    if (m) return { site: 'MTGGoldfish', fetch: [`https://www.mtggoldfish.com/deck/download/${m[1]}`], kind: 'text', snapshotId: `gf-${m[1]}` };
    if (u.pathname.startsWith('/archetype/')) return { site: 'MTGGoldfish', fetch: [`https://www.mtggoldfish.com${u.pathname}`], kind: 'goldfish-page' };
    return null;
  }
  if (host === 'archidekt.com') {
    const m = u.pathname.match(/^\/decks\/(\d+)/);
    return m ? { site: 'Archidekt', fetch: [`https://archidekt.com/api/decks/${m[1]}/`], kind: 'archidekt' } : null;
  }
  if (host === 'moxfield.com') {
    const m = u.pathname.match(/^\/decks\/([\w-]+)/);
    return m ? { site: 'Moxfield', fetch: [`https://api2.moxfield.com/v3/decks/all/${m[1]}`, `https://api2.moxfield.com/v2/decks/all/${m[1]}`], kind: 'moxfield' } : null;
  }
  if (host === 'tappedout.net') {
    const m = u.pathname.match(/^\/mtg-decks\/([\w-]+)/);
    return m ? { site: 'TappedOut', fetch: [`https://tappedout.net/mtg-decks/${m[1]}/?fmt=txt`], kind: 'text' } : null;
  }
  if (host === 'aetherhub.com') {
    const m = u.pathname.match(/\/(\d+)\/?$/) ?? u.pathname.match(/-(\d+)\/?$/);
    return m ? { site: 'AetherHub', fetch: [`https://aetherhub.com/Deck/MtgoDeckExport/${m[1]}`], kind: 'text' } : null;
  }
  if (host === 'mtgdecks.net') {
    const path = u.pathname.replace(/\/$/, '');
    return { site: 'MTGDecks', fetch: [`https://mtgdecks.net${path}/txt`], kind: 'text' };
  }
  // 其他網址：直接下載，若內容像牌表就接受
  return { site: host, fetch: [u.toString()], kind: 'text' };
}

/** 抄牌網大多不允許網頁直接讀取，失敗時改走公開的 CORS 代理 */
const PROXIES = [(u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`];

async function fetchText(url: string, fetcher: typeof fetch): Promise<string> {
  const tries = [url, ...PROXIES.map((p) => p(url))];
  let last: unknown;
  for (const t of tries) {
    try {
      const res = await fetcher(t, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.trim()) return text;
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error('下載失敗');
}

interface ArchidektJson {
  name?: string;
  cards?: { quantity: number; categories?: string[]; card?: { oracleCard?: { name?: string } } }[];
}
interface MoxfieldJson {
  name?: string;
  mainboard?: Record<string, { quantity: number; card?: { name?: string } }>;
  sideboard?: Record<string, { quantity: number; card?: { name?: string } }>;
  boards?: Record<string, { cards?: Record<string, { quantity: number; card?: { name?: string } }> }>;
}

/** 依網址下載並解析牌表 */
export async function importFromUrl(input: string, fetcher: typeof fetch = fetch): Promise<ParsedDeck & { site: string }> {
  const plan = planUrl(input);
  if (!plan) throw new Error('看不懂這個網址');
  let lastErr: unknown;
  for (const url of plan.fetch) {
    try {
      const body = await fetchText(url, fetcher);
      if (plan.kind === 'goldfish-page') {
        const id = body.match(/\/deck\/download\/(\d+)/)?.[1];
        if (!id) throw new Error('找不到牌組');
        const text = await fetchText(`https://www.mtggoldfish.com/deck/download/${id}`, fetcher);
        const name = body.match(/<title>\s*([^<]+?) Deck for Magic/)?.[1];
        return { ...parseDeckText(text), name, site: plan.site };
      }
      if (plan.kind === 'archidekt') {
        const j = JSON.parse(body) as ArchidektJson;
        const out: ParsedDeck = { name: j.name, main: [], side: [] };
        for (const c of j.cards ?? []) {
          const name = c.card?.oracleCard?.name;
          if (!name) continue;
          const cats = c.categories ?? [];
          if (cats.some((x) => /maybeboard|commander/i.test(x))) continue;
          (cats.some((x) => /sideboard/i.test(x)) ? out.side : out.main).push({ n: c.quantity, name });
        }
        return { ...out, site: plan.site };
      }
      if (plan.kind === 'moxfield') {
        const j = JSON.parse(body) as MoxfieldJson;
        const board = (b?: Record<string, { quantity: number; card?: { name?: string } }>) =>
          Object.values(b ?? {}).flatMap((c) => (c.card?.name ? [{ n: c.quantity, name: c.card.name }] : []));
        return {
          name: j.name,
          main: board(j.boards?.mainboard?.cards ?? j.mainboard),
          side: board(j.boards?.sideboard?.cards ?? j.sideboard),
          site: plan.site,
        };
      }
      if (/<html|<!doctype/i.test(body.slice(0, 500))) throw new Error('下載到的是網頁而不是牌表');
      const parsed = parseDeckText(body);
      if (!parsed.main.length) throw new Error('內容不是牌表');
      return { ...parsed, site: plan.site };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('下載失敗');
}

/** 查詢遊戲未收錄的卡的類別、顏色與法術力值（用來找代替卡） */
export async function lookupCards(names: string[], fetcher: typeof fetch = fetch): Promise<Record<string, CardInfo>> {
  const out: Record<string, CardInfo> = {};
  for (let i = 0; i < names.length; i += 75) {
    const batch = names.slice(i, i + 75);
    try {
      const res = await fetcher('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: batch.map((name) => ({ name: name.split(' // ')[0] })) }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as {
        data: { name: string; type_line?: string; cmc?: number; colors?: string[]; color_identity?: string[]; card_faces?: { type_line?: string; colors?: string[] }[] }[];
      };
      for (const c of j.data) {
        const front = (c.card_faces?.[0]?.type_line ?? c.type_line ?? '').split(' // ')[0];
        const colors = (c.colors ?? c.card_faces?.[0]?.colors ?? c.color_identity ?? []).filter((x): x is Color => 'WUBRG'.includes(x));
        const ci: CardInfo = { land: /\bLand\b/.test(front), creature: /\bCreature\b/.test(front), mv: c.cmc ?? 0, colors };
        out[normName(c.name)] = ci;
        out[normName(c.name.split(' // ')[0])] = ci;
      }
    } catch {
      // 查不到的卡就直接略過
    }
  }
  return out;
}

/** 卡牌顏色（用於顯示快照牌組的顏色） */
export function deckColorsOf(lines: DeckLine[]): Color[] {
  const set = new Set<Color>();
  for (const l of lines) {
    const d = findCard(l.name);
    if (!d || d.types.includes('Land')) continue;
    for (const c of (d.cost ?? '').match(/[WUBRG]/g) ?? []) set.add(c as Color);
  }
  return (['W', 'U', 'B', 'R', 'G'] as Color[]).filter((c) => set.has(c));
}
