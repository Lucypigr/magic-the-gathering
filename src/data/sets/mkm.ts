// Murders at Karlov Manor（MKM，2024 年 2 月）
import type { Ability, Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'MKM';
const CLUE_SAC: Ability = act({ mana: '{2}', sacSelf: true }, [{ e: 'draw', n: 1 }], '犧牲：抓一張牌');

// 刺探地：橫置進戰場，進場時刺探1
const surveilland = (name: string, a: Mana, b: Mana, subs: string) =>
  land(S, 'R', name, [a, b], `（{T}：加{${a}}或{${b}}。）\n此地橫置進戰場。\n當此地進戰場時，刺探1。`, {
    subtypes: subs.split(' '),
    etbTapped: true,
    abilities: [etb([{ e: 'surveil', n: 1 }])],
  });
surveilland('Commercial District', 'R', 'G', 'Mountain Forest');
surveilland('Elegant Parlor', 'R', 'W', 'Mountain Plains');
surveilland('Hedge Maze', 'G', 'U', 'Forest Island');
surveilland('Lush Portico', 'G', 'W', 'Forest Plains');
surveilland('Meticulous Archive', 'W', 'U', 'Plains Island');
surveilland('Raucous Theater', 'B', 'R', 'Swamp Mountain');
surveilland('Shadowy Backstreet', 'W', 'B', 'Plains Swamp');
surveilland('Thundering Falls', 'U', 'R', 'Island Mountain');
surveilland('Undercity Sewers', 'U', 'B', 'Island Swamp');
surveilland('Underground Mortuary', 'B', 'G', 'Swamp Forest');

// ---------------- 白 ----------------
cr(S, 'R', 'Doorkeeper Thrull', '{1}{W}', 'Thrull', 1, 2, '閃現，飛行', { keywords: ['flash', 'flying'] });
cr(S, 'U', 'Karlov Watchdog', '{3}{W}', 'Dog', 3, 2, '警戒', { keywords: ['vigilance'] });
cr(S, 'U', 'Neighborhood Guardian', '{1}{W}', 'Unicorn', 2, 2, '每當另一個力量為2或更少的生物在你的操控下進戰場時，目標由你操控的生物得+1/+1直到回合結束。', {
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'T0', p: 1, t: 1 }], { filter: { powMax: 2 }, targets: [MY_CR] })],
});
inst(S, 'U', 'Not on My Watch', '{1}{W}', '放逐目標進行攻擊的生物。', {
  targets: [{ kind: 'creature', filter: { attacking: true } }],
  effects: [{ e: 'exile', what: 'T0' }],
});
cr(S, 'U', 'Perimeter Enforcer', '{1}{W}', 'Human Detective', 1, 1, '飛行，繫命\n每當另一個偵探在你的操控下進戰場時，此生物得+1/+1直到回合結束。', {
  keywords: ['flying', 'lifelink'],
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 1, t: 1 }], { filter: { sub: 'Detective' } })],
});
arti(S, 'U', 'Wrench', '{W}', '佩帶此武具的生物得+1/+1且具有警戒異能。\n{2}，犧牲此武具：抓一張牌。\n裝備{2}', {
  subtypes: ['Clue', 'Equipment'],
  equip: { cost: '{2}', grant: { p: 1, t: 1, kw: ['vigilance'] } },
  abilities: [CLUE_SAC],
});
cr(S, 'C', 'Griffnaut Tracker', '{3}{W}', 'Human Detective', 3, 2, '飛行', { keywords: ['flying'] });
cr(S, 'C', 'Haazda Vigilante', '{4}{W}', 'Giant Soldier', 4, 4, '每當此生物進戰場或攻擊時，在目標由你操控、力量為2或更少的生物上放置一個+1/+1指示物。', {
  abilities: [
    etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ kind: 'creature', filter: { ctrl: 'you', powMax: 2 }, optional: true }] }),
    trig('attacks', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ kind: 'creature', filter: { ctrl: 'you', powMax: 2 }, optional: true }] }),
  ],
});
cr(S, 'C', 'Inside Source', '{2}{W}', 'Human Citizen', 1, 1, '當此生物進戰場時，派出一個2/2白藍雙色偵探衍生生物。\n{3}，{T}：目標由你操控的偵探得+2/+0並獲得警戒異能直到回合結束。只能於法術時機起動。', {
  abilities: [
    etb([{ e: 'token', token: 'tok-detective' }]),
    act({ mana: '{3}', tap: true }, [{ e: 'pump', what: 'T0', p: 2, t: 0, kw: ['vigilance'] }], '偵探+2/+0', {
      sorcery: true,
      targets: [{ kind: 'creature', filter: { ctrl: 'you', sub: 'Detective' } }],
    }),
  ],
});
ench(S, 'C', 'Makeshift Binding', '{2}{W}', '當此結界進戰場時，放逐目標由對手操控的生物，直到此結界離開戰場為止。你獲得2點生命。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }, { e: 'gain', n: 2 }], { targets: [OPP_CR] })],
});
cr(S, 'C', 'Marketwatch Phantom', '{1}{W}', 'Spirit Detective', 2, 2, '每當另一個力量為2或更少的生物在你的操控下進戰場時，此生物獲得飛行異能直到回合結束。', {
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['flying'] }], { filter: { powMax: 2 } })],
});

// ---------------- 藍 ----------------
cr(S, 'R', 'Steamcore Scholar', '{2}{U}', 'Weird Detective', 2, 2, '飛行，警戒\n當此生物進戰場時，抓兩張牌，然後棄一張牌。', {
  keywords: ['flying', 'vigilance'],
  abilities: [etb([{ e: 'draw', n: 2 }, { e: 'discard', n: 1, who: 'you' }])],
});
ench(S, 'U', 'Fae Flight', '{1}{U}', '閃現\n結附於生物\n當此靈氣進戰場時，所結附的生物獲得辟邪異能直到回合結束。\n所結附的生物得+1/+0且具有飛行異能。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 1, kw: ['flying'] } },
  abilities: [etb([{ e: 'pump', what: 'attached', p: 0, t: 0, kw: ['hexproof'] }])],
});
cr(S, 'U', 'Furtive Courier', '{2}{U}', 'Merfolk Advisor', 3, 2, '每當此生物攻擊時，抓一張牌，然後棄一張牌。', {
  abilities: [trig('attacks', [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }])],
});
inst(S, 'U', 'Sudden Setback', '{2}{U}{U}', '將目標非地永久物置於其擁有者的牌庫底。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'tuck', what: 'T0' }],
});
cr(S, 'C', 'Benthic Criminologists', '{4}{U}', 'Merfolk Wizard', 4, 5, '每當此生物進戰場或攻擊時，你可以犧牲一個神器。若你如此作，抓一張牌。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '犧牲一個神器來抓一張牌？', cost: { sac: { type: 'Artifact' } }, then: [{ e: 'draw', n: 1 }] }]),
    trig('attacks', [{ e: 'costThen', prompt: '犧牲一個神器來抓一張牌？', cost: { sac: { type: 'Artifact' } }, then: [{ e: 'draw', n: 1 }] }]),
  ],
});
inst(S, 'C', 'Unauthorized Exit', '{1}{U}', '將目標非地永久物移回其擁有者手上。刺探1。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'surveil', n: 1 }],
});

// ---------------- 黑 ----------------
cr(S, 'M', 'Vein Ripper', '{3}{B}{B}{B}', 'Vampire Assassin', 6, 5, '飛行\n每當一個生物死去時，目標對手失去2點生命，且你獲得2點生命。', {
  keywords: ['flying'],
  abilities: [trig('otherDies', [{ e: 'lose', n: 2, who: 'T0' }, { e: 'gain', n: 2 }], { targets: [OPP] })],
});
cr(S, 'U', 'Leering Onlooker', '{1}{B}', 'Vampire', 1, 3, '飛行', { keywords: ['flying'] });
inst(S, 'U', 'Long Goodbye', '{1}{B}', '此咒語不能被反擊。\n消滅目標法術力值為3或更少的生物。', {
  targets: [{ kind: 'creature', filter: { mvMax: 3 } }],
  effects: [destroyT0],
});
arti(S, 'U', 'Lead Pipe', '{B}', '佩帶此武具的生物得+2/+0。\n{2}，犧牲此武具：抓一張牌。\n裝備{2}', {
  subtypes: ['Clue', 'Equipment'],
  equip: { cost: '{2}', grant: { p: 2 } },
  abilities: [CLUE_SAC],
});
cr(S, 'U', 'Slimy Dualleech', '{3}{B}', 'Leech', 2, 4, '在你回合的戰鬥開始時，目標由你操控、力量為2或更少的生物得+1/+0並獲得死觸異能直到回合結束。', {
  abilities: [
    trig('combatStart', [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['deathtouch'] }], { targets: [{ kind: 'creature', filter: { ctrl: 'you', powMax: 2 }, optional: true }] }),
  ],
});
ench(S, 'U', 'Soul Enervation', '{3}{B}', '閃現\n當此結界進戰場時，目標生物得-4/-4直到回合結束。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: -4, t: -4 }], { targets: [CR] })],
});
cr(S, 'U', 'Undercity Eliminator', '{3}{B}{B}', 'Gorgon Assassin', 3, 3, '當此生物進戰場時，你可以犧牲一個神器或生物。若你如此作，放逐目標由對手操控的生物。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '犧牲一個神器或生物來放逐目標生物？', cost: { sac: { type: ['Artifact', 'Creature'], other: true } }, then: [{ e: 'exile', what: 'T0' }] }], {
      targets: [{ ...OPP_CR, optional: true }],
    }),
  ],
});
sorc(S, 'C', 'Cerebral Confiscation', '{2}{B}', '選擇一項：\n• 目標對手棄兩張牌。\n• 目標對手展示其手牌。你從中選擇一張非地牌，該玩家棄掉那張牌。', {
  modes: [
    { text: '對手棄兩張牌', targets: [OPP], effects: [{ e: 'discard', n: 2, who: 'T0' }] },
    { text: '選擇對手的一張非地牌', targets: [OPP], effects: [{ e: 'discardChosen', who: 'T0', filter: { nonType: 'Land' } }] },
  ],
});
sorc(S, 'C', 'Macabre Reconstruction', '{3}{B}', '將至多兩張目標生物牌從你的墳墓場移回你手上。', {
  targets: [
    { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
    { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
  ],
  effects: [{ e: 'toHand', what: 'T0' }, { e: 'toHand', what: 'T1' }],
});
cr(S, 'C', 'Rot Farm Mortipede', '{3}{B}', 'Insect', 3, 4, '');
cr(S, 'C', 'Snarling Gorehound', '{B}', 'Dog', 1, 1, '威懾\n每當另一個力量為2或更少的生物在你的操控下進戰場時，刺探1。', {
  keywords: ['menace'],
  abilities: [trig('allyEtb', [{ e: 'surveil', n: 1 }], { filter: { powMax: 2 } })],
});
cr(S, 'C', 'Unscrupulous Agent', '{1}{B}', 'Elf Detective', 1, 1, '當此生物進戰場時，目標對手棄一張牌。', {
  abilities: [etb([{ e: 'discard', n: 1, who: 'T0' }], { targets: [OPP] })],
});

// ---------------- 紅 ----------------
cr(S, 'U', 'Cornered Crook', '{4}{R}', 'Lizard Warrior', 5, 4, '當此生物進戰場時，你可以犧牲一個神器。若你如此作，此生物對任意一個目標造成3點傷害。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '犧牲一個神器來造成3點傷害？', cost: { sac: { type: 'Artifact' } }, then: [{ e: 'damage', n: 3, to: 'T0' }] }], { targets: [ANY] }),
  ],
});
arti(S, 'U', 'Knife', '{R}', '佩帶此武具的生物得+1/+0且具有先攻異能。\n{2}，犧牲此武具：抓一張牌。\n裝備{2}', {
  subtypes: ['Clue', 'Equipment'],
  equip: { cost: '{2}', grant: { p: 1, kw: ['first_strike'] } },
  abilities: [CLUE_SAC],
});
cr(S, 'U', 'Reckless Detective', '{1}{R}', 'Devil Detective', 0, 3, '每當此生物攻擊時，你可以棄一張牌。若你如此作，抓一張牌，且此生物得+2/+0直到回合結束。', {
  abilities: [
    trig('attacks', [{ e: 'costThen', prompt: '棄一張牌來抓一張並+2/+0？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }, { e: 'pump', what: 'self', p: 2, t: 0 }] }]),
  ],
});
inst(S, 'C', 'Demand Answers', '{1}{R}', '作為施放此咒語的額外費用，棄一張牌。\n抓兩張牌。', { effects: [{ e: 'draw', n: 2 }] }, { addCost: { discard: 1 } });
inst(S, 'C', 'Felonious Rage', '{R}', '目標由你操控的生物得+2/+0並獲得敏捷異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 0, kw: ['haste'] }],
});
inst(S, 'C', 'Galvanize', '{1}{R}', '對目標生物造成3點傷害。若你本回合抓過兩張或更多牌，改為造成5點傷害。', {
  targets: [CR],
  effects: [{ e: 'if', cond: { c: 'drawsGte', n: 2 }, then: [{ e: 'damage', n: 5, to: 'T0' }], else: [{ e: 'damage', n: 3, to: 'T0' }] }],
});
cr(S, 'C', 'Gearbane Orangutan', '{2}{R}', 'Ape', 2, 2, '延勢\n當此生物進戰場時，消滅至多一個目標神器。', {
  keywords: ['reach'],
  abilities: [etb([destroyT0], { targets: [{ kind: 'permanent', filter: { type: 'Artifact' }, optional: true }] })],
});
cr(S, 'C', 'Red Herring', '{1}{R}', 'Clue Fish', 2, 2, '敏捷\n{2}，犧牲此生物：抓一張牌。', {
  types: ['Artifact', 'Creature'],
  keywords: ['haste'],
  abilities: [CLUE_SAC],
});

// ---------------- 綠 ----------------
ench(S, 'M', 'Undergrowth Recon', '{1}{G}{G}', '在你的維持開始時，將目標地牌從你的墳墓場移回戰場。', {
  abilities: [trig('upkeep', [{ e: 'reanimate', what: 'T0' }], { targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Land' }, optional: true, prompt: '選擇墳墓場中的地牌' }] })],
});
inst(S, 'U', 'Get a Leg Up', '{G}', '目標生物得+1/+1（由你操控的生物每有一個，便再得+1/+1）並獲得延勢異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: { count: { type: 'Creature', ctrl: 'you' } }, t: { count: { type: 'Creature', ctrl: 'you' } }, kw: ['reach'] }],
});
cr(S, 'U', 'Glint Weaver', '{5}{G}{G}', 'Spider', 3, 3, '延勢\n當此生物進戰場時，將三個+1/+1指示物分配到一至三個目標生物上。', {
  keywords: ['reach'],
  abilities: [
    etb([{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }, { e: 'counters', what: 'T2', n: 1 }], {
      targets: [MY_CR, { ...MY_CR, optional: true }, { ...MY_CR, optional: true }],
    }),
  ],
});
sorc(S, 'U', 'Hard-Hitting Question', '{G}', '目標由你操控的生物對目標不由你操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'bite', a: 'T0', b: 'T1' }],
});
cr(S, 'U', 'Pompous Gadabout', '{2}{G}', 'Human Citizen', 4, 2, '在你的回合中，此生物具有辟邪異能。', {
  abilities: [{ kind: 'static', self: { cond: { c: 'yourTurn' }, grant: { kw: ['hexproof'] } } }],
});
arti(S, 'U', 'Rope', '{G}', '佩帶此武具的生物得+1/+2且具有延勢異能。\n{2}，犧牲此武具：抓一張牌。\n裝備{3}', {
  subtypes: ['Clue', 'Equipment'],
  equip: { cost: '{3}', grant: { p: 1, t: 2, kw: ['reach'] } },
  abilities: [CLUE_SAC],
});
inst(S, 'C', 'Fanatical Strength', '{1}{G}', '目標生物得+3/+3並獲得踐踏異能直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 3, kw: ['trample'] }] });
cr(S, 'C', 'Topiary Panther', '{4}{G}{G}', 'Plant Cat', 6, 5, '踐踏', { keywords: ['trample'] });

// ---------------- 多色／無色 ----------------
cr(S, 'M', 'Trostani, Three Whispers', '{G}{G/W}{W}', 'Dryad', 4, 4, '{1}{G}：目標生物獲得死觸異能直到回合結束。\n{G/W}：目標生物獲得警戒異能直到回合結束。\n{2}{W}：目標生物獲得連擊異能直到回合結束。', {
  supertypes: ['Legendary'],
  abilities: [
    act({ mana: '{1}{G}' }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['deathtouch'] }], '獲得死觸', { targets: [MY_CR] }),
    act({ mana: '{G/W}' }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['vigilance'] }], '獲得警戒', { targets: [MY_CR] }),
    act({ mana: '{2}{W}' }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['double_strike'] }], '獲得連擊', { targets: [MY_CR] }),
  ],
});
inst(S, 'R', "Assassin's Trophy", '{B}{G}', '消滅目標由對手操控的永久物。其操控者可以從其牌庫中搜尋一張基本地牌，將它放進戰場。', {
  targets: [{ kind: 'permanent', filter: { ctrl: 'opp' } }],
  effects: [destroyT0, { e: 'searchLand', to: 'battlefield', who: 'T0ctrl' }],
});
ench(S, 'R', "Warleader's Call", '{1}{R}{W}', '由你操控的生物得+1/+1。\n每當一個生物在你的操控下進戰場時，此結界對每位對手各造成1點傷害。', {
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you' }, grant: { p: 1, t: 1 } } },
    trig('allyEtb', [{ e: 'damage', n: 1, to: 'opp' }]),
  ],
});
cr(S, 'U', 'Kraul Whipcracker', '{B}{G}', 'Insect Assassin', 3, 2, '延勢\n當此生物進戰場時，消滅目標由對手操控的衍生物。', {
  keywords: ['reach'],
  abilities: [etb([destroyT0], { targets: [{ kind: 'permanent', filter: { ctrl: 'opp', token: true }, optional: true }] })],
});
inst(S, 'U', 'No More Lies', '{W}{U}', '反擊目標咒語，除非其操控者支付{3}。', { targets: [{ kind: 'spell' }], effects: [{ e: 'counterUnless', what: 'T0', pay: 3 }] });
cr(S, 'U', 'Private Eye', '{1}{W}{U}', 'Homunculus Detective', 3, 3, '由你操控的其他偵探得+1/+1。', {
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', sub: 'Detective', other: true }, grant: { p: 1, t: 1 } } }],
});
arti(S, 'C', 'Thinking Cap', '{1}', '佩帶此武具的生物得+1/+2。\n裝備{3}', { subtypes: ['Equipment'], equip: { cost: '{3}', grant: { p: 1, t: 2 } } });
cr(S, 'C', 'Sanitation Automaton', '{2}', 'Construct', 2, 1, '當此生物進戰場時，刺探1。', { types: ['Artifact', 'Creature'], abilities: [etb([{ e: 'surveil', n: 1 }])] });
