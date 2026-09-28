// Teenage Mutant Ninja Turtles（TMT，2026 年 3 月）
// 結盟（Alliance）：每當另一個生物在你的操控下進戰場時。
import type { Ability, Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'TMT';
const FOOD: Ability = act({ mana: '{2}', tap: true, sacSelf: true }, [{ e: 'gain', n: 3 }], '吃掉：獲得3點生命');
const FOOD_TEXT = '{2}，{T}，犧牲此神器：你獲得3點生命。';

// 獲得生命的雙色地
const gainland = (name: string, a: Mana, b: Mana) =>
  land(S, 'C', name, [a, b], `此地橫置進戰場。\n當此地進戰場時，你獲得1點生命。\n{T}：加{${a}}或{${b}}。`, {
    etbTapped: true,
    abilities: [etb([{ e: 'gain', n: 1 }])],
  });
gainland('Dimension X', 'R', 'W');
gainland('Foot Headquarters', 'W', 'B');
gainland('Illegitimate Business', 'B', 'G');
gainland('Mutant Town', 'G', 'U');
gainland('TCRI Building', 'U', 'R');
land(S, 'C', 'Escape Tunnel', [], '{T}，犧牲此地：從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場，然後將你的牌庫洗牌。', {
  abilities: [act({ tap: true, sacSelf: true }, [{ e: 'searchLand', to: 'battlefield', tapped: true }], '搜尋基本地')],
});

// ---------------- 白 ----------------
cr(S, 'R', 'Agent Bishop, Man in Black', '{2}{W}', 'Human Soldier', 1, 2, '在你回合的戰鬥開始時，在至多兩個目標生物上各放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  abilities: [
    trig('combatStart', [{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }], {
      targets: [
        { ...MY_CR, optional: true },
        { ...MY_CR, optional: true },
      ],
    }),
  ],
});
cr(S, 'R', 'Sally Pride, Lioness Leader', '{3}{W}{W}', 'Cat Mutant Rebel', 2, 4, '當此生物進戰場時，派出X個2/2紅色變種人衍生生物，X為由你操控的非衍生生物數量。\n每當此生物攻擊時，在每個由你操控的生物上各放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'token', token: 'tok-mutant', n: { count: { type: 'Creature', ctrl: 'you', token: false } } }]),
    trig('attacks', [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }]),
  ],
});
cr(S, 'U', 'Mighty Mutanimals', '{2}{W}{W}', 'Mutant Rebel', 2, 1, '當此生物進戰場時，派出一個2/2紅色變種人衍生生物。\n結盟—每當另一個生物在你的操控下進戰場時，在目標由你操控的生物上放置一個+1/+1指示物。', {
  abilities: [etb([{ e: 'token', token: 'tok-mutant' }]), trig('allyEtb', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] })],
});
cr(S, 'C', 'East Wind Avatar', '{3}{W}', 'Bird Spirit Avatar', 2, 4, '飛行，警戒\n結盟—每當另一個生物在你的操控下進戰場時，此生物得+1/+0直到回合結束。', {
  keywords: ['flying', 'vigilance'],
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 1, t: 0 }])],
});
cr(S, 'C', 'High-Flying Ace', '{2}{W}', 'Bird Mutant', 2, 3, '飛行', { keywords: ['flying'] });
cr(S, 'C', 'Jennika, Bad Apple Big Sister', '{4}{W}', 'Mutant Ninja Turtle', 3, 3, '當此生物進戰場時，派出一個2/2紅色變種人衍生生物。', {
  supertypes: ['Legendary'],
  abilities: [etb([{ e: 'token', token: 'tok-mutant' }])],
});
cr(S, 'C', 'Action News Crew', '{1}{W}', 'Human Citizen', 2, 2, '警戒', { keywords: ['vigilance'] });
inst(S, 'C', 'Grounded for Life', '{4}{W}', '若此咒語以已橫置的生物為目標，則減少{3}來施放。\n消滅目標生物。', {
  modes: [
    { text: '消滅已橫置的生物（{1}{W}）', cost: '{1}{W}', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [destroyT0] },
    { text: '消滅生物', targets: [CR], effects: [destroyT0] },
  ],
});
inst(S, 'C', 'Hamato Guardian Stance', '{W}', '目標生物得+1/+3並獲得飛行異能直到回合結束。占卜1。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 3, kw: ['flying'] }, { e: 'scry', n: 1 }],
});
inst(S, 'C', 'Make Your Move', '{2}{W}', '消滅目標神器、結界或力量為4或更多的生物。', {
  targets: [{ kind: 'permanent', filter: { or: [{ type: ['Artifact', 'Enchantment'] }, { type: 'Creature', powMin: 4 }] } }],
  effects: [destroyT0],
});
ench(S, 'C', 'Uneasy Alliance', '{1}{W}', '結附於生物\n所結附的生物不能攻擊或阻擋。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { cantAttack: true, cantBlock: true } },
});

// ---------------- 藍 ----------------
cr(S, 'U', 'April, Reporter of the Weird', '{2}{U}', 'Human Detective', 2, 2, '每當此生物對玩家造成戰鬥傷害時，抓等量的牌，然後棄一張牌。', {
  supertypes: ['Legendary'],
  abilities: [trig('combatDamagePlayer', [{ e: 'draw', n: { ev: true } }, { e: 'discard', n: 1, who: 'you' }])],
});
inst(S, 'U', 'Ooze Spill', '{1}{U}{U}', '反擊目標咒語。', { targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] });
cr(S, 'C', 'Buzz Bots', '{1}{U}', 'Robot Insect', 1, 1, '飛行，警戒\n當此生物死去時，抓一張牌。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying', 'vigilance'],
  abilities: [trig('dies', [{ e: 'draw', n: 1 }])],
});
cr(S, 'C', 'Donatello, Turtle Techie', '{3}{U}', 'Mutant Ninja Turtle', 3, 4, '當此生物進戰場時，若你操控神器，抓一張牌。', {
  supertypes: ['Legendary'],
  abilities: [etb([{ e: 'draw', n: 1 }], { cond: { c: 'controls', filter: { type: 'Artifact' } } })],
});
cr(S, 'C', 'Stockman, Mad Fly-entist', '{4}{U}', 'Insect Mutant Scientist', 3, 4, '飛行\n當此生物進戰場時，抓一張牌，然後棄一張牌。', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [etb([{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }])],
});
cr(S, 'C', 'Utrom Scientists', '{2}{U}', 'Utrom Robot Scientist', 2, 2, '當此生物進戰場時，橫置至多一個目標生物，並在其上放置一個暈眩指示物。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([{ e: 'tap', what: 'T0' }, { e: 'stun', what: 'T0' }], { targets: [{ kind: 'creature', optional: true }] })],
});

// ---------------- 黑 ----------------
cr(S, 'M', 'Super Shredder', '{1}{B}', 'Mutant Ninja Human', 1, 1, '威懾\n每當另一個生物死去時，在此生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['menace'],
  abilities: [trig('otherDies', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'R', 'Armaggon, Future Shark', '{6}{B}{B}', 'Shark Horror Mutant', 9, 6, '閃現\n當此生物進戰場時，消滅至多三個目標生物。', {
  supertypes: ['Legendary'],
  keywords: ['flash'],
  abilities: [
    etb([{ e: 'destroy', what: 'T0' }, { e: 'destroy', what: 'T1' }, { e: 'destroy', what: 'T2' }], {
      targets: [
        { ...OPP_CR, optional: true },
        { ...OPP_CR, optional: true },
        { ...OPP_CR, optional: true },
      ],
    }),
  ],
});
cr(S, 'R', 'Savanti Romero, Time\'s Exile', '{3}{B}{B}', 'Demon Wizard', 4, 4, '踐踏\n在你回合的戰鬥開始時，在此生物上放置一個+1/+1指示物。然後你抓X張牌並失去X點生命，X為其上的指示物數量。', {
  supertypes: ['Legendary'],
  keywords: ['trample'],
  abilities: [
    trig('combatStart', [
      { e: 'counters', what: 'self', n: 1 },
      { e: 'draw', n: { selfCounters: true } },
      { e: 'lose', n: { selfCounters: true }, who: 'you' },
    ]),
  ],
});
cr(S, 'R', 'South Wind Avatar', '{3}{B}', 'Snake Spirit Avatar', 3, 4, '死觸\n每當另一個由你操控的生物死去時，你獲得2點生命。\n每當你獲得生命時，每位對手失去1點生命。', {
  keywords: ['deathtouch'],
  abilities: [trig('allyDies', [{ e: 'gain', n: 2 }], { filter: { type: 'Creature' } }), trig('lifegain', [{ e: 'lose', n: 1, who: 'opp' }])],
});
inst(S, 'U', 'Death in the Family', '{1}{B}', '放逐目標法術力值為3或更少的生物。', {
  targets: [{ kind: 'creature', filter: { mvMax: 3 } }],
  effects: [{ e: 'exile', what: 'T0' }],
});
cr(S, 'U', 'Dream Beavers', '{B}', 'Beaver Nightmare', 1, 1, '飛行\n當此生物進戰場時，每位對手失去1點生命，且你獲得1點生命。占卜1。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }, { e: 'scry', n: 1 }])],
});
arti(S, 'C', 'Anchovy & Banana Pizza', '{2}{B}{B}', `當此神器進戰場時，消滅目標生物。\n${FOOD_TEXT}`, {
  subtypes: ['Food'],
  abilities: [etb([destroyT0], { targets: [CR] }), FOOD],
});
cr(S, 'C', 'Foot Mystic', '{3}{B}', 'Human Ninja Warlock', 2, 4, '繫命', { keywords: ['lifelink'] });
cr(S, 'C', 'Squirrelanoids', '{B}', 'Squirrel Mutant', 1, 1, '死觸', { keywords: ['deathtouch'] });
cr(S, 'C', 'Tunnel Rats', '{1}{B}', 'Rat', 2, 2, '');
sorc(S, 'C', "Shredder's Revenge", '{2}{B}', '選擇一項：\n• 目標玩家棄兩張牌。\n• 目標玩家抓兩張牌並失去2點生命。', {
  modes: [
    { text: '對手棄兩張牌', targets: [OPP], effects: [{ e: 'discard', n: 2, who: 'T0' }] },
    { text: '你抓兩張牌並失去2點生命', effects: [{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'you' }] },
  ],
});

// ---------------- 紅 ----------------
cr(S, 'R', 'Slash, Reptile Rampager', '{3}{R}{R}', 'Mutant Berserker Turtle', 7, 5, '結盟—每當另一個生物在你的操控下進戰場時，此生物對每位對手各造成2點傷害。\n每當此生物攻擊時，派出一個2/2紅色變種人衍生生物。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyEtb', [{ e: 'damage', n: 2, to: 'opp' }]), trig('attacks', [{ e: 'token', token: 'tok-mutant' }])],
});
arti(S, 'U', 'Hard-Won Jitte', '{1}{R}', '佩帶此武具的生物具有連擊異能。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { kw: ['double_strike'] } },
});
arti(S, 'U', 'Spicy Oatmeal Pizza', '{2}{R}', `當此神器進戰場時，它對任意一個目標造成4點傷害，並對你造成3點傷害。\n${FOOD_TEXT}`, {
  subtypes: ['Food'],
  abilities: [etb([{ e: 'damage', n: 4, to: 'T0' }, { e: 'damage', n: 3, to: 'you' }], { targets: [ANY] }), FOOD],
});
sorc(S, 'C', 'Bot Bashing Time', '{3}{R}', '對目標生物造成6點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 6, to: 'T0' }] });
inst(S, 'C', 'Manhole Missile', '{1}{R}', '對目標生物造成3點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 3, to: 'T0' }] });
inst(S, 'C', 'Mouser Attack!', '{1}{R}', '選擇一項：\n• 派出一個1/1無色機器人神器衍生生物。\n• 目標生物得+3/+0並獲得先攻異能直到回合結束。', {
  modes: [
    { text: '派出機器人', effects: [{ e: 'token', token: 'tok-robot' }] },
    { text: '+3/+0 並獲得先攻', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 0, kw: ['first_strike'] }] },
  ],
});
arti(S, 'C', 'Mouser Foundry', '{1}{R}', '當此神器進戰場時，派出一個1/1無色機器人神器衍生生物。\n{4}{R}，犧牲此神器：它對目標生物造成3點傷害。', {
  abilities: [
    etb([{ e: 'token', token: 'tok-robot' }]),
    act({ mana: '{4}{R}', sacSelf: true }, [{ e: 'damage', n: 3, to: 'T0' }], '犧牲：3點傷害', { targets: [CR] }),
  ],
});
cr(S, 'C', 'Mutant Town Musicians', '{2}{R}', 'Mutant Bard Performer', 2, 4, '踐踏\n結盟—每當另一個生物在你的操控下進戰場時，此生物得+1/+0直到回合結束。', {
  keywords: ['trample'],
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 1, t: 0 }])],
});
cr(S, 'C', 'Raphael, Tough Turtle', '{1}{R}', 'Mutant Ninja Turtle', 1, 3, '結盟—每當另一個生物在你的操控下進戰場時，此生物對目標對手造成1點傷害。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyEtb', [{ e: 'damage', n: 1, to: 'T0' }], { targets: [OPP] })],
});
cr(S, 'C', 'Rock Soldiers', '{3}{R}', 'Elemental Soldier', 4, 3, '當此生物進戰場時，消滅至多一個目標非生物神器。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([destroyT0], { targets: [{ kind: 'permanent', filter: { type: 'Artifact', nonType: 'Creature' }, optional: true }] })],
});

// ---------------- 綠 ----------------
inst(S, 'U', 'Saved by the Shell', '{1}{G}', '在目標由你操控的生物上放置一個+1/+1指示物。它獲得踐踏、辟邪與不滅異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample', 'hexproof', 'indestructible'] }],
});
cr(S, 'C', 'Frog Butler', '{1}{G}', 'Frog Spirit', 1, 1, '死觸\n{T}：加一點任意顏色的法術力。\n{2}：此生物獲得延勢異能直到回合結束。', {
  keywords: ['deathtouch'],
  produces: ['W', 'U', 'B', 'R', 'G'],
  abilities: [act({ mana: '{2}' }, [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['reach'] }], '獲得延勢')],
});
cr(S, 'C', 'Primordial Pachyderm', '{3}{G}', 'Elephant Avatar', 4, 4, '延勢，踐踏\n當此生物進戰場時，你獲得2點生命。', {
  keywords: ['reach', 'trample'],
  abilities: [etb([{ e: 'gain', n: 2 }])],
});
arti(S, 'C', 'Guac & Marshmallow Pizza', '{G}', `閃現\n當此神器進戰場時，目標生物得+2/+2直到回合結束。重置該生物。\n${FOOD_TEXT}`, {
  subtypes: ['Food'],
  keywords: ['flash'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 2, t: 2 }, { e: 'untap', what: 'T0' }], { targets: [CR] }), FOOD],
});
inst(S, 'C', 'Tenderize', '{1}{G}', '目標由你操控的生物對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'bite', a: 'T0', b: 'T1' }],
});

// ---------------- 多色 ----------------
sorc(S, 'U', 'Lessons from Life', '{2}{G}{U}', '抓三張牌。你可以將一張地牌從你手上放進戰場。', {
  effects: [{ e: 'draw', n: 3 }, { e: 'landFromHand' }],
});
cr(S, 'C', 'EPF Point Squad', '{1}{R/W}{R/W}', 'Human Soldier', 2, 1, '結盟—每當另一個生物在你的操控下進戰場時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('allyEtb', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'C', 'Foot Elite', '{2}{W/B}', 'Human Ninja', 2, 4, '每當此生物攻擊時，另一個目標由你操控的生物得+1/+0並獲得不滅異能直到回合結束。', {
  abilities: [
    trig('attacks', [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['indestructible'] }], {
      targets: [{ kind: 'creature', filter: { ctrl: 'you' }, notSelf: true, optional: true }],
    }),
  ],
});
cr(S, 'C', 'Mechanized Ninja Cavalry', '{1}{R/W}', 'Robot Ninja', 1, 1, '當此生物進戰場時，派出一個1/1無色機器人神器衍生生物。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([{ e: 'token', token: 'tok-robot' }])],
});
cr(S, 'C', 'Punk Frogs', '{3}{G/U}{G/U}', 'Frog Mutant Rebel', 4, 5, '守護{3}', { ward: 3 });
cr(S, 'C', 'Putrid Pals', '{2}{B/G}{B/G}', 'Human Ooze Mutant', 3, 3, '死觸', { keywords: ['deathtouch'] });
