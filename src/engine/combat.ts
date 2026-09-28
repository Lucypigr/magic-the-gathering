import { cardName, creaturesOf, isCreature, log, other, show, stats } from './state';
import type { Card, GameState, PID } from './types';
import { dealDamage, emit } from './zones';

export function canAttack(g: GameState, c: Card): boolean {
  if (!isCreature(c) || c.zone !== 'battlefield' || c.tapped) return false;
  if (c.controller !== g.active) return false;
  const st = stats(g, c);
  if (st.cantAttack || st.kw.has('defender')) return false;
  if (c.sick && !st.kw.has('haste')) return false;
  return true;
}

export function attackCandidates(g: GameState, pid: PID): Card[] {
  return creaturesOf(g, pid).filter((c) => canAttack(g, c));
}

/** 阻擋者是否能阻擋此攻擊者（不考慮威懾） */
export function canBlock(g: GameState, blocker: Card, attacker: Card): boolean {
  if (!isCreature(blocker) || blocker.zone !== 'battlefield' || blocker.tapped) return false;
  if (!attacker.attacking || attacker.zone !== 'battlefield') return false;
  if (blocker.controller === attacker.controller) return false;
  const bs = stats(g, blocker);
  if (bs.cantBlock) return false;
  const as = stats(g, attacker);
  if (as.kw.has('unblockable')) return false;
  if (as.kw.has('flying') && !bs.kw.has('flying') && !bs.kw.has('reach')) return false;
  if (attacker.def.evadePowLte !== undefined && bs.p <= attacker.def.evadePowLte) return false;
  return true;
}

export function attackers(g: GameState): Card[] {
  return g.battlefield.map((id) => g.cards[id]).filter((c) => c.attacking);
}

export function blockCandidates(g: GameState, pid: PID): Card[] {
  const atk = attackers(g);
  return creaturesOf(g, pid).filter((b) => atk.some((a) => canBlock(g, b, a)));
}

export function declareAttackers(g: GameState, pid: PID, ids: number[]): Card[] {
  const uniq = [...new Set(ids)];
  const list = uniq.map((id) => g.cards[id]).filter((c) => c && c.controller === pid && canAttack(g, c));
  for (const c of list) {
    c.attacking = true;
    if (!stats(g, c).kw.has('vigilance')) c.tapped = true;
  }
  if (list.length) {
    g.attackedThisTurn = true;
    log(g, `攻擊：${list.map(cardName).join('、')}`, pid, 'combat');
    for (const c of list) emit(g, { type: 'attacks', card: c.id });
    emit(g, { type: 'youAttack', player: pid, attackers: list.map((c) => c.id) });
    show(g, { kind: 'attack', player: pid, pairs: list.map((c) => [c.id, -1] as [number, number]) });
  }
  g.version++;
  return list;
}

/** 驗證並套用阻擋宣告；回傳實際生效的阻擋 */
export function declareBlockers(g: GameState, pid: PID, blocks: [number, number][]): [number, number][] {
  const used = new Set<number>();
  let valid: [number, number][] = [];
  for (const [b, a] of blocks) {
    const bc = g.cards[b];
    const ac = g.cards[a];
    if (!bc || !ac || used.has(b) || bc.controller !== pid) continue;
    if (!canBlock(g, bc, ac)) continue;
    used.add(b);
    valid.push([b, a]);
  }
  // 威懾：只被一個生物阻擋的攻擊無效
  const countFor = (a: number) => valid.filter(([, x]) => x === a).length;
  valid = valid.filter(([, a]) => !(stats(g, g.cards[a]).kw.has('menace') && countFor(a) < 2));
  for (const [b, a] of valid) {
    const bc = g.cards[b];
    const ac = g.cards[a];
    bc.blocking = a;
    ac.blockedBy.push(b);
    ac.wasBlocked = true;
  }
  if (valid.length) {
    log(
      g,
      `阻擋：${valid.map(([b, a]) => `${cardName(g.cards[b])} 擋 ${cardName(g.cards[a])}`).join('；')}`,
      pid,
      'combat',
    );
    for (const [b] of valid) emit(g, { type: 'blocks', card: b });
    show(g, { kind: 'block', player: pid, pairs: valid });
  }
  g.version++;
  return valid;
}

export function hasFirstStrikers(g: GameState): boolean {
  return g.battlefield.some((id) => {
    const c = g.cards[id];
    if (!c.attacking && c.blocking == null) return false;
    const k = stats(g, c).kw;
    return k.has('first_strike') || k.has('double_strike');
  });
}

type DamageStep = 'first' | 'regular' | 'all';

function dealsIn(g: GameState, c: Card, step: DamageStep): boolean {
  if (step === 'all') return true;
  const k = stats(g, c).kw;
  const fs = k.has('first_strike');
  const ds = k.has('double_strike');
  return step === 'first' ? fs || ds : !fs || ds;
}

/** 攻擊者的傷害分配：先給阻擋者致命傷害，剩餘的（踐踏）給玩家 */
export function assignAttackerDamage(
  g: GameState,
  a: Card,
  blockers: Card[],
  power: number,
): { card?: Card; player?: PID; n: number }[] {
  const st = stats(g, a);
  const dt = st.kw.has('deathtouch');
  const trample = st.kw.has('trample');
  const out: { card?: Card; player?: PID; n: number }[] = [];
  if (power <= 0) return out;
  const need = (b: Card) => (dt ? 1 : Math.max(1, stats(g, b).t - b.damage));
  const sorted = [...blockers].sort((x, y) => need(x) - need(y));
  let rem = power;
  for (const b of sorted) {
    const give = Math.min(rem, need(b));
    if (give > 0) out.push({ card: b, n: give });
    rem -= give;
    if (rem <= 0) break;
  }
  if (rem > 0) {
    if (trample) out.push({ player: other(a.controller), n: rem });
    else if (out.length) out[0].n += rem;
  }
  return out;
}

export function combatDamage(g: GameState, step: DamageStep): void {
  const hits: { src: Card; card?: Card; player?: PID; n: number }[] = [];
  for (const a of attackers(g)) {
    if (!dealsIn(g, a, step)) continue;
    const p = stats(g, a).p;
    if (p <= 0) continue;
    const blockers = a.blockedBy.map((id) => g.cards[id]).filter((b) => b && b.zone === 'battlefield');
    if (!a.wasBlocked) {
      hits.push({ src: a, player: other(a.controller), n: p });
    } else if (blockers.length === 0) {
      if (stats(g, a).kw.has('trample')) hits.push({ src: a, player: other(a.controller), n: p });
    } else {
      for (const h of assignAttackerDamage(g, a, blockers, p)) hits.push({ src: a, ...h });
    }
  }
  for (const id of g.battlefield) {
    const b = g.cards[id];
    if (b.blocking == null || !dealsIn(g, b, step)) continue;
    const a = g.cards[b.blocking];
    if (!a || a.zone !== 'battlefield' || !a.attacking) continue;
    const p = stats(g, b).p;
    if (p > 0) hits.push({ src: b, card: a, n: p });
  }
  for (const h of hits) {
    if (h.player !== undefined) dealDamage(g, h.src, h.src.controller, { p: h.player }, h.n, { combat: true });
    else if (h.card) dealDamage(g, h.src, h.src.controller, { c: h.card.id }, h.n, { combat: true });
  }
  g.version++;
}

export function endCombat(g: GameState): void {
  for (const id of g.battlefield) {
    const c = g.cards[id];
    c.attacking = false;
    c.blocking = null;
    c.blockedBy = [];
    c.wasBlocked = false;
  }
  g.version++;
}
