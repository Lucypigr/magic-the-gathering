// Edge of Eternities（EOE，2025 年 8 月）
import type { Cond } from '../../engine/types';
import { ANY, CR, MY_CR, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, shockland, sorc, trig } from '../dsl';

const S = 'EOE';
const TWO_TAPPED: Cond = { c: 'controls', filter: { type: 'Creature', tapped: true }, n: 2 };
const HAS_ARTIFACT: Cond = { c: 'controls', filter: { type: 'Artifact' } };
const SECOND: Cond = { c: 'secondSpell' };

shockland(S, 'Breeding Pool', 'G', 'U', 'Forest Island');
shockland(S, 'Godless Shrine', 'W', 'B', 'Plains Swamp');
shockland(S, 'Sacred Foundry', 'R', 'W', 'Mountain Plains');
shockland(S, 'Stomping Ground', 'R', 'G', 'Mountain Forest');
shockland(S, 'Watery Grave', 'U', 'B', 'Island Swamp');

// ---------------- 白 ----------------
cr(S, 'M', 'Cosmogrand Zenith', '{2}{W}', 'Human Soldier', 2, 4, '每當你施放本回合的第二個咒語時，派出兩個1/1白色人類士兵衍生生物。', {
  abilities: [trig('castAny', [{ e: 'token', token: 'tok-human-soldier', n: 2 }], { cond: SECOND })],
});
cr(S, 'U', 'Dawnstrike Vanguard', '{5}{W}', 'Human Knight', 4, 5, '繫命\n在你的結束步驟開始時，若你操控兩個或更多已橫置的生物，在每個由你操控的其他生物上各放置一個+1/+1指示物。', {
  keywords: ['lifelink'],
  abilities: [trig('endStep', [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', other: true } }, n: 1 }], { cond: TWO_TAPPED })],
});
cr(S, 'U', 'Dual-Sun Adepts', '{2}{W}', 'Human Soldier', 2, 2, '連擊\n{5}：由你操控的生物得+1/+1直到回合結束。', {
  keywords: ['double_strike'],
  abilities: [act({ mana: '{5}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }], '全體+1/+1')],
});
inst(S, 'U', 'Dual-Sun Technique', '{1}{W}', '目標由你操控的生物獲得連擊異能直到回合結束。若它上面有+1/+1指示物，抓一張牌。', {
  targets: [MY_CR],
  effects: [
    { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['double_strike'] },
    { e: 'if', cond: { c: 'targetIs', t: 0, filter: { hasCounters: true } }, then: [{ e: 'draw', n: 1 }] },
  ],
});
sorc(S, 'U', 'Honor', '{W}', '在目標生物上放置一個+1/+1指示物。抓一張牌。', {
  targets: [CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'draw', n: 1 }],
});
cr(S, 'U', 'Honored Knight-Captain', '{1}{W}', 'Human Advisor Knight', 1, 1, '當此生物進戰場時，派出一個1/1白色人類士兵衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-human-soldier' }])],
});
inst(S, 'U', 'Reroute Systems', '{W}', '選擇一項：\n• 目標神器或生物獲得不滅異能直到回合結束。\n• 對目標已橫置的生物造成2點傷害。', {
  modes: [
    { text: '獲得不滅', targets: [MY_CR], effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['indestructible'] }] },
    { text: '對已橫置的生物造成2點傷害', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [{ e: 'damage', n: 2, to: 'T0' }] },
  ],
});
ench(S, 'U', 'Seam Rip', '{W}', '當此結界進戰場時，放逐目標由對手操控、法術力值為2或更少的非地永久物，直到此結界離開戰場為止。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'opp', nonType: 'Land', mvMax: 2 } }] })],
});
cr(S, 'U', 'Sunstar Lightsmith', '{3}{W}', 'Human Artificer', 3, 3, '每當你施放本回合的第二個咒語時，在此生物上放置一個+1/+1指示物並抓一張牌。', {
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }, { e: 'draw', n: 1 }], { cond: SECOND })],
});
cr(S, 'C', 'Brightspear Zealot', '{2}{W}', 'Human Soldier', 2, 4, '警戒\n只要你本回合施放過兩個或更多咒語，此生物得+2/+0。', {
  keywords: ['vigilance'],
  abilities: [{ kind: 'static', self: { cond: { c: 'spellsCast', n: 2 }, grant: { p: 2 } } }],
});
cr(S, 'C', 'Dockworker Drone', '{1}{W}', 'Robot', 1, 1, '此生物進戰場時上面有一個+1/+1指示物。\n當此生物死去時，在目標由你操控的生物上放置一個+1/+1指示物。', {
  types: ['Artifact', 'Creature'],
  etbCounters: 1,
  abilities: [trig('dies', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...MY_CR, optional: true }] })],
});
cr(S, 'C', 'Exosuit Savior', '{2}{W}', 'Human Soldier', 2, 2, '飛行\n當此生物進戰場時，將至多一個另外的目標由你操控的永久物移回其擁有者手上。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'you', nonType: 'Land' }, notSelf: true, optional: true }] })],
});
cr(S, 'C', 'Flight-Deck Coordinator', '{2}{W}', 'Human Soldier', 3, 3, '在你的結束步驟開始時，若你操控兩個或更多已橫置的生物，你獲得2點生命。', {
  abilities: [trig('endStep', [{ e: 'gain', n: 2 }], { cond: TWO_TAPPED })],
});
cr(S, 'C', 'Luxknight Breacher', '{3}{W}', 'Human Knight', 2, 2, '此生物進戰場時，由你操控的其他生物及／或神器每有一個，它便得到一個+1/+1指示物。', {
  abilities: [etb([{ e: 'counters', what: 'self', n: { count: { ctrl: 'you', other: true, or: [{ type: 'Creature' }, { type: 'Artifact' }] } } }])],
});
inst(S, 'C', 'Radiant Strike', '{3}{W}', '消滅目標神器或已橫置的生物。你獲得3點生命。', {
  targets: [{ kind: 'permanent', filter: { or: [{ type: 'Artifact' }, { type: 'Creature', tapped: true }] } }],
  effects: [destroyT0, { e: 'gain', n: 3 }],
});
arti(S, 'C', "Squire's Lightblade", '{W}', '閃現\n當此武具進戰場時，將它裝備到目標由你操控的生物上。該生物獲得先攻異能直到回合結束。\n佩帶此武具的生物得+1/+0。\n裝備{3}', {
  subtypes: ['Equipment'],
  keywords: ['flash'],
  equip: { cost: '{3}', grant: { p: 1 } },
  abilities: [etb([{ e: 'attach', what: 'T0' }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['first_strike'] }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Starport Security', '{W}', 'Robot Soldier', 1, 1, '{3}{W}，{T}：橫置另一個目標生物。', {
  types: ['Artifact', 'Creature'],
  abilities: [act({ mana: '{3}{W}', tap: true }, [{ e: 'tap', what: 'T0' }], '橫置生物', { targets: [OPP_CR] })],
});
inst(S, 'C', 'Zealous Display', '{2}{W}', '由你操控的生物得+2/+0直到回合結束。若不是你的回合，重置這些生物。', {
  effects: [
    { e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 2, t: 0 },
    { e: 'if', cond: { c: 'notYourTurn' }, then: [{ e: 'untap', what: { all: { type: 'Creature', ctrl: 'you' } } }] },
  ],
});

// ---------------- 藍 ----------------
cr(S, 'M', 'Quantum Riddler', '{3}{U}{U}', 'Sphinx', 4, 6, '飛行\n當此生物進戰場時，抓一張牌。', { keywords: ['flying'], abilities: [etb([{ e: 'draw', n: 1 }])] });
cr(S, 'U', 'Gigastorm Titan', '{4}{U}', 'Elemental', 4, 4, '若你本回合施放過其他咒語，此咒語減少{3}來施放。', {
  costReduce: { cond: { c: 'spellsCast', n: 1 }, mana: '{3}' },
});
cr(S, 'U', 'Illvoi Infiltrator', '{2}{U}', 'Jellyfish Rogue', 1, 3, '只要你本回合施放過兩個或更多咒語，此生物不能被阻擋。\n每當此生物對玩家造成戰鬥傷害時，抓一張牌。', {
  abilities: [
    { kind: 'static', self: { cond: { c: 'spellsCast', n: 2 }, grant: { kw: ['unblockable'] } } },
    trig('combatDamagePlayer', [{ e: 'draw', n: 1 }]),
  ],
});
cr(S, 'U', 'Mechan Assembler', '{4}{U}', 'Robot Artificer', 4, 4, '每當另一個神器在你的操控下進戰場時，派出一個2/2無色機器人神器衍生生物。此異能每回合只會觸發一次。', {
  types: ['Artifact', 'Creature'],
  abilities: [trig('allyPermEtb', [{ e: 'token', token: 'tok-robot22' }], { filter: { type: 'Artifact' }, oncePerTurn: true })],
});
inst(S, 'U', 'Unravel', '{1}{U}{U}', '反擊目標咒語。', { targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] });
inst(S, 'U', 'Desculpting Blast', '{1}{U}', '將目標非地永久物移回其擁有者手上。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'bounce', what: 'T0' }],
});
inst(S, 'U', 'Scour for Scrap', '{3}{U}', '從你的牌庫中搜尋一張神器牌，將它置於你手上。', { effects: [{ e: 'tutor', filter: { type: 'Artifact' } }] });
cr(S, 'C', 'Cloudsculpt Technician', '{2}{U}', 'Jellyfish Artificer', 1, 4, '飛行\n只要你操控神器，此生物得+1/+0。', {
  keywords: ['flying'],
  abilities: [{ kind: 'static', self: { cond: HAS_ARTIFACT, grant: { p: 1 } } }],
});
cr(S, 'C', 'Illvoi Galeblade', '{U}', 'Jellyfish Warrior', 1, 1, '閃現，飛行\n{2}，犧牲此生物：抓一張牌。', {
  keywords: ['flash', 'flying'],
  abilities: [act({ mana: '{2}', sacSelf: true }, [{ e: 'draw', n: 1 }], '犧牲：抓一張牌')],
});
cr(S, 'C', 'Illvoi Operative', '{1}{U}', 'Jellyfish Rogue', 2, 1, '每當你施放本回合的第二個咒語時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }], { cond: SECOND })],
});
inst(S, 'C', 'Lost in Space', '{3}{U}', '將目標神器或生物置於其擁有者的牌庫底。刺探1。', {
  targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'] } }],
  effects: [{ e: 'tuck', what: 'T0' }, { e: 'surveil', n: 1 }],
});
inst(S, 'C', 'Mental Modulation', '{1}{U}', '橫置目標神器或生物。抓一張牌。', {
  targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'] } }],
  effects: [{ e: 'tap', what: 'T0' }, { e: 'draw', n: 1 }],
});

// ---------------- 黑 ----------------
cr(S, 'R', 'Sunset Saboteur', '{1}{B}', 'Human Rogue', 4, 1, '威懾\n每當此生物攻擊時，在目標由對手操控的生物上放置一個+1/+1指示物。', {
  keywords: ['menace'],
  abilities: [trig('attacks', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
cr(S, 'U', "Faller's Faithful", '{2}{B}', 'Human Wizard', 3, 1, '當此生物進戰場時，消滅至多一個另外的目標生物。若該生物本回合未受到傷害，其操控者抓兩張牌。', {
  abilities: [
    etb(
      [
        {
          e: 'if',
          cond: { c: 'targetIs', t: 0, filter: { damaged: true } },
          then: [destroyT0],
          else: [destroyT0, { e: 'draw', n: 2, who: 'T0ctrl' }],
        },
      ],
      { targets: [{ kind: 'creature', optional: true, notSelf: true }] },
    ),
  ],
});
cr(S, 'U', 'Lightless Evangel', '{1}{B}', 'Vampire Cleric', 2, 2, '每當你犧牲另一個生物或神器時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('sacrifice', [{ e: 'counters', what: 'self', n: 1 }], { filter: { ctrl: 'you', other: true, type: ['Creature', 'Artifact'] } })],
});
cr(S, 'U', 'Monoist Sentry', '{B}', 'Robot', 4, 1, '守軍', { types: ['Artifact', 'Creature'], keywords: ['defender'] });
sorc(S, 'U', 'Tragic Trajectory', '{B}', '目標生物得-2/-2直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -2, t: -2 }] });
cr(S, 'U', 'Umbral Collar Zealot', '{1}{B}', 'Human Cleric', 3, 2, '犧牲另一個生物或神器：刺探1。', {
  abilities: [act({ sacOther: { type: ['Creature', 'Artifact'] } }, [{ e: 'surveil', n: 1 }], '犧牲：刺探1')],
});
cr(S, 'C', 'Comet Crawler', '{2}{B}', 'Insect Horror', 2, 3, '繫命\n每當此生物攻擊時，你可以犧牲另一個生物或神器。若你如此作，此生物得+2/+0直到回合結束。', {
  keywords: ['lifelink'],
  abilities: [
    trig('attacks', [{ e: 'costThen', prompt: '犧牲一個生物或神器讓它+2/+0？', cost: { sac: { type: ['Creature', 'Artifact'], other: true } }, then: [{ e: 'pump', what: 'self', p: 2, t: 0 }] }]),
  ],
});
inst(S, 'C', 'Dark Endurance', '{1}{B}', '目標生物得+2/+0並獲得不滅異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 0, kw: ['indestructible'] }],
});
sorc(S, 'C', 'Decode Transmissions', '{2}{B}', '你抓兩張牌並失去2點生命。', { effects: [{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'you' }] });
inst(S, 'C', 'Depressurize', '{1}{B}', '目標生物得-3/-0直到回合結束。然後若該生物的力量為0或更少，消滅它。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: -3, t: 0 }, { e: 'if', cond: { c: 'targetIs', t: 0, filter: { powMax: 0 } }, then: [destroyT0] }],
});
cr(S, 'C', 'Gravblade Heavy', '{3}{B}', 'Human Soldier', 3, 4, '只要你操控神器，此生物得+1/+0且具有死觸異能。', {
  abilities: [{ kind: 'static', self: { cond: HAS_ARTIFACT, grant: { p: 1, kw: ['deathtouch'] } } }],
});
cr(S, 'C', 'Gravpack Monoist', '{2}{B}', 'Human Scout', 2, 1, '飛行\n當此生物死去時，派出一個橫置的2/2無色機器人神器衍生生物。', {
  keywords: ['flying'],
  abilities: [trig('dies', [{ e: 'token', token: 'tok-robot22', tapped: true }])],
});
cr(S, 'C', 'Hullcarver', '{B}', 'Robot Assassin', 1, 1, '死觸', { types: ['Artifact', 'Creature'], keywords: ['deathtouch'] });
cr(S, 'C', 'Virus Beetle', '{1}{B}', 'Insect', 1, 1, '當此生物進戰場時，每位對手各棄一張牌。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([{ e: 'discard', n: 1, who: 'opp' }])],
});

// ---------------- 紅 ----------------
inst(S, 'U', 'Cut Propulsion', '{2}{R}', '目標生物對自己造成等同於其力量的傷害。若它具有飛行異能，改為造成兩倍的傷害。', {
  targets: [CR],
  effects: [
    { e: 'bite', a: 'T0', b: 'T0' },
    { e: 'if', cond: { c: 'targetIs', t: 0, filter: { kw: 'flying' } }, then: [{ e: 'bite', a: 'T0', b: 'T0' }] },
  ],
});
inst(S, 'U', 'Full Bore', '{R}', '目標由你操控的生物得+3/+2直到回合結束。', { targets: [MY_CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 2 }] });
cr(S, 'U', 'Molecular Modifier', '{2}{R}', 'Kavu Artificer', 2, 2, '在你回合的戰鬥開始時，目標由你操控的生物得+1/+0並獲得先攻異能直到回合結束。', {
  abilities: [trig('combatStart', [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['first_strike'] }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Remnant Elemental', '{1}{R}', 'Elemental', 0, 4, '延勢\n地落—每當一個地在你的操控下進戰場時，此生物得+2/+0直到回合結束。', {
  keywords: ['reach'],
  abilities: [trig('landfall', [{ e: 'pump', what: 'self', p: 2, t: 0 }])],
});
sorc(S, 'U', 'Ruinous Rampage', '{1}{R}{R}', '選擇一項：\n• 對每位對手各造成3點傷害。\n• 放逐所有法術力值為3或更少的神器。', {
  modes: [
    { text: '對手3點傷害', effects: [{ e: 'damage', n: 3, to: 'opp' }] },
    { text: '放逐法術力值3以下的神器', effects: [{ e: 'exile', what: { all: { type: 'Artifact', mvMax: 3 } } }] },
  ],
});
inst(S, 'C', 'Bombard', '{2}{R}', '對目標生物造成4點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 4, to: 'T0' }] });
cr(S, 'C', 'Frontline War-Rager', '{2}{R}', 'Kavu Soldier', 2, 3, '在你的結束步驟開始時，若你操控兩個或更多已橫置的生物，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('endStep', [{ e: 'counters', what: 'self', n: 1 }], { cond: TWO_TAPPED })],
});
cr(S, 'C', 'Kavaron Skywarden', '{4}{R}', 'Kavu Soldier', 4, 5, '延勢', { keywords: ['reach'] });
cr(S, 'C', 'Kavaron Turbodrone', '{2}{R}', 'Robot Scout', 2, 3, '{T}：目標由你操控的生物得+1/+1並獲得敏捷異能直到回合結束。只能於法術時機起動。', {
  types: ['Artifact', 'Creature'],
  abilities: [act({ tap: true }, [{ e: 'pump', what: 'T0', p: 1, t: 1, kw: ['haste'] }], '+1/+1 並獲得敏捷', { sorcery: true, targets: [MY_CR] })],
});
arti(S, 'C', 'Melded Moxite', '{1}{R}', '當此神器進戰場時，你可以棄一張牌。若你如此作，抓兩張牌。\n{3}，犧牲此神器：派出一個橫置的2/2無色機器人神器衍生生物。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '棄一張牌來抓兩張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 2 }] }]),
    act({ mana: '{3}', sacSelf: true }, [{ e: 'token', token: 'tok-robot22', tapped: true }], '犧牲：派出機器人'),
  ],
});
cr(S, 'C', 'Nebula Dragon', '{6}{R}', 'Dragon', 4, 4, '飛行\n當此生物進戰場時，它對任意一個目標造成3點傷害。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'damage', n: 3, to: 'T0' }], { targets: [ANY] })],
});
sorc(S, 'C', 'Plasma Bolt', '{R}', '對任意一個目標造成2點傷害。', { targets: [ANY], effects: [{ e: 'damage', n: 2, to: 'T0' }] });
cr(S, 'C', 'Red Tiger Mechan', '{3}{R}', 'Robot Cat', 3, 3, '敏捷', { types: ['Artifact', 'Creature'], keywords: ['haste'] });
inst(S, 'C', 'Rig for War', '{1}{R}', '目標生物得+3/+0並獲得延勢與先攻異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 3, t: 0, kw: ['reach', 'first_strike'] }],
});
cr(S, 'C', 'Zookeeper Mechan', '{1}{R}', 'Robot', 1, 3, '{T}：加{R}。\n{6}{R}：目標由你操控的生物得+4/+0直到回合結束。只能於法術時機起動。', {
  types: ['Artifact', 'Creature'],
  produces: ['R'],
  abilities: [act({ mana: '{6}{R}' }, [{ e: 'pump', what: 'T0', p: 4, t: 0 }], '+4/+0', { sorcery: true, targets: [MY_CR] })],
});

// ---------------- 綠 ----------------
cr(S, 'M', 'Ouroboroid', '{2}{G}{G}', 'Plant Wurm', 1, 3, '在你回合的戰鬥開始時，在每個由你操控的生物上各放置X個+1/+1指示物，X為此生物的力量。', {
  abilities: [trig('combatStart', [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: { power: 'self' } }])],
});
cr(S, 'R', 'Frenzied Baloth', '{G}{G}', 'Beast', 3, 2, '此咒語不能被反擊。\n踐踏，敏捷', { keywords: ['trample', 'haste'] });
cr(S, 'U', 'Eumidian Terrabotanist', '{1}{G}', 'Insect Druid', 2, 3, '地落—每當一個地在你的操控下進戰場時，你獲得1點生命。', {
  abilities: [trig('landfall', [{ e: 'gain', n: 1 }])],
});
cr(S, 'U', 'Lashwhip Predator', '{4}{G}{G}', 'Plant Beast', 5, 7, '延勢', { keywords: ['reach'] });
cr(S, 'U', 'Meltstrider Eulogist', '{2}{G}', 'Insect Soldier', 3, 3, '每當一個由你操控、上面有+1/+1指示物的生物死去時，抓一張牌。', {
  abilities: [trig('allyDies', [{ e: 'draw', n: 1 }], { filter: { type: 'Creature', hasCounters: true }, includeSelf: true })],
});
inst(S, 'C', 'Biosynthic Burst', '{1}{G}', '在目標由你操控的生物上放置一個+1/+1指示物。它獲得延勢、踐踏與不滅異能直到回合結束。重置該生物。', {
  targets: [MY_CR],
  effects: [
    { e: 'counters', what: 'T0', n: 1 },
    { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['reach', 'trample', 'indestructible'] },
    { e: 'untap', what: 'T0' },
  ],
});
cr(S, 'C', 'Blooming Stinger', '{1}{G}', 'Plant Scorpion', 2, 2, '死觸\n當此生物進戰場時，另一個目標由你操控的生物獲得死觸異能直到回合結束。', {
  keywords: ['deathtouch'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['deathtouch'] }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] })],
});
inst(S, 'C', 'Diplomatic Relations', '{2}{G}', '目標由你操控的生物得+1/+0並獲得警戒異能直到回合結束。它對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['vigilance'] }, { e: 'bite', a: 'T0', b: 'T1' }],
});
cr(S, 'C', 'Galactic Wayfarer', '{2}{G}', 'Human Scout', 3, 3, '當此生物進戰場時，派出一個登陸艇衍生物。（它是具有「{2}，{T}，犧牲此神器：從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場」的神器。）', {
  abilities: [etb([{ e: 'token', token: 'tok-lander' }])],
});
cr(S, 'C', 'Icecave Crasher', '{3}{G}', 'Beast', 4, 4, '踐踏\n地落—每當一個地在你的操控下進戰場時，此生物得+1/+0直到回合結束。', {
  keywords: ['trample'],
  abilities: [trig('landfall', [{ e: 'pump', what: 'self', p: 1, t: 0 }])],
});
cr(S, 'C', 'Intrepid Tenderfoot', '{1}{G}', 'Insect Citizen', 2, 2, '{3}：在此生物上放置一個+1/+1指示物。只能於法術時機起動。', {
  abilities: [act({ mana: '{3}' }, [{ e: 'counters', what: 'self', n: 1 }], '+1/+1指示物', { sorcery: true })],
});
arti(S, 'C', "Meltstrider's Gear", '{G}', '當此武具進戰場時，將它裝備到目標由你操控的生物上。\n佩帶此武具的生物得+2/+1且具有延勢異能。\n裝備{5}', {
  subtypes: ['Equipment'],
  equip: { cost: '{5}', grant: { p: 2, t: 1, kw: ['reach'] } },
  abilities: [etb([{ e: 'attach', what: 'T0' }], { targets: [MY_CR] })],
});
sorc(S, 'C', "Sami's Curiosity", '{G}', '你獲得2點生命。派出一個登陸艇衍生物。', { effects: [{ e: 'gain', n: 2 }, { e: 'token', token: 'tok-lander' }] });
sorc(S, 'C', 'Shattered Wings', '{2}{G}', '消滅目標神器、結界或具飛行異能的生物。刺探1。', {
  targets: [{ kind: 'permanent', filter: { or: [{ type: ['Artifact', 'Enchantment'] }, { type: 'Creature', kw: 'flying' }] } }],
  effects: [destroyT0, { e: 'surveil', n: 1 }],
});
cr(S, 'C', 'Thawbringer', '{2}{G}', 'Insect Scout', 4, 2, '當此生物進戰場或死去時，刺探1。', {
  abilities: [etb([{ e: 'surveil', n: 1 }]), trig('dies', [{ e: 'surveil', n: 1 }])],
});

// ---------------- 多色 ----------------
cr(S, 'M', 'Sami, Wildcat Captain', '{4}{R}{W}', 'Human Artificer Rogue', 4, 4, '連擊，警戒', { supertypes: ['Legendary'], keywords: ['double_strike', 'vigilance'] });
cr(S, 'U', "Mm'menon, Uthros Exile", '{1}{U}{R}', 'Jellyfish Advisor', 1, 3, '飛行\n每當一個神器在你的操控下進戰場時，在目標生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [trig('allyPermEtb', [{ e: 'counters', what: 'T0', n: 1 }], { filter: { type: 'Artifact' }, targets: [MY_CR] })],
});
cr(S, 'U', "Sami, Ship's Engineer", '{2}{R}{W}', 'Human Artificer', 2, 4, '在你的結束步驟開始時，若你操控兩個或更多已橫置的生物，派出一個橫置的2/2無色機器人神器衍生生物。', {
  supertypes: ['Legendary'],
  abilities: [trig('endStep', [{ e: 'token', token: 'tok-robot22', tapped: true }], { cond: TWO_TAPPED })],
});
cr(S, 'U', 'Station Monitor', '{W}{U}', 'Lizard Artificer', 2, 2, '每當你施放本回合的第二個咒語時，派出一個1/1無色，具飛行異能的無人機神器衍生生物。', {
  abilities: [trig('castAny', [{ e: 'token', token: 'tok-drone' }], { cond: SECOND })],
});
cr(S, 'U', 'Syr Vondam, the Lucent', '{2}{W}{B}{B}', 'Human Knight', 4, 4, '死觸，繫命\n每當此生物進戰場或攻擊時，由你操控的其他生物得+1/+0並獲得死觸異能直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['deathtouch', 'lifelink'],
  abilities: [
    etb([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', other: true } }, p: 1, t: 0, kw: ['deathtouch'] }]),
    trig('attacks', [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', other: true } }, p: 1, t: 0, kw: ['deathtouch'] }]),
  ],
});
cr(S, 'U', 'Tannuk, Memorial Ensign', '{1}{R}{G}', 'Kavu Pilot', 2, 4, '地落—每當一個地在你的操控下進戰場時，此生物對每位對手各造成1點傷害。', {
  supertypes: ['Legendary'],
  abilities: [trig('landfall', [{ e: 'damage', n: 1, to: 'opp' }])],
});
