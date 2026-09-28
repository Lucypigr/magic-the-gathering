import { describe, expect, it } from 'vitest';
import '../src/data';
import { performAction, playOptions, spellCost } from '../src/engine/actions';
import { combatDamage, declareAttackers, declareBlockers, hasFirstStrikers } from '../src/engine/combat';
import { checkSBA, resolveTop, settle } from '../src/engine/flow';
import { costTotal } from '../src/engine/mana';
import { getDef } from '../src/engine/registry';
import { createGame, newCard, stats } from '../src/engine/state';
import type { Card, Decision, GameState, PID, Response } from '../src/engine/types';
import { enterBattlefield } from '../src/engine/zones';
import { quickDecide, runSub } from '../src/ai/sim';

function mk(): GameState {
  const deck = Array(30).fill('plains');
  const g = createGame(
    { name: 'A', deckName: '', deck, isAI: true },
    { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true },
    1,
  );
  g.turn = 3;
  g.active = 0;
  g.phase = 'main1';
  return g;
}

function put(g: GameState, pid: PID, id: string, zone: 'battlefield' | 'hand' = 'battlefield'): Card {
  const c = newCard(g, getDef(id), pid);
  if (zone === 'battlefield') {
    c.zone = 'exile';
    enterBattlefield(g, c, pid);
    c.sick = false;
    c.tapped = false;
  } else {
    c.zone = 'hand';
    g.players[pid].hand.push(c.id);
  }
  return c;
}

function lands(g: GameState, pid: PID, id: string, n: number) {
  for (let i = 0; i < n; i++) put(g, pid, id);
  g.pending = [];
}

const decide = (g: GameState, d: Decision): Response => quickDecide(g, d);

function resolveStack(g: GameState) {
  for (let i = 0; i < 20 && (g.stack.length || g.pending.length); i++) {
    runSub(g, settle(g), decide);
    if (g.stack.length) runSub(g, resolveTop(g), decide);
  }
  runSub(g, settle(g), decide);
}

function fight(g: GameState, attackers: Card[], blocks: [Card, Card][]) {
  g.phase = 'combat_attackers';
  declareAttackers(g, 0, attackers.map((c) => c.id));
  resolveStack(g);
  g.phase = 'combat_blockers';
  declareBlockers(g, 1, blocks.map(([b, a]) => [b.id, a.id]));
  if (hasFirstStrikers(g)) {
    combatDamage(g, 'first');
    checkSBA(g);
    combatDamage(g, 'regular');
  } else combatDamage(g, 'all');
  resolveStack(g);
}

describe('戰鬥', () => {
  it('先攻的生物先造成傷害，對手來不及反擊', () => {
    const g = mk();
    const a = put(g, 0, 'lyra-dawnbringer'); // 5/5 飛行 先攻 繫命
    const b = put(g, 1, 'serra-angel'); // 4/4 飛行
    g.pending = [];
    fight(g, [a], [[b, a]]);
    expect(b.zone).toBe('graveyard');
    expect(a.zone).toBe('battlefield');
    expect(a.damage).toBe(0);
    expect(g.players[0].life).toBe(25); // 繫命
  });

  it('死觸只要 1 點傷害就能消滅，踐踏把多餘傷害給玩家', () => {
    const g = mk();
    const hydra = put(g, 0, 'colossal-dreadmaw'); // 6/6 踐踏
    const bear = put(g, 1, 'grizzly-bears');
    g.pending = [];
    fight(g, [hydra], [[bear, hydra]]);
    expect(bear.zone).toBe('graveyard');
    expect(g.players[1].life).toBe(16);

    const g2 = mk();
    const bears = put(g2, 0, 'centaur-courser');
    const archer = put(g2, 1, 'thornweald-archer'); // 2/1 死觸
    g2.pending = [];
    fight(g2, [bears], [[archer, bears]]);
    expect(bears.zone).toBe('graveyard');
    expect(archer.zone).toBe('graveyard');
  });

  it('飛行生物只能被飛行或延勢生物阻擋', () => {
    const g = mk();
    const drake = put(g, 0, 'wind-drake');
    const bear = put(g, 1, 'grizzly-bears');
    const archer = put(g, 1, 'thornweald-archer');
    g.pending = [];
    g.phase = 'combat_attackers';
    declareAttackers(g, 0, [drake.id]);
    const valid = declareBlockers(g, 1, [
      [bear.id, drake.id],
      [archer.id, drake.id],
    ]);
    expect(valid).toEqual([[archer.id, drake.id]]);
  });

  it('和平主義讓生物無法攻擊', () => {
    const g = mk();
    const bear = put(g, 1, 'grizzly-bears');
    lands(g, 0, 'plains', 2);
    const pac = put(g, 0, 'pacifism', 'hand');
    const err = performAction(g, 0, { type: 'cast', card: pac.id, targets: [{ c: bear.id }] });
    expect(err).toBeNull();
    resolveStack(g);
    expect(pac.attachedTo).toBe(bear.id);
    expect(stats(g, bear).cantAttack).toBe(true);
  });
});

describe('咒語與能力', () => {
  it('反擊咒語', () => {
    const g = mk();
    lands(g, 0, 'mountain', 1);
    lands(g, 1, 'island', 2);
    const shock = put(g, 0, 'shock', 'hand');
    const neg = put(g, 1, 'negate', 'hand');
    expect(performAction(g, 0, { type: 'cast', card: shock.id, targets: [{ p: 1 }] })).toBeNull();
    expect(performAction(g, 1, { type: 'cast', card: neg.id, targets: [{ c: shock.id }] })).toBeNull();
    resolveStack(g);
    expect(g.players[1].life).toBe(20);
    expect(shock.zone).toBe('graveyard');
  });

  it('勇行：施放非生物咒語時 +1/+1', () => {
    const g = mk();
    const monk = put(g, 0, 'monastery-swiftspear');
    lands(g, 0, 'mountain', 1);
    const bolt = put(g, 0, 'shock', 'hand');
    g.pending = [];
    performAction(g, 0, { type: 'cast', card: bolt.id, targets: [{ p: 1 }] });
    resolveStack(g);
    expect(stats(g, monk).p).toBe(2);
    expect(stats(g, monk).t).toBe(3);
  });

  it('放逐之光離場後，被放逐的永久物會回來', () => {
    const g = mk();
    const bear = put(g, 1, 'grizzly-bears');
    lands(g, 0, 'plains', 3);
    const bl = put(g, 0, 'banishing-light', 'hand');
    performAction(g, 0, { type: 'cast', card: bl.id, targets: [] });
    resolveStack(g);
    expect(bear.zone).toBe('exile');
    // 對手用瓦解之擊摧毀它
    lands(g, 1, 'plains', 3);
    const stroke = put(g, 1, 'stroke-of-midnight', 'hand');
    expect(performAction(g, 1, { type: 'cast', card: stroke.id, targets: [{ c: bl.id }] })).toBeNull();
    resolveStack(g);
    expect(bl.zone).toBe('graveyard');
    expect(bear.zone).toBe('battlefield');
  });

  it('苔生九頭龍：地落時指示物加倍；進化荒野可以搜尋基本地', () => {
    const g = mk();
    g.players[0].library = [];
    lands(g, 0, 'forest', 3);
    const hydra = put(g, 0, 'mossborn-hydra');
    g.pending = [];
    expect(hydra.counters).toBe(1);
    const forestInLib = newCard(g, getDef('forest'), 0);
    forestInLib.zone = 'library';
    g.players[0].library.push(forestInLib.id);
    const wilds = put(g, 0, 'evolving-wilds', 'hand');
    expect(performAction(g, 0, { type: 'play', card: wilds.id })).toBeNull();
    resolveStack(g);
    expect(hydra.counters).toBe(2);
    expect(performAction(g, 0, { type: 'activate', card: wilds.id, ability: 0, targets: [] })).toBeNull();
    resolveStack(g);
    expect(forestInLib.zone).toBe('battlefield');
    expect(hydra.counters).toBe(4);
  });

  it('費用減免：托勒利亞恐獸依墳墓場中的瞬間與法術減費', () => {
    const g = mk();
    const terror = put(g, 0, 'tolarian-terror', 'hand');
    expect(costTotal(spellCost(g, terror, 0))).toBe(7);
    for (let i = 0; i < 3; i++) {
      const c = newCard(g, getDef('opt'), 0);
      c.zone = 'graveyard';
      g.players[0].graveyard.push(c.id);
    }
    expect(costTotal(spellCost(g, terror, 0))).toBe(4);
  });

  it('傳奇規則只保留一個', () => {
    const g = mk();
    put(g, 0, 'lyra-dawnbringer');
    const b = put(g, 0, 'lyra-dawnbringer');
    g.pending = [];
    checkSBA(g);
    expect(g.battlefield.filter((id) => g.cards[id].def.id === 'lyra-dawnbringer')).toEqual([b.id]);
  });

  it('沒有法術力時不能施放咒語', () => {
    const g = mk();
    put(g, 0, 'serra-angel', 'hand');
    expect(playOptions(g, 0).filter((o) => o.kind === 'cast')).toHaveLength(0);
  });
});
