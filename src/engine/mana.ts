import type { CardDef, Color, Mana } from './types';

export const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];

export interface ManaCost {
  generic: number;
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  C: number;
  /** 混色法術力，例如 'WB' 代表 {W/B}（可用其中任一色支付） */
  hyb?: string[];
  /** 單色混合法術力 {2/R}：可以用一點該色法術力，或兩點任何法術力支付 */
  twoHyb?: Mana[];
  /** 費用中 {X} 的數量（施放時由玩家決定 X） */
  x?: number;
}

const costCache = new Map<string, ManaCost>();

export function emptyCost(): ManaCost {
  return { generic: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
}

export function parseCost(cost: string | undefined): ManaCost {
  if (!cost) return emptyCost();
  const cached = costCache.get(cost);
  if (cached) return { ...cached, hyb: cached.hyb?.slice(), twoHyb: cached.twoHyb?.slice() };
  const out = emptyCost();
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cost))) {
    const sym = m[1];
    if (/^\d+$/.test(sym)) out.generic += parseInt(sym, 10);
    else if (sym === 'X') out.x = (out.x ?? 0) + 1;
    else if (sym === 'W' || sym === 'U' || sym === 'B' || sym === 'R' || sym === 'G' || sym === 'C') out[sym] += 1;
    else if (/^[WUBRG]\/[WUBRG]$/.test(sym)) (out.hyb ??= []).push(sym[0] + sym[2]);
    else if (/^2\/[WUBRG]$/.test(sym)) (out.twoHyb ??= []).push(sym[2] as Mana);
  }
  costCache.set(cost, { ...out, hyb: out.hyb?.slice(), twoHyb: out.twoHyb?.slice() });
  return out;
}

export function costTotal(c: ManaCost): number {
  return c.generic + c.W + c.U + c.B + c.R + c.G + c.C + (c.hyb?.length ?? 0) + (c.twoHyb?.length ?? 0) * 2;
}

export function manaValue(def: CardDef): number {
  return costTotal(parseCost(def.cost));
}

export function addCosts(a: ManaCost, b: ManaCost): ManaCost {
  return {
    generic: a.generic + b.generic,
    W: a.W + b.W,
    U: a.U + b.U,
    B: a.B + b.B,
    R: a.R + b.R,
    G: a.G + b.G,
    C: a.C + b.C,
    hyb: a.hyb || b.hyb ? [...(a.hyb ?? []), ...(b.hyb ?? [])] : undefined,
    twoHyb: a.twoHyb || b.twoHyb ? [...(a.twoHyb ?? []), ...(b.twoHyb ?? [])] : undefined,
  };
}

/** 從費用中扣除（不會低於 0；有色部分無法扣除時改扣通用） */
export function reduceCost(c: ManaCost, by: ManaCost): ManaCost {
  const out = { ...c, hyb: c.hyb?.slice(), twoHyb: c.twoHyb?.slice() };
  let extra = 0;
  for (const k of ['W', 'U', 'B', 'R', 'G', 'C'] as const) {
    const r = Math.min(out[k], by[k]);
    out[k] -= r;
    extra += by[k] - r;
  }
  let gen = by.generic + extra;
  const g0 = Math.min(out.generic, gen);
  out.generic -= g0;
  gen -= g0;
  // 通用減免用完一般費用後，再抵混色
  while (gen > 0 && out.hyb?.length) {
    out.hyb.pop();
    gen--;
  }
  return out;
}

export function colorsOf(def: CardDef): Color[] {
  if (def.colors) return def.colors;
  const c = parseCost(def.cost);
  return COLORS.filter((k) => c[k] > 0 || c.hyb?.some((h) => h.includes(k)) || c.twoHyb?.includes(k));
}

export function costToString(c: ManaCost): string {
  let s = '';
  if (c.generic > 0 || costTotal(c) === 0) s += `{${c.generic}}`;
  for (const k of ['C', 'W', 'U', 'B', 'R', 'G'] as const) s += `{${k}}`.repeat(c[k]);
  for (const h of c.hyb ?? []) s += `{${h[0]}/${h[1]}}`;
  for (const k of c.twoHyb ?? []) s += `{2/${k}}`;
  return s;
}

export interface ManaSource {
  id: number;
  produces: Mana[];
  isCreature: boolean;
  /** 用完就要犧牲（珍寶）：最後才使用 */
  sac?: boolean;
  /** 過濾地：多付一點法術力（由另一個來源）就能產生任意顏色 */
  filter?: boolean;
  /** 產生有色法術力要支付1點生命：盡量晚一點使用 */
  pain?: boolean;
  /** 召集：橫置生物來支付 */
  convoke?: boolean;
  /** 來自法術力池（用掉就從池中移除；優先使用） */
  pool?: boolean;
  /** 額外的一點法術力（來自某個永久物的加成，不會橫置任何東西；排在最後才用） */
  extra?: boolean;
}

/**
 * 找出一組能支付費用的法術力來源。回傳 [來源id, 產生的顏色] 陣列，或 null。
 * 有色需求以回溯法分配；通用費用優先使用「最不重要」的來源。
 */
export function findPayment(cost: ManaCost, sources: ManaSource[]): { id: number; mana: Mana }[] | null {
  const th = cost.twoHyb ?? [];
  if (!th.length) return findPaymentBase(cost, sources);
  // {2/R} 這類費用：每個可以用一點該色法術力，或兩點任何法術力；優先用顏色（組合由多色到少色）
  const k = th.length;
  const masks = Array.from({ length: 1 << k }, (_, m) => m).sort((a, b) => bits(b) - bits(a));
  for (const m of masks) {
    const c: ManaCost = { ...cost, twoHyb: undefined, hyb: cost.hyb?.slice() };
    th.forEach((col, i) => {
      if (m & (1 << i)) c[col as 'W'] += 1;
      else c.generic += 2;
    });
    const r = findPaymentBase(c, sources);
    if (r) return r;
  }
  return null;
}

const bits = (n: number): number => {
  let c = 0;
  for (; n; n >>= 1) c += n & 1;
  return c;
};

function findPaymentBase(cost: ManaCost, sources: ManaSource[]): { id: number; mana: Mana }[] | null {
  // 每項需求是可接受的顏色清單（混色有兩種選擇）
  const need: Mana[][] = [];
  for (const k of ['W', 'U', 'B', 'R', 'G', 'C'] as const) for (let i = 0; i < cost[k]; i++) need.push([k]);
  for (const h of cost.hyb ?? []) need.push([h[0] as Mana, h[1] as Mana]);
  const total = need.length + cost.generic;
  if (total === 0) return [];
  if (sources.length < total) return null;

  // 稀缺的顏色先分配
  const supply = (m: Mana[]) => sources.filter((s) => m.some((x) => s.produces.includes(x))).length;
  need.sort((a, b) => supply(a) - supply(b));

  // 優先使用：非生物、產出顏色少的來源
  const rank = (s: ManaSource) => (s.pool ? -1000 : 0) + (s.extra ? 5000 : 0) + (s.convoke ? 2000 : 0) + (s.sac ? 1000 : 0) + (s.isCreature ? 100 : 0) + (s.pain ? 50 : 0) + s.produces.length;
  const ordered = [...sources].sort((a, b) => rank(a) - rank(b));

  const used = new Set<number>();
  const assign: { id: number; mana: Mana }[] = [];

  // 過濾地變出顏色時，要多用一個來源支付 {1}
  let extra = 0;
  const dfs = (i: number): boolean => {
    if (i === need.length) return sources.length - used.size >= cost.generic + extra;
    const opts = need[i];
    for (const s of ordered) {
      if (used.has(s.id)) continue;
      let m = opts.find((x) => s.produces.includes(x));
      let filtered = false;
      if (!m && s.filter) {
        m = opts.find((x) => x !== 'C');
        filtered = !!m;
      }
      if (!m) continue;
      used.add(s.id);
      assign.push({ id: s.id, mana: m });
      if (filtered) extra++;
      if (dfs(i + 1)) return true;
      if (filtered) extra--;
      used.delete(s.id);
      assign.pop();
    }
    return false;
  };
  if (!dfs(0)) return null;

  // 通用費用（含過濾地的額外 {1}）：挑剩下的來源，保留顏色最多的來源到最後
  const rest = ordered.filter((s) => !used.has(s.id));
  if (rest.length < cost.generic + extra) return null;
  for (let i = 0; i < cost.generic + extra; i++) assign.push({ id: rest[i].id, mana: rest[i].produces[0] });
  return assign;
}
