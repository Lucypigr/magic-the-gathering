import { manaValue, parseCost } from '../engine/mana';
import { isCreature, isLand, landsOf, other, stats } from '../engine/state';
import { legalTargets, sameTarget } from '../engine/targets';
import type { Card, Decision, Effect, GameState, PID, Ref, TargetRef, TargetSpec } from '../engine/types';
import { creatureValue, defValue } from './evaluate';
import { TUNING } from './tuning';

type Polarity = 'harm' | 'help' | 'neutral';

function refIs(ref: Ref | undefined, key: string): boolean {
  return ref === key;
}

/** 判斷某個目標索引對目標而言是「傷害」還是「幫助」 */
export function polarity(effects: Effect[], idx: number): Polarity {
  const key = `T${idx}`;
  let result: Polarity = 'neutral';
  const set = (p: Polarity) => {
    if (result === 'neutral') result = p;
  };
  const walk = (list: Effect[]) => {
    for (const ef of list) {
      switch (ef.e) {
        case 'damage':
          if (refIs(ef.to, key)) set('harm');
          break;
        case 'destroy':
        case 'exile':
        case 'exileLinked':
        case 'bounce':
        case 'tap':
        case 'stun':
        case 'shuffleIn':
        case 'exileGy':
          if (refIs(ef.what, key)) set('harm');
          break;
        case 'counter':
        case 'counterUnless':
          if (refIs(ef.what, key)) set('harm');
          break;
        case 'lose':
        case 'discard':
        case 'discardChosen':
        case 'edict':
          if (refIs(ef.who, key)) set('harm');
          break;
        case 'pump':
          if (refIs(ef.what, key)) set(typeof ef.p === 'number' && ef.p < 0 ? 'harm' : 'help');
          break;
        case 'counters':
          if (refIs(ef.what, key)) set(typeof ef.n === 'number' && ef.n < 0 ? 'harm' : 'help');
          break;
        case 'removeCounters':
        case 'tuck':
          if (refIs(ef.what, key)) set('harm');
          break;
        case 'connive':
        case 'untap':
        case 'attach':
        case 'role':
        case 'toHand':
        case 'reanimate':
        case 'doubleCounters':
          if (refIs(ef.what, key)) set('help');
          break;
        case 'gain':
        case 'draw':
          if (refIs(ef.who, key)) set('help');
          break;
        case 'fight':
        case 'bite':
          if (refIs(ef.a, key)) set('help');
          if (refIs(ef.b, key)) set('harm');
          break;
        case 'if':
          walk(ef.then);
          if (ef.else) walk(ef.else);
          break;
        case 'may':
          walk(ef.effects);
          break;
        case 'costThen':
          walk(ef.then);
          break;
        default:
          break;
      }
    }
  };
  walk(effects);
  return result;
}

function damageAmount(effects: Effect[], idx: number): number | null {
  for (const ef of effects) if (ef.e === 'damage' && ef.to === `T${idx}` && typeof ef.n === 'number') return ef.n;
  return null;
}

/** 依照目標的好壞排序（最好的在前） */
export function rankTargets(
  g: GameState,
  pid: PID,
  spec: TargetSpec,
  effects: Effect[],
  idx: number,
  sourceId?: number,
): TargetRef[] {
  const opts = legalTargets(g, spec, pid, sourceId);
  const pol = polarity(effects, idx);
  const dmg = damageAmount(effects, idx);
  const score = (t: TargetRef): number => {
    if ('p' in t) {
      const mine = t.p === pid;
      if (pol === 'harm') return mine ? -100 : 5 + (g.players[t.p].life <= (dmg ?? 0) ? 1000 : 0);
      if (pol === 'help') return mine ? 5 : -100;
      return mine ? 0 : 1;
    }
    const c = g.cards[t.c];
    if (!c) return -1000;
    const mine = c.controller === pid;
    if (c.zone === 'stack') return mine ? -100 : 3 + manaValue(c.def);
    if (c.zone === 'graveyard') {
      const v = isCreature(c) ? 2 + manaValue(c.def) : 1;
      if (pol === 'help') return mine ? v : -v;
      return mine ? -v : v;
    }
    const v = isCreature(c) ? creatureValue(g, c) : 1 + manaValue(c.def);
    if (pol === 'harm') {
      if (mine) return -50 - v;
      if (dmg !== null && isCreature(c)) {
        const st = stats(g, c);
        const kills = dmg >= st.t - c.damage && !st.kw.has('indestructible');
        return kills ? 10 + v : v * 0.1 - 5;
      }
      return v;
    }
    if (pol === 'help') {
      if (!mine) return -50 - v;
      return v + (c.attacking || c.blocking != null ? 5 : 0);
    }
    return mine ? v * 0.2 : v * 0.5;
  };
  return opts.map((t) => ({ t, s: score(t) })).sort((a, b) => b.s - a.s).map((x) => x.t);
}

/** 快速選擇目標（模擬中與簡單 AI 使用） */
export function quickTargets(
  g: GameState,
  pid: PID,
  specs: TargetSpec[],
  effects: Effect[],
  sourceId?: number,
): (TargetRef | null)[] {
  const out: (TargetRef | null)[] = [];
  specs.forEach((spec, i) => {
    const ranked = rankTargets(g, pid, spec, effects, i, sourceId).filter((t) => !out.some((o) => sameTarget(o, t)));
    const pol = polarity(effects, i);
    const first = ranked[0] ?? null;
    if (spec.optional && first) {
      // 可選目標：只有在有好處時才選
      if ('c' in first) {
        const c = g.cards[first.c];
        const mine = c.controller === pid;
        if ((pol === 'harm' && mine) || (pol === 'help' && !mine && c.zone === 'battlefield')) {
          out.push(null);
          return;
        }
      }
    }
    out.push(first);
  });
  return out;
}

// ------------------------------------------------------------
// 手牌 / 牌庫相關的選擇
// ------------------------------------------------------------
export function landCount(g: GameState, pid: PID): { play: number; hand: number } {
  const p = g.players[pid];
  return {
    play: landsOf(g, pid).length,
    hand: p.hand.filter((id) => isLand(g.cards[id])).length,
  };
}

function wantsLands(g: GameState, pid: PID): boolean {
  const lc = landCount(g, pid);
  return lc.play + lc.hand < 5;
}

function colorNeeds(g: GameState, pid: PID): Record<string, number> {
  const need: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const p = g.players[pid];
  for (const id of [...p.hand, ...p.library.slice(0, 20)]) {
    const d = g.cards[id].def;
    if (d.types.includes('Land')) continue;
    const c = parseCost(d.cost);
    for (const k of ['W', 'U', 'B', 'R', 'G'] as const) need[k] += c[k];
  }
  for (const l of landsOf(g, pid)) for (const m of l.def.produces ?? []) if (m in need) need[m] -= 3;
  return need;
}

export function handCardValue(g: GameState, pid: PID, c: Card): number {
  const d = c.def;
  if (isLand(c)) return wantsLands(g, pid) ? 5 : 0.8;
  const lands = landsOf(g, pid).length;
  const mv = manaValue(d);
  let v = defValue(d);
  if (mv > lands + 2) v -= (mv - lands - 2) * 0.8;
  return v;
}

export function heuristicChoose(g: GameState, d: Extract<Decision, { type: 'choose' }>): number[] {
  const pid = d.player;
  const opts = d.options.slice();
  const card = (id: number) => g.cards[id];
  const byAsc = (f: (c: Card) => number) => opts.slice().sort((a, b) => f(card(a)) - f(card(b)));
  const byDesc = (f: (c: Card) => number) => opts.slice().sort((a, b) => f(card(b)) - f(card(a)));
  const take = (list: number[], n: number) => list.slice(0, Math.max(d.min, Math.min(d.max, n)));
  switch (d.purpose) {
    case 'bottom': {
      const lands = opts.filter((id) => isLand(card(id)));
      const spells = opts.filter((id) => !isLand(card(id)));
      const out: number[] = [];
      // 保持約 3 張地
      const sortedSpells = spells.slice().sort((a, b) => manaValue(card(b).def) - manaValue(card(a).def));
      while (out.length < d.min) {
        const keptLands = lands.filter((x) => !out.includes(x)).length;
        if (keptLands > 3) out.push(lands.find((x) => !out.includes(x))!);
        else {
          const s = sortedSpells.find((x) => !out.includes(x));
          if (s != null) out.push(s);
          else out.push(lands.find((x) => !out.includes(x))!);
        }
      }
      return out;
    }
    case 'discard':
      if (d.min === 0) {
        const worst = byAsc((c) => handCardValue(g, pid, c));
        const w = worst[0];
        return w != null && handCardValue(g, pid, card(w)) < 2.2 ? [w] : [];
      }
      return take(byAsc((c) => handCardValue(g, pid, c)), d.min);
    case 'sacrifice': {
      const sorted = byAsc((c) => (isCreature(c) ? creatureValue(g, c) : 1 + manaValue(c.def)));
      if (d.min === 0) {
        const w = sorted[0];
        if (w == null) return [];
        const c = card(w);
        const v = isCreature(c) ? creatureValue(g, c) : 2;
        return v <= 2.8 || c.token ? [w] : [];
      }
      return take(sorted, d.min);
    }
    case 'scryBottom':
    case 'surveilGy': {
      const want = wantsLands(g, pid);
      return opts.filter((id) => {
        const c = card(id);
        if (isLand(c)) return !want;
        const mv = manaValue(c.def);
        return want && mv >= 4 ? true : mv > landsOf(g, pid).length + 3;
      });
    }
    case 'dig': {
      const want = wantsLands(g, pid);
      const sorted = byDesc((c) => (isLand(c) ? (want ? 6 : 0.5) : handCardValue(g, pid, c)));
      return take(sorted, d.max);
    }
    case 'search': {
      const need = colorNeeds(g, pid);
      const sorted = byDesc((c) => (c.def.produces ?? []).reduce((s, m) => s + (need[m] ?? 0), 0));
      return take(sorted, 1);
    }
    case 'opponentDiscard':
      return take(byDesc((c) => defValue(c.def)), 1);
    case 'landFromHand':
      return opts.length ? [opts[0]] : [];
    case 'tutor':
      return take(byDesc((c) => handCardValue(g, pid, c)), 1);
    case 'blight': {
      // 優先放在不重要或防禦力高的生物上；沒有合適的就不支付
      const ok = opts.filter((id) => stats(g, card(id)).t > 1 || card(id).token);
      const sorted = ok.sort((a, b) => creatureValue(g, card(a)) - creatureValue(g, card(b)));
      return sorted.length ? [sorted[0]] : d.min > 0 ? opts.slice(0, d.min) : [];
    }
  }
  return opts.slice(0, d.min);
}

export function keepHand(g: GameState, pid: PID, mulligans: number, level: 'easy' | 'normal' | 'hard'): boolean {
  if (level === 'easy' || mulligans >= 2) return true;
  const hand = g.players[pid].hand.map((id) => g.cards[id]);
  const lands = hand.filter(isLand).length;
  if (mulligans === 0 && (lands < 2 || lands > 5)) return false;
  if (mulligans === 1 && (lands < 1 || lands > 5)) return false;
  if (level === 'hard' && TUNING.hard.strictMulligan) {
    const cheap = hand.filter((c) => !isLand(c) && manaValue(c.def) <= Math.max(3, lands + 1)).length;
    if (cheap === 0 && mulligans === 0) return false;
  }
  return true;
}

export function opponentOf(pid: PID): PID {
  return other(pid);
}
