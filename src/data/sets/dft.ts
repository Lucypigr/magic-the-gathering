// Aetherdrift（DFT，2025 年 2 月）
import type { Mana } from '../../engine/types';
import { CR, MY_CR, OPP, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'DFT';

// 未橫置的雙色地（簡化：永遠可以產生兩種顏色）
const verge = (name: string, a: Mana, b: Mana) => land(S, 'R', name, [a, b], `{T}：加{${a}}或{${b}}。`);
verge('Bleachbone Verge', 'B', 'W');
verge('Riverpyre Verge', 'R', 'U');
verge('Sunbillow Verge', 'W', 'R');
verge('Wastewood Verge', 'G', 'B');
verge('Willowrush Verge', 'U', 'G');

// ---------------- 白 ----------------
sorc(S, 'R', 'Spectacular Pileup', '{3}{W}{W}', '所有生物失去不滅異能，然後消滅所有生物。', {
  effects: [{ e: 'destroy', what: { all: { type: 'Creature' } } }],
});
inst(S, 'U', 'Gallant Strike', '{1}{W}', '消滅目標防禦力為4或更多的生物。', {
  targets: [{ kind: 'creature', filter: { toughMin: 4 } }],
  effects: [destroyT0],
});
cr(S, 'U', 'Sundial, Dawn Tyrant', '{1}{W}', 'Construct', 3, 3, '', { supertypes: ['Legendary'], types: ['Artifact', 'Creature'] });
sorc(S, 'C', 'Collision Course', '{1}{W}', '選擇一項：\n• 對目標生物造成X點傷害，X為由你操控的生物數量。\n• 消滅目標神器。', {
  modes: [
    { text: '依生物數量造成傷害', targets: [CR], effects: [{ e: 'damage', n: { count: { type: 'Creature', ctrl: 'you' } }, to: 'T0' }] },
    { text: '消滅神器', targets: [{ kind: 'permanent', filter: { type: 'Artifact' } }], effects: [destroyT0] },
  ],
});
cr(S, 'C', 'Daring Mechanic', '{2}{W}', 'Human Artificer', 3, 3, '');
inst(S, 'C', 'Lightshield Parry', '{W}', '目標生物得+2/+2直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 2, t: 2 }] });
cr(S, 'C', 'Lotusguard Disciple', '{2}{W}', 'Bird Cleric', 2, 2, '飛行\n當此生物進戰場時，目標生物獲得繫命與不滅異能直到回合結束。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['lifelink', 'indestructible'] }], { targets: [{ ...MY_CR, optional: true }] })],
});
inst(S, 'C', "Ride's End", '{4}{W}', '若此咒語以已橫置的永久物為目標，則減少{3}來施放。\n放逐目標生物。', {
  modes: [
    { text: '放逐生物', targets: [CR], effects: [{ e: 'exile', what: 'T0' }] },
    { text: '放逐已橫置的生物（{1}{W}）', cost: '{1}{W}', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [{ e: 'exile', what: 'T0' }] },
  ],
});
cr(S, 'C', 'Voyager Quickwelder', '{2}{W}', 'Robot Artificer', 2, 4, '你施放的神器咒語減少{1}來施放。', {
  types: ['Artifact', 'Creature'],
  abilities: [{ kind: 'static', spellCostLess: { filter: { type: 'Artifact' }, n: 1 } }],
});

// ---------------- 藍 ----------------
cr(S, 'U', 'Caelorna, Coral Tyrant', '{1}{U}', 'Octopus', 0, 8, '', { supertypes: ['Legendary'] });
cr(S, 'U', 'Diversion Unit', '{1}{U}', 'Robot', 2, 1, '飛行\n{U}，犧牲此生物：反擊目標瞬間或法術咒語，除非其操控者支付{3}。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [
    act({ mana: '{U}', sacSelf: true }, [{ e: 'counterUnless', what: 'T0', pay: 3 }], '犧牲：反擊', {
      targets: [{ kind: 'spell', filter: { type: ['Instant', 'Sorcery'] } }],
    }),
  ],
});
cr(S, 'U', 'Memory Guardian', '{4}{U}', 'Robot Artificer', 3, 4, '飛行', { types: ['Artifact', 'Creature'], keywords: ['flying'] });
sorc(S, 'U', 'Roadside Blowout', '{2}{U}', '將目標由對手操控的生物移回其擁有者手上。抓一張牌。', {
  targets: [OPP_CR],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'draw', n: 1 }],
});
sorc(S, 'U', 'Stock Up', '{2}{U}', '檢視你牌庫頂的五張牌。將其中兩張置於你手上，其餘置於你的牌庫底。', {
  effects: [{ e: 'dig', n: 5, take: 2, rest: 'bottom' }],
});
inst(S, 'C', 'Bounce Off', '{U}', '將目標生物移回其擁有者手上。', { targets: [CR], effects: [{ e: 'bounce', what: 'T0' }] });
cr(S, 'C', 'Nimble Thopterist', '{3}{U}', 'Vedalken Artificer', 3, 2, '當此生物進戰場時，派出一個1/1無色，具飛行異能的機械鳥神器衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-thopter' }])],
});
inst(S, 'C', 'Spectral Interference', '{1}{U}', '反擊目標神器或生物咒語，除非其操控者支付{4}。', {
  targets: [{ kind: 'spell', filter: { type: ['Artifact', 'Creature'] } }],
  effects: [{ e: 'counterUnless', what: 'T0', pay: 4 }],
});
inst(S, 'C', 'Trip Up', '{3}{U}', '將目標非地永久物置於其擁有者的牌庫底。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'tuck', what: 'T0' }],
});

// ---------------- 黑 ----------------
cr(S, 'U', 'Kalakscion, Hunger Tyrant', '{1}{B}{B}', 'Crocodile', 7, 2, '', { supertypes: ['Legendary'] });
sorc(S, 'U', 'Hellish Sideswipe', '{B}', '作為施放此咒語的額外費用，犧牲一個神器或生物。\n消滅目標生物。', { targets: [CR], effects: [destroyT0] }, {
  addCost: { sac: { type: ['Artifact', 'Creature'] } },
});
sorc(S, 'U', 'Intimidation Tactics', '{B}', '目標對手展示其手牌。你從中選擇一張神器或生物牌，該玩家棄掉那張牌。', {
  targets: [OPP],
  effects: [{ e: 'discardChosen', who: 'T0', filter: { type: ['Artifact', 'Creature'] } }],
});
inst(S, 'U', 'Locust Spray', '{B}', '目標生物得-1/-1直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -1, t: -1 }] });
cr(S, 'U', 'Shefet Archfiend', '{5}{B}{B}', 'Demon', 5, 5, '飛行\n當此生物進戰場時，所有其他生物得-2/-2直到回合結束。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'pump', what: { all: { type: 'Creature', other: true } }, p: -2, t: -2 }])],
});
cr(S, 'U', 'Wickerfolk Indomitable', '{3}{B}', 'Scarecrow', 4, 3, '', { types: ['Artifact', 'Creature'] });
cr(S, 'U', 'Wretched Doll', '{1}{B}', 'Toy', 3, 1, '{B}，{T}：刺探1。', {
  types: ['Artifact', 'Creature'],
  abilities: [act({ mana: '{B}', tap: true }, [{ e: 'surveil', n: 1 }], '刺探1')],
});
cr(S, 'C', 'Engine Rat', '{B}', 'Zombie Rat', 1, 1, '死觸\n{5}{B}：每位對手失去2點生命。', {
  keywords: ['deathtouch'],
  abilities: [act({ mana: '{5}{B}' }, [{ e: 'lose', n: 2, who: 'opp' }], '對手失去2點生命')],
});
inst(S, 'C', 'Maximum Overdrive', '{1}{B}', '在目標生物上放置一個+1/+1指示物。它獲得死觸與不滅異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['deathtouch', 'indestructible'] }],
});
cr(S, 'C', 'Pactdoll Terror', '{3}{B}', 'Toy', 3, 4, '每當此生物或另一個神器在你的操控下進戰場時，每位對手失去1點生命，且你獲得1點生命。', {
  types: ['Artifact', 'Creature'],
  abilities: [
    etb([{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }]),
    trig('allyPermEtb', [{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }], { filter: { type: 'Artifact' } }),
  ],
});
sorc(S, 'C', 'Risky Shortcut', '{2}{B}', '抓兩張牌。每位玩家各失去2點生命。', {
  effects: [{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'players' }],
});
inst(S, 'C', 'Spin Out', '{1}{B}{B}', '消滅目標生物。', { targets: [CR], effects: [destroyT0] });
inst(S, 'C', 'Syphon Fuel', '{4}{B}', '目標生物得-6/-6直到回合結束。你獲得2點生命。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: -6, t: -6 }, { e: 'gain', n: 2 }],
});
cr(S, 'C', 'Wreckage Wickerfolk', '{1}{B}', 'Scarecrow', 1, 3, '飛行\n當此生物進戰場時，刺探2。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [etb([{ e: 'surveil', n: 2 }])],
});

// ---------------- 紅 ----------------
ench(S, 'R', 'Count on Luck', '{R}{R}{R}', '在你的維持開始時，放逐你牌庫頂的一張牌。本回合你可以使用該牌。', {
  abilities: [trig('upkeep', [{ e: 'impulse', n: 1 }])],
});
cr(S, 'U', 'Tyrox, Saurid Tyrant', '{1}{R}', 'Dinosaur Warrior', 4, 1, '', { supertypes: ['Legendary'] });
inst(S, 'U', 'Fuel the Flames', '{2}{R}', '對每個生物各造成2點傷害。', { effects: [{ e: 'damage', n: 2, to: { all: { type: 'Creature' } } }] });
inst(S, 'U', 'Road Rage', '{R}', '對目標生物造成2點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 2, to: 'T0' }] });
inst(S, 'U', 'Skycrash', '{1}{R}', '消滅目標神器。', { targets: [{ kind: 'permanent', filter: { type: 'Artifact' } }], effects: [destroyT0] });
inst(S, 'C', 'Crash and Burn', '{3}{R}', '對目標生物造成6點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 6, to: 'T0' }] });
cr(S, 'C', 'Thunderhead Gunner', '{4}{R}', 'Shark Pirate', 4, 5, '延勢', { keywords: ['reach'] });
arti(S, 'C', 'Scrap Compactor', '{1}', '{3}，{T}，犧牲此神器：它對目標生物造成3點傷害。\n{6}，{T}，犧牲此神器：消滅目標生物。', {
  abilities: [
    act({ mana: '{3}', tap: true, sacSelf: true }, [{ e: 'damage', n: 3, to: 'T0' }], '犧牲：3點傷害', { targets: [CR] }),
    act({ mana: '{6}', tap: true, sacSelf: true }, [destroyT0], '犧牲：消滅生物', { targets: [CR] }),
  ],
});

// ---------------- 綠 ----------------
cr(S, 'R', 'Regal Imperiosaur', '{1}{G}{G}', 'Dinosaur', 5, 4, '由你操控的其他恐龍得+1/+1。', {
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', sub: 'Dinosaur', other: true }, grant: { p: 1, t: 1 } } }],
});
cr(S, 'R', 'Webstrike Elite', '{G}{G}', 'Insect Archer', 3, 3, '延勢', { keywords: ['reach'] });
cr(S, 'U', 'Terrian, World Tyrant', '{2}{G}{G}{G}', 'Dinosaur Ooze', 9, 7, '', { supertypes: ['Legendary'] });
cr(S, 'U', 'Fang Guardian', '{3}{G}', 'Ape Druid', 4, 2, '閃現\n當此生物進戰場時，另一個目標由你操控的生物得+2/+2直到回合結束。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 2, t: 2 }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] })],
});
cr(S, 'U', 'Fang-Druid Summoner', '{3}{G}', 'Ape Druid', 2, 4, '延勢\n當此生物進戰場時，你可以從你的牌庫中搜尋一張沒有異能的生物牌，將它置於你手上。', {
  keywords: ['reach'],
  abilities: [etb([{ e: 'tutor', filter: { type: 'Creature', vanilla: true } }])],
});
sorc(S, 'U', 'Plow Through', '{G}', '目標由你操控的生物與目標由對手操控的生物互鬥。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'fight', a: 'T0', b: 'T1' }],
});
cr(S, 'C', 'Beastrider Vanguard', '{1}{G}', 'Human Knight', 2, 2, '{4}{G}：檢視你牌庫頂的三張牌。你可以展示其中一張永久物牌並置於你手上。將其餘的牌置於你的牌庫底。', {
  abilities: [act({ mana: '{4}{G}' }, [{ e: 'dig', n: 3, take: 1, rest: 'bottom', filter: { nonType: ['Instant', 'Sorcery'] } }], '檢視三張牌')],
});
inst(S, 'C', 'Bestow Greatness', '{2}{G}', '目標生物得+4/+4並獲得踐踏異能直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 4, t: 4, kw: ['trample'] }] });
inst(S, 'C', 'Broken Wings', '{2}{G}', '消滅目標神器、結界或具飛行異能的生物。', {
  targets: [{ kind: 'permanent', filter: { or: [{ type: ['Artifact', 'Enchantment'] }, { type: 'Creature', kw: 'flying' }] } }],
  effects: [destroyT0],
});
cr(S, 'C', 'Jibbirik Omnivore', '{1}{G}', 'Beast', 3, 2, '');
cr(S, 'C', 'Migrating Ketradon', '{4}{G}{G}', 'Dinosaur', 6, 6, '延勢\n當此生物進戰場時，你獲得4點生命。', { keywords: ['reach'], abilities: [etb([{ e: 'gain', n: 4 }])] });
inst(S, 'C', 'Run Over', '{1}{G}', '目標由你操控的生物對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'bite', a: 'T0', b: 'T1' }],
});
ench(S, 'C', 'Silken Strength', '{1}{G}', '閃現\n結附於生物\n當此靈氣進戰場時，重置所結附的生物。\n所結附的生物得+1/+2且具有延勢異能。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 1, t: 2, kw: ['reach'] } },
  abilities: [etb([{ e: 'untap', what: 'attached' }])],
});

// ---------------- 多色／無色 ----------------
cr(S, 'M', 'Pyrewood Gearhulk', '{2}{R}{R}{G}{G}', 'Construct', 7, 7, '警戒，威懾\n當此生物進戰場時，由你操控的其他生物得+2/+2並獲得警戒與威懾異能直到回合結束。', {
  types: ['Artifact', 'Creature'],
  keywords: ['vigilance', 'menace'],
  abilities: [etb([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', other: true } }, p: 2, t: 2, kw: ['vigilance', 'menace'] }])],
});
cr(S, 'M', 'Oildeep Gearhulk', '{U}{U}{B}{B}', 'Construct', 4, 4, '繫命，守護{1}\n當此生物進戰場時，檢視目標玩家的手牌。你可以從中選擇一張牌，該玩家棄掉那張牌，然後抓一張牌。', {
  types: ['Artifact', 'Creature'],
  keywords: ['lifelink'],
  ward: 1,
  abilities: [etb([{ e: 'discardChosen', who: 'T0' }, { e: 'draw', n: 1, who: 'T0' }], { targets: [OPP] })],
});
sorc(S, 'R', 'Explosive Getaway', '{3}{R}{W}', '對每個生物各造成4點傷害。', { effects: [{ e: 'damage', n: 4, to: { all: { type: 'Creature' } } }] });
cr(S, 'R', 'Fearless Swashbuckler', '{1}{U}{R}', 'Fish Pirate', 3, 3, '敏捷', { keywords: ['haste'] });
inst(S, 'U', 'Broadside Barrage', '{1}{U}{R}', '對目標生物造成5點傷害。抓一張牌，然後棄一張牌。', {
  targets: [CR],
  effects: [{ e: 'damage', n: 5, to: 'T0' }, { e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }],
});
arti(S, 'U', 'Broodheart Engine', '{B}{G}', '在你的維持開始時，刺探1。\n{2}{B}{G}，{T}，犧牲此神器：將目標生物牌從你的墳墓場移回戰場。只能於法術時機起動。', {
  abilities: [
    trig('upkeep', [{ e: 'surveil', n: 1 }]),
    act({ mana: '{2}{B}{G}', tap: true, sacSelf: true }, [{ e: 'reanimate', what: 'T0' }], '犧牲：重返戰場', {
      sorcery: true,
      targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' }],
    }),
  ],
});
sorc(S, 'U', 'Haunt the Network', '{3}{U}{B}', '派出兩個1/1無色，具飛行異能的機械鳥神器衍生生物。然後目標對手失去X點生命，且你獲得X點生命，X為由你操控的神器數量。', {
  targets: [OPP],
  effects: [
    { e: 'token', token: 'tok-thopter', n: 2 },
    { e: 'lose', n: { count: { type: 'Artifact', ctrl: 'you' } }, who: 'T0' },
    { e: 'gain', n: { count: { type: 'Artifact', ctrl: 'you' } } },
  ],
});
cr(S, 'U', 'Veteran Beastrider', '{1}{G}{W}', 'Human Knight', 3, 4, '在你的結束步驟開始時，重置每個由你操控的生物。\n{2}{G}{W}：由你操控的生物得+1/+1直到回合結束。', {
  abilities: [
    trig('endStep', [{ e: 'untap', what: { all: { type: 'Creature', ctrl: 'you' } } }]),
    act({ mana: '{2}{G}{W}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }], '全體+1/+1'),
  ],
});
cr(S, 'C', 'Aetherjacket', '{3}', 'Thopter', 2, 1, '飛行，警戒\n{2}，{T}，犧牲此生物：消滅另一個目標神器。只能於法術時機起動。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying', 'vigilance'],
  abilities: [
    act({ mana: '{2}', tap: true, sacSelf: true }, [destroyT0], '犧牲：消滅神器', {
      sorcery: true,
      targets: [{ kind: 'permanent', filter: { type: 'Artifact' }, notSelf: true }],
    }),
  ],
});
cr(S, 'C', 'Wreck Remover', '{4}', 'Construct', 3, 4, '每當此生物進戰場或攻擊時，你獲得1點生命。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([{ e: 'gain', n: 1 }]), trig('attacks', [{ e: 'gain', n: 1 }])],
});
