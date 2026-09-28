import { describe, expect, it } from 'vitest';
import '../src/data';
import { canPayCost, manaSources, payCost, performAction } from '../src/engine/actions';
import { runEffects } from '../src/engine/effects';
import { findPayment, parseCost } from '../src/engine/mana';
import { getDef } from '../src/engine/registry';
import { createGame, isCreature, newCard, stats } from '../src/engine/state';
import type { Card, GameState, PID } from '../src/engine/types';
import { enterBattlefield } from '../src/engine/zones';

function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('plains'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
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

describe('非基本地', () => {
  it('過濾地：多付 {1} 產生任意顏色', () => {
    const pay = findPayment(parseCost('{R}'), [
      { id: 1, produces: ['C'], isCreature: false, filter: true },
      { id: 2, produces: ['C'], isCreature: false },
    ]);
    expect(pay).toHaveLength(2);
    expect(findPayment(parseCost('{R}'), [{ id: 1, produces: ['C'], isCreature: false, filter: true }])).toBeNull();
    expect(findPayment(parseCost('{1}'), [{ id: 1, produces: ['C'], isCreature: false, filter: true }])).toHaveLength(1);
    const g = mk();
    put(g, 0, 'crystal-grotto');
    put(g, 0, 'plains');
    expect(canPayCost(g, 0, parseCost('{U}'))).toBe(true);
    expect(canPayCost(g, 0, parseCost('{U}{W}'))).toBe(false);
  });
  it('珍寶：產生法術力後被犧牲', () => {
    const g = mk();
    const t = put(g, 0, 'tok-treasure');
    const land = put(g, 0, 'plains');
    expect(manaSources(g, 0)).toHaveLength(2);
    expect(payCost(g, 0, parseCost('{W}'))).toBe(true);
    expect(land.tapped).toBe(true);
    expect(t.zone).toBe('battlefield');
    expect(payCost(g, 0, parseCost('{B}'))).toBe(true);
    expect(g.battlefield.includes(t.id)).toBe(false);
  });
  it('人地：起動後成為生物，回合結束恢復為地', () => {
    const g = mk();
    const land = put(g, 0, 'restless-fortress');
    for (let i = 0; i < 4; i++) put(g, 0, 'plains');
    put(g, 0, 'swamp');
    expect(isCreature(land)).toBe(false);
    const err = performAction(g, 0, { type: 'activate', card: land.id, ability: 0, targets: [] });
    expect(err).toBeNull();
    // 結算堆疊上的異能
    const top = g.stack.pop()!;
    const it = runEffects(g, { controller: 0, source: land.id, targets: top.targets }, top.effects);
    while (!it.next().done);
    expect(isCreature(land)).toBe(true);
    expect(stats(g, land).t).toBe(4);
    // 模擬清除步驟
    land.def = land.baseDef!;
    land.baseDef = undefined;
    expect(isCreature(land)).toBe(false);
  });
});
