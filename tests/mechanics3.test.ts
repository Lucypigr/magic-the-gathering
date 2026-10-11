import { describe, expect, it } from 'vitest';
import '../src/data';
import { activatedAbilities, canActivate, castOptionsFor, performAction, playOptions } from '../src/engine/actions';
import { resolveTop } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { createGame, isCreature, newCard, stats } from '../src/engine/state';
import type { Card, GameState, PID } from '../src/engine/types';
import { dealDamage, emit, enterBattlefield, moveCard } from '../src/engine/zones';

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
  let r = it.next();
  while (!r.done) {
    const d = r.value;
    r = it.next(d.type === 'choose' ? { type: 'choose', ids: d.options.slice(0, d.min ?? 1) } : { type: 'yesno', yes: true });
  }
}
const lands = (g: GameState, n: number) => {
  for (let i = 0; i < n; i++) put(g, 0, 'plains');
};

describe('面朝下、預謀、騎乘、速度', () => {
  it('偽裝：支付{3}面朝下施放成為 2/2 守護{2}，再支付偽裝費用翻成正面', () => {
    const g = mk();
    lands(g, 5);
    const c = inHand(g, 0, 'museum-nightwatch');
    expect(castOptionsFor(g, 0, c).some((o) => o.alt === 'disguise')).toBe(true);
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'disguise' })).toBeNull();
    resolve(g);
    expect(c.zone).toBe('battlefield');
    expect(c.def.faceDown).toBe(true);
    expect(stats(g, c).p).toBe(2);
    expect(c.def.ward).toBe(2);
    expect(c.hidden?.id).toBe('museum-nightwatch');
    const idx = activatedAbilities(c.def).findIndex((a) => a.special);
    expect(canActivate(g, 0, c, idx)).toBe(true);
    expect(performAction(g, 0, { type: 'activate', card: c.id, ability: idx, targets: [] })).toBeNull();
    expect(g.stack.length).toBe(0);
    expect(c.def.id).toBe('museum-nightwatch');
    expect(c.hidden).toBeUndefined();
    expect(stats(g, c).p).toBe(3);
  });

  it('面朝下的牌離開戰場時亮出真正的牌', () => {
    const g = mk();
    lands(g, 3);
    const c = inHand(g, 0, 'museum-nightwatch');
    performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'disguise' });
    resolve(g);
    moveCard(g, c, 'graveyard');
    expect(c.def.id).toBe('museum-nightwatch');
    expect(c.def.faceDown).toBeUndefined();
  });

  it('顯化恐懼：一張面朝下進戰場，另一張進墳墓場', () => {
    const g = mk();
    lands(g, 4);
    const c = inHand(g, 0, 'unsettling-twins');
    const bf = g.battlefield.length;
    performAction(g, 0, { type: 'cast', card: c.id, targets: [] });
    resolve(g);
    while (g.pending.length || g.stack.length) {
      // 觸發進入堆疊後結算
      const p = g.pending.shift();
      if (p) {
        g.stack.push({ sid: g.nextSid++, kind: 'trigger', controller: 0, cardId: p.source, targets: [], targetSpecs: [], effects: p.ability.effects, text: '' });
      }
      resolve(g);
    }
    expect(g.battlefield.length).toBe(bf + 2);
    const fd = g.battlefield.map((id) => g.cards[id]).find((x) => x.def.faceDown);
    expect(fd && isCreature(fd)).toBe(true);
    expect(g.players[0].graveyard.length).toBe(1);
  });

  it('預謀：付費放逐，下個回合免費施放', () => {
    const g = mk();
    lands(g, 4);
    const c = inHand(g, 0, 'stagecoach-security');
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'plot' })).toBeNull();
    expect(c.zone).toBe('exile');
    expect(castOptionsFor(g, 0, c).length).toBe(0);
    g.turn += 2;
    for (const id of g.battlefield) g.cards[id].tapped = true;
    const opt = castOptionsFor(g, 0, c).find((o) => o.alt === 'plotted');
    expect(opt).toBeTruthy();
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'plotted' })).toBeNull();
    resolve(g);
    expect(c.zone).toBe('battlefield');
  });

  it('騎乘：橫置其他生物，攻擊時觸發', () => {
    const g = mk();
    const m = put(g, 0, 'brightfield-mustang');
    const rider = put(g, 0, 'museum-nightwatch');
    const idx = activatedAbilities(m.def).findIndex((a) => a.effects.some((e) => e.e === 'saddle'));
    expect(canActivate(g, 0, m, idx)).toBe(true);
    performAction(g, 0, { type: 'activate', card: m.id, ability: idx, targets: [] });
    expect(rider.tapped).toBe(true);
    resolve(g);
    expect(m.saddledTurn).toBe(g.turn);
    m.tapped = true;
    emit(g, { type: 'attacks', card: m.id });
    expect(g.pending.length).toBe(1);
  });

  it('速度：發動引擎！從 1 開始，你的回合對手失去生命時每回合提升一次，最高速度啟動能力', () => {
    const g = mk();
    const bot = put(g, 0, 'nesting-bot');
    expect(g.players[0].speed).toBe(1);
    expect(stats(g, bot).p).toBe(1);
    for (let t = 0; t < 5; t++) {
      dealDamage(g, null, 0, { p: 1 }, 1);
      dealDamage(g, null, 0, { p: 1 }, 1);
      g.turn += 2;
    }
    expect(g.players[0].speed).toBe(4);
    expect(stats(g, bot).p).toBe(2);
  });

  it('墳墓場異能：最高速度時從墳墓場放逐並抓牌', () => {
    const g = mk();
    lands(g, 3);
    g.players[0].speed = 4;
    const c = newCard(g, getDef('leonin-surveyor'), 0);
    moveCard(g, c, 'graveyard');
    const opt = playOptions(g, 0).find((o) => o.card === c.id && o.kind === 'activate');
    expect(opt).toBeTruthy();
    const hand = g.players[0].hand.length;
    expect(performAction(g, 0, { type: 'activate', card: c.id, ability: opt!.ability!, targets: [] })).toBeNull();
    expect(c.zone).toBe('exile');
    resolve(g);
    expect(g.players[0].hand.length).toBe(hand + 1);
  });
});
