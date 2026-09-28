// Marvel Super Heroes（MSH，2026 年 6 月）
// 強化（Power-up）：此異能每回合只能起動一次。
import type { Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, OPP_NONLAND, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'MSH';
const HERO = { sub: 'Hero' };

const gainland = (name: string, a: Mana, b: Mana) =>
  land(S, 'C', name, [a, b], `此地橫置進戰場。\n當此地進戰場時，你獲得1點生命。\n{T}：加{${a}}或{${b}}。`, {
    etbTapped: true,
    abilities: [etb([{ e: 'gain', n: 1 }])],
  });
gainland('A.I.M. Labs', 'U', 'B');
gainland('Asgardian Citadel', 'R', 'W');
gainland('Avengers Hangar', 'W', 'U');
gainland('Birnin Zana Plaza', 'G', 'W');
gainland('Fisk Tower', 'W', 'B');
gainland("Hell's Kitchen", 'B', 'R');
gainland('Los Diablos Missile Base', 'R', 'G');
gainland('Pym Technologies', 'G', 'U');
gainland('Stark Industries', 'U', 'R');
gainland('Subterranean Cavern', 'B', 'G');
// 未橫置的雙色地（簡化：永遠可以產生兩種顏色）
const lair = (name: string, a: Mana, b: Mana) =>
  land(S, 'R', name, ['C', a, b], `{T}：加{C}。\n{T}：加{${a}}或{${b}}。`);
lair('Dark Fortress', 'B', 'R');
lair('Gathering Place', 'G', 'W');
lair('Gleaming Bastion', 'W', 'U');
lair('Hidden Lair', 'U', 'B');
lair('Training Compound', 'R', 'G');

// ---------------- 白 ----------------
ench(S, 'M', 'Avengers Assemble!', '{4}{W}', '閃現\n由你操控的英雄得+2/+2。\n在你的結束步驟開始時，若你操控英雄，抓一張牌。', {
  keywords: ['flash'],
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', ...HERO }, grant: { p: 2, t: 2 } } },
    trig('endStep', [{ e: 'draw', n: 1 }], { cond: { c: 'controls', filter: { type: 'Creature', ...HERO } } }),
  ],
});
cr(S, 'R', 'Agent Phil Coulson', '{1}{W}', 'Human Spy Hero', 2, 2, '警戒\n{T}：在每個由你操控的其他英雄上各放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['vigilance'],
  abilities: [act({ tap: true }, [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', other: true, ...HERO } }, n: 1 }], '英雄+1/+1指示物')],
});
cr(S, 'R', 'Captain America, Wings of Freedom', '{2}{W}', 'Human Soldier Hero', 3, 1, '飛行，先攻，守護{1}\n每當此生物攻擊時，由你操控的其他英雄得+1/+1直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['flying', 'first_strike'],
  ward: 1,
  abilities: [trig('attacks', [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', other: true, ...HERO } }, p: 1, t: 1 }])],
});
cr(S, 'U', 'Okoye, Dora Milaje Leader', '{3}{W}', 'Human Warrior Hero', 3, 2, '當此生物進戰場時，派出兩個1/1白色士兵衍生生物。\n由你操控、正在攻擊的衍生生物具有先攻異能。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'token', token: 'tok-soldier', n: 2 }]),
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', token: true, attacking: true }, grant: { kw: ['first_strike'] } } },
  ],
});
cr(S, 'U', 'Patriot, Shield Wielder', '{1}{W}', 'Human Hero', 2, 2, '{2}，{T}：另一個目標由你操控的生物得+2/+0並獲得辟邪異能直到回合結束。', {
  supertypes: ['Legendary'],
  abilities: [
    act({ mana: '{2}', tap: true }, [{ e: 'pump', what: 'T0', p: 2, t: 0, kw: ['hexproof'] }], '+2/+0 並獲得辟邪', {
      targets: [{ ...MY_CR, notSelf: true }],
    }),
  ],
});
cr(S, 'U', 'Quake, Agent of S.H.I.E.L.D.', '{2}{W}', 'Inhuman Spy Hero', 3, 3, '每當你施放非生物咒語時，橫置目標生物。', {
  supertypes: ['Legendary'],
  abilities: [trig('castNoncreature', [{ e: 'tap', what: 'T0' }], { targets: [OPP_CR] })],
});
ench(S, 'U', 'Super Villain Lockup', '{1}{W}', '閃現\n當此結界進戰場時，放逐目標由對手操控的已橫置生物，直到此結界離開戰場為止。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [{ kind: 'creature', filter: { ctrl: 'opp', tapped: true } }] })],
});
cr(S, 'C', 'Agent of Atlas', '{1}{W}', 'Human Spy Hero', 2, 2, '勇行', { keywords: ['prowess'] });
cr(S, 'C', 'Brave Brawler', '{1}{W}', 'Human Warrior Hero', 2, 1, '繫命\n強化—{4}{W}：在此生物上放置兩個+1/+1指示物。', {
  keywords: ['lifelink'],
  abilities: [act({ mana: '{4}{W}' }, [{ e: 'counters', what: 'self', n: 2 }], '強化：+2指示物', { oncePerTurn: true, sorcery: true })],
});
cr(S, 'C', 'Hero in Training', '{2}{W}', 'Human Hero', 2, 2, '當此生物進戰場時，抓一張牌。若你操控另一個英雄，你獲得2點生命。', {
  abilities: [
    etb([{ e: 'draw', n: 1 }, { e: 'if', cond: { c: 'controls', filter: { type: 'Creature', other: true, ...HERO } }, then: [{ e: 'gain', n: 2 }] }]),
  ],
});
cr(S, 'C', 'Kree Commandos', '{2}{W}', 'Kree Soldier Villain', 2, 1, '飛行，警戒，勇行', { keywords: ['flying', 'vigilance', 'prowess'] });
cr(S, 'C', 'Raft Security Officer', '{1}{W}', 'Human Soldier', 1, 3, '{2}，{T}：橫置目標生物。', {
  abilities: [act({ mana: '{2}', tap: true }, [{ e: 'tap', what: 'T0' }], '橫置生物', { targets: [OPP_CR] })],
});
sorc(S, 'C', 'Borough Backup', '{4}{W}', '派出兩個3/2白色，具警戒異能的英雄衍生生物。', { effects: [{ e: 'token', token: 'tok-hero', n: 2 }] });
inst(S, 'C', 'Take Up the Shield', '{1}{W}', '在目標生物上放置一個+1/+1指示物。它獲得繫命與不滅異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['lifelink', 'indestructible'] }],
});
cr(S, 'C', 'Wakandan Drone Flock', '{3}{W}', 'Robot', 3, 3, '飛行\n當此生物進戰場時，占卜2。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [etb([{ e: 'scry', n: 2 }])],
});

// ---------------- 藍 ----------------
cr(S, 'R', 'The Wondrous Wasp', '{1}{U}', 'Human Hero', 2, 1, '閃現，飛行\n當此生物進戰場時，橫置至多一個目標生物。', {
  supertypes: ['Legendary'],
  keywords: ['flash', 'flying'],
  abilities: [etb([{ e: 'tap', what: 'T0' }], { targets: [{ kind: 'creature', optional: true }] })],
});
sorc(S, 'U', 'Pym Particles', '{U}', '目標生物獲得警戒異能且本回合不能被阻擋。抓一張牌。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['vigilance', 'unblockable'] }, { e: 'draw', n: 1 }],
});
cr(S, 'U', 'Kid Loki', '{U}', 'God Hero Villain', 1, 1, '每當你於一回合中抓第二張牌時，在此生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  abilities: [trig('drawSecond', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'U', 'Mister Fantastic, Reed Richards', '{3}{U}', 'Human Scientist Hero', 2, 4, '延勢\n每當一個衍生物在你的操控下進戰場時，你可以抓一張牌。此異能每回合只會觸發一次。', {
  supertypes: ['Legendary'],
  keywords: ['reach'],
  abilities: [trig('allyEtb', [{ e: 'draw', n: 1 }], { filter: { token: true }, oncePerTurn: true })],
});
cr(S, 'C', 'Atlantean Cavalry', '{2}{U}', 'Merfolk Soldier', 3, 2, '警戒\n每當你於一回合中抓第二張牌時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['vigilance'],
  abilities: [trig('drawSecond', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'C', 'Aerial Doombot', '{U}', 'Robot Villain', 1, 1, '飛行\n強化—{5}{U}：在此生物上放置三個+1/+1指示物。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [act({ mana: '{5}{U}' }, [{ e: 'counters', what: 'self', n: 3 }], '強化：+3指示物', { oncePerTurn: true, sorcery: true })],
});
cr(S, 'C', 'Bold Biochemist', '{1}{U}', 'Human Scientist', 1, 3, '強化—{5}{U}：在此生物上放置一個+1/+1指示物並抓兩張牌。', {
  abilities: [act({ mana: '{5}{U}' }, [{ e: 'counters', what: 'self', n: 1 }, { e: 'draw', n: 2 }], '強化：抓兩張牌', { oncePerTurn: true, sorcery: true })],
});
inst(S, 'C', 'Depower', '{2}{U}', '目標生物得-4/-0直到回合結束。抓一張牌。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: -4, t: 0 }, { e: 'draw', n: 1 }],
});
arti(S, 'C', 'Futurist Forge', '{1}{U}', '當此神器進戰場時，抓一張牌。\n{3}{U}，犧牲此神器：抓兩張牌。', {
  abilities: [etb([{ e: 'draw', n: 1 }]), act({ mana: '{3}{U}', sacSelf: true }, [{ e: 'draw', n: 2 }], '犧牲：抓兩張牌')],
});
cr(S, 'C', 'Giant-Sized Flying Ant', '{3}{U}', 'Insect', 3, 2, '閃現，飛行\n當此生物進戰場時，橫置目標非地永久物。', {
  keywords: ['flash', 'flying'],
  abilities: [etb([{ e: 'tap', what: 'T0' }], { targets: [{ ...OPP_NONLAND, optional: true }] })],
});
cr(S, 'C', 'H.E.R.B.I.E. Scout Unit', '{4}', 'Robot Scout', 2, 1, '飛行\n當此生物進戰場時，抓一張牌，然後你可以將一張地牌從你手上放進戰場。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [etb([{ e: 'draw', n: 1 }, { e: 'landFromHand' }])],
});
cr(S, 'C', 'S.H.I.E.L.D. Deployment Drone', '{2}{U}', 'Robot', 2, 2, '飛行\n當此生物進戰場時，派出一個1/1白色士兵衍生生物。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [etb([{ e: 'token', token: 'tok-soldier' }])],
});

// ---------------- 黑 ----------------
inst(S, 'U', 'Dark Deed', '{1}{B}', '目標生物得-4/-4直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -4, t: -4 }] });
cr(S, 'U', 'Crossbones, Malicious Mercenary', '{3}{B}', 'Human Mercenary Villain', 3, 3, '死觸\n每當另一個反派在你的操控下進戰場時，在此生物上放置一個+1/+1指示物，且它對每位對手各造成2點傷害。此異能每回合只會觸發一次。', {
  supertypes: ['Legendary'],
  keywords: ['deathtouch'],
  abilities: [
    trig('allyEtb', [{ e: 'counters', what: 'self', n: 1 }, { e: 'damage', n: 2, to: 'opp' }], { filter: { sub: 'Villain' }, oncePerTurn: true }),
  ],
});
cr(S, 'C', 'Agents of HYDRA', '{1}{B}', 'Human Spy Villain', 1, 1, '當此生物死去時，派出一個2/1黑色，具威懾異能的反派衍生生物。', {
  abilities: [trig('dies', [{ e: 'token', token: 'tok-villain' }])],
});
ench(S, 'C', 'HYDRA Infiltration', '{3}{B}', '當此結界進戰場時，目標對手棄兩張牌。', {
  abilities: [etb([{ e: 'discard', n: 2, who: 'T0' }], { targets: [OPP] })],
});
inst(S, 'C', 'Hour of Defeat', '{3}{B}', '消滅目標生物。刺探1。', { targets: [CR], effects: [destroyT0, { e: 'surveil', n: 1 }] });
cr(S, 'C', "Kingpin's Enforcers", '{2}{B}', 'Human Villain', 2, 3, '繫命\n{2}{B}，犧牲一個神器或生物：抓一張牌。', {
  keywords: ['lifelink'],
  abilities: [act({ mana: '{2}{B}', sacOther: { type: ['Artifact', 'Creature'] } }, [{ e: 'draw', n: 1 }], '犧牲：抓一張牌')],
});
cr(S, 'C', 'Ninja of the Hand', '{2}{B}', 'Human Ninja Villain', 2, 2, '死觸\n強化—{4}{B}：每位對手各棄一張牌。在此生物上放置一個+1/+1指示物。', {
  keywords: ['deathtouch'],
  abilities: [
    act({ mana: '{4}{B}' }, [{ e: 'discard', n: 1, who: 'opp' }, { e: 'counters', what: 'self', n: 1 }], '強化：對手棄牌', { oncePerTurn: true, sorcery: true }),
  ],
});
inst(S, 'C', 'Visions of Villainy', '{2}{B}', '你抓兩張牌並失去2點生命。', { effects: [{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'you' }] });

// ---------------- 紅 ----------------
cr(S, 'U', 'Red Hulk', '{4}{R}{R}', 'Gamma Berserker Villain', 6, 7, '延勢，踐踏\n激怒—每當此生物受到傷害時，在其上放置一個+1/+1指示物，然後它對另一個任意目標造成傷害，其數量等同於其上的+1/+1指示物數量。', {
  supertypes: ['Legendary'],
  keywords: ['reach', 'trample'],
  abilities: [
    trig('dealtDamage', [{ e: 'counters', what: 'self', n: 1 }, { e: 'damage', n: { selfCounters: true }, to: 'T0' }], {
      targets: [{ ...ANY, notSelf: true }],
    }),
  ],
});
inst(S, 'U', 'Truck Toss', '{2}{R}{R}', '對任意一個目標造成4點傷害。', { targets: [ANY], effects: [{ e: 'damage', n: 4, to: 'T0' }] });
cr(S, 'C', 'Volcanic Villain', '{2}{R}', 'Elemental Villain', 3, 2, '敏捷\n強化—{5}{R}：在此生物上放置兩個+1/+1指示物。', {
  keywords: ['haste'],
  abilities: [act({ mana: '{5}{R}' }, [{ e: 'counters', what: 'self', n: 2 }], '強化：+2指示物', { oncePerTurn: true, sorcery: true })],
});
inst(S, 'C', 'Hire a Crew', '{2}{R}', '派出一個2/1黑色，具威懾異能的反派衍生生物，然後由你操控的生物得+1/+0直到回合結束。', {
  effects: [{ e: 'token', token: 'tok-villain' }, { e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 0 }],
});
inst(S, 'C', 'Blazing Crescendo', '{1}{R}', '目標生物得+3/+1直到回合結束。放逐你牌庫頂的一張牌，本回合你可以使用該牌。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 3, t: 1 }, { e: 'impulse', n: 1 }],
});
cr(S, 'C', 'Kree Sentinel', '{4}{R}', 'Kree Robot Villain', 5, 5, '延勢', { types: ['Artifact', 'Creature'], keywords: ['reach'] });
ench(S, 'C', 'Super Speed', '{R}', '閃現\n結附於生物\n所結附的生物得+1/+0且具有敏捷異能。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 1, kw: ['haste'] } },
});

// ---------------- 綠 ----------------
cr(S, 'U', 'Hulkling, Burgeoning Bruiser', '{2}{G}', 'Kree Skrull Hero', 2, 3, '警戒\n每當另一個力量為3或更多的生物在你的操控下進戰場時，在此生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['vigilance'],
  abilities: [trig('allyEtb', [{ e: 'counters', what: 'self', n: 1 }], { filter: { powMin: 3 } })],
});
inst(S, 'U', 'Punishing Punch', '{2}{G}', '目標由你操控的生物對目標由對手操控的生物造成傷害，其數量等同於其力量的兩倍。', {
  targets: [MY_CR, OPP_CR],
  effects: [
    { e: 'bite', a: 'T0', b: 'T1' },
    { e: 'bite', a: 'T0', b: 'T1' },
  ],
});
cr(S, 'U', 'Tigra, Feline Fury', '{1}{G}', 'Cat Human Hero', 2, 1, '閃現，踐踏\n每當你獲得生命時，在此生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['flash', 'trample'],
  abilities: [trig('lifegain', [{ e: 'counters', what: 'self', n: 1 }])],
});
ench(S, 'U', 'Training Regimen', '{3}{G}', '由你操控、上面有+1/+1指示物的生物具有踐踏異能。\n在你回合的戰鬥開始時，在目標由你操控的生物上放置一個+1/+1指示物。', {
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', hasCounters: true }, grant: { kw: ['trample'] } } },
    trig('combatStart', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] }),
  ],
});
cr(S, 'C', 'Guerrilla Gorilla', '{1}{G}', 'Ape Soldier Hero', 2, 2, '延勢\n犧牲此生物：消滅目標非生物的神器或結界。只能於法術時機起動。', {
  keywords: ['reach'],
  abilities: [
    act({ sacSelf: true }, [destroyT0], '犧牲：消滅神器或結界', {
      sorcery: true,
      targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'], nonType: 'Creature' } }],
    }),
  ],
});
cr(S, 'C', 'Serpent Specialist', '{G}', 'Human Snake Villain', 1, 1, '死觸\n強化—{3}{G}：在此生物上放置兩個+1/+1指示物。', {
  keywords: ['deathtouch'],
  abilities: [act({ mana: '{3}{G}' }, [{ e: 'counters', what: 'self', n: 2 }], '強化：+2指示物', { oncePerTurn: true, sorcery: true })],
});
cr(S, 'C', 'Savage Land Dinosaur', '{4}{G}{G}', 'Dinosaur', 7, 6, '踐踏', { keywords: ['trample'] });
cr(S, 'C', 'Undercover Skrull', '{1}{G}', 'Skrull Shapeshifter Villain', 1, 1, '只要你的墳墓場中有兩張或更多生物牌，此生物得+2/+2。\n{T}：加一點任意顏色的法術力。', {
  produces: ['W', 'U', 'B', 'R', 'G'],
  abilities: [{ kind: 'static', self: { cond: { c: 'gyCount', filter: { type: 'Creature' }, n: 2 }, grant: { p: 2, t: 2 } } }],
});
cr(S, 'C', 'Wakandan Royal Guard', '{4}{G}', 'Human Soldier Hero', 4, 4, '警戒\n當此生物進戰場時，在目標生物上放置一個+1/+1指示物。若該生物是另一個英雄，改為放置兩個。', {
  keywords: ['vigilance'],
  abilities: [
    etb([{ e: 'if', cond: { c: 'targetIs', t: 0, filter: HERO }, then: [{ e: 'counters', what: 'T0', n: 2 }], else: [{ e: 'counters', what: 'T0', n: 1 }] }], {
      targets: [{ ...MY_CR, notSelf: true, optional: true }],
    }),
  ],
});
sorc(S, 'C', 'Restorative Technique', '{2}{G}', '你獲得2點生命，然後從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。在至多一個目標生物上放置一個+1/+1指示物。', {
  targets: [{ kind: 'creature', optional: true }],
  effects: [{ e: 'gain', n: 2 }, { e: 'searchLand', to: 'battlefield', tapped: true }, { e: 'counters', what: 'T0', n: 1 }],
});

// ---------------- 多色／無色 ----------------
cr(S, 'R', 'Wolverine, Fierce Fighter', '{2}{R}{G}', 'Mutant Berserker Hero', 3, 5, '敏捷\n當此生物進戰場時，它與至多一個另外的目標生物互鬥。', {
  supertypes: ['Legendary'],
  keywords: ['haste'],
  abilities: [etb([{ e: 'fight', a: 'self', b: 'T0' }], { targets: [{ ...OPP_CR, optional: true }] })],
});
cr(S, 'R', 'Storm, Windrider', '{1}{G}{W}{W}', 'Mutant Hero', 4, 4, '飛行', { supertypes: ['Legendary'], keywords: ['flying'] });
cr(S, 'U', 'Thor Odinson', '{3}{R}{W}', 'God Warrior Hero', 4, 4, '飛行，警戒，勇行，勇行（每當你施放非生物咒語時，此生物得+2/+2直到回合結束。）', {
  supertypes: ['Legendary'],
  keywords: ['flying', 'vigilance', 'prowess'],
  abilities: [trig('castNoncreature', [{ e: 'pump', what: 'self', p: 1, t: 1 }])],
});
cr(S, 'U', 'Ghost, Spectral Saboteur', '{2}{U/B}', 'Human Rogue Villain', 2, 2, '閃現\n此生物不能被阻擋。', {
  supertypes: ['Legendary'],
  keywords: ['flash', 'unblockable'],
});
cr(S, 'U', 'Spider-Woman, Secret Agent', '{3}{W/U}', 'Spider Human Spy Hero', 1, 4, '閃現\n當此生物進戰場時，橫置目標由對手操控的生物，並在其上放置一個暈眩指示物。', {
  supertypes: ['Legendary'],
  keywords: ['flash'],
  abilities: [etb([{ e: 'tap', what: 'T0' }, { e: 'stun', what: 'T0' }], { targets: [OPP_CR] })],
});
cr(S, 'U', 'Black Widow, Double Agent', '{1}{W}{B}', 'Human Hero Villain', 3, 2, '死觸', { supertypes: ['Legendary'], keywords: ['deathtouch'] });
cr(S, 'U', 'Black Panther, Vanguard', '{2}{G}{W}', 'Human Warrior Hero', 4, 4, '每當另一個非衍生物的英雄在你的操控下進戰場時，派出一個1/1白色士兵衍生生物。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyEtb', [{ e: 'token', token: 'tok-soldier' }], { filter: { token: false, ...HERO } })],
});
cr(S, 'U', 'U.S.Agent, John Walker', '{3}{W/B}', 'Human Soldier Hero', 3, 2, '當此生物進戰場時，派出一個名為堅固盾牌的無色武具神器衍生物，它具有「佩帶此武具的生物得+1/+2」與裝備{2}。將它裝備到此生物上。', {
  supertypes: ['Legendary'],
  abilities: [etb([{ e: 'token', token: 'tok-sturdy-shield', attachTo: 'self' }])],
});
cr(S, 'U', 'War Machine, Legacy of Iron', '{2}{R/W}', 'Human Hero', 1, 3, '飛行\n在你回合的戰鬥開始時，另一個目標由你操控的生物得+X/+0直到回合結束，X為此生物的力量。', {
  supertypes: ['Legendary'],
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [
    trig('combatStart', [{ e: 'pump', what: 'T0', p: { power: 'self' }, t: 0 }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] }),
  ],
});
arti(S, 'C', 'Vibranium Energy Daggers', '{1}', '不滅\n佩帶此武具的生物得+2/+2。\n裝備{3}', {
  subtypes: ['Equipment'],
  keywords: ['indestructible'],
  equip: { cost: '{3}', grant: { p: 2, t: 2 } },
});
cr(S, 'C', 'A.I.M. Synthoids', '{2}', 'Robot Villain', 1, 3, '當此生物進戰場時，刺探2。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([{ e: 'surveil', n: 2 }])],
});
