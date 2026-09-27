import { combatDamage, declareBlockers, endCombat, hasFirstStrikers } from '../engine/combat';
import { resolveTop, settle } from '../engine/flow';
import { GameOver, other } from '../engine/state';
import type { Decision, GameState, Response, SubFlow } from '../engine/types';
import { chooseBlocks } from './combatAI';
import { heuristicChoose, quickTargets } from './heuristics';

export type Decider = (g: GameState, d: Decision) => Response;

/** 模擬中使用的快速決策 */
export const quickDecide: Decider = (g, d) => {
  switch (d.type) {
    case 'priority':
      return { type: 'pass' };
    case 'mulligan':
      return { type: 'keep', keep: true };
    case 'attackers':
      return { type: 'attackers', ids: [] };
    case 'blockers':
      return { type: 'blockers', blocks: chooseBlocks(g, d.player, 'normal') };
    case 'targets':
      return { type: 'targets', targets: quickTargets(g, d.player, d.specs, d.effects, d.source) };
    case 'choose':
      return { type: 'choose', ids: heuristicChoose(g, d) };
    case 'yesno':
      return { type: 'yesno', yes: true };
  }
};

export function runSub<T>(g: GameState, sub: SubFlow<T>, decide: Decider = quickDecide, maxSteps = 400): T | undefined {
  let r = sub.next(undefined as unknown as Response);
  let steps = 0;
  while (!r.done) {
    if (++steps > maxSteps) throw new Error('模擬步數過多');
    r = sub.next(decide(g, r.value));
  }
  return r.value;
}

/** 結算整個堆疊（假設雙方都不回應） */
export function resolveAll(g: GameState, decide: Decider = quickDecide): void {
  for (let i = 0; i < 40; i++) {
    runSub(g, settle(g), decide);
    if (!g.stack.length) return;
    runSub(g, resolveTop(g), decide);
  }
  runSub(g, settle(g), decide);
}

/** 若正處於戰鬥中，模擬剩下的戰鬥 */
export function projectCombat(g: GameState, decide: Decider = quickDecide): void {
  if (g.phase === 'combat_attackers') {
    const d = other(g.active);
    declareBlockers(g, d, chooseBlocks(g, d, 'normal'));
    resolveAll(g, decide);
    g.phase = 'combat_blockers';
  }
  if (g.phase === 'combat_blockers') {
    if (hasFirstStrikers(g)) {
      combatDamage(g, 'first');
      resolveAll(g, decide);
      combatDamage(g, 'regular');
    } else combatDamage(g, 'all');
    resolveAll(g, decide);
    endCombat(g);
    g.phase = 'combat_end';
  } else if (g.phase === 'combat_damage_first') {
    combatDamage(g, 'regular');
    resolveAll(g, decide);
    endCombat(g);
    g.phase = 'combat_end';
  }
}

export function safely<T>(fn: () => T, onGameOver: () => T, onError: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GameOver) return onGameOver();
    return onError();
  }
}
