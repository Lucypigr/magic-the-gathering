// Duskmourn: House of Horror（DSK，2024 年 9 月）
// 詭異（Eerie）：每當一個結界在你的操控下進戰場時。
// 生存（Survival）：在你的結束步驟開始時，若此生物已橫置。
import type { Ability, CardType, Cond, Effect, Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'DSK';
const ENCH_CR: CardType[] = ['Enchantment', 'Creature'];
const eerie = (effects: Effect[], x: Partial<Extract<Ability, { kind: 'trigger' }>> = {}) =>
  trig('allyPermEtb', effects, { filter: { type: 'Enchantment' }, ...x });
const SURVIVAL: Cond = { c: 'selfTapped' };
const survival = (effects: Effect[], x: Partial<Extract<Ability, { kind: 'trigger' }>> = {}) => trig('endStep', effects, { cond: SURVIVAL, ...x });

const verge = (name: string, a: Mana, b: Mana) => land(S, 'R', name, [a, b], `{T}：加{${a}}或{${b}}。`);
verge('Blazemire Verge', 'B', 'R');
verge('Floodfarm Verge', 'W', 'U');
verge('Gloomlake Verge', 'U', 'B');
verge('Hushwood Verge', 'G', 'W');
verge('Thornspire Verge', 'R', 'G');
const horrorland = (name: string, a: Mana, b: Mana) =>
  land(S, 'C', name, [a, b], `除非有玩家的生命為13點或更少，否則此地橫置進戰場。\n{T}：加{${a}}或{${b}}。`, {
    etbTappedUnless: { c: 'anyLifeLte', n: 13 },
  });
horrorland('Abandoned Campground', 'W', 'U');
horrorland('Bleeding Woods', 'R', 'G');
horrorland('Etched Cornfield', 'G', 'W');
horrorland('Lakeside Shack', 'G', 'U');
horrorland('Murky Sewer', 'U', 'B');
horrorland('Neglected Manor', 'W', 'B');
horrorland('Peculiar Lighthouse', 'U', 'R');
horrorland('Raucous Carnival', 'R', 'W');
horrorland('Razortrap Gorge', 'B', 'R');
horrorland('Strangled Cemetery', 'B', 'G');

// ---------------- 白 ----------------
sorc(S, 'R', 'Split Up', '{1}{W}{W}', '選擇一項：\n• 消滅所有已橫置的生物。\n• 消滅所有未橫置的生物。', {
  modes: [
    { text: '消滅所有已橫置的生物', effects: [{ e: 'destroy', what: { all: { type: 'Creature', tapped: true } } }] },
    { text: '消滅所有未橫置的生物', effects: [{ e: 'destroy', what: { all: { type: 'Creature', tapped: false } } }] },
  ],
});
cr(S, 'R', 'Toby, Beastie Befriender', '{2}{W}', 'Human Wizard', 1, 1, '當此生物進戰場時，派出一個4/4野獸衍生生物。', {
  supertypes: ['Legendary'],
  abilities: [etb([{ e: 'token', token: 'tok-beast' }])],
});
sorc(S, 'U', 'Exorcise', '{1}{W}', '放逐目標神器、結界或力量為4或更多的生物。', {
  targets: [{ kind: 'permanent', filter: { or: [{ type: ['Artifact', 'Enchantment'] }, { type: 'Creature', powMin: 4 }] } }],
  effects: [{ e: 'exile', what: 'T0' }],
});
cr(S, 'U', 'Optimistic Scavenger', '{W}', 'Human Scout', 1, 1, '詭異—每當一個結界在你的操控下進戰場時，在目標生物上放置一個+1/+1指示物。', {
  abilities: [eerie([{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Patched Plaything', '{2}{W}', 'Toy', 4, 3, '連擊\n此生物進戰場時上面有兩個-1/-1指示物。', {
  types: ['Artifact', 'Creature'],
  keywords: ['double_strike'],
  etbCounters: -2,
});
cr(S, 'U', 'Savior of the Small', '{3}{W}', 'Kor Survivor', 3, 4, '生存—在你的結束步驟開始時，若此生物已橫置，將目標法術力值為3或更少的生物牌從你的墳墓場移回你手上。', {
  abilities: [survival([{ e: 'toHand', what: 'T0' }], { targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature', mvMax: 3 }, optional: true, prompt: '選擇墳墓場中的生物牌' }] })],
});
ench(S, 'U', "Shardmage's Rescue", '{W}', '閃現\n結附於由你操控的生物\n當此靈氣進戰場時，所結附的生物獲得辟邪異能直到回合結束。\n所結附的生物得+1/+1。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 1, t: 1 } },
  abilities: [etb([{ e: 'pump', what: 'attached', p: 0, t: 0, kw: ['hexproof'] }])],
});
cr(S, 'U', 'Splitskin Doll', '{1}{W}', 'Toy', 2, 1, '當此生物進戰場時，抓一張牌。然後除非你操控另一個力量為2或更少的生物，否則棄一張牌。', {
  types: ['Artifact', 'Creature'],
  abilities: [
    etb([
      { e: 'draw', n: 1 },
      { e: 'if', cond: { c: 'controls', filter: { type: 'Creature', other: true, powMax: 2 } }, then: [], else: [{ e: 'discard', n: 1, who: 'you' }] },
    ]),
  ],
});
cr(S, 'C', 'Cult Healer', '{2}{W}', 'Human Doctor', 3, 3, '詭異—每當一個結界在你的操控下進戰場時，此生物獲得繫命異能直到回合結束。', {
  abilities: [eerie([{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['lifelink'] }])],
});
sorc(S, 'C', 'Emerge from the Cocoon', '{4}{W}', '將目標生物牌從你的墳墓場移回戰場。你獲得3點生命。', {
  targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' }],
  effects: [{ e: 'reanimate', what: 'T0' }, { e: 'gain', n: 3 }],
});
cr(S, 'C', 'Fear of Surveillance', '{1}{W}', 'Nightmare', 2, 2, '警戒\n每當此生物攻擊時，刺探1。', {
  types: ENCH_CR,
  keywords: ['vigilance'],
  abilities: [trig('attacks', [{ e: 'surveil', n: 1 }])],
});
cr(S, 'C', 'Friendly Ghost', '{3}{W}', 'Spirit', 2, 4, '飛行\n當此生物進戰場時，目標生物得+2/+4直到回合結束。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 2, t: 4 }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Hardened Escort', '{2}{W}', 'Human Soldier', 2, 4, '每當此生物攻擊時，另一個目標由你操控的生物得+1/+0並獲得不滅異能直到回合結束。', {
  abilities: [trig('attacks', [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['indestructible'] }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] })],
});
inst(S, 'C', 'Jump Scare', '{W}', '目標生物得+2/+2並獲得飛行異能直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['flying'] }] });
inst(S, 'C', 'Seized from Slumber', '{4}{W}', '若此咒語以已橫置的生物為目標，則減少{3}來施放。\n消滅目標生物。', {
  modes: [
    { text: '消滅生物', targets: [CR], effects: [destroyT0] },
    { text: '消滅已橫置的生物（{1}{W}）', cost: '{1}{W}', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [destroyT0] },
  ],
});
cr(S, 'C', 'Shepherding Spirits', '{4}{W}{W}', 'Spirit', 4, 5, '飛行', { keywords: ['flying'] });

// ---------------- 藍 ----------------
cr(S, 'R', 'Entity Tracker', '{2}{U}', 'Human Scout', 2, 3, '閃現\n詭異—每當一個結界在你的操控下進戰場時，抓一張牌。', {
  keywords: ['flash'],
  abilities: [eerie([{ e: 'draw', n: 1 }])],
});
cr(S, 'U', 'Fear of Failed Tests', '{4}{U}', 'Nightmare', 2, 7, '每當此生物對玩家造成戰鬥傷害時，抓等量的牌。', {
  types: ENCH_CR,
  abilities: [trig('combatDamagePlayer', [{ e: 'draw', n: { ev: true } }])],
});
cr(S, 'U', 'Fear of Falling', '{3}{U}{U}', 'Nightmare', 4, 4, '飛行\n每當此生物攻擊時，目標由防禦玩家操控的生物得-2/-0直到回合結束。', {
  types: ENCH_CR,
  keywords: ['flying'],
  abilities: [trig('attacks', [{ e: 'pump', what: 'T0', p: -2, t: 0 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
inst(S, 'U', 'Get Out', '{U}{U}', '選擇一項：\n• 反擊目標生物或結界咒語。\n• 將一或兩個由你擁有的目標生物及／或結界移回你手上。', {
  modes: [
    { text: '反擊生物或結界咒語', targets: [{ kind: 'spell', filter: { type: ['Creature', 'Enchantment'] } }], effects: [{ e: 'counter', what: 'T0' }] },
    {
      text: '移回你的生物或結界',
      targets: [
        { kind: 'permanent', filter: { ctrl: 'you', type: ['Creature', 'Enchantment'] } },
        { kind: 'permanent', filter: { ctrl: 'you', type: ['Creature', 'Enchantment'] }, optional: true },
      ],
      effects: [{ e: 'bounce', what: 'T0' }, { e: 'bounce', what: 'T1' }],
    },
  ],
});
cr(S, 'C', 'Daggermaw Megalodon', '{4}{U}{U}', 'Shark', 5, 7, '警戒', { keywords: ['vigilance'] });
sorc(S, 'C', 'Enter the Enigma', '{U}', '目標生物本回合不能被阻擋。抓一張牌。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['unblockable'] }, { e: 'draw', n: 1 }],
});
cr(S, 'C', 'Erratic Apparition', '{2}{U}', 'Spirit', 1, 3, '飛行，警戒\n詭異—每當一個結界在你的操控下進戰場時，此生物得+1/+1直到回合結束。', {
  keywords: ['flying', 'vigilance'],
  abilities: [eerie([{ e: 'pump', what: 'self', p: 1, t: 1 }])],
});
inst(S, 'C', 'Glimmerburst', '{3}{U}', '抓兩張牌。派出一個1/1白色微光結界生物衍生物。', { effects: [{ e: 'draw', n: 2 }, { e: 'token', token: 'tok-glimmer' }] });
cr(S, 'C', 'Piranha Fly', '{1}{U}', 'Fish Insect', 2, 1, '飛行\n此生物橫置進戰場。', { keywords: ['flying'], etbTapped: true });
cr(S, 'C', 'Tunnel Surveyor', '{2}{U}', 'Human Detective', 2, 2, '當此生物進戰場時，派出一個1/1白色微光結界生物衍生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-glimmer' }])],
});
inst(S, 'C', 'Vanish from Sight', '{3}{U}', '將目標非地永久物置於其擁有者的牌庫底。刺探1。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'tuck', what: 'T0' }, { e: 'surveil', n: 1 }],
});

// ---------------- 黑 ----------------
cr(S, 'U', 'Dashing Bloodsucker', '{3}{B}', 'Vampire Warrior', 2, 5, '詭異—每當一個結界在你的操控下進戰場時，此生物得+2/+0並獲得繫命異能直到回合結束。', {
  abilities: [eerie([{ e: 'pump', what: 'self', p: 2, t: 0, kw: ['lifelink'] }])],
});
inst(S, 'U', 'Live or Die', '{3}{B}{B}', '選擇一項：\n• 將目標生物牌從你的墳墓場移回戰場。\n• 消滅目標生物。', {
  modes: [
    { text: '重返戰場', targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' }], effects: [{ e: 'reanimate', what: 'T0' }] },
    { text: '消滅生物', targets: [CR], effects: [destroyT0] },
  ],
});
cr(S, 'U', 'Miasma Demon', '{4}{B}{B}', 'Demon', 5, 4, '飛行', { keywords: ['flying'] });
cr(S, 'U', "Valgavoth's Faithful", '{B}', 'Human Cleric', 1, 1, '{3}{B}，犧牲此生物：將目標生物牌從你的墳墓場移回戰場。只能於法術時機起動。', {
  abilities: [
    act({ mana: '{3}{B}', sacSelf: true }, [{ e: 'reanimate', what: 'T0' }], '犧牲：重返戰場', {
      sorcery: true,
      targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' }],
    }),
  ],
});
inst(S, 'U', 'Withering Torment', '{2}{B}', '消滅目標生物或結界。你失去2點生命。', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Enchantment'] } }],
  effects: [destroyT0, { e: 'lose', n: 2, who: 'you' }],
});
sorc(S, 'U', 'Commune with Evil', '{2}{B}', '檢視你牌庫頂的四張牌。將其中一張置於你手上，其餘置入你的墳墓場。你獲得3點生命。', {
  effects: [{ e: 'dig', n: 4, take: 1, rest: 'graveyard' }, { e: 'gain', n: 3 }],
});
cr(S, 'C', 'Appendage Amalgam', '{2}{B}', 'Horror', 3, 2, '閃現\n每當此生物攻擊時，刺探1。', {
  types: ENCH_CR,
  keywords: ['flash'],
  abilities: [trig('attacks', [{ e: 'surveil', n: 1 }])],
});
cr(S, 'C', 'Balemurk Leech', '{1}{B}', 'Leech', 2, 2, '詭異—每當一個結界在你的操控下進戰場時，每位對手失去1點生命。', {
  abilities: [eerie([{ e: 'lose', n: 1, who: 'opp' }])],
});
cr(S, 'C', 'Cackling Slasher', '{3}{B}', 'Human Assassin', 3, 3, '死觸', { keywords: ['deathtouch'] });
cr(S, 'C', 'Fear of Lost Teeth', '{B}', 'Nightmare', 1, 1, '當此生物死去時，它對任意一個目標造成1點傷害，且你獲得1點生命。', {
  types: ENCH_CR,
  abilities: [trig('dies', [{ e: 'damage', n: 1, to: 'T0' }, { e: 'gain', n: 1 }], { targets: [ANY] })],
});
sorc(S, 'C', 'Final Vengeance', '{B}', '作為施放此咒語的額外費用，犧牲一個生物或結界。\n放逐目標生物。', { targets: [CR], effects: [{ e: 'exile', what: 'T0' }] }, {
  addCost: { sac: { type: ['Creature', 'Enchantment'] } },
});
inst(S, 'C', 'Give In to Violence', '{1}{B}', '目標生物得+2/+2並獲得繫命異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['lifelink'] }],
});
inst(S, 'C', "Winter's Intervention", '{1}{B}', '對目標生物造成2點傷害。你獲得2點生命。', {
  targets: [CR],
  effects: [{ e: 'damage', n: 2, to: 'T0' }, { e: 'gain', n: 2 }],
});

// ---------------- 紅 ----------------
cr(S, 'U', 'Diversion Specialist', '{3}{R}', 'Human Warrior', 4, 3, '威懾', { keywords: ['menace'] });
cr(S, 'U', 'Fear of Being Hunted', '{1}{R}{R}', 'Nightmare', 4, 2, '敏捷', { types: ENCH_CR, keywords: ['haste'] });
sorc(S, 'U', 'Pyroclasm', '{1}{R}', '對每個生物各造成2點傷害。', { effects: [{ e: 'damage', n: 2, to: { all: { type: 'Creature' } } }] });
cr(S, 'U', 'Razorkin Hordecaller', '{4}{R}', 'Human Clown Berserker', 4, 4, '敏捷\n每當你攻擊時，派出一個1/1紅色小魔怪衍生生物。', {
  keywords: ['haste'],
  abilities: [trig('youAttack', [{ e: 'token', token: 'tok-gremlin' }])],
});
inst(S, 'U', 'Violent Urge', '{R}', '目標生物得+1/+0並獲得先攻異能直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['first_strike'] }] });
arti(S, 'C', 'Bear Trap', '{1}', '閃現\n{3}，{T}，犧牲此神器：它對目標生物造成3點傷害。', {
  keywords: ['flash'],
  abilities: [act({ mana: '{3}', tap: true, sacSelf: true }, [{ e: 'damage', n: 3, to: 'T0' }], '犧牲：3點傷害', { targets: [CR] })],
});
cr(S, 'C', 'Clockwork Percussionist', '{R}', 'Monkey Toy', 1, 1, '敏捷\n當此生物死去時，放逐你牌庫頂的一張牌。本回合你可以使用該牌。', {
  types: ['Artifact', 'Creature'],
  keywords: ['haste'],
  abilities: [trig('dies', [{ e: 'impulse', n: 1 }])],
});
sorc(S, 'C', 'Grab the Prize', '{1}{R}', '作為施放此咒語的額外費用，棄一張牌。\n抓兩張牌。對每位對手各造成2點傷害。', {
  effects: [{ e: 'draw', n: 2 }, { e: 'damage', n: 2, to: 'opp' }],
}, { addCost: { discard: 1 } });
cr(S, 'C', 'Most Valuable Slayer', '{3}{R}', 'Human Warrior', 2, 4, '每當你攻擊時，目標進行攻擊的生物得+1/+0並獲得先攻異能直到回合結束。', {
  abilities: [trig('youAttack', [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['first_strike'] }], { targets: [{ kind: 'creature', filter: { ctrl: 'you', attacking: true } }] })],
});
cr(S, 'C', 'Ragged Playmate', '{1}{R}', 'Toy', 2, 2, '{1}，{T}：目標力量為2或更少的生物本回合不能被阻擋。', {
  types: ['Artifact', 'Creature'],
  abilities: [act({ mana: '{1}', tap: true }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['unblockable'] }], '不能被阻擋', { targets: [{ kind: 'creature', filter: { ctrl: 'you', powMax: 2 } }] })],
});
cr(S, 'C', 'Ripchain Razorkin', '{3}{R}', 'Human Berserker', 5, 3, '延勢', { keywords: ['reach'] });
inst(S, 'C', 'Scorching Dragonfire', '{1}{R}', '對目標生物造成3點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 3, to: 'T0' }] });
cr(S, 'C', 'Vicious Clown', '{2}{R}', 'Human Clown', 2, 3, '每當另一個力量為2或更少的生物在你的操控下進戰場時，此生物得+2/+0直到回合結束。', {
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 2, t: 0 }], { filter: { powMax: 2 } })],
});

// ---------------- 綠 ----------------
cr(S, 'U', 'Altanak, the Thrice-Called', '{5}{G}{G}', 'Insect Beast', 9, 9, '踐踏\n每當此生物成為對手的咒語或異能的目標時，抓一張牌。', {
  supertypes: ['Legendary'],
  keywords: ['trample'],
  abilities: [trig('allyTargeted', [{ e: 'draw', n: 1 }], { filter: { sub: 'Insect', legendary: true } })],
});
sorc(S, 'U', 'Coordinated Clobbering', '{G}', '橫置一或兩個由你操控的目標未橫置生物。它們各對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [
    { kind: 'creature', filter: { ctrl: 'you', tapped: false } },
    { kind: 'creature', filter: { ctrl: 'you', tapped: false }, optional: true },
    OPP_CR,
  ],
  effects: [
    { e: 'tap', what: 'T0' },
    { e: 'tap', what: 'T1' },
    { e: 'bite', a: 'T0', b: 'T2' },
    { e: 'bite', a: 'T1', b: 'T2' },
  ],
});
cr(S, 'U', 'Insidious Fungus', '{G}', 'Fungus', 1, 2, '{2}，犧牲此生物：抓一張牌。然後你可以將一張地牌從你手上放進戰場。', {
  abilities: [act({ mana: '{2}', sacSelf: true }, [{ e: 'draw', n: 1 }, { e: 'landFromHand' }], '犧牲：抓一張牌')],
});
cr(S, 'U', 'Overgrown Zealot', '{1}{G}', 'Elf Druid', 0, 4, '{T}：加一點任意顏色的法術力。', { produces: ['W', 'U', 'B', 'R', 'G'] });
cr(S, 'C', 'Cautious Survivor', '{3}{G}', 'Elf Survivor', 4, 4, '生存—在你的結束步驟開始時，若此生物已橫置，你獲得2點生命。', {
  abilities: [survival([{ e: 'gain', n: 2 }])],
});
cr(S, 'C', 'Flesh Burrower', '{1}{G}', 'Insect', 2, 2, '死觸\n每當此生物攻擊時，另一個目標由你操控的生物獲得死觸異能直到回合結束。', {
  keywords: ['deathtouch'],
  abilities: [trig('attacks', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['deathtouch'] }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] })],
});
ench(S, 'C', 'Frantic Strength', '{2}{G}', '閃現\n結附於生物\n所結附的生物得+2/+2且具有踐踏異能。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 2, t: 2, kw: ['trample'] } },
});
cr(S, 'C', 'Grasping Longneck', '{2}{G}', 'Horror', 4, 2, '延勢\n當此生物死去時，你獲得2點生命。', {
  types: ENCH_CR,
  keywords: ['reach'],
  abilities: [trig('dies', [{ e: 'gain', n: 2 }])],
});
inst(S, 'C', 'Horrid Vigor', '{1}{G}', '目標生物獲得死觸與不滅異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['deathtouch', 'indestructible'] }],
});
cr(S, 'C', 'Slavering Branchsnapper', '{4}{G}{G}', 'Lizard', 7, 6, '踐踏', { keywords: ['trample'] });
cr(S, 'C', 'Wary Watchdog', '{1}{G}', 'Dog', 3, 1, '當此生物進戰場或死去時，刺探1。', {
  abilities: [etb([{ e: 'surveil', n: 1 }]), trig('dies', [{ e: 'surveil', n: 1 }])],
});

// ---------------- 多色／無色 ----------------
cr(S, 'R', 'Undead Sprinter', '{B}{R}', 'Zombie', 2, 2, '踐踏，敏捷', { keywords: ['trample', 'haste'] });
cr(S, 'U', 'Arabella, Abandoned Doll', '{R}{W}', 'Toy', 1, 3, '每當此生物攻擊時，它對每位對手各造成X點傷害，且你獲得X點生命，X為由你操控、力量為2或更少的生物數量。', {
  supertypes: ['Legendary'],
  types: ['Artifact', 'Creature'],
  abilities: [
    trig('attacks', [
      { e: 'damage', n: { count: { type: 'Creature', ctrl: 'you', powMax: 2 } }, to: 'opp' },
      { e: 'gain', n: { count: { type: 'Creature', ctrl: 'you', powMax: 2 } } },
    ]),
  ],
});
inst(S, 'U', 'Drag to the Roots', '{2}{B}{G}', '消滅目標非地永久物。', { targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }], effects: [destroyT0] });
cr(S, 'U', 'Fear of Infinity', '{1}{U}{B}', 'Nightmare', 2, 2, '飛行，繫命\n此生物不能阻擋。', {
  types: ENCH_CR,
  keywords: ['flying', 'lifelink'],
  abilities: [{ kind: 'static', self: { grant: { cantBlock: true } } }],
});
cr(S, 'U', 'Gremlin Tamer', '{W}{U}', 'Human Scout', 2, 2, '詭異—每當一個結界在你的操控下進戰場時，派出一個1/1紅色小魔怪衍生生物。', {
  abilities: [eerie([{ e: 'token', token: 'tok-gremlin' }])],
});
sorc(S, 'U', 'Midnight Mayhem', '{2}{R}{W}', '派出三個1/1紅色小魔怪衍生生物。由你操控的小魔怪獲得威懾、繫命與敏捷異能直到回合結束。', {
  effects: [
    { e: 'token', token: 'tok-gremlin', n: 3 },
    { e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', sub: 'Gremlin' } }, p: 0, t: 0, kw: ['menace', 'lifelink', 'haste'] },
  ],
});
cr(S, 'U', 'Shrewd Storyteller', '{1}{G}{W}', 'Human Survivor', 3, 3, '生存—在你的結束步驟開始時，若此生物已橫置，在目標生物上放置一個+1/+1指示物。', {
  abilities: [survival([{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Shroudstomper', '{3}{W}{W}{B}{B}', 'Elemental', 5, 5, '死觸\n每當此生物進戰場或攻擊時，每位對手失去2點生命。你獲得2點生命並抓一張牌。', {
  keywords: ['deathtouch'],
  abilities: [
    etb([{ e: 'lose', n: 2, who: 'opp' }, { e: 'gain', n: 2 }, { e: 'draw', n: 1 }]),
    trig('attacks', [{ e: 'lose', n: 2, who: 'opp' }, { e: 'gain', n: 2 }, { e: 'draw', n: 1 }]),
  ],
});
cr(S, 'U', 'Skullsnap Nuisance', '{U}{B}', 'Insect Skeleton', 1, 4, '飛行\n詭異—每當一個結界在你的操控下進戰場時，刺探1。', {
  keywords: ['flying'],
  abilities: [eerie([{ e: 'surveil', n: 1 }])],
});
cr(S, 'U', 'Wildfire Wickerfolk', '{R}{G}', 'Scarecrow', 3, 2, '敏捷', { types: ['Artifact', 'Creature'], keywords: ['haste'] });
cr(S, 'C', 'Friendly Teddy', '{2}', 'Bear Toy', 2, 2, '當此生物死去時，每位玩家各抓一張牌。', {
  types: ['Artifact', 'Creature'],
  abilities: [trig('dies', [{ e: 'draw', n: 1, who: 'players' }])],
});
arti(S, 'C', 'Glimmerlight', '{2}', '當此武具進戰場時，派出一個1/1白色微光結界生物衍生物。\n佩帶此武具的生物得+1/+1。\n裝備{1}', {
  subtypes: ['Equipment'],
  equip: { cost: '{1}', grant: { p: 1, t: 1 } },
  abilities: [etb([{ e: 'token', token: 'tok-glimmer' }])],
});
cr(S, 'C', 'Malevolent Chandelier', '{6}', 'Construct', 4, 4, '飛行', { types: ['Artifact', 'Creature'], keywords: ['flying'] });
