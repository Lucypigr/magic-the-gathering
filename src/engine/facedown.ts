// ============================================================
// 面朝下的牌（偽裝、斗篷、顯化恐懼）
// 面朝下時 Card.def 換成無名的 2/2 生物，真正的牌記在 Card.hidden；
// 離開戰場時（moveCard）會換回真正的牌。
// ============================================================
import { cardName, log } from './state';
import type { Card, CardDef, GameState, PID } from './types';
import { emit, enterBattlefield } from './zones';

const cache = new WeakMap<CardDef, Record<string, CardDef>>();

/** 翻成正面的費用：有偽裝用偽裝費用，否則生物牌用法術力費用，其他牌不能翻 */
export function faceUpCost(real: CardDef): string | undefined {
  if (real.disguise) return real.disguise;
  if (real.types.includes('Creature') && real.cost) return real.cost;
  return undefined;
}

export function faceDownDef(real: CardDef, ward: boolean): CardDef {
  let m = cache.get(real);
  if (!m) cache.set(real, (m = {}));
  const key = ward ? 'w' : 'n';
  if (m[key]) return m[key];
  const up = faceUpCost(real);
  const d: CardDef = {
    id: real.id,
    name: 'Face-down creature',
    zh: '面朝下的生物',
    set: real.set,
    rarity: real.rarity,
    types: ['Creature'],
    power: 2,
    toughness: 2,
    faceDown: true,
    ...(ward ? { ward: 2 } : {}),
    abilities: up
      ? [{ kind: 'activated', cost: { mana: up }, effects: [], label: `翻成正面 ${up}`, special: true }]
      : [],
    text: `面朝下的2/2生物${ward ? '，守護{2}' : ''}。${up ? `\n${up}：翻成正面（任何時候都可以，不使用堆疊）。` : ''}`,
  };
  m[key] = d;
  return d;
}

/** 把一張牌面朝下放進戰場 */
export function putFaceDown(g: GameState, c: Card, pid: PID, ward: boolean): void {
  const real = c.hidden ?? c.def;
  c.hidden = real;
  c.def = faceDownDef(real, ward);
  enterBattlefield(g, c, pid);
}

export function turnFaceUp(g: GameState, c: Card): boolean {
  if (c.zone !== 'battlefield' || !c.hidden) return false;
  c.def = c.hidden;
  c.hidden = undefined;
  g.version++;
  log(g, `${cardName(c)} 翻成正面`, c.controller, 'cast');
  emit(g, { type: 'turnedFaceUp', card: c.id });
  return true;
}
