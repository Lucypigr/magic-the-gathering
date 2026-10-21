import { describe, expect, it } from 'vitest';
import '../src/data';
import { performAction, playOptions } from '../src/engine/actions';
import { runEffects } from '../src/engine/effects';
import { resolveTop } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { createGame, newCard } from '../src/engine/state';
import type { Card, GameState, PID, Response } from '../src/engine/types';
import { emit, enterBattlefield, moveCard } from '../src/engine/zones';

function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('island'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
  g.turn = 3;
  g.active = 0;
  g.priority = 0;
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
function resolve(g: GameState) {
  const it = resolveTop(g);
  let r = it.next();
  while (!r.done) {
    const d = r.value;
    let resp: Response = { type: 'pass' };
    if (d.type === 'choose') resp = { type: 'choose', ids: d.options.slice(0, d.min ?? 0) };
    r = it.next(resp);
  }
}

describe('準備', () => {
  it('準備好進戰場：施放準備咒語的複製品，生物留在戰場、不再準備好', () => {
    const g = mk();
    put(g, 0, 'island');
    const seeker = put(g, 0, 'spellbook-seeker');
    expect(seeker.prepared).toBe(true);
    const opts = playOptions(g, 0).filter((o) => o.kind === 'cast' && o.card === seeker.id);
    expect(opts).toHaveLength(1);
    expect(opts[0].alt).toBe('prepared');
    expect(performAction(g, 0, { type: 'cast', card: seeker.id, targets: [], alt: 'prepared' })).toBeNull();
    expect(seeker.zone).toBe('battlefield');
    expect(seeker.prepared).toBe(false);
    expect(g.stack).toHaveLength(1);
    const spell = g.cards[g.stack[0].cardId];
    expect(spell.id).not.toBe(seeker.id);
    expect(spell.def.name).toBe('Careful Study');
    const hand = g.players[0].hand.length;
    resolve(g);
    expect(g.stack).toHaveLength(0);
    // 抓二棄二：手牌數不變；複製品不會留在墳墓場
    expect(g.players[0].hand.length).toBe(hand);
    expect(g.players[0].graveyard.includes(spell.id)).toBe(false);
    // 不再準備好：不能再施放
    expect(playOptions(g, 0).some((o) => o.kind === 'cast' && o.card === seeker.id)).toBe(false);
  });

  it('沒有準備好的生物不能施放準備咒語；施放生物咒語時觸發，重新準備好', () => {
    const g = mk();
    put(g, 0, 'plains');
    put(g, 0, 'swamp');
    const abigale = put(g, 0, 'abigale-poet-laureate');
    expect(abigale.prepared).toBeFalsy();
    expect(playOptions(g, 0).some((o) => o.kind === 'cast' && o.card === abigale.id)).toBe(false);
    // 施放非生物咒語不觸發
    const shock = newCard(g, getDef('shock'), 0);
    emit(g, { type: 'cast', card: shock.id, player: 0, opponentTurn: false });
    expect(g.pending).toHaveLength(0);
    // 施放生物咒語 → 觸發
    const bird = newCard(g, getDef('spellbook-seeker'), 0);
    emit(g, { type: 'cast', card: bird.id, player: 0, opponentTurn: false });
    expect(g.pending).toHaveLength(1);
    const it = runEffects(g, { controller: 0, source: abigale.id, targets: [] }, g.pending[0].ability.effects);
    while (!it.next({ type: 'pass' }).done);
    g.pending = [];
    expect(abigale.prepared).toBe(true);
    expect(playOptions(g, 0).some((o) => o.kind === 'cast' && o.card === abigale.id && o.alt === 'prepared')).toBe(true);
  });

  it('離開戰場會失去準備狀態', () => {
    const g = mk();
    const s = put(g, 0, 'spellbook-seeker');
    expect(s.prepared).toBe(true);
    moveCard(g, s, 'hand');
    expect(s.prepared).toBeFalsy();
  });
});
