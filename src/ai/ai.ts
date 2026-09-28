import {
  activatedAbilities,
  castTargetSpecs,
  isMainPhase,
  manaSources,
  performAction,
  playOptions,
  sacChoices,
  spellEffects,
  type PlayOption,
} from '../engine/actions';
import { attackCandidates, combatDamage, declareAttackers, declareBlockers, endCombat, hasFirstStrikers } from '../engine/combat';
import { manaValue, parseCost } from '../engine/mana';
import { cloneGame, isCreature, isLand, other } from '../engine/state';
import { legalTargets, validateTargets } from '../engine/targets';
import type {
  Card,
  CardDef,
  Decision,
  Effect,
  GameState,
  PID,
  PriorityAction,
  Response,
  TargetRef,
  TargetSpec,
} from '../engine/types';
import { chooseBlocks, crackbackPenalty, type Level } from './combatAI';
import { creatureValue, evaluate } from './evaluate';
import { heuristicChoose, keepHand, landCount, polarity, quickTargets, rankTargets } from './heuristics';
import { TUNING, type Tuning } from './tuning';
import { projectCombat, resolveAll, safely } from './sim';

export type Style = 'aggro' | 'midrange' | 'control' | 'tempo';

const PASS: PriorityAction = { type: 'pass' };

/** 戰鬥技巧 / 保護咒語：只會強化自己的生物 */
export function isTrick(def: CardDef, mode?: number): boolean {
  if (!def.types.includes('Instant')) return false;
  const effects = spellEffects(def, mode);
  if (!effects.length) return false;
  const specs = castTargetSpecs(def, mode);
  if (!specs.length) return effects.every((e) => e.e === 'pump');
  return (
    specs.every((_, i) => polarity(effects, i) === 'help') &&
    effects.every((e) => e.e === 'pump' || e.e === 'counters' || e.e === 'role' || e.e === 'draw')
  );
}

function hasEtbOrStatic(def: CardDef): boolean {
  return (def.abilities ?? []).some(
    (a) => a.kind === 'static' || (a.kind === 'trigger' && (a.on === 'etb' || a.on === 'combatStart')),
  );
}

export class AIPlayer {
  private rngState: number;

  constructor(
    public pid: PID,
    public level: Level,
    public style: Style = 'midrange',
    seed = 12345,
  ) {
    this.rngState = (seed * 7919 + pid * 104729) | 0;
  }

  /** AI 自己的亂數（不影響遊戲本身的亂數） */
  rnd(): number {
    let t = (this.rngState = (this.rngState + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private rndInt(n: number): number {
    return Math.floor(this.rnd() * n);
  }

  decide(g: GameState, d: Decision): Response {
    switch (d.type) {
      case 'mulligan':
        return { type: 'keep', keep: keepHand(g, this.pid, d.mulligans, this.level) };
      case 'priority':
        return this.priority(g);
      case 'attackers':
        return { type: 'attackers', ids: this.attack(g) };
      case 'blockers':
        return { type: 'blockers', blocks: chooseBlocks(g, this.pid, this.level, () => this.rnd()) };
      case 'targets':
        return { type: 'targets', targets: this.triggerTargets(g, d) };
      case 'choose':
        if (this.level === 'easy' && d.min === d.max && d.purpose !== 'bottom') {
          const opts = d.options.slice();
          const out: number[] = [];
          while (out.length < d.min) out.push(opts.splice(this.rndInt(opts.length), 1)[0]);
          return { type: 'choose', ids: out };
        }
        return { type: 'choose', ids: heuristicChoose(g, d) };
      case 'yesno':
        return { type: 'yesno', yes: true };
    }
  }

  private get aggro(): boolean {
    return this.style === 'aggro';
  }

  // ------------------------------------------------------------
  // 優先權
  // ------------------------------------------------------------
  private priority(g: GameState): PriorityAction {
    const me = this.pid;
    const top = g.stack[g.stack.length - 1];
    if (top && top.controller === me) return PASS;
    if (this.level === 'easy') return this.easyPriority(g);
    if (!this.shouldConsider(g)) return PASS;
    // 普通難度：不會在對手回合主動出手，偶爾也會漏掉回應的時機
    if (this.level === 'normal' && g.active !== me && (!top || this.rnd() < 0.5)) return PASS;
    const opts = playOptions(g, me);
    if (!opts.length) return PASS;

    const myMain = g.active === me && isMainPhase(g) && g.stack.length === 0;
    if (myMain) {
      const land = this.pickLand(g, opts);
      if (land != null) return { type: 'play', card: land };
    }
    const cands = this.candidates(g, opts);
    if (!cands.length) return PASS;
    const base = this.projected(g, null);
    if (base === null) return PASS;
    const scored: { action: PriorityAction; delta: number }[] = [];
    for (const { action, bonus, threshold } of cands) {
      const sc = this.projected(g, action);
      if (sc === null) continue;
      const delta = sc - base + bonus - threshold;
      if (delta > 0) scored.push({ action, delta });
    }
    if (!scored.length) return PASS;
    scored.sort((a, b) => b.delta - a.delta);
    // 普通難度：有時不會選到最好的動作
    if (this.level === 'normal' && scored.length > 1 && this.rnd() < 0.4) {
      return scored[1 + this.rndInt(Math.min(2, scored.length - 1))].action;
    }
    return scored[0].action;
  }

  private shouldConsider(g: GameState): boolean {
    const me = this.pid;
    const top = g.stack[g.stack.length - 1];
    if (top) return top.controller !== me;
    if (g.active === me) {
      return g.phase === 'main1' || g.phase === 'main2' || g.phase === 'combat_blockers';
    }
    return g.phase === 'combat_attackers' || g.phase === 'combat_blockers' || g.phase === 'end';
  }

  /** 以模擬評估：執行動作後結算堆疊並推演戰鬥 */
  private projected(g: GameState, action: PriorityAction | null): number | null {
    const me = this.pid;
    const g2 = cloneGame(g);
    return safely(
      () => {
        if (action) {
          const err = performAction(g2, me, action);
          if (err) return null;
        }
        resolveAll(g2);
        projectCombat(g2);
        return evaluate(g2, me, { aggro: this.aggro });
      },
      () => evaluate(g2, me, { aggro: this.aggro }),
      () => null,
    );
  }

  private get tune(): Tuning {
    return TUNING[this.level === 'hard' ? 'hard' : 'normal'];
  }

  private candidates(g: GameState, opts: PlayOption[]): { action: PriorityAction; bonus: number; threshold: number }[] {
    const me = this.pid;
    const T = this.tune;
    const out: { action: PriorityAction; bonus: number; threshold: number }[] = [];
    const myTurn = g.active === me;
    const top = g.stack[g.stack.length - 1];
    const responding = !!top && top.controller !== me;
    const inCombat = g.phase === 'combat_attackers' || g.phase === 'combat_blockers' || g.phase === 'combat_damage_first';
    for (const o of opts) {
      if (o.kind === 'play') continue;
      const c = g.cards[o.card];
      const def = c.def;
      let bonus = 0;
      let threshold = T.actThreshold;
      if (o.kind === 'cast') {
        const isCr = def.types.includes('Creature');
        if (isCr) {
          threshold = 0;
          // 閃現生物留到對手回合
          if (T.holdFlash && myTurn && def.keywords?.includes('flash') && g.players[other(me)].hand.length > 0) {
            if (g.phase !== 'main2') continue;
            threshold = 1.5;
          }
          // 沒有戰鬥用途的生物在戰鬥後才施放
          if (
            T.deferCreatures &&
            myTurn &&
            g.phase === 'main1' &&
            !def.keywords?.includes('haste') &&
            !hasEtbOrStatic(def) &&
            attackCandidates(g, me).length > 0
          )
            continue;
        } else {
          threshold = T.spellThreshold;
          if (def.aura || def.equip || def.types.includes('Enchantment') || def.types.includes('Artifact')) threshold = 0.2;
          if (T.holdTricks && isTrick(def, o.mode) && !inCombat && !responding) continue;
        }
      } else if (o.kind === 'activate') {
        const ab = activatedAbilities(def)[o.ability!];
        const isFetch = ab.effects.some((e) => e.e === 'searchLand');
        if (isFetch) {
          bonus += 0.8;
          threshold = 0;
        }
        const drawOnly = ab.effects.every((e) => e.e === 'draw');
        if (drawOnly && myTurn && g.phase !== 'main2') continue;
        if (ab.cost.sacSelf && isCreature(c) && !isFetch) threshold = Math.max(threshold, 0.5);
      }
      for (const action of this.enumerateActions(g, o).slice(0, 24)) out.push({ action, bonus, threshold });
    }
    return out;
  }

  private enumerateActions(g: GameState, o: PlayOption): PriorityAction[] {
    const me = this.pid;
    const c = g.cards[o.card];
    const effects: Effect[] =
      o.kind === 'cast' ? spellEffects(c.def, o.mode) : activatedAbilities(c.def)[o.ability!].effects;
    const specs = o.specs;
    const lists: (TargetRef | null)[][] = specs.map((spec, i) => {
      let r: (TargetRef | null)[] = rankTargets(g, me, spec, effects, i, c.id).slice(0, specs.length > 1 ? 4 : 8);
      if (spec.optional) r = [...r.slice(0, 3), null];
      return r;
    });
    const combos: (TargetRef | null)[][] = [];
    const rec = (i: number, acc: (TargetRef | null)[]) => {
      if (combos.length >= 30) return;
      if (i === lists.length) {
        combos.push(acc.slice());
        return;
      }
      for (const t of lists[i]) rec(i + 1, [...acc, t]);
    };
    rec(0, []);
    let sac: number | undefined;
    if (o.sacFilter) {
      const choices = sacChoices(g, me, o.sacFilter, o.kind === 'activate' ? c.id : undefined).filter((id) => id !== c.id || o.kind === 'activate');
      choices.sort((a, b) => creatureValue(g, g.cards[a]) - creatureValue(g, g.cards[b]));
      sac = choices[0];
      if (sac == null) return [];
    }
    const out: PriorityAction[] = [];
    for (const targets of combos) {
      if (validateTargets(g, specs, targets, me, c.id)) continue;
      if (o.kind === 'cast') out.push({ type: 'cast', card: c.id, targets, mode: o.mode, sac });
      else out.push({ type: 'activate', card: c.id, ability: o.ability!, targets, sac });
    }
    return out;
  }

  private pickLand(g: GameState, opts: PlayOption[]): number | null {
    const me = this.pid;
    const lands = opts.filter((o) => o.kind === 'play').map((o) => g.cards[o.card]);
    if (!lands.length) return null;
    const hand = g.players[me].hand.map((id) => g.cards[id]).filter((c) => !isLand(c));
    const sources = manaSources(g, me);
    const available = new Set(sources.flatMap((s) => s.produces));
    const m = sources.length;
    const score = (l: Card): number => {
      let s = 0;
      const prod = l.def.produces ?? [];
      for (const col of prod) {
        if (available.has(col)) continue;
        const needed = hand.some((h) => parseCost(h.def.cost)[col as 'W'] > 0);
        if (needed) s += 3;
      }
      const tappedNow = !!l.def.etbTapped || (l.def.etbTappedUnless && landCount(g, me).play > 2);
      const wantsMana = hand.some((h) => manaValue(h.def) === m + 1);
      if (tappedNow) s += wantsMana ? -4 : 0.8;
      if (!prod.length) s += 1; // 撥地
      if (l.def.supertypes?.includes('Basic')) s += 0.2;
      return s;
    };
    lands.sort((a, b) => score(b) - score(a));
    return lands[0].id;
  }

  private easyPriority(g: GameState): PriorityAction {
    const me = this.pid;
    if (g.active !== me || !isMainPhase(g) || g.stack.length) return PASS;
    const opts = playOptions(g, me);
    const lands = opts.filter((o) => o.kind === 'play');
    if (lands.length) return { type: 'play', card: lands[this.rndInt(lands.length)].card };
    const casts = opts.filter((o) => o.kind === 'cast' || (o.kind === 'activate' && this.rnd() < 0.3));
    if (!casts.length || this.rnd() < 0.2) return PASS;
    const o = casts[this.rndInt(casts.length)];
    const c = g.cards[o.card];
    const effects = o.kind === 'cast' ? spellEffects(c.def, o.mode) : activatedAbilities(c.def)[o.ability!].effects;
    let targets = quickTargets(g, me, o.specs, effects, c.id);
    if (this.rnd() < 0.3) {
      targets = o.specs.map((s) => {
        const l = legalTargets(g, s, me, c.id);
        return l.length ? l[this.rndInt(l.length)] : null;
      });
    }
    let sac: number | undefined;
    if (o.sacFilter) {
      const ch = sacChoices(g, me, o.sacFilter, c.id);
      sac = ch[this.rndInt(ch.length)];
    }
    const action: PriorityAction =
      o.kind === 'cast'
        ? { type: 'cast', card: c.id, targets, mode: o.mode, sac }
        : { type: 'activate', card: c.id, ability: o.ability!, targets, sac };
    const g2 = cloneGame(g);
    return performAction(g2, me, action) ? PASS : action;
  }

  // ------------------------------------------------------------
  // 攻擊
  // ------------------------------------------------------------
  private attack(g: GameState): number[] {
    const me = this.pid;
    const cands = attackCandidates(g, me);
    if (!cands.length) return [];
    if (this.level === 'easy') {
      return cands.filter(() => this.rnd() < 0.55).map((c) => c.id);
    }
    const subsets: Card[][] = [];
    if (this.level === 'normal') {
      // 普通難度：只考慮幾種簡單的攻擊方式
      const sorted = cands.slice().sort((a, b) => creatureValue(g, b) - creatureValue(g, a));
      subsets.push([], sorted);
      for (const c of sorted) subsets.push([c]);
      for (let i = 2; i < sorted.length; i++) subsets.push(sorted.slice(0, i));
    } else if (cands.length <= 7) {
      const n = cands.length;
      for (let mask = 0; mask < 1 << n; mask++) subsets.push(cands.filter((_, i) => mask & (1 << i)));
    } else {
      const sorted = cands.slice().sort((a, b) => creatureValue(g, b) - creatureValue(g, a));
      subsets.push([]);
      for (let i = 1; i <= sorted.length; i++) subsets.push(sorted.slice(0, i));
      for (let i = 1; i < sorted.length; i++) subsets.push(sorted.slice(i));
      for (const c of sorted) subsets.push(sorted.filter((x) => x !== c));
    }
    let best: Card[] = [];
    let bestScore = -Infinity;
    for (const s of subsets) {
      const sc = this.simAttack(g, s);
      if (sc > bestScore + 1e-6 || (Math.abs(sc - bestScore) < 1e-6 && s.length > best.length && this.aggro)) {
        bestScore = sc;
        best = s;
      }
    }
    return best.map((c) => c.id);
  }

  private simAttack(g: GameState, list: Card[]): number {
    const me = this.pid;
    const opp = other(me);
    const g2 = cloneGame(g);
    return safely(
      () => {
        declareAttackers(g2, me, list.map((c) => c.id));
        resolveAll(g2);
        g2.phase = 'combat_blockers';
        declareBlockers(g2, opp, chooseBlocks(g2, opp, this.tune.predictBlocks));
        resolveAll(g2);
        if (hasFirstStrikers(g2)) {
          combatDamage(g2, 'first');
          resolveAll(g2);
          combatDamage(g2, 'regular');
        } else combatDamage(g2, 'all');
        resolveAll(g2);
        endCombat(g2);
        let s = evaluate(g2, me, { aggro: this.aggro });
        s -= crackbackPenalty(g2, me) * (this.level === 'normal' ? 0.35 : this.tune.crackback);
        return s;
      },
      () => evaluate(g2, me),
      () => -Infinity,
    );
  }

  // ------------------------------------------------------------
  // 觸發式能力的目標
  // ------------------------------------------------------------
  private triggerTargets(g: GameState, d: Extract<Decision, { type: 'targets' }>): (TargetRef | null)[] {
    const me = this.pid;
    if (this.level === 'easy') return quickTargets(g, me, d.specs, d.effects, d.source);
    const lists: (TargetRef | null)[][] = d.specs.map((spec: TargetSpec, i: number) => {
      let r: (TargetRef | null)[] = rankTargets(g, me, spec, d.effects, i, d.source).slice(0, 6);
      if (spec.optional) r = [...r, null];
      return r;
    });
    const combos: (TargetRef | null)[][] = [];
    const rec = (i: number, acc: (TargetRef | null)[]) => {
      if (combos.length >= 30) return;
      if (i === lists.length) {
        combos.push(acc.slice());
        return;
      }
      for (const t of lists[i]) rec(i + 1, [...acc, t]);
    };
    rec(0, []);
    let best = quickTargets(g, me, d.specs, d.effects, d.source);
    let bestScore = -Infinity;
    for (const targets of combos) {
      if (validateTargets(g, d.specs, targets, me, d.source)) continue;
      const g2 = cloneGame(g);
      const sc = safely(
        () => {
          g2.stack.push({
            sid: g2.nextSid++,
            kind: 'trigger',
            controller: me,
            cardId: d.source,
            targets,
            targetSpecs: d.specs,
            effects: d.effects,
            text: '',
          });
          resolveAll(g2);
          projectCombat(g2);
          return evaluate(g2, me, { aggro: this.aggro });
        },
        () => evaluate(g2, me),
        () => -Infinity,
      );
      if (sc > bestScore) {
        bestScore = sc;
        best = targets;
      }
    }
    return best;
  }
}

