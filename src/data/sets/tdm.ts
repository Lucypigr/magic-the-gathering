// Tarkir: Dragonstorm（TDM，2025 年 4 月）
// 疾風（Flurry）：每當你施放本回合的第二個咒語時。
// 註：{2/R} 這類單色混合法術力在本遊戲中簡化為一點該顏色的法術力。
import type { Cond, Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, OPP_NONLAND, act, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'TDM';
const FLURRY: Cond = { c: 'secondSpell' };
const HAS_COUNTERED: Cond = { c: 'controls', filter: { type: 'Creature', hasCounters: true } };

const triland = (name: string, a: Mana, b: Mana, c: Mana) =>
  land(S, 'U', name, [a, b, c], `此地橫置進戰場。\n{T}：加{${a}}、{${b}}或{${c}}。`, { etbTapped: true });
triland('Frontier Bivouac', 'G', 'U', 'R');
triland('Mystic Monastery', 'U', 'R', 'W');
triland('Nomad Outpost', 'R', 'W', 'B');
triland('Opulent Palace', 'B', 'G', 'U');
triland('Sandsteppe Citadel', 'W', 'B', 'G');
land(S, 'R', 'Cori Mountain Monastery', ['R'], '除非你操控平原或海島，否則此地橫置進戰場。\n{T}：加{R}。\n{3}{R}，{T}：放逐你牌庫頂的一張牌。本回合你可以使用該牌。', {
  etbTappedUnless: { c: 'controls', filter: { sub: ['Plains', 'Island'] } },
  abilities: [act({ mana: '{3}{R}', tap: true }, [{ e: 'impulse', n: 1 }], '放逐牌庫頂一張牌')],
});
land(S, 'R', 'Great Arashin City', ['B'], '除非你操控樹林或平原，否則此地橫置進戰場。\n{T}：加{B}。', {
  etbTappedUnless: { c: 'controls', filter: { sub: ['Forest', 'Plains'] } },
});
land(S, 'R', 'Mistrise Village', ['U'], '除非你操控山脈或樹林，否則此地橫置進戰場。\n{T}：加{U}。', {
  etbTappedUnless: { c: 'controls', filter: { sub: ['Mountain', 'Forest'] } },
});

// ---------------- 白 ----------------
cr(S, 'R', 'Clarion Conqueror', '{2}{W}', 'Dragon', 3, 3, '飛行', { keywords: ['flying'] });
cr(S, 'U', 'Loxodon Battle Priest', '{4}{W}', 'Elephant Cleric', 3, 5, '在你回合的戰鬥開始時，在另一個目標由你操控的生物上放置一個+1/+1指示物。', {
  abilities: [trig('combatStart', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] })],
});
cr(S, 'U', 'Starry-Eyed Skyrider', '{2}{W}', 'Human Scout', 1, 3, '飛行\n每當此生物攻擊時，另一個目標由你操控的生物獲得飛行異能直到回合結束。\n由你操控、正在攻擊的衍生物具有飛行異能。', {
  keywords: ['flying'],
  abilities: [
    trig('attacks', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['flying'] }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] }),
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', token: true, attacking: true }, grant: { kw: ['flying'] } } },
  ],
});
ench(S, 'U', 'Static Snare', '{4}{W}', '閃現\n當此結界進戰場時，放逐目標由對手操控的神器或生物，直到此結界離開戰場為止。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'opp', type: ['Artifact', 'Creature'] } }] })],
});
cr(S, 'U', 'Sunpearl Kirin', '{1}{W}', 'Kirin', 2, 1, '閃現，飛行\n當此生物進戰場時，將至多一個另外的目標由你操控的非地永久物移回其擁有者手上。', {
  keywords: ['flash', 'flying'],
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'you', nonType: 'Land' }, notSelf: true, optional: true }] })],
});
ench(S, 'U', 'Teeming Dragonstorm', '{3}{W}', '當此結界進戰場時，派出兩個2/2白色士兵衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-soldier22', n: 2 }])],
});
cr(S, 'C', 'Arashin Sunshield', '{3}{W}', 'Human Warrior', 3, 4, '{W}，{T}：橫置目標生物。', {
  abilities: [act({ mana: '{W}', tap: true }, [{ e: 'tap', what: 'T0' }], '橫置生物', { targets: [OPP_CR] })],
});
cr(S, 'C', 'Bearer of Glory', '{1}{W}', 'Human Soldier', 2, 1, '在你的回合中，此生物具有先攻異能。\n{4}{W}：由你操控的生物得+1/+1直到回合結束。', {
  abilities: [
    { kind: 'static', self: { cond: { c: 'yourTurn' }, grant: { kw: ['first_strike'] } } },
    act({ mana: '{4}{W}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }], '全體+1/+1'),
  ],
});
inst(S, 'C', 'Coordinated Maneuver', '{1}{W}', '選擇一項：\n• 對目標生物造成傷害，其數量等同於由你操控的生物數量。\n• 消滅目標結界。', {
  modes: [
    { text: '依生物數量造成傷害', targets: [CR], effects: [{ e: 'damage', n: { count: { type: 'Creature', ctrl: 'you' } }, to: 'T0' }] },
    { text: '消滅結界', targets: [{ kind: 'permanent', filter: { type: 'Enchantment' } }], effects: [destroyT0] },
  ],
});
inst(S, 'C', 'Lightfoot Technique', '{1}{W}', '在目標生物上放置一個+1/+1指示物。它獲得飛行與不滅異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['flying', 'indestructible'] }],
});
cr(S, 'C', 'Poised Practitioner', '{2}{W}', 'Human Monk', 2, 3, '疾風—每當你施放本回合的第二個咒語時，在此生物上放置一個+1/+1指示物。占卜1。', {
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }, { e: 'scry', n: 1 }], { cond: FLURRY })],
});
inst(S, 'C', 'Rebellious Strike', '{1}{W}', '目標生物得+3/+0直到回合結束。抓一張牌。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 0 }, { e: 'draw', n: 1 }] });
ench(S, 'C', 'Stormplain Detainment', '{2}{W}', '當此結界進戰場時，放逐目標由對手操控的非地永久物，直到此結界離開戰場為止。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [OPP_NONLAND] })],
});

// ---------------- 藍 ----------------
inst(S, 'U', 'Bewildering Blizzard', '{4}{U}{U}', '抓三張牌。由對手操控的生物得-3/-0直到回合結束。', {
  effects: [{ e: 'draw', n: 3 }, { e: 'pump', what: { all: { type: 'Creature', ctrl: 'opp' } }, p: -3, t: 0 }],
});
ench(S, 'U', 'Roiling Dragonstorm', '{1}{U}', '當此結界進戰場時，抓兩張牌，然後棄一張牌。', {
  abilities: [etb([{ e: 'draw', n: 2 }, { e: 'discard', n: 1, who: 'you' }])],
});
cr(S, 'U', 'Wingblade Disciple', '{2}{U}', 'Human Monk', 2, 2, '飛行\n疾風—每當你施放本回合的第二個咒語時，派出一個1/1白色，具飛行異能的鳥衍生生物。', {
  keywords: ['flying'],
  abilities: [trig('castAny', [{ e: 'token', token: 'tok-bird-w' }], { cond: FLURRY })],
});
inst(S, 'C', 'Focus the Mind', '{4}{U}', '若你本回合施放過其他咒語，此咒語減少{2}來施放。\n抓三張牌，然後棄一張牌。', {
  effects: [{ e: 'draw', n: 3 }, { e: 'discard', n: 1, who: 'you' }],
}, { costReduce: { cond: { c: 'spellsCast', n: 1 }, mana: '{2}' } });
cr(S, 'C', 'Humbling Elder', '{U}', 'Human Monk', 1, 2, '閃現\n當此生物進戰場時，目標由對手操控的生物得-2/-0直到回合結束。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: -2, t: 0 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
cr(S, 'C', 'Iceridge Serpent', '{4}{U}', 'Serpent', 3, 3, '當此生物進戰場時，將目標由對手操控的生物移回其擁有者手上。', {
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [OPP_CR] })],
});
inst(S, 'C', 'Riverwalk Technique', '{3}{U}', '選擇一項：\n• 將目標非地永久物置於其擁有者的牌庫底。\n• 反擊目標非生物咒語。', {
  modes: [
    { text: '置於牌庫底', targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }], effects: [{ e: 'tuck', what: 'T0' }] },
    { text: '反擊非生物咒語', targets: [{ kind: 'spell', filter: { nonType: 'Creature' } }], effects: [{ e: 'counter', what: 'T0' }] },
  ],
});
cr(S, 'C', 'Sibsig Appraiser', '{2}{U}', 'Zombie Advisor', 2, 1, '當此生物進戰場時，檢視你牌庫頂的兩張牌。將其中一張置於你手上，另一張置入你的墳墓場。', {
  abilities: [etb([{ e: 'dig', n: 2, take: 1, rest: 'graveyard' }])],
});
ench(S, 'C', 'Wingspan Stride', '{U}', '結附於生物\n所結附的生物得+1/+1且具有飛行異能。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 1, t: 1, kw: ['flying'] } },
});

// ---------------- 黑 ----------------
cr(S, 'U', 'Yathan Tombguard', '{2}{B}', 'Human Warrior', 2, 3, '威懾\n每當一個由你操控、上面有指示物的生物對玩家造成戰鬥傷害時，你抓一張牌並失去1點生命。', {
  keywords: ['menace'],
  abilities: [trig('allyCombatDamagePlayer', [{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }], { filter: { hasCounters: true } })],
});
inst(S, 'U', 'Wail of War', '{2}{B}', '選擇一項：\n• 由目標對手操控的生物得-1/-1直到回合結束。\n• 將至多兩張目標生物牌從你的墳墓場移回你手上。', {
  modes: [
    { text: '對手的生物-1/-1', effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'opp' } }, p: -1, t: -1 }] },
    {
      text: '移回兩張生物牌',
      targets: [
        { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
        { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
      ],
      effects: [{ e: 'toHand', what: 'T0' }, { e: 'toHand', what: 'T1' }],
    },
  ],
});
sorc(S, 'U', 'Salt Road Skirmish', '{3}{B}', '消滅目標生物。', { targets: [CR], effects: [destroyT0] });
inst(S, 'C', "Alesha's Legacy", '{1}{B}', '目標由你操控的生物獲得死觸與不滅異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['deathtouch', 'indestructible'] }],
});
cr(S, 'C', 'Delta Bloodflies', '{1}{B}', 'Insect', 1, 2, '飛行\n每當此生物攻擊時，若你操控上面有指示物的生物，每位對手失去1點生命。', {
  keywords: ['flying'],
  abilities: [trig('attacks', [{ e: 'lose', n: 1, who: 'opp' }], { cond: HAS_COUNTERED })],
});
inst(S, 'C', "Dragon's Prey", '{2}{B}', '消滅目標生物。', { targets: [CR], effects: [destroyT0] });
cr(S, 'C', 'Unburied Earthcarver', '{1}{B}', 'Human Warrior', 2, 2, '{2}，犧牲另一個生物：在此生物上放置一個+1/+1指示物。', {
  abilities: [act({ mana: '{2}', sacOther: { type: 'Creature' } }, [{ e: 'counters', what: 'self', n: 1 }], '犧牲：+1/+1指示物')],
});
sorc(S, 'C', 'Worthy Cost', '{B}', '作為施放此咒語的額外費用，犧牲一個生物。\n放逐目標生物。', { targets: [CR], effects: [{ e: 'exile', what: 'T0' }] }, {
  addCost: { sac: { type: 'Creature' } },
});

// ---------------- 紅 ----------------
cr(S, 'U', 'Shocking Sharpshooter', '{1}{R}', 'Human Archer', 1, 3, '延勢\n每當另一個生物在你的操控下進戰場時，此生物對目標對手造成1點傷害。', {
  keywords: ['reach'],
  abilities: [trig('allyEtb', [{ e: 'damage', n: 1, to: 'T0' }], { targets: [OPP] })],
});
cr(S, 'U', 'Sunset Strikemaster', '{1}{R}', 'Human Monk', 3, 1, '{T}：加{R}。\n{2}{R}，{T}，犧牲此生物：它對目標具飛行異能的生物造成6點傷害。', {
  produces: ['R'],
  abilities: [act({ mana: '{2}{R}', tap: true, sacSelf: true }, [{ e: 'damage', n: 6, to: 'T0' }], '犧牲：對飛行生物6點傷害', { targets: [{ kind: 'creature', filter: { kw: 'flying' } }] })],
});
cr(S, 'U', 'Unsparing Boltcaster', '{2}{R}', 'Ogre Wizard', 3, 3, '當此生物進戰場時，它對目標本回合受到過傷害、由對手操控的生物造成5點傷害。', {
  abilities: [etb([{ e: 'damage', n: 5, to: 'T0' }], { targets: [{ kind: 'creature', filter: { ctrl: 'opp', damaged: true }, optional: true }] })],
});
inst(S, 'U', 'Overwhelming Surge', '{2}{R}', '選擇一項：\n• 對目標生物造成3點傷害。\n• 消滅目標非生物神器。', {
  modes: [
    { text: '3點傷害', targets: [CR], effects: [{ e: 'damage', n: 3, to: 'T0' }] },
    { text: '消滅非生物神器', targets: [{ kind: 'permanent', filter: { type: 'Artifact', nonType: 'Creature' } }], effects: [destroyT0] },
  ],
});
cr(S, 'C', 'Devoted Duelist', '{1}{R}', 'Goblin Monk', 2, 1, '敏捷\n疾風—每當你施放本回合的第二個咒語時，此生物對每位對手各造成1點傷害。', {
  keywords: ['haste'],
  abilities: [trig('castAny', [{ e: 'damage', n: 1, to: 'opp' }], { cond: FLURRY })],
});
ench(S, 'C', 'Fire-Rim Form', '{1}{R}', '閃現\n結附於生物\n當此靈氣進戰場時，所結附的生物獲得先攻異能直到回合結束。\n所結附的生物得+2/+0。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 2 } },
  abilities: [etb([{ e: 'pump', what: 'attached', p: 0, t: 0, kw: ['first_strike'] }])],
});
inst(S, 'C', "Narset's Rebuke", '{4}{R}', '對目標生物造成5點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 5, to: 'T0' }] });
inst(S, 'C', 'Seize Opportunity', '{2}{R}', '選擇一項：\n• 放逐你牌庫頂的兩張牌。本回合你可以使用這些牌。\n• 至多兩個目標生物各得+2/+1直到回合結束。', {
  modes: [
    { text: '放逐牌庫頂兩張牌', effects: [{ e: 'impulse', n: 2 }] },
    { text: '兩個生物+2/+1', targets: [MY_CR, { ...MY_CR, optional: true }], effects: [{ e: 'pump', what: 'T0', p: 2, t: 1 }, { e: 'pump', what: 'T1', p: 2, t: 1 }] },
  ],
});
cr(S, 'C', 'Summit Intimidator', '{3}{R}', 'Yeti', 4, 3, '延勢', { keywords: ['reach'] });
cr(S, 'C', 'Underfoot Underdogs', '{2}{R}', 'Goblin Warrior', 1, 2, '當此生物進戰場時，派出一個1/1紅色鬼怪衍生生物。\n{1}，{T}：目標由你操控、力量為2或更少的生物本回合不能被阻擋。', {
  abilities: [
    etb([{ e: 'token', token: 'tok-goblin' }]),
    act({ mana: '{1}', tap: true }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['unblockable'] }], '不能被阻擋', { targets: [{ kind: 'creature', filter: { ctrl: 'you', powMax: 2 } }] }),
  ],
});

// ---------------- 綠 ----------------
cr(S, 'M', 'Craterhoof Behemoth', '{5}{G}{G}{G}', 'Beast', 5, 5, '敏捷\n當此生物進戰場時，由你操控的生物獲得踐踏異能並得+X/+X直到回合結束，X為由你操控的生物數量。', {
  keywords: ['haste'],
  abilities: [
    etb([
      {
        e: 'pump',
        what: { all: { type: 'Creature', ctrl: 'you' } },
        p: { count: { type: 'Creature', ctrl: 'you' } },
        t: { count: { type: 'Creature', ctrl: 'you' } },
        kw: ['trample'],
      },
    ]),
  ],
});
cr(S, 'R', 'Surrak, Elusive Hunter', '{2}{G}', 'Human Warrior', 4, 3, '此咒語不能被反擊。\n踐踏\n每當一個由你操控的生物成為對手的咒語或異能的目標時，抓一張牌。', {
  supertypes: ['Legendary'],
  keywords: ['trample'],
  abilities: [trig('allyTargeted', [{ e: 'draw', n: 1 }])],
});
cr(S, 'U', 'Dragon Sniper', '{G}', 'Human Archer', 1, 1, '延勢，警戒，死觸', { keywords: ['reach', 'vigilance', 'deathtouch'] });
sorc(S, 'U', 'Knockout Maneuver', '{2}{G}', '在目標由你操控的生物上放置一個+1/+1指示物，然後它對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'bite', a: 'T0', b: 'T1' }],
});
inst(S, 'C', "Sarkhan's Resolve", '{1}{G}', '選擇一項：\n• 目標生物得+3/+3直到回合結束。\n• 消滅目標具飛行異能的生物。', {
  modes: [
    { text: '+3/+3', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 3 }] },
    { text: '消滅飛行生物', targets: [{ kind: 'creature', filter: { kw: 'flying' } }], effects: [destroyT0] },
  ],
});
cr(S, 'C', 'Trade Route Envoy', '{3}{G}', 'Dog Soldier', 4, 3, '當此生物進戰場時，若你操控上面有指示物的生物，抓一張牌。否則在此生物上放置一個+1/+1指示物。', {
  abilities: [etb([{ e: 'if', cond: HAS_COUNTERED, then: [{ e: 'draw', n: 1 }], else: [{ e: 'counters', what: 'self', n: 1 }] }])],
});
cr(S, 'C', 'Undergrowth Leopard', '{1}{G}', 'Cat', 2, 2, '警戒\n{1}，犧牲此生物：消滅目標神器或結界。', {
  keywords: ['vigilance'],
  abilities: [act({ mana: '{1}', sacSelf: true }, [destroyT0], '犧牲：消滅神器或結界', { targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] } }] })],
});
cr(S, 'C', 'Sultai Devotee', '{1}{G}', 'Zombie Snake Druid', 2, 1, '死觸', { keywords: ['deathtouch'] });

// ---------------- 多色 ----------------
inst(S, 'M', 'Jeskai Revelation', '{4}{U}{R}{W}', '將目標非地永久物移回其擁有者手上。對任意一個目標造成4點傷害。派出兩個1/1白色，具勇行異能的武僧衍生生物。抓兩張牌。你獲得4點生命。', {
  targets: [{ ...OPP_NONLAND, optional: true }, ANY],
  effects: [
    { e: 'bounce', what: 'T0' },
    { e: 'damage', n: 4, to: 'T1' },
    { e: 'token', token: 'tok-monk', n: 2 },
    { e: 'draw', n: 2 },
    { e: 'gain', n: 4 },
  ],
});
ench(S, 'M', 'Dragonback Assault', '{3}{G}{U}{R}', '當此結界進戰場時，它對每個生物各造成3點傷害。\n地落—每當一個地在你的操控下進戰場時，派出一個4/4紅色，具飛行異能的龍衍生生物。', {
  abilities: [etb([{ e: 'damage', n: 3, to: { all: { type: 'Creature' } } }]), trig('landfall', [{ e: 'token', token: 'tok-dragon44' }])],
});
cr(S, 'R', 'Felothar, Dawn of the Abzan', '{W}{B}{G}', 'Human Warrior', 3, 3, '踐踏\n每當此生物進戰場或攻擊時，你可以犧牲一個非地永久物。若你如此作，在每個由你操控的生物上各放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['trample'],
  abilities: [
    etb([{ e: 'costThen', prompt: '犧牲一個非地永久物讓全體+1/+1指示物？', cost: { sac: { nonType: 'Land', other: true } }, then: [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }] }]),
    trig('attacks', [{ e: 'costThen', prompt: '犧牲一個非地永久物讓全體+1/+1指示物？', cost: { sac: { nonType: 'Land', other: true } }, then: [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }] }]),
  ],
});
inst(S, 'R', 'Inevitable Defeat', '{1}{R}{W}{B}', '此咒語不能被反擊。\n放逐目標非地永久物。其操控者失去3點生命，且你獲得3點生命。', {
  targets: [OPP_NONLAND],
  effects: [{ e: 'lose', n: 3, who: 'T0ctrl' }, { e: 'gain', n: 3 }, { e: 'exile', what: 'T0' }],
});
cr(S, 'U', 'Armament Dragon', '{3}{W}{B}{G}', 'Dragon', 3, 4, '飛行\n當此生物進戰場時，將三個+1/+1指示物分配到一至三個目標由你操控的生物上。', {
  keywords: ['flying'],
  abilities: [
    etb([{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }, { e: 'counters', what: 'T2', n: 1 }], {
      targets: [MY_CR, { ...MY_CR, optional: true }, { ...MY_CR, optional: true }],
    }),
  ],
});
cr(S, 'U', 'Cori Mountain Stalwart', '{1}{R}{W}', 'Human Monk', 3, 3, '疾風—每當你施放本回合的第二個咒語時，此生物對每位對手各造成2點傷害，且你獲得2點生命。', {
  abilities: [trig('castAny', [{ e: 'damage', n: 2, to: 'opp' }, { e: 'gain', n: 2 }], { cond: FLURRY })],
});
sorc(S, 'U', 'Defibrillating Current', '{2/R}{2/W}{2/B}', '對目標生物造成4點傷害，且你獲得2點生命。', {
  targets: [CR],
  effects: [{ e: 'damage', n: 4, to: 'T0' }, { e: 'gain', n: 2 }],
});
cr(S, 'U', 'Effortless Master', '{2}{U}{R}', 'Orc Monk', 4, 3, '警戒，威懾\n當此生物進戰場時，若你本回合施放過兩個或更多咒語，在其上放置兩個+1/+1指示物。', {
  keywords: ['vigilance', 'menace'],
  abilities: [etb([{ e: 'counters', what: 'self', n: 2 }], { cond: { c: 'spellsCast', n: 2 } })],
});
inst(S, 'U', 'Frontline Rush', '{R}{W}', '選擇一項：\n• 派出兩個1/1紅色鬼怪衍生生物。\n• 目標生物得+X/+X直到回合結束，X為由你操控的生物數量。', {
  modes: [
    { text: '派出兩個鬼怪', effects: [{ e: 'token', token: 'tok-goblin', n: 2 }] },
    { text: '+X/+X', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: { count: { type: 'Creature', ctrl: 'you' } }, t: { count: { type: 'Creature', ctrl: 'you' } } }] },
  ],
});
cr(S, 'U', 'Hardened Tactician', '{1}{W}{B}', 'Human Warrior', 2, 4, '{1}，犧牲一個衍生物：抓一張牌。', {
  abilities: [act({ mana: '{1}', sacOther: { token: true } }, [{ e: 'draw', n: 1 }], '犧牲衍生物：抓一張牌')],
});
cr(S, 'U', 'Jeskai Brushmaster', '{1}{U}{R}{W}', 'Orc Monk', 2, 4, '連擊，勇行', { keywords: ['double_strike', 'prowess'] });
cr(S, 'U', 'Jeskai Shrinekeeper', '{2}{U}{R}{W}', 'Dragon', 3, 3, '飛行，敏捷\n每當此生物對玩家造成戰鬥傷害時，你獲得1點生命並抓一張牌。', {
  keywords: ['flying', 'haste'],
  abilities: [trig('combatDamagePlayer', [{ e: 'gain', n: 1 }, { e: 'draw', n: 1 }])],
});
cr(S, 'U', 'Karakyk Guardian', '{3}{G}{U}{R}', 'Dragon', 6, 5, '飛行，警戒，踐踏', { keywords: ['flying', 'vigilance', 'trample'] });
inst(S, 'U', 'Kin-Tree Severance', '{2/W}{2/B}{2/G}', '放逐目標法術力值為3或更多的永久物。', {
  targets: [{ kind: 'permanent', filter: { mvMin: 3 } }],
  effects: [{ e: 'exile', what: 'T0' }],
});
cr(S, 'U', 'Marshal of the Lost', '{2}{W}{B}', 'Orc Warrior', 3, 3, '死觸\n每當你攻擊時，目標生物得+X/+X直到回合結束，X為進行攻擊的生物數量。', {
  keywords: ['deathtouch'],
  abilities: [
    trig('youAttack', [{ e: 'pump', what: 'T0', p: { count: { type: 'Creature', ctrl: 'you', attacking: true } }, t: { count: { type: 'Creature', ctrl: 'you', attacking: true } } }], {
      targets: [{ kind: 'creature', filter: { ctrl: 'you', attacking: true } }],
    }),
  ],
});
inst(S, 'U', "Rakshasa's Bargain", '{2/B}{2/G}{2/U}', '檢視你牌庫頂的四張牌。將其中兩張置於你手上，其餘置入你的墳墓場。', {
  effects: [{ e: 'dig', n: 4, take: 2, rest: 'graveyard' }],
});
cr(S, 'U', 'Skirmish Rhino', '{W}{B}{G}', 'Rhino', 3, 4, '踐踏\n當此生物進戰場時，每位對手失去2點生命，且你獲得2點生命。', {
  keywords: ['trample'],
  abilities: [etb([{ e: 'lose', n: 2, who: 'opp' }, { e: 'gain', n: 2 }])],
});
cr(S, 'U', 'Sonic Shrieker', '{2}{R}{W}{B}', 'Dragon', 4, 4, '飛行\n當此生物進戰場時，它對任意一個目標造成2點傷害，且你獲得2點生命。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'damage', n: 2, to: 'T0' }, { e: 'gain', n: 2 }], { targets: [ANY] })],
});
cr(S, 'C', 'Boulderborn Dragon', '{5}', 'Dragon', 3, 3, '飛行，警戒\n每當此生物攻擊時，刺探1。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying', 'vigilance'],
  abilities: [trig('attacks', [{ e: 'surveil', n: 1 }])],
});
cr(S, 'C', 'Jade-Cast Sentinel', '{4}', 'Ape Snake', 1, 5, '延勢', { types: ['Artifact', 'Creature'], keywords: ['reach'] });
cr(S, 'C', 'Reputable Merchant', '{2/W}{2/B}{2/G}', 'Human Citizen', 2, 2, '當此生物進戰場或死去時，在目標由你操控的生物上放置一個+1/+1指示物。', {
  abilities: [
    etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] }),
    trig('dies', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...MY_CR, optional: true }] }),
  ],
});
cr(S, 'C', 'Temur Tawnyback', '{2/G}{2/U}{2/R}', 'Beast', 4, 3, '當此生物進戰場時，抓一張牌，然後棄一張牌。', {
  abilities: [etb([{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }])],
});
