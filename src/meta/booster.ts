import { CARDS, REPRINTS, SET_INFO } from '../data';
import { getDef } from '../engine/registry';
import { STANDARD_SETS, type StandardSet } from '../engine/types';
import type { CardDef, Rarity, SetCode } from '../engine/types';
import { DUPLICATE_GOLD, MAX_COPIES, type Profile } from './profile';

export interface Product {
  id: string;
  set: SetCode;
  name: string;
  price: number;
  packs: number;
  desc: string;
}

export const PACK_PRICE = 100;
export const BUNDLE_PRICE = 450;

/** 標準賽系列的補充包（每個系列單包與五包組合） */
export const STANDARD_PRODUCTS: Product[] = STANDARD_SETS.flatMap((s) => [
  { id: s.toLowerCase(), set: s, name: `${SET_INFO[s].short} 補充包`, price: PACK_PRICE, packs: 1, desc: SET_INFO[s].desc },
  { id: `${s.toLowerCase()}-5`, set: s, name: `${SET_INFO[s].short} 補充包 ×5`, price: BUNDLE_PRICE, packs: 5, desc: '一次買五包，省下 50 金幣' },
]);

/** 經典補充包（自由模式用的卡） */
export const CLASSIC_PRODUCTS: Product[] = [
  { id: 'core', set: 'CORE', name: '經典核心系列 補充包', price: 100, packs: 1, desc: '12 張卡：1 稀有或秘稀、3 非普通、7 普通、1 張隨機' },
  { id: 'meta', set: 'META', name: '競技環境精選 補充包', price: 180, packs: 1, desc: '環境強卡！12 張卡，稀有機率較高' },
  { id: 'core-5', set: 'CORE', name: '經典核心 補充包 ×5', price: 450, packs: 5, desc: '一次買五包，省下 50 金幣' },
  { id: 'meta-5', set: 'META', name: '競技環境 補充包 ×5', price: 800, packs: 5, desc: '一次買五包，省下 100 金幣' },
];

export const PRODUCTS: Product[] = [...STANDARD_PRODUCTS, ...CLASSIC_PRODUCTS];

const poolCache = new Map<string, CardDef[]>();

/** 某系列某稀有度的卡池（含在該系列重印的卡） */
export function pool(set: SetCode, r: Rarity): CardDef[] {
  const key = `${set}:${r}`;
  let list = poolCache.get(key);
  if (!list) {
    list = CARDS.filter((c) => c.set === set && c.rarity === r);
    for (const [id, rr] of REPRINTS[set as StandardSet] ?? []) if (rr === r) list.push(getDef(id));
    poolCache.set(key, list);
  }
  return list;
}

/** 補充包中可能出現的卡數量 */
export function poolSize(set: SetCode): number {
  return (['C', 'U', 'R', 'M'] as const).reduce((s, r) => s + pool(set, r).length, 0);
}

function pick<T>(arr: T[], rng: () => number, avoid: Set<T>): T {
  const fresh = arr.filter((x) => !avoid.has(x));
  const src = fresh.length ? fresh : arr;
  const v = src[Math.floor(rng() * src.length)];
  avoid.add(v);
  return v;
}

/** 開一包補充包，回傳卡牌 id（依稀有度排序：普通在前、稀有在後） */
export function openPack(set: SetCode, rng: () => number = Math.random): string[] {
  const C = pool(set, 'C');
  const U = pool(set, 'U');
  const R = pool(set, 'R');
  const M = pool(set, 'M');
  const used = new Set<CardDef>();
  const out: CardDef[] = [];
  const meta = set === 'META';
  for (let i = 0; i < 7; i++) out.push(pick(C, rng, used));
  for (let i = 0; i < 3; i++) out.push(pick(U, rng, used));
  // 隨機欄位
  const roll = rng();
  const wild = roll < (meta ? 0.45 : 0.55) ? C : roll < (meta ? 0.75 : 0.85) ? U : roll < 0.97 || !M.length ? R : M;
  out.push(pick(wild.length ? wild : C, rng, used));
  // 稀有欄位
  const mythic = M.length > 0 && rng() < (meta ? 1 / 6 : 1 / 8);
  out.push(pick(mythic ? M : R, rng, used));
  return out.map((c) => c.id);
}

export interface PackResult {
  cards: string[];
  isNew: boolean[];
  /** 超過 4 張的重複卡會自動換成金幣 */
  converted: boolean[];
  gold: number;
}

/** 把開到的卡加入收藏（直接修改 profile） */
export function addToCollection(p: Profile, cards: string[]): PackResult {
  const isNew: boolean[] = [];
  const converted: boolean[] = [];
  let gold = 0;
  for (const id of cards) {
    const have = p.collection[id] ?? 0;
    isNew.push(have === 0);
    if (have >= MAX_COPIES) {
      const def = CARDS.find((c) => c.id === id)!;
      gold += DUPLICATE_GOLD[def.rarity];
      converted.push(true);
    } else {
      p.collection[id] = have + 1;
      converted.push(false);
    }
  }
  p.gold += gold;
  return { cards, isNew, converted, gold };
}
