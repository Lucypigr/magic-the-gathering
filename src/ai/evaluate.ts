import { activatedAbilities } from '../engine/actions';
import { manaValue } from '../engine/mana';
import { isCreature, isLand, other, stats } from '../engine/state';
import type { Card, CardDef, GameState, PID } from '../engine/types';

/** 生命值的價值：生命越低，每一點越珍貴 */
export function lifeScore(life: number): number {
  if (life <= 0) return -400;
  let s = 0;
  for (let i = 1; i <= life; i++) s += i <= 5 ? 1.7 : i <= 10 ? 0.95 : i <= 20 ? 0.45 : 0.15;
  return s;
}

export function creatureValue(g: GameState, c: Card): number {
  const st = stats(g, c, true);
  if (st.t <= 0) return 0;
  const p = Math.max(0, st.p);
  let v = 1 + p * 1.3 + st.t * 0.8;
  const k = st.kw;
  if (k.has('flying')) v += p * 0.7 + 0.5;
  if (k.has('first_strike')) v += p * 0.4 + 0.3;
  if (k.has('double_strike')) v += p * 1.0 + 0.3;
  if (k.has('deathtouch')) v += 2;
  if (k.has('lifelink')) v += p * 0.5;
  if (k.has('trample')) v += p * 0.2;
  if (k.has('vigilance')) v += 0.5;
  if (k.has('menace')) v += p * 0.3;
  if (k.has('hexproof')) v += 1;
  if (k.has('indestructible')) v += 3;
  if (k.has('reach')) v += 0.4;
  if (k.has('unblockable')) v += p * 0.5;
  if (c.def.evadePowLte) v += p * 0.3;
  if (c.def.ward) v += 1;
  if (k.has('defender')) v -= p * 1.2;
  if (st.cantAttack && st.cantBlock) v *= 0.15;
  else if (st.cantAttack) v *= 0.6;
  const abs = c.def.abilities ?? [];
  v += abs.filter((a) => a.kind !== 'static').length * 1.1;
  v += abs.filter((a) => a.kind === 'static').length * 1.5;
  if (c.def.produces) v += 1;
  if (c.stun > 0) v -= 1;
  if (c.token) v -= 0.3;
  return Math.max(0.2, v);
}

/** 手牌中某張牌的粗略價值 */
export function defValue(def: CardDef): number {
  if (def.types.includes('Land')) return 2;
  let v = 1.5 + manaValue(def) * 0.6;
  if (def.types.includes('Creature')) v += ((def.power ?? 0) + (def.toughness ?? 0)) * 0.3;
  return v;
}

function permanentValue(g: GameState, c: Card): number {
  if (isCreature(c)) return creatureValue(g, c);
  if (isLand(c)) return 0;
  if (c.def.aura) return 0.3; // 效果已反映在生物上
  let v = 1 + manaValue(c.def) * 0.7;
  if (c.def.equip) v = c.attachedTo != null ? 1 : 0.6 + manaValue(c.def) * 0.3;
  v += activatedAbilities(c.def).length * 0.4;
  if (c.token) v = Math.min(v, 1.2);
  return v;
}

export interface EvalOpts {
  aggro?: boolean;
}

export function evaluate(g: GameState, me: PID, opts: EvalOpts = {}): number {
  if (g.winner !== null) return g.winner === me ? 100000 : g.winner === 'draw' ? -500 : -100000;
  const opp = other(me);
  const pm = g.players[me];
  const po = g.players[opp];
  let s = lifeScore(pm.life) - lifeScore(po.life) * (opts.aggro ? 1.35 : 1);
  const lands: [number, number] = [0, 0];
  for (const id of g.battlefield) {
    const c = g.cards[id];
    const sign = c.controller === me ? 1 : -1;
    if (isLand(c)) {
      lands[c.controller]++;
      continue;
    }
    s += sign * permanentValue(g, c);
  }
  const landVal = (n: number) => Math.min(n, 6) * 1.1 + Math.max(0, n - 6) * 0.25;
  s += landVal(lands[me]) - landVal(lands[opp]);
  s += Math.min(pm.hand.length, 8) * 1.1 - Math.min(po.hand.length, 8) * 1.1;
  if (pm.library.length === 0) s -= 30;
  if (po.library.length === 0) s += 30;
  if (pm.cantGainLife) s -= 1;
  if (po.cantGainLife) s += 1;
  return s;
}
