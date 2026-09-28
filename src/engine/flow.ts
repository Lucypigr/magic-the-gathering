import { performAction } from './actions';
import {
  attackCandidates,
  blockCandidates,
  combatDamage,
  declareAttackers,
  declareBlockers,
  endCombat,
  hasFirstStrikers,
} from './combat';
import { runEffects, type Ctx } from './effects';
import {
  cardName,
  checkCond,
  GameOver,
  isCreature,
  isPermanentDef,
  log,
  other,
  randInt,
  show,
  shuffleArr,
  stats,
} from './state';
import { isLegalTarget, legalTargets, validateTargets } from './targets';
import type { Card, Flow, GameState, PID, Response, SubFlow, TargetRef } from './types';
import { discard, drawCards, emit, enterBattlefield, moveCard, putIntoGraveyard } from './zones';

// ------------------------------------------------------------
// 狀態動作
// ------------------------------------------------------------
export function checkSBA(g: GameState): void {
  for (let iter = 0; iter < 30; iter++) {
    let changed = false;
    const losers = g.players.filter((p) => p.life <= 0 || p.drewFromEmpty);
    if (losers.length) {
      for (const p of losers) p.lost = true;
      g.winner = losers.length === 2 ? 'draw' : other(losers[0].id);
      if (g.winner === 'draw') log(g, '雙方同時落敗，平手！', undefined, 'result');
      else log(g, `${g.players[g.winner].name} 獲勝！`, g.winner, 'result');
      throw new GameOver();
    }
    const dying: Card[] = [];
    for (const id of g.battlefield) {
      const c = g.cards[id];
      if (!isCreature(c)) continue;
      const st = stats(g, c);
      if (st.t <= 0) dying.push(c);
      else if ((c.damage >= st.t || (c.dtDamage && c.damage > 0)) && !st.kw.has('indestructible')) dying.push(c);
    }
    if (dying.length) {
      for (const c of dying) log(g, `${cardName(c)} 死去`, c.controller, 'combat');
      putIntoGraveyard(g, dying);
      changed = true;
    }
    for (const id of [...g.battlefield]) {
      const c = g.cards[id];
      if (c.zone !== 'battlefield') continue;
      if (c.def.aura) {
        const t = c.attachedTo != null ? g.cards[c.attachedTo] : undefined;
        if (!t || t.zone !== 'battlefield' || !isCreature(t)) {
          moveCard(g, c, 'graveyard');
          changed = true;
        }
      } else if (c.def.equip && c.attachedTo != null) {
        const t = g.cards[c.attachedTo];
        if (!t || t.zone !== 'battlefield' || !isCreature(t) || t.controller !== c.controller) {
          c.attachedTo = null;
          changed = true;
        }
      }
    }
    // 傳奇規則：保留最新進場的那個
    for (const pid of [0, 1] as PID[]) {
      const seen = new Map<string, Card>();
      const extra: Card[] = [];
      for (const id of g.battlefield) {
        const c = g.cards[id];
        if (c.controller !== pid || !c.def.supertypes?.includes('Legendary')) continue;
        const prev = seen.get(c.def.name);
        if (prev) extra.push(prev);
        seen.set(c.def.name, c);
      }
      if (extra.length) {
        for (const c of extra) log(g, `傳奇規則：${cardName(c)} 置入墳墓場`, pid);
        putIntoGraveyard(g, extra);
        changed = true;
      }
    }
    if (!changed) break;
  }
}

// ------------------------------------------------------------
// 觸發式能力上堆疊
// ------------------------------------------------------------
function* flushTriggers(g: GameState): SubFlow {
  const list = g.pending.splice(0);
  const ordered = [...list.filter((t) => t.controller === g.active), ...list.filter((t) => t.controller !== g.active)];
  for (const t of ordered) {
    const ab = t.ability;
    const specs = ab.targets ?? [];
    let targets: (TargetRef | null)[] = [];
    const src = g.cards[t.source];
    if (specs.length) {
      const options = specs.map((s) => legalTargets(g, s, t.controller, t.source));
      if (specs.some((s, i) => !s.optional && options[i].length === 0)) {
        log(g, `${cardName(src)} 的觸發式能力沒有合法目標`, t.controller);
        continue;
      }
      if (specs.every((s, i) => s.optional && options[i].length === 0)) {
        targets = specs.map(() => null);
      } else {
        const r: Response = yield {
          type: 'targets',
          player: t.controller,
          source: t.source,
          specs,
          text: src.def.text,
          effects: ab.effects,
        };
        targets = r.type === 'targets' ? specs.map((_, i) => r.targets[i] ?? null) : [];
        if (validateTargets(g, specs, targets, t.controller, t.source)) {
          // 不合法的回應：自動選第一個合法目標
          targets = specs.map((s, i) => (s.optional ? null : options[i][0] ?? null));
        }
      }
    }
    g.stack.push({
      sid: g.nextSid++,
      kind: 'trigger',
      controller: t.controller,
      cardId: t.source,
      targets,
      targetSpecs: specs,
      effects: ab.effects,
      text: src.def.text,
      may: ab.may,
      cond: ab.cond,
      ev: t.ev,
      lkiPower: t.lkiPower,
    });
    show(g, { kind: 'trigger', player: t.controller, card: t.source, targets });
    for (const tg of targets) {
      if (tg && 'c' in tg && g.cards[tg.c]?.zone === 'battlefield') emit(g, { type: 'targeted', card: tg.c, by: t.controller, spell: false });
    }
    g.version++;
  }
}

/** 反覆檢查狀態動作並將觸發放上堆疊，直到穩定 */
export function* settle(g: GameState): SubFlow {
  for (let i = 0; i < 100; i++) {
    checkSBA(g);
    if (!g.pending.length) return;
    yield* flushTriggers(g);
  }
}

// ------------------------------------------------------------
// 堆疊結算
// ------------------------------------------------------------
export function* resolveTop(g: GameState): SubFlow {
  const item = g.stack.pop();
  if (!item) return;
  g.version++;
  const src = g.cards[item.cardId];
  const specs = item.targetSpecs;
  const hadTargets = item.targets.some((t) => !!t);
  const legal = item.targets.map((t, i) =>
    t && specs[i] && isLegalTarget(g, specs[i], t, item.controller, item.cardId) ? t : null,
  );
  if (hadTargets && legal.every((t) => !t)) {
    log(g, `${cardName(src)} 因目標不合法而無效`, item.controller);
    if (item.kind === 'spell' && src.zone === 'stack') moveCard(g, src, 'graveyard');
    return;
  }
  const ctx: Ctx = {
    controller: item.controller,
    source: item.cardId,
    targets: legal,
    ev: item.ev,
    lkiPower: item.lkiPower,
  };
  if (item.kind === 'spell') {
    const def = src.def;
    if (isPermanentDef(def)) {
      if (def.aura) {
        const t = legal[0];
        if (!t || !('c' in t)) {
          moveCard(g, src, 'graveyard');
          return;
        }
        enterBattlefield(g, src, item.controller);
        src.attachedTo = t.c;
        log(g, `${cardName(src)} 結附於 ${cardName(g.cards[t.c])}`, item.controller);
      } else {
        enterBattlefield(g, src, item.controller);
        log(g, `${cardName(src)} 進入戰場`, item.controller);
      }
    } else {
      yield* runEffects(g, ctx, item.effects);
      if (src.zone === 'stack') moveCard(g, src, 'graveyard');
    }
  } else {
    if (item.cond && !checkCond(g, item.cond, item.controller, item.cardId, legal)) return;
    if (item.may) {
      const r: Response = yield { type: 'yesno', player: item.controller, prompt: item.may, source: item.cardId, purpose: 'may' };
      if (r.type !== 'yesno' || !r.yes) return;
    }
    yield* runEffects(g, ctx, item.effects);
  }
}

// ------------------------------------------------------------
// 優先權
// ------------------------------------------------------------
export function* priorityStep(g: GameState): SubFlow {
  let passes = 0;
  let p: PID = g.active;
  for (let guard = 0; guard < 2000; guard++) {
    yield* settle(g);
    g.priority = p;
    const r: Response = yield { type: 'priority', player: p };
    if (r.type === 'pass' || (r.type !== 'play' && r.type !== 'cast' && r.type !== 'activate')) {
      passes++;
      if (passes >= 2) {
        if (g.stack.length === 0) {
          g.priority = null;
          return;
        }
        yield* resolveTop(g);
        passes = 0;
        p = g.active;
        continue;
      }
      p = other(p);
    } else {
      const err = performAction(g, p, r);
      if (err) {
        log(g, `（無效動作：${err}）`, p);
      } else passes = 0;
    }
  }
  g.priority = null;
}

// ------------------------------------------------------------
// 回合流程
// ------------------------------------------------------------
function* mulligans(g: GameState): SubFlow {
  for (const pid of [g.firstPlayer, other(g.firstPlayer)] as PID[]) drawCards(g, pid, 7);
  for (const pid of [g.firstPlayer, other(g.firstPlayer)] as PID[]) {
    const pl = g.players[pid];
    while (pl.mulligans < 5) {
      const r: Response = yield { type: 'mulligan', player: pid, mulligans: pl.mulligans };
      if (r.type !== 'keep' || r.keep) break;
      pl.mulligans++;
      log(g, `${pl.name} 重抽起手（第 ${pl.mulligans} 次）`, pid);
      for (const id of pl.hand.splice(0)) {
        const c = g.cards[id];
        c.zone = 'library';
        pl.library.push(id);
      }
      shuffleArr(g, pl.library);
      drawCards(g, pid, 7);
    }
    if (pl.mulligans > 0) {
      const n = Math.min(pl.mulligans, pl.hand.length);
      const r: Response = yield {
        type: 'choose',
        player: pid,
        prompt: `選擇 ${n} 張牌放到牌庫底`,
        options: pl.hand.slice(),
        min: n,
        max: n,
        purpose: 'bottom',
      };
      let ids = r.type === 'choose' ? r.ids.filter((id) => pl.hand.includes(id)).slice(0, n) : [];
      for (const id of pl.hand) if (ids.length < n && !ids.includes(id)) ids.push(id);
      ids = ids.slice(0, n);
      for (const id of ids) moveCard(g, g.cards[id], 'library', true);
    }
  }
  // 起手的「地脈」牌
  for (const pid of [g.firstPlayer, other(g.firstPlayer)] as PID[]) {
    for (const id of g.players[pid].hand.slice()) {
      const c = g.cards[id];
      if (!c.def.leyline) continue;
      const r: Response = yield {
        type: 'yesno',
        player: pid,
        prompt: `要讓 ${cardName(c)} 在遊戲開始時就在戰場上嗎？`,
        source: id,
        purpose: 'leyline',
      };
      if (r.type === 'yesno' && r.yes) {
        log(g, `${cardName(c)} 以開局方式進入戰場`, pid);
        enterBattlefield(g, c, pid);
      }
    }
  }
  g.pending = [];
}

function* combatPhase(g: GameState): SubFlow {
  const a = g.active;
  g.phase = 'combat_begin';
  emit(g, { type: 'step', step: 'combatStart', player: a });
  yield* priorityStep(g);
  if (attackCandidates(g, a).length === 0) {
    g.phase = 'combat_end';
    endCombat(g);
    return;
  }
  g.phase = 'combat_attackers';
  g.version++;
  const r: Response = yield { type: 'attackers', player: a };
  const list = declareAttackers(g, a, r.type === 'attackers' ? r.ids : []);
  if (!list.length) {
    g.phase = 'combat_end';
    endCombat(g);
    return;
  }
  yield* priorityStep(g);
  g.phase = 'combat_blockers';
  g.version++;
  const d = other(a);
  if (blockCandidates(g, d).length > 0) {
    const rb: Response = yield { type: 'blockers', player: d };
    declareBlockers(g, d, rb.type === 'blockers' ? rb.blocks : []);
  }
  yield* priorityStep(g);
  if (hasFirstStrikers(g)) {
    g.phase = 'combat_damage_first';
    combatDamage(g, 'first');
    yield* priorityStep(g);
    g.phase = 'combat_damage';
    combatDamage(g, 'regular');
  } else {
    g.phase = 'combat_damage';
    combatDamage(g, 'all');
  }
  yield* priorityStep(g);
  g.phase = 'combat_end';
  endCombat(g);
}

function* turn(g: GameState): SubFlow {
  g.turn++;
  g.active = g.turn === 1 ? g.firstPlayer : other(g.active);
  const a = g.active;
  const pl = g.players[a];
  for (const p of g.players) {
    p.landsPlayed = 0;
    p.spellsThisTurn = 0;
    p.instSorcThisTurn = 0;
    p.lifeGainedThisTurn = 0;
    p.drawsThisTurn = 0;
    p.lifeLostThisTurn = 0;
  }
  g.attackedThisTurn = false;
  for (const id of g.battlefield) g.cards[id].usedThisTurn = [];
  log(g, `—— 第 ${g.turn} 回合：${pl.name} ——`, a, 'turn');
  if (g.turn > g.maxTurns) {
    g.winner = 'draw';
    log(g, '回合數過多，判定平手', undefined, 'result');
    throw new GameOver();
  }
  // 重置
  g.phase = 'untap';
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller !== a) continue;
    c.sick = false;
    if (c.tapped) {
      if (c.stun > 0) c.stun--;
      else c.tapped = false;
    }
  }
  g.version++;
  // 維持
  g.phase = 'upkeep';
  emit(g, { type: 'step', step: 'upkeep', player: a });
  yield* priorityStep(g);
  // 抓牌
  g.phase = 'draw';
  if (g.turn > 1) drawCards(g, a, 1);
  yield* priorityStep(g);
  // 主要階段一
  g.phase = 'main1';
  yield* priorityStep(g);
  // 戰鬥
  yield* combatPhase(g);
  // 主要階段二
  g.phase = 'main2';
  yield* priorityStep(g);
  // 結束
  g.phase = 'end';
  emit(g, { type: 'step', step: 'endStep', player: a });
  yield* priorityStep(g);
  // 清除
  g.phase = 'cleanup';
  const over = pl.hand.length - 7;
  if (over > 0) {
    const r: Response = yield {
      type: 'choose',
      player: a,
      prompt: `手牌上限為 7 張，請棄掉 ${over} 張`,
      options: pl.hand.slice(),
      min: over,
      max: over,
      purpose: 'discard',
    };
    let ids = r.type === 'choose' ? r.ids.filter((id) => pl.hand.includes(id)).slice(0, over) : [];
    for (const id of pl.hand) if (ids.length < over && !ids.includes(id)) ids.push(id);
    ids = ids.slice(0, over);
    for (const id of ids) discard(g, g.cards[id]);
  }
  for (const id of g.battlefield) {
    const c = g.cards[id];
    c.damage = 0;
    c.dtDamage = false;
  }
  g.eot = [];
  // 清除階段若有觸發，再給一次優先權
  if (g.pending.length) yield* priorityStep(g);
}

export function* runGame(g: GameState, firstPlayer?: PID): Flow {
  try {
    g.firstPlayer = firstPlayer ?? (randInt(g, 2) as PID);
    log(g, `${g.players[g.firstPlayer].name} 先攻`, g.firstPlayer, 'turn');
    yield* mulligans(g);
    for (;;) yield* turn(g);
  } catch (e) {
    if (e instanceof GameOver) {
      g.phase = 'cleanup';
      g.version++;
      return;
    }
    throw e;
  }
}
