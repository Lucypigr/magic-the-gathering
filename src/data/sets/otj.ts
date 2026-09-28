// Outlaws of Thunder Junction（OTJ，2024 年 4 月）
import type { Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, OUTLAWS, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'OTJ';
const MERC = 'tok-mercenary';
const MERC_TEXT = '派出一個1/1紅色傭兵衍生生物，它具有「{T}：目標由你操控的生物得+1/+0直到回合結束。只能於法術時機起動。」';

// 沙漠雙色地：橫置進戰場，進場時對目標對手造成1點傷害
const desert = (name: string, a: Mana, b: Mana) =>
  land(S, 'C', name, [a, b], `此地橫置進戰場。\n當此地進戰場時，它對目標對手造成1點傷害。\n{T}：加{${a}}或{${b}}。`, {
    etbTapped: true,
    subtypes: ['Desert'],
    abilities: [etb([{ e: 'damage', n: 1, to: 'T0' }], { targets: [OPP] })],
  });
desert('Abraded Bluffs', 'R', 'W');
desert('Bristling Backwoods', 'R', 'G');
desert('Creosote Heath', 'G', 'W');
desert('Eroded Canyon', 'U', 'R');
desert('Festering Gulch', 'B', 'G');
desert('Forlorn Flats', 'W', 'B');
desert('Jagged Barrens', 'B', 'R');
desert('Lonely Arroyo', 'W', 'U');
desert('Lush Oasis', 'G', 'U');
desert('Soured Springs', 'U', 'B');

// ---------------- 白 ----------------
inst(S, 'U', 'Bovine Intervention', '{1}{W}', '消滅目標神器或生物。其操控者派出一個2/2白色牛衍生生物。', {
  targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'] } }],
  effects: [destroyT0, { e: 'token', token: 'tok-ox', who: 'T0ctrl' }],
});
cr(S, 'U', 'Nurturing Pixie', '{W}', 'Faerie Rogue', 1, 1, '飛行\n當此生物進戰場時，將至多一個目標由你操控的非地永久物移回其擁有者手上。若如此作，在此生物上放置一個+1/+1指示物。', {
  keywords: ['flying'],
  abilities: [
    etb([{ e: 'if', cond: { c: 'targetIs', t: 0, filter: { ctrl: 'you' } }, then: [{ e: 'bounce', what: 'T0' }, { e: 'counters', what: 'self', n: 1 }] }], {
      targets: [{ kind: 'permanent', filter: { ctrl: 'you', nonType: 'Land', nonSub: 'Faerie' }, notSelf: true, optional: true }],
    }),
  ],
});
sorc(S, 'C', "Eriette's Lullaby", '{1}{W}', '消滅目標已橫置的生物。你獲得2點生命。', {
  targets: [{ kind: 'creature', filter: { tapped: true } }],
  effects: [destroyT0, { e: 'gain', n: 2 }],
});
cr(S, 'C', 'Holy Cow', '{2}{W}', 'Ox Angel', 2, 2, '閃現，飛行\n當此生物進戰場時，你獲得2點生命並占卜1。', {
  keywords: ['flash', 'flying'],
  abilities: [etb([{ e: 'gain', n: 2 }, { e: 'scry', n: 1 }])],
});
cr(S, 'C', 'Outlaw Medic', '{1}{W}', 'Human Rogue', 1, 3, '繫命\n當此生物死去時，抓一張牌。', { keywords: ['lifelink'], abilities: [trig('dies', [{ e: 'draw', n: 1 }])] });
cr(S, 'C', 'Sterling Keykeeper', '{1}{W}', 'Human Mercenary', 2, 2, '{2}，{T}：橫置目標生物。', {
  abilities: [act({ mana: '{2}', tap: true }, [{ e: 'tap', what: 'T0' }], '橫置生物', { targets: [OPP_CR] })],
});
cr(S, 'C', 'Sterling Supplier', '{4}{W}', 'Bird Soldier', 3, 4, '飛行\n當此生物進戰場時，在另一個目標由你操控的生物上放置一個+1/+1指示物。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] })],
});
cr(S, 'C', 'Vengeful Townsfolk', '{2}{W}', 'Human Citizen', 3, 3, '每當一個或更多由你操控的其他生物死去時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('allyDies', [{ e: 'counters', what: 'self', n: 1 }], { filter: { type: 'Creature' } })],
});
cr(S, 'C', 'Wanted Griffin', '{3}{W}', 'Griffin', 3, 2, `飛行\n當此生物死去時，${MERC_TEXT}`, {
  keywords: ['flying'],
  abilities: [trig('dies', [{ e: 'token', token: MERC }])],
});

// ---------------- 藍 ----------------
cr(S, 'R', 'Stoic Sphinx', '{2}{U}{U}', 'Sphinx', 5, 3, '閃現，飛行', { keywords: ['flash', 'flying'] });
cr(S, 'U', 'Canyon Crab', '{1}{U}', 'Crab', 0, 5, '{1}{U}：此生物得+2/-2直到回合結束。', {
  abilities: [act({ mana: '{1}{U}' }, [{ e: 'pump', what: 'self', p: 2, t: -2 }], '+2/-2')],
});
inst(S, 'U', "This Town Ain't Big Enough", '{4}{U}', '若此咒語以由你操控的永久物為目標，則減少{3}來施放。\n將至多兩個目標非地永久物移回其擁有者手上。', {
  modes: [
    {
      text: '彈回兩個非地永久物',
      targets: [
        { kind: 'permanent', filter: { nonType: 'Land' } },
        { kind: 'permanent', filter: { nonType: 'Land' }, optional: true },
      ],
      effects: [{ e: 'bounce', what: 'T0' }, { e: 'bounce', what: 'T1' }],
    },
    {
      text: '含你的永久物（{1}{U}）',
      cost: '{1}{U}',
      targets: [
        { kind: 'permanent', filter: { nonType: 'Land', ctrl: 'you' } },
        { kind: 'permanent', filter: { nonType: 'Land' }, optional: true },
      ],
      effects: [{ e: 'bounce', what: 'T0' }, { e: 'bounce', what: 'T1' }],
    },
  ],
});
cr(S, 'C', 'Daring Thunder-Thief', '{3}{U}', 'Turtle Rogue', 4, 4, '閃現\n此生物橫置進戰場。', { keywords: ['flash'], etbTapped: true });
inst(S, 'C', 'Failed Fording', '{1}{U}', '將目標非地永久物移回其擁有者手上。若你操控沙漠，刺探1。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'if', cond: { c: 'controls', filter: { sub: 'Desert' } }, then: [{ e: 'surveil', n: 1 }] }],
});
cr(S, 'C', 'Geyser Drake', '{2}{U}', 'Drake', 2, 3, '飛行', { keywords: ['flying'] });
cr(S, 'C', 'Harrier Strix', '{U}', 'Bird', 1, 1, '飛行\n當此生物進戰場時，橫置目標永久物。\n{2}{U}：抓一張牌，然後棄一張牌。', {
  keywords: ['flying'],
  abilities: [
    etb([{ e: 'tap', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'opp' }, optional: true }] }),
    act({ mana: '{2}{U}' }, [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }], '抓一棄一'),
  ],
});
cr(S, 'C', 'Peerless Ropemaster', '{4}{U}', 'Human Rogue', 4, 4, '當此生物進戰場時，將至多一個目標已橫置的生物移回其擁有者手上。', {
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ kind: 'creature', filter: { tapped: true }, optional: true }] })],
});
cr(S, 'C', 'Razzle-Dazzler', '{1}{U}', 'Human Wizard', 1, 2, '每當你施放本回合的第二個咒語時，在此生物上放置一個+1/+1指示物。它本回合不能被阻擋。', {
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }, { e: 'pump', what: 'self', p: 0, t: 0, kw: ['unblockable'] }], { cond: { c: 'secondSpell' } })],
});
cr(S, 'C', 'Spring Splasher', '{1}{U}', 'Frog Beast', 2, 1, '每當此生物攻擊時，目標由防禦玩家操控的生物得-3/-0直到回合結束。', {
  abilities: [trig('attacks', [{ e: 'pump', what: 'T0', p: -3, t: 0 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
inst(S, 'C', 'Take the Fall', '{U}', '目標生物得-1/-0直到回合結束。若你操控法外者，改為得-4/-0。抓一張牌。', {
  targets: [CR],
  effects: [
    { e: 'if', cond: { c: 'controls', filter: { sub: OUTLAWS } }, then: [{ e: 'pump', what: 'T0', p: -4, t: 0 }], else: [{ e: 'pump', what: 'T0', p: -1, t: 0 }] },
    { e: 'draw', n: 1 },
  ],
});

// ---------------- 黑 ----------------
cr(S, 'M', 'Tinybones, the Pickpocket', '{B}', 'Skeleton Rogue', 1, 1, '死觸', { supertypes: ['Legendary'], keywords: ['deathtouch'] });
cr(S, 'C', 'Ambush Gigapede', '{4}{B}{B}', 'Insect', 6, 2, '閃現\n當此生物進戰場時，目標由對手操控的生物得-2/-2直到回合結束。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: -2, t: -2 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
inst(S, 'C', 'Corrupted Conviction', '{B}', '作為施放此咒語的額外費用，犧牲一個生物。\n抓兩張牌。', { effects: [{ e: 'draw', n: 2 }] }, { addCost: { sac: { type: 'Creature' } } });
inst(S, 'C', "Desert's Due", '{1}{B}', '目標生物得-2/-2直到回合結束。你每操控一個沙漠，它便額外得-1/-1直到回合結束。', {
  targets: [CR],
  effects: [
    { e: 'pump', what: 'T0', p: -2, t: -2 },
    { e: 'pump', what: 'T0', p: { count: { sub: 'Desert', ctrl: 'you' } }, t: { count: { sub: 'Desert', ctrl: 'you' } } },
  ],
});
cr(S, 'C', 'Desperate Bloodseeker', '{1}{B}', 'Vampire', 2, 2, '繫命\n當此生物進戰場時，目標玩家碾磨兩張牌。', {
  keywords: ['lifelink'],
  abilities: [etb([{ e: 'mill', n: 2, who: 'T0' }], { targets: [{ kind: 'player' }] })],
});
cr(S, 'C', 'Nezumi Linkbreaker', '{B}', 'Rat Warlock', 1, 1, `當此生物死去時，${MERC_TEXT}`, { abilities: [trig('dies', [{ e: 'token', token: MERC }])] });
cr(S, 'C', 'Rooftop Assassin', '{3}{B}', 'Vampire Assassin', 2, 2, '閃現\n飛行，繫命\n當此生物進戰場時，消滅目標本回合受到過傷害、由對手操控的生物。', {
  keywords: ['flash', 'flying', 'lifelink'],
  abilities: [etb([destroyT0], { targets: [{ kind: 'creature', filter: { ctrl: 'opp', damaged: true }, optional: true }] })],
});
inst(S, 'C', 'Skulduggery', '{B}', '目標由你操控的生物得+1/+1，且目標由對手操控的生物得-1/-1直到回合結束。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 1 }, { e: 'pump', what: 'T1', p: -1, t: -1 }],
});
cr(S, 'C', 'Vault Plunderer', '{2}{B}', 'Human Rogue', 3, 1, '當此生物進戰場時，目標玩家抓一張牌並失去1點生命。', {
  abilities: [etb([{ e: 'draw', n: 1, who: 'T0' }, { e: 'lose', n: 1, who: 'T0' }], { targets: [{ kind: 'player' }] })],
});

// ---------------- 紅 ----------------
ench(S, 'U', 'Ferocification', '{2}{R}', '在你回合的戰鬥開始時，目標由你操控的生物得+2/+0直到回合結束。', {
  abilities: [trig('combatStart', [{ e: 'pump', what: 'T0', p: 2, t: 0 }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Hellspur Brute', '{4}{R}', 'Minotaur Mercenary', 5, 4, '你每操控一個法外者，此咒語便減少{1}來施放。\n踐踏', {
  keywords: ['trample'],
  costReduce: { perCount: { type: 'Creature', sub: OUTLAWS } },
});
cr(S, 'U', 'Magebane Lizard', '{1}{R}', 'Lizard', 1, 4, '每當任一玩家施放非生物咒語時，此生物對該玩家造成1點傷害。', {
  abilities: [trig('castNoncreature', [{ e: 'damage', n: 1, to: 'evPlayer' }], { anyPlayer: true })],
});
cr(S, 'U', 'Resilient Roadrunner', '{1}{R}', 'Bird', 2, 2, '敏捷', { keywords: ['haste'] });
cr(S, 'U', 'Scalestorm Summoner', '{2}{R}', 'Human Warlock', 3, 3, '每當此生物攻擊時，若你操控力量為4或更多的生物，派出一個3/1紅色恐龍衍生生物。', {
  abilities: [trig('attacks', [{ e: 'token', token: 'tok-dino31' }], { cond: { c: 'controls', filter: { type: 'Creature', powMin: 4 } } })],
});
sorc(S, 'U', 'Scorching Shot', '{R}{R}', '對目標生物造成5點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 5, to: 'T0' }] });
cr(S, 'C', 'Deadeye Duelist', '{1}{R}', 'Human Assassin', 1, 3, '延勢\n{1}，{T}：此生物對目標對手造成1點傷害。', {
  keywords: ['reach'],
  abilities: [act({ mana: '{1}', tap: true }, [{ e: 'damage', n: 1, to: 'T0' }], '1點傷害', { targets: [OPP] })],
});
cr(S, 'C', 'Discerning Peddler', '{1}{R}', 'Human Rogue', 2, 2, '當此生物進戰場時，你可以棄一張牌。若你如此作，抓一張牌。', {
  abilities: [etb([{ e: 'costThen', prompt: '棄一張牌來抓一張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }])],
});
cr(S, 'C', 'Iron-Fist Pulverizer', '{4}{R}', 'Giant Warrior', 4, 5, '延勢\n每當你施放本回合的第二個咒語時，此生物對目標對手造成2點傷害。占卜1。', {
  keywords: ['reach'],
  abilities: [trig('castAny', [{ e: 'damage', n: 2, to: 'T0' }, { e: 'scry', n: 1 }], { cond: { c: 'secondSpell' }, targets: [OPP] })],
});
cr(S, 'C', 'Prickly Pair', '{2}{R}', 'Plant Mercenary', 2, 2, `當此生物進戰場時，${MERC_TEXT}`, { abilities: [etb([{ e: 'token', token: MERC }])] });
inst(S, 'C', 'Quick Draw', '{R}', '目標由你操控的生物得+1/+1並獲得先攻異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 1, kw: ['first_strike'] }],
});
inst(S, 'C', 'Thunder Salvo', '{1}{R}', '對目標生物造成X點傷害，X為2加上你本回合施放過的其他咒語數量。', {
  targets: [CR],
  effects: [{ e: 'damage', n: 1, to: 'T0' }, { e: 'damage', n: { spellsCast: true }, to: 'T0' }],
});
inst(S, 'C', 'Trick Shot', '{4}{R}', '對目標生物造成6點傷害，並對至多一個另外的目標生物衍生物造成2點傷害。', {
  targets: [CR, { kind: 'creature', filter: { token: true }, optional: true }],
  effects: [{ e: 'damage', n: 6, to: 'T0' }, { e: 'damage', n: 2, to: 'T1' }],
});

// ---------------- 綠 ----------------
inst(S, 'U', 'Betrayal at the Vault', '{4}{G}{G}', '目標由你操控的生物對兩個另外的目標生物各造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR, { ...OPP_CR, optional: true }],
  effects: [
    { e: 'bite', a: 'T0', b: 'T1' },
    { e: 'bite', a: 'T0', b: 'T2' },
  ],
});
sorc(S, 'U', 'Full Steam Ahead', '{3}{G}{G}', '由你操控的每個生物得+2/+2並獲得踐踏異能直到回合結束。', {
  effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 2, t: 2, kw: ['trample'] }],
});
cr(S, 'U', 'Intrepid Stablemaster', '{1}{G}', 'Human Scout', 2, 2, '延勢\n{T}：加{G}。', { keywords: ['reach'], produces: ['G'] });
sorc(S, 'U', 'Map the Frontier', '{3}{G}', '從你的牌庫中搜尋至多兩張基本地牌，將它們橫置放進戰場。', {
  effects: [
    { e: 'searchLand', to: 'battlefield', tapped: true },
    { e: 'searchLand', to: 'battlefield', tapped: true, may: true },
  ],
});
cr(S, 'U', 'Outcaster Greenblade', '{2}{G}', 'Human Mercenary', 1, 2, '當此生物進戰場時，從你的牌庫中搜尋一張基本地牌，將它置於你手上。\n你每操控一個沙漠，此生物便得+1/+1。', {
  abilities: [etb([{ e: 'searchLand', to: 'hand' }]), { kind: 'static', self: { cond: { c: 'controls', filter: { sub: 'Desert' } }, grant: { p: 1, t: 1 } } }],
  text: '當此生物進戰場時，從你的牌庫中搜尋一張基本地牌，將它置於你手上。\n只要你操控沙漠，此生物得+1/+1。',
});
cr(S, 'C', 'Ankle Biter', '{G}', 'Snake', 1, 1, '死觸', { keywords: ['deathtouch'] });
cr(S, 'C', 'Cactarantula', '{4}{G}{G}', 'Plant Spider', 6, 5, '若你操控沙漠，此咒語減少{1}來施放。\n延勢\n每當由你操控的蜘蛛成為對手的咒語或異能的目標時，你可以抓一張牌。', {
  keywords: ['reach'],
  costReduce: { cond: { c: 'controls', filter: { sub: 'Desert' } }, mana: '{1}' },
  abilities: [trig('allyTargeted', [{ e: 'draw', n: 1 }], { filter: { sub: 'Spider' } })],
});
ench(S, 'C', 'Reach for the Sky', '{3}{G}', '閃現\n結附於生物\n所結附的生物得+3/+2且具有延勢異能。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 3, t: 2, kw: ['reach'] } },
});
sorc(S, 'C', 'Throw from the Saddle', '{1}{G}', '目標由你操控的生物得+1/+1直到回合結束。然後它對目標不由你操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 1 }, { e: 'bite', a: 'T0', b: 'T1' }],
});
cr(S, 'C', 'Voracious Varmint', '{1}{G}', 'Varmint', 2, 2, '警戒\n{1}，犧牲此生物：消滅目標神器或結界。', {
  keywords: ['vigilance'],
  abilities: [act({ mana: '{1}', sacSelf: true }, [destroyT0], '犧牲：消滅神器或結界', { targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] } }] })],
});

// ---------------- 多色／無色 ----------------
sorc(S, 'U', 'Badlands Revival', '{3}{B}{G}', '將至多一張目標生物牌從你的墳墓場移回戰場。將至多一張目標永久物牌從你的墳墓場移回你手上。', {
  targets: [
    { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇要移回戰場的生物牌' },
    { kind: 'gyCard', filter: { ctrl: 'you', nonType: ['Instant', 'Sorcery'] }, optional: true, prompt: '選擇要移回手上的永久物牌' },
  ],
  effects: [{ e: 'reanimate', what: 'T0' }, { e: 'toHand', what: 'T1' }],
});
cr(S, 'U', 'Honest Rutstein', '{1}{B}{G}', 'Human Warlock', 3, 2, '當此生物進戰場時，將目標生物牌從你的墳墓場移回你手上。\n你施放的生物咒語減少{1}來施放。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'toHand', what: 'T0' }], { targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' }] }),
    { kind: 'static', spellCostLess: { filter: { type: 'Creature' }, n: 1 } },
  ],
});
cr(S, 'U', 'Jem Lightfoote, Sky Explorer', '{2}{W}{U}', 'Human Scout', 3, 3, '飛行，警戒', { supertypes: ['Legendary'], keywords: ['flying', 'vigilance'] });
cr(S, 'U', 'Kraum, Violent Cacophony', '{2}{U}{R}', 'Zombie Horror', 2, 3, '飛行\n每當你施放本回合的第二個咒語時，在此生物上放置一個+1/+1指示物並抓一張牌。', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }, { e: 'draw', n: 1 }], { cond: { c: 'secondSpell' } })],
});
cr(S, 'U', 'Ruthless Lawbringer', '{1}{W}{B}', 'Vampire Assassin', 3, 2, '當此生物進戰場時，你可以犧牲另一個生物。若你如此作，消滅目標非地永久物。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '犧牲另一個生物來消滅目標永久物？', cost: { sac: { type: 'Creature', other: true } }, then: [destroyT0] }], {
      targets: [{ kind: 'permanent', filter: { ctrl: 'opp', nonType: 'Land' }, optional: true }],
    }),
  ],
});
inst(S, 'U', 'Slick Sequence', '{U}{R}', '對任意一個目標造成2點傷害。若你本回合施放過其他咒語，抓一張牌。', {
  targets: [ANY],
  effects: [{ e: 'damage', n: 2, to: 'T0' }, { e: 'if', cond: { c: 'spellsCast', n: 2 }, then: [{ e: 'draw', n: 1 }] }],
});
cr(S, 'U', 'Vial Smasher, Gleeful Grenadier', '{B}{R}', 'Goblin Mercenary', 3, 2, '每當另一個法外者在你的操控下進戰場時，此生物對目標對手造成1點傷害。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyEtb', [{ e: 'damage', n: 1, to: 'T0' }], { filter: { sub: OUTLAWS }, targets: [OPP] })],
});
arti(S, 'U', 'Lavaspur Boots', '{1}', '佩帶此武具的生物得+1/+0且具有敏捷異能。\n裝備{1}', { subtypes: ['Equipment'], equip: { cost: '{1}', grant: { p: 1, kw: ['haste'] } } });
arti(S, 'U', 'Thunder Lasso', '{2}{W}', '當此武具進戰場時，將它裝備到目標由你操控的生物上。\n佩帶此武具的生物得+1/+1。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { p: 1, t: 1 } },
  abilities: [etb([{ e: 'attach', what: 'T0' }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Oasis Gardener', '{3}', 'Scarecrow', 2, 2, '當此生物進戰場時，你獲得2點生命。\n{T}：加一點任意顏色的法術力。', {
  types: ['Artifact', 'Creature'],
  produces: ['W', 'U', 'B', 'R', 'G'],
  abilities: [etb([{ e: 'gain', n: 2 }])],
});
cr(S, 'C', 'Sterling Hound', '{3}', 'Dog', 3, 2, '當此生物進戰場時，刺探2。', { types: ['Artifact', 'Creature'], abilities: [etb([{ e: 'surveil', n: 2 }])] });
