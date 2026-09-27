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
}

const costCache = new Map<string, ManaCost>();

export function emptyCost(): ManaCost {
  return { generic: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
}

export function parseCost(cost: string | undefined): ManaCost {
  if (!cost) return emptyCost();
  const cached = costCache.get(cost);
  if (cached) return { ...cached };
  const out = emptyCost();
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cost))) {
    const sym = m[1];
    if (/^\d+$/.test(sym)) out.generic += parseInt(sym, 10);
    else if (sym === 'W' || sym === 'U' || sym === 'B' || sym === 'R' || sym === 'G' || sym === 'C') out[sym] += 1;
  }
  costCache.set(cost, { ...out });
  return out;
}

export function costTotal(c: ManaCost): number {
  return c.generic + c.W + c.U + c.B + c.R + c.G + c.C;
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
  };
}

/** 從費用中扣除（不會低於 0；有色部分無法扣除時改扣通用） */
export function reduceCost(c: ManaCost, by: ManaCost): ManaCost {
  const out = { ...c };
  let extra = 0;
  for (const k of ['W', 'U', 'B', 'R', 'G', 'C'] as const) {
    const r = Math.min(out[k], by[k]);
    out[k] -= r;
    extra += by[k] - r;
  }
  out.generic = Math.max(0, out.generic - by.generic - extra);
  return out;
}

export function colorsOf(def: CardDef): Color[] {
  if (def.colors) return def.colors;
  const c = parseCost(def.cost);
  return COLORS.filter((k) => c[k] > 0);
}

export function costToString(c: ManaCost): string {
  let s = '';
  if (c.generic > 0 || costTotal(c) === 0) s += `{${c.generic}}`;
  for (const k of ['C', 'W', 'U', 'B', 'R', 'G'] as const) s += `{${k}}`.repeat(c[k]);
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
  const need: Mana[] = [];
  for (const k of ['W', 'U', 'B', 'R', 'G', 'C'] as const) for (let i = 0; i < cost[k]; i++) need.push(k);
  const total = need.length + cost.generic;
  if (total === 0) return [];
  if (sources.length < total) return null;

  // 稀缺的顏色先分配
  const supply = (m: Mana) => sources.filter((s) => s.produces.includes(m)).length;
  need.sort((a, b) => supply(a) - supply(b));

  // 優先使用：非生物、產出顏色少的來源
  const rank = (s: ManaSource) => (s.isCreature ? 100 : 0) + s.produces.length;
  const ordered = [...sources].sort((a, b) => rank(a) - rank(b));

  const used = new Set<number>();
  const assign: { id: number; mana: Mana }[] = [];

  const dfs = (i: number): boolean => {
    if (i === need.length) return true;
    const m = need[i];
    for (const s of ordered) {
      if (used.has(s.id) || !s.produces.includes(m)) continue;
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
