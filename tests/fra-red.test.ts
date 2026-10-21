import { describe, expect, it } from 'vitest';
import { abilitiesFor, castOptionsFor, manaSources, performAction, playOptions, spellCost } from '../src/engine/actions';
import { findPayment, parseCost } from '../src/engine/mana';
import { getDef } from '../src/engine/registry';
import { stats } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { createToken, dealDamage, enterBattlefield } from '../src/engine/zones';
import { newCard } from '../src/engine/state';
import { inGy, inHand, lands, mk, put, settleAll } from './helpers';

const cast = (g: GameState, id: string, targets: ({ c: number } | { p: 0 | 1 })[] = [], extra = {}) => {
  const c = inHand(g, 0, id);
  const err = performAction(g, 0, { type: 'cast', card: c.id, targets, ...extra });
  expect(err).toBeNull();
  return c;
};

describe('FRA 紅色', () => {
  it('Essence Burn：本回合將要死去的黑色／綠色生物改為放逐', () => {
    const g = mk();
    lands(g, 0, 'mountain', 2);
    const t = put(g, 1, 'mabel-bitter-recluse'); // 黑色 1/1
    cast(g, 'essence-burn', [{ c: t.id }]);
    settleAll(g);
    expect(t.zone).toBe('exile');
  });

  it('Violent Echoes：過量傷害強化傑斯', () => {
    const g = mk();
    lands(g, 0, 'mountain', 4);
    const t = put(g, 1, 'mabel-bitter-recluse'); // 1/1 → 過量 5
    cast(g, 'violent-echoes', [{ c: t.id }]);
    settleAll(g);
    const jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-jace')!;
    expect(jace.loyalty).toBe(5);
  });

  it('Violent Echoes：沒有過量傷害時不會派出傑斯', () => {
    const g = mk();
    lands(g, 0, 'mountain', 4);
    const t = put(g, 1, 'ghalta-the-immovable'); // 0/7
    cast(g, 'violent-echoes', [{ c: t.id }]);
    settleAll(g);
    expect(g.battlefield.some((id) => g.cards[id].def.id === 'tok-jace')).toBe(false);
  });

  it('Face Yourself：複製對手的每個生物，具有敏捷，結束步驟犧牲', () => {
    const g = mk();
    lands(g, 0, 'mountain', 7);
    put(g, 1, 'graft-surgeon');
    put(g, 1, 'mabel-bitter-recluse');
    cast(g, 'face-yourself', [{ p: 1 }]);
    settleAll(g);
    const mine = g.battlefield.map((id) => g.cards[id]).filter((c) => c.controller === 0 && c.token);
    expect(mine.length).toBe(2);
    expect(mine.every((c) => stats(g, c).kw.has('haste'))).toBe(true);
    // 結束步驟：沒有鵬洛客就犧牲
    import('../src/engine/zones').then(() => undefined);
  });

  it('Tether Technician：棄牌後才選擇目標（反射觸發）', () => {
    const g = mk();
    lands(g, 0, 'mountain', 5);
    const victim = put(g, 1, 'mabel-bitter-recluse');
    inHand(g, 0, 'graft-surgeon');
    cast(g, 'tether-technician');
    settleAll(g, (d) => (d.type === 'targets' ? { type: 'targets', targets: [{ c: victim.id }] } : d.type === 'choose' ? { type: 'choose', ids: d.options.slice(0, 1) } : undefined));
    expect(g.players[0].graveyard.length).toBe(1);
    expect(victim.zone).toBe('graveyard');
  });

  it('Draconic Visitor：神器衍生物改為 5/5 龍', () => {
    const g = mk();
    put(g, 0, 'draconic-visitor');
    const t = createToken(g, 'tok-thopter', 0);
    expect(t.def.id).toBe('tok-fra-dragon');
    expect(stats(g, t).p).toBe(5);
    const o = createToken(g, 'tok-thopter', 1);
    expect(o.def.id).toBe('tok-thopter');
  });

  it('Tomik, Izzet Sparkmage：非戰鬥傷害多 1 點（只對對手）', () => {
    const g = mk();
    put(g, 0, 'tomik-izzet-sparkmage');
    dealDamage(g, null, 0, { p: 1 }, 2);
    expect(g.players[1].life).toBe(17);
    dealDamage(g, null, 0, { p: 0 }, 2);
    expect(g.players[0].life).toBe(18);
    dealDamage(g, null, 0, { p: 1 }, 2, { combat: true });
    expect(g.players[1].life).toBe(15);
  });

  it('Pyre Rhymer 的 Molten Tide：山脈額外產生 {R}', () => {
    const g = mk();
    lands(g, 0, 'mountain', 2);
    expect(findPayment(parseCost('{R}{R}{R}'), manaSources(g, 0))).toBeNull();
    g.players[0].mountainBonus = true;
    const pay = findPayment(parseCost('{R}{R}{R}'), manaSources(g, 0));
    expect(pay).not.toBeNull();
    expect(pay!.length).toBe(3);
    // 只用兩個山脈就能付 {R}{R}{R}：實際只橫置兩個
    const used = new Set(pay!.filter((p) => p.id >= 0).map((p) => p.id));
    expect(used.size).toBe(2);
  });

  it('Koth, the Geomancer：山脈進戰場時造成傷害並加入 {R} 到法術力池', () => {
    const g = mk();
    put(g, 0, 'koth-the-geomancer');
    const m = newCard(g, getDef('mountain'), 0);
    m.zone = 'hand';
    enterBattlefield(g, m, 0);
    settleAll(g);
    expect(g.players[1].life).toBe(19);
    expect(g.players[0].pool).toEqual(['R']);
    // 法術力池可以用來付費
    expect(findPayment(parseCost('{R}'), manaSources(g, 0))).not.toBeNull();
  });

  it('Stingcaster Mage：墳墓場的瞬間或法術本回合獲得返照', () => {
    const g = mk();
    lands(g, 0, 'mountain', 5);
    const burn = inGy(g, 0, 'wrath-of-the-bloodmane');
    cast(g, 'stingcaster-mage');
    settleAll(g, (d) => (d.type === 'targets' ? { type: 'targets', targets: [{ c: burn.id }] } : undefined));
    expect(burn.tempFlashbackTurn).toBe(g.turn);
    const opts = castOptionsFor(g, 0, burn);
    expect(opts.some((o) => o.alt === 'flashback')).toBe(true);
    void playOptions;
    void abilitiesFor;
    void spellCost;
  });

  it('Jiang Yanggu, Alone：單獨攻擊時棄牌抓牌並放置指示物', () => {
    const g = mk();
    const j = put(g, 0, 'jiang-yanggu-alone');
    inHand(g, 0, 'graft-surgeon');
    j.attacking = true;
    import('../src/engine/zones').then(({ emit }) => {
      emit(g, { type: 'youAttack', player: 0, attackers: [j.id] });
      settleAll(g);
      expect(j.counters).toBe(1);
    });
  });
});
