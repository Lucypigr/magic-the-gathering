// Avatar: The Last Airbender（TLA，2025 年 11 月）
import type { Mana } from '../../engine/types';
import { CR, MY_CR, OPP, OPP_CR, act, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'TLA';
const ALLY = { sub: 'Ally' };

// 雙色地：橫置進戰場；{4}，{T}，犧牲：抓一張牌
const tapland = (name: string, a: Mana, b: Mana) =>
  land(S, 'C', name, [a, b], `此地橫置進戰場。\n{T}：加{${a}}或{${b}}。\n{4}，{T}，犧牲此地：抓一張牌。`, {
    etbTapped: true,
    abilities: [act({ mana: '{4}', tap: true, sacSelf: true }, [{ e: 'draw', n: 1 }], '犧牲：抓一張牌')],
  });
tapland('Sun-Blessed Peak', 'R', 'W');
tapland('Kyoshi Village', 'G', 'W');
tapland('North Pole Gates', 'W', 'U');
tapland("Serpent's Pass", 'U', 'B');
tapland('Boiling Rock Prison', 'B', 'R');
tapland('Omashu City', 'R', 'G');
tapland('Misty Palms Oasis', 'W', 'B');
tapland('Meditation Pools', 'G', 'U');
tapland('Airship Engine Room', 'U', 'R');
tapland('Foggy Bottom Swamp', 'B', 'G');

land(S, 'R', 'Abandoned Air Temple', ['W'], '除非你操控基本地，否則此地橫置進戰場。\n{T}：加{W}。\n{3}{W}，{T}：在每個由你操控的生物上各放置一個+1/+1指示物。', {
  etbTappedUnless: { c: 'controls', filter: { type: 'Land', basic: true } },
  abilities: [act({ mana: '{3}{W}', tap: true }, [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }], '每個生物+1/+1指示物')],
});
land(S, 'R', "Agna Qel'a", ['U'], '除非你操控基本地，否則此地橫置進戰場。\n{T}：加{U}。\n{2}{U}，{T}：抓一張牌，然後棄一張牌。', {
  etbTappedUnless: { c: 'controls', filter: { type: 'Land', basic: true } },
  abilities: [act({ mana: '{2}{U}', tap: true }, [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }], '抓一棄一')],
});

// ---------------- 白 ----------------
cr(S, 'R', 'South Pole Voyager', '{1}{W}', 'Human Scout Ally', 2, 2, '每當此生物或另一個由你操控的盟友進戰場時，你獲得1點生命。', {
  abilities: [etb([{ e: 'gain', n: 1 }]), trig('allyEtb', [{ e: 'gain', n: 1 }], { filter: ALLY })],
});
cr(S, 'R', 'Suki, Courageous Rescuer', '{1}{W}{W}', 'Human Warrior Ally', 2, 4, '由你操控的其他生物得+1/+0。', {
  supertypes: ['Legendary'],
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', other: true }, grant: { p: 1 } } }],
});
cr(S, 'R', 'Momo, Friendly Flier', '{W}', 'Lemur Bat Ally', 1, 1, '飛行\n每當另一個具飛行異能的生物在你的操控下進戰場時，此生物得+1/+1直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 1, t: 1 }], { filter: { kw: 'flying' } })],
});
cr(S, 'U', 'Invasion Reinforcements', '{1}{W}', 'Human Warrior Ally', 1, 1, '閃現\n當此生物進戰場時，派出一個1/1白色盟友衍生生物。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'token', token: 'tok-ally' }])],
});
cr(S, 'U', 'Earth Kingdom Jailer', '{2}{W}', 'Human Soldier Ally', 3, 3, '當此生物進戰場時，放逐至多一個目標由對手操控、法術力值為3或更多的神器、生物或結界，直到此生物離開戰場為止。', {
  abilities: [
    etb([{ e: 'exileLinked', what: 'T0' }], {
      targets: [{ kind: 'permanent', filter: { ctrl: 'opp', type: ['Artifact', 'Creature', 'Enchantment'], mvMin: 3 }, optional: true }],
    }),
  ],
});
cr(S, 'C', 'Kyoshi Warriors', '{3}{W}', 'Human Warrior Ally', 3, 3, '當此生物進戰場時，派出一個1/1白色盟友衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-ally' }])],
});
cr(S, 'C', 'Glider Kids', '{2}{W}', 'Human Pilot Ally', 2, 3, '飛行\n當此生物進戰場時，占卜1。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'scry', n: 1 }])],
});
cr(S, 'C', "Jeong Jeong's Deserters", '{1}{W}', 'Human Rebel Ally', 1, 2, '當此生物進戰場時，在目標生物上放置一個+1/+1指示物。', {
  abilities: [etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [CR] })],
});
cr(S, 'C', 'Avatar Enthusiasts', '{2}{W}', 'Human Peasant Ally', 2, 2, '每當另一個盟友在你的操控下進戰場時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('allyEtb', [{ e: 'counters', what: 'self', n: 1 }], { filter: ALLY })],
});
cr(S, 'C', 'Curious Farm Animals', '{W}', 'Boar Elk Bird Ox', 1, 1, '當此生物死去時，你獲得3點生命。\n{2}，犧牲此生物：消滅至多一個目標神器或結界。', {
  abilities: [
    trig('dies', [{ e: 'gain', n: 3 }]),
    act({ mana: '{2}', sacSelf: true }, [destroyT0], '犧牲：消滅神器或結界', {
      targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] }, optional: true }],
    }),
  ],
});
cr(S, 'C', 'Water Tribe Captain', '{2}{W}', 'Human Soldier Ally', 3, 3, '{5}：由你操控的生物得+1/+1直到回合結束。', {
  abilities: [act({ mana: '{5}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }], '全體+1/+1')],
});
cr(S, 'C', 'Rabaroo Troop', '{3}{W}{W}', 'Rabbit Kangaroo', 3, 5, '地落—每當一個地在你的操控下進戰場時，此生物獲得飛行異能直到回合結束，且你獲得1點生命。', {
  abilities: [trig('landfall', [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['flying'] }, { e: 'gain', n: 1 }])],
});
inst(S, 'C', 'Yip Yip!', '{W}', '目標由你操控的生物得+2/+2直到回合結束。若它是盟友，它還獲得飛行異能直到回合結束。', {
  targets: [MY_CR],
  effects: [
    {
      e: 'if',
      cond: { c: 'targetIs', t: 0, filter: ALLY },
      then: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['flying'] }],
      else: [{ e: 'pump', what: 'T0', p: 2, t: 2 }],
    },
  ],
});
inst(S, 'C', 'Razor Rings', '{1}{W}', '對目標進行攻擊或阻擋的生物造成4點傷害。', {
  targets: [{ kind: 'creature', filter: { inCombat: true } }],
  effects: [{ e: 'damage', n: 4, to: 'T0' }],
});

// ---------------- 藍 ----------------
cr(S, 'C', 'Iguana Parrot', '{2}{U}', 'Lizard Bird Pirate', 2, 2, '飛行，警戒，勇行', { keywords: ['flying', 'vigilance', 'prowess'] });
cr(S, 'C', 'Rowdy Snowballers', '{2}{U}', 'Human Peasant Ally', 2, 2, '當此生物進戰場時，橫置目標由對手操控的生物，並在其上放置一個暈眩指示物。', {
  abilities: [etb([{ e: 'tap', what: 'T0' }, { e: 'stun', what: 'T0' }], { targets: [OPP_CR] })],
});
inst(S, 'C', "It'll Quench Ya!", '{1}{U}', '反擊目標咒語，除非其操控者支付{2}。', {
  targets: [{ kind: 'spell' }],
  effects: [{ e: 'counterUnless', what: 'T0', pay: 2 }],
});
inst(S, 'C', 'Octopus Form', '{U}', '目標由你操控的生物得+1/+1並獲得辟邪異能直到回合結束。重置該生物。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 1, kw: ['hexproof'] }, { e: 'untap', what: 'T0' }],
});
sorc(S, 'U', 'Boomerang Basics', '{U}', '將目標非地永久物移回其擁有者手上。若你操控該永久物，抓一張牌。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [
    {
      e: 'if',
      cond: { c: 'targetIs', t: 0, filter: { ctrl: 'you' } },
      then: [{ e: 'bounce', what: 'T0' }, { e: 'draw', n: 1 }],
      else: [{ e: 'bounce', what: 'T0' }],
    },
  ],
});
cr(S, 'U', 'Sokka, Lateral Strategist', '{1}{W/U}{W/U}', 'Human Warrior Ally', 2, 4, '警戒\n每當此生物與至少一個其他生物一同攻擊時，抓一張牌。', {
  supertypes: ['Legendary'],
  keywords: ['vigilance'],
  abilities: [trig('attacks', [{ e: 'draw', n: 1 }], { cond: { c: 'controls', filter: { type: 'Creature', attacking: true, other: true } } })],
});

// ---------------- 黑 ----------------
cr(S, 'R', 'Mai, Scornful Striker', '{1}{B}', 'Human Noble Ally', 2, 2, '先攻\n每當任一玩家施放非生物咒語時，該玩家失去2點生命。', {
  supertypes: ['Legendary'],
  keywords: ['first_strike'],
  abilities: [trig('castNoncreature', [{ e: 'lose', n: 2, who: 'evPlayer' }], { anyPlayer: true })],
});
cr(S, 'C', 'Corrupt Court Official', '{1}{B}', 'Human Advisor', 1, 1, '當此生物進戰場時，目標對手棄一張牌。', {
  abilities: [etb([{ e: 'discard', n: 1, who: 'T0' }], { targets: [OPP] })],
});
cr(S, 'C', 'Beetle-Headed Merchants', '{4}{B}', 'Human Citizen', 5, 4, '每當此生物攻擊時，你可以犧牲另一個生物。若你如此作，抓一張牌並在此生物上放置一個+1/+1指示物。', {
  abilities: [
    trig('attacks', [
      {
        e: 'costThen',
        prompt: '犧牲另一個生物來抓一張牌？',
        cost: { sac: { type: 'Creature', other: true } },
        then: [{ e: 'draw', n: 1 }, { e: 'counters', what: 'self', n: 1 }],
      },
    ]),
  ],
});
sorc(S, 'U', 'Epic Downfall', '{1}{B}', '放逐目標法術力值為3或更多的生物。', {
  targets: [{ kind: 'creature', filter: { mvMin: 3 } }],
  effects: [{ e: 'exile', what: 'T0' }],
});
inst(S, 'U', 'Heartless Act', '{1}{B}', '選擇一項：\n• 消滅目標上面沒有指示物的生物。\n• 從目標生物上移除至多三個指示物。', {
  modes: [
    { text: '消滅沒有指示物的生物', targets: [{ kind: 'creature', filter: { hasCounters: false } }], effects: [destroyT0] },
    { text: '移除至多三個指示物', targets: [CR], effects: [{ e: 'removeCounters', what: 'T0', n: 3 }] },
  ],
});
sorc(S, 'U', "Ozai's Cruelty", '{2}{B}', '對目標玩家造成2點傷害。該玩家棄兩張牌。', {
  targets: [OPP],
  effects: [{ e: 'damage', n: 2, to: 'T0' }, { e: 'discard', n: 2, who: 'T0' }],
});
inst(S, 'U', "Zuko's Conviction", '{B}', '增幅{4}\n將目標生物牌從你的墳墓場移回你手上。若此咒語已增幅，改為將該牌放進戰場。', {
  modes: [
    { text: '移回手上', targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' }], effects: [{ e: 'toHand', what: 'T0' }] },
    { text: '增幅：放進戰場', cost: '{4}{B}', targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' }], effects: [{ e: 'reanimate', what: 'T0' }] },
  ],
});
inst(S, 'C', 'Azula Always Lies', '{1}{B}', '選擇一項或兩項：\n• 目標生物得-1/-1直到回合結束。\n• 在目標生物上放置一個+1/+1指示物。', {
  modes: [
    { text: '-1/-1', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -1, t: -1 }] },
    { text: '+1/+1指示物', targets: [CR], effects: [{ e: 'counters', what: 'T0', n: 1 }] },
    {
      text: '兩項都選',
      targets: [{ ...CR, prompt: '選擇得-1/-1的生物' }, { ...CR, prompt: '選擇得到+1/+1指示物的生物' }],
      effects: [{ e: 'pump', what: 'T0', p: -1, t: -1 }, { e: 'counters', what: 'T1', n: 1 }],
    },
  ],
});
ench(S, 'C', 'Swampsnare Trap', '{2}{B}', '結附於生物\n所結附的生物得-5/-3。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { p: -5, t: -3 } },
});

// ---------------- 紅 ----------------
cr(S, 'R', 'Wartime Protestors', '{3}{R}', 'Human Rebel Ally', 4, 4, '敏捷\n每當另一個盟友在你的操控下進戰場時，在該生物上放置一個+1/+1指示物，且它獲得敏捷異能直到回合結束。', {
  keywords: ['haste'],
  abilities: [
    trig('allyEtb', [{ e: 'counters', what: 'trig', n: 1 }, { e: 'pump', what: 'trig', p: 0, t: 0, kw: ['haste'] }], { filter: ALLY }),
  ],
});
cr(S, 'C', 'Treetop Freedom Fighters', '{2}{R}', 'Human Rebel Ally', 2, 1, '敏捷\n當此生物進戰場時，派出一個1/1白色盟友衍生生物。', {
  keywords: ['haste'],
  abilities: [etb([{ e: 'token', token: 'tok-ally' }])],
});
cr(S, 'C', 'Yuyan Archers', '{1}{R}', 'Human Archer', 3, 1, '延勢\n當此生物進戰場時，你可以棄一張牌。若你如此作，抓一張牌。', {
  keywords: ['reach'],
  abilities: [etb([{ e: 'costThen', prompt: '棄一張牌來抓一張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }])],
});
cr(S, 'C', 'Boar-q-pine', '{2}{R}', 'Boar Porcupine', 2, 2, '每當你施放非生物咒語時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('castNoncreature', [{ e: 'counters', what: 'self', n: 1 }])],
});
sorc(S, 'U', "Iroh's Demonstration", '{1}{R}', '選擇一項：\n• 對每個由對手操控的生物各造成1點傷害。\n• 對目標生物造成4點傷害。', {
  modes: [
    { text: '對手每個生物1點傷害', effects: [{ e: 'damage', n: 1, to: { all: { type: 'Creature', ctrl: 'opp' } } }] },
    { text: '對一個生物4點傷害', targets: [CR], effects: [{ e: 'damage', n: 4, to: 'T0' }] },
  ],
});
cr(S, 'U', 'Jet, Freedom Fighter', '{2}{R/W}{R/W}{R/W}', 'Human Rebel Ally', 3, 1,
  '當此生物進戰場時，它對目標由對手操控的生物造成傷害，其數量等同於由你操控的生物數量。\n當此生物死去時，在至多兩個目標生物上各放置一個+1/+1指示物。',
  {
    supertypes: ['Legendary'],
    abilities: [
      etb([{ e: 'damage', n: { count: { type: 'Creature', ctrl: 'you' } }, to: 'T0' }], { targets: [OPP_CR] }),
      trig('dies', [{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }], {
        targets: [
          { kind: 'creature', filter: { ctrl: 'you' }, optional: true },
          { kind: 'creature', filter: { ctrl: 'you' }, optional: true },
        ],
      }),
    ],
  });
cr(S, 'C', 'Wandering Musicians', '{3}{R/W}', 'Human Bard Ally', 2, 5, '每當此生物攻擊時，由你操控的生物得+1/+0直到回合結束。', {
  abilities: [trig('attacks', [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 0 }])],
});

// ---------------- 綠 ----------------
cr(S, 'M', 'Badgermole Cub', '{1}{G}', 'Badger Mole', 2, 2, '當此生物進戰場時，大地彎折1。（派出一個0/0具敏捷異能的大地元素衍生生物，並在其上放置一個+1/+1指示物。）', {
  abilities: [etb([{ e: 'earthbend', n: 1 }])],
});
ench(S, 'R', 'Earthbender Ascension', '{2}{G}',
  '當此結界進戰場時，大地彎折2。然後從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。\n地落—每當一個地在你的操控下進戰場時，若你操控四個或更多地，在目標由你操控的生物上放置一個+1/+1指示物，且它獲得踐踏異能直到回合結束。',
  {
    abilities: [
      etb([{ e: 'earthbend', n: 2 }, { e: 'searchLand', to: 'battlefield', tapped: true }]),
      trig('landfall', [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample'] }], {
        targets: [MY_CR],
        cond: { c: 'controls', filter: { type: 'Land' }, n: 4 },
      }),
    ],
  });
cr(S, 'R', 'The Earth King', '{3}{G}', 'Human Noble Ally', 2, 2, '當此生物進戰場時，派出一個4/4綠色熊衍生生物。\n每當你以一個或更多力量為4或更多的生物攻擊時，從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'token', token: 'tok-bear' }]),
    trig('youAttack', [{ e: 'searchLand', to: 'battlefield', tapped: true }], { filter: { powMin: 4 } }),
  ],
});
cr(S, 'R', "Earth King's Lieutenant", '{G}{W}', 'Human Soldier Ally', 1, 1, '踐踏\n當此生物進戰場時，在每個由你操控的其他盟友上各放置一個+1/+1指示物。\n每當另一個盟友在你的操控下進戰場時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['trample'],
  abilities: [
    etb([{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', sub: 'Ally', other: true } }, n: 1 }]),
    trig('allyEtb', [{ e: 'counters', what: 'self', n: 1 }], { filter: ALLY }),
  ],
});
inst(S, 'U', 'Allies at Last', '{2}{G}', '至多兩個目標由你操控的生物各對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, { ...MY_CR, optional: true }, OPP_CR],
  effects: [
    { e: 'bite', a: 'T0', b: 'T2' },
    { e: 'bite', a: 'T1', b: 'T2' },
  ],
});
cr(S, 'U', 'White Lotus Reinforcements', '{1}{G}{W}', 'Human Soldier Ally', 2, 3, '警戒\n由你操控的其他盟友得+1/+1。', {
  keywords: ['vigilance'],
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', sub: 'Ally', other: true }, grant: { p: 1, t: 1 } } }],
});
cr(S, 'C', 'Earth Kingdom Soldier', '{4}{G/W}', 'Human Soldier', 3, 4, '警戒\n當此生物進戰場時，在至多兩個目標由你操控的生物上各放置一個+1/+1指示物。', {
  keywords: ['vigilance'],
  abilities: [
    etb([{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }], {
      targets: [
        { ...MY_CR, optional: true },
        { ...MY_CR, optional: true },
      ],
    }),
  ],
});
cr(S, 'C', 'Pretending Poxbearers', '{1}{W/B}', 'Human Citizen Ally', 2, 1, '當此生物死去時，派出一個1/1白色盟友衍生生物。', {
  abilities: [trig('dies', [{ e: 'token', token: 'tok-ally' }])],
});
cr(S, 'C', 'Saber-Tooth Moose-Lion', '{4}{G}{G}', 'Elk Cat', 7, 7, '延勢', { keywords: ['reach'] });
cr(S, 'C', 'Raucous Audience', '{1}{G}', 'Human Citizen', 2, 1, '{T}：加{G}。', { produces: ['G'] });
sorc(S, 'C', 'Earthbending Lesson', '{3}{G}', '大地彎折4。（派出一個0/0具敏捷異能的大地元素衍生生物，並在其上放置四個+1/+1指示物。）', {
  effects: [{ e: 'earthbend', n: 4 }],
});
inst(S, 'C', 'Rocky Rebuke', '{1}{G}', '目標由你操控的生物對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'bite', a: 'T0', b: 'T1' }],
});
inst(S, 'C', 'Pillar Launch', '{G}', '目標生物得+2/+2並獲得延勢異能直到回合結束。重置該生物。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['reach'] }, { e: 'untap', what: 'T0' }],
});

