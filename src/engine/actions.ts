import { displayName } from '../data/names';
import { costToString, findPayment, parseCost, reduceCost, type ManaCost, type ManaSource } from './mana';
import {
  cardName,
  checkCond,
  hasKw,
  isCreature,
  isLand,
  log,
  matches,
  stats,
} from './state';
import { hasTargetsAvailable, validateTargets } from './targets';
import type {
  ActivatedAbility,
  Card,
  CardDef,
  Effect,
  Filter,
  GameState,
  PID,
  PriorityAction,
  TargetRef,
  TargetSpec,
} from './types';
import { discard, emit, enterBattlefield, removeFromZone, sacrifice } from './zones';

// ------------------------------------------------------------
// 法術力
// ------------------------------------------------------------
export function manaSources(g: GameState, pid: PID, exclude?: number): ManaSource[] {
  const out: ManaSource[] = [];
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller !== pid || c.tapped || !c.def.produces || id === exclude) continue;
    const cr = isCreature(c);
    if (cr && c.sick && !hasKw(g, c, 'haste')) continue;
    out.push({ id, produces: c.def.produces, isCreature: cr });
  }
  return out;
}

export function canPayCost(g: GameState, pid: PID, cost: ManaCost, exclude?: number): boolean {
  return findPayment(cost, manaSources(g, pid, exclude)) !== null;
}

export function payCost(g: GameState, pid: PID, cost: ManaCost, exclude?: number): boolean {
  const pay = findPayment(cost, manaSources(g, pid, exclude));
  if (!pay) return false;
  for (const p of pay) g.cards[p.id].tapped = true;
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

export function modeCount(def: CardDef): number {
  return def.spell?.modes?.length ?? 1;
}

export function spellCost(g: GameState, c: Card, pid: PID, mode?: number, targets?: (TargetRef | null)[]): ManaCost {
  const def = c.def;
  let cost = parseCost(def.spell?.modes?.[mode ?? 0]?.cost ?? def.cost);
  const cr = def.costReduce;
  if (cr) {
    if (cr.perGy) {
      let n = 0;
      for (const id of g.players[pid].graveyard) if (matches(g, cr.perGy, g.cards[id], pid)) n++;
      cost = reduceCost(cost, { ...parseCost(''), generic: n });
    }
    if (cr.cond && cr.mana && checkCond(g, cr.cond, pid, c.id, [])) cost = reduceCost(cost, parseCost(cr.mana));
  }
  for (const id of g.battlefield) {
    const s = g.cards[id];
    if (s.controller !== pid) continue;
    for (const ab of s.def.abilities ?? []) {
      if (ab.kind === 'static' && ab.spellCostLess && matches(g, ab.spellCostLess.filter, c, pid)) {
        cost = reduceCost(cost, { ...parseCost(''), generic: ab.spellCostLess.n });
      }
    }
  }
  if (targets) cost.generic += wardTax(g, pid, targets);
  return cost;
}

export function wardTax(g: GameState, pid: PID, targets: (TargetRef | null)[]): number {
  let n = 0;
  for (const t of targets) {
    if (!t || !('c' in t)) continue;
    const tc = g.cards[t.c];
    if (tc && tc.zone === 'battlefield' && tc.controller !== pid && tc.def.ward) n += tc.def.ward;
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
      },
    ];
  }
  abilityCache.set(def, list);
  return list;
}

function sacCandidates(g: GameState, pid: PID, f: Filter, sourceId?: number): Card[] {
  return g.battlefield
    .map((id) => g.cards[id])
    .filter((c) => c.controller === pid && matches(g, f, c, pid, sourceId));
}

export function canActivate(g: GameState, pid: PID, c: Card, idx: number): boolean {
  const ab = activatedAbilities(c.def)[idx];
  if (!ab || c.zone !== 'battlefield' || c.controller !== pid) return false;
  if (ab.sorcery && !sorceryTiming(g, pid)) return false;
  if (ab.oncePerTurn && c.usedThisTurn.includes(1000 + idx)) return false;
  if (ab.cond && !checkCond(g, ab.cond, pid, c.id, [])) return false;
  if (ab.cost.tap) {
    if (c.tapped) return false;
    if (isCreature(c) && c.sick && !hasKw(g, c, 'haste')) return false;
  }
  if (ab.cost.life && g.players[pid].life < ab.cost.life) return false;
  if (ab.cost.sacOther && sacCandidates(g, pid, ab.cost.sacOther, c.id).length === 0) return false;
  if (ab.cost.mana && !canPayCost(g, pid, parseCost(ab.cost.mana), ab.cost.tap ? c.id : undefined)) return false;
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
}

export function castableCards(g: GameState, pid: PID): Card[] {
  const p = g.players[pid];
  const out = p.hand.map((id) => g.cards[id]);
  for (const id of p.exile) {
    const c = g.cards[id];
    if (c.playableTurn === g.turn && c.playableBy === pid) out.push(c);
  }
  return out;
}

export function canPlayLand(g: GameState, pid: PID): boolean {
  return sorceryTiming(g, pid) && g.players[pid].landsPlayed < 1;
}

export function castOptionsFor(g: GameState, pid: PID, c: Card): PlayOption[] {
  const def = c.def;
  const out: PlayOption[] = [];
  if (isLand(c)) {
    if (canPlayLand(g, pid)) out.push({ kind: 'play', card: c.id, specs: [], label: `打出 ${displayName(def)}` });
    return out;
  }
  if (!instantSpeed(def) && !sorceryTiming(g, pid)) return out;
  if (def.addCost?.life && g.players[pid].life < def.addCost.life) return out;
  if (def.addCost?.sac && sacCandidates(g, pid, def.addCost.sac).length === 0) return out;
  if (def.addCost?.discard && g.players[pid].hand.filter((id) => id !== c.id).length < def.addCost.discard) return out;
  const n = modeCount(def);
  for (let m = 0; m < n; m++) {
    const mode = def.spell?.modes ? m : undefined;
    const specs = castTargetSpecs(def, mode);
    if (!hasTargetsAvailable(g, specs, pid, c.id)) continue;
    const cost = spellCost(g, c, pid, mode);
    if (!canPayCost(g, pid, cost)) continue;
    out.push({
      kind: 'cast',
      card: c.id,
      mode,
      specs,
      sacFilter: def.addCost?.sac,
      label: def.spell?.modes ? def.spell.modes[m].text : `施放 ${displayName(def)}`,
    });
  }
  return out;
}

export function playOptions(g: GameState, pid: PID): PlayOption[] {
  const out: PlayOption[] = [];
  for (const c of castableCards(g, pid)) out.push(...castOptionsFor(g, pid, c));
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller !== pid) continue;
    const abs = activatedAbilities(c.def);
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
  if (a.type === 'play') return doPlay(g, pid, a.card);
  if (a.type === 'cast') return doCast(g, pid, a);
  if (a.type === 'activate') return doActivate(g, pid, a);
  return null;
}

function inCastableZone(g: GameState, pid: PID, c: Card): boolean {
  if (c.zone === 'hand' && c.owner === pid) return true;
  return c.zone === 'exile' && c.playableTurn === g.turn && c.playableBy === pid;
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

function doCast(g: GameState, pid: PID, a: Extract<PriorityAction, { type: 'cast' }>): string | null {
  const c = g.cards[a.card];
  if (!c || isLand(c) || !inCastableZone(g, pid, c)) return '無法施放這張牌';
  const def = c.def;
  if (!instantSpeed(def) && !sorceryTiming(g, pid)) return '只能在你的主要階段且堆疊為空時施放';
  const mode = def.spell?.modes ? Math.max(0, Math.min(def.spell.modes.length - 1, a.mode ?? 0)) : undefined;
  const specs = castTargetSpecs(def, mode);
  const targets = specs.map((_, i) => a.targets?.[i] ?? null);
  const err = validateTargets(g, specs, targets, pid, c.id);
  if (err) return err;
  const p = g.players[pid];
  let sacCard: Card | undefined;
  if (def.addCost?.sac) {
    sacCard = a.sac != null ? g.cards[a.sac] : undefined;
    if (!sacCard || sacCard.zone !== 'battlefield' || sacCard.controller !== pid || !matches(g, def.addCost.sac, sacCard, pid))
      return '請選擇要犧牲的永久物';
  }
  let discardCard: Card | undefined;
  if (def.addCost?.discard) {
    discardCard = a.discard != null ? g.cards[a.discard] : undefined;
    if (!discardCard || discardCard.zone !== 'hand' || discardCard.owner !== pid || discardCard.id === c.id)
      return '請選擇要棄掉的牌';
  }
  if (def.addCost?.life && p.life < def.addCost.life) return '生命不足';
  const cost = spellCost(g, c, pid, mode, targets);
  if (!payCost(g, pid, cost)) return `法術力不足（需要 ${costToString(cost)}）`;
  if (def.addCost?.life) {
    p.life -= def.addCost.life;
    p.lifeLostThisTurn += def.addCost.life;
    emit(g, { type: 'lifeloss', player: pid, amount: def.addCost.life });
  }
  if (discardCard) discard(g, discardCard);
  removeFromZone(g, c);
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
  });
  if (sacCard) sacrifice(g, sacCard);
  p.spellsThisTurn++;
  if (def.types.includes('Instant') || def.types.includes('Sorcery')) p.instSorcThisTurn++;
  log(g, `施放 ${displayName(def)}${modeText}${describeTargets(g, targets)}`, pid, 'cast');
  emit(g, { type: 'cast', card: c.id, player: pid, opponentTurn: g.active !== pid });
  for (const t of targets) if (t && 'c' in t && g.cards[t.c].zone === 'battlefield') emit(g, { type: 'targeted', card: t.c, by: pid, spell: true });
  return null;
}

function doActivate(g: GameState, pid: PID, a: Extract<PriorityAction, { type: 'activate' }>): string | null {
  const c = g.cards[a.card];
  if (!c) return '找不到永久物';
  const ab = activatedAbilities(c.def)[a.ability];
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
  cost.generic += wardTax(g, pid, targets);
  if (!payCost(g, pid, cost, ab.cost.tap ? c.id : undefined)) return '法術力不足';
  const lki = stats(g, c).p;
  if (ab.cost.tap) c.tapped = true;
  if (ab.cost.life) {
    g.players[pid].life -= ab.cost.life;
    g.players[pid].lifeLostThisTurn += ab.cost.life;
  }
  if (ab.oncePerTurn) c.usedThisTurn.push(1000 + a.ability);
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
  log(g, `起動 ${cardName(c)}：${ab.label}${describeTargets(g, targets)}`, pid, 'cast');
  if (sacCard) sacrifice(g, sacCard);
  if (ab.cost.sacSelf) sacrifice(g, c);
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
