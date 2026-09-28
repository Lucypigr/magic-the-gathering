import { attackers, canBlock } from '../engine/combat';
import { creaturesOf, isCreature, other, stats } from '../engine/state';
import type { Card, GameState, PID } from '../engine/types';
import { creatureValue, lifeScore } from './evaluate';
import { TUNING } from './tuning';

export type Level = 'easy' | 'normal' | 'hard';

/** 預測一對一戰鬥結果 */
export function duel(g: GameState, a: Card, b: Card, extraBlockerDamage = 0): { aDies: boolean; bDies: boolean } {
  const as = stats(g, a);
  const bs = stats(g, b);
  const aFS = as.kw.has('first_strike');
  const aDS = as.kw.has('double_strike');
  const bFS = bs.kw.has('first_strike');
  const bDS = bs.kw.has('double_strike');
  const hpA = as.t - a.damage;
  const hpB = bs.t - b.damage - extraBlockerDamage;
  let toA = 0;
  let toB = 0;
  let aDead = false;
  let bDead = false;
  for (const step of ['first', 'regular'] as const) {
    const aDeals = !aDead && (step === 'first' ? aFS || aDS : !aFS || aDS);
    const bDeals = !bDead && (step === 'first' ? bFS || bDS : !bFS || bDS);
    let dtA = false;
    let dtB = false;
    if (aDeals && as.p > 0) {
      toB += as.p;
      dtB = as.kw.has('deathtouch');
    }
    if (bDeals && bs.p > 0) {
      toA += bs.p;
      dtA = bs.kw.has('deathtouch');
    }
    if (!as.kw.has('indestructible') && (toA >= hpA || (dtA && toA > 0))) aDead = true;
    if (!bs.kw.has('indestructible') && (toB >= hpB || (dtB && toB > 0))) bDead = true;
  }
  return { aDies: aDead, bDies: bDead };
}

function threat(g: GameState, a: Card): number {
  const st = stats(g, a);
  let v = st.p * (st.kw.has('double_strike') ? 2 : 1);
  if (st.kw.has('lifelink')) v += st.p * 0.5;
  return v + creatureValue(g, a) * 0.2;
}

function dmgOf(g: GameState, a: Card): number {
  const st = stats(g, a);
  return Math.max(0, st.p) * (st.kw.has('double_strike') ? 2 : 1);
}

/** 決定阻擋（人類以外的防守方使用） */
export function chooseBlocks(g: GameState, me: PID, level: Level, rnd: () => number = Math.random): [number, number][] {
  const atks = attackers(g).sort((x, y) => threat(g, y) - threat(g, x));
  const avail = creaturesOf(g, me).filter((b) => !b.tapped && atks.some((a) => canBlock(g, b, a)));
  const life = g.players[me].life;
  const blocks: [number, number][] = [];
  const used = new Set<number>();
  const blockedAtk = new Set<number>();
  const cands = (a: Card) => avail.filter((b) => !used.has(b.id) && canBlock(g, b, a));
  const menace = (a: Card) => stats(g, a).kw.has('menace');

  if (level === 'easy') {
    for (const a of atks) {
      if (menace(a)) continue;
      const cs = cands(a);
      if (!cs.length || rnd() > 0.4) continue;
      const b = cs[Math.floor(rnd() * cs.length)];
      used.add(b.id);
      blocks.push([b.id, a.id]);
      blockedAtk.add(a.id);
    }
    const incoming = atks.filter((a) => !blockedAtk.has(a.id)).reduce((s, a) => s + dmgOf(g, a), 0);
    if (incoming >= life) {
      for (const a of atks) {
        if (blockedAtk.has(a.id) || menace(a)) continue;
        const cs = cands(a);
        if (!cs.length) continue;
        used.add(cs[0].id);
        blocks.push([cs[0].id, a.id]);
        blockedAtk.add(a.id);
      }
    }
    return blocks;
  }

  // 1. 好的阻擋：阻擋者存活並殺死攻擊者；或阻擋者存活
  for (const a of atks) {
    if (menace(a)) continue;
    const cs = cands(a);
    const good = cs.filter((b) => {
      const r = duel(g, a, b);
      return r.aDies && !r.bDies;
    });
    if (good.length) {
      good.sort((x, y) => creatureValue(g, x) - creatureValue(g, y));
      used.add(good[0].id);
      blocks.push([good[0].id, a.id]);
      blockedAtk.add(a.id);
      continue;
    }
    const safe = cs.filter((b) => !duel(g, a, b).bDies);
    if (safe.length && dmgOf(g, a) > 0) {
      safe.sort((x, y) => creatureValue(g, x) - creatureValue(g, y));
      used.add(safe[0].id);
      blocks.push([safe[0].id, a.id]);
      blockedAtk.add(a.id);
    }
  }
  // 2. 交換
  for (const a of atks) {
    if (blockedAtk.has(a.id) || menace(a)) continue;
    const cs = cands(a).filter((b) => duel(g, a, b).aDies);
    if (!cs.length) continue;
    cs.sort((x, y) => creatureValue(g, x) - creatureValue(g, y));
    const b = cs[0];
    const ratio = TUNING[level === 'hard' ? 'hard' : 'normal'].tradeRatio;
    if (creatureValue(g, b) <= creatureValue(g, a) * ratio || life <= 8) {
      used.add(b.id);
      blocks.push([b.id, a.id]);
      blockedAtk.add(a.id);
    }
  }
  // 3. 雙重阻擋（困難）
  if (TUNING[level === 'hard' ? 'hard' : 'normal'].gangBlocks) {
    for (const a of atks) {
      if (blockedAtk.has(a.id)) continue;
      const cs = cands(a).sort((x, y) => creatureValue(g, x) - creatureValue(g, y));
      if (cs.length < 2) continue;
      const [b1, b2] = cs;
      const as = stats(g, a);
      const total = stats(g, b1).p + stats(g, b2).p;
      if (total < as.t - a.damage || as.kw.has('indestructible')) continue;
      // 攻擊者最多殺死其中一個
      const loss = Math.min(creatureValue(g, b1), creatureValue(g, b2));
      if (creatureValue(g, a) > loss * 1.2) {
        used.add(b1.id);
        used.add(b2.id);
        blocks.push([b1.id, a.id], [b2.id, a.id]);
        blockedAtk.add(a.id);
      }
    }
  }
  // 4. 擋死：若未阻擋的傷害會致命（或困難模式下太危險）
  const unblocked = () => atks.filter((a) => !blockedAtk.has(a.id)).reduce((s, a) => s + dmgOf(g, a), 0);
  const danger = TUNING[level === 'hard' ? 'hard' : 'normal'].chumpMargin ? Math.min(4, Math.floor(life / 3)) : 0;
  for (const a of atks) {
    if (unblocked() < life - danger) break;
    if (blockedAtk.has(a.id)) continue;
    const cs = cands(a).sort((x, y) => creatureValue(g, x) - creatureValue(g, y));
    if (menace(a)) {
      if (cs.length >= 2) {
        used.add(cs[0].id);
        used.add(cs[1].id);
        blocks.push([cs[0].id, a.id], [cs[1].id, a.id]);
        blockedAtk.add(a.id);
      }
      continue;
    }
    if (!cs.length) continue;
    used.add(cs[0].id);
    blocks.push([cs[0].id, a.id]);
    blockedAtk.add(a.id);
  }
  return blocks;
}

/** 估計對手下回合反擊時我會受到的傷害 */
export function crackbackDamage(g: GameState, me: PID): number {
  const opp = other(me);
  const theirs = creaturesOf(g, opp)
    .map((c) => ({ c, st: stats(g, c, true) }))
    .filter(({ st }) => !st.kw.has('defender') && !st.cantAttack && st.p > 0)
    .sort((x, y) => y.st.p - x.st.p);
  const mine = creaturesOf(g, me)
    .filter((c) => !c.tapped || stats(g, c).kw.has('vigilance'))
    .map((c) => ({ c, st: stats(g, c, true) }))
    .filter(({ st }) => !st.cantBlock);
  const usedB = new Set<number>();
  let dmg = 0;
  for (const { st } of theirs) {
    const flying = st.kw.has('flying');
    const b = mine.find(({ c: bc, st: bs }) => !usedB.has(bc.id) && (!flying || bs.kw.has('flying') || bs.kw.has('reach')) && isCreature(bc));
    if (b && !st.kw.has('trample') && !st.kw.has('unblockable')) usedB.add(b.c.id);
    else dmg += st.p * (st.kw.has('double_strike') ? 2 : 1);
  }
  return dmg;
}

export function crackbackPenalty(g: GameState, me: PID): number {
  const life = g.players[me].life;
  const d = crackbackDamage(g, me);
  if (d <= 0) return 0;
  if (d >= life) return 60;
  return (lifeScore(life) - lifeScore(life - d)) * 0.6;
}
