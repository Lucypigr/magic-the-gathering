import { describe, expect, it } from 'vitest';
import '../src/data';
import { canPlayLand, payCost } from '../src/engine/actions';
import { runEffects } from '../src/engine/effects';
import { parseCost } from '../src/engine/mana';
import { getDef } from '../src/engine/registry';
import { createGame, matches, newCard, stats } from '../src/engine/state';
import type { Card, Effect, GameState, PID, Response, TargetRef } from '../src/engine/types';
import { enterBattlefield, moveCard } from '../src/engine/zones';

function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('plains'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
  g.turn = 3;
  g.active = 0;
  g.phase = 'main1';
  return g;
}
function put(g: GameState, pid: PID, id: string, keepTapState = false): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'exile';
  enterBattlefield(g, c, pid);
  c.sick = false;
  if (!keepTapState) c.tapped = false;
  g.pending = [];
  return c;
}
/** 執行效果；需要選擇時一律選最多、需要確認時一律同意 */
function run(g: GameState, source: Card, effects: Effect[], targets: (TargetRef | null)[] = []) {
  const it = runEffects(g, { controller: source.controller, source: source.id, targets }, effects);
  let r = it.next();
  while (!r.done) {
    const d = r.value;
    let resp: Response = { type: 'pass' };
    if (d.type === 'choose') resp = { type: 'choose', ids: d.options.slice(0, d.max) };
    if (d.type === 'yesno') resp = { type: 'yesno', yes: true };
    r = it.next(resp);
  }
}
function libTop(g: GameState, pid: PID, ids: string[]) {
  const cards = ids.map((id) => {
    const c = newCard(g, getDef(id), pid);
    c.zone = 'library';
    return c.id;
  });
  g.players[pid].library.unshift(...cards);
  return cards.map((id) => g.cards[id]);
}

describe('職業牌組常用卡', () => {
  it('起始城鎮：無色免費、有色要付1點生命；第四回合起橫置進場', () => {
    const g = mk();
    put(g, 0, 'starting-town');
    const life = g.players[0].life;
    expect(payCost(g, 0, parseCost('{1}'))).toBe(true);
    expect(g.players[0].life).toBe(life);
    const g2 = mk();
    put(g2, 0, 'starting-town');
    expect(payCost(g2, 0, parseCost('{R}'))).toBe(true);
    expect(g2.players[0].life).toBe(life - 1);

    const early = mk();
    expect(put(early, 0, 'starting-town', true).tapped).toBe(false);
    const late = mk();
    late.turn = 9;
    expect(put(late, 0, 'starting-town', true).tapped).toBe(true);
  });

  it('付生命的地排在最後使用', () => {
    const g = mk();
    put(g, 0, 'starting-town');
    const m = put(g, 0, 'mountain');
    const life = g.players[0].life;
    expect(payCost(g, 0, parseCost('{R}'))).toBe(true);
    expect(m.tapped).toBe(true);
    expect(g.players[0].life).toBe(life);
  });

  it('冰原探索者：每回合可以多使用一張地', () => {
    const g = mk();
    g.players[0].landsPlayed = 1;
    expect(canPlayLand(g, 0)).toBe(false);
    put(g, 0, 'icetill-explorer');
    expect(canPlayLand(g, 0)).toBe(true);
    g.players[0].landsPlayed = 2;
    expect(canPlayLand(g, 0)).toBe(false);
  });

  it('聯合前線：符合條件的永久物牌直接放進戰場', () => {
    const g = mk();
    const src = put(g, 0, 'plains');
    const [a, b, c] = libTop(g, 0, ['cryogen-relic', 'shock', 'perilous-snare']);
    run(g, src, getDef('united-battlefront').spell!.effects!);
    expect(a.zone).toBe('battlefield');
    expect(c.zone).toBe('battlefield');
    expect(b.zone).toBe('library');
  });

  it('星圖諮詢：檢視的張數等於你的地數', () => {
    const g = mk();
    const src = put(g, 0, 'plains');
    put(g, 0, 'island');
    const hand = g.players[0].hand.length;
    run(g, src, getDef('consult-the-star-charts').spell!.modes![1].effects);
    expect(g.players[0].hand.length).toBe(hand + 2);
  });

  it('咒語陷阱：只能反擊法術力值為2的咒語', () => {
    const g = mk();
    const f = getDef('spell-snare').spell!.targets![0].filter;
    expect(matches(g, f, newCard(g, getDef('cryogen-relic'), 1), 0)).toBe(true);
    expect(matches(g, f, newCard(g, getDef('shock'), 1), 0)).toBe(false);
  });

  it('漩渦脈衝：同名的永久物一起消滅', () => {
    const g = mk();
    const src = put(g, 0, 'plains');
    const a = put(g, 1, 'tok-clue');
    const b = put(g, 1, 'tok-clue');
    const keep = put(g, 1, 'cryogen-relic');
    run(g, src, getDef('maelstrom-pulse').spell!.effects!, [{ c: a.id }]);
    expect(g.battlefield.includes(a.id)).toBe(false);
    expect(g.battlefield.includes(b.id)).toBe(false);
    expect(keep.zone).toBe('battlefield');
  });

  it('迷失：對手的生物被消滅並得到兩個線索', () => {
    const g = mk();
    const src = put(g, 0, 'plains');
    const bear = put(g, 1, 'hinterland-sanctifier');
    run(g, src, getDef('get-lost').spell!.effects!, [{ c: bear.id }]);
    expect(bear.zone).toBe('graveyard');
    expect(g.battlefield.filter((id) => g.cards[id].def.id === 'tok-clue' && g.cards[id].controller === 1)).toHaveLength(2);
  });

  it('巔峰星籠：放逐法術力值2或更少的生物，離場後歸還', () => {
    const g = mk();
    const small = put(g, 1, 'hinterland-sanctifier');
    const big = put(g, 1, 'nova-hellkite');
    const cage = put(g, 0, 'pinnacle-starcage');
    const ab = getDef('pinnacle-starcage').abilities![0];
    run(g, cage, (ab as { effects: Effect[] }).effects);
    expect(small.zone).toBe('exile');
    expect(big.zone).toBe('battlefield');
    moveCard(g, cage, 'graveyard');
    expect(small.zone).toBe('battlefield');
  });

  it('構裝體衍生物：每有一個神器就 +1/+1', () => {
    const g = mk();
    const t = put(g, 0, 'tok-construct-x');
    put(g, 0, 'cryogen-relic');
    put(g, 0, 'firdoch-core');
    // 自己也是神器：共三個
    expect(stats(g, t).p).toBe(3);
    expect(stats(g, t).t).toBe(3);
  });

  it('史矛革：攻擊時造成等同珍寶數量的傷害', () => {
    const g = mk();
    const smaug = put(g, 0, 'smaug-the-magnificent');
    put(g, 0, 'tok-treasure');
    put(g, 0, 'tok-treasure');
    const life = g.players[1].life;
    const ab = getDef('smaug-the-magnificent').abilities![0] as { effects: Effect[] };
    run(g, smaug, ab.effects, [{ p: 1 }]);
    expect(g.players[1].life).toBe(life - 2);
  });

  it('暗物質操縱者：墳墓場七張牌以上 +2/+0', () => {
    const g = mk();
    const c = put(g, 0, 'dark-matter-manipulator');
    expect(stats(g, c).p).toBe(1);
    for (let i = 0; i < 7; i++) moveCard(g, g.cards[g.players[0].library[0]], 'graveyard');
    expect(stats(g, c).p).toBe(3);
  });
});
