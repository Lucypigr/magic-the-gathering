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
}

const costCache = new Map<string, ManaCost>();

export function emptyCost(): ManaCost {
  return { generic: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
}

export function parseCost(cost: string | undefined): ManaCost {
  if (!cost) return emptyCost();
  const cached = costCache.get(cost);
  if (cached) return { ...cached, hyb: cached.hyb?.slice() };
  const out = emptyCost();
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cost))) {
    const sym = m[1];
    if (/^\d+$/.test(sym)) out.generic += parseInt(sym, 10);
    else if (sym === 'W' || sym === 'U' || sym === 'B' || sym === 'R' || sym === 'G' || sym === 'C') out[sym] += 1;
    else if (/^[WUBRG]\/[WUBRG]$/.test(sym)) (out.hyb ??= []).push(sym[0] + sym[2]);
    // {2/R}：簡化為該顏色的一點法術力
    else if (/^2\/[WUBRG]$/.test(sym)) out[sym[2] as 'W'] += 1;
  }
  costCache.set(cost, { ...out, hyb: out.hyb?.slice() });
  return out;
}

export function costTotal(c: ManaCost): number {
  return c.generic + c.W + c.U + c.B + c.R + c.G + c.C + (c.hyb?.length ?? 0);
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
  };
}

/** 從費用中扣除（不會低於 0；有色部分無法扣除時改扣通用） */
export function reduceCost(c: ManaCost, by: ManaCost): ManaCost {
  const out = { ...c, hyb: c.hyb?.slice() };
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
  return COLORS.filter((k) => c[k] > 0 || c.hyb?.some((h) => h.includes(k)));
}

export function costToString(c: ManaCost): string {
  let s = '';
  if (c.generic > 0 || costTotal(c) === 0) s += `{${c.generic}}`;
  for (const k of ['C', 'W', 'U', 'B', 'R', 'G'] as const) s += `{${k}}`.repeat(c[k]);
  for (const h of c.hyb ?? []) s += `{${h[0]}/${h[1]}}`;
  return s;
}

export interface ManaSource {
  id: number;
  produces: Mana[];
  isCreature: boolean;
}

/**
 * 找出一組能支付費用的法術力來源。回傳 [來源id, 產生的顏色] 陣列，或 null。
 * 有色需求以回溯法分配；通用費用優先使用「最不重要」的來源。
 */
export function findPayment(cost: ManaCost, sources: ManaSource[]): { id: number; mana: Mana }[] | null {
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
  const rank = (s: ManaSource) => (s.isCreature ? 100 : 0) + s.produces.length;
  const ordered = [...sources].sort((a, b) => rank(a) - rank(b));

  const used = new Set<number>();
  const assign: { id: number; mana: Mana }[] = [];

  const dfs = (i: number): boolean => {
    if (i === need.length) return true;
    const opts = need[i];
    for (const s of ordered) {
      if (used.has(s.id)) continue;
      const m = opts.find((x) => s.produces.includes(x));
      if (!m) continue;
      used.add(s.id);
      assign.push({ id: s.id, mana: m });
      if (dfs(i + 1)) return true;
      used.delete(s.id);
      assign.pop();
    }
    return false;
  };
  if (!dfs(0)) return null;

  // 通用費用：挑剩下的來源，保留顏色最多的來源到最後
  const rest = ordered.filter((s) => !used.has(s.id));
  if (rest.length < cost.generic) return null;
  for (let i = 0; i < cost.generic; i++) assign.push({ id: rest[i].id, mana: rest[i].produces[0] });
  return assign;
}
