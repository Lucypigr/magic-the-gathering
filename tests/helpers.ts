import '../src/data';
import { resolveTop, settle } from '../src/engine/flow';
import { legalTargets } from '../src/engine/targets';
import { getDef } from '../src/engine/registry';
import { createGame, newCard } from '../src/engine/state';
import type { Card, Decision, GameState, PID, Response } from '../src/engine/types';
import { enterBattlefield } from '../src/engine/zones';

export function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('plains'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
  g.turn = 3;
  g.active = 0;
  g.phase = 'main1';
  return g;
}

export function put(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'exile';
  enterBattlefield(g, c, pid);
  c.sick = false;
  c.tapped = false;
  g.pending = [];
  return c;
}

export function inHand(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'hand';
  g.players[pid].hand.push(c.id);
  return c;
}

export function inGy(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'graveyard';
  g.players[pid].graveyard.push(c.id);
  return c;
}

export function lands(g: GameState, pid: PID, id: string, n: number): void {
  for (let i = 0; i < n; i++) put(g, pid, id);
}

/** 自動回答決策：選項取前幾個、目標取第一個合法目標（可以指定每種決策的回答） */
export type Answer = (d: Decision) => Response | undefined;
export function answerDefault(g: GameState, d: Decision, custom?: Answer): Response {
  const c = custom?.(d);
  if (c) return c;
  switch (d.type) {
    case 'choose':
      return { type: 'choose', ids: d.options.slice(0, d.min) };
    case 'mode':
      return { type: 'modes', picks: Array.from({ length: d.count }, (_, i) => i) };
    case 'targets':
      return { type: 'targets', targets: d.specs.map((s) => legalTargets(g, s, d.player, d.source)[0] ?? null) };
    default:
      return { type: 'yesno', yes: true };
  }
}

function drive(g: GameState, sub: Generator<Decision, unknown, Response>, custom?: Answer): void {
  let r = sub.next(undefined as unknown as Response);
  while (!r.done) r = sub.next(answerDefault(g, r.value, custom));
}

/** 結算堆疊最上面的項目 */
export function resolve(g: GameState, custom?: Answer): void {
  drive(g, resolveTop(g), custom);
}

/** 把等待中的觸發放上堆疊（含選擇模式與目標）並把堆疊全部結算 */
export function settleAll(g: GameState, custom?: Answer): void {
  for (let i = 0; i < 100; i++) {
    drive(g, settle(g), custom);
    if (!g.stack.length) break;
    resolve(g, custom);
  }
}
