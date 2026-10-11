import { describe, expect, it } from 'vitest';
import '../src/data';
import { maxXFor, performAction, spellCost } from '../src/engine/actions';
import { resolveTop } from '../src/engine/flow';
import { parseCost } from '../src/engine/mana';
import { getDef } from '../src/engine/registry';
import { createGame, newCard, stats } from '../src/engine/state';
import type { Card, GameState, PID } from '../src/engine/types';
import { enterBattlefield } from '../src/engine/zones';

function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('mountain'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
  g.turn = 3;
  g.active = 0;
  g.phase = 'main1';
  return g;
}
function put(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'exile';
  enterBattlefield(g, c, pid);
  c.sick = false;
  c.tapped = false;
  g.pending = [];
  return c;
}
function inHand(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'hand';
  g.players[pid].hand.push(c.id);
  return c;
}
function resolve(g: GameState) {
  const it = resolveTop(g);
  let r = it.next();
  while (!r.done) r = it.next({ type: 'choose', ids: [] });
}

describe('X 咒語', () => {
  it('費用中的 X 由施放者決定', () => {
    expect(parseCost('{X}{R}').x).toBe(1);
    const g = mk();
    const c = inHand(g, 0, 'song-of-totentanz');
    expect(spellCost(g, c, 0, undefined, undefined, undefined, 3).generic).toBe(3);
    for (let i = 0; i < 4; i++) put(g, 0, 'mountain');
    expect(maxXFor(g, 0, c)).toBe(3);
    expect(maxXFor(g, 0, inHand(g, 0, 'shock'))).toBeUndefined();
  });

  it('創傷式批評：X=2 對對手造成2點傷害', () => {
    const g = mk();
    for (let i = 0; i < 2; i++) put(g, 0, 'mountain');
    for (let i = 0; i < 2; i++) put(g, 0, 'island');
    const c = inHand(g, 0, 'traumatic-critique');
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [{ p: 1 }], x: 2 })).toBeNull();
    expect(g.stack[g.stack.length - 1].x).toBe(2);
    const life = g.players[1].life;
    resolve(g);
    expect(g.players[1].life).toBe(life - 2);
  });

  it('付不起的 X 會被拒絕', () => {
    const g = mk();
    for (let i = 0; i < 2; i++) put(g, 0, 'mountain');
    const c = inHand(g, 0, 'song-of-totentanz');
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], x: 5 })).not.toBeNull();
  });

  it('黑日之日：只消滅法術力值 X 或更少的生物', () => {
    const g = mk();
    const small = put(g, 1, 'hinterland-sanctifier');
    const big = put(g, 1, 'nova-hellkite');
    const c = newCard(g, getDef('day-of-black-sun'), 0);
    c.zone = 'stack';
    g.stack.push({ sid: 1, kind: 'spell', controller: 0, cardId: c.id, targets: [], targetSpecs: [], effects: c.def.spell!.effects!, text: '', x: 2 });
    resolve(g);
    expect(small.zone).toBe('graveyard');
    expect(big.zone).toBe('battlefield');
  });

  it('引導九頭龍：帶著 X 個指示物進場', () => {
    const g = mk();
    const c = newCard(g, getDef('guiding-hydra'), 0);
    c.zone = 'stack';
    g.stack.push({ sid: 1, kind: 'spell', controller: 0, cardId: c.id, targets: [], targetSpecs: [], effects: [], text: '', x: 3 });
    resolve(g);
    expect(c.zone).toBe('battlefield');
    expect(stats(g, c).p).toBe(4);
    expect(stats(g, c).t).toBe(3);
  });
});
