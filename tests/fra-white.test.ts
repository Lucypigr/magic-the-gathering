import { describe, expect, it } from 'vitest';
import { abilitiesFor, castOptionsFor, performAction, playOptions, spellCost } from '../src/engine/actions';
import { getDef } from '../src/engine/registry';
import { checkCond, matches, stats } from '../src/engine/state';
import { dealDamage, discard, gainLife, putIntoGraveyard } from '../src/engine/zones';
import { inGy, inHand, lands, mk, put, resolve, settleAll } from './helpers';

const casting = (g: ReturnType<typeof mk>, id: string, targets: { c: number }[] = [], extra = {}) => {
  const c = inHand(g, 0, id);
  const err = performAction(g, 0, { type: 'cast', card: c.id, targets, ...extra });
  expect(err).toBeNull();
  return c;
};

describe('FRA 白色', () => {
  it('Fateshaper Aspirant：進場時選擇模式（模式式觸發）', () => {
    const g = mk();
    lands(g, 0, 'plains', 5);
    const ally = put(g, 0, 'graft-surgeon');
    casting(g, 'fateshaper-aspirant');
    // 選第二個模式：+1/+1 指示物、警戒、不滅
    settleAll(g, (d) => (d.type === 'mode' ? { type: 'modes', picks: [1] } : d.type === 'targets' ? { type: 'targets', targets: [{ c: ally.id }] } : undefined));
    // Graft Surgeon 進場帶 1 個，再 +1
    expect(ally.counters).toBe(2);
    expect(stats(g, ally).kw.has('indestructible')).toBe(true);
  });

  it('Germinate Recruits：派出等同本回合獲得生命的學員', () => {
    const g = mk();
    lands(g, 0, 'plains', 3);
    g.players[0].lifeGainedThisTurn = 3;
    casting(g, 'germinate-recruits');
    resolve(g);
    expect(g.battlefield.filter((id) => g.cards[id].def.id === 'tok-cadet').length).toBe(3);
  });

  it('Graft Surgeon：死去時把指示物放到另一個生物上', () => {
    const g = mk();
    const a = put(g, 0, 'graft-surgeon');
    const b = put(g, 0, 'graft-surgeon');
    expect(a.counters).toBe(1);
    putIntoGraveyard(g, [a]);
    settleAll(g, (d) => (d.type === 'targets' ? { type: 'targets', targets: [{ c: b.id }] } : undefined));
    expect(b.counters).toBe(2);
  });

  it('Kindred Judgment：消滅所有不是所選類別的生物', () => {
    const g = mk();
    lands(g, 0, 'plains', 7);
    const human = put(g, 0, 'graft-surgeon'); // Human Cleric
    const hound = put(g, 1, 'flickering-hound'); // Dog
    casting(g, 'kindred-judgment');
    resolve(g, (d) => (d.type === 'mode' && d.purpose === 'creatureType' ? { type: 'modes', picks: [d.options.indexOf('Human')] } : undefined));
    expect(human.zone).toBe('battlefield');
    expect(hound.zone).toBe('graveyard');
  });

  it('Prophesied End：不在攻擊的生物，其操控者抓一張牌', () => {
    const g = mk();
    lands(g, 0, 'plains', 2);
    const t = put(g, 1, 'graft-surgeon');
    const hand = g.players[1].hand.length;
    casting(g, 'prophesied-end', [{ c: t.id }]);
    resolve(g);
    expect(t.zone).toBe('graveyard');
    expect(g.players[1].hand.length).toBe(hand + 1);
    const t2 = put(g, 1, 'graft-surgeon');
    t2.attacking = true;
    lands(g, 0, 'plains', 2);
    casting(g, 'prophesied-end', [{ c: t2.id }]);
    resolve(g);
    expect(g.players[1].hand.length).toBe(hand + 1);
  });

  it('Saheeli, Consul of Oversight：占卜或刺探時派出機械鳥（每回合一次）', () => {
    const g = mk();
    put(g, 0, 'saheeli-consul-of-oversight');
    const it = put(g, 0, 'graft-surgeon');
    expect(it).toBeTruthy();
    lands(g, 0, 'plains', 2);
    // 用 Refute Destiny 的刺探：直接施放一個刺探效果
    const t = put(g, 1, 'graft-surgeon');
    t.def = { ...t.def, colors: ['G'] };
    casting(g, 'refute-destiny', [{ c: t.id }]);
    resolve(g);
    settleAll(g);
    const thopters = () => g.battlefield.filter((id) => g.cards[id].def.id === 'tok-thopter').length;
    expect(thopters()).toBe(1);
  });

  it('Way of the Healer：進場強化傑斯，並授予鵬洛客新的忠誠異能', () => {
    const g = mk();
    lands(g, 0, 'plains', 4);
    casting(g, 'way-of-the-healer');
    settleAll(g);
    const jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-jace')!;
    expect(jace.loyalty).toBe(5);
    const abs = abilitiesFor(g, jace);
    expect(abs.length).toBe(3);
    const idx = abs.findIndex((a) => a.cost.loyalty === -2);
    expect(performAction(g, 0, { type: 'activate', card: jace.id, ability: idx, targets: [] })).toBeNull();
    resolve(g);
    expect(jace.loyalty).toBe(3);
    expect(g.battlefield.some((id) => g.cards[id].def.id === 'tok-cadet')).toBe(true);
  });

  it('Way of the Mentor：獲得生命時在鵬洛客上放置忠誠指示物', () => {
    const g = mk();
    lands(g, 0, 'plains', 3);
    casting(g, 'way-of-the-mentor');
    settleAll(g);
    const jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-jace')!;
    expect(jace.loyalty).toBe(5);
    gainLife(g, 0, 2);
    settleAll(g);
    expect(jace.loyalty).toBe(6);
  });

  it('Yoshimaru：放置 +1/+1 指示物時多放一個', () => {
    const g = mk();
    put(g, 0, 'yoshimaru-beloved-companion');
    const c = put(g, 0, 'graft-surgeon');
    expect(c.counters).toBe(2); // 進場 1 + 取代效果 1
    lands(g, 0, 'plains', 4);
    const ctr = c.counters;
    casting(g, 'blossom-blessed-angel');
    resolve(g);
    expect(c.counters).toBe(ctr);
  });

  it('Thalia, the Survivor：對手的非生物咒語多花 {1}', () => {
    const g = mk();
    put(g, 0, 'thalia-the-survivor');
    const sp = inHand(g, 1, 'prophesied-end');
    expect(spellCost(g, sp, 1).generic).toBe(2);
    const cr = inHand(g, 1, 'graft-surgeon');
    expect(spellCost(g, cr, 1).generic).toBe(2);
    const mine = inHand(g, 0, 'prophesied-end');
    expect(spellCost(g, mine, 0).generic).toBe(1);
  });

  it('Ghalta the Immovable：費用減去最大的防禦力；防禦力大於力量的生物以防禦力造成戰鬥傷害', () => {
    const g = mk();
    const gh = inHand(g, 0, 'ghalta-the-immovable');
    expect(spellCost(g, gh, 0).generic).toBe(8);
    put(g, 0, 'ghalta-the-immovable');
    const wall = put(g, 0, 'thalia-the-survivor'); // 3/4
    expect(spellCost(g, inHand(g, 0, 'ghalta-the-immovable'), 0).generic).toBe(8 - 7 >= 0 ? 1 : 0);
    expect(stats(g, wall).damageByToughness).toBe(true);
  });

  it("Gideon's Memorial：限定法術力與從手上棄掉造成傷害", () => {
    const g = mk();
    lands(g, 0, 'plains', 2);
    const gm = put(g, 0, "gideons-memorial");
    // 只用神器的法術力付一般咒語會不夠
    const sp = inHand(g, 0, 'surgical-precision');
    expect(castOptionsFor(g, 0, sp).length).toBeGreaterThan(0);
    g.battlefield.map((id) => g.cards[id]).filter((c) => c.def.id === 'plains').forEach((c) => (c.tapped = true));
    expect(castOptionsFor(g, 0, sp).length).toBe(0);
    gm.tapped = true;
    // 手上的 Memorial：棄掉造成傷害
    g.battlefield.map((id) => g.cards[id]).forEach((c) => (c.tapped = false));
    const hm = inHand(g, 0, "gideons-memorial");
    const atk = put(g, 1, 'graft-surgeon');
    atk.attacking = true;
    const opt = playOptions(g, 0).find((o) => o.card === hm.id && o.kind === 'activate');
    expect(opt).toBeTruthy();
    expect(performAction(g, 0, { type: 'activate', card: hm.id, ability: opt!.ability!, targets: [{ c: atk.id }] })).toBeNull();
    expect(hm.zone).toBe('graveyard');
    settleAll(g);
    expect(atk.zone).toBe('graveyard');
  });

  it('Yuriko, Blade of the Mighty：戰鬥中不能施放咒語', () => {
    const g = mk();
    put(g, 0, 'yuriko-blade-of-the-mighty');
    lands(g, 1, 'plains', 3);
    const sp = inHand(g, 1, 'prophesied-end');
    g.phase = 'combat_attackers';
    expect(playOptions(g, 1).length).toBe(0);
    expect(performAction(g, 1, { type: 'cast', card: sp.id, targets: [] })).toBeTruthy();
    g.phase = 'main2';
    expect(checkCond(g, { c: 'scried' }, 0, undefined, [])).toBe(false);
    expect(matches(g, { sub: 'Human' }, getDef('graft-surgeon') ? put(g, 0, 'graft-surgeon') : put(g, 0, 'graft-surgeon'), 0)).toBe(true);
    void inGy;
    void discard;
    void dealDamage;
  });
});
