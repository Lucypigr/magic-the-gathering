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
  hasStaticFlag,
  isCreature,
  isPermanentDef,
  log,
  newCard,
  other,
  randInt,
  show,
  shuffleArr,
  stats,
} from './state';
import { hasTargetsAvailable, isLegalTarget, legalTargets, validateTargets } from './targets';
import type { Card, Effect, Flow, GameState, PID, Response, SubFlow, TargetRef, TargetSpec } from './types';
import { addLore, discard, drawCards, emit, enterBattlefield, enterBattlefieldBack, moveCard, putCounters, putIntoGraveyard, sacrifice } from './zones';

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
      // 鵬洛客：忠誠為0時置入墳墓場
      if (c.def.types.includes('Planeswalker') && !isCreature(c) && (c.loyalty ?? 0) <= 0 && !hasStaticFlag(g, c.controller, 'noZeroLoyaltyDeath')) {
        dying.push(c);
        continue;
      }
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
    // 傳奇（Saga）：最後一章結算完畢後犧牲
    for (const id of [...g.battlefield]) {
      const c = g.cards[id];
      const n = c.def.saga?.chapters.length;
      if (!n || (c.lore ?? 0) < n) continue;
      if (g.stack.some((s) => s.cardId === c.id && s.kind === 'trigger') || g.pending.some((p) => p.source === c.id)) continue;
      log(g, `${cardName(c)} 的最後一章結束，犧牲`, c.controller);
      sacrifice(g, c);
      changed = true;
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
/** 把效果中的目標參照（T0、T1…）整體平移，用來合併多個模式 */
export function shiftRefs<T>(v: T, offset: number): T {
  if (offset === 0) return v;
  if (Array.isArray(v)) return v.map((x) => shiftRefs(x, offset)) as unknown as T;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      const x = o[k];
      if (typeof x === 'string' && /^T\d+$/.test(x) && k !== 'text') out[k] = 'T' + (Number(x.slice(1)) + offset);
      else if (k === 't' && o.c === 'targetIs' && typeof x === 'number') out[k] = x + offset;
      else out[k] = shiftRefs(x, offset);
    }
    return out as T;
  }
  return v;
}

function* flushTriggers(g: GameState): SubFlow {
  const list = g.pending.splice(0);
  const ordered = [...list.filter((t) => t.controller === g.active), ...list.filter((t) => t.controller !== g.active)];
  for (const t of ordered) {
    let ab = t.ability;
    const src = g.cards[t.source];
    if (ab.modes) {
      // 模式式觸發：先選模式，再選目標
      const legal = ab.modes.map((_, i) => i).filter((i) => hasTargetsAvailable(g, ab.modes![i].targets ?? [], t.controller, t.source));
      const count = Math.min(ab.chooseN ?? 1, legal.length);
      if (count === 0) {
        log(g, `${cardName(src)} 的觸發式能力沒有可選的模式`, t.controller);
        continue;
      }
      let picks = legal;
      if (legal.length > count) {
        const r: Response = yield {
          type: 'mode',
          player: t.controller,
          prompt: `${cardName(src)}：選擇${count === 1 ? '一項' : `${count}項`}`,
          source: t.source,
          options: legal.map((i) => ab.modes![i].text),
          count,
          purpose: 'trigger',
          meta: { effects: legal.map((i) => ab.modes![i].effects), specs: legal.map((i) => ab.modes![i].targets ?? []) },
        };
        const chosen = r.type === 'modes' ? [...new Set(r.picks)].filter((k) => k >= 0 && k < legal.length).slice(0, count) : [];
        while (chosen.length < count) for (let k = 0; k < legal.length && chosen.length < count; k++) if (!chosen.includes(k)) chosen.push(k);
        picks = chosen.sort((a, b) => a - b).map((k) => legal[k]);
      }
      const eff: Effect[] = [];
      const sp: TargetSpec[] = [];
      for (const i of picks) {
        const m = ab.modes[i];
        eff.push(...shiftRefs(m.effects, sp.length));
        sp.push(...(m.targets ?? []));
      }
      ab = { ...ab, modes: undefined, effects: eff, targets: sp.length ? sp : undefined };
      log(g, `${cardName(src)}：選擇了「${picks.map((i) => t.ability.modes![i].text).join('」「')}」`, t.controller);
    }
    const specs = ab.targets ?? [];
    let targets: (TargetRef | null)[] = [];
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
    if (item.kind === 'spell' && src.zone === 'stack') moveCard(g, src, item.alt === 'flashback' || item.alt === 'harmonize' ? 'exile' : 'graveyard');
    return;
  }
  const ctx: Ctx = {
    controller: item.controller,
    source: item.cardId,
    targets: legal,
    ev: item.ev,
    lkiPower: item.lkiPower,
    x: item.x,
  };
  if (item.kind === 'spell') {
    const def = src.def;
    if (item.alt === 'adventure' || item.alt === 'flashback' || (item.alt === 'harmonize' && !isPermanentDef(def))) {
      // 冒險：結算後放逐，之後可以施放本體；返照：結算後放逐
      yield* runEffects(g, ctx, item.effects);
      if (src.zone === 'stack' && item.alt === 'flashback' && def.flashbackTransform && def.back) {
        enterBattlefieldBack(g, src, item.controller);
        log(g, `${cardName(src)} 轉化後進入戰場`, item.controller);
      } else if (src.zone === 'stack') {
        moveCard(g, src, 'exile');
        if (item.alt === 'adventure') {
          src.onAdventure = true;
          log(g, `${cardName(src)} 踏上冒險（之後可以從放逐區施放）`, item.controller);
        }
      }
    } else if (isPermanentDef(def)) {
      if (def.aura) {
        const t = legal[0];
        if (!t || !('c' in t)) {
          moveCard(g, src, 'graveyard');
          return;
        }
        enterBattlefield(g, src, item.controller);
        src.attachedTo = t.c;
        // 讓永久物變成生物的光環
        const anim = def.aura.grant.animate;
        const host = g.cards[t.c];
        if (anim && host && !host.auraBaseDef) {
          host.auraBaseDef = host.def;
          host.def = {
            ...host.def,
            types: [...new Set([...host.def.types, 'Creature' as const])],
            subtypes: [...(host.def.subtypes ?? []), ...(anim.subtype ? [anim.subtype] : [])],
            power: anim.p,
            toughness: anim.t,
          };
        }
        log(g, `${cardName(src)} 結附於 ${cardName(g.cards[t.c])}`, item.controller);
      } else if (item.alt === 'back') {
        enterBattlefieldBack(g, src, item.controller);
        log(g, `${cardName(src)} 進入戰場`, item.controller);
      } else {
        enterBattlefield(g, src, item.controller);
        if (item.x !== undefined) src.castX = item.x;
        if (def.etbCountersX && item.x) putCounters(g, src, item.x);
        log(g, `${cardName(src)} 進入戰場`, item.controller);
        if (item.alt === 'warp') src.exileAtEnd = true;
        if (item.alt === 'offspring') {
          // 子嗣：派出一個 1/1 的衍生物複製
          const t = newCard(g, { ...def, power: 1, toughness: 1 }, item.controller, true);
          t.zone = 'exile';
          enterBattlefield(g, t, item.controller);
          log(g, `子嗣：派出 1/1 的 ${cardName(t)} 衍生物`, item.controller);
        }
      }
    } else {
      yield* runEffects(g, ctx, item.effects);
      if (src.zone === 'stack') moveCard(g, src, 'graveyard');
    }
  } else {
    if (item.cond && !checkCond(g, item.cond, item.controller, item.cardId, legal, item.ev)) return;
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
          // 步驟結束：法術力池清空
          for (const pl of g.players) pl.pool = [];
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
  const list = declareAttackers(g, a, r.type === 'attackers' ? r.ids : [], r.type === 'attackers' ? r.targets : undefined);
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
    p.nonlandEtbThisTurn = 0;
    p.permToGyThisTurn = false;
    p.scriedThisTurn = false;
    p.libToGyThisTurn = 0;
    p.noncombatLastTurn = !!p.noncombatThisTurn;
    p.noncombatThisTurn = false;
    p.noncreatureThisTurn = 0;
    p.nextSpellUncounterable = false;
    p.discardedThisTurn = 0;
    p.extraLandsThisTurn = 0;
    p.mountainBonus = false;
    p.pool = [];
    p.lifeLostThisTurn = 0;
  }
  g.attackedThisTurn = false;
  g.creatureDiedThisTurn = false;
  g.creaturesDiedCount = 0;
  g.voidThisTurn = false;
  g.delayed = [];
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
    if (c.tapped && !stats(g, c).noUntap) {
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
  // 主要階段一：傳奇在抓牌步驟後前進一章
  g.phase = 'main1';
  emit(g, { type: 'step', step: 'main1', player: a });
  for (const id of [...g.battlefield]) {
    const c = g.cards[id];
    if (c.controller === a && c.def.saga) addLore(g, c, 1);
  }
  yield* priorityStep(g);
  // 戰鬥
  yield* combatPhase(g);
  // 主要階段二
  g.phase = 'main2';
  yield* priorityStep(g);
  // 結束：動員之類的暫時衍生物在結束步驟開始時犧牲
  g.phase = 'end';
  for (const id of [...g.battlefield]) {
    const c = g.cards[id];
    if (c.sacAtEnd) sacrifice(g, c);
    else if (c.exileAtEnd && c.zone === 'battlefield') {
      // 折躍：放逐，之後的回合可以從放逐區施放
      log(g, `${cardName(c)} 折躍結束，被放逐（之後的回合可以再施放）`, c.controller);
      moveCard(g, c, 'exile');
      c.warpExiled = g.turn;
    }
  }
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
    // 暫時成為生物的地恢復原狀
    if (c.baseDef) {
      c.def = c.baseDef;
      c.baseDef = undefined;
    }
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
