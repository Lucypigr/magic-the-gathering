import { describe, expect, it } from 'vitest';
import '../src/data';
import { activatedAbilities, canActivate, crewChoice, performAction } from '../src/engine/actions';
import { canAttack } from '../src/engine/combat';
import { resolveTop } from '../src/engine/flow';
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
function put(g: GameState, pid: PID, id: string, sick = false): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'exile';
  enterBattlefield(g, c, pid);
  c.sick = sick;
  c.tapped = false;
  g.pending = [];
  return c;
}

describe('載具', () => {
  it('沒有駕駛前不是生物；駕駛後成為生物並可以攻擊', () => {
    const g = mk();
    const v = put(g, 0, 'spotcycle-scouter');
    expect(isCreature(v)).toBe(false);
    const idx = activatedAbilities(v.def).findIndex((a) => a.cost.crew !== undefined);
    expect(canActivate(g, 0, v, idx)).toBe(false);
    const pilot = put(g, 0, 'hinterland-sanctifier');
    expect(canActivate(g, 0, v, idx)).toBe(true);
    expect(performAction(g, 0, { type: 'activate', card: v.id, ability: idx, targets: [] })).toBeNull();
    expect(pilot.tapped).toBe(true);
    const it = resolveTop(g);
    while (!it.next().done);
    expect(isCreature(v)).toBe(true);
    expect(stats(g, v).p).toBe(3);
    expect(canAttack(g, v)).toBe(true);
  });

  it('駕駛優先使用剛進場的生物，並且不浪費力量', () => {
    const g = mk();
    const v = put(g, 0, 'broadcast-rambler');
    const ready = put(g, 0, 'nova-hellkite');
    const fresh = put(g, 0, 'hinterland-sanctifier', true);
    const crew = crewChoice(g, 0, v, 1);
    expect(crew).toEqual([fresh.id]);
    expect(crewChoice(g, 0, v, 5)?.includes(ready.id)).toBe(true);
    expect(crewChoice(g, 0, v, 99)).toBeNull();
  });
});
