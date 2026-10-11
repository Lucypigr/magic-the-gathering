import { describe, expect, it } from 'vitest';
import '../src/data';
import { runEffects } from '../src/engine/effects';
import { getDef } from '../src/engine/registry';
import { createGame, newCard, stats } from '../src/engine/state';
import type { Card, Effect, GameState, PID, Response, TargetRef } from '../src/engine/types';
import { enterBattlefield } from '../src/engine/zones';

function mk(top: string): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill(top), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
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
  g.pending = [];
  return c;
}
function run(g: GameState, src: Card, effects: Effect[], targets: (TargetRef | null)[] = [], pick = true) {
  const it = runEffects(g, { controller: src.controller, source: src.id, targets }, effects);
  let r = it.next();
  while (!r.done) {
    const d = r.value;
    const resp: Response = d.type === 'choose' ? { type: 'choose', ids: pick ? d.options.slice(0, d.max) : [] } : { type: 'yesno', yes: true };
    r = it.next(resp);
  }
}

describe('探險、動員、閃現', () => {
  it('探險：牌庫頂是地就放到手上', () => {
    const g = mk('forest');
    const c = put(g, 0, 'amalia-benavides-aguirre');
    const hand = g.players[0].hand.length;
    run(g, c, [{ e: 'explore', what: 'self' }]);
    expect(g.players[0].hand.length).toBe(hand + 1);
    expect(c.counters).toBe(0);
  });

  it('探險：不是地就得到 +1/+1 指示物，可以選擇把牌置入墳墓場', () => {
    const g = mk('shock');
    const c = put(g, 0, 'amalia-benavides-aguirre');
    const lib = g.players[0].library.length;
    run(g, c, [{ e: 'explore', what: 'self' }]);
    expect(c.counters).toBe(1);
    expect(g.players[0].graveyard.length).toBe(1);
    expect(g.players[0].library.length).toBe(lib - 1);
    const g2 = mk('shock');
    const c2 = put(g2, 0, 'amalia-benavides-aguirre');
    run(g2, c2, [{ e: 'explore', what: 'self' }], [], false);
    expect(g2.players[0].graveyard.length).toBe(0);
  });

  it('動員：派出橫置且攻擊中的戰士，結束步驟犧牲', () => {
    const g = mk('plains');
    const v = put(g, 0, 'voice-of-victory');
    const ab = getDef('voice-of-victory').abilities![0] as { effects: Effect[] };
    run(g, v, ab.effects);
    const warriors = g.battlefield.map((id) => g.cards[id]).filter((c) => c.def.id === 'tok-warrior-r11');
    expect(warriors).toHaveLength(2);
    expect(warriors.every((w) => w.tapped && w.attacking && w.sacAtEnd)).toBe(true);
  });

  it('白日夢：生物被閃現並得到 +1/+1 指示物', () => {
    const g = mk('plains');
    const c = put(g, 0, 'hinterland-sanctifier');
    c.damage = 1;
    run(g, c, getDef('daydream').spell!.effects!, [{ c: c.id }]);
    expect(c.zone).toBe('battlefield');
    expect(c.damage).toBe(0);
    expect(stats(g, c).p).toBe(2);
  });

  it('地圖衍生物：起動後目標生物探險', () => {
    const g = mk('forest');
    const map = put(g, 0, 'tok-map');
    expect(map.def.abilities?.[0].kind).toBe('activated');
  });
});
