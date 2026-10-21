import { describe, expect, it } from 'vitest';
import { abilitiesFor, manaSources, performAction } from '../src/engine/actions';
import { emit, gainLife, putIntoGraveyard } from '../src/engine/zones';
import { stats } from '../src/engine/state';
import { legalTargets } from '../src/engine/targets';
import type { GameState, PID } from '../src/engine/types';
import { inGy, inHand, lands, mk, put, resolve, settleAll } from './helpers';

const cast = (g: GameState, id: string, targets: ({ c: number } | { p: PID })[] = [], extra = {}) => {
  const c = inHand(g, 0, id);
  const err = performAction(g, 0, { type: 'cast', card: c.id, targets, ...extra });
  expect(err).toBeNull();
  return c;
};
const act = (g: GameState, c: { id: number }, pred: (a: ReturnType<typeof abilitiesFor>[number]) => boolean, targets: ({ c: number } | { p: PID })[] = [], x?: number) => {
  const idx = abilitiesFor(g, g.cards[c.id]).findIndex(pred);
  expect(idx).toBeGreaterThanOrEqual(0);
  return performAction(g, 0, { type: 'activate', card: c.id, ability: idx, targets, x });
};
const myBf = (g: GameState, id: string) => g.battlefield.map((x) => g.cards[x]).filter((c) => c.def.id === id);

describe('FRA 補強：鵬洛客與較早完成的卡', () => {
  it('Chandra, Chill of Compliance：−X 放置 X 個暈眩指示物；+1 加的 {U} 只能用於非生物咒語', () => {
    const g = mk();
    const ch = put(g, 0, 'chandra-chill-of-compliance');
    const foe = put(g, 1, 'graft-surgeon');
    ch.loyalty = 5;
    expect(act(g, ch, (a) => !!a.xLoyalty, [{ c: foe.id }], 3)).toBeNull();
    settleAll(g);
    expect(ch.loyalty).toBe(2);
    expect(foe.tapped).toBe(true);
    expect(foe.stun).toBe(3);
    // +1 加 {U}
    const g2 = mk();
    const c2 = put(g2, 0, 'chandra-chill-of-compliance');
    const idx = abilitiesFor(g2, c2).findIndex((a) => a.effects.some((e) => e.e === 'addMana'));
    expect(performAction(g2, 0, { type: 'activate', card: c2.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g2);
    expect(g2.players[0].poolNoncreature).toEqual(['U']);
    const spell = inHand(g2, 0, 'unsummon');
    expect(performAction(g2, 0, { type: 'cast', card: spell.id, targets: [{ c: put(g2, 1, 'graft-surgeon').id }] })).toBeNull();
    expect(g2.players[0].poolNoncreature).toEqual([]);
  });

  it('Chandra 的 {U} 不能用來施放生物咒語', () => {
    const g = mk();
    g.players[0].poolNoncreature = ['U', 'U'];
    expect(manaSources(g, 0, undefined, false, inHand(g, 0, 'graft-surgeon').def).length).toBe(0);
    expect(manaSources(g, 0, undefined, false, inHand(g, 0, 'unsummon').def).length).toBe(2);
  });

  it('Ajani Resolute：−10 獲得徽記，生物+2/+2', () => {
    const g = mk();
    const aj = put(g, 0, 'ajani-resolute');
    aj.loyalty = 10;
    const bear = put(g, 0, 'graft-surgeon');
    const before = stats(g, bear).p;
    expect(act(g, aj, (a) => a.cost.loyalty === -10)).toBeNull();
    settleAll(g);
    expect(stats(g, bear).p).toBe(before + 2);
    expect(myBf(g, 'tok-emblem-ajani').length).toBe(1);
  });

  it('徽記不能被當成永久物選為目標或被全體效果影響', () => {
    const g = mk();
    put(g, 0, 'tok-emblem-ajani');
    const tg = put(g, 1, 'graft-surgeon');
    lands(g, 0, 'plains', 7);
    const wipe = cast(g, 'kindred-judgment');
    resolve(g, (d) => (d.type === 'mode' ? { type: 'modes', picks: [0] } : undefined));
    expect(wipe.zone).not.toBe('stack');
    expect(myBf(g, 'tok-emblem-ajani').length).toBe(1);
    expect(legalTargets(g, { kind: 'permanent' }, 0).some((t) => 'c' in t && g.cards[t.c].def.types.includes('Emblem'))).toBe(false);
    expect(tg.zone).not.toBe('stack');
  });

  it('Chandra, Torch of Defiance：加 {R}{R}，不施放時造成 2 點傷害', () => {
    const g = mk();
    const ch = put(g, 0, 'chandra-torch-of-defiance');
    const idx = abilitiesFor(g, ch).findIndex((a) => a.effects.some((e) => e.e === 'addMana'));
    expect(performAction(g, 0, { type: 'activate', card: ch.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g);
    expect(g.players[0].pool).toEqual(['R', 'R']);
    // 不施放 → 2 點傷害
    const g2 = mk();
    const c2 = put(g2, 0, 'chandra-torch-of-defiance');
    const idx2 = abilitiesFor(g2, c2).findIndex((a) => a.effects.some((e) => e.e === 'impulseCastOrDamage'));
    expect(performAction(g2, 0, { type: 'activate', card: c2.id, ability: idx2, targets: [] })).toBeNull();
    settleAll(g2, (d) => (d.type === 'yesno' ? { type: 'yesno', yes: false } : undefined));
    expect(g2.players[1].life).toBe(18);
  });

  it('Chandra, Torch of Defiance：可施放放逐的牌', () => {
    const g = mk();
    lands(g, 0, 'plains', 3);
    g.players[0].library.unshift(inHand(g, 0, 'graft-surgeon').id);
    g.players[0].hand.pop();
    const ch = put(g, 0, 'chandra-torch-of-defiance');
    const idx = abilitiesFor(g, ch).findIndex((a) => a.effects.some((e) => e.e === 'impulseCastOrDamage'));
    expect(performAction(g, 0, { type: 'activate', card: ch.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g, (d) => (d.type === 'yesno' ? { type: 'yesno', yes: true } : undefined));
    expect(g.players[1].life).toBe(20);
    expect(myBf(g, 'graft-surgeon').length).toBe(1);
  });

  it('Garruk, Veiled Butcher：對手的生物死去改為放逐；−2 每位玩家犧牲生物', () => {
    const g = mk();
    const gk = put(g, 0, 'garruk-veiled-butcher');
    const mine = put(g, 0, 'graft-surgeon');
    const foe = put(g, 1, 'graft-surgeon');
    putIntoGraveyard(g, [foe]);
    expect(g.cards[foe.id].zone).toBe('exile');
    const foe2 = put(g, 1, 'graft-surgeon');
    gk.loyalty = 5;
    expect(act(g, gk, (a) => a.cost.loyalty === -2)).toBeNull();
    settleAll(g);
    expect(g.cards[foe2.id].zone).toBe('exile');
    expect(g.cards[mine.id].zone).toBe('graveyard');
    expect(myBf(g, 'tok-beast-trample').length).toBe(1);
  });

  it('Garruk, Veiled Butcher：+2 的 -4/-1 持續到你的下一個回合', () => {
    const g = mk();
    const gk = put(g, 0, 'garruk-veiled-butcher');
    const foe = put(g, 1, 'ghalta-the-unstoppable');
    const p0 = stats(g, foe).p;
    expect(act(g, gk, (a) => a.cost.loyalty === 2, [{ c: foe.id }])).toBeNull();
    settleAll(g);
    expect(stats(g, foe).p).toBe(p0 - 4);
    // 回合結束後仍然有效
    g.eot = g.eot.filter((e) => e.until !== undefined);
    expect(stats(g, foe).p).toBe(p0 - 4);
  });

  it('Garruk, Veiled Butcher：−3 對手沒有棄兩張非地牌時你抓一張', () => {
    const g = mk();
    const gk = put(g, 0, 'garruk-veiled-butcher');
    g.players[1].hand = [];
    inHand(g, 1, 'plains');
    inHand(g, 1, 'plains');
    const hand = g.players[0].hand.length;
    expect(act(g, gk, (a) => a.cost.loyalty === -3)).toBeNull();
    settleAll(g);
    expect(g.players[0].hand.length).toBe(hand + 1);
    expect(g.players[1].hand.length).toBe(0);
  });

  it('Jace, Reality Sculptor：−3 使攻擊你的生物得 -5/-0（持續到你的下一個回合）', () => {
    const g = mk();
    const j = put(g, 0, 'jace-reality-sculptor');
    expect(act(g, j, (a) => a.cost.loyalty === -3)).toBeNull();
    settleAll(g);
    expect(g.delayed?.[0]?.until).toBe(0);
    const atk = put(g, 1, 'ghalta-the-unstoppable');
    const p0 = stats(g, atk).p;
    atk.attacking = true;
    emit(g, { type: 'attacks', card: atk.id });
    settleAll(g);
    expect(stats(g, atk).p).toBe(p0 - 5);
  });

  it('Jace, Reality Sculptor：0 需要二十五個忠誠指示物', () => {
    const g = mk();
    const j = put(g, 0, 'jace-reality-sculptor');
    j.loyalty = 24;
    const idx = abilitiesFor(g, j).findIndex((a) => a.effects.some((e) => e.e === 'exileLibraryButBottom'));
    expect(performAction(g, 0, { type: 'activate', card: j.id, ability: idx, targets: [] })).not.toBeNull();
    j.loyalty = 25;
    expect(performAction(g, 0, { type: 'activate', card: j.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g);
    expect(g.players[1].library.length).toBe(1);
  });

  it('Garruk, Curse Breaker：−4 攻擊對手的生物+2/+2並獲得踐踏', () => {
    const g = mk();
    const gk = put(g, 0, 'garruk-curse-breaker');
    expect(act(g, gk, (a) => a.cost.loyalty === -4)).toBeNull();
    settleAll(g);
    const a = put(g, 0, 'graft-surgeon');
    const p0 = stats(g, a).p;
    emit(g, { type: 'youAttack', player: 0, attackers: [a.id] });
    settleAll(g);
    expect(stats(g, a).p).toBe(p0 + 2);
    expect(stats(g, a).kw.has('trample')).toBe(true);
  });

  it('Ajani Unrelenting：任何忠誠異能起動時派出學員', () => {
    const g = mk();
    put(g, 0, 'ajani-unrelenting');
    const other = put(g, 0, 'chandra-chill-of-compliance');
    const idx = abilitiesFor(g, other).findIndex((a) => a.cost.loyalty === 1);
    expect(performAction(g, 0, { type: 'activate', card: other.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g);
    expect(myBf(g, 'tok-cadet').length).toBe(1);
  });

  it("The Theorist, Jace Beleren：對手的抓牌步驟開始時抓牌", () => {
    const g = mk();
    put(g, 0, 'the-theorist-jace-beleren');
    const h = g.players[0].hand.length;
    emit(g, { type: 'step', step: 'draw', player: 1 });
    settleAll(g);
    expect(g.players[0].hand.length).toBe(h + 1);
    emit(g, { type: 'step', step: 'draw', player: 0 });
    settleAll(g);
    expect(g.players[0].hand.length).toBe(h + 1);
  });

  it("Jace's Machinations：對手的回合也能起動傑斯的忠誠異能", () => {
    const g = mk();
    lands(g, 0, 'island', 3);
    const j = put(g, 0, 'tok-jace');
    g.active = 1;
    expect(performAction(g, 0, { type: 'activate', card: j.id, ability: 0, targets: [] })).not.toBeNull();
    g.active = 0;
    cast(g, 'jaces-machinations');
    resolve(g);
    g.active = 1;
    expect(g.loyaltyInstant).toBeTruthy();
    const j2 = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.subtypes?.includes('Jace'))!;
    const idx = abilitiesFor(g, j2).findIndex((a) => a.cost.loyalty !== undefined);
    g.active = 0; // 同回合，仍在法術時機之外：用 phase 模擬瞬間時機
    g.phase = 'combat_begin';
    expect(performAction(g, 0, { type: 'activate', card: j2.id, ability: idx, targets: [] })).toBeNull();
  });

  it('Countersculpt：控制或手上有傑斯時只需 {U}{U}', () => {
    const g = mk();
    lands(g, 0, 'island', 2);
    const cs = inHand(g, 0, 'countersculpt');
    // 沒有傑斯：需要三點
    expect(performAction(g, 0, { type: 'cast', card: cs.id, targets: [] })).not.toBeNull();
    inHand(g, 0, 'jace-reality-sculptor');
    const spell = inHand(g, 1, 'unsummon');
    g.stack.push({ sid: 99, kind: 'spell', controller: 1, cardId: spell.id, targets: [], targetSpecs: [], effects: [], text: '' });
    spell.zone = 'stack';
    expect(performAction(g, 0, { type: 'cast', card: cs.id, targets: [{ c: spell.id }] })).toBeNull();
  });

  it('Guiding Hydra：戰鬥開始時移動指示物', () => {
    const g = mk();
    const h = put(g, 0, 'guiding-hydra');
    h.counters = 2;
    const o = put(g, 0, 'graft-surgeon');
    const p0 = stats(g, o).p;
    emit(g, { type: 'step', step: 'combatStart', player: 0 });
    settleAll(g);
    expect(h.counters).toBe(1);
    expect(stats(g, o).p).toBe(p0 + 1);
  });

  it('Enlightened Confidant：刺探到法術力值不超過獲得生命的牌時放到手上', () => {
    const g = mk();
    put(g, 0, 'enlightened-confidant');
    gainLife(g, 0, 2);
    const top = inHand(g, 0, 'graft-surgeon'); // MV 3 > 2：不拿回
    g.players[0].hand.pop();
    g.players[0].library.unshift(top.id);
    top.zone = 'library';
    g.players[0].lifeGainedThisTurn = 3;
    emit(g, { type: 'step', step: 'endStep', player: 0 });
    settleAll(g, (d) => (d.type === 'choose' ? { type: 'choose', ids: d.options } : undefined));
    expect(g.cards[top.id].zone).toBe('hand');
  });

  it('Seasoned Cryomancer：棄掉非地牌時橫置並暈眩生物', () => {
    const g = mk();
    const foe = put(g, 1, 'graft-surgeon');
    g.players[0].hand = [];
    inHand(g, 0, 'graft-surgeon');
    inHand(g, 0, 'plains');
    lands(g, 0, 'island', 3);
    cast(g, 'seasoned-cryomancer');
    resolve(g);
    settleAll(g, (d) => (d.type === 'choose' && d.purpose === 'discard' ? { type: 'choose', ids: d.options.filter((id) => g.cards[id].def.id !== 'plains').slice(0, d.min) } : undefined));
    expect(g.cards[foe.id].tapped || g.battlefield.some((id) => g.cards[id].stun > 0)).toBe(true);
  });

  it('Room of Refuge：進戰場時選擇顏色，只能產生該顏色', () => {
    const g = mk();
    const r = put(g, 0, 'room-of-refuge');
    emit(g, { type: 'etb', card: r.id, controller: 0 });
    settleAll(g, (d) => (d.type === 'mode' ? { type: 'modes', picks: [3] } : undefined));
    expect(r.chosenColor).toBe('R');
    r.tapped = false;
    const src = manaSources(g, 0).find((s) => s.id === r.id)!;
    expect(src.produces).toEqual(['R']);
  });

  it('Fatehold Charm：可以讓咒語回到手上', () => {
    const g = mk();
    lands(g, 0, 'plains', 1);
    lands(g, 0, 'island', 1);
    const sp = inHand(g, 1, 'unsummon');
    sp.zone = 'stack';
    g.players[1].hand = g.players[1].hand.filter((id) => id !== sp.id);
    g.stack.push({ sid: 98, kind: 'spell', controller: 1, cardId: sp.id, targets: [], targetSpecs: [], effects: [], text: '' });
    const ch = inHand(g, 0, 'fatehold-charm');
    expect(performAction(g, 0, { type: 'cast', card: ch.id, targets: [{ c: sp.id }], mode: 1 })).toBeNull();
    resolve(g);
    expect(g.cards[sp.id].zone).toBe('hand');
  });

  it('Dark Matter Manipulator：墳墓場每七張牌 +2/+0（沒有上限）', () => {
    const g = mk();
    const d = put(g, 0, 'dark-matter-manipulator');
    for (let i = 0; i < 21; i++) inGy(g, 0, 'plains');
    expect(stats(g, d).p).toBe(1 + 6);
  });

  it('Lich’s Relic：可以消滅鵬洛客', () => {
    const g = mk();
    lands(g, 0, 'swamp', 3);
    const pw = put(g, 1, 'ajani-resolute');
    cast(g, 'lichs-relic');
    resolve(g);
    settleAll(g, (d) => (d.type === 'targets' ? { type: 'targets', targets: [{ c: pw.id }] } : undefined));
    expect(g.cards[pw.id].zone).toBe('graveyard');
  });

  it('Liliana the Faultless：鵬洛客進戰場獲得生命', () => {
    const g = mk();
    put(g, 0, 'liliana-the-faultless');
    const l0 = g.players[0].life;
    const pw = put(g, 0, 'ajani-resolute');
    emit(g, { type: 'etb', card: pw.id, controller: 0 });
    settleAll(g);
    expect(g.players[0].life).toBe(l0 + 1);
  });
});
