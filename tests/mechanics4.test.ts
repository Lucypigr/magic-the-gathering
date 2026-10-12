import { describe, expect, it } from 'vitest';
import '../src/data';
import { activatedAbilities, canActivate, castOptionsFor, performAction } from '../src/engine/actions';
import { resolveTop } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { createGame, newCard, stats } from '../src/engine/state';
import type { Card, GameState, PID } from '../src/engine/types';
import { discard, enterBattlefield, moveCard } from '../src/engine/zones';
import { runEffects } from '../src/engine/effects';

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
const lands = (g: GameState, id: string, n: number) => {
  for (let i = 0; i < n; i++) put(g, 0, id);
};
const untapped = (g: GameState) => g.battlefield.filter((id) => g.cards[id].controller === 0 && !g.cards[id].tapped).length;

describe('折躍、子嗣、召集、騷亂、和聲、強化、懷疑', () => {
  it('折躍：用折躍費用施放，結束步驟放逐，之後的回合可以從放逐區施放', () => {
    const g = mk();
    lands(g, 'plains', 2);
    const c = inHand(g, 0, 'knight-luminary');
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'warp' })).toBeNull();
    resolve(g);
    expect(c.zone).toBe('battlefield');
    expect(c.exileAtEnd).toBe(true);
    expect(g.voidThisTurn).toBe(true);
    // 模擬結束步驟的處理
    moveCard(g, c, 'exile');
    c.warpExiled = g.turn;
    expect(castOptionsFor(g, 0, c).length).toBe(0);
    g.turn += 2;
    lands(g, 'plains', 4);
    expect(castOptionsFor(g, 0, c).some((o) => o.alt === undefined)).toBe(true);
  });

  it('子嗣：多付費用，進戰場時派出 1/1 的衍生物複製', () => {
    const g = mk();
    lands(g, 'plains', 4);
    const c = inHand(g, 0, 'intrepid-rabbit');
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'offspring' })).toBeNull();
    expect(untapped(g)).toBe(0);
    resolve(g);
    const copy = g.battlefield.map((id) => g.cards[id]).find((x) => x.token && x.def.name === 'Intrepid Rabbit');
    expect(copy).toBeTruthy();
    expect(stats(g, copy!).p).toBe(1);
  });

  it('召集：橫置生物幫忙支付', () => {
    const g = mk();
    lands(g, 'plains', 1);
    const a = put(g, 0, 'intrepid-rabbit');
    const b = put(g, 0, 'intrepid-rabbit');
    const target = put(g, 1, 'intrepid-rabbit');
    target.attacking = true;
    const c = inHand(g, 0, 'protective-response');
    expect(castOptionsFor(g, 0, c).length).toBe(1);
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [{ c: target.id }] })).toBeNull();
    expect(a.tapped && b.tapped).toBe(true);
  });

  it('和聲：從墳墓場施放，橫置生物減費，之後放逐', () => {
    const g = mk();
    lands(g, 'island', 3);
    put(g, 0, 'intrepid-rabbit'); // 力量 3
    const c = newCard(g, getDef('unending-whisper'), 0);
    moveCard(g, c, 'graveyard');
    const opt = castOptionsFor(g, 0, c).find((o) => o.alt === 'harmonize');
    expect(opt).toBeTruthy();
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [], alt: 'harmonize' })).toBeNull();
    resolve(g);
    expect(c.zone).toBe('exile');
  });

  it('騷亂：本回合棄掉後才能從墳墓場施放', () => {
    const g = mk();
    const def = { ...getDef('unending-whisper'), mayhem: '{U}', harmonize: undefined };
    const c = newCard(g, def, 0);
    c.zone = 'hand';
    g.players[0].hand.push(c.id);
    lands(g, 'island', 1);
    moveCard(g, c, 'graveyard');
    expect(castOptionsFor(g, 0, c).length).toBe(0);
    moveCard(g, c, 'hand');
    discard(g, c);
    expect(castOptionsFor(g, 0, c).some((o) => o.alt === 'mayhem')).toBe(true);
  });

  it('強化：每場一次；本回合進場時費用減去法術力費用', () => {
    const g = mk();
    lands(g, 'swamp', 3);
    const c = put(g, 0, 'unliving-legionnaire');
    c.enteredTurn = g.turn;
    const idx = activatedAbilities(c.def).findIndex((a) => a.powerUp);
    // {5}{B}{B} 減去 {3}{B} = {2}{B}
    expect(canActivate(g, 0, c, idx)).toBe(true);
    expect(performAction(g, 0, { type: 'activate', card: c.id, ability: idx, targets: [null] })).toBeNull();
    expect(canActivate(g, 0, c, idx)).toBe(false);
  });

  it('懷疑：具有威懾且不能阻擋', () => {
    const g = mk();
    const t = put(g, 1, 'intrepid-rabbit');
    const it = runEffects(g, { controller: 0, source: t.id, targets: [{ c: t.id }] }, [{ e: 'suspect', what: 'T0' }]);
    while (!it.next().done);
    const st = stats(g, t);
    expect(st.kw.has('menace')).toBe(true);
    expect(st.cantBlock).toBe(true);
  });
});
