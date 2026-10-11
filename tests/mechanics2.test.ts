import { describe, expect, it } from 'vitest';
import '../src/data';
import { activatedAbilities, canActivate, castOptionsFor, performAction } from '../src/engine/actions';
import { resolveTop } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { checkCond, createGame, matches, newCard } from '../src/engine/state';
import type { Card, GameState, PID } from '../src/engine/types';
import { enterBattlefield, moveCard, putIntoGraveyard } from '../src/engine/zones';

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
function inHand(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'hand';
  g.players[pid].hand.push(c.id);
  return c;
}
function resolve(g: GameState) {
  const it = resolveTop(g);
  while (!it.next().done);
}

describe('新增機制', () => {
  it('循環：支付費用、棄掉此牌、抓一張牌', () => {
    const g = mk();
    for (let i = 0; i < 4; i++) put(g, 0, 'mountain');
    const c = inHand(g, 0, 'clamorous-ironclad');
    const opt = castOptionsFor(g, 0, c).find((o) => o.alt === 'cycle');
    expect(opt).toBeTruthy();
    const hand = g.players[0].hand.length;
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'cycle' })).toBeNull();
    expect(c.zone).toBe('graveyard');
    resolve(g);
    expect(g.players[0].hand.length).toBe(hand);
    expect(g.players[0].spellsThisTurn).toBe(0);
  });

  it('竭力：每場遊戲只能起動一次', () => {
    const g = mk();
    for (let i = 0; i < 6; i++) put(g, 0, 'island');
    const c = put(g, 0, 'keen-buccaneer');
    const idx = activatedAbilities(c.def).findIndex((a) => a.oncePerGame);
    expect(canActivate(g, 0, c, idx)).toBe(true);
    expect(performAction(g, 0, { type: 'activate', card: c.id, ability: idx, targets: [] })).toBeNull();
    expect(canActivate(g, 0, c, idx)).toBe(false);
    g.turn += 2;
    c.usedThisTurn = [];
    expect(canActivate(g, 0, c, idx)).toBe(false);
  });

  it('變形者具有所有生物類別', () => {
    const g = mk();
    const c = put(g, 0, 'changeling-wayfinder');
    expect(matches(g, { sub: 'Elf' }, c, 0)).toBe(true);
    expect(matches(g, { sub: ['Goblin', 'Rat'] }, c, 0)).toBe(true);
  });

  it('死亡、譫妄、慶典的條件', () => {
    const g = mk();
    expect(checkCond(g, { c: 'morbid' }, 0, undefined, [])).toBe(false);
    const a = put(g, 1, 'changeling-wayfinder');
    putIntoGraveyard(g, [a]);
    expect(checkCond(g, { c: 'morbid' }, 0, undefined, [])).toBe(true);
    expect(checkCond(g, { c: 'celebration' }, 0, undefined, [])).toBe(false);
    put(g, 0, 'keen-buccaneer');
    put(g, 0, 'keen-buccaneer');
    expect(checkCond(g, { c: 'celebration' }, 0, undefined, [])).toBe(true);
    expect(checkCond(g, { c: 'delirium' }, 0, undefined, [])).toBe(false);
    for (const id of ['mountain', 'keen-buccaneer', 'into-the-roil', 'idol-of-the-deep-king']) moveCard(g, newCard(g, getDef(id), 0), 'graveyard');
    expect(checkCond(g, { c: 'delirium' }, 0, undefined, [])).toBe(true);
    expect(checkCond(g, { c: 'descended' }, 0, undefined, [])).toBe(true);
  });

  it('增幅：兩種施放方式，增幅後多抓一張牌', () => {
    const g = mk();
    for (let i = 0; i < 4; i++) put(g, 0, 'island');
    const target = put(g, 1, 'keen-buccaneer');
    const c = inHand(g, 0, 'into-the-roil');
    const opts = castOptionsFor(g, 0, c);
    expect(opts.length).toBe(2);
    const hand = g.players[0].hand.length;
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [{ c: target.id }], mode: 1 })).toBeNull();
    resolve(g);
    expect(target.zone).toBe('hand');
    expect(g.players[0].hand.length).toBe(hand); // -1 施放的牌 +1 抓牌
    expect(g.battlefield.filter((id) => g.cards[id].controller === 0 && g.cards[id].tapped).length).toBe(4);
  });
});
