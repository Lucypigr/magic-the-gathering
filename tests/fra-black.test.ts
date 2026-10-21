import { describe, expect, it } from 'vitest';
import { abilitiesFor, castOptionsFor, performAction, playOptions } from '../src/engine/actions';
import { combatDamage } from '../src/engine/combat';
import { stats } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { discardMany, dealDamage, putIntoGraveyard } from '../src/engine/zones';
import { inGy, inHand, lands, mk, put, resolve, settleAll } from './helpers';

const cast = (g: GameState, id: string, targets: ({ c: number } | { p: 0 | 1 })[] = [], extra = {}) => {
  const c = inHand(g, 0, id);
  const err = performAction(g, 0, { type: 'cast', card: c.id, targets, ...extra });
  expect(err).toBeNull();
  return c;
};

describe('FRA 黑色', () => {
  it('Darklight Phoenix：本回合有兩個生物死去，戰鬥開始時從墳墓場回到戰場', () => {
    const g = mk();
    const ph = inGy(g, 0, 'darklight-phoenix');
    const a = put(g, 1, 'graft-surgeon');
    const b = put(g, 1, 'graft-surgeon');
    putIntoGraveyard(g, [a, b]);
    g.pending = [];
    // 戰鬥開始
    import('../src/engine/zones').then(() => undefined);
    return import('../src/engine/zones').then(({ emit }) => {
      emit(g, { type: 'step', step: 'combatStart', player: 0 });
      settleAll(g);
      expect(ph.zone).toBe('battlefield');
    });
  });

  it('Break Under Pressure：犧牲法術力值最大的生物或鵬洛客', () => {
    const g = mk();
    lands(g, 0, 'swamp', 3);
    const small = put(g, 1, 'mabel-bitter-recluse'); // MV 1
    const big = put(g, 1, 'gideon-the-oathless'); // MV 3
    cast(g, 'break-under-pressure', [{ p: 1 }]);
    settleAll(g);
    expect(big.zone).toBe('graveyard');
    expect(small.zone).toBe('battlefield');
  });

  it('Overwrite the Multiverse：放逐所有生物並強化傑斯 X', () => {
    const g = mk();
    lands(g, 0, 'swamp', 6);
    put(g, 0, 'graft-surgeon');
    put(g, 1, 'graft-surgeon');
    put(g, 1, 'mabel-bitter-recluse');
    cast(g, 'overwrite-the-multiverse');
    settleAll(g);
    const jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-jace')!;
    expect(jace.loyalty).toBe(3);
    expect(g.battlefield.filter((id) => g.cards[id].def.types.includes('Creature')).length).toBe(0);
  });

  it('Rise of the Deathbringer：抓牌並失去等量生命', () => {
    const g = mk();
    lands(g, 0, 'swamp', 5);
    put(g, 0, 'proft-sinister-mastermind'); // 力量 5
    const hand = g.players[0].hand.length;
    const life = g.players[0].life;
    cast(g, 'rise-of-the-deathbringer', [], { mode: 0 });
    resolve(g);
    expect(g.players[0].hand.length).toBe(hand + 5);
    expect(g.players[0].life).toBe(life - 5);
  });

  it('Sanctum Lurker：鵬洛客忠誠為 0 不死，並可以用 +2 異能', () => {
    const g = mk();
    lands(g, 0, 'swamp', 3);
    cast(g, 'sanctum-lurker');
    settleAll(g);
    const jace = g.battlefield.map((id) => g.cards[id]).find((c) => c.def.id === 'tok-jace')!;
    expect(jace.loyalty).toBe(1);
    const abs = abilitiesFor(g, jace);
    const idx = abs.findIndex((a) => a.cost.loyalty === 2);
    expect(idx).toBeGreaterThan(-1);
    const life = g.players[0].life;
    expect(performAction(g, 0, { type: 'activate', card: jace.id, ability: idx, targets: [] })).toBeNull();
    settleAll(g);
    expect(jace.loyalty).toBe(3);
    expect(g.players[1].life).toBe(20 - 1);
    expect(g.players[0].life).toBe(life + 1);
    jace.loyalty = 0;
    settleAll(g);
    expect(jace.zone).toBe('battlefield');
  });

  it('Silence the Echo：可以犧牲生物，或支付 {3}', () => {
    const g = mk();
    lands(g, 0, 'swamp', 2);
    const t = put(g, 1, 'gideon-the-oathless');
    const c = inHand(g, 0, 'silence-the-echo');
    const opts = castOptionsFor(g, 0, c);
    // 只有 {1}{B} 時，只能選犧牲生物的模式（但沒有生物可犧牲）
    expect(opts.length).toBe(0);
    const mine = put(g, 0, 'mabel-bitter-recluse');
    const opts2 = castOptionsFor(g, 0, c);
    expect(opts2.length).toBe(1);
    expect(performAction(g, 0, { type: 'cast', card: c.id, targets: [{ c: t.id }], mode: 0, sac: mine.id })).toBeNull();
    settleAll(g);
    expect(mine.zone).toBe('graveyard');
    expect(t.zone).toBe('graveyard');
  });

  it('Loot, the Anomaly：負的力量以正值分配戰鬥傷害', () => {
    const g = mk();
    const loot = put(g, 0, 'loot-the-anomaly');
    expect(stats(g, loot).p).toBe(-2);
    loot.attacking = true;
    g.phase = 'combat_damage';
    const life = g.players[1].life;
    combatDamage(g, 'regular' as never);
    expect(g.players[1].life).toBe(life - 2);
  });

  it('Massacre Girl：對手被造成非戰鬥傷害時放置指示物；己方生物死去時造成傷害', () => {
    const g = mk();
    const mg = put(g, 0, 'massacre-girl-most-wanted');
    dealDamage(g, null, 0, { p: 1 }, 2);
    settleAll(g);
    expect(mg.counters).toBe(1);
    const a = put(g, 0, 'mabel-bitter-recluse');
    putIntoGraveyard(g, [a]);
    settleAll(g);
    expect(g.players[1].life).toBe(20 - 2 - 1);
    expect(mg.counters).toBe(2); // 這次的 1 點傷害也是非戰鬥傷害
  });

  it('Tinybones：同時棄多張牌只觸發一次', () => {
    const g = mk();
    put(g, 0, 'tinybones-pocket-nuisance');
    const cards = [inHand(g, 1, 'graft-surgeon'), inHand(g, 1, 'graft-surgeon'), inHand(g, 1, 'graft-surgeon')];
    discardMany(g, cards);
    settleAll(g);
    expect(g.players[1].life).toBe(19);
  });

  it('Proft, Sinister Mastermind：墳墓場不到七張牌時不能施放；從手上棄掉造成 -3/-1', () => {
    const g = mk();
    lands(g, 0, 'swamp', 4);
    const p = inHand(g, 0, 'proft-sinister-mastermind');
    expect(castOptionsFor(g, 0, p).length).toBe(0);
    for (let i = 0; i < 7; i++) inGy(g, 0, 'graft-surgeon');
    expect(castOptionsFor(g, 0, p).length).toBeGreaterThan(0);
    const t = put(g, 1, 'mabel-bitter-recluse');
    const opt = playOptions(g, 0).find((o) => o.card === p.id && o.kind === 'activate');
    expect(opt).toBeTruthy();
    expect(performAction(g, 0, { type: 'activate', card: p.id, ability: opt!.ability!, targets: [{ c: t.id }] })).toBeNull();
    settleAll(g);
    expect(t.zone).toBe('graveyard');
  });

  it('Gideon the Oathless：守護—棄掉一張牌', () => {
    const g = mk();
    const gid = put(g, 0, 'gideon-the-oathless');
    lands(g, 1, 'swamp', 2);
    const sp = inHand(g, 1, 'multiply-by-zero');
    inHand(g, 1, 'graft-surgeon');
    const hand = g.players[1].hand.length;
    expect(performAction(g, 1, { type: 'cast', card: sp.id, targets: [{ c: gid.id }] })).toBeNull();
    // 打出咒語少一張，守護再棄一張
    expect(g.players[1].hand.length).toBe(hand - 2);
  });

  it('Gallia, Tragic Host：從墳墓場放逐另一張生物牌，橫置放回戰場', () => {
    const g = mk();
    lands(g, 0, 'swamp', 5);
    const gallia = inGy(g, 0, 'gallia-tragic-host');
    const abs = abilitiesFor(g, gallia);
    expect(playOptions(g, 0).some((o) => o.card === gallia.id)).toBe(false);
    const other = inGy(g, 0, 'graft-surgeon');
    const opt = playOptions(g, 0).find((o) => o.card === gallia.id);
    expect(opt).toBeTruthy();
    expect(abs.length).toBe(1);
    expect(performAction(g, 0, { type: 'activate', card: gallia.id, ability: opt!.ability!, targets: [] })).toBeNull();
    settleAll(g, (d) => (d.type === 'choose' ? { type: 'choose', ids: d.options.slice(0, 1) } : undefined));
    expect(gallia.zone).toBe('battlefield');
    expect(gallia.tapped).toBe(true);
    expect(gallia.counters).toBe(1);
    expect(other.zone).toBe('exile');
  });
});
