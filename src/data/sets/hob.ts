// The Hobbit（HOB，2026 年 8 月）
// 傳說故事（Storied）：只要你操控三個或更多神器及／或傳奇永久物。
// 集結鬼怪 n：在你的軍隊上放置 n 個 +1/+1 指示物；若沒有軍隊，先派出 0/0 黑色鬼怪軍隊。
// 招募：抓一張牌，然後棄一張牌。若棄掉的不是地，派出一個 1/1 白色人類士兵。
// 兇猛（Ferocious）：若你操控力量為4或更多的生物。
import type { Cond, Filter, Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'HOB';
const STORIED: Cond = { c: 'controls', filter: { or: [{ type: 'Artifact' }, { legendary: true }] }, n: 3 };
const FEROCIOUS: Cond = { c: 'controls', filter: { type: 'Creature', powMin: 4 } };
const GOBLINISH: Filter = { sub: ['Goblin', 'Orc', 'Army'] };

// 雙色地：{2}XY，{T}，犧牲：在目標部族生物上放置兩個+1/+1指示物
const tribeland = (name: string, a: Mana, b: Mana, tribe: string[], tribeZh: string) =>
  land(S, 'C', name, [a, b], `此地橫置進戰場。\n{T}：加{${a}}或{${b}}。\n{2}{${a}}{${b}}，{T}，犧牲此地：在目標由你操控的${tribeZh}上放置兩個+1/+1指示物。只能於法術時機起動。`, {
    etbTapped: true,
    abilities: [
      act({ mana: `{2}{${a}}{${b}}`, tap: true, sacSelf: true }, [{ e: 'counters', what: 'T0', n: 2 }], '犧牲：兩個+1/+1指示物', {
        sorcery: true,
        targets: [{ kind: 'creature', filter: { ctrl: 'you', sub: tribe } }],
      }),
    ],
  });
tribeland('Goblin-town', 'B', 'R', ['Goblin', 'Orc'], '鬼怪或半獸人');
tribeland('Iron Hills', 'R', 'W', ['Dwarf'], '矮人');
tribeland('Lake-town', 'W', 'U', ['Human'], '人類');
tribeland('Mirkwood', 'B', 'G', ['Bear', 'Spider', 'Wolf'], '熊、蜘蛛或狼');
tribeland("Elvenking's Halls", 'G', 'U', ['Elf'], '精靈');
land(S, 'R', 'The Lonely Mountain', ['R'], '（{T}：加{R}。）\n除非你操控武具，否則此地橫置進戰場。\n{4}{R}，{T}：派出一個2/2紅色矮人衍生生物。只能於法術時機起動。', {
  subtypes: ['Mountain'],
  supertypes: ['Legendary'],
  etbTappedUnless: { c: 'controls', filter: { sub: 'Equipment' } },
  abilities: [act({ mana: '{4}{R}', tap: true }, [{ e: 'token', token: 'tok-dwarf' }], '派出矮人', { sorcery: true })],
});

// ---------------- 白 ----------------
cr(S, 'R', 'Kíli the Resourceful', '{1}{W}', 'Dwarf Scout', 1, 2, '每當另一個矮人或武具在你的操控下進戰場時，抓一張牌。此異能每回合只會觸發一次。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyPermEtb', [{ e: 'draw', n: 1 }], { filter: { sub: ['Dwarf', 'Equipment'] }, oncePerTurn: true })],
});
cr(S, 'U', 'Dáin, Lord of the Iron Hills', '{1}{W}', 'Dwarf Noble', 2, 2, '警戒\n傳說故事—只要你操控三個或更多神器及／或傳奇永久物，此生物得+1/+1。', {
  supertypes: ['Legendary'],
  keywords: ['vigilance'],
  abilities: [{ kind: 'static', self: { cond: STORIED, grant: { p: 1, t: 1 } } }],
});
cr(S, 'U', 'Iron Hills Blacksmith', '{1}{W}', 'Dwarf Artificer', 1, 1, '連擊\n當此生物進戰場時，派出一個名為斧的無色武具神器衍生物，它具有「佩帶此武具的生物得+1/+0」與裝備{2}。', {
  keywords: ['double_strike'],
  abilities: [etb([{ e: 'token', token: 'tok-axe' }])],
});
cr(S, 'U', 'Eagle of the Great Shelf', '{4}{W}', 'Bird Soldier', 2, 5, '飛行\n每當此生物攻擊時，由你操控的其他生物每有一個，它便得+1/+1直到回合結束。', {
  keywords: ['flying'],
  abilities: [
    trig('attacks', [
      {
        e: 'pump',
        what: 'self',
        p: { count: { type: 'Creature', ctrl: 'you', other: true } },
        t: { count: { type: 'Creature', ctrl: 'you', other: true } },
      },
    ]),
  ],
});
inst(S, 'U', 'Stone by Sunlight', '{1}{W}', '選擇一項：\n• 消滅目標力量為4或更多的生物。\n• 目標生物獲得不滅異能直到回合結束。', {
  modes: [
    { text: '消滅力量4以上的生物', targets: [{ kind: 'creature', filter: { powMin: 4 } }], effects: [destroyT0] },
    { text: '獲得不滅', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['indestructible'] }] },
  ],
});
cr(S, 'C', 'Ori, Keeper of Songs', '{2}{W}', 'Dwarf Bard', 3, 3, '傳說故事—只要你操控三個或更多神器及／或傳奇永久物，此生物得+1/+0且具有警戒異能。', {
  supertypes: ['Legendary'],
  abilities: [{ kind: 'static', self: { cond: STORIED, grant: { p: 1, kw: ['vigilance'] } } }],
});
cr(S, 'C', 'Dwarven Provisioner', '{1}{W}', 'Dwarf Citizen', 2, 2, '{3}{W}：由你操控的生物得+1/+1直到回合結束。', {
  abilities: [act({ mana: '{3}{W}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }], '全體+1/+1')],
});
arti(S, 'C', 'Dwarven Shortsword', '{3}{W}', '當此武具進戰場時，派出一個2/2紅色矮人衍生生物，然後將此武具裝備到它上面。\n佩帶此武具的生物得+1/+2。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { p: 1, t: 2 } },
  abilities: [etb([{ e: 'token', token: 'tok-dwarf' }, { e: 'attach', what: 'created' }])],
});
cr(S, 'C', 'Lake-town Lookout', '{W}', 'Human Scout', 1, 1, '當此生物死去時，招募。', { abilities: [trig('dies', [{ e: 'recruit' }])] });
inst(S, 'C', "Thorin's Last Stand", '{2}{W}{W}', '選擇一項：\n• 由你操控的生物得+2/+1直到回合結束。\n• 消滅目標神器或結界。你獲得2點生命。', {
  modes: [
    { text: '全體+2/+1', effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 2, t: 1 }] },
    { text: '消滅神器或結界', targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] } }], effects: [destroyT0, { e: 'gain', n: 2 }] },
  ],
});
inst(S, 'C', 'Magnificent End', '{4}{W}', '若此咒語以已橫置的生物為目標，則減少{3}來施放。\n對目標生物造成5點傷害。', {
  modes: [
    { text: '對已橫置的生物（{1}{W}）', cost: '{1}{W}', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [{ e: 'damage', n: 5, to: 'T0' }] },
    { text: '對生物造成5點傷害', targets: [CR], effects: [{ e: 'damage', n: 5, to: 'T0' }] },
  ],
});
inst(S, 'C', 'Vow to Erebor', '{1}{W}', '重置目標由你操控的生物。它得+2/+2直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'untap', what: 'T0' }, { e: 'pump', what: 'T0', p: 2, t: 2 }],
});
arti(S, 'C', 'Well-Worn Spatula', '{1}', '當此武具進戰場時，你獲得2點生命。\n佩帶此武具的生物得+1/+1。\n裝備{1}', {
  subtypes: ['Equipment'],
  equip: { cost: '{1}', grant: { p: 1, t: 1 } },
  abilities: [etb([{ e: 'gain', n: 2 }])],
});

// ---------------- 藍 ----------------
inst(S, 'U', 'Sound the Trumpets', '{1}{U}{U}', '反擊目標咒語。', { targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] });
cr(S, 'U', 'Ravenhill Flock', '{3}{U}', 'Bird', 1, 2, '飛行\n每當你於一回合中抓第二張牌時，在此生物上放置兩個+1/+1指示物。', {
  keywords: ['flying'],
  abilities: [trig('drawSecond', [{ e: 'counters', what: 'self', n: 2 }])],
});
arti(S, 'U', 'Thrór\'s Map', '{2}', '當此神器進戰場時，從你的牌庫中搜尋一張基本地牌，將它置於你手上。\n{2}，{T}：抓一張牌，然後棄一張牌。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'searchLand', to: 'hand' }]),
    act({ mana: '{2}', tap: true }, [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }], '抓一棄一'),
  ],
});
inst(S, 'C', 'Confusticate and Bebother', '{2}{U}', '選擇一項：\n• 反擊目標咒語，除非其操控者支付{4}。\n• 抓兩張牌，然後棄一張牌。', {
  modes: [
    { text: '反擊除非支付{4}', targets: [{ kind: 'spell' }], effects: [{ e: 'counterUnless', what: 'T0', pay: 4 }] },
    { text: '抓兩張再棄一張', effects: [{ e: 'draw', n: 2 }, { e: 'discard', n: 1, who: 'you' }] },
  ],
});
cr(S, 'C', 'Lakeshore Apothecary', '{1}{U}', 'Human Cleric', 1, 2, '警戒\n每當你於一回合中抓第二張牌時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['vigilance'],
  abilities: [trig('drawSecond', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'C', 'Long Lake Nuisance', '{3}{U}', 'Bird', 3, 1, '飛行\n當此生物進戰場時，招募。', { keywords: ['flying'], abilities: [etb([{ e: 'recruit' }])] });
cr(S, 'C', 'Gandalf, Wandering Wizard', '{4}{U}', 'Avatar Wizard', 4, 5, '守護{3}', { supertypes: ['Legendary'], ward: 3 });
cr(S, 'C', "Elvenking's Harper", '{1}{U}', 'Elf Bard', 2, 2, '{4}{U}：目標生物本回合不能被阻擋。', {
  abilities: [act({ mana: '{4}{U}' }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['unblockable'] }], '不能被阻擋', { targets: [MY_CR] })],
});

// ---------------- 黑 ----------------
cr(S, 'U', 'Desolation Prowler', '{1}{B}', 'Wolf', 2, 2, '支付2點生命：此生物得+2/+2直到回合結束。此異能每回合只能起動一次。', {
  abilities: [act({ life: 2 }, [{ e: 'pump', what: 'self', p: 2, t: 2 }], '+2/+2', { oncePerTurn: true })],
});
cr(S, 'U', 'Dreaded Bat-Cloud', '{4}{B}', 'Bat', 4, 2, '飛行，死觸', { keywords: ['flying', 'deathtouch'] });
cr(S, 'U', 'Nighthowl Pursuer', '{B}', 'Wolf', 1, 1, '威懾\n兇猛—每當此生物攻擊時，若你操控力量為4或更多的生物，它得+2/+2直到回合結束。', {
  keywords: ['menace'],
  abilities: [trig('attacks', [{ e: 'pump', what: 'self', p: 2, t: 2 }], { cond: FEROCIOUS })],
});
sorc(S, 'U', 'Gnashing of Teeth', '{1}{B}{B}', '選擇一項：\n• 目標生物得-5/-5直到回合結束。\n• 由目標玩家操控的生物得-1/-1直到回合結束。', {
  modes: [
    { text: '-5/-5', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -5, t: -5 }] },
    { text: '對手的生物-1/-1', effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'opp' } }, p: -1, t: -1 }] },
  ],
});
inst(S, 'C', "Bilbo's Deadly Slice", '{1}{B}{B}', '消滅目標生物。', { targets: [CR], effects: [destroyT0] });
arti(S, 'C', 'Crude Bent Blade', '{2}{B}', '當此武具進戰場時，目標對手犧牲一個生物。\n佩帶此武具的生物得+2/+1。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { p: 2, t: 1 } },
  abilities: [etb([{ e: 'edict', who: 'T0' }], { targets: [OPP] })],
});
cr(S, 'C', 'Front Porch Sentries', '{1}{B}', 'Goblin Soldier', 2, 2, '當此生物死去時，目標由對手操控的生物得-1/-1直到回合結束。', {
  abilities: [trig('dies', [{ e: 'pump', what: 'T0', p: -1, t: -1 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
cr(S, 'C', 'Great Fierce Bee', '{2}{B}', 'Insect', 2, 2, '飛行\n每當另一個生物死去時，占卜1。', {
  keywords: ['flying'],
  abilities: [trig('otherDies', [{ e: 'scry', n: 1 }])],
});
sorc(S, 'C', 'Rage into the Valley', '{2}{B}', '你抓一張牌並失去1點生命。集結鬼怪2。', {
  effects: [{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }, { e: 'amass', n: 2 }],
});
cr(S, 'C', 'Ravening Warg', '{1}{B}', 'Wolf', 2, 2, '死觸\n兇猛—每當此生物攻擊時，若你操控力量為4或更多的生物，你獲得2點生命。', {
  keywords: ['deathtouch'],
  abilities: [trig('attacks', [{ e: 'gain', n: 2 }], { cond: FEROCIOUS })],
});
inst(S, 'C', 'Reverent Howl', '{2}{B}', '選擇一項：\n• 你抓兩張牌並失去2點生命。\n• 目標生物得+2/+2並獲得繫命異能直到回合結束。', {
  modes: [
    { text: '抓兩張牌並失去2點生命', effects: [{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'you' }] },
    { text: '+2/+2 並獲得繫命', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['lifelink'] }] },
  ],
});
cr(S, 'C', 'Stony-Voiced Goblins', '{1}{B}', 'Goblin Bard', 1, 1, '當此生物進戰場時，每位對手各棄一張牌。', {
  abilities: [etb([{ e: 'discard', n: 1, who: 'opp' }])],
});

// ---------------- 紅 ----------------
cr(S, 'M', 'Thorin, Mountain-king', '{3}{R}', 'Dwarf Noble', 3, 4, '踐踏\n當此生物進戰場時，目標由你操控的生物對至多一個目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  supertypes: ['Legendary'],
  keywords: ['trample'],
  abilities: [etb([{ e: 'bite', a: 'T0', b: 'T1' }], { targets: [MY_CR, { ...OPP_CR, optional: true }] })],
});
cr(S, 'R', 'Dáin Ironfoot', '{2}{R}', 'Dwarf Warrior', 1, 4, '當此生物進戰場時，派出一個名為斧的無色武具神器衍生物，它具有「佩帶此武具的生物得+1/+0」與裝備{2}，並將它裝備到目標由你操控的生物上。\n每當此生物攻擊時，每個佩帶著武具的進攻生物獲得連擊異能直到回合結束。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'token', token: 'tok-axe', attachTo: 'T0' }], { targets: [MY_CR] }),
    trig('attacks', [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', attacking: true, equipped: true } }, p: 0, t: 0, kw: ['double_strike'] }]),
  ],
});
cr(S, 'R', 'Stone-Giant of High Pass', '{5}{R}{R}', 'Giant', 7, 7, '每當此生物進戰場或攻擊時，派出一個名為巨石的3/1無色，具守軍異能的牆神器衍生生物。\n{2}{R}，犧牲一個神器：此生物對任意一個目標造成4點傷害。', {
  abilities: [
    etb([{ e: 'token', token: 'tok-stone-boulder' }]),
    trig('attacks', [{ e: 'token', token: 'tok-stone-boulder' }]),
    act({ mana: '{2}{R}', sacOther: { type: 'Artifact' } }, [{ e: 'damage', n: 4, to: 'T0' }], '犧牲神器：4點傷害', { targets: [ANY] }),
  ],
});
cr(S, 'U', 'Dwarven Mauler', '{R}', 'Dwarf Warrior', 2, 1, '以此生物為目標的裝備異能減少{2}來起動。', { equipDiscount: 2 });
cr(S, 'U', 'Bothersome Noisemaker', '{1}{R}', 'Goblin Bard', 2, 2, '每當你施放非生物咒語時，集結鬼怪1。', {
  abilities: [trig('castNoncreature', [{ e: 'amass', n: 1 }])],
});
cr(S, 'U', 'Misty Mountains Raider', '{4}{R}', 'Goblin Soldier', 4, 4, '每當你攻擊時，集結鬼怪2。', {
  abilities: [trig('youAttack', [{ e: 'amass', n: 2 }])],
});
cr(S, 'U', 'Gandalf, Spark Starter', '{4}{R}{R}', 'Avatar Wizard', 4, 3, '延勢\n當此生物進戰場時，對任意一個目標造成3點傷害。', {
  supertypes: ['Legendary'],
  keywords: ['reach'],
  abilities: [etb([{ e: 'damage', n: 3, to: 'T0' }], { targets: [ANY] })],
});
cr(S, 'C', 'Goblin-town Flunkies', '{1}{R}', 'Goblin Soldier', 1, 1, '敏捷\n當此生物進戰場時，集結鬼怪1。', {
  keywords: ['haste'],
  abilities: [etb([{ e: 'amass', n: 1 }])],
});
cr(S, 'C', 'Gundabad Opportunist', '{3}{R}', 'Goblin Rogue', 4, 2, '當此生物進戰場時，放逐你牌庫頂的一張牌。本回合你可以使用該牌。', {
  abilities: [etb([{ e: 'impulse', n: 1 }])],
});
cr(S, 'C', 'Iron Hills Stalwart', '{4}{R}', 'Dwarf Warrior', 4, 5, '延勢，踐踏', { keywords: ['reach', 'trample'] });
cr(S, 'C', 'Óin the Brave', '{1}{R}', 'Dwarf Warrior', 1, 3, '傳說故事—只要你操控三個或更多神器及／或傳奇永久物，此生物得+1/+0且具有敏捷異能。', {
  supertypes: ['Legendary'],
  abilities: [{ kind: 'static', self: { cond: STORIED, grant: { p: 1, kw: ['haste'] } } }],
});
inst(S, 'C', 'Pinecone Strike', '{1}{R}', '對目標生物造成3點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 3, to: 'T0' }] });
arti(S, 'C', 'Ragged Short Spear', '{1}{R}', '當此武具進戰場時，你可以棄一張牌。若你如此作，抓兩張牌。\n佩帶此武具的生物得+2/+0。\n裝備{3}', {
  subtypes: ['Equipment'],
  equip: { cost: '{3}', grant: { p: 2 } },
  abilities: [etb([{ e: 'costThen', prompt: '棄一張牌來抓兩張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 2 }] }])],
});
inst(S, 'C', "Smaug's Fury", '{1}{R}', '目標生物得+3/+0並獲得延勢與先攻異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 3, t: 0, kw: ['reach', 'first_strike'] }],
});

// ---------------- 綠 ----------------
cr(S, 'R', 'Gigantic Big Bear', '{5}{G}{G}', 'Bear', 10, 7, '此咒語不能被反擊。\n辟邪，敏捷', { keywords: ['hexproof', 'haste'] });
cr(S, 'U', 'Nasty Little Rabbit', '{G}', 'Rabbit', 1, 2, '兇猛—在你回合的戰鬥開始時，若你操控力量為4或更多的生物，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('combatStart', [{ e: 'counters', what: 'self', n: 1 }], { cond: FEROCIOUS })],
});
cr(S, 'U', 'Old Fat Spider', '{4}{G}{G}', 'Spider', 6, 7, '延勢\n此生物不能被力量為2或更少的生物阻擋。', { keywords: ['reach'], evadePowLte: 2 });
sorc(S, 'U', 'Troll Negotiations', '{2}{G}{G}', '在目標由你操控的生物上放置兩個+1/+1指示物。然後它與目標由對手操控的生物互鬥。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'counters', what: 'T0', n: 2 }, { e: 'fight', a: 'T0', b: 'T1' }],
});
cr(S, 'U', 'Wilderland Scrounger', '{4}{G}', 'Wolf', 3, 6, '兇猛—每當此生物攻擊時，若你操控力量為4或更多的生物，在每個由你操控的生物上各放置一個+1/+1指示物。', {
  abilities: [trig('attacks', [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }], { cond: FEROCIOUS })],
});
cr(S, 'C', 'Attercop', '{1}{G}', 'Spider', 2, 1, '延勢，死觸\n地落—每當一個地在你的操控下進戰場時，此生物得+1/+1直到回合結束。', {
  keywords: ['reach', 'deathtouch'],
  abilities: [trig('landfall', [{ e: 'pump', what: 'self', p: 1, t: 1 }])],
});
cr(S, 'C', 'Ordinary Bear', '{3}{G}', 'Bear', 4, 5, '');
cr(S, 'C', 'Little Bear', '{2}{G}', 'Bear', 3, 2, '閃現\n當此生物進戰場時，重置另一個目標由你操控的生物。若它是熊，在其上放置一個+1/+1指示物。', {
  keywords: ['flash'],
  abilities: [
    etb([{ e: 'untap', what: 'T0' }, { e: 'if', cond: { c: 'targetIs', t: 0, filter: { sub: 'Bear' } }, then: [{ e: 'counters', what: 'T0', n: 1 }] }], {
      targets: [{ ...MY_CR, notSelf: true, optional: true }],
    }),
  ],
});
cr(S, 'C', 'Guardian of the Halls', '{1}{G}', 'Elf Soldier', 2, 2, '踐踏\n{5}{G}{G}：在此生物上放置三個+1/+1指示物。', {
  keywords: ['trample'],
  abilities: [act({ mana: '{5}{G}{G}' }, [{ e: 'counters', what: 'self', n: 3 }], '+3指示物')],
});
cr(S, 'C', 'Wargling', '{1}{G}', 'Wolf', 2, 2, '兇猛—每當此生物攻擊時，若你操控力量為4或更多的生物，它得+1/+0且由你操控的生物獲得踐踏異能直到回合結束。', {
  abilities: [
    trig('attacks', [{ e: 'pump', what: 'self', p: 1, t: 0 }, { e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 0, t: 0, kw: ['trample'] }], {
      cond: FEROCIOUS,
    }),
  ],
});
cr(S, 'C', 'Wood Elves', '{2}{G}', 'Elf Scout', 1, 1, '當此生物進戰場時，從你的牌庫中搜尋一張基本地牌，將它放進戰場。', {
  abilities: [etb([{ e: 'searchLand', to: 'battlefield' }])],
});
inst(S, 'C', 'Quarrel', '{1}{G}', '目標由你操控的生物對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'bite', a: 'T0', b: 'T1' }],
});
inst(S, 'C', 'Warg Tactics', '{1}{G}', '選擇一項：\n• 消滅目標具飛行異能的生物。\n• 在目標由你操控的生物上放置一個+1/+1指示物。它獲得踐踏與辟邪異能直到回合結束。', {
  modes: [
    { text: '消滅飛行生物', targets: [{ kind: 'creature', filter: { kw: 'flying' } }], effects: [destroyT0] },
    { text: '+1/+1指示物、踐踏與辟邪', targets: [MY_CR], effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample', 'hexproof'] }] },
  ],
});

// ---------------- 多色 ----------------
cr(S, 'R', "Dáin's Company", '{R}{W}', 'Dwarf Warrior', 2, 2, '只要你操控另一個矮人，此生物具有繫命異能。\n當此生物進戰場時，檢視你牌庫頂的四張牌。你可以展示其中一張矮人或武具牌並置於你手上。將其餘的牌置於你的牌庫底。', {
  abilities: [
    { kind: 'static', self: { cond: { c: 'controls', filter: { sub: 'Dwarf', other: true } }, grant: { kw: ['lifelink'] } } },
    etb([{ e: 'dig', n: 4, take: 1, rest: 'bottom', filter: { sub: ['Dwarf', 'Equipment'] } }]),
  ],
});
cr(S, 'R', 'The Great Goblin', '{1}{B/R}{B/R}', 'Goblin Noble', 3, 2, '每當你在由你操控的鬼怪、半獸人或軍隊上放置指示物時，此生物對目標對手造成2點傷害。\n每當另一個由你操控的鬼怪、半獸人或軍隊死去時，放逐你牌庫頂的一張牌。本回合你可以使用該牌。', {
  supertypes: ['Legendary'],
  abilities: [
    trig('allyCounters', [{ e: 'damage', n: 2, to: 'T0' }], { filter: GOBLINISH, targets: [OPP] }),
    trig('allyDies', [{ e: 'impulse', n: 1 }], { filter: GOBLINISH }),
  ],
});
cr(S, 'R', "Thranduil's Company", '{2}{G}{U}', 'Elf Soldier', 3, 4, '地落—每當一個地在你的操控下進戰場時，在目標由你操控的生物上放置兩個+1/+1指示物。它獲得警戒異能直到回合結束。', {
  abilities: [trig('landfall', [{ e: 'counters', what: 'T0', n: 2 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['vigilance'] }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Thorin Oakenshield', '{R}{W}', 'Dwarf Noble', 3, 2, '踐踏', { supertypes: ['Legendary'], keywords: ['trample'] });
cr(S, 'U', 'Bard the Bowman', '{1}{W}{U}', 'Human Archer', 1, 3, '延勢\n每當你於一回合中抓第二張牌時，在目標生物上放置一個+1/+1指示物。它獲得繫命異能直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['reach'],
  abilities: [trig('drawSecond', [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['lifelink'] }], { targets: [MY_CR] })],
});
cr(S, 'U', 'The Chief Warg', '{2}{B}{G}', 'Wolf', 3, 3, '威懾\n兇猛—每當你攻擊時，若你操控力量為4或更多的生物，你抓一張牌並失去1點生命。', {
  supertypes: ['Legendary'],
  keywords: ['menace'],
  abilities: [trig('youAttack', [{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }], { cond: FEROCIOUS })],
});
cr(S, 'U', 'Fearsome Goblin Pair', '{2}{B/R}', 'Goblin Soldier', 1, 1, '當此生物死去時，集結鬼怪4。', { abilities: [trig('dies', [{ e: 'amass', n: 4 }])] });
cr(S, 'U', 'Large Bear', '{3}{B/G}{B/G}', 'Bear', 5, 5, '延勢，踐踏，敏捷', { keywords: ['reach', 'trample', 'haste'] });
ench(S, 'U', "Eagle's Rescue", '{2}{W/U}{W/U}', '結附於生物\n所結附的生物得+2/+2且具有飛行異能。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 2, t: 2, kw: ['flying'] } },
});
cr(S, 'C', 'Nori, Teller of Tales', '{1}{R/W}', 'Dwarf Bard', 2, 2, '每當此生物攻擊時，目標進行攻擊的生物獲得先攻異能直到回合結束。', {
  supertypes: ['Legendary'],
  abilities: [trig('attacks', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['first_strike'] }], { targets: [{ kind: 'creature', filter: { ctrl: 'you', attacking: true } }] })],
});
cr(S, 'C', 'Duskwatch Hunter', '{2}{B/G}', 'Wolf', 3, 1, '當此生物進戰場時，在目標生物上放置一個+1/+1指示物。', {
  abilities: [etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Patient Instructor', '{2}{W/U}', 'Human Citizen', 2, 2, '警戒\n當此生物進戰場時，招募。', { keywords: ['vigilance'], abilities: [etb([{ e: 'recruit' }])] });
