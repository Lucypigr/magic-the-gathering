import { displayName } from '../data/names';
import { addCosts, colorsOf, costToString, findPayment, manaValue, parseCost, reduceCost, type ManaCost, type ManaSource } from './mana';
import {
  abilitiesOf,
  abilitiesSuppressed,
  cardName,
  checkCond,
  countMatching,
  hasKw,
  isCreature,
  isLand,
  log,
  matches,
  newCard,
  show,
  stats,
} from './state';
import { hasTargetsAvailable, validateTargets } from './targets';
import type {
  ActivatedAbility,
  Card,
  CardDef,
  CastAlt,
  Effect,
  Filter,
  GameState,
  PID,
  PriorityAction,
  TargetRef,
  TargetSpec,
} from './types';
import { discard, emit, enterBattlefield, loseLife, moveCard, removeFromZone, sacrifice } from './zones';
import { faceDownDef, turnFaceUp } from './facedown';

// ------------------------------------------------------------
// 法術力
// ------------------------------------------------------------
export function manaSources(g: GameState, pid: PID, exclude?: number, convoke = false, forDef?: CardDef): ManaSource[] {
  const out: ManaSource[] = [];
  if (convoke) {
    // 召集：未橫置的生物可以支付 {1} 或一點與它同色的法術力（排在最後才用）
    for (const id of g.battlefield) {
      const c = g.cards[id];
      if (c.controller !== pid || c.tapped || !isCreature(c) || id === exclude || c.def.produces) continue;
      const cols = colorsOf(c.def);
      out.push({ id, produces: cols.length ? cols : ['C'], isCreature: true, sac: false, convoke: true });
    }
  }
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller !== pid || c.tapped || !c.def.produces || id === exclude) continue;
    // 限定用途的法術力（例如只能用來施放鵬洛客咒語）
    if (c.def.manaOnly === 'planeswalker' && !forDef?.types.includes('Planeswalker')) continue;
    if (abilitiesSuppressed(g, c)) continue;
    const cr = isCreature(c);
    if (cr && c.sick && !hasKw(g, c, 'haste')) continue;
    out.push({ id, produces: c.def.produces, isCreature: cr, sac: c.def.sacOnMana, filter: c.def.filterMana, pain: c.def.painMana });
    // 「每當你為山脈橫置來產生法術力時，額外加一點{R}」
    if (g.players[pid].mountainBonus && c.def.subtypes?.includes('Mountain')) out.push({ id: -2000 - id, produces: ['R'], isCreature: false, extra: true });
  }
  // 法術力池
  (g.players[pid].pool ?? []).forEach((m, i) => out.push({ id: -1000 - i, produces: [m], isCreature: false, pool: true }));
  return out;
}

/** 額外的地（例如「你每回合可以多使用一張地」） */
export function extraLandDrops(g: GameState, pid: PID): number {
  let n = 0;
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller !== pid) continue;
    for (const ab of abilitiesOf(g, c)) if (ab.kind === 'static' && ab.extraLand) n += ab.extraLand;
  }
  return n;
}

export function canPayCost(g: GameState, pid: PID, cost: ManaCost, exclude?: number, convoke = false, forDef?: CardDef): boolean {
  return findPayment(cost, manaSources(g, pid, exclude, convoke, forDef)) !== null;
}

export function payCost(g: GameState, pid: PID, cost: ManaCost, exclude?: number, convoke = false, forDef?: CardDef): boolean {
  const pay = findPayment(cost, manaSources(g, pid, exclude, convoke, forDef));
  if (!pay) return false;
  for (const p of pay) if (p.id >= 0) g.cards[p.id].tapped = true;
  for (const p of pay) if (p.id >= 0 && g.cards[p.id].def.painMana && p.mana !== 'C') loseLife(g, pid, 1);
  for (const p of pay) if (p.id >= 0 && g.cards[p.id].def.sacOnMana) sacrifice(g, g.cards[p.id]);
  // 用掉的法術力池
  const usedPool = new Set(pay.filter((p) => p.id <= -1000 && p.id > -2000).map((p) => -1000 - p.id));
  if (usedPool.size) g.players[pid].pool = (g.players[pid].pool ?? []).filter((_, i) => !usedPool.has(i));
  g.version++;
  return true;
}

// ------------------------------------------------------------
// 時機
// ------------------------------------------------------------
export const isMainPhase = (g: GameState) => g.phase === 'main1' || g.phase === 'main2';
export const sorceryTiming = (g: GameState, pid: PID) => g.active === pid && isMainPhase(g) && g.stack.length === 0;
export const instantSpeed = (def: CardDef) => def.types.includes('Instant') || !!def.keywords?.includes('flash');

// ------------------------------------------------------------
// 咒語資訊
// ------------------------------------------------------------
export function castTargetSpecs(def: CardDef, mode?: number): TargetSpec[] {
  if (def.spell?.modes) return def.spell.modes[mode ?? 0]?.targets ?? [];
  if (def.spell?.targets) return def.spell.targets;
  if (def.aura) return [def.aura.target ?? { kind: 'creature' }];
  return [];
}

export function spellEffects(def: CardDef, mode?: number): Effect[] {
  if (def.spell?.modes) return def.spell.modes[mode ?? 0]?.effects ?? [];
  return def.spell?.effects ?? [];
}

const altCache = new WeakMap<CardDef, Partial<Record<CastAlt, CardDef>>>();

/** 以冒險或返照施放時，這個咒語實際的特性（費用、類別、效果） */
export function castDef(def: CardDef, alt?: CastAlt): CardDef {
  if (!alt) return def;
  let m = altCache.get(def);
  if (!m) altCache.set(def, (m = {}));
  if (m[alt]) return m[alt]!;
  let d: CardDef;
  if (alt === 'adventure' && def.adventure) {
    const a = def.adventure;
    d = {
      id: def.id,
      name: a.name,
      zh: a.zh,
      set: def.set,
      rarity: def.rarity,
      cost: a.cost,
      types: a.types,
      subtypes: ['Adventure'],
      spell: a.spell,
      text: a.text,
      imageName: def.imageName,
    };
  } else if (alt === 'back' && def.back) {
    d = def.back;
  } else if (alt === 'warp' && def.warp) {
    d = { ...def, cost: def.warp };
  } else if (alt === 'offspring' && def.offspring) {
    d = { ...def, cost: costToString(addCosts(parseCost(def.cost), parseCost(def.offspring))) };
  } else if (alt === 'mayhem' && def.mayhem) {
    d = { ...def, cost: def.mayhem };
  } else if (alt === 'harmonize' && def.harmonize) {
    d = { ...def, cost: def.harmonize };
  } else if (alt === 'prepared' && def.prepare) {
    const a = def.prepare;
    d = { id: def.id, name: a.name, zh: a.zh, set: def.set, rarity: def.rarity, cost: a.cost, types: a.types, spell: a.spell, text: a.text, imageName: def.imageName };
  } else if (alt === 'disguise' && def.disguise) {
    d = faceDownDef(def, true);
  } else if (alt === 'plot' && def.plot) {
    d = { ...def, cost: def.plot, types: ['Sorcery'], spell: { effects: [] }, addCost: undefined, costReduce: undefined };
  } else if (alt === 'plotted') {
    d = def;
  } else if (alt === 'cycle' && def.cycling) {
    // 循環是起動式異能：任何時候都能起動，不是施放咒語
    d = { ...def, cost: def.cycling.cost, types: ['Instant'], spell: { effects: cycleEffects(def) }, addCost: undefined, costReduce: undefined };
  } else {
    d = { ...def, cost: def.flashback ?? def.cost };
  }
  m[alt] = d;
  return d;
}

export function cycleEffects(def: CardDef): Effect[] {
  return def.cycling?.search ? [{ e: 'tutor', filter: def.cycling.search }] : [{ e: 'draw', n: 1 }];
}

/** 這張牌在目前的區域可以用哪些方式施放 */
export function castAlts(g: GameState, pid: PID, c: Card): (CastAlt | undefined)[] {
  const def = c.def;
  if (c.zone === 'hand' && c.owner === pid) {
    const base: (CastAlt | undefined)[] = def.adventure ? [undefined, 'adventure'] : def.mdfc && def.back ? [undefined, 'back'] : [undefined];
    if (def.disguise) base.push('disguise');
    if (def.warp) base.push('warp');
    if (def.offspring) base.push('offspring');
    if (def.plot) base.push('plot');
    return def.cycling ? [...base, 'cycle'] : base;
  }
  if (c.zone === 'exile' && c.owner === pid && c.plottedTurn !== undefined && c.plottedTurn < g.turn) return ['plotted'];
  if (c.zone === 'battlefield' && c.controller === pid && c.prepared && def.prepare) return ['prepared'];
  if (c.zone === 'exile' && c.owner === pid && c.onAdventure) return [undefined];
  if (c.zone === 'exile' && c.playableTurn === g.turn && c.playableBy === pid) return def.adventure ? [undefined, 'adventure'] : [undefined];
  if (c.zone === 'exile' && c.owner === pid && c.warpExiled !== undefined && c.warpExiled < g.turn) return [undefined];
  if (c.zone === 'graveyard' && c.owner === pid) {
    const out: CastAlt[] = [];
    if (def.flashback || c.tempFlashbackTurn === g.turn) out.push('flashback');
    if (def.harmonize) out.push('harmonize');
    if (def.mayhem && c.discardedTurn === g.turn) out.push('mayhem');
    return out;
  }
  return [];
}

export function modeCount(def: CardDef): number {
  return def.spell?.modes?.length ?? 1;
}

export function spellCost(g: GameState, c: Card, pid: PID, mode?: number, targets?: (TargetRef | null)[], alt?: CastAlt, x = 0): ManaCost {
  const def = castDef(c.def, alt);
  if (alt === 'cycle' || alt === 'plot') return parseCost(def.cost);
  if (alt === 'disguise') {
    const cost = parseCost('{3}');
    if (targets) cost.generic += wardTax(g, pid, targets);
    return cost;
  }
  if (alt === 'plotted') {
    const cost = parseCost('');
    if (targets) cost.generic += wardTax(g, pid, targets);
    return cost;
  }
  let cost = parseCost(def.spell?.modes?.[mode ?? 0]?.cost ?? def.cost);
  if (cost.x) cost.generic += Math.max(0, x) * cost.x;
  const cr = def.costReduce;
  if (cr) {
    if (cr.perGy) {
      let n = 0;
      for (const id of g.players[pid].graveyard) if (matches(g, cr.perGy, g.cards[id], pid)) n++;
      cost = reduceCost(cost, { ...parseCost(''), generic: n });
    }
    if (cr.perMaxMv) {
      let n = 0;
      for (const id of g.battlefield) {
        const s = g.cards[id];
        if (s.controller === pid && matches(g, cr.perMaxMv, s, pid)) n = Math.max(n, manaValue(s.def));
      }
      cost = reduceCost(cost, { ...parseCost(''), generic: n });
    }
    if (cr.perMaxStat) {
      let n = 0;
      for (const id of g.battlefield) {
        const s = g.cards[id];
        if (s.controller !== pid || !matches(g, cr.perMaxStat.filter, s, pid)) continue;
        const st = stats(g, s);
        n = Math.max(n, cr.perMaxStat.stat === 'power' ? st.p : st.t);
      }
      cost = reduceCost(cost, { ...parseCost(''), generic: n });
    }
    if (cr.perCount) cost = reduceCost(cost, { ...parseCost(''), generic: countMatching(g, { ...cr.perCount, ctrl: 'you' }, pid) });
    if (cr.cond && cr.mana && checkCond(g, cr.cond, pid, c.id, [])) cost = reduceCost(cost, parseCost(cr.mana));
  }
  for (const id of g.battlefield) {
    const s = g.cards[id];
    if (s.controller !== pid) continue;
    for (const ab of abilitiesOf(g, s)) {
      if (ab.kind === 'static' && ab.spellCostLess && matches(g, ab.spellCostLess.filter, c, pid)) {
        cost = reduceCost(cost, { ...parseCost(''), generic: ab.spellCostLess.n });
      }
    }
  }
  // 稅：永久物讓咒語多花費用（例如「對手施放的非生物咒語費用多{1}」）
  for (const id of g.battlefield) {
    const s = g.cards[id];
    for (const ab of abilitiesOf(g, s)) {
      if (ab.kind !== 'static' || !ab.spellCostMore) continue;
      const m = ab.spellCostMore;
      if ((m.who === 'all' || s.controller !== pid) && matches(g, m.filter, c, pid)) cost.generic += m.n;
    }
  }
  if (alt === 'harmonize') {
    const h = harmonizeTapper(g, pid);
    if (h) cost = reduceCost(cost, { ...parseCost(''), generic: h.p });
  }
  if (targets) cost.generic += wardTax(g, pid, targets);
  return cost;
}

/** 和聲：選一個未橫置、力量最大的生物來橫置減費 */
export function harmonizeTapper(g: GameState, pid: PID): { id: number; p: number } | null {
  let best: { id: number; p: number } | null = null;
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller !== pid || c.tapped || !isCreature(c)) continue;
    const p = stats(g, c).p;
    if (p > 0 && (!best || p > best.p)) best = { id, p };
  }
  return best;
}

/** 守護—支付生命：以對手的永久物為目標時要支付的生命 */
export function wardLifeTax(g: GameState, pid: PID, targets: (TargetRef | null)[]): number {
  let n = 0;
  for (const t of targets) {
    if (!t || !('c' in t)) continue;
    const tc = g.cards[t.c];
    if (tc && tc.zone === 'battlefield' && tc.controller !== pid && tc.def.wardLife && !abilitiesSuppressed(g, tc)) n += tc.def.wardLife;
  }
  return n;
}

/** 守護—棄掉一張牌：以對手的永久物為目標時，自動棄掉手牌中最不重要的一張；回傳需要棄的張數 */
export function wardDiscardCount(g: GameState, pid: PID, targets: (TargetRef | null)[]): number {
  let n = 0;
  for (const t of targets) {
    if (!t || !('c' in t)) continue;
    const tc = g.cards[t.c];
    if (tc && tc.zone === 'battlefield' && tc.controller !== pid && tc.def.wardDiscard && !abilitiesSuppressed(g, tc)) n++;
  }
  return n;
}

function payWardDiscard(g: GameState, pid: PID, n: number, exclude?: number): void {
  for (let i = 0; i < n; i++) {
    const hand = g.players[pid].hand.filter((id) => id !== exclude).map((id) => g.cards[id]);
    if (!hand.length) return;
    // 優先棄掉地以外法術力值最低的牌；全是地就棄地
    hand.sort((a, b) => Number(isLand(b)) - Number(isLand(a)) || manaValue(a.def) - manaValue(b.def));
    log(g, `守護：棄掉 ${cardName(hand[0])}`, pid);
    discard(g, hand[0]);
  }
}

export function wardTax(g: GameState, pid: PID, targets: (TargetRef | null)[]): number {
  let n = 0;
  for (const t of targets) {
    if (!t || !('c' in t)) continue;
    const tc = g.cards[t.c];
    if (tc && tc.zone === 'battlefield' && tc.controller !== pid && tc.def.ward && !abilitiesSuppressed(g, tc)) n += tc.def.ward;
  }
  return n;
}

// ------------------------------------------------------------
// 起動式異能（含裝備）
// ------------------------------------------------------------
const abilityCache = new WeakMap<CardDef, ActivatedAbility[]>();

export function activatedAbilities(def: CardDef): ActivatedAbility[] {
  let list = abilityCache.get(def);
  if (list) return list;
  list = (def.abilities ?? []).filter((a): a is ActivatedAbility => a.kind === 'activated');
  if (def.equip) {
    list = [
      ...list,
      {
        kind: 'activated',
        cost: { mana: def.equip.cost },
        sorcery: true,
        targets: [{ kind: 'creature', filter: { ctrl: 'you' }, notSelf: true, prompt: '選擇要裝備的生物' }],
        effects: [{ e: 'attach', what: 'T0' }],
        label: `裝備 ${def.equip.cost}`,
        isEquip: true,
      },
    ];
  }
  abilityCache.set(def, list);
  return list;
}

/** 其他永久物授予這張牌的起動式異能（例如「由你操控的鵬洛客具有……」） */
export function grantedAbilities(g: GameState, c: Card): ActivatedAbility[] {
  const out: ActivatedAbility[] = [];
  if (c.zone !== 'battlefield') return out;
  for (const id of g.battlefield) {
    const s = g.cards[id];
    if (s.controller !== c.controller) continue;
    for (const ab of abilitiesOf(g, s)) {
      if (ab.kind === 'static' && ab.grantAbilities && matches(g, ab.grantAbilities.filter, c, c.controller, s.id)) out.push(...ab.grantAbilities.abilities);
    }
  }
  return out;
}

/** 這張牌目前所有的起動式異能（含授予的；索引依序接在本身的異能後面） */
export function abilitiesFor(g: GameState, c: Card): ActivatedAbility[] {
  if (abilitiesSuppressed(g, c)) return [];
  const base = activatedAbilities(c.def);
  const extra = grantedAbilities(g, c);
  return extra.length ? [...base, ...extra] : base;
}

/** 工藝的素材：優先用墳墓場的牌，其次是戰場上價值最低的永久物 */
export function craftMaterials(g: GameState, pid: PID, f: Filter, selfId: number, n = 1): number[] | null {
  const gy = g.players[pid].graveyard.map((id) => g.cards[id]).filter((c) => matches(g, f, c, pid, selfId));
  const bf = sacCandidates(g, pid, { ...f, other: true }, selfId).filter((c) => c.id !== selfId);
  bf.sort((a, b) => manaValue(a.def) - manaValue(b.def) || Number(!!b.token) - Number(!!a.token));
  const pick = [...gy, ...bf].slice(0, n).map((c) => c.id);
  return pick.length === n ? pick : null;
}

function sacCandidates(g: GameState, pid: PID, f: Filter, sourceId?: number): Card[] {
  return g.battlefield
    .map((id) => g.cards[id])
    .filter((c) => c.controller === pid && matches(g, f, c, pid, sourceId));
}

/**
 * 駕駛：挑選要橫置的生物（總力量至少 n）。
 * 優先用剛進場（本來就不能攻擊）的生物，並盡量少浪費力量。找不到回傳 null。
 */
export function crewChoice(g: GameState, pid: PID, vehicle: Card, n: number): number[] | null {
  const cands = g.battlefield
    .map((id) => g.cards[id])
    .filter((c) => c.controller === pid && c.id !== vehicle.id && isCreature(c) && !c.tapped && stats(g, c).p > 0);
  const pow = (c: Card) => stats(g, c).p;
  const cost = (c: Card) => pow(c) + (c.sick && !hasKw(g, c, 'haste') ? 0 : 3);
  if (cands.length <= 12) {
    let best: Card[] | null = null;
    let bestCost = Infinity;
    for (let mask = 1; mask < 1 << cands.length; mask++) {
      const pick = cands.filter((_, i) => mask & (1 << i));
      if (pick.reduce((s, c) => s + pow(c), 0) < n) continue;
      const k = pick.reduce((s, c) => s + cost(c), 0);
      if (k < bestCost) {
        bestCost = k;
        best = pick;
      }
    }
    return best ? best.map((c) => c.id) : null;
  }
  const sorted = [...cands].sort((a, b) => cost(a) - cost(b));
  const out: number[] = [];
  let sum = 0;
  for (const c of sorted) {
    if (sum >= n) break;
    out.push(c.id);
    sum += pow(c);
  }
  return sum >= n ? out : null;
}

/** usedThisTurn 中代表「本回合已起動過忠誠異能」的記號 */
const LOYALTY_USED = 2000;

export function canActivate(g: GameState, pid: PID, c: Card, idx: number): boolean {
  const ab = abilitiesFor(g, c)[idx];
  if (!ab) return false;
  if (ab.fromGraveyard ? c.zone !== 'graveyard' || c.owner !== pid : ab.fromHand ? c.zone !== 'hand' || c.owner !== pid : c.zone !== 'battlefield' || c.controller !== pid) return false;
  if (ab.sorcery && !sorceryTiming(g, pid)) return false;
  if (ab.oncePerTurn && c.usedThisTurn.includes(1000 + idx)) return false;
  if (ab.oncePerGame && c.exhausted?.includes(idx)) return false;
  if (ab.cost.loyalty !== undefined) {
    // 忠誠異能：法術時機、每回合一次、忠誠要夠扣
    if (!sorceryTiming(g, pid) || c.usedThisTurn.includes(LOYALTY_USED)) return false;
    if (ab.cost.loyalty < 0 && (c.loyalty ?? 0) < -ab.cost.loyalty) return false;
  }
  if (ab.cond && !checkCond(g, ab.cond, pid, c.id, [])) return false;
  if (ab.cost.crew !== undefined && crewChoice(g, pid, c, ab.cost.crew) == null) return false;
  if (ab.cost.tap) {
    if (c.tapped) return false;
    if (isCreature(c) && c.sick && !hasKw(g, c, 'haste')) return false;
  }
  if (ab.cost.life && g.players[pid].life < ab.cost.life) return false;
  if (ab.cost.sacOther && sacCandidates(g, pid, ab.cost.sacOther, c.id).length === 0) return false;
  if (ab.cost.craft && craftMaterials(g, pid, ab.cost.craft, c.id, ab.cost.craftCount) == null) return false;
  if (ab.cost.mana) {
    const cost = parseCost(ab.cost.mana);
    if (ab.isEquip) {
      let best = 0;
      for (const id of g.battlefield) {
        const t = g.cards[id];
        if (t.controller === pid && t.id !== c.id && isCreature(t)) best = Math.max(best, t.def.equipDiscount ?? 0);
      }
      cost.generic = Math.max(0, cost.generic - best);
    }
    if (ab.powerUp && c.enteredTurn === g.turn) Object.assign(cost, reduceCost(cost, parseCost(c.def.cost)));
    if (!canPayCost(g, pid, cost, ab.cost.tap ? c.id : undefined)) return false;
  }
  if (!hasTargetsAvailable(g, ab.targets ?? [], pid, c.id)) return false;
  return true;
}

// ------------------------------------------------------------
// 可執行的動作
// ------------------------------------------------------------
export interface PlayOption {
  kind: 'play' | 'cast' | 'activate';
  card: number;
  ability?: number;
  mode?: number;
  specs: TargetSpec[];
  sacFilter?: Filter;
  label: string;
  /** 冒險或返照 */
  alt?: CastAlt;
  /** 施放時的效果（AI 用） */
  effects?: Effect[];
  /** X 咒語：目前付得起的最大 X */
  maxX?: number;
}

/** X 咒語目前付得起的最大 X（不是 X 咒語回傳 undefined） */
export function maxXFor(g: GameState, pid: PID, c: Card, mode?: number, alt?: CastAlt): number | undefined {
  const def = castDef(c.def, alt);
  if (!parseCost(def.spell?.modes?.[mode ?? 0]?.cost ?? def.cost).x) return undefined;
  let x = 0;
  while (x < 20 && canPayCost(g, pid, spellCost(g, c, pid, mode, undefined, alt, x + 1), undefined, !!def.convoke, def)) x++;
  return x;
}

export function castableCards(g: GameState, pid: PID): Card[] {
  const p = g.players[pid];
  const out = p.hand.map((id) => g.cards[id]);
  for (const id of p.exile) {
    const c = g.cards[id];
    if ((c.playableTurn === g.turn && c.playableBy === pid) || c.onAdventure) out.push(c);
  }
  for (const id of p.graveyard) {
    const c = g.cards[id];
    if (c.def.flashback || c.tempFlashbackTurn === g.turn || c.def.harmonize || (c.def.mayhem && c.discardedTurn === g.turn)) out.push(c);
  }
  for (const id of p.exile) {
    const c = g.cards[id];
    if ((c.plottedTurn !== undefined && c.plottedTurn < g.turn) || (c.warpExiled !== undefined && c.warpExiled < g.turn)) out.push(c);
  }
  return out;
}

export function canPlayLand(g: GameState, pid: PID): boolean {
  return sorceryTiming(g, pid) && g.players[pid].landsPlayed < 1 + extraLandDrops(g, pid);
}

export function castOptionsFor(g: GameState, pid: PID, c: Card): PlayOption[] {
  const out: PlayOption[] = [];
  if (isLand(c)) {
    if (c.zone !== 'graveyard' && canPlayLand(g, pid)) out.push({ kind: 'play', card: c.id, specs: [], label: `打出 ${displayName(c.def)}` });
    if (c.def.cycling && c.zone === 'hand' && c.owner === pid) out.push(...castOptionsAs(g, pid, c, 'cycle'));
    if (c.def.plot && c.zone === 'hand' && c.owner === pid) out.push(...castOptionsAs(g, pid, c, 'plot'));
    return out;
  }
  for (const alt of castAlts(g, pid, c)) out.push(...castOptionsAs(g, pid, c, alt));
  return out;
}

function castOptionsAs(g: GameState, pid: PID, c: Card, alt: CastAlt | undefined): PlayOption[] {
  const def = castDef(c.def, alt);
  const out: PlayOption[] = [];
  if (alt === 'cycle') {
    if (!canPayCost(g, pid, parseCost(def.cost))) return out;
    const search = c.def.cycling?.search;
    return [{ kind: 'cast', card: c.id, specs: [], alt, effects: cycleEffects(c.def), label: `${search ? '尋地循環' : '循環'} ${def.cost}` }];
  }
  if (alt === 'plot') {
    if (!sorceryTiming(g, pid) || !canPayCost(g, pid, parseCost(def.cost))) return out;
    return [{ kind: 'cast', card: c.id, specs: [], alt, effects: [], label: `預謀 ${def.cost}` }];
  }
  if (alt === 'plotted' && !sorceryTiming(g, pid)) return out;
  if (!instantSpeed(def) && !sorceryTiming(g, pid)) return out;
  if (c.def.castCond && !checkCond(g, c.def.castCond, pid, c.id, [])) return out;
  if (def.addCost?.life && g.players[pid].life < def.addCost.life) return out;
  if (def.addCost?.sac && sacCandidates(g, pid, def.addCost.sac).length === 0) return out;
  if (def.addCost?.discard && g.players[pid].hand.filter((id) => id !== c.id).length < def.addCost.discard) return out;
  const n = modeCount(def);
  for (let m = 0; m < n; m++) {
    const mode = def.spell?.modes ? m : undefined;
    const specs = castTargetSpecs(def, mode);
    if (!hasTargetsAvailable(g, specs, pid, c.id)) continue;
    const msac = def.spell?.modes?.[m]?.sac;
    if (msac && sacCandidates(g, pid, msac).length === 0) continue;
    const cost = spellCost(g, c, pid, mode, undefined, alt);
    const tapper = alt === 'harmonize' ? harmonizeTapper(g, pid)?.id : undefined;
    if (!canPayCost(g, pid, cost, tapper, !!def.convoke, def)) continue;
    const name = alt === 'adventure' ? (def.zh ?? def.name) : displayName(def);
    out.push({
      kind: 'cast',
      card: c.id,
      mode,
      specs,
      sacFilter: msac ?? def.addCost?.sac,
      alt,
      effects: spellEffects(def, mode),
      maxX: alt === 'plotted' || alt === 'disguise' ? undefined : maxXFor(g, pid, c, mode, alt),
      label:
        alt === 'adventure'
          ? `冒險：${name}`
          : alt === 'flashback'
            ? `返照：${name}`
            : alt === 'back'
              ? `施放背面：${def.name}`
            : alt === 'warp'
              ? `折躍 ${def.cost}`
            : alt === 'offspring'
              ? `子嗣：施放 ${name}（${def.cost}）`
            : alt === 'mayhem'
              ? `騷亂：從墳墓場施放 ${name}`
            : alt === 'harmonize'
              ? `和聲：從墳墓場施放 ${name}`
            : alt === 'prepared'
              ? `施放準備的咒語：${def.zh ?? def.name}${def.spell?.modes ? `（${def.spell.modes[m].text}）` : ''}`
            : alt === 'disguise'
              ? `偽裝：面朝下施放 {3}`
            : alt === 'plotted'
              ? `免費施放（預謀）${def.spell?.modes ? `：${def.spell.modes[m].text}` : ''}`
            : def.spell?.modes
              ? def.spell.modes[m].text
              : `施放 ${name}`,
    });
  }
  return out;
}

/** 戰鬥中不能施放咒語或起動異能（例如「戰鬥中，所有玩家都不能施放咒語」） */
/** 堆疊上有切割（split second）咒語時，不能施放咒語或起動異能 */
export function splitSecondLocked(g: GameState): boolean {
  return g.stack.some((it) => {
    if (it.kind !== 'spell') return false;
    const c = g.cards[it.cardId];
    if (!c) return false;
    if (c.def.splitSecond) return true;
    if (!c.def.types.some((t) => t === 'Instant' || t === 'Sorcery')) return false;
    return g.battlefield.some((id) => {
      const s = g.cards[id];
      return s.controller === it.controller && abilitiesOf(g, s).some((a) => a.kind === 'static' && a.splitSecondSpells);
    });
  });
}

export function combatLocked(g: GameState): boolean {
  if (splitSecondLocked(g)) return true;
  if (!g.phase.startsWith('combat')) return false;
  return g.battlefield.some((id) => abilitiesOf(g, g.cards[id]).some((a) => a.kind === 'static' && a.noCombatActions));
}

export function playOptions(g: GameState, pid: PID): PlayOption[] {
  const out: PlayOption[] = [];
  if (combatLocked(g)) return out;
  for (const c of castableCards(g, pid)) out.push(...castOptionsFor(g, pid, c));
  const gyAbility = g.players[pid].graveyard.filter((id) => activatedAbilities(g.cards[id].def).some((a) => a.fromGraveyard));
  const handAbility = g.players[pid].hand.filter((id) => activatedAbilities(g.cards[id].def).some((a) => a.fromHand));
  for (const id of [...g.battlefield, ...gyAbility, ...handAbility]) {
    const c = g.cards[id];
    if (c.zone === 'battlefield' ? c.controller !== pid : c.owner !== pid) continue;
    if (c.prepared && c.zone === 'battlefield') out.push(...castOptionsAs(g, pid, c, 'prepared'));
    const abs = abilitiesFor(g, c);
    for (let i = 0; i < abs.length; i++) {
      if (!canActivate(g, pid, c, i)) continue;
      out.push({
        kind: 'activate',
        card: c.id,
        ability: i,
        specs: abs[i].targets ?? [],
        sacFilter: abs[i].cost.sacOther,
        label: abs[i].label,
      });
    }
  }
  return out;
}

export function sacChoices(g: GameState, pid: PID, f: Filter, sourceId?: number): number[] {
  return sacCandidates(g, pid, f, sourceId).map((c) => c.id);
}

// ------------------------------------------------------------
// 執行動作（回傳錯誤訊息或 null）
// ------------------------------------------------------------
export function performAction(g: GameState, pid: PID, a: PriorityAction): string | null {
  if ((a.type === 'cast' || a.type === 'activate') && combatLocked(g)) return splitSecondLocked(g) ? '切割咒語在堆疊上時，不能施放咒語或起動異能' : '戰鬥中不能施放咒語或起動異能';
  if (a.type === 'play') return doPlay(g, pid, a.card);
  if (a.type === 'cast') return doCast(g, pid, a);
  if (a.type === 'activate') return doActivate(g, pid, a);
  return null;
}

function inCastableZone(g: GameState, pid: PID, c: Card, alt?: CastAlt): boolean {
  if (isLand(c)) return (c.zone === 'hand' && c.owner === pid) || (c.zone === 'exile' && c.playableTurn === g.turn && c.playableBy === pid);
  return castAlts(g, pid, c).includes(alt);
}

function doPlay(g: GameState, pid: PID, id: number): string | null {
  const c = g.cards[id];
  if (!c || !isLand(c) || !inCastableZone(g, pid, c)) return '無法打出這張地';
  if (!canPlayLand(g, pid)) return '現在不能打出地';
  g.players[pid].landsPlayed++;
  log(g, `打出 ${cardName(c)}`, pid, 'cast');
  enterBattlefield(g, c, pid);
  return null;
}

function doCycle(g: GameState, pid: PID, c: Card): string | null {
  if (!c.def.cycling || c.zone !== 'hand' || c.owner !== pid) return '無法循環這張牌';
  const cost = parseCost(c.def.cycling.cost);
  if (!payCost(g, pid, cost)) return `法術力不足（需要 ${costToString(cost)}）`;
  const label = c.def.cycling.search ? '尋地循環' : '循環';
  log(g, `${label} ${cardName(c)}`, pid, 'cast');
  discard(g, c);
  g.stack.push({
    sid: g.nextSid++,
    kind: 'activated',
    controller: pid,
    cardId: c.id,
    targets: [],
    targetSpecs: [],
    effects: cycleEffects(c.def),
    text: c.def.cycling.search ? '搜尋一張地牌放到手上' : '抓一張牌',
  });
  show(g, { kind: 'activated', player: pid, card: c.id, targets: [], text: label });
  return null;
}

/** 施放已準備生物附帶咒語的複製：複製品是一張暫時放在手上的衍生物，照一般流程施放 */
function doCastPrepared(g: GameState, pid: PID, c: Card, a: Extract<PriorityAction, { type: 'cast' }>): string | null {
  if (c.zone !== 'battlefield' || c.controller !== pid || !c.prepared || !c.def.prepare) return '這個生物沒有準備好';
  const cp = newCard(g, castDef(c.def, 'prepared'), pid, true);
  cp.zone = 'hand';
  g.players[pid].hand.push(cp.id);
  const err = doCast(g, pid, { ...a, card: cp.id, alt: undefined });
  if (err) {
    removeFromZone(g, cp);
    delete g.cards[cp.id];
    return err;
  }
  c.prepared = false;
  g.version++;
  return null;
}

function doPlot(g: GameState, pid: PID, c: Card): string | null {
  if (!c.def.plot || c.zone !== 'hand' || c.owner !== pid) return '無法預謀這張牌';
  if (!sorceryTiming(g, pid)) return '只能在你的主要階段且堆疊為空時預謀';
  const cost = parseCost(c.def.plot);
  if (!payCost(g, pid, cost)) return `法術力不足（需要 ${costToString(cost)}）`;
  moveCard(g, c, 'exile');
  c.plottedTurn = g.turn;
  log(g, `預謀 ${cardName(c)}（之後的回合可以免費施放）`, pid, 'cast');
  return null;
}

function doCast(g: GameState, pid: PID, a: Extract<PriorityAction, { type: 'cast' }>): string | null {
  const c = g.cards[a.card];
  const alt = a.alt;
  if (c && alt === 'cycle') return doCycle(g, pid, c);
  if (c && alt === 'plot') return doPlot(g, pid, c);
  if (c && alt === 'prepared') return doCastPrepared(g, pid, c, a);
  if (!c || isLand(c) || !inCastableZone(g, pid, c, alt)) return '無法施放這張牌';
  const def = castDef(c.def, alt);
  if ((alt === 'plotted' || !instantSpeed(def)) && !sorceryTiming(g, pid)) return '只能在你的主要階段且堆疊為空時施放';
  if (c.def.castCond && !checkCond(g, c.def.castCond, pid, c.id, [])) return '不滿足施放此咒語的條件';
  const mode = def.spell?.modes ? Math.max(0, Math.min(def.spell.modes.length - 1, a.mode ?? 0)) : undefined;
  const specs = castTargetSpecs(def, mode);
  const targets = specs.map((_, i) => a.targets?.[i] ?? null);
  const err = validateTargets(g, specs, targets, pid, c.id);
  if (err) return err;
  const p = g.players[pid];
  let sacCard: Card | undefined;
  const sacF = (mode !== undefined ? def.spell?.modes?.[mode]?.sac : undefined) ?? def.addCost?.sac;
  if (sacF) {
    sacCard = a.sac != null ? g.cards[a.sac] : undefined;
    if (!sacCard || sacCard.zone !== 'battlefield' || sacCard.controller !== pid || !matches(g, sacF, sacCard, pid))
      return '請選擇要犧牲的永久物';
  }
  let discardCard: Card | undefined;
  if (def.addCost?.discard) {
    discardCard = a.discard != null ? g.cards[a.discard] : undefined;
    if (!discardCard || discardCard.zone !== 'hand' || discardCard.owner !== pid || discardCard.id === c.id)
      return '請選擇要棄掉的牌';
  }
  if (def.addCost?.life && p.life < def.addCost.life) return '生命不足';
  const x = parseCost(def.spell?.modes?.[mode ?? 0]?.cost ?? def.cost).x ? Math.max(0, Math.floor(a.x ?? 0)) : undefined;
  const cost = spellCost(g, c, pid, mode, targets, alt, x ?? 0);
  const tapper = alt === 'harmonize' ? harmonizeTapper(g, pid) : null;
  if (!payCost(g, pid, cost, tapper?.id, !!def.convoke, def)) return `法術力不足（需要 ${costToString(cost)}）`;
  if (tapper) {
    g.cards[tapper.id].tapped = true;
    log(g, `和聲：橫置 ${cardName(g.cards[tapper.id])}，費用減少 {${tapper.p}}`, pid);
  }
  if (alt === 'warp') g.voidThisTurn = true;
  const wl = wardLifeTax(g, pid, targets);
  if (wl) {
    log(g, `守護：支付${wl}點生命`, pid, 'life');
    loseLife(g, pid, wl);
  }
  payWardDiscard(g, pid, wardDiscardCount(g, pid, targets), c.id);
  if (def.addCost?.life) {
    p.life -= def.addCost.life;
    p.lifeLostThisTurn += def.addCost.life;
    emit(g, { type: 'lifeloss', player: pid, amount: def.addCost.life });
  }
  if (discardCard) discard(g, discardCard);
  removeFromZone(g, c);
  c.onAdventure = false;
  c.plottedTurn = undefined;
  if (alt === 'disguise') {
    c.hidden = c.def;
    c.def = def;
  }
  c.zone = 'stack';
  c.controller = pid;
  c.playableTurn = undefined;
  const modeText = mode !== undefined ? `（${def.spell!.modes![mode].text}）` : '';
  g.stack.push({
    sid: g.nextSid++,
    kind: 'spell',
    controller: pid,
    cardId: c.id,
    targets,
    targetSpecs: specs,
    effects: spellEffects(def, mode),
    text: def.text,
    modeIndex: mode,
    alt,
    x,
  });
  show(g, { kind: 'spell', player: pid, card: c.id, targets });
  if (sacCard) sacrifice(g, sacCard);
  p.spellsThisTurn++;
  if (def.types.includes('Instant') || def.types.includes('Sorcery')) p.instSorcThisTurn++;
  if (!def.types.includes('Creature')) p.noncreatureThisTurn = (p.noncreatureThisTurn ?? 0) + 1;
  if (p.nextSpellUncounterable) {
    p.nextSpellUncounterable = false;
    g.stack[g.stack.length - 1].uncounterable = true;
  }
  const how = alt === 'adventure' ? '施放冒險 ' : alt === 'flashback' ? '返照施放 ' : '施放 ';
  log(g, `${how}${alt === 'adventure' ? (def.zh ?? def.name) : displayName(def)}${x !== undefined ? `（X=${x}）` : ''}${modeText}${describeTargets(g, targets)}`, pid, 'cast');
  emit(g, { type: 'cast', card: c.id, player: pid, opponentTurn: g.active !== pid });
  for (const t of targets) if (t && 'c' in t && g.cards[t.c].zone === 'battlefield') emit(g, { type: 'targeted', card: t.c, by: pid, spell: true });
  return null;
}

function doActivate(g: GameState, pid: PID, a: Extract<PriorityAction, { type: 'activate' }>): string | null {
  const c = g.cards[a.card];
  if (!c) return '找不到永久物';
  const ab = abilitiesFor(g, c)[a.ability];
  if (!ab || !canActivate(g, pid, c, a.ability)) return '現在不能起動這個異能';
  const specs = ab.targets ?? [];
  const targets = specs.map((_, i) => a.targets?.[i] ?? null);
  const err = validateTargets(g, specs, targets, pid, c.id);
  if (err) return err;
  let sacCard: Card | undefined;
  if (ab.cost.sacOther) {
    sacCard = a.sac != null ? g.cards[a.sac] : undefined;
    if (!sacCard || sacCard.zone !== 'battlefield' || sacCard.controller !== pid || !matches(g, ab.cost.sacOther, sacCard, pid, c.id))
      return '請選擇要犧牲的永久物';
  }
  const cost = parseCost(ab.cost.mana);
  if (ab.isEquip) {
    const t = targets[0];
    const d = t && 'c' in t ? g.cards[t.c]?.def.equipDiscount ?? 0 : 0;
    cost.generic = Math.max(0, cost.generic - d);
  }
  if (ab.powerUp && c.enteredTurn === g.turn) Object.assign(cost, reduceCost(cost, parseCost(c.def.cost)));
  cost.generic += wardTax(g, pid, targets);
  if (!payCost(g, pid, cost, ab.cost.tap ? c.id : undefined)) return '法術力不足';
  if (ab.special) {
    // 翻成正面：特殊動作，立即生效
    turnFaceUp(g, c);
    return null;
  }
  const lki = c.zone === 'battlefield' ? stats(g, c).p : 0;
  const wl = wardLifeTax(g, pid, targets);
  if (wl) {
    log(g, `守護：支付${wl}點生命`, pid, 'life');
    loseLife(g, pid, wl);
  }
  payWardDiscard(g, pid, wardDiscardCount(g, pid, targets));
  if (ab.cost.tap) c.tapped = true;
  if (ab.cost.life) {
    g.players[pid].life -= ab.cost.life;
    g.players[pid].lifeLostThisTurn += ab.cost.life;
  }
  if (ab.oncePerTurn) c.usedThisTurn.push(1000 + a.ability);
  if (ab.oncePerGame) c.exhausted = [...(c.exhausted ?? []), a.ability];
  if (ab.cost.loyalty !== undefined) {
    c.loyalty = (c.loyalty ?? 0) + ab.cost.loyalty;
    c.usedThisTurn.push(LOYALTY_USED);
    if (ab.cost.loyalty > 0) emit(g, { type: 'loyaltyPlaced', card: c.id, controller: pid, amount: ab.cost.loyalty });
    emit(g, { type: 'loyaltyActivated', card: c.id, controller: pid, removed: Math.max(0, -ab.cost.loyalty) });
  }
  if (ab.cost.crew !== undefined) {
    const crew = crewChoice(g, pid, c, ab.cost.crew) ?? [];
    for (const id of crew) g.cards[id].tapped = true;
    const saddle = ab.effects.some((e) => e.e === 'saddle');
    log(g, `${crew.map((id) => cardName(g.cards[id])).join('、')} ${saddle ? '騎乘' : '駕駛'} ${cardName(c)}`, pid);
  }
  g.stack.push({
    sid: g.nextSid++,
    kind: 'activated',
    controller: pid,
    cardId: c.id,
    targets,
    targetSpecs: specs,
    effects: ab.effects,
    text: ab.label,
    lkiPower: lki,
  });
  show(g, { kind: 'activated', player: pid, card: c.id, targets, text: ab.label });
  log(g, `起動 ${cardName(c)}：${ab.label}${describeTargets(g, targets)}`, pid, 'cast');
  if (sacCard) sacrifice(g, sacCard);
  if (ab.cost.sacSelf) sacrifice(g, c);
  if (ab.fromGraveyard && !ab.keepSelf && c.zone === 'graveyard') moveCard(g, c, 'exile');
  if (ab.fromHand && c.zone === 'hand') {
    if (ab.cost.discardSelf) discard(g, c);
    else if (ab.cost.exileSelf) moveCard(g, c, 'exile');
  }
  if (ab.cost.craft) {
    for (const m of craftMaterials(g, pid, ab.cost.craft, c.id, ab.cost.craftCount) ?? []) {
      log(g, `工藝：放逐 ${cardName(g.cards[m])}`, pid);
      moveCard(g, g.cards[m], 'exile');
    }
  }
  for (const t of targets) if (t && 'c' in t && g.cards[t.c].zone === 'battlefield') emit(g, { type: 'targeted', card: t.c, by: pid, spell: false });
  return null;
}

export function describeTargets(g: GameState, targets: (TargetRef | null)[]): string {
  const names = targets
    .filter((t): t is TargetRef => !!t)
    .map((t) => ('p' in t ? g.players[t.p].name : cardName(g.cards[t.c])));
  return names.length ? ` → ${names.join('、')}` : '';
}

export function hasAnyAction(g: GameState, pid: PID): boolean {
  return playOptions(g, pid).length > 0;
}
