// Bloomburrow（BLB，2024 年 8 月）
// 英勇（Valiant）：每當此生物每回合第一次成為你的咒語或異能的目標時。
// 門檻（Threshold）：若你的墳墓場中有七張或更多牌。
import type { Cond } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, sorc, trig } from '../dsl';

const S = 'BLB';
const THRESHOLD: Cond = { c: 'gyCount', filter: {}, n: 7 };
const valiant = (effects: Parameters<typeof trig>[1], x: Parameters<typeof trig>[2] = {}) => trig('targeted', effects, { oncePerTurn: true, ...x });
const NO_FLYING = { kind: 'creature' as const, filter: { ctrl: 'you' as const, nonKw: 'flying' as const }, prompt: '選擇你沒有飛行異能的生物' };

// ---------------- 白 ----------------
cr(S, 'R', 'Valley Questcaller', '{1}{W}', 'Rabbit Warrior', 2, 3, '每當一個或更多其他兔子、蝙蝠、鳥及／或老鼠在你的操控下進戰場時，占卜1。\n由你操控的其他兔子、蝙蝠、鳥與老鼠得+1/+1。', {
  abilities: [
    trig('allyEtb', [{ e: 'scry', n: 1 }], { filter: { sub: ['Rabbit', 'Bat', 'Bird', 'Mouse'] } }),
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', other: true, sub: ['Rabbit', 'Bat', 'Bird', 'Mouse'] }, grant: { p: 1, t: 1 } } },
  ],
});
cr(S, 'U', 'Brightblade Stoat', '{1}{W}', 'Weasel Soldier', 2, 2, '先攻，繫命', { keywords: ['first_strike', 'lifelink'] });
ench(S, 'U', 'Feather of Flight', '{1}{W}', '閃現\n結附於生物\n當此靈氣進戰場時，抓一張牌。\n所結附的生物得+1/+0且具有飛行異能。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 1, kw: ['flying'] } },
  abilities: [etb([{ e: 'draw', n: 1 }])],
});
cr(S, 'U', 'Harvestrite Host', '{2}{W}', 'Rabbit Citizen', 3, 3, '每當此生物或另一個兔子在你的操控下進戰場時，目標由你操控的生物得+1/+0直到回合結束。', {
  abilities: [
    etb([{ e: 'pump', what: 'T0', p: 1, t: 0 }], { targets: [MY_CR] }),
    trig('allyEtb', [{ e: 'pump', what: 'T0', p: 1, t: 0 }], { filter: { sub: 'Rabbit' }, targets: [MY_CR] }),
  ],
});
sorc(S, 'U', 'Hop to It', '{2}{W}', '派出三個1/1白色兔子衍生生物。', { effects: [{ e: 'token', token: 'tok-rabbit', n: 3 }] });
inst(S, 'U', "Mabel's Mettle", '{1}{W}', '目標生物得+2/+2直到回合結束。至多一個另外的目標生物得+1/+1直到回合結束。', {
  targets: [CR, { ...CR, optional: true }],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2 }, { e: 'pump', what: 'T1', p: 1, t: 1 }],
});
cr(S, 'U', 'Mouse Trapper', '{2}{W}', 'Mouse Soldier', 3, 2, '閃現\n英勇—每當此生物每回合第一次成為你的咒語或異能的目標時，橫置目標由對手操控的生物。', {
  keywords: ['flash'],
  abilities: [valiant([{ e: 'tap', what: 'T0' }], { targets: [OPP_CR] })],
});
inst(S, 'U', 'Repel Calamity', '{1}{W}', '消滅目標力量或防禦力為4或更多的生物。', {
  targets: [{ kind: 'creature', filter: { or: [{ powMin: 4 }, { toughMin: 4 }] } }],
  effects: [destroyT0],
});
cr(S, 'U', 'Seasoned Warrenguard', '{W}', 'Rabbit Warrior', 1, 2, '每當此生物攻擊時，若你操控衍生物，它得+2/+0直到回合結束。', {
  abilities: [trig('attacks', [{ e: 'pump', what: 'self', p: 2, t: 0 }], { cond: { c: 'controls', filter: { token: true } } })],
});
cr(S, 'U', 'Shrike Force', '{2}{W}', 'Bird Knight', 1, 3, '飛行，連擊，警戒', { keywords: ['flying', 'double_strike', 'vigilance'] });
cr(S, 'C', 'Brave-Kin Duo', '{W}', 'Rabbit Mouse', 1, 1, '{1}，{T}：目標生物得+1/+1直到回合結束。只能於法術時機起動。', {
  abilities: [act({ mana: '{1}', tap: true }, [{ e: 'pump', what: 'T0', p: 1, t: 1 }], '+1/+1', { sorcery: true, targets: [MY_CR] })],
});
cr(S, 'C', 'Lifecreed Duo', '{1}{W}', 'Bat Bird', 1, 2, '飛行\n每當另一個生物在你的操控下進戰場時，你獲得1點生命。', {
  keywords: ['flying'],
  abilities: [trig('allyEtb', [{ e: 'gain', n: 1 }])],
});
cr(S, 'C', 'Pileated Provisioner', '{4}{W}', 'Bird Scout', 3, 4, '飛行\n當此生物進戰場時，在目標由你操控、沒有飛行異能的生物上放置一個+1/+1指示物。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...NO_FLYING, optional: true }] })],
});
inst(S, 'C', 'Sonar Strike', '{1}{W}', '對目標進行攻擊、阻擋或已橫置的生物造成4點傷害。若你操控蝙蝠，你獲得3點生命。', {
  targets: [{ kind: 'creature', filter: { or: [{ inCombat: true }, { tapped: true }] } }],
  effects: [{ e: 'damage', n: 4, to: 'T0' }, { e: 'if', cond: { c: 'controls', filter: { sub: 'Bat' } }, then: [{ e: 'gain', n: 3 }] }],
});
cr(S, 'C', 'Thistledown Players', '{2}{W}', 'Mouse Bard', 3, 3, '');
cr(S, 'C', 'Warren Elder', '{1}{W}', 'Rabbit Cleric', 2, 2, '{3}{W}：由你操控的生物得+1/+1直到回合結束。', {
  abilities: [act({ mana: '{3}{W}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }], '全體+1/+1')],
});
cr(S, 'C', 'Wax-Wane Witness', '{3}{W}', 'Bat Cleric', 2, 4, '飛行，警戒', { keywords: ['flying', 'vigilance'] });

// ---------------- 藍 ----------------
sorc(S, 'U', 'Calamitous Tide', '{4}{U}{U}', '將至多兩個目標生物移回其擁有者手上。抓兩張牌，然後棄一張牌。', {
  targets: [
    { kind: 'creature', optional: true },
    { kind: 'creature', optional: true },
  ],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'bounce', what: 'T1' }, { e: 'draw', n: 2 }, { e: 'discard', n: 1, who: 'you' }],
});
cr(S, 'U', 'Knightfisher', '{3}{U}{U}', 'Bird Knight', 4, 5, '飛行\n每當另一個非衍生物的鳥在你的操控下進戰場時，派出一個1/1藍色魚衍生生物。', {
  keywords: ['flying'],
  abilities: [trig('allyEtb', [{ e: 'token', token: 'tok-fish' }], { filter: { sub: 'Bird', token: false } })],
});
cr(S, 'U', 'Plumecreed Escort', '{1}{U}', 'Bird Scout', 2, 1, '閃現，飛行\n當此生物進戰場時，目標由你操控的生物獲得辟邪異能直到回合結束。', {
  keywords: ['flash', 'flying'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['hexproof'] }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Shoreline Looter', '{1}{U}', 'Rat Rogue', 1, 1, '此生物不能被阻擋。\n門檻—每當此生物對玩家造成戰鬥傷害時，抓一張牌。然後除非你的墳墓場中有七張或更多牌，否則棄一張牌。', {
  keywords: ['unblockable'],
  abilities: [trig('combatDamagePlayer', [{ e: 'draw', n: 1 }, { e: 'if', cond: THRESHOLD, then: [], else: [{ e: 'discard', n: 1, who: 'you' }] }])],
});
cr(S, 'C', 'Bellowing Crier', '{1}{U}', 'Frog Advisor', 2, 1, '當此生物進戰場時，抓一張牌，然後棄一張牌。', {
  abilities: [etb([{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }])],
});
inst(S, 'C', 'Dazzling Denial', '{1}{U}', '反擊目標咒語，除非其操控者支付{2}。若你操控鳥，改為除非其操控者支付{4}。', {
  targets: [{ kind: 'spell' }],
  effects: [
    {
      e: 'if',
      cond: { c: 'controls', filter: { sub: 'Bird' } },
      then: [{ e: 'counterUnless', what: 'T0', pay: 4 }],
      else: [{ e: 'counterUnless', what: 'T0', pay: 2 }],
    },
  ],
});
inst(S, 'C', 'Dire Downdraft', '{3}{U}', '將目標生物置於其擁有者的牌庫底。', { targets: [CR], effects: [{ e: 'tuck', what: 'T0' }] });
cr(S, 'C', 'Nightwhorl Hermit', '{2}{U}', 'Rat Rogue', 1, 4, '警戒\n門檻—只要你的墳墓場中有七張或更多牌，此生物得+1/+0且不能被阻擋。', {
  keywords: ['vigilance'],
  abilities: [{ kind: 'static', self: { cond: THRESHOLD, grant: { p: 1, kw: ['unblockable'] } } }],
});
sorc(S, 'C', 'Pearl of Wisdom', '{2}{U}', '抓兩張牌。', { effects: [{ e: 'draw', n: 2 }] });
inst(S, 'C', 'Shore Up', '{U}', '目標由你操控的生物得+1/+1並獲得辟邪異能直到回合結束。重置該生物。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 1, kw: ['hexproof'] }, { e: 'untap', what: 'T0' }],
});

// ---------------- 黑 ----------------
cr(S, 'M', 'Maha, Its Feathers Night', '{3}{B}{B}', 'Elemental Bird', 6, 5, '飛行，踐踏', { supertypes: ['Legendary'], keywords: ['flying', 'trample'] });
cr(S, 'R', 'Valley Rotcaller', '{1}{B}', 'Squirrel Warlock', 1, 3, '威懾\n每當此生物攻擊時，每位對手失去X點生命，且你獲得X點生命，X為由你操控的其他松鼠、蝙蝠、蜥蜴與老鼠數量。', {
  keywords: ['menace'],
  abilities: [
    trig('attacks', [
      { e: 'lose', n: { count: { type: 'Creature', ctrl: 'you', other: true, sub: ['Squirrel', 'Bat', 'Lizard', 'Rat'] } }, who: 'opp' },
      { e: 'gain', n: { count: { type: 'Creature', ctrl: 'you', other: true, sub: ['Squirrel', 'Bat', 'Lizard', 'Rat'] } } },
    ]),
  ],
});
cr(S, 'U', 'Downwind Ambusher', '{3}{B}', 'Skunk Assassin', 4, 2, '閃現\n當此生物進戰場時，目標由對手操控的生物得-1/-1直到回合結束。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: -1, t: -1 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
sorc(S, 'U', 'Fell', '{1}{B}', '消滅目標生物。', { targets: [CR], effects: [destroyT0] });
inst(S, 'U', "Hazel's Nocturne", '{3}{B}', '將至多兩張目標生物牌從你的墳墓場移回你手上。每位對手失去2點生命，且你獲得2點生命。', {
  targets: [
    { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
    { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
  ],
  effects: [{ e: 'toHand', what: 'T0' }, { e: 'toHand', what: 'T1' }, { e: 'lose', n: 2, who: 'opp' }, { e: 'gain', n: 2 }],
});
arti(S, 'U', 'Sinister Monolith', '{3}{B}', '在你回合的戰鬥開始時，每位對手失去1點生命，且你獲得1點生命。', {
  abilities: [trig('combatStart', [{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }])],
});
cr(S, 'C', 'Agate-Blade Assassin', '{1}{B}', 'Lizard Assassin', 1, 3, '每當此生物攻擊時，防禦玩家失去1點生命，且你獲得1點生命。', {
  abilities: [trig('attacks', [{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }])],
});
inst(S, 'C', 'Early Winter', '{4}{B}', '放逐目標生物。', { targets: [CR], effects: [{ e: 'exile', what: 'T0' }] });
cr(S, 'C', 'Glidedive Duo', '{4}{B}', 'Bat Lizard', 3, 3, '飛行\n當此生物進戰場時，每位對手失去2點生命，且你獲得2點生命。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'lose', n: 2, who: 'opp' }, { e: 'gain', n: 2 }])],
});
cr(S, 'C', 'Ravine Raider', '{B}', 'Lizard Rogue', 1, 1, '威懾\n{1}{B}：此生物得+1/+1直到回合結束。', {
  keywords: ['menace'],
  abilities: [act({ mana: '{1}{B}' }, [{ e: 'pump', what: 'self', p: 1, t: 1 }], '+1/+1')],
});
cr(S, 'C', 'Starlit Soothsayer', '{2}{B}', 'Bat Cleric', 2, 2, '飛行', { keywords: ['flying'] });

// ---------------- 紅 ----------------
cr(S, 'R', 'Hearthborn Battler', '{2}{R}', 'Lizard Warlock', 2, 3, '敏捷\n每當你施放本回合的第二個咒語時，此生物對目標對手造成2點傷害。', {
  keywords: ['haste'],
  abilities: [trig('castAny', [{ e: 'damage', n: 2, to: 'T0' }], { cond: { c: 'secondSpell' }, targets: [OPP] })],
});
cr(S, 'R', 'Sunspine Lynx', '{2}{R}{R}', 'Elemental Cat', 5, 4, '當此生物進戰場時，它對每位玩家各造成傷害，其數量等同於該玩家操控的非基本地數量。', {
  abilities: [
    etb([
      { e: 'damage', n: { count: { type: 'Land', basic: false, ctrl: 'opp' } }, to: 'opp' },
      { e: 'damage', n: { count: { type: 'Land', basic: false, ctrl: 'you' } }, to: 'you' },
    ]),
  ],
});
cr(S, 'U', 'Brambleguard Captain', '{3}{R}', 'Mouse Soldier', 2, 3, '在你回合的戰鬥開始時，目標由你操控的生物得+X/+0直到回合結束，X為此生物的力量。', {
  abilities: [trig('combatStart', [{ e: 'pump', what: 'T0', p: { power: 'self' }, t: 0 }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Brazen Collector', '{1}{R}', 'Raccoon Rogue', 2, 1, '先攻', { keywords: ['first_strike'] });
sorc(S, 'U', 'Playful Shove', '{1}{R}', '對任意一個目標造成1點傷害。抓一張牌。', { targets: [ANY], effects: [{ e: 'damage', n: 1, to: 'T0' }, { e: 'draw', n: 1 }] });
cr(S, 'U', 'Quaketusk Boar', '{3}{R}{R}', 'Elemental Boar', 5, 5, '延勢，踐踏，敏捷', { keywords: ['reach', 'trample', 'haste'] });
inst(S, 'U', 'Rabid Gnaw', '{1}{R}', '目標由你操控的生物得+1/+0直到回合結束。然後它對目標不由你操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 0 }, { e: 'bite', a: 'T0', b: 'T1' }],
});
cr(S, 'U', 'Teapot Slinger', '{3}{R}', 'Raccoon Warrior', 3, 4, '威懾', { keywords: ['menace'] });
sorc(S, 'C', 'Agate Assault', '{2}{R}', '選擇一項：\n• 對目標生物造成4點傷害。\n• 放逐目標神器。', {
  modes: [
    { text: '4點傷害', targets: [CR], effects: [{ e: 'damage', n: 4, to: 'T0' }] },
    { text: '放逐神器', targets: [{ kind: 'permanent', filter: { type: 'Artifact' } }], effects: [{ e: 'exile', what: 'T0' }] },
  ],
});
cr(S, 'C', "Alania's Pathmaker", '{3}{R}', 'Otter Wizard', 4, 2, '當此生物進戰場時，放逐你牌庫頂的一張牌。本回合你可以使用該牌。', {
  abilities: [etb([{ e: 'impulse', n: 1 }])],
});
inst(S, 'C', 'Conduct Electricity', '{4}{R}', '對目標生物造成6點傷害，並對至多一個目標生物衍生物造成2點傷害。', {
  targets: [CR, { kind: 'creature', filter: { token: true }, optional: true }],
  effects: [{ e: 'damage', n: 6, to: 'T0' }, { e: 'damage', n: 2, to: 'T1' }],
});
cr(S, 'C', 'Frilled Sparkshooter', '{3}{R}', 'Lizard Archer', 3, 3, '延勢，威懾', { keywords: ['reach', 'menace'] });
cr(S, 'C', 'Kindlespark Duo', '{2}{R}', 'Lizard Otter', 1, 3, '{T}：此生物對目標對手造成1點傷害。\n每當你施放非生物咒語時，重置此生物。', {
  abilities: [act({ tap: true }, [{ e: 'damage', n: 1, to: 'T0' }], '1點傷害', { targets: [OPP] }), trig('castNoncreature', [{ e: 'untap', what: 'self' }])],
});
cr(S, 'C', 'Raccoon Rallier', '{1}{R}', 'Raccoon Bard', 2, 2, '{T}：目標由你操控的生物獲得敏捷異能直到回合結束。只能於法術時機起動。', {
  abilities: [act({ tap: true }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['haste'] }], '給予敏捷', { sorcery: true, targets: [MY_CR] })],
});
cr(S, 'C', 'Roughshod Duo', '{2}{R}', 'Mouse Raccoon', 3, 2, '踐踏', { keywords: ['trample'] });
inst(S, 'C', 'Take Out the Trash', '{1}{R}', '對目標生物造成3點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 3, to: 'T0' }] });
ench(S, 'C', 'War Squeak', '{R}', '結附於生物\n所結附的生物得+1/+1且具有敏捷異能。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 1, t: 1, kw: ['haste'] } },
});

// ---------------- 綠 ----------------
cr(S, 'R', 'Valley Mightcaller', '{G}', 'Frog Warrior', 1, 1, '踐踏\n每當另一個青蛙、兔子、浣熊或松鼠在你的操控下進戰場時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['trample'],
  abilities: [trig('allyEtb', [{ e: 'counters', what: 'self', n: 1 }], { filter: { sub: ['Frog', 'Rabbit', 'Raccoon', 'Squirrel'] } })],
});
cr(S, 'U', 'Galewind Moose', '{4}{G}{G}', 'Elemental Elk', 6, 6, '閃現\n延勢，警戒，踐踏', { keywords: ['flash', 'reach', 'vigilance', 'trample'] });
cr(S, 'U', 'Hivespine Wolverine', '{3}{G}{G}', 'Elemental Wolverine', 5, 4, '當此生物進戰場時，在目標由你操控的生物上放置一個+1/+1指示物。', {
  abilities: [etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] })],
});
inst(S, 'U', 'Overprotect', '{1}{G}', '目標由你操控的生物得+3/+3並獲得踐踏、辟邪與不滅異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 3, t: 3, kw: ['trample', 'hexproof', 'indestructible'] }],
});
cr(S, 'C', 'Druid of the Spade', '{2}{G}', 'Rabbit Druid', 2, 3, '只要你操控衍生物，此生物得+2/+0且具有踐踏異能。', {
  abilities: [{ kind: 'static', self: { cond: { c: 'controls', filter: { token: true } }, grant: { p: 2, kw: ['trample'] } } }],
});
inst(S, 'C', 'High Stride', '{G}', '目標生物得+1/+3並獲得延勢異能直到回合結束。重置該生物。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 3, kw: ['reach'] }, { e: 'untap', what: 'T0' }],
});
inst(S, 'C', 'Polliwallop', '{3}{G}', '目標由你操控的生物對目標不由你操控的生物造成傷害，其數量等同於其力量的兩倍。', {
  targets: [MY_CR, OPP_CR],
  effects: [
    { e: 'bite', a: 'T0', b: 'T1' },
    { e: 'bite', a: 'T0', b: 'T1' },
  ],
});
cr(S, 'C', 'Stickytongue Sentinel', '{2}{G}', 'Frog Warrior', 3, 3, '延勢\n當此生物進戰場時，將至多一個另外的目標由你操控的永久物移回其擁有者手上。', {
  keywords: ['reach'],
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'you', nonType: 'Land' }, notSelf: true, optional: true }] })],
});
cr(S, 'C', 'Sunshower Druid', '{G}', 'Frog Druid', 0, 2, '當此生物進戰場時，在目標生物上放置一個+1/+1指示物，且你獲得1點生命。', {
  abilities: [etb([{ e: 'counters', what: 'T0', n: 1 }, { e: 'gain', n: 1 }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Three Tree Rootweaver', '{1}{G}', 'Mole Druid', 1, 3, '{T}：加一點任意顏色的法術力。', { produces: ['W', 'U', 'B', 'R', 'G'] });
cr(S, 'C', 'Treeguard Duo', '{3}{G}', 'Frog Rabbit', 3, 4, '當此生物進戰場時，目標由你操控的生物獲得警戒異能並得+X/+X直到回合結束，X為由你操控的生物數量。', {
  abilities: [
    etb([{ e: 'pump', what: 'T0', p: { count: { type: 'Creature', ctrl: 'you' } }, t: { count: { type: 'Creature', ctrl: 'you' } }, kw: ['vigilance'] }], {
      targets: [MY_CR],
    }),
  ],
});

// ---------------- 多色／無色 ----------------
cr(S, 'R', 'Dreamdew Entrancer', '{2}{G}{U}', 'Frog Wizard', 3, 4, '延勢\n當此生物進戰場時，橫置至多一個目標生物，並在其上放置三個暈眩指示物。若你操控該生物，抓兩張牌。', {
  keywords: ['reach'],
  abilities: [
    etb(
      [
        { e: 'tap', what: 'T0' },
        { e: 'stun', what: 'T0', n: 3 },
        { e: 'if', cond: { c: 'targetIs', t: 0, filter: { ctrl: 'you' } }, then: [{ e: 'draw', n: 2 }] },
      ],
      { targets: [{ kind: 'creature', optional: true }] },
    ),
  ],
});
cr(S, 'R', 'Finneas, Ace Archer', '{G}{W}', 'Rabbit Archer', 2, 2, '延勢，警戒\n每當此生物攻擊時，在每個由你操控的其他衍生物或兔子上各放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['reach', 'vigilance'],
  abilities: [trig('attacks', [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', other: true, or: [{ token: true }, { sub: 'Rabbit' }] } }, n: 1 }])],
});
cr(S, 'U', 'Plumecreed Mentor', '{1}{W}{U}', 'Bird Scout', 2, 3, '飛行\n每當此生物或另一個具飛行異能的生物在你的操控下進戰場時，在目標由你操控、沒有飛行異能的生物上放置一個+1/+1指示物。', {
  keywords: ['flying'],
  abilities: [
    etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...NO_FLYING, optional: true }] }),
    trig('allyEtb', [{ e: 'counters', what: 'T0', n: 1 }], { filter: { kw: 'flying' }, targets: [{ ...NO_FLYING, optional: true }] }),
  ],
});
cr(S, 'U', 'Seedglaive Mentor', '{1}{R}{W}', 'Mouse Soldier', 3, 2, '警戒，敏捷\n英勇—每當此生物每回合第一次成為你的咒語或異能的目標時，在其上放置一個+1/+1指示物。', {
  keywords: ['vigilance', 'haste'],
  abilities: [valiant([{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'U', 'Stormcatch Mentor', '{U}{R}', 'Otter Wizard', 1, 1, '敏捷，勇行\n你施放的瞬間與法術咒語減少{1}來施放。', {
  keywords: ['haste', 'prowess'],
  abilities: [{ kind: 'static', spellCostLess: { filter: { type: ['Instant', 'Sorcery'] }, n: 1 } }],
});
cr(S, 'U', 'Tidecaller Mentor', '{1}{U}{B}', 'Rat Wizard', 3, 3, '威懾\n門檻—當此生物進戰場時，若你的墳墓場中有七張或更多牌，將至多一個目標非地永久物移回其擁有者手上。', {
  keywords: ['menace'],
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { cond: THRESHOLD, targets: [{ kind: 'permanent', filter: { nonType: 'Land' }, optional: true }] })],
});
cr(S, 'U', 'Wandertale Mentor', '{R}{G}', 'Raccoon Bard', 2, 2, '{T}：加{R}或{G}。', { produces: ['R', 'G'] });
arti(S, 'U', 'Short Bow', '{2}', '佩帶此武具的生物得+1/+1且具有延勢與警戒異能。\n裝備{1}', {
  subtypes: ['Equipment'],
  equip: { cost: '{1}', grant: { p: 1, t: 1, kw: ['reach', 'vigilance'] } },
});
cr(S, 'C', 'Cindering Cutthroat', '{2}{B/R}', 'Lizard Assassin', 3, 2, '{1}{B/R}：此生物獲得威懾異能直到回合結束。', {
  abilities: [act({ mana: '{1}{B/R}' }, [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['menace'] }], '獲得威懾')],
});
cr(S, 'C', 'Head of the Homestead', '{3}{G/W}{G/W}', 'Rabbit Citizen', 3, 2, '當此生物進戰場時，派出兩個1/1白色兔子衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-rabbit', n: 2 }])],
});
cr(S, 'C', 'Junkblade Bruiser', '{3}{R/G}{R/G}', 'Raccoon Berserker', 4, 5, '踐踏', { keywords: ['trample'] });
cr(S, 'C', 'Mind Drill Assailant', '{2}{U/B}{U/B}', 'Rat Warlock', 2, 5, '門檻—只要你的墳墓場中有七張或更多牌，此生物得+3/+0。\n{2}{U/B}：刺探1。', {
  abilities: [{ kind: 'static', self: { cond: THRESHOLD, grant: { p: 3 } } }, act({ mana: '{2}{U/B}' }, [{ e: 'surveil', n: 1 }], '刺探1')],
});
cr(S, 'C', 'Moonrise Cleric', '{1}{W/B}{W/B}', 'Bat Cleric', 2, 3, '飛行\n每當此生物攻擊時，你獲得1點生命。', {
  keywords: ['flying'],
  abilities: [trig('attacks', [{ e: 'gain', n: 1 }])],
});
cr(S, 'C', 'Pond Prophet', '{G/U}{G/U}', 'Frog Advisor', 1, 1, '當此生物進戰場時，抓一張牌。', { abilities: [etb([{ e: 'draw', n: 1 }])] });
cr(S, 'C', 'Seedpod Squire', '{3}{W/U}', 'Bird Scout', 3, 3, '飛行\n每當此生物攻擊時，目標由你操控、沒有飛行異能的生物得+1/+1直到回合結束。', {
  keywords: ['flying'],
  abilities: [trig('attacks', [{ e: 'pump', what: 'T0', p: 1, t: 1 }], { targets: [{ ...NO_FLYING, optional: true }] })],
});
cr(S, 'C', 'Tempest Angler', '{1}{U/R}{U/R}', 'Otter Wizard', 2, 2, '每當你施放非生物咒語時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('castNoncreature', [{ e: 'counters', what: 'self', n: 1 }])],
});
