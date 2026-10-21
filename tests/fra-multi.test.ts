import { describe, expect, it } from 'vitest';
import { abilitiesFor, performAction } from '../src/engine/actions';
import { findPayment, parseCost } from '../src/engine/mana';
import { manaSources } from '../src/engine/actions';
import { emit, gainLife, putIntoGraveyard } from '../src/engine/zones';
import { stats } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { inGy, inHand, lands, mk, put, resolve, settleAll } from './helpers';

const cast = (g: GameState, id: string, targets: ({ c: number } | { p: 0 | 1 })[] = [], extra = {}) => {
  const c = inHand(g, 0, id);
  expect(performAction(g, 0, { type: 'cast', card: c.id, targets, ...extra })).toBeNull();
  return c;
};
const names = (g: GameState, pid = 0) => g.battlefield.map((id) => g.cards[id]).filter((c) => c.controller === pid).map((c) => c.def.id);

describe('FRA 多色', () => {
  it('Karn, Gilded Guardian：{2/W} 可以用兩點任意法術力代替', () => {
    const g = mk();
    lands(g, 0, 'plains', 3);
    lands(g, 0, 'island', 3);
    lands(g, 0, 'swamp', 1);
    lands(g, 0, 'mountain', 1);
    lands(g, 0, 'forest', 1);
    const karn = inHand(g, 0, 'karn-gilded-guardian');
    expect(performAction(g, 0, { type: 'cast', card: karn.id, targets: [] })).toBeNull();
    resolve(g);
    expect(g.cards[karn.id].zone).toBe('battlefield');
    // 太少的地不能施放
    const g2 = mk();
    lands(g2, 0, 'plains', 5);
    const k2 = inHand(g2, 0, 'karn-gilded-guardian');
    expect(performAction(g2, 0, { type: 'cast', card: k2.id, targets: [] })).not.toBeNull();
  });

  it('Karn：進戰場時依其他神器的顏色數量抓牌', () => {
    const g = mk();
    put(g, 0, 'tok-heartwood');
    lands(g, 0, 'plains', 10);
    const before = g.players[0].hand.length;
    cast(g, 'karn-gilded-guardian');
    settleAll(g);
    expect(g.players[0].hand.length).toBe(before + 2);
  });

  it('Ferocity of the Hunt：被結附的生物死去後橫置回到戰場', () => {
    const g = mk();
    lands(g, 0, 'forest', 2);
    const bear = put(g, 0, 'graft-surgeon');
    cast(g, 'ferocity-of-the-hunt', [{ c: bear.id }]);
    resolve(g);
    expect(stats(g, bear).kw.has('deathtouch')).toBe(true);
    putIntoGraveyard(g, [bear]);
    settleAll(g);
    expect(g.cards[bear.id].zone).toBe('battlefield');
    expect(g.cards[bear.id].tapped).toBe(true);
  });

  it("Warrior's Blades：進場傷害與依指示物減少裝備費用", () => {
    const g = mk();
    lands(g, 0, 'mountain', 2);
    lands(g, 0, 'plains', 2);
    const hit = put(g, 1, 'graft-surgeon');
    cast(g, 'warriors-blades', [{ c: hit.id }]);
    resolve(g);
    settleAll(g);
    expect(g.cards[hit.id].zone).not.toBe('battlefield');
    expect(g.players[0].life).toBe(23);
    const blades = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'warriors-blades')!;
    const me = put(g, 0, 'graft-surgeon'); // 已有一個 +1/+1 指示物
    const idx = abilitiesFor(g, blades).findIndex((a) => a.isEquip);
    // 場上 4 塊地：裝備 {3} 減 1 = {2}，能付得起
    for (const id of g.battlefield) if (g.cards[id].def.types.includes('Land')) g.cards[id].tapped = false;
    expect(performAction(g, 0, { type: 'activate', card: blades.id, ability: idx, targets: [{ c: me.id }] })).toBeNull();
    settleAll(g);
    const tapped = g.battlefield.filter((id) => g.cards[id].def.types.includes('Land') && g.cards[id].tapped).length;
    expect(tapped).toBe(2);
    expect(blades.attachedTo).toBe(me.id);
  });

  it('Tenured Tethermage：橫置兩個神器放置兩個指示物', () => {
    const g = mk();
    const t = put(g, 0, 'tenured-tethermage');
    const a = put(g, 0, 'tok-heartwood');
    const b = put(g, 0, 'tok-heartwood');
    const idx = abilitiesFor(g, t).findIndex((x) => x.cost.tapN);
    expect(performAction(g, 0, { type: 'activate', card: t.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g);
    expect(a.tapped && b.tapped).toBe(true);
    expect(stats(g, t).p).toBe(3);
    expect(performAction(g, 0, { type: 'activate', card: t.id, ability: idx, targets: [] })).not.toBeNull();
  });

  it('Grim Repriser：只有對手本回合受到非戰鬥傷害時才能帶終結指示物回來', () => {
    const g = mk();
    lands(g, 0, 'swamp', 1);
    lands(g, 0, 'mountain', 1);
    const gr = inGy(g, 0, 'grim-repriser');
    const idx = abilitiesFor(g, gr).findIndex((a) => a.kind === 'activated');
    expect(performAction(g, 0, { type: 'activate', card: gr.id, ability: idx, targets: [] })).not.toBeNull();
    g.players[1].noncombatThisTurn = true;
    expect(performAction(g, 0, { type: 'activate', card: gr.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g);
    expect(g.cards[gr.id].zone).toBe('battlefield');
    expect(g.cards[gr.id].finality).toBe(true);
  });

  it('Ingris Stingerquill：每個攻擊的生物對對手造成 1 點傷害', () => {
    const g = mk();
    put(g, 0, 'ingris-stingerquill');
    const a = put(g, 0, 'graft-surgeon');
    a.attacking = true;
    emit(g, { type: 'attacks', card: a.id });
    settleAll(g);
    expect(g.players[1].life).toBe(19);
  });

  it('Kwia Vigorbloom：獲得生命派出蓮花，蓮花加三點同色法術力', () => {
    const g = mk();
    put(g, 0, 'kwia-vigorbloom');
    gainLife(g, 0, 2);
    settleAll(g);
    const lotus = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-lotus');
    expect(lotus).toBeTruthy();
    const idx = abilitiesFor(g, lotus!).findIndex((a) => a.kind === 'activated');
    expect(performAction(g, 0, { type: 'activate', card: lotus!.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g, (d) => (d.type === 'choose' ? { type: 'choose', ids: [d.options[0]] } : undefined));
    expect((g.players[0].pool ?? []).length).toBe(3);
  });

  it('Hapatra：依墳墓場中最大法術力值放置 -1/-1 指示物', () => {
    const g = mk();
    lands(g, 0, 'swamp', 4);
    lands(g, 0, 'forest', 1);
    inGy(g, 0, 'ghalta-the-unstoppable');
    const foe = put(g, 1, 'ghalta-the-unstoppable');
    const base = stats(g, foe).p;
    cast(g, 'hapatra-the-desert-fang', []);
    settleAll(g);
    expect(base).toBeGreaterThan(0);
    expect(g.cards[foe.id].zone).toBe('graveyard');
  });

  it('Twinned Vision：返照時抓兩張牌（需棄一張牌）', () => {
    const g = mk();
    lands(g, 0, 'island', 3);
    g.players[0].library.push(...g.players[0].library.slice(0, 3));
    const tv = inGy(g, 0, 'twinned-vision');
    inHand(g, 0, 'plains');
    const before = g.players[0].hand.length;
    expect(performAction(g, 0, { type: 'cast', card: tv.id, targets: [], alt: 'flashback' })).toBeNull();
    resolve(g);
    expect(g.players[0].hand.length).toBe(before - 1 + 2);
    expect(g.cards[tv.id].zone).toBe('exile');
  });

  it('Vindictive Triumph：法術力值3以下的生物被橫置偷走', () => {
    const g = mk();
    lands(g, 0, 'plains', 1);
    lands(g, 0, 'swamp', 2);
    const foe = put(g, 1, 'graft-surgeon');
    cast(g, 'vindictive-triumph', [{ c: foe.id }]);
    resolve(g);
    expect(g.cards[foe.id].zone).toBe('battlefield');
    expect(g.cards[foe.id].controller).toBe(0);
    expect(g.cards[foe.id].tapped).toBe(true);
  });

  it('Craftwork Crusher：選擇兩項', () => {
    const g = mk();
    lands(g, 0, 'mountain', 5);
    lands(g, 0, 'forest', 2);
    const foe = put(g, 1, 'graft-surgeon');
    const hand = g.players[0].hand.length;
    cast(g, 'craftwork-crusher');
    resolve(g);
    settleAll(g, (d) => (d.type === 'mode' ? { type: 'modes', picks: [0, 2] } : undefined));
    expect(g.cards[foe.id].zone).not.toBe('battlefield');
    expect(g.players[0].hand.length).toBe(hand + 1);
  });

  it('Mabel：在本回合進戰場的生物上放置指示物', () => {
    const g = mk();
    put(g, 0, 'mabel-valley-hero');
    lands(g, 0, 'plains', 3);
    const c = cast(g, 'graft-surgeon');
    resolve(g);
    settleAll(g, (d) => (d.type === 'targets' ? { type: 'targets', targets: [{ c: c.id }] } : undefined));
    expect(stats(g, g.cards[c.id]).p).toBe(4);
  });

  it('Primal Witchstalker：碾磨後把墳墓場的地放回戰場', () => {
    const g = mk();
    lands(g, 0, 'forest', 1);
    lands(g, 0, 'swamp', 2);
    inGy(g, 0, 'forest');
    cast(g, 'primal-witchstalker');
    resolve(g);
    settleAll(g);
    expect(names(g).filter((n) => n === 'forest').length).toBeGreaterThanOrEqual(2);
  });

  it('Solitary Cell：放逐法術力值3以下的對手永久物並可棄傳奇牌抓牌', () => {
    const g = mk();
    lands(g, 0, 'mountain', 1);
    lands(g, 0, 'plains', 1);
    const foe = put(g, 1, 'graft-surgeon');
    cast(g, 'solitary-cell');
    resolve(g);
    settleAll(g);
    expect(g.cards[foe.id].zone).toBe('exile');
    const cell = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'solitary-cell')!;
    putIntoGraveyard(g, [cell]);
    expect(g.cards[foe.id].zone).toBe('battlefield');
  });

  it('{2/W} 費用解析與支付', () => {
    const c = parseCost('{2/W}{2/U}');
    expect(c.twoHyb?.length).toBe(2);
    const g = mk();
    lands(g, 0, 'plains', 1);
    lands(g, 0, 'island', 1);
    expect(findPayment(parseCost('{2/W}{2/U}'), manaSources(g, 0))).toBeTruthy();
    expect(findPayment(parseCost('{2/W}{2/U}{2/B}'), manaSources(g, 0))).toBeNull();
  });
});

describe('FRA 無色與地', () => {
  it('Karn, Argent Defender：神器與生物進戰場不觸發異能', () => {
    const g = mk();
    put(g, 0, 'karn-argent-defender');
    put(g, 0, 'ingris-stingerquill');
    lands(g, 0, 'plains', 3);
    // 直接放進戰場，ETB 不應觸發
    const arb = put(g, 0, 'archive-arbiter');
    emit(g, { type: 'etb', card: arb.id, controller: 0 });
    expect(g.pending.length).toBe(0);
  });

  it('Traxos：不會在重置步驟重置，施放神器或生物時重置', () => {
    const g = mk();
    lands(g, 0, 'plains', 3);
    const t = put(g, 0, 'traxos-scourge-eternal');
    expect(stats(g, t).kw.has('trample')).toBe(true);
    t.tapped = true;
    cast(g, 'graft-surgeon');
    settleAll(g);
    expect(t.tapped).toBe(false);
  });

  it('Emrakul：施放時重置所有地；從手上放逐可讓地產生兩點無色法術力，之後可從放逐區施放', () => {
    const g = mk();
    lands(g, 0, 'plains', 4);
    const land = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'plains')!;
    const em = inHand(g, 0, 'emrakul-the-exigent-doom');
    const idx = abilitiesFor(g, em).findIndex((a) => a.fromHand);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(performAction(g, 0, { type: 'activate', card: em.id, ability: idx, targets: [{ c: land.id }] })).toBeNull();
    settleAll(g);
    expect(g.cards[em.id].zone).toBe('exile');
    expect(land.bonusMana).toBe(em.id);
    expect(manaSources(g, 0).length).toBeGreaterThan(0);
    expect(g.cards[em.id].linkedCast).toBeTruthy();
  });

  it('Emrakul：被對手指定為目標時要犧牲三個永久物', () => {
    const g = mk();
    const em = put(g, 1, 'emrakul-the-exigent-doom');
    expect(em.def.wardSac).toBe(3);
  });

  it('Roiling Canopy：有五個其他森林時，森林進戰場可讓生物+3/+3', () => {
    const g = mk();
    put(g, 0, 'roiling-canopy');
    lands(g, 0, 'forest', 5);
    const me = put(g, 0, 'graft-surgeon');
    const f = put(g, 0, 'forest');
    emit(g, { type: 'etb', card: f.id, controller: 0 });
    settleAll(g);
    expect(stats(g, me).p).toBe(6);
  });

  it('Eye of Jace：墳墓場滿七張時犧牲並造成傷害', () => {
    const g = mk();
    put(g, 0, 'eye-of-jace');
    for (let i = 0; i < 7; i++) inGy(g, 0, 'plains');
    emit(g, { type: 'step', step: 'upkeep', player: 0 });
    settleAll(g);
    expect(g.players[1].life).toBe(18);
    expect(g.players[0].life).toBe(22);
  });

  it('The Echoverse Fulcrum：消滅所有生物', () => {
    const g = mk();
    lands(g, 0, 'plains', 5);
    const f = put(g, 0, 'the-echoverse-fulcrum');
    const a = put(g, 0, 'graft-surgeon');
    const b = put(g, 1, 'graft-surgeon');
    const idx = abilitiesFor(g, f).findIndex((x) => x.cost.exileSelf);
    expect(performAction(g, 0, { type: 'activate', card: f.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g);
    expect(g.cards[a.id].zone).toBe('graveyard');
    expect(g.cards[b.id].zone).toBe('graveyard');
    expect(g.cards[f.id].zone).toBe('exile');
  });

  it('Hexhaven Dueling Arena / Codie：讓生物成為已準備', () => {
    const g = mk();
    lands(g, 0, 'plains', 4);
    const arena = put(g, 0, 'hexhaven-dueling-arena');
    const c = put(g, 0, 'emergency-phytomedic');
    c.prepared = false;
    const idx = abilitiesFor(g, arena).findIndex((x) => x.cost.mana === '{4}');
    expect(performAction(g, 0, { type: 'activate', card: arena.id, ability: idx, targets: [{ c: c.id }] })).toBeNull();
    settleAll(g);
    expect(c.prepared).toBe(true);
  });
});
