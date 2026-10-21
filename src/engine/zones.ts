import { getDef } from './registry';
import {
  abilitiesOf,
  cardName,
  checkCond,
  hasKw,
  isCreature,
  isLand,
  lifegainBonus,
  log,
  matches,
  newCard,
  stats,
} from './state';
import type { Card, GameEvent, GameState, PID, TargetRef, TriggeredAbility, Zone } from './types';

// ------------------------------------------------------------
// 觸發式能力偵測
// ------------------------------------------------------------
function triggerMatches(g: GameState, c: Card, ab: TriggeredAbility, ev: GameEvent): boolean {
  const pov = c.controller;
  switch (ab.on) {
    case 'etb':
      return ev.type === 'etb' && ev.card === c.id;
    case 'dies':
      return ev.type === 'dies' && ev.card === c.id;
    case 'attacks':
      return ev.type === 'attacks' && ev.card === c.id;
    case 'blocks':
      return ev.type === 'blocks' && ev.card === c.id;
    case 'upkeep':
      return ev.type === 'step' && ev.step === 'upkeep' && ev.player === pov;
    case 'oppUpkeep':
      return ev.type === 'step' && ev.step === 'upkeep' && ev.player !== pov;
    case 'endStep':
      return ev.type === 'step' && ev.step === 'endStep' && ev.player === pov;
    case 'combatStart':
      return ev.type === 'step' && ev.step === 'combatStart' && ev.player === pov;
    case 'castNoncreature':
      return ev.type === 'cast' && (ev.player === pov || !!ab.anyPlayer) && !isCreature(g.cards[ev.card]);
    case 'castInstSorc': {
      if (ev.type !== 'cast' || ev.player !== pov) return false;
      const t = g.cards[ev.card].def.types;
      return t.includes('Instant') || t.includes('Sorcery');
    }
    case 'castAny': {
      if (ev.type !== 'cast' || !(ev.player === pov || ab.anyPlayer)) return false;
      // 該咒語以對手或其生物為目標
      if (ab.targetsOpp) {
        const item = g.stack.find((s) => s.kind === 'spell' && s.cardId === ev.card);
        return !!item?.targets.some((t) => t && ('p' in t ? t.p !== pov : g.cards[t.c] && isCreature(g.cards[t.c]) && g.cards[t.c].controller !== pov));
      }
      if (matches(g, ab.filter, g.cards[ev.card], pov, c.id)) return true;
      // 或是該咒語的目標中有符合條件的永久物
      if (ab.orTargets) {
        const item = g.stack.find((s) => s.kind === 'spell' && s.cardId === ev.card);
        return !!item?.targets.some((t) => t && 'c' in t && g.cards[t.c] && matches(g, ab.orTargets, g.cards[t.c], pov, c.id));
      }
      return false;
    }
    case 'allyEtb': {
      if (ev.type !== 'etb' || ev.card === c.id || ev.controller !== pov) return false;
      const e = g.cards[ev.card];
      return isCreature(e) && matches(g, ab.filter, e, pov, c.id);
    }
    case 'anyEtb': {
      if (ev.type !== 'etb' || ev.card === c.id) return false;
      return isCreature(g.cards[ev.card]) && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    }
    case 'allyDies': {
      if (ev.type !== 'dies' || ev.controller !== pov) return false;
      if (!ab.includePw && !isCreature(g.cards[ev.card])) return false;
      if (ev.card === c.id && !ab.includeSelf) return false;
      return matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    }
    case 'landfall':
      return ev.type === 'etb' && ev.controller === pov && isLand(g.cards[ev.card]) && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    case 'lifegain':
      return ev.type === 'lifegain' && ev.player === pov;
    case 'combatDamagePlayer':
      return ev.type === 'combatDamage' && ev.source === c.id;
    case 'allyCombatDamagePlayer':
      return ev.type === 'combatDamage' && g.cards[ev.source]?.controller === pov && matches(g, ab.filter, g.cards[ev.source], pov, c.id);
    case 'dealtDamage':
      return ev.type === 'damaged' && ev.card === c.id;
    case 'targeted':
      return ev.type === 'targeted' && ev.card === c.id && ev.by === pov && (!ab.spellOnly || ev.spell);
    case 'youAttack':
      return (
        ev.type === 'youAttack' &&
        ev.player === pov &&
        (!ab.alone || (ev.attackers.length === 1 && g.cards[ev.attackers[0]]?.attackTarget == null)) &&
        (!ab.filter || ev.attackers.some((a) => matches(g, ab.filter, g.cards[a], pov, c.id)))
      );
    case 'oppLifeLoss':
      return ev.type === 'lifeloss' && ev.player !== pov;
    case 'sacrifice':
      return ev.type === 'sacrifice' && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    case 'otherDies':
      return ev.type === 'dies' && ev.card !== c.id && (ab.includePw || isCreature(g.cards[ev.card])) && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    case 'allyPermEtb':
      return ev.type === 'etb' && ev.card !== c.id && ev.controller === pov && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    case 'allyCounters':
      return ev.type === 'counterPlaced' && ev.controller === pov && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    case 'allyTargeted': {
      if (ev.type !== 'targeted' || ev.by === pov) return false;
      const t = g.cards[ev.card];
      return !!t && t.controller === pov && isCreature(t) && matches(g, ab.filter, t, pov, c.id);
    }
    case 'drawSecond':
      return ev.type === 'drawSecond' && ev.player === pov;
    case 'turnedFaceUp':
      return ev.type === 'turnedFaceUp' && ev.card === c.id;
    case 'scry':
      return ev.type === 'scry' && ev.player === pov;
    case 'loyaltyPlaced':
      return ev.type === 'loyaltyPlaced' && ev.controller === pov;
    case 'loyaltyActivated':
      return ev.type === 'loyaltyActivated' && ev.controller === pov && ev.removed >= (ab.minRemoved ?? 0) && (!ab.filter || matches(g, ab.filter, g.cards[ev.card], pov, c.id));
    case 'noncombatOpp':
      return ev.type === 'noncombat' && ev.player !== pov;
    case 'anyDiscard':
      return ev.type === 'discard';
    case 'discardSelf':
      return ev.type === 'discard' && ev.card === c.id && ev.player === pov;
    case 'mainStart':
      return ev.type === 'step' && ev.step === 'main1' && ev.player === pov;
    case 'eachUpkeep':
      return ev.type === 'step' && ev.step === 'upkeep';
    case 'oppBlocks': {
      if (ev.type !== 'blocks') return false;
      const b = g.cards[ev.card];
      return !!b && b.controller !== pov && matches(g, ab.filter, b, pov, c.id);
    }
    case 'oppLoyaltyActivated':
      return ev.type === 'loyaltyActivated' && ev.controller !== pov;
    case 'eachEndStep':
      return ev.type === 'step' && ev.step === 'endStep';
    case 'targetedByOpp':
      return ev.type === 'targeted' && ev.card === c.id && ev.by !== pov;
    case 'oppCombatDamaged':
      return ev.type === 'combatBatch' && ev.attacker === pov && ev.damaged !== pov;
  }
}

/** 勇行：每當你施放非生物咒語時，此生物得+1/+1直到回合結束 */
const PROWESS: TriggeredAbility = { kind: 'trigger', on: 'castNoncreature', effects: [{ e: 'pump', what: 'self', p: 1, t: 1 }] };

export function emit(g: GameState, ev: GameEvent): void {
  if (ev.type === 'discard') {
    // 「當你棄掉這張牌時」：來源已在墳墓場
    const dc = g.cards[ev.card];
    const dabs = dc?.def.abilities ?? [];
    for (let i = 0; i < dabs.length; i++) {
      const ab = dabs[i];
      if (ab.kind === 'trigger' && ab.on === 'discardSelf' && triggerMatches(g, dc, ab, ev)) {
        g.pending.push({ source: dc.id, controller: dc.owner, ability: ab, abilityIndex: i, ev });
      }
    }
  }
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (ev.type === 'cast' && hasKw(g, c, 'prowess') && triggerMatches(g, c, PROWESS, ev)) {
      g.pending.push({ source: c.id, controller: c.controller, ability: PROWESS, abilityIndex: -1, ev });
    }
    const abs = abilitiesOf(g, c);
    // 裝備授予被裝備生物的觸發式異能
    for (const sid of g.battlefield) {
      const eq = g.cards[sid];
      const tr = eq.attachedTo === c.id ? eq.def.equip?.trigger : undefined;
      if (tr && triggerMatches(g, c, tr, ev)) g.pending.push({ source: c.id, controller: c.controller, ability: tr, abilityIndex: -1, ev });
    }
    if (!abs.length) continue;
    for (let i = 0; i < abs.length; i++) {
      const ab = abs[i];
      if (ab.kind !== 'trigger') continue;
      if (!triggerMatches(g, c, ab, ev)) continue;
      if (ab.oncePerTurn && c.usedThisTurn.includes(i)) continue;
      if (ab.cond && !checkCond(g, ab.cond, c.controller, c.id, [])) continue;
      if (ab.when && !checkCond(g, ab.when, c.controller, c.id, [])) continue;
      if (ab.oncePerTurn) c.usedThisTurn.push(i);
      g.pending.push({
        source: c.id,
        controller: c.controller,
        ability: ab,
        abilityIndex: i,
        ev,
        lkiPower: ev.type === 'dies' && ev.card === c.id ? ev.power : undefined,
      });
    }
  }
  // 來源在墳墓場時也會觸發的觸發式異能（例如「回到戰場」）
  for (const p of g.players) {
    for (const id of p.graveyard.slice()) {
      const gc = g.cards[id];
      const gabs = gc.def.abilities ?? [];
      for (let i = 0; i < gabs.length; i++) {
        const ab = gabs[i];
        if (ab.kind !== 'trigger' || !ab.fromGraveyard || !triggerMatches(g, gc, ab, ev)) continue;
        if (ab.cond && !checkCond(g, ab.cond, gc.controller, gc.id, [])) continue;
        if (ab.when && !checkCond(g, ab.when, gc.controller, gc.id, [])) continue;
        g.pending.push({ source: gc.id, controller: gc.owner, ability: ab, abilityIndex: i, ev });
      }
    }
  }
  // 本回合的延遲觸發（例如「當你下一次施放瞬間或法術時……」）
  if (g.delayed?.length) {
    for (const d of [...g.delayed]) {
      const src = g.cards[d.source];
      if (!src) continue;
      const ab: TriggeredAbility = { kind: 'trigger', on: d.on, effects: d.effects };
      // 延遲觸發的控制者是建立它的玩家，不一定是來源目前的控制者
      const probe = src.controller === d.controller ? src : { ...src, controller: d.controller };
      if (!triggerMatches(g, probe, ab, ev)) continue;
      g.pending.push({ source: d.source, controller: d.controller, ability: ab, abilityIndex: -1, ev });
      if (d.once) g.delayed = g.delayed.filter((x) => x !== d);
    }
  }
}

// ------------------------------------------------------------
// 區域移動
// ------------------------------------------------------------
export function removeFromZone(g: GameState, c: Card): void {
  if (c.zone === 'battlefield') {
    const i = g.battlefield.indexOf(c.id);
    if (i >= 0) g.battlefield.splice(i, 1);
  } else if (c.zone === 'stack') {
    const i = g.stack.findIndex((s) => s.kind === 'spell' && s.cardId === c.id);
    if (i >= 0) g.stack.splice(i, 1);
  } else {
    const arr = g.players[c.owner][c.zone];
    const i = arr.indexOf(c.id);
    if (i >= 0) arr.splice(i, 1);
  }
}

function resetPermanentState(c: Card): void {
  c.tapped = false;
  c.damage = 0;
  c.dtDamage = false;
  c.counters = 0;
  c.stun = 0;
  c.attacking = false;
  c.blocking = null;
  c.blockedBy = [];
  c.wasBlocked = false;
  c.sick = false;
  c.attachedTo = null;
  c.usedThisTurn = [];
  c.exhausted = undefined;
  c.dealtCombat = undefined;
  c.loseAbilitiesTurn = undefined;
  if (c.auraBaseDef) {
    c.def = c.auraBaseDef;
    c.auraBaseDef = undefined;
  }
  c.prepared = undefined;
  c.exileAtEnd = undefined;
  c.suspected = undefined;
  c.loyalty = undefined;
  c.lore = undefined;
  c.sacAtEnd = undefined;
  c.attackTarget = undefined;
  if (c.baseDef) {
    c.def = c.baseDef;
    c.baseDef = undefined;
  }
}

export function moveCard(g: GameState, c: Card, to: Zone, bottom = false): void {
  const wasOnBf = c.zone === 'battlefield';
  const from = c.zone;
  // 使永久物變成生物的光環離開時，恢復原本的樣子
  if (wasOnBf && c.def.aura?.grant?.animate && c.attachedTo != null) {
    const host = g.cards[c.attachedTo];
    if (host?.auraBaseDef) {
      host.def = host.auraBaseDef;
      host.auraBaseDef = undefined;
    }
  }
  if (wasOnBf) c.lastCounters = c.counters;
  // 直到回合結束，將要死去時改為放逐
  if (wasOnBf && to === 'graveyard' && c.exileOnDeathTurn === g.turn) {
    log(g, `${cardName(c)} 改為放逐`, c.owner);
    to = 'exile';
  }
  c.exileOnDeathTurn = undefined;
  // 帶著終結指示物的永久物死去時改為放逐
  if (wasOnBf && to === 'graveyard' && c.finality) {
    log(g, `${cardName(c)} 有終結指示物，改為放逐`, c.owner);
    to = 'exile';
  }
  c.finality = undefined;
  if (wasOnBf && !c.def.types.includes('Land')) g.voidThisTurn = true;
  if (from === 'library' && to === 'graveyard') g.players[c.owner].libToGyThisTurn = (g.players[c.owner].libToGyThisTurn ?? 0) + 1;
  c.warpExiled = undefined;
  if (wasOnBf) {
    c.lastPower = stats(g, c).p;
    g.eot = g.eot.filter((e) => e.card !== c.id);
    for (const id of g.battlefield) {
      const o = g.cards[id];
      if (o.blockedBy.includes(c.id)) o.blockedBy = o.blockedBy.filter((x) => x !== c.id);
    }
  }
  removeFromZone(g, c);
  if (wasOnBf) resetPermanentState(c);
  c.zone = to;
  c.controller = c.owner;
  c.playableTurn = undefined;
  c.onAdventure = false;
  // 面朝下的牌離開戰場後亮出真正的牌
  if (c.hidden) {
    c.def = c.hidden;
    c.hidden = undefined;
  }
  c.plottedTurn = undefined;
  c.saddledTurn = undefined;
  // 雙面牌離開戰場後回到正面
  if (c.front) {
    c.def = c.front;
    c.front = undefined;
  }
  if (to !== 'exile') c.exiledBy = undefined;
  if (to === 'graveyard' && !c.token && !c.def.types.some((t) => t === 'Instant' || t === 'Sorcery')) g.players[c.owner].permToGyThisTurn = true;
  if (c.token && to !== 'battlefield') {
    // 衍生物離開戰場即消失
  } else if (to === 'library') {
    const lib = g.players[c.owner].library;
    if (bottom) lib.push(c.id);
    else lib.unshift(c.id);
  } else if (to === 'battlefield') {
    g.battlefield.push(c.id);
  } else if (to !== 'stack') {
    g.players[c.owner][to].push(c.id);
  }
  g.version++;
  if (wasOnBf) returnLinked(g, c.id);
}

function returnLinked(g: GameState, sourceId: number): void {
  for (const p of g.players) {
    for (const id of [...p.exile]) {
      const e = g.cards[id];
      if (e.exiledBy === sourceId) {
        e.exiledBy = undefined;
        log(g, `${cardName(e)} 回到戰場`, e.owner);
        enterBattlefield(g, e, e.owner);
      }
    }
  }
}

export function enterBattlefield(g: GameState, c: Card, controller: PID, tapped = false): void {
  let t = tapped || !!c.def.etbTapped;
  if (c.def.etbTappedUnless && !checkCond(g, c.def.etbTappedUnless, controller, c.id, [])) t = true;
  if (c.def.shock && !t) {
    if (g.players[controller].life > 10) {
      loseLife(g, controller, 2);
      log(g, `${cardName(c)}：支付2點生命，未橫置進場`, controller, 'life');
    } else t = true;
  }
  if (c.zone !== 'battlefield') removeFromZone(g, c);
  resetPermanentState(c);
  c.zone = 'battlefield';
  g.battlefield.push(c.id);
  c.controller = controller;
  c.tapped = t;
  c.sick = true;
  c.enteredTurn = g.turn;
  c.counters = c.def.etbCounters ?? 0;
  if (c.counters > 0 && isCreature(c)) {
    // 帶著指示物進場：同樣套用「多放 n 個」
    for (const id of g.battlefield) {
      const s = g.cards[id];
      if (s.controller !== controller) continue;
      for (const ab of abilitiesOf(g, s)) if (ab.kind === 'static' && ab.counterPlus) c.counters += ab.counterPlus;
    }
  }
  if (c.def.etbPrepared) c.prepared = true;
  if (c.def.aura?.grant?.loseAbilities) g.loseAbilities = true;
  if (c.def.types.includes('Planeswalker')) c.loyalty = c.def.loyalty ?? 0;
  c.playableTurn = undefined;
  g.version++;
  if (c.def.startEngines && !g.players[controller].speed) {
    g.players[controller].speed = 1;
    log(g, '發動引擎！速度變為 1', controller);
  }
  if (!c.def.types.includes('Land')) g.players[controller].nonlandEtbThisTurn = (g.players[controller].nonlandEtbThisTurn ?? 0) + 1;
  emit(g, { type: 'etb', card: c.id, controller });
  if (c.def.saga) addLore(g, c, 1);
}

/** 在傳奇上放置傳奇指示物，並觸發新到達的章節 */
export function addLore(g: GameState, c: Card, n: number): void {
  const chapters = c.def.saga?.chapters;
  if (!chapters || c.zone !== 'battlefield') return;
  for (let i = 0; i < n; i++) {
    c.lore = (c.lore ?? 0) + 1;
    const ch = chapters[c.lore - 1];
    if (!ch) continue;
    log(g, `${cardName(c)}：第 ${ROMAN[c.lore - 1]} 章`, c.controller);
    g.pending.push({
      source: c.id,
      controller: c.controller,
      ability: { kind: 'trigger', on: 'etb', effects: ch.effects, targets: ch.targets },
      abilityIndex: 3000 + c.lore,
      ev: { type: 'etb', card: c.id, controller: c.controller },
    });
  }
  g.version++;
}
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** 以背面進戰場（模式雙面牌施放背面、轉化後放回戰場） */
export function enterBattlefieldBack(g: GameState, c: Card, controller: PID, tapped = false): void {
  const front = c.front ?? c.def;
  if (!front.back) {
    enterBattlefield(g, c, controller, tapped);
    return;
  }
  if (c.zone !== 'battlefield') removeFromZone(g, c);
  c.front = front;
  c.def = front.back;
  enterBattlefield(g, c, controller, tapped);
}

/** 轉化戰場上的雙面牌（正面 ↔ 背面）；回傳是否成功 */
export function transformCard(g: GameState, c: Card): boolean {
  if (c.zone !== 'battlefield') return false;
  if (c.baseDef) {
    c.def = c.baseDef;
    c.baseDef = undefined;
  }
  if (c.front) {
    c.def = c.front;
    c.front = undefined;
  } else if (c.def.back) {
    c.front = c.def;
    c.def = c.def.back;
  } else return false;
  g.version++;
  return true;
}

/** 在生物上放置 +1/+1 指示物（套用「多放 n 個」的取代效果）；回傳實際放置的數量 */
export function putCounters(g: GameState, c: Card, n: number): number {
  if (n <= 0 || c.zone !== 'battlefield') return 0;
  if (isCreature(c)) {
    for (const id of g.battlefield) {
      const s = g.cards[id];
      if (s.controller !== c.controller) continue;
      for (const ab of abilitiesOf(g, s)) if (ab.kind === 'static' && ab.counterPlus) n += ab.counterPlus;
    }
  }
  c.counters += n;
  emit(g, { type: 'counterPlaced', card: c.id, controller: c.controller, amount: n });
  return n;
}

/** 同時將多張永久物置入墳墓場（生物會觸發「死去」） */
export function putIntoGraveyard(g: GameState, cards: Card[]): void {
  const list = cards.filter((c) => c.zone === 'battlefield');
  for (const c of list) {
    if (isCreature(c)) {
      g.creatureDiedThisTurn = true;
      g.creaturesDiedCount = (g.creaturesDiedCount ?? 0) + 1;
      emit(g, { type: 'dies', card: c.id, controller: c.controller, power: stats(g, c).p });
    } else if (c.def.types.includes('Planeswalker')) {
      emit(g, { type: 'dies', card: c.id, controller: c.controller, power: 0 });
    }
  }
  for (const c of list) moveCard(g, c, 'graveyard');
}

export function destroyCards(g: GameState, cards: Card[]): void {
  const list = cards.filter((c) => c.zone === 'battlefield' && !hasKw(g, c, 'indestructible'));
  for (const c of list) log(g, `${cardName(c)} 被消滅`, c.controller);
  putIntoGraveyard(g, list);
}

export function sacrifice(g: GameState, c: Card): void {
  if (c.zone !== 'battlefield') return;
  log(g, `犧牲 ${cardName(c)}`, c.controller);
  emit(g, { type: 'sacrifice', card: c.id, player: c.controller });
  putIntoGraveyard(g, [c]);
}

export function drawCards(g: GameState, pid: PID, n: number): number {
  const p = g.players[pid];
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (!p.library.length) {
      p.drewFromEmpty = true;
      return drawn;
    }
    drawn++;
    const id = p.library.shift()!;
    const c = g.cards[id];
    c.zone = 'hand';
    p.hand.push(id);
    p.drawsThisTurn++;
    if (p.drawsThisTurn === 2) emit(g, { type: 'drawSecond', player: pid });
  }
  g.version++;
  return drawn;
}

/** 棄牌；silent 時不發出事件（同時棄多張牌時由 discardMany 統一發出一次） */
export function discard(g: GameState, c: Card, silent = false): void {
  log(g, `棄掉 ${cardName(c)}`, c.owner);
  moveCard(g, c, 'graveyard');
  c.discardedTurn = g.turn;
  g.players[c.owner].discardedThisTurn = (g.players[c.owner].discardedThisTurn ?? 0) + 1;
  if (!silent) emit(g, { type: 'discard', player: c.owner, card: c.id });
}

/** 同時棄掉多張牌：「一個或更多張」的觸發只會觸發一次 */
export function discardMany(g: GameState, cards: Card[]): void {
  for (const c of cards) discard(g, c, true);
  const first = cards[0];
  if (first) emit(g, { type: 'discard', player: first.owner, card: first.id });
}

export function gainLife(g: GameState, pid: PID, n: number): void {
  if (n <= 0) return;
  const p = g.players[pid];
  if (p.cantGainLife) return;
  n += lifegainBonus(g, pid);
  p.life += n;
  p.lifeGainedThisTurn += n;
  log(g, `獲得 ${n} 點生命（${p.life}）`, pid, 'life');
  emit(g, { type: 'lifegain', player: pid, amount: n });
}

export function loseLife(g: GameState, pid: PID, n: number): void {
  if (n <= 0) return;
  const p = g.players[pid];
  p.life -= n;
  p.lifeLostThisTurn += n;
  g.version++;
  // 速度：你的回合中對手失去生命時，每回合提升一次（最高 4）
  const act = g.players[g.active];
  if (pid !== g.active && act.speed && act.speed < 4 && act.speedUpTurn !== g.turn) {
    act.speed++;
    act.speedUpTurn = g.turn;
    log(g, act.speed >= 4 ? '速度達到最高（4）！' : `速度提升為 ${act.speed}`, g.active);
  }
  emit(g, { type: 'lifeloss', player: pid, amount: n });
}

/** 造成傷害；回傳實際造成的傷害量 */
export function dealDamage(
  g: GameState,
  src: Card | null,
  srcController: PID,
  target: TargetRef,
  n: number,
  opts: { combat?: boolean; noLifeGain?: boolean } = {},
): number {
  if (n <= 0) return 0;
  // 非戰鬥傷害加成（例如「多造成 1 點傷害」）：只對對手或其永久物
  if (!opts.combat) {
    const victimCtl = 'p' in target ? target.p : g.cards[target.c]?.controller;
    if (victimCtl != null && victimCtl !== srcController) {
      for (const id of g.battlefield) {
        const s = g.cards[id];
        if (s.controller !== srcController) continue;
        for (const ab of abilitiesOf(g, s)) if (ab.kind === 'static' && ab.noncombatPlus) n += ab.noncombatPlus;
      }
    }
  }
  const kws = src ? (src.zone === 'battlefield' ? stats(g, src).kw : new Set(src.def.keywords ?? [])) : new Set();
  const srcName = src ? cardName(src) : '';
  if ('p' in target) {
    const p = g.players[target.p];
    loseLife(g, target.p, n);
    if (opts.noLifeGain) p.cantGainLife = true;
    log(g, `${srcName} 對 ${p.name} 造成 ${n} 點傷害（${p.life}）`, srcController, 'damage');
    if (opts.combat && src) {
      src.dealtCombat = true;
      emit(g, { type: 'combatDamage', source: src.id, player: target.p, amount: n });
    }
    if (!opts.combat) {
      p.noncombatThisTurn = true;
      emit(g, { type: 'noncombat', player: target.p, amount: n, sourceController: srcController });
    }
  } else {
    const c = g.cards[target.c];
    if (!c || c.zone !== 'battlefield') return 0;
    if (!isCreature(c)) {
      // 對鵬洛客造成的傷害會移除等量的忠誠指示物
      if (!c.def.types.includes('Planeswalker')) return 0;
      c.loyalty = (c.loyalty ?? 0) - n;
      log(g, `${srcName} 對 ${cardName(c)} 造成 ${n} 點傷害（忠誠 ${c.loyalty}）`, srcController, 'damage');
      if (kws.has('lifelink')) gainLife(g, srcController, n);
      g.version++;
      return n;
    }
    c.damage += n;
    if (opts.combat && src) src.dealtCombat = true;
    if (kws.has('deathtouch')) c.dtDamage = true;
    log(g, `${srcName} 對 ${cardName(c)} 造成 ${n} 點傷害`, srcController, 'damage');
    emit(g, { type: 'damaged', card: c.id, amount: n });
  }
  if (kws.has('lifelink')) gainLife(g, srcController, n);
  return n;
}

export function createToken(
  g: GameState,
  tokenId: string,
  controller: PID,
  opts: { tapped?: boolean; attacking?: boolean; attachTo?: number } = {},
): Card {
  // 取代效果：神器衍生物改為 5/5 的龍衍生物
  if (getDef(tokenId).types.includes('Artifact') && !tokenId.startsWith('tok-fra-dragon')) {
    for (const id of g.battlefield) {
      const s = g.cards[id];
      if (s.controller === controller && abilitiesOf(g, s).some((a) => a.kind === 'static' && a.artifactTokenDragon)) {
        tokenId = 'tok-fra-dragon';
        break;
      }
    }
  }
  const c = newCard(g, getDef(tokenId), controller, true);
  c.zone = 'exile'; // 暫存，隨即進場
  enterBattlefield(g, c, controller, !!opts.tapped);
  if (opts.attachTo != null) c.attachedTo = opts.attachTo;
  if (opts.attacking) {
    c.attacking = true;
  }
  return c;
}

export function shuffleLibrary(g: GameState, pid: PID, shuffle: (arr: number[]) => void): void {
  shuffle(g.players[pid].library);
}
