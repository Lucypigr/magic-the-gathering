import { describe, expect, it } from 'vitest';
import { abilitiesFor, castOptionsFor, manaSources, performAction, playOptions } from '../src/engine/actions';
import { emit, dealDamage, putIntoGraveyard } from '../src/engine/zones';
import { findPayment, parseCost } from '../src/engine/mana';
import { isCreature, stats } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { inGy, inHand, lands, mk, put, resolve, settleAll } from './helpers';

const cast = (g: GameState, id: string, targets: ({ c: number } | { p: 0 | 1 })[] = [], extra = {}) => {
  const c = inHand(g, 0, id);
  const err = performAction(g, 0, { type: 'cast', card: c.id, targets, ...extra });
  expect(err).toBeNull();
  return c;
};

describe('FRA 綠色', () => {
  it("Hunter's Axe：裝備後攻擊時選擇踐踏或死觸", () => {
    const g = mk();
    lands(g, 0, 'forest', 3);
    const axe = put(g, 0, 'hunters-axe');
    const c = put(g, 0, 'graft-surgeon');
    const idx = abilitiesFor(g, axe).findIndex((a) => a.isEquip);
    expect(performAction(g, 0, { type: 'activate', card: axe.id, ability: idx, targets: [{ c: c.id }] })).toBeNull();
    settleAll(g);
    expect(axe.attachedTo).toBe(c.id);
    expect(stats(g, c).p).toBe(5);
    c.attacking = true;
    emit(g, { type: 'attacks', card: c.id });
    settleAll(g, (d) => (d.type === 'mode' ? { type: 'modes', picks: [1] } : undefined));
    expect(stats(g, c).kw.has('deathtouch')).toBe(true);
  });

  it('Omnipresence：免費施放法術力值小於等於生物數量的咒語', () => {
    const g = mk();
    put(g, 0, 'omnipresence');
    put(g, 0, 'graft-surgeon');
    put(g, 0, 'graft-surgeon');
    const spell = inHand(g, 0, 'tethermages-advantage'); // MV 1
    const opts = castOptionsFor(g, 0, spell);
    expect(opts.some((o) => o.alt === 'free')).toBe(true);
    const big = inHand(g, 0, 'ghalta-the-unstoppable');
    expect(castOptionsFor(g, 0, big).some((o) => o.alt === 'free')).toBe(false);
    const t = put(g, 0, 'graft-surgeon');
    expect(performAction(g, 0, { type: 'cast', card: spell.id, targets: [{ c: t.id }], alt: 'free' })).toBeNull();
  });

  it('Puppet Crafting：神器變成 5/5 生物，光環離開後恢復', () => {
    const g = mk();
    lands(g, 0, 'forest', 2);
    const art = put(g, 0, 'hunters-axe');
    expect(isCreature(art)).toBe(false);
    cast(g, 'puppet-crafting', [{ c: art.id }]);
    resolve(g);
    expect(isCreature(art)).toBe(true);
    expect(stats(g, art).p).toBe(5);
    const aura = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'puppet-crafting')!;
    putIntoGraveyard(g, [aura]);
    expect(isCreature(art)).toBe(false);
  });

  it('Tarmogoyf：力量等於所有墳墓場的牌的類別數', () => {
    const g = mk();
    const tg = put(g, 0, 'tarmogoyf');
    expect(stats(g, tg).p).toBe(0);
    inGy(g, 0, 'graft-surgeon'); // Creature
    inGy(g, 1, 'prophesied-end'); // Instant
    inGy(g, 1, 'hexhaven-battalion'); // Sorcery
    expect(stats(g, tg).p).toBe(3);
    expect(stats(g, tg).t).toBe(4);
  });

  it('Gardenize：生物死去時放置充能指示物，主要階段開始加法術力', () => {
    const g = mk();
    const gd = put(g, 0, 'gardenize');
    const a = put(g, 0, 'graft-surgeon');
    const b = put(g, 0, 'graft-surgeon');
    putIntoGraveyard(g, [a, b]);
    settleAll(g, (d) => (d.type === 'targets' ? { type: 'targets', targets: [] } : undefined));
    expect(gd.counters).toBe(2);
    emit(g, { type: 'step', step: 'main1', player: 0 });
    settleAll(g);
    expect(g.players[0].pool).toEqual(['G', 'G']);
  });

  it('Heartwood Crafter：這點法術力不能用來從手上施放咒語', () => {
    const g = mk();
    put(g, 0, 'heartwood-crafter');
    const sp = inHand(g, 0, 'tethermages-advantage');
    expect(castOptionsFor(g, 0, sp).length).toBe(0);
    // 但能付能力費用
    expect(findPayment(parseCost('{C}'), manaSources(g, 0))).not.toBeNull();
  });

  it('Fblthp, Knows the Way：搜尋至多 X 張名稱不同的基本地', () => {
    const g = mk();
    lands(g, 0, 'forest', 4);
    g.players[0].library = ['plains', 'plains', 'island', 'forest'].map((n) => {
      const c = inHand(g, 0, n);
      g.players[0].hand.pop();
      c.zone = 'library';
      return c.id;
    });
    const hand = g.players[0].hand.length;
    cast(g, 'fblthp-knows-the-way', [], { x: 2 });
    settleAll(g, (d) => (d.type === 'choose' ? { type: 'choose', ids: d.options.slice(0, d.max) } : undefined));
    expect(g.players[0].hand.length).toBe(hand + 2);
  });

  it('Compel Brutality：鵬洛客對生物造成等同其忠誠的傷害', () => {
    const g = mk();
    lands(g, 0, 'forest', 2);
    const jace = put(g, 0, 'tok-jace');
    jace.loyalty = 3;
    const t = put(g, 1, 'hapatra-the-desert-frost'); // 4/3
    cast(g, 'compel-brutality', [{ c: jace.id }, { c: t.id }], { mode: 1 });
    settleAll(g);
    expect(t.zone).toBe('graveyard');
  });

  it('Flourishing Grapple：失去所有異能後被打', () => {
    const g = mk();
    lands(g, 0, 'forest', 1);
    const t = put(g, 1, 'saheeli-consul-of-oversight'); // 白色 4/4 飛行
    const small = put(g, 0, 'graft-surgeon'); // 3/3
    cast(g, 'flourishing-grapple', [{ c: t.id }, { c: small.id }]);
    settleAll(g);
    expect(t.zone).toBe('battlefield');
    expect(t.damage).toBe(3);
    expect(stats(g, t).kw.has('flying')).toBe(false);
  });

  it('Verdant Kraken：每位玩家的維持開始時派出森林觸手（地生物）', () => {
    const g = mk();
    put(g, 0, 'verdant-kraken');
    emit(g, { type: 'step', step: 'upkeep', player: 1 });
    settleAll(g);
    const tentacles = g.battlefield.map((id) => g.cards[id]).filter((c) => c.def.id === 'tok-forest-tentacle');
    expect(tentacles.length).toBe(1);
    expect(isCreature(tentacles[0])).toBe(true);
    expect(tentacles[0].def.types.includes('Land')).toBe(true);
  });

  it('Hexhaven Invigorator：受傷時搜尋等量的地', () => {
    const g = mk();
    const h = put(g, 0, 'hexhaven-invigorator');
    g.players[0].library = ['forest', 'forest', 'forest', 'plains'].map((n) => {
      const c = inHand(g, 0, n);
      g.players[0].hand.pop();
      c.zone = 'library';
      return c.id;
    });
    dealDamage(g, null, 1, { c: h.id }, 3);
    settleAll(g, (d) => (d.type === 'choose' ? { type: 'choose', ids: d.options.slice(0, d.max) } : undefined));
    const lands2 = g.battlefield.filter((id) => g.cards[id].def.types.includes('Land') && g.cards[id].controller === 0);
    expect(lands2.length).toBe(3);
    expect(g.cards[lands2[0]].tapped).toBe(true);
  });

  it('Something Worth Saving：從碾磨的牌中選一張永久物牌', () => {
    const g = mk();
    lands(g, 0, 'forest', 2);
    const hand = g.players[0].hand.length;
    cast(g, 'something-worth-saving');
    settleAll(g, (d) => (d.type === 'choose' ? { type: 'choose', ids: d.options.slice(0, 1) } : undefined));
    // 牌庫是 plains：全是永久物牌
    expect(g.players[0].hand.length).toBe(hand + 1);
    expect(g.players[0].life).toBe(21);
  });

  it('Budding Insurgent：犧牲消滅傳奇結界並抓牌', () => {
    const g = mk();
    const bi = put(g, 0, 'budding-insurgent');
    const way = put(g, 1, 'way-of-the-healer');
    const hand = g.players[0].hand.length;
    const opt = playOptions(g, 0).find((o) => o.card === bi.id && o.kind === 'activate');
    expect(opt).toBeTruthy();
    expect(performAction(g, 0, { type: 'activate', card: bi.id, ability: opt!.ability!, targets: [{ c: way.id }] })).toBeNull();
    settleAll(g);
    expect(way.zone).toBe('graveyard');
    expect(g.players[0].hand.length).toBe(hand + 1);
  });
});
