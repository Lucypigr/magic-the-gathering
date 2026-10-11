import { describe, expect, it } from 'vitest';
import '../src/data';
import { checkSBA, resolveTop } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { createGame, newCard } from '../src/engine/state';
import type { Card, GameState, PID } from '../src/engine/types';
import { addLore, enterBattlefield } from '../src/engine/zones';

function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('forest'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
  g.turn = 3;
  g.active = 0;
  g.phase = 'main1';
  return g;
}
function put(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'exile';
  enterBattlefield(g, c, pid);
  return c;
}

describe('傳奇（Saga）', () => {
  it('進場觸發第一章，之後每次前進觸發下一章', () => {
    const g = mk();
    const s = put(g, 0, 'the-mountain-kings-return');
    expect(s.lore).toBe(1);
    expect(g.pending.map((p) => p.abilityIndex)).toEqual([3001]);
    g.pending = [];
    addLore(g, s, 1);
    expect(s.lore).toBe(2);
    expect(g.pending.map((p) => p.abilityIndex)).toEqual([3002]);
  });

  it('最後一章結算完畢才犧牲', () => {
    const g = mk();
    const s = put(g, 0, 'the-mountain-kings-return');
    g.pending = [];
    addLore(g, s, 2);
    // 第三章還在等待結算：不會被犧牲
    checkSBA(g);
    expect(s.zone).toBe('battlefield');
    g.pending = [];
    checkSBA(g);
    expect(s.zone).toBe('graveyard');
  });

  it('召喚獸是生物，也會依章節前進', () => {
    const g = mk();
    const s = put(g, 0, 'summon-shiva');
    expect(s.def.types).toContain('Creature');
    expect(s.lore).toBe(1);
  });

  it('艾斯伯起源：以返照施放時轉化成召喚獸進戰場', () => {
    const g = mk();
    const c = newCard(g, getDef('esper-origins'), 0);
    c.zone = 'stack';
    g.stack.push({ sid: g.nextSid++, kind: 'spell', controller: 0, cardId: c.id, targets: [], targetSpecs: [], effects: c.def.spell!.effects!, text: '', alt: 'flashback' });
    const it = resolveTop(g);
    let r = it.next();
    while (!r.done) r = it.next({ type: 'choose', ids: [] });
    expect(c.zone).toBe('battlefield');
    expect(c.def.name).toBe('Summon: Esper Maduin');
    expect(c.lore).toBe(1);
  });
});
