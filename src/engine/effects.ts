import { canPayCost, manaSources, payCost } from './actions';
import { colorsOf, findPayment, manaValue, parseCost } from './mana';
import {
  cardName,
  checkCond,
  countMatching,
  isCreature,
  isLand,
  landsOf,
  log,
  matches,
  newCard,
  other,
  randInt,
  shuffleArr,
  stats,
} from './state';
import { legalTargets, validateTargets } from './targets';
import type { Amt, Card, Effect, GameEvent, GameState, PID, Ref, Response, SubFlow, TargetRef, TriggeredAbility } from './types';
import {
  createToken,
  dealDamage,
  destroyCards,
  discard,
  discardMany,
  drawCards,
  emit,
  enterBattlefield,
  gainLife,
  loseLife,
  moveCard,
  putCounters,
  sacrifice,
  enterBattlefieldBack,
  transformCard,
} from './zones';
import { putFaceDown } from './facedown';

/** 「複製」生物的衍生物所帶的異能：在結束步驟開始時，若你沒有操控鵬洛客，犧牲它 */
const COPY_SAC: TriggeredAbility = {
  kind: 'trigger',
  on: 'eachEndStep',
  cond: { c: 'not', cond: { c: 'controls', filter: { type: 'Planeswalker' } } },
  effects: [{ e: 'sac', what: 'self' }],
};

export interface Ctx {
  controller: PID;
  source: number;
  /** 此效果中最近派出的衍生物 */
  created?: number;
  targets: (TargetRef | null)[];
  ev?: GameEvent;
  lkiPower?: number;
  /** 施放時決定的 X */
  x?: number;
  /** 上一個效果實際處理的數量（抓牌、放逐等） */
  count?: number;
  /** 上一個傷害效果造成的過量傷害 */
  excess?: number;
}

// ------------------------------------------------------------
// 對象解析
// ------------------------------------------------------------
interface Resolved {
  players: PID[];
  cards: Card[];
}

function targetIndex(ref: Ref): number {
  if (ref === 'T0') return 0;
  if (ref === 'T1') return 1;
  if (ref === 'T2') return 2;
  return -1;
}

export function resolveRef(g: GameState, ctx: Ctx, ref: Ref): Resolved {
  const out: Resolved = { players: [], cards: [] };
  if (typeof ref === 'object') {
    for (const id of g.battlefield) {
      const c = g.cards[id];
      if (matches(g, ref.all, c, ctx.controller, ctx.source)) out.cards.push(c);
    }
    return out;
  }
  const ti = targetIndex(ref);
  if (ti >= 0) {
    const t = ctx.targets[ti];
    if (!t) return out;
    if ('p' in t) out.players.push(t.p);
    else if (g.cards[t.c]) out.cards.push(g.cards[t.c]);
    return out;
  }
  switch (ref) {
    case 'self': {
      const c = g.cards[ctx.source];
      if (c && c.zone === 'battlefield') out.cards.push(c);
      break;
    }
    case 'selfAny': {
      const c = g.cards[ctx.source];
      if (c) out.cards.push(c);
      break;
    }
    case 'you':
      out.players.push(ctx.controller);
      break;
    case 'opp':
      out.players.push(other(ctx.controller));
      break;
    case 'players':
      out.players.push(0, 1);
      break;
    case 'trig': {
      const ev = ctx.ev;
      const id = ev && 'card' in ev ? ev.card : ev && ev.type === 'combatDamage' ? ev.source : ev && ev.type === 'youAttack' ? ev.attackers[0] : undefined;
      if (id != null && g.cards[id]?.zone === 'battlefield') out.cards.push(g.cards[id]);
      break;
    }
    case 'attached': {
      const s = g.cards[ctx.source];
      if (s && s.attachedTo != null && g.cards[s.attachedTo]?.zone === 'battlefield') out.cards.push(g.cards[s.attachedTo]);
      break;
    }
    case 'created': {
      const c = ctx.created != null ? g.cards[ctx.created] : undefined;
      if (c && c.zone === 'battlefield') out.cards.push(c);
      break;
    }
    case 'evPlayer': {
      const ev = ctx.ev;
      if (ev && 'player' in ev) out.players.push(ev.player);
      break;
    }
    case 'T0ctrl': {
      const t = ctx.targets[0];
      if (t && 'c' in t && g.cards[t.c]) out.players.push(g.cards[t.c].controller);
      else if (t && 'p' in t) out.players.push(t.p);
      break;
    }
  }
  return out;
}

export function amount(g: GameState, ctx: Ctx, a: Amt): number {
  if (typeof a === 'number') return a;
  if ('count' in a) return countMatching(g, a.count, ctx.controller, ctx.source);
  if ('gy' in a) {
    let n = 0;
    for (const id of g.players[ctx.controller].graveyard) if (matches(g, a.gy, g.cards[id], ctx.controller)) n++;
    return n;
  }
  if ('power' in a) {
    if (a.power === 'self') {
      const s = g.cards[ctx.source];
      if (s && s.zone === 'battlefield') return stats(g, s).p;
      return ctx.lkiPower ?? s?.lastPower ?? 0;
    }
    const r = resolveRef(g, ctx, a.power);
    return r.cards[0] && r.cards[0].zone === 'battlefield' ? stats(g, r.cards[0]).p : 0;
  }
  if ('ev' in a) {
    const ev = ctx.ev;
    if (ev && 'amount' in ev) return ev.amount;
    return 0;
  }
  if ('negOf' in a) return -amount(g, ctx, a.negOf);
  if ('last' in a) return ctx.count ?? 0;
  if ('excess' in a) return ctx.excess ?? 0;
  if ('discardedThisTurn' in a) return g.players[ctx.controller].discardedThisTurn ?? 0;
  if ('maxPower' in a) {
    let m = 0;
    for (const id of g.battlefield) {
      const c = g.cards[id];
      if (c.controller === ctx.controller && matches(g, a.maxPower, c, ctx.controller, ctx.source)) m = Math.max(m, stats(g, c).p);
    }
    return m;
  }
  if ('lifeGained' in a) return g.players[ctx.controller].lifeGainedThisTurn;
  if ('libToGy' in a) return resolveRef(g, ctx, a.libToGy).players.reduce<number>((s, p) => s + (g.players[p].libToGyThisTurn ?? 0), 0);
  if ('lkiCounters' in a) return Math.max(0, g.cards[ctx.source]?.lastCounters ?? 0);
  if ('hand' in a) return g.players[ctx.controller].hand.length;
  if ('x' in a) return ctx.x ?? 0;
  if ('spellsCast' in a) return g.players[ctx.controller].spellsThisTurn;
  if ('selfCounters' in a) return Math.max(0, g.cards[ctx.source]?.counters ?? 0);
  if ('colors' in a) {
    const cols = new Set<string>();
    for (const id of g.battlefield) {
      const c = g.cards[id];
      if (c.controller === ctx.controller) for (const k of colorsOf(c.def)) cols.add(k);
    }
    return cols.size;
  }
  return 0;
}

// ------------------------------------------------------------
// 效果執行
// ------------------------------------------------------------
/** 被反擊的咒語去哪裡：返照施放的咒語會被放逐 */
function counteredZone(g: GameState, c: Card): 'graveyard' | 'exile' {
  return g.stack.some((s) => s.kind === 'spell' && s.cardId === c.id && (s.alt === 'flashback' || s.alt === 'harmonize')) ? 'exile' : 'graveyard';
}

export function* runEffects(g: GameState, ctx: Ctx, effects: Effect[]): SubFlow {
  for (const ef of effects) yield* runEffect(g, ctx, ef);
}

function* choose(
  g: GameState,
  player: PID,
  prompt: string,
  options: number[],
  min: number,
  max: number,
  purpose: Extract<import('./types').Decision, { type: 'choose' }>['purpose'],
  reveal = false,
): SubFlow<number[]> {
  if (options.length === 0 || max <= 0) return [];
  min = Math.min(min, options.length);
  max = Math.min(max, options.length);
  const r: Response = yield { type: 'choose', player, prompt, options, min, max, purpose, reveal };
  let ids = r.type === 'choose' ? r.ids.filter((id, i, arr) => options.includes(id) && arr.indexOf(id) === i) : [];
  if (ids.length > max) ids = ids.slice(0, max);
  if (ids.length < min) {
    for (const o of options) {
      if (ids.length >= min) break;
      if (!ids.includes(o)) ids.push(o);
    }
  }
  return ids;
}

function* yesno(g: GameState, player: PID, prompt: string, source?: number, purpose: 'may' | 'pay' = 'may'): SubFlow<boolean> {
  const r: Response = yield { type: 'yesno', player, prompt, source, purpose };
  return r.type === 'yesno' ? r.yes : false;
}

function* runEffect(g: GameState, ctx: Ctx, ef: Effect): SubFlow {
  const src = g.cards[ctx.source] ?? null;
  const me = ctx.controller;
  switch (ef.e) {
    case 'damage': {
      const n = amount(g, ctx, ef.n);
      const r = resolveRef(g, ctx, ef.to);
      for (const p of r.players) dealDamage(g, src, me, { p }, n, { noLifeGain: ef.noLifeGain });
      for (const c of r.cards) {
        // 過量傷害：超過致命傷害的部分
        const lethal = isCreature(c) ? Math.max(0, stats(g, c).t - c.damage) : c.def.types.includes('Planeswalker') ? Math.max(0, c.loyalty ?? 0) : 0;
        if (c.zone === 'battlefield') ctx.excess = Math.max(0, n - lethal);
        dealDamage(g, src, me, { c: c.id }, n);
      }
      break;
    }
    case 'draw': {
      const n = amount(g, ctx, ef.n);
      for (const p of resolveRef(g, ctx, ef.who ?? 'you').players) {
        ctx.count = drawCards(g, p, n);
        log(g, `抽 ${ctx.count} 張牌`, p);
      }
      break;
    }
    case 'discard': {
      const n = amount(g, ctx, ef.n);
      for (const p of resolveRef(g, ctx, ef.who).players) {
        const hand = g.players[p].hand.slice();
        if (ef.random) {
          // 隨機棄牌
          const pick: number[] = [];
          for (let i = 0; i < n && hand.length; i++) pick.push(hand.splice(randInt(g, hand.length), 1)[0]);
          log(g, `隨機棄掉 ${pick.length} 張牌`, p);
          discardMany(g, pick.map((id) => g.cards[id]));
          continue;
        }
        const ids = yield* choose(g, p, `選擇 ${n} 張牌棄掉`, hand, n, n, 'discard');
        discardMany(g, ids.map((id) => g.cards[id]));
      }
      break;
    }
    case 'discardChosen': {
      for (const p of resolveRef(g, ctx, ef.who).players) {
        const hand = g.players[p].hand;
        const names = hand.map((id) => cardName(g.cards[id])).join('、') || '（空）';
        log(g, `${g.players[p].name} 展示手牌：${names}`, p);
        const opts = hand.filter((id) => matches(g, ef.filter, g.cards[id], me));
        const ids = yield* choose(g, me, '選擇對手要棄掉的牌', opts, 1, 1, 'opponentDiscard', true);
        for (const id of ids) discard(g, g.cards[id]);
      }
      break;
    }
    case 'gain': {
      const n = amount(g, ctx, ef.n);
      for (const p of resolveRef(g, ctx, ef.who ?? 'you').players) gainLife(g, p, n);
      break;
    }
    case 'lose': {
      const n = amount(g, ctx, ef.n);
      for (const p of resolveRef(g, ctx, ef.who).players) {
        loseLife(g, p, n);
        log(g, `${g.players[p].name} 失去 ${n} 點生命（${g.players[p].life}）`, p, 'life');
      }
      break;
    }
    case 'destroy': {
      const r = resolveRef(g, ctx, ef.what);
      // 只消滅法術力值 X 或更少的
      if (ef.mvMaxX) r.cards = r.cards.filter((c) => manaValue(c.def) <= (ctx.x ?? 0));
      if (ef.sameName) {
        const names = new Set(r.cards.filter((c) => c.zone === 'battlefield').map((c) => c.def.name));
        for (const id of g.battlefield) if (names.has(g.cards[id].def.name) && !r.cards.includes(g.cards[id])) r.cards.push(g.cards[id]);
      }
      destroyCards(g, r.cards);
      break;
    }
    case 'exile': {
      let n = 0;
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        log(g, `${cardName(c)} 被放逐`, c.controller);
        moveCard(g, c, 'exile');
        n++;
      }
      ctx.count = n;
      break;
    }
    case 'exileLinked': {
      if (!src || src.zone !== 'battlefield') break;
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        log(g, `${cardName(c)} 被放逐（直到 ${cardName(src)} 離開戰場）`, c.controller);
        const isTok = c.token;
        moveCard(g, c, 'exile');
        if (!isTok) c.exiledBy = src.id;
      }
      break;
    }
    case 'bounce': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        log(g, `${cardName(c)} 回到擁有者手上`, c.controller);
        moveCard(g, c, 'hand');
      }
      break;
    }
    case 'tap':
      for (const c of resolveRef(g, ctx, ef.what).cards) if (c.zone === 'battlefield') c.tapped = true;
      g.version++;
      break;
    case 'untap':
      for (const c of resolveRef(g, ctx, ef.what).cards) if (c.zone === 'battlefield') c.tapped = false;
      g.version++;
      break;
    case 'stun':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        c.stun += ef.n ?? 1;
        c.tapped = true;
      }
      g.version++;
      break;
    case 'transform': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        const from = cardName(c);
        if (transformCard(g, c)) log(g, `${from} 轉化為 ${cardName(c)}`, c.controller);
      }
      break;
    }
    case 'returnTransformed': {
      const c = g.cards[ctx.source];
      if (!c || (c.zone !== 'battlefield' && c.zone !== 'graveyard') || !(c.front ?? c.def).back) break;
      const from = cardName(c);
      const owner = c.owner;
      moveCard(g, c, 'exile');
      enterBattlefieldBack(g, c, owner, ef.tapped);
      log(g, `${from} 轉化後回到戰場，成為 ${cardName(c)}`, owner);
      break;
    }
    case 'animate': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield' || c.baseDef) continue;
        c.baseDef = c.def;
        c.def = {
          ...c.def,
          types: [...new Set([...c.def.types, 'Creature' as const])],
          power: ef.p,
          toughness: ef.t,
          keywords: [...new Set([...(c.def.keywords ?? []), ...(ef.kw ?? [])])],
          subtypes: [...(c.def.subtypes ?? []), ...(ef.subtypes ?? [])],
          colors: ef.colors ?? c.def.colors,
        };
        log(g, `${cardName(c)} 成為 ${ef.p}/${ef.t} 的生物直到回合結束`, c.controller);
      }
      g.version++;
      break;
    }
    case 'pump': {
      const p = amount(g, ctx, ef.p);
      const t = amount(g, ctx, ef.t);
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        g.eot.push({ card: c.id, p, t, kw: ef.kw ?? [] });
      }
      g.version++;
      break;
    }
    case 'counters': {
      const n = amount(g, ctx, ef.n);
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield' || !isCreature(c)) continue;
        let k = n;
        if (n > 0) k = putCounters(g, c, n);
        else c.counters += n;
        log(g, k >= 0 ? `${cardName(c)} 得到 ${k} 個 +1/+1 指示物` : `${cardName(c)} 得到 ${-k} 個 -1/-1 指示物`, c.controller);
      }
      break;
    }
    case 'amass': {
      let army = g.battlefield.map((id) => g.cards[id]).find((c) => c.controller === me && c.def.subtypes?.includes('Army'));
      if (!army) army = createToken(g, 'tok-goblin-army', me);
      putCounters(g, army, ef.n);
      log(g, `集結鬼怪 ${ef.n}`, me);
      break;
    }
    case 'connive': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        const p = c.controller;
        drawCards(g, p, 1);
        const ids = yield* choose(g, p, '密謀：選擇一張牌棄掉', g.players[p].hand.slice(), 1, 1, 'discard');
        const d = ids.length ? g.cards[ids[0]] : undefined;
        if (d) {
          discard(g, d);
          if (!isLand(d) && c.zone === 'battlefield') {
            c.counters++;
            emit(g, { type: 'counterPlaced', card: c.id, controller: p, amount: 1 });
          }
        }
      }
      break;
    }
    case 'tuck':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        log(g, `${cardName(c)} 被置於牌庫底`, c.controller);
        moveCard(g, c, 'library', true);
      }
      break;
    case 'revealDraw': {
      const top = g.players[me].library[0];
      if (top == null) break;
      const c = g.cards[top];
      moveCard(g, c, 'hand');
      const mv = manaValue(c.def);
      log(g, `展示並抓 ${cardName(c)}，失去 ${mv} 點生命`, me);
      loseLife(g, me, mv);
      break;
    }
    case 'recruit': {
      drawCards(g, me, 1);
      const ids = yield* choose(g, me, '招募：選擇一張牌棄掉', g.players[me].hand.slice(), 1, 1, 'discard');
      const c = ids.length ? g.cards[ids[0]] : undefined;
      if (c) {
        discard(g, c);
        if (!isLand(c)) createToken(g, 'tok-human-soldier', me);
      }
      break;
    }
    case 'tutor': {
      const lib = g.players[me].library;
      const opts = lib.filter((id) => matches(g, ef.filter, g.cards[id], me));
      const picked = yield* choose(g, me, '從牌庫中搜尋一張牌', opts, 0, 1, 'tutor', true);
      for (const id of picked) {
        if (ef.to === 'battlefield') {
          enterBattlefield(g, g.cards[id], me);
          log(g, `搜尋 ${cardName(g.cards[id])} 放進戰場`, me);
        } else if (ef.to === 'top') {
          // 展示後洗牌，再放到牌庫頂
          shuffleArr(g, lib);
          moveCard(g, g.cards[id], 'library');
          log(g, `搜尋 ${cardName(g.cards[id])} 放到牌庫頂`, me);
        } else {
          moveCard(g, g.cards[id], 'hand');
          log(g, `搜尋 ${cardName(g.cards[id])} 放到手上`, me);
        }
      }
      if (ef.to !== 'top' || !picked.length) shuffleArr(g, lib);
      break;
    }
    case 'removeCounters':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        const isPw = c.def.types.includes('Planeswalker') && !isCreature(c);
        const have = isPw ? Math.max(0, c.loyalty ?? 0) : Math.abs(c.counters);
        if (have === 0) continue;
        let k = Math.min(ef.n, have);
        if (ef.upTo && k > 0) {
          // 「至多」：由玩家選擇要移除幾個
          const options = Array.from({ length: k + 1 }, (_, i) => String(i));
          const r: Response = yield { type: 'mode', player: me, prompt: `要從 ${cardName(c)} 上移除幾個指示物？`, source: ctx.source, options, count: 1, purpose: 'count', meta: { effects: [], specs: [], preferHigh: c.controller !== me } };
          k = r.type === 'modes' ? Math.min(k, Math.max(0, r.picks[0] ?? 0)) : k;
        }
        if (k === 0) continue;
        if (isPw) c.loyalty = (c.loyalty ?? 0) - k;
        else c.counters -= Math.sign(c.counters) * k;
        log(g, `移除 ${cardName(c)} 上的 ${k} 個${isPw ? '忠誠' : ''}指示物`, c.controller);
      }
      g.version++;
      break;
    case 'earthbend': {
      const n = amount(g, ctx, ef.n);
      const t = createToken(g, 'tok-earth', me);
      t.counters = n;
      log(g, `大地彎折 ${n}`, me);
      break;
    }
    case 'manifestDread': {
      const top = g.players[me].library.slice(0, 2);
      if (!top.length) break;
      const [pick] = yield* choose(g, me, '顯化恐懼：選擇要面朝下放進戰場的牌（另一張置入墳墓場）', top, 1, 1, 'dig', false);
      const c = g.cards[pick ?? top[0]];
      putFaceDown(g, c, me, false);
      ctx.created = c.id;
      log(g, '顯化恐懼：一張牌面朝下進入戰場', me);
      for (const id of top) if (id !== c.id) moveCard(g, g.cards[id], 'graveyard');
      break;
    }
    case 'cloak': {
      const id = g.players[me].library[0];
      if (id == null) break;
      putFaceDown(g, g.cards[id], me, true);
      ctx.created = id;
      log(g, '斗篷：牌庫頂的牌面朝下進入戰場', me);
      break;
    }
    case 'suspect':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield' || !isCreature(c)) continue;
        c.suspected = true;
        log(g, `${cardName(c)} 被懷疑（威懾、不能阻擋）`, me);
        g.version++;
      }
      break;
    case 'unprepare':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.prepared) {
          c.prepared = false;
          log(g, `${cardName(c)} 不再是已準備`, c.controller);
          g.version++;
        }
      }
      break;
    case 'setBase':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        g.eot.push({ card: c.id, p: 0, t: 0, kw: [], base: { p: ef.p, t: ef.t } });
        log(g, `${cardName(c)} 的基礎力量與防禦力變為 ${ef.p}/${ef.t}（直到回合結束）`, c.controller);
      }
      g.version++;
      break;
    case 'topOrBottom':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        const top = yield* yesno(g, c.owner, `要把 ${cardName(c)} 放在牌庫頂嗎？（不要則放在牌庫底）`, ctx.source, 'may');
        log(g, `${cardName(c)} 被放在${top ? '牌庫頂' : '牌庫底'}`, c.owner);
        moveCard(g, c, 'library', !top);
      }
      break;
    case 'win':
      log(g, `${g.players[me].name} 贏得遊戲`, me, 'result');
      g.players[me].drewFromEmpty = false;
      g.players[other(me)].lost = true;
      break;
    case 'delayed': {
      (g.delayed ??= []).push({ controller: me, source: ctx.source, on: ef.on, effects: ef.effects, once: ef.once ?? true });
      log(g, '本回合的延遲觸發已設定', me);
      break;
    }
    case 'nextSpellUncounterable':
      g.players[me].nextSpellUncounterable = true;
      break;
    case 'wheel':
      for (const p of [g.active, other(g.active)]) {
        const yes = yield* yesno(g, p, '要棄掉你的手牌並抓七張牌嗎？', ctx.source, 'may');
        if (!yes) continue;
        discardMany(g, g.players[p].hand.map((id) => g.cards[id]));
        drawCards(g, p, 7);
        log(g, '棄掉手牌並抓七張牌', p);
      }
      break;
    case 'copyOfSelf': {
      const s = g.cards[ctx.source];
      if (!s) break;
      const t = newCard(g, s.def, me, true);
      t.zone = 'exile';
      enterBattlefield(g, t, me);
      log(g, `派出 ${cardName(s)} 的衍生物複製`, me);
      break;
    }
    case 'copySpell': {
      const ev = ctx.ev;
      const item = ev && ev.type === 'cast' ? g.stack.find((it) => it.kind === 'spell' && it.cardId === ev.card) : undefined;
      if (!item) break;
      const orig = g.cards[item.cardId];
      const cp = newCard(g, orig.def, me, true);
      cp.zone = 'stack';
      let targets = item.targets.slice();
      if (item.targetSpecs.length) {
        // 可以選擇新目標
        const r: Response = yield { type: 'targets', player: me, source: cp.id, specs: item.targetSpecs, text: orig.def.text, effects: item.effects };
        if (r.type === 'targets') {
          const chosen = item.targetSpecs.map((_, i) => r.targets[i] ?? null);
          if (!validateTargets(g, item.targetSpecs, chosen, me, cp.id)) targets = chosen;
        }
      }
      g.stack.push({ ...item, sid: g.nextSid++, cardId: cp.id, controller: me, targets, alt: undefined, uncounterable: false });
      log(g, `複製了 ${cardName(orig)}`, me, 'cast');
      g.version++;
      break;
    }
    case 'prepare':
      if (src && src.zone === 'battlefield' && src.def.prepare) {
        src.prepared = true;
        log(g, `${cardName(src)} 成為已準備`, me);
        g.version++;
      }
      break;
    case 'saddle':
      if (src && src.zone === 'battlefield') {
        src.saddledTurn = g.turn;
        g.version++;
      }
      break;
    case 'endure': {
      const n = amount(g, ctx, ef.n);
      if (src && src.zone === 'battlefield') {
        putCounters(g, src, n);
        log(g, `${cardName(src)} 堅忍 ${n}`, me);
      } else {
        const t = createToken(g, 'tok-spirit-endure', me);
        t.counters = n;
        log(g, `堅忍 ${n}：派出 ${n}/${n} 精怪`, me);
      }
      g.version++;
      break;
    }
    case 'doubleCounters':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield' || c.counters <= 0) continue;
        c.counters *= 2;
        log(g, `${cardName(c)} 的 +1/+1 指示物加倍為 ${c.counters} 個`, c.controller);
      }
      break;
    case 'token': {
      const n = amount(g, ctx, ef.n ?? 1);
      for (const p of resolveRef(g, ctx, ef.who ?? 'you').players) {
        const host = ef.attachTo ? resolveRef(g, ctx, ef.attachTo).cards.find((c) => c.zone === 'battlefield' && isCreature(c)) : undefined;
        for (let i = 0; i < n; i++) {
          const t = createToken(g, ef.token, p, { tapped: ef.tapped, attacking: ef.attacking, attachTo: host?.id });
          if (ef.temp) t.sacAtEnd = true;
          ctx.created = t.id;
        }
        log(g, `派出 ${n} 個衍生物`, p);
      }
      break;
    }
    case 'mill': {
      const n = amount(g, ctx, ef.n);
      for (const p of resolveRef(g, ctx, ef.who ?? 'you').players) {
        const lib = g.players[p].library;
        for (let i = 0; i < n && lib.length; i++) moveCard(g, g.cards[lib[0]], 'graveyard');
        log(g, `碾磨 ${n} 張牌`, p);
      }
      break;
    }
    case 'scry': {
      const top = g.players[me].library.slice(0, ef.n);
      const bottom = yield* choose(g, me, `占卜 ${ef.n}：選擇要放到牌庫底的牌`, top, 0, top.length, 'scryBottom', true);
      for (const id of bottom) moveCard(g, g.cards[id], 'library', true);
      log(g, `占卜 ${ef.n}`, me);
      g.players[me].scriedThisTurn = true;
      emit(g, { type: 'scry', player: me });
      break;
    }
    case 'surveil': {
      const top = g.players[me].library.slice(0, ef.n);
      const gy = yield* choose(g, me, `刺探 ${ef.n}：選擇要置入墳墓場的牌`, top, 0, top.length, 'surveilGy', true);
      for (const id of gy) moveCard(g, g.cards[id], 'graveyard');
      log(g, `刺探 ${ef.n}`, me);
      g.players[me].scriedThisTurn = true;
      emit(g, { type: 'scry', player: me });
      break;
    }
    case 'dig': {
      const top = g.players[me].library.slice(0, amount(g, ctx, ef.n));
      const opts = top.filter((id) => matches(g, ef.filter, g.cards[id], me));
      const take = ef.take ?? 1;
      const toBf = ef.to === 'battlefield';
      const picked = yield* choose(g, me, toBf ? `選擇至多 ${take} 張牌放進戰場` : `選擇 ${take} 張牌置於手上`, opts, toBf ? 0 : Math.min(take, opts.length), take, 'dig', true);
      for (const id of picked) {
        if (toBf) {
          log(g, `將 ${cardName(g.cards[id])} 放進戰場`, me);
          enterBattlefield(g, g.cards[id], me);
        } else moveCard(g, g.cards[id], 'hand');
      }
      for (const id of top) {
        if (picked.includes(id) || ef.rest === 'top') continue;
        moveCard(g, g.cards[id], ef.rest === 'bottom' ? 'library' : 'graveyard', true);
      }
      break;
    }
    case 'searchLand': {
      const who = ef.who ? resolveRef(g, ctx, ef.who).players[0] : me;
      if (who == null) break;
      const lib = g.players[who].library;
      const opts = lib.filter((id) => {
        const d = g.cards[id].def;
        return d.types.includes('Land') && d.supertypes?.includes('Basic');
      });
      // 同名只保留一張當作選項
      const seen = new Set<string>();
      const uniq = opts.filter((id) => {
        const n = g.cards[id].def.name;
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
      const picked = yield* choose(g, who, '搜尋一張基本地', uniq, ef.may || who !== me ? 0 : 1, 1, 'search', true);
      for (const id of picked) {
        const c = g.cards[id];
        if (ef.to === 'battlefield') {
          log(g, `搜尋 ${cardName(c)} 放進戰場`, who);
          enterBattlefield(g, c, who, !!ef.tapped);
          if (ef.untapIfLands && landsOf(g, who).length >= ef.untapIfLands) c.tapped = false;
        } else {
          moveCard(g, c, 'hand');
          log(g, `搜尋 ${cardName(c)} 放到手上`, who);
        }
      }
      shuffleArr(g, g.players[who].library);
      break;
    }
    case 'counter': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'stack') continue;
        if (c.def.uncounterable || g.stack.some((it) => it.cardId === c.id && it.uncounterable)) {
          log(g, `${cardName(c)} 不能被反擊`, c.controller);
          continue;
        }
        log(g, `${cardName(c)} 被反擊`, c.controller, 'cast');
        moveCard(g, c, counteredZone(g, c));
      }
      break;
    }
    case 'counterUnless': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'stack' || c.def.uncounterable || g.stack.some((it) => it.cardId === c.id && it.uncounterable)) continue;
        const payer = c.controller;
        const cost = { ...parseCost(''), generic: ef.pay };
        let paid = false;
        if (canPayCost(g, payer, cost)) {
          const yes = yield* yesno(g, payer, `支付 {${ef.pay}} 以避免 ${cardName(c)} 被反擊？`, c.id, 'pay');
          if (yes) paid = payCost(g, payer, cost);
        }
        if (paid) log(g, `支付了 {${ef.pay}}`, payer);
        else {
          log(g, `${cardName(c)} 被反擊`, payer, 'cast');
          moveCard(g, c, counteredZone(g, c));
        }
      }
      break;
    }
    case 'fight':
    case 'bite': {
      const a = resolveRef(g, ctx, ef.a).cards[0];
      const b = resolveRef(g, ctx, ef.b).cards[0];
      if (!a || !b || a.zone !== 'battlefield' || b.zone !== 'battlefield') break;
      if (!isCreature(a) || !isCreature(b)) break;
      const pa = stats(g, a).p;
      const pb = stats(g, b).p;
      dealDamage(g, a, a.controller, { c: b.id }, pa);
      if (ef.e === 'fight') dealDamage(g, b, b.controller, { c: a.id }, pb);
      break;
    }
    case 'toHand':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'graveyard') continue;
        log(g, `${cardName(c)} 從墳墓場回到手上`, c.owner);
        moveCard(g, c, 'hand');
      }
      break;
    case 'reanimate':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'graveyard') continue;
        log(g, `${cardName(c)} 從墳墓場回到戰場`, me);
        enterBattlefield(g, c, me, !!ef.tapped);
        if (ef.counters) putCounters(g, c, ef.counters);
        if (ef.finality) c.finality = true;
      }
      break;
    case 'reanimateAll': {
      const ids = g.players[me].graveyard.filter((id) => matches(g, ef.filter, g.cards[id], me));
      for (const id of ids) {
        const c = g.cards[id];
        if (c.zone !== 'graveyard') continue;
        enterBattlefield(g, c, me);
      }
      if (ids.length) log(g, `${ids.length} 張牌從墳墓場回到戰場`, me);
      break;
    }
    case 'kindredJudgment': {
      const types = new Set<string>();
      for (const id of g.battlefield) {
        const c = g.cards[id];
        if (!isCreature(c) || c.def.changeling) continue;
        for (const s of c.def.subtypes ?? []) types.add(s);
      }
      // 最後多一個「沒有任何生物的類別」：等於消滅所有生物
      const options = [...types].sort();
      const NONE = '（任何戰場上沒有生物的類別）';
      const r: Response = yield { type: 'mode', player: me, prompt: '選擇一個生物類別：消滅所有不是該類別的生物', source: ctx.source, options: [...options, NONE], count: 1, purpose: 'creatureType' };
      const pick = r.type === 'modes' ? r.picks[0] : options.length;
      const chosen = options[pick] ?? NONE;
      log(g, `選擇的生物類別：${chosen}`, me);
      const dying = g.battlefield.map((id) => g.cards[id]).filter((c) => isCreature(c) && !(c.def.changeling || c.def.subtypes?.includes(chosen)));
      destroyCards(g, dying);
      break;
    }
    case 'exileIfDies':
      for (const c of resolveRef(g, ctx, ef.what).cards) if (c.zone === 'battlefield') c.exileOnDeathTurn = g.turn;
      break;
    case 'grantFlashback':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'graveyard') continue;
        c.tempFlashbackTurn = g.turn;
        log(g, `${cardName(c)} 直到回合結束獲得返照`, me);
      }
      break;
    case 'mountainBonus':
      g.players[me].mountainBonus = true;
      log(g, '直到回合結束，山脈額外產生{R}', me);
      break;
    case 'addMana':
      (g.players[me].pool ??= []).push(...ef.mana);
      log(g, `加入法術力：${ef.mana.map((m) => `{${m}}`).join('')}`, me);
      break;
    case 'addManaDistinctPower': {
      const powers = new Set<number>();
      for (const id of g.battlefield) {
        const c = g.cards[id];
        if (c.controller === me && isCreature(c)) powers.add(stats(g, c).p);
      }
      const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
      const r: Response = yield { type: 'mode', player: me, prompt: '選擇一種顏色（依你操控的生物中不同力量的數量加入法術力）', source: ctx.source, options: [...COLORS], count: 1, purpose: 'color' };
      const col = COLORS[r.type === 'modes' ? r.picks[0] ?? 0 : 0] ?? 'W';
      (g.players[me].pool ??= []).push(...Array.from({ length: powers.size }, () => col));
      log(g, `加入 ${powers.size} 點{${col}}法術力`, me);
      break;
    }
    case 'revealUntil': {
      const lib = g.players[me].library;
      const revealed: number[] = [];
      let found: Card | undefined;
      for (const id of lib) {
        revealed.push(id);
        if (matches(g, ef.filter, g.cards[id], me)) {
          found = g.cards[id];
          break;
        }
      }
      log(g, `展示：${revealed.map((id) => cardName(g.cards[id])).join('、') || '（無）'}`, me);
      const rest = revealed.filter((id) => id !== found?.id);
      if (found) enterBattlefield(g, found, me);
      // 其餘以隨機順序置於牌庫底
      for (let i = rest.length - 1; i > 0; i--) {
        const j = randInt(g, i + 1);
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      for (const id of rest) moveCard(g, g.cards[id], 'library', true);
      break;
    }
    case 'copyCreatures': {
      for (const p of resolveRef(g, ctx, ef.who).players) {
        const originals = g.battlefield.map((id) => g.cards[id]).filter((c) => c.controller === p && isCreature(c));
        for (const o of originals) {
          const def = {
            ...o.def,
            keywords: [...new Set([...(o.def.keywords ?? []), 'haste' as const])],
            abilities: [...(o.def.abilities ?? []), COPY_SAC],
            text: `${o.def.text}\n敏捷\n在結束步驟開始時，若你沒有操控鵬洛客，犧牲此生物。`,
          };
          const t = newCard(g, def, me, true);
          t.zone = 'exile';
          enterBattlefield(g, t, me);
        }
        log(g, `派出 ${originals.length} 個生物的衍生物複製`, me);
      }
      break;
    }
    case 'reflexive': {
      const specs = ef.targets;
      const options = specs.map((s) => legalTargets(g, s, me, ctx.source));
      if (specs.some((s, i) => !s.optional && options[i].length === 0)) break;
      const r: Response = yield { type: 'targets', player: me, source: ctx.source, specs, text: src?.def.text ?? '', effects: ef.effects };
      let targets = specs.map((_, i) => (r.type === 'targets' ? r.targets[i] ?? null : null));
      if (validateTargets(g, specs, targets, me, ctx.source)) targets = specs.map((s, i) => (s.optional ? null : options[i][0] ?? null));
      g.stack.push({ sid: g.nextSid++, kind: 'trigger', controller: me, cardId: ctx.source, targets, targetSpecs: specs, effects: ef.effects, text: src?.def.text ?? '' });
      break;
    }
    case 'edictMax':
      for (const p of resolveRef(g, ctx, ef.who).players) {
        const cands = g.battlefield.filter((id) => {
          const c = g.cards[id];
          return c.controller === p && (isCreature(c) || c.def.types.includes('Planeswalker'));
        });
        if (!cands.length) continue;
        const top = Math.max(...cands.map((id) => manaValue(g.cards[id].def)));
        const opts = cands.filter((id) => manaValue(g.cards[id].def) === top);
        const ids = yield* choose(g, p, '選擇法術力值最大的生物或鵬洛客犧牲', opts, 1, 1, 'sacrifice');
        for (const id of ids) sacrifice(g, g.cards[id]);
      }
      break;
    case 'edict':
      for (const p of resolveRef(g, ctx, ef.who).players) {
        const opts = g.battlefield.filter((id) => {
          const c = g.cards[id];
          return c.controller === p && isCreature(c) && matches(g, ef.filter, c, p);
        });
        const ids = yield* choose(g, p, '選擇一個生物犧牲', opts, 1, 1, 'sacrifice');
        for (const id of ids) sacrifice(g, g.cards[id]);
      }
      break;
    case 'sac':
      for (const c of resolveRef(g, ctx, ef.what).cards) sacrifice(g, c);
      break;
    case 'impulse': {
      const lib = g.players[me].library;
      for (let i = 0; i < ef.n && lib.length; i++) {
        const c = g.cards[lib[0]];
        moveCard(g, c, 'exile');
        c.playableTurn = g.turn;
        c.playableBy = me;
        log(g, `放逐牌庫頂的 ${cardName(c)}，本回合可以使用它`, me);
      }
      break;
    }
    case 'role':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        createToken(g, ef.token, me, { attachTo: c.id });
        log(g, `${cardName(c)} 得到角色衍生物`, me);
      }
      break;
    case 'attach': {
      const t = resolveRef(g, ctx, ef.what).cards[0];
      if (!src || src.zone !== 'battlefield' || !t || t.zone !== 'battlefield' || !isCreature(t)) break;
      src.attachedTo = t.id;
      log(g, `${cardName(src)} 裝備到 ${cardName(t)}`, me);
      g.version++;
      break;
    }
    case 'if': {
      const ok = checkCond(g, ef.cond, me, ctx.source, ctx.targets, ctx.ev);
      yield* runEffects(g, ctx, ok ? ef.then : ef.else ?? []);
      break;
    }
    case 'may': {
      const yes = yield* yesno(g, me, ef.prompt, ctx.source);
      if (yes) yield* runEffects(g, ctx, ef.effects);
      break;
    }
    case 'costThen': {
      const cost = ef.cost;
      let paid = false;
      if (cost.sac) {
        const opts = g.battlefield.filter((id) => {
          const c = g.cards[id];
          return c.controller === me && matches(g, cost.sac, c, me, ctx.source);
        });
        const ids = yield* choose(g, me, ef.prompt, opts, 0, 1, 'sacrifice');
        if (ids.length) {
          sacrifice(g, g.cards[ids[0]]);
          paid = true;
        }
      } else if (cost.blight) {
        const opts = g.battlefield.filter((id) => {
          const c = g.cards[id];
          return c.controller === me && isCreature(c);
        });
        const ids = yield* choose(g, me, ef.prompt, opts, 0, 1, 'blight');
        if (ids.length) {
          const c = g.cards[ids[0]];
          c.counters -= cost.blight;
          log(g, `枯萎 ${cost.blight}：${cardName(c)} 得到 -1/-1 指示物`, me);
          paid = true;
        }
      } else if (cost.discard) {
        const ids = yield* choose(g, me, ef.prompt, g.players[me].hand.slice(), 0, 1, 'discard');
        if (ids.length) {
          discard(g, g.cards[ids[0]]);
          paid = true;
        }
      } else if (cost.exileGy) {
        const opts = g.players[me].graveyard.filter((id) => id !== ctx.source && matches(g, cost.exileGy, g.cards[id], me));
        const ids = yield* choose(g, me, ef.prompt, opts, 0, 1, 'dig', true);
        if (ids.length) {
          moveCard(g, g.cards[ids[0]], 'exile');
          log(g, `放逐墳墓場中的 ${cardName(g.cards[ids[0]])}`, me);
          paid = true;
        }
      } else if (cost.exileNamed) {
        const name = src?.def.name;
        const same = g.players[me].graveyard.filter((id) => id !== ctx.source && g.cards[id].def.name === name);
        if (src && same.length >= cost.exileNamed) {
          const yes = yield* yesno(g, me, ef.prompt, ctx.source, 'may');
          if (yes) {
            for (const id of same.slice(0, cost.exileNamed)) moveCard(g, g.cards[id], 'exile');
            if (src.zone === 'stack') moveCard(g, src, 'exile');
            paid = true;
          }
        }
      } else if (cost.mana) {
        const c = parseCost(cost.mana);
        if (findPayment(c, manaSources(g, me))) {
          const yes = yield* yesno(g, me, ef.prompt, ctx.source, 'pay');
          if (yes) paid = payCost(g, me, c);
        }
      } else if (cost.life) {
        const yes = yield* yesno(g, me, ef.prompt, ctx.source, 'pay');
        if (yes) {
          loseLife(g, me, cost.life);
          paid = true;
        }
      }
      if (paid) yield* runEffects(g, ctx, ef.then);
      break;
    }
    case 'shuffleIn': {
      const owners = new Set<PID>();
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        log(g, `${cardName(c)} 被洗回牌庫`, c.controller);
        owners.add(c.owner);
        moveCard(g, c, 'library');
      }
      for (const p of owners) shuffleArr(g, g.players[p].library);
      break;
    }
    case 'exileGy':
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'graveyard') continue;
        log(g, `放逐墳墓場中的 ${cardName(c)}`, me);
        moveCard(g, c, 'exile');
      }
      break;
    case 'landFromHand': {
      const opts = g.players[me].hand.filter((id) => isLand(g.cards[id]));
      const ids = yield* choose(g, me, '你可以將一張地牌從手上放進戰場', opts, 0, 1, 'landFromHand');
      for (const id of ids) {
        log(g, `將 ${cardName(g.cards[id])} 放進戰場`, me);
        enterBattlefield(g, g.cards[id], me);
      }
      break;
    }
    case 'explore': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        const lib = g.players[c.controller].library;
        if (!lib.length) continue;
        const top = g.cards[lib[0]];
        log(g, `${cardName(c)} 探險：展示 ${cardName(top)}`, c.controller);
        if (isLand(top)) {
          moveCard(g, top, 'hand');
          continue;
        }
        if (isCreature(c)) putCounters(g, c, 1);
        const gy = yield* choose(g, c.controller, `探險：要把 ${cardName(top)} 置入墳墓場嗎？（不選則留在牌庫頂）`, [top.id], 0, 1, 'surveilGy', true);
        if (gy.length) moveCard(g, top, 'graveyard');
      }
      g.version++;
      break;
    }
    case 'flicker': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield' || c.token) continue;
        log(g, `${cardName(c)} 被放逐後回到戰場`, c.owner);
        moveCard(g, c, 'exile');
        enterBattlefield(g, c, c.owner);
        if (ef.counters) putCounters(g, c, ef.counters);
      }
      break;
    }
    case 'loyalty': {
      const n = amount(g, ctx, ef.n);
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield' || !c.def.types.includes('Planeswalker')) continue;
        c.loyalty = (c.loyalty ?? 0) + n;
        log(g, `${cardName(c)} 的忠誠${n >= 0 ? '+' : ''}${n}（${c.loyalty}）`, c.controller);
        if (n > 0) emit(g, { type: 'loyaltyPlaced', card: c.id, controller: c.controller, amount: n });
      }
      g.version++;
      break;
    }
    case 'empowerJace': {
      const n = amount(g, ctx, ef.n);
      if (n <= 0) break;
      let jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.controller === me && c.def.id === 'tok-jace');
      if (!jace) jace = createToken(g, 'tok-jace', me);
      jace.loyalty = (jace.loyalty ?? 0) + n;
      log(g, `強化傑斯 ${n}（忠誠 ${jace.loyalty}）`, me);
      g.version++;
      break;
    }
    case 'cantGainLife':
      for (const p of resolveRef(g, ctx, ef.who).players) g.players[p].cantGainLife = true;
      break;
  }
}
