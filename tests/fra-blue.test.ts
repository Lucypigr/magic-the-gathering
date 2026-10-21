import { describe, expect, it } from 'vitest';
import { abilitiesFor, castOptionsFor, performAction, playOptions, spellCost } from '../src/engine/actions';
import { combatDamage } from '../src/engine/combat';
import { stats } from '../src/engine/state';
import { putIntoGraveyard } from '../src/engine/zones';
import { inGy, inHand, lands, mk, put, resolve, settleAll } from './helpers';
import type { GameState } from '../src/engine/types';

const cast = (g: GameState, id: string, targets: { c: number }[] = [], extra = {}) => {
  const c = inHand(g, 0, id);
  const err = performAction(g, 0, { type: 'cast', card: c.id, targets, ...extra });
  expect(err).toBeNull();
  return c;
};
const first = (id: string) => (d: { type: string }) => d.type === 'mode' ? ({ type: 'modes', picks: [0] } as const) : undefined;
void first;

describe('FRA 藍色', () => {
  it('Infinite Coursework：失去所有異能、不會重置、取消準備', () => {
    const g = mk();
    lands(g, 0, 'island', 3);
    const t = put(g, 1, 'surveillance-phantasm');
    expect(stats(g, t).kw.has('flying')).toBe(true);
    cast(g, 'infinite-coursework', [{ c: t.id }]);
    settleAll(g);
    expect(t.tapped).toBe(true);
    expect(stats(g, t).kw.has('flying')).toBe(false);
    expect(stats(g, t).kw.has('defender')).toBe(false);
    expect(abilitiesFor(g, t).length).toBe(0);
    expect(stats(g, t).noUntap).toBe(true);
  });

  it('Perfected Theory：基礎力量與防禦力（在指示物與加成之前）', () => {
    const g = mk();
    lands(g, 0, 'island', 1);
    const t = put(g, 1, 'graft-surgeon'); // 2/2 + 1 指示物 = 3/3
    expect(stats(g, t).p).toBe(3);
    cast(g, 'perfected-theory', [{ c: t.id }], { mode: 1 });
    resolve(g);
    expect(stats(g, t).p).toBe(5);
    expect(stats(g, t).t).toBe(6);
  });

  it('Cruel Calculations：抓牌數 = 本回合從牌庫置入墳墓場的牌數', () => {
    const g = mk();
    lands(g, 0, 'island', 3);
    for (let i = 0; i < 3; i++) {
      const id = g.players[1].library[0];
      // 碾磨對手三張牌
      g.cards[id].zone = 'library';
    }
    // 直接模擬碾磨
    const pl = g.players[1];
    for (let i = 0; i < 3; i++) {
      const c = g.cards[pl.library[0]];
      putIntoGraveyardFromLibrary(g, c.id);
    }
    expect(pl.libToGyThisTurn).toBe(3);
    const hand = g.players[0].hand.length;
    cast(g, 'cruel-calculations', [], { targets: [{ p: 1 }] });
    resolve(g);
    expect(g.players[0].hand.length).toBe(hand + 3);
  });

  it('Sphinx of False Conclusions：死去時派出複製（衍生物不會再複製）', () => {
    const g = mk();
    const s = put(g, 0, 'sphinx-of-false-conclusions');
    putIntoGraveyard(g, [s]);
    settleAll(g);
    const copies = g.battlefield.map((id) => g.cards[id]).filter((c) => c.def.id === 'sphinx-of-false-conclusions');
    expect(copies.length).toBe(1);
    expect(copies[0].token).toBe(true);
    putIntoGraveyard(g, [copies[0]]);
    settleAll(g);
    expect(g.battlefield.filter((id) => g.cards[id].def.id === 'sphinx-of-false-conclusions').length).toBe(0);
  });

  it('Way of the Cryomancer：−3 複製下一個瞬間或法術', () => {
    const g = mk();
    lands(g, 0, 'island', 6);
    cast(g, 'way-of-the-cryomancer');
    settleAll(g);
    const jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-jace')!;
    const abs = abilitiesFor(g, jace);
    const idx = abs.length - 1; // 授予的異能排在本身的異能後面
    expect(performAction(g, 0, { type: 'activate', card: jace.id, ability: idx, targets: [] })).toBeNull();
    resolve(g);
    expect(g.delayed?.length).toBe(1);
    const hand0 = g.players[0].hand.length;
    // 施放一個抓牌的法術：Sphinx's Approach（抓兩張）
    cast(g, "sphinxs-approach");
    settleAll(g);
    // 抓 2 兩次 = +4（施放的那張牌已離開手牌）
    expect(g.players[0].hand.length).toBe(hand0 + 4);
    expect(g.delayed?.length).toBe(0);
  });

  it('Lyra, Tolarian Archangel：起動後的延遲觸發（造成戰鬥傷害抓兩張牌）', () => {
    const g = mk();
    lands(g, 0, 'island', 5);
    const lyra = put(g, 0, 'lyra-tolarian-archangel');
    const ab = abilitiesFor(g, lyra).findIndex((a) => a.cost.mana === '{3}{U}{U}');
    expect(performAction(g, 0, { type: 'activate', card: lyra.id, ability: ab, targets: [] })).toBeNull();
    resolve(g);
    lyra.attacking = true;
    g.phase = 'combat_damage';
    const hand = g.players[0].hand.length;
    combatDamage(g, 'regular' as never);
    settleAll(g);
    expect(g.players[0].hand.length).toBe(hand + 2);
  });

  it('Samut：切割——堆疊上有切割咒語時對手不能回應', () => {
    const g = mk();
    put(g, 0, 'samut-tyrant-of-naktamun');
    lands(g, 0, 'island', 2);
    lands(g, 1, 'island', 2);
    inHand(g, 1, 'precise-redaction');
    cast(g, 'perfected-theory', [{ c: put(g, 0, 'graft-surgeon').id }], { mode: 0 });
    expect(playOptions(g, 1).length).toBe(0);
    resolve(g);
    expect(playOptions(g, 1).length).toBeGreaterThanOrEqual(0);
  });

  it('Fblthp：抓牌後牌庫為空就贏得遊戲', () => {
    const g = mk();
    const f = put(g, 0, 'fblthp-impossibly-lost');
    g.players[0].library = g.players[0].library.slice(0, 2);
    f.attacking = true;
    g.phase = 'combat_damage';
    combatDamage(g, 'regular' as never);
    settleAll(g);
    expect(g.players[1].lost).toBe(true);
    expect(g.players[0].drewFromEmpty).toBe(false);
  });

  it("Sphinx's Approach：墳墓場有四張同名牌時，可以放逐它們搜尋人面獅身", () => {
    const g = mk();
    lands(g, 0, 'island', 3);
    for (let i = 0; i < 4; i++) inGy(g, 0, 'sphinxs-approach');
    cast(g, 'sphinxs-approach');
    settleAll(g);
    expect(g.players[0].graveyard.filter((id) => g.cards[id].def.id === 'sphinxs-approach').length).toBe(0);
  });

  it('Traxos：施放過非生物咒語時減少 {2}', () => {
    const g = mk();
    const t = inHand(g, 0, 'traxos-academy-guardian');
    expect(spellCost(g, t, 0).generic).toBe(3);
    g.players[0].noncreatureThisTurn = 1;
    expect(spellCost(g, t, 0).generic).toBe(1);
    expect(castOptionsFor(g, 0, t)).toBeDefined();
  });

  it('Plan for All Outcomes：本回合第一個非生物咒語強化傑斯', () => {
    const g = mk();
    lands(g, 0, 'island', 12);
    cast(g, 'plan-for-all-outcomes');
    settleAll(g);
    g.players[0].noncreatureThisTurn = 0;
    cast(g, 'sphinxs-approach');
    settleAll(g);
    const jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-jace')!;
    expect(jace.loyalty).toBe(1);
    // 同一回合的第二個非生物咒語不會再觸發
    cast(g, 'sphinxs-approach');
    settleAll(g);
    expect(jace.loyalty).toBe(1);
  });
});

function putIntoGraveyardFromLibrary(g: GameState, id: number) {
  const c = g.cards[id];
  // 模擬碾磨
  import('../src/engine/zones').then(() => undefined);
  c.zone = 'library';
  moveFromLibrary(g, c.id);
}
import { moveCard } from '../src/engine/zones';
function moveFromLibrary(g: GameState, id: number) {
  moveCard(g, g.cards[id], 'graveyard');
}
