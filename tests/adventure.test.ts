import { describe, expect, it } from 'vitest';
import '../src/data';
import { castOptionsFor, performAction, playOptions } from '../src/engine/actions';
import { resolveTop, settle } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { createGame, newCard } from '../src/engine/state';
import type { Card, Decision, GameState, PID, Response } from '../src/engine/types';
import { enterBattlefield } from '../src/engine/zones';
import { quickDecide, runSub } from '../src/ai/sim';
import { lineNotes } from '../src/ui/explain';

function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('island'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
  g.turn = 3;
  g.active = 0;
  g.phase = 'main1';
  return g;
}
function put(g: GameState, pid: PID, id: string, zone: 'battlefield' | 'hand' | 'graveyard' = 'battlefield'): Card {
  const c = newCard(g, getDef(id), pid);
  if (zone === 'battlefield') {
    c.zone = 'exile';
    enterBattlefield(g, c, pid);
    c.sick = false;
    c.tapped = false;
  } else {
    c.zone = zone;
    g.players[pid][zone].push(c.id);
  }
  g.pending = [];
  return c;
}
const decide = (g: GameState, d: Decision): Response => quickDecide(g, d);
function resolve(g: GameState) {
  for (let i = 0; i < 10 && g.stack.length; i++) runSub(g, resolveTop(g), decide);
  runSub(g, settle(g), decide);
}

describe('冒險', () => {
  it('先施放冒險，結算後放逐，之後從放逐區施放本體', () => {
    const g = mk();
    for (let i = 0; i < 4; i++) put(g, 0, 'plains');
    for (let i = 0; i < 3; i++) put(g, 0, 'island');
    const victim = put(g, 1, 'savannah-lions');
    victim.tapped = true;
    const c = put(g, 0, 'threadbind-clique', 'hand');
    const opts = castOptionsFor(g, 0, c);
    expect(opts.map((o) => o.alt)).toEqual([undefined, 'adventure']);
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [{ c: victim.id }], alt: 'adventure' })).toBeNull();
    resolve(g);
    expect(victim.zone).toBe('graveyard');
    expect(c.zone).toBe('exile');
    expect(c.onAdventure).toBe(true);
    // 放逐區只能施放本體
    const again = castOptionsFor(g, 0, c);
    expect(again.map((o) => o.alt)).toEqual([undefined]);
    expect(playOptions(g, 0).some((o) => o.card === c.id)).toBe(true);
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [] })).toBeNull();
    resolve(g);
    expect(c.zone).toBe('battlefield');
    expect(c.onAdventure).toBe(false);
  });
});

describe('返照', () => {
  it('從墳墓場施放，結算後放逐', () => {
    const g = mk();
    for (let i = 0; i < 3; i++) put(g, 0, 'island');
    const c = put(g, 0, 'think-twice', 'graveyard');
    const hand = g.players[0].hand.length;
    const opts = castOptionsFor(g, 0, c);
    expect(opts.map((o) => o.alt)).toEqual(['flashback']);
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'flashback' })).toBeNull();
    resolve(g);
    expect(g.players[0].hand.length).toBe(hand + 1);
    expect(c.zone).toBe('exile');
    expect(castOptionsFor(g, 0, c)).toHaveLength(0);
  });
  it('手上的返照牌照常施放，進墳墓場', () => {
    const g = mk();
    for (let i = 0; i < 2; i++) put(g, 0, 'island');
    const c = put(g, 0, 'think-twice', 'hand');
    expect(castOptionsFor(g, 0, c).map((o) => o.alt)).toEqual([undefined]);
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [] })).toBeNull();
    resolve(g);
    expect(c.zone).toBe('graveyard');
  });
  it('卡牌說明有冒險與返照的解說', () => {
    expect(lineNotes(getDef('threadbind-clique')).some((l) => l.kind === 'adventure')).toBe(true);
    expect(lineNotes(getDef('think-twice')).some((l) => l.kind === 'flashback')).toBe(true);
  });
});
