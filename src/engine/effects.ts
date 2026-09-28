import { canPayCost, manaSources, payCost } from './actions';
import { findPayment, parseCost } from './mana';
import {
  cardName,
  checkCond,
  countMatching,
  isCreature,
  isLand,
  landsOf,
  log,
  matches,
  other,
  shuffleArr,
  stats,
} from './state';
import type { Amt, Card, Effect, GameEvent, GameState, PID, Ref, Response, SubFlow, TargetRef } from './types';
import {
  createToken,
  dealDamage,
  destroyCards,
  discard,
  drawCards,
  enterBattlefield,
  gainLife,
  loseLife,
  moveCard,
  sacrifice,
} from './zones';

export interface Ctx {
  controller: PID;
  source: number;
  targets: (TargetRef | null)[];
  ev?: GameEvent;
  lkiPower?: number;
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
      const id = ev && 'card' in ev ? ev.card : ev && ev.type === 'combatDamage' ? ev.source : undefined;
      if (id != null && g.cards[id]?.zone === 'battlefield') out.cards.push(g.cards[id]);
      break;
    }
    case 'attached': {
      const s = g.cards[ctx.source];
      if (s && s.attachedTo != null && g.cards[s.attachedTo]?.zone === 'battlefield') out.cards.push(g.cards[s.attachedTo]);
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
  if ('hand' in a) return g.players[ctx.controller].hand.length;
  return 0;
}

// ------------------------------------------------------------
// 效果執行
// ------------------------------------------------------------
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
      for (const c of r.cards) dealDamage(g, src, me, { c: c.id }, n);
      break;
    }
    case 'draw': {
      const n = amount(g, ctx, ef.n);
      for (const p of resolveRef(g, ctx, ef.who ?? 'you').players) {
        drawCards(g, p, n);
        log(g, `抽 ${n} 張牌`, p);
      }
      break;
    }
    case 'discard': {
      const n = amount(g, ctx, ef.n);
      for (const p of resolveRef(g, ctx, ef.who).players) {
        const hand = g.players[p].hand.slice();
        const ids = yield* choose(g, p, `選擇 ${n} 張牌棄掉`, hand, n, n, 'discard');
        for (const id of ids) discard(g, g.cards[id]);
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
      destroyCards(g, r.cards);
      break;
    }
    case 'exile': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'battlefield') continue;
        log(g, `${cardName(c)} 被放逐`, c.controller);
        moveCard(g, c, 'exile');
      }
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
        c.counters += n;
        log(g, `${cardName(c)} 得到 ${n} 個 +1/+1 指示物`, c.controller);
      }
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
        for (let i = 0; i < n; i++) createToken(g, ef.token, p, { tapped: ef.tapped, attacking: ef.attacking });
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
      break;
    }
    case 'surveil': {
      const top = g.players[me].library.slice(0, ef.n);
      const gy = yield* choose(g, me, `刺探 ${ef.n}：選擇要置入墳墓場的牌`, top, 0, top.length, 'surveilGy', true);
      for (const id of gy) moveCard(g, g.cards[id], 'graveyard');
      log(g, `刺探 ${ef.n}`, me);
      break;
    }
    case 'dig': {
      const top = g.players[me].library.slice(0, ef.n);
      const opts = top.filter((id) => matches(g, ef.filter, g.cards[id], me));
      const take = ef.take ?? 1;
      const picked = yield* choose(g, me, `選擇 ${take} 張牌置於手上`, opts, Math.min(take, opts.length), take, 'dig', true);
      for (const id of picked) moveCard(g, g.cards[id], 'hand');
      for (const id of top) {
        if (picked.includes(id)) continue;
        moveCard(g, g.cards[id], ef.rest === 'bottom' ? 'library' : 'graveyard', true);
      }
      break;
    }
    case 'searchLand': {
      const lib = g.players[me].library;
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
      const picked = yield* choose(g, me, '搜尋一張基本地', uniq, 1, 1, 'search', true);
      for (const id of picked) {
        const c = g.cards[id];
        if (ef.to === 'battlefield') {
          log(g, `搜尋 ${cardName(c)} 放進戰場`, me);
          enterBattlefield(g, c, me, !!ef.tapped);
          if (ef.untapIfLands && landsOf(g, me).length >= ef.untapIfLands) c.tapped = false;
        } else {
          moveCard(g, c, 'hand');
          log(g, `搜尋 ${cardName(c)} 放到手上`, me);
        }
      }
      shuffleArr(g, g.players[me].library);
      break;
    }
    case 'counter': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'stack') continue;
        log(g, `${cardName(c)} 被反擊`, c.controller, 'cast');
        moveCard(g, c, 'graveyard');
      }
      break;
    }
    case 'counterUnless': {
      for (const c of resolveRef(g, ctx, ef.what).cards) {
        if (c.zone !== 'stack') continue;
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
          moveCard(g, c, 'graveyard');
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
        enterBattlefield(g, c, me);
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
      const ok = checkCond(g, ef.cond, me, ctx.source, ctx.targets);
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
      } else if (cost.discard) {
        const ids = yield* choose(g, me, ef.prompt, g.players[me].hand.slice(), 0, 1, 'discard');
        if (ids.length) {
          discard(g, g.cards[ids[0]]);
          paid = true;
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
    case 'cantGainLife':
      for (const p of resolveRef(g, ctx, ef.who).players) g.players[p].cantGainLife = true;
      break;
  }
}
