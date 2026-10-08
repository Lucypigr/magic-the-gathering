import { getDef } from './registry';
import {
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
    case 'castAny':
      return ev.type === 'cast' && (ev.player === pov || !!ab.anyPlayer) && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    case 'allyEtb': {
      if (ev.type !== 'etb' || ev.card === c.id || ev.controller !== pov) return false;
      const e = g.cards[ev.card];
      return isCreature(e) && matches(g, ab.filter, e, pov, c.id);
    }
    case 'anyEtb': {
      if (ev.type !== 'etb' || ev.card === c.id) return false;
      return isCreature(g.cards[ev.card]);
    }
    case 'allyDies': {
      if (ev.type !== 'dies' || ev.controller !== pov) return false;
      if (ev.card === c.id && !ab.includeSelf) return false;
      return matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    }
    case 'landfall':
      return ev.type === 'etb' && ev.controller === pov && isLand(g.cards[ev.card]);
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
        (!ab.filter || ev.attackers.some((a) => matches(g, ab.filter, g.cards[a], pov, c.id)))
      );
    case 'oppLifeLoss':
      return ev.type === 'lifeloss' && ev.player !== pov;
    case 'sacrifice':
      return ev.type === 'sacrifice' && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
    case 'otherDies':
      return ev.type === 'dies' && ev.card !== c.id && matches(g, ab.filter, g.cards[ev.card], pov, c.id);
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
  }
}

/** 勇行：每當你施放非生物咒語時，此生物得+1/+1直到回合結束 */
const PROWESS: TriggeredAbility = { kind: 'trigger', on: 'castNoncreature', effects: [{ e: 'pump', what: 'self', p: 1, t: 1 }] };

export function emit(g: GameState, ev: GameEvent): void {
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (ev.type === 'cast' && hasKw(g, c, 'prowess') && triggerMatches(g, c, PROWESS, ev)) {
      g.pending.push({ source: c.id, controller: c.controller, ability: PROWESS, abilityIndex: -1, ev });
    }
    const abs = c.def.abilities;
    if (!abs) continue;
    for (let i = 0; i < abs.length; i++) {
      const ab = abs[i];
      if (ab.kind !== 'trigger') continue;
      if (!triggerMatches(g, c, ab, ev)) continue;
      if (ab.oncePerTurn && c.usedThisTurn.includes(i)) continue;
      if (ab.cond && !checkCond(g, ab.cond, c.controller, c.id, [])) continue;
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
  if (c.baseDef) {
    c.def = c.baseDef;
    c.baseDef = undefined;
  }
}

export function moveCard(g: GameState, c: Card, to: Zone, bottom = false): void {
  const wasOnBf = c.zone === 'battlefield';
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
  if (to !== 'exile') c.exiledBy = undefined;
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
  c.playableTurn = undefined;
  g.version++;
  emit(g, { type: 'etb', card: c.id, controller });
}

/** 同時將多張永久物置入墳墓場（生物會觸發「死去」） */
export function putIntoGraveyard(g: GameState, cards: Card[]): void {
  const list = cards.filter((c) => c.zone === 'battlefield');
  for (const c of list) {
    if (isCreature(c)) emit(g, { type: 'dies', card: c.id, controller: c.controller, power: stats(g, c).p });
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

export function drawCards(g: GameState, pid: PID, n: number): void {
  const p = g.players[pid];
  for (let i = 0; i < n; i++) {
    if (!p.library.length) {
      p.drewFromEmpty = true;
      return;
    }
    const id = p.library.shift()!;
    const c = g.cards[id];
    c.zone = 'hand';
    p.hand.push(id);
    p.drawsThisTurn++;
    if (p.drawsThisTurn === 2) emit(g, { type: 'drawSecond', player: pid });
  }
  g.version++;
}

export function discard(g: GameState, c: Card): void {
  log(g, `棄掉 ${cardName(c)}`, c.owner);
  moveCard(g, c, 'graveyard');
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
  const kws = src ? (src.zone === 'battlefield' ? stats(g, src).kw : new Set(src.def.keywords ?? [])) : new Set();
  const srcName = src ? cardName(src) : '';
  if ('p' in target) {
    const p = g.players[target.p];
    loseLife(g, target.p, n);
    if (opts.noLifeGain) p.cantGainLife = true;
    log(g, `${srcName} 對 ${p.name} 造成 ${n} 點傷害（${p.life}）`, srcController, 'damage');
    if (opts.combat && src) emit(g, { type: 'combatDamage', source: src.id, player: target.p, amount: n });
  } else {
    const c = g.cards[target.c];
    if (!c || c.zone !== 'battlefield' || !isCreature(c)) return 0;
    c.damage += n;
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
