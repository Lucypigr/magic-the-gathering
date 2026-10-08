import { describe, expect, it } from 'vitest';
import '../src/data';
import { castOptionsFor, performAction } from '../src/engine/actions';
import { resolveTop, settle } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { createGame, isCreature, isLand, newCard } from '../src/engine/state';
import type { Card, Decision, GameState, PID, Response } from '../src/engine/types';
import { destroyCards, enterBattlefield } from '../src/engine/zones';
import { quickDecide, runSub } from '../src/ai/sim';

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
  for (let i = 0; i < 10 && (g.stack.length || g.pending.length); i++) {
    runSub(g, settle(g), decide);
    if (g.stack.length) runSub(g, resolveTop(g), decide);
  }
  runSub(g, settle(g), decide);
}
const lands = (g: GameState, id: string, n: number) => {
  for (let i = 0; i < n; i++) put(g, 0, id);
};

describe('雙面牌', () => {
  it('工藝：放逐墳墓場的神器，轉化成背面', () => {
    const g = mk();
    lands(g, 'island', 6);
    const ice = put(g, 0, 'inverted-iceberg');
    const junk = put(g, 0, 'clay-fired-bricks', 'graveyard');
    expect(performAction(g, 0, { type: 'activate', card: ice.id, ability: 0, targets: [] })).toBeNull();
    resolve(g);
    expect(junk.zone).toBe('exile');
    expect(ice.zone).toBe('battlefield');
    expect(ice.def.name).toBe('Iceberg Titan');
    expect(isCreature(ice)).toBe(true);
  });
  it('死去後轉化成地，條件達成後再轉回生物', () => {
    const g = mk();
    const god = put(g, 0, 'aclazotz-deepest-betrayal');
    destroyCards(g, [god]);
    resolve(g);
    expect(god.zone).toBe('battlefield');
    expect(god.def.name).toBe('Temple of the Dead');
    expect(isLand(god)).toBe(true);
    expect(god.tapped).toBe(true);
    god.tapped = false;
    lands(g, 'swamp', 3);
    g.players[1].hand = [];
    expect(performAction(g, 0, { type: 'activate', card: god.id, ability: 0, targets: [] })).toBeNull();
    resolve(g);
    expect(god.def.name).toBe('Aclazotz, Deepest Betrayal');
    expect(isCreature(god)).toBe(true);
  });
  it('離開戰場後回到正面', () => {
    const g = mk();
    lands(g, 'island', 6);
    const ice = put(g, 0, 'inverted-iceberg');
    put(g, 0, 'clay-fired-bricks', 'graveyard');
    performAction(g, 0, { type: 'activate', card: ice.id, ability: 0, targets: [] });
    resolve(g);
    destroyCards(g, [ice]);
    expect(ice.zone).toBe('graveyard');
    expect(ice.def.name).toBe('Inverted Iceberg');
  });
  it('模式雙面牌：可以直接施放背面，也可以付費轉化', () => {
    const g = mk();
    lands(g, 'plains', 4);
    lands(g, 'mountain', 1);
    const m = put(g, 0, 'monica-rambeau', 'hand');
    expect(castOptionsFor(g, 0, m).map((o) => o.alt)).toEqual([undefined, 'back']);
    expect(performAction(g, 0, { type: 'cast', card: m.id, targets: [], alt: 'back' })).toBeNull();
    resolve(g);
    expect(m.zone).toBe('battlefield');
    expect(m.def.name).toBe('Photon, Living Light');
    const g2 = mk();
    lands(g2, 'plains', 3);
    lands(g2, 'island', 1);
    lands(g2, 'forest', 1);
    const p = put(g2, 0, 'peter-parker');
    expect(performAction(g2, 0, { type: 'activate', card: p.id, ability: 0, targets: [] })).toBeNull();
    resolve(g2);
    expect(p.def.name).toBe('Amazing Spider-Man');
  });
});
