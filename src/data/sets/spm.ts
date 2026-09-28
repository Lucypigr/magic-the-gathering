// Marvel's Spider-Man（SPM，2025 年 9 月）
// 密謀：抓一張牌，然後棄一張牌；若棄掉的不是地，在該生物上放置一個+1/+1指示物。
import type { Mana } from '../../engine/types';
import { CR, MY_CR, OPP_CR, OPP_NONLAND, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, tapland, trig } from '../dsl';

const S = 'SPM';
const SPIDER = { sub: 'Spider' };
const VILLAIN = { sub: 'Villain' };
const YOUR_TURN_FLYING = { kind: 'static' as const, self: { cond: { c: 'yourTurn' as const }, grant: { kw: ['flying' as const] } } };

const surveilland = (name: string, a: Mana, b: Mana) =>
  tapland(S, 'C', name, a, b, { abilities: [act({ mana: '{4}', tap: true }, [{ e: 'surveil', n: 1 }], '刺探1')] }, '{4}，{T}：刺探1。');
surveilland('Ominous Asylum', 'B', 'R');
surveilland('Savage Mansion', 'R', 'G');
surveilland('Sinister Hideout', 'U', 'B');
surveilland('Suburban Sanctuary', 'G', 'W');
surveilland('University Campus', 'W', 'U');
land(S, 'C', 'Vibrant Cityscape', [], '{T}，犧牲此地：從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場，然後將你的牌庫洗牌。', {
  abilities: [act({ tap: true, sacSelf: true }, [{ e: 'searchLand', to: 'battlefield', tapped: true }], '搜尋基本地')],
});
land(S, 'R', 'Urban Retreat', ['G', 'W', 'U'], '此地橫置進戰場。\n{T}：加{G}、{W}或{U}。', { etbTapped: true });

// ---------------- 白 ----------------
cr(S, 'R', 'Spectacular Spider-Man', '{1}{W}', 'Spider Human Hero', 3, 2, '閃現\n{1}：此生物獲得飛行異能直到回合結束。\n{1}，犧牲此生物：由你操控的生物獲得辟邪與不滅異能直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['flash'],
  abilities: [
    act({ mana: '{1}' }, [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['flying'] }], '獲得飛行'),
    act({ mana: '{1}', sacSelf: true }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 0, t: 0, kw: ['hexproof', 'indestructible'] }], '犧牲：全體辟邪與不滅'),
  ],
});
cr(S, 'U', 'Aunt May', '{W}', 'Human Citizen', 0, 2, '每當另一個生物在你的操控下進戰場時，你獲得1點生命。若它是蜘蛛，在其上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyEtb', [{ e: 'gain', n: 1 }]), trig('allyEtb', [{ e: 'counters', what: 'trig', n: 1 }], { filter: SPIDER })],
});
cr(S, 'U', 'Flash Thompson, Spider-Fan', '{1}{W}', 'Human Citizen', 2, 2, '閃現\n當此生物進戰場時，橫置至多一個目標生物。', {
  supertypes: ['Legendary'],
  keywords: ['flash'],
  abilities: [etb([{ e: 'tap', what: 'T0' }], { targets: [{ ...OPP_CR, optional: true }] })],
});
inst(S, 'U', 'Sudden Strike', '{1}{W}', '消滅目標進行攻擊或阻擋的生物。', {
  targets: [{ kind: 'creature', filter: { inCombat: true } }],
  effects: [destroyT0],
});
cr(S, 'C', 'Selfless Police Captain', '{1}{W}', 'Human Detective', 1, 1, '此生物進戰場時上面有一個+1/+1指示物。\n當此生物死去時，在目標由你操控的生物上放置一個+1/+1指示物。', {
  etbCounters: 1,
  abilities: [trig('dies', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...MY_CR, optional: true }] })],
});
inst(S, 'C', 'Spectacular Tactics', '{1}{W}', '選擇一項：\n• 在目標由你操控的生物上放置一個+1/+1指示物。它獲得辟邪異能直到回合結束。\n• 消滅目標力量為4或更多的生物。', {
  modes: [
    { text: '+1/+1指示物並獲得辟邪', targets: [MY_CR], effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['hexproof'] }] },
    { text: '消滅力量4以上的生物', targets: [{ kind: 'creature', filter: { powMin: 4 } }], effects: [destroyT0] },
  ],
});
cr(S, 'C', 'Starling, Aerial Ally', '{4}{W}', 'Human Hero', 3, 4, '飛行\n當此生物進戰場時，另一個目標由你操控的生物獲得飛行異能直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['flying'] }], { targets: [{ ...MY_CR, notSelf: true, optional: true }] })],
});
inst(S, 'C', 'Thwip!', '{W}', '目標生物得+2/+2並獲得飛行異能直到回合結束。若它是蜘蛛，你獲得2點生命。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['flying'] }, { e: 'if', cond: { c: 'targetIs', t: 0, filter: SPIDER }, then: [{ e: 'gain', n: 2 }] }],
});
ench(S, 'C', 'Web Up', '{2}{W}', '當此結界進戰場時，放逐目標由對手操控的非地永久物，直到此結界離開戰場為止。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [OPP_NONLAND] })],
});
cr(S, 'C', 'Wild Pack Squad', '{2}{W}', 'Human Mercenary', 2, 3, '在你回合的戰鬥開始時，至多一個目標生物獲得先攻與警戒異能直到回合結束。', {
  abilities: [trig('combatStart', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['first_strike', 'vigilance'] }], { targets: [{ ...MY_CR, optional: true }] })],
});

// ---------------- 藍 ----------------
inst(S, 'U', 'School Daze', '{3}{U}{U}', '選擇一項：\n• 抓三張牌。\n• 反擊目標咒語。抓一張牌。', {
  modes: [
    { text: '抓三張牌', effects: [{ e: 'draw', n: 3 }] },
    { text: '反擊並抓一張牌', targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }, { e: 'draw', n: 1 }] },
  ],
});
cr(S, 'U', 'Spider-Byte, Web Warden', '{2}{U}', 'Spider Avatar Hero', 2, 2, '當此生物進戰場時，將至多一個目標非地永久物移回其擁有者手上。', {
  supertypes: ['Legendary'],
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ ...OPP_NONLAND, optional: true }] })],
});
ench(S, 'U', 'Robotics Mastery', '{4}{U}', '閃現\n結附於生物\n當此靈氣進戰場時，派出兩個1/1無色，具飛行異能的機器人神器衍生生物。\n所結附的生物得+2/+2。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 2, t: 2 } },
  abilities: [etb([{ e: 'token', token: 'tok-robot-flyer', n: 2 }])],
});
inst(S, 'C', 'Amazing Acrobatics', '{1}{U}{U}', '選擇一項：\n• 反擊目標咒語。\n• 橫置一或兩個目標生物。', {
  modes: [
    { text: '反擊咒語', targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] },
    { text: '橫置一或兩個生物', targets: [OPP_CR, { ...OPP_CR, optional: true }], effects: [{ e: 'tap', what: 'T0' }, { e: 'tap', what: 'T1' }] },
  ],
});
cr(S, 'C', "Doc Ock's Henchmen", '{2}{U}', 'Human Villain', 2, 1, '閃現\n每當此生物攻擊時，它密謀。', {
  keywords: ['flash'],
  abilities: [trig('attacks', [{ e: 'connive', what: 'self' }])],
});
cr(S, 'C', 'Oscorp Research Team', '{3}{U}', 'Human Scientist', 1, 5, '{6}{U}：抓兩張牌。', {
  abilities: [act({ mana: '{6}{U}' }, [{ e: 'draw', n: 2 }], '抓兩張牌')],
});
inst(S, 'C', 'Unstable Experiment', '{1}{U}', '你抓一張牌，然後至多一個目標由你操控的生物密謀。', {
  targets: [{ ...MY_CR, optional: true }],
  effects: [{ e: 'draw', n: 1 }, { e: 'connive', what: 'T0' }],
});
inst(S, 'C', 'Whoosh!', '{1}{U}', '增幅{1}{U}\n將目標非地永久物移回其擁有者手上。若此咒語已增幅，抓一張牌。', {
  modes: [
    { text: '彈回非地永久物', targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }], effects: [{ e: 'bounce', what: 'T0' }] },
    { text: '增幅：彈回並抓一張牌', cost: '{2}{U}{U}', targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }], effects: [{ e: 'bounce', what: 'T0' }, { e: 'draw', n: 1 }] },
  ],
});

// ---------------- 黑 ----------------
cr(S, 'R', 'Agent Venom', '{2}{B}', 'Symbiote Soldier Hero', 2, 3, '閃現，威懾\n每當另一個由你操控的非衍生生物死去時，你抓一張牌並失去1點生命。', {
  supertypes: ['Legendary'],
  keywords: ['flash', 'menace'],
  abilities: [trig('allyDies', [{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }], { filter: { type: 'Creature', token: false } })],
});
sorc(S, 'R', 'Villainous Wrath', '{3}{B}{B}', '目標對手失去等同於其操控的生物數量的生命。然後消滅所有生物。', {
  effects: [{ e: 'lose', n: { count: { type: 'Creature', ctrl: 'opp' } }, who: 'opp' }, { e: 'destroy', what: { all: { type: 'Creature' } } }],
});
inst(S, 'U', "The Spot's Portal", '{2}{B}', '將目標生物置於其擁有者的牌庫底。除非你操控反派，否則你失去2點生命。', {
  targets: [CR],
  effects: [{ e: 'tuck', what: 'T0' }, { e: 'if', cond: { c: 'controls', filter: VILLAIN }, then: [], else: [{ e: 'lose', n: 2, who: 'you' }] }],
});
cr(S, 'U', 'Tombstone, Career Criminal', '{2}{B}', 'Human Villain', 2, 2, '當此生物進戰場時，將目標反派牌從你的墳墓場移回你手上。\n你施放的反派咒語減少{1}來施放。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'toHand', what: 'T0' }], { targets: [{ kind: 'gyCard', filter: { ctrl: 'you', ...VILLAIN }, optional: true, prompt: '選擇墳墓場中的反派牌' }] }),
    { kind: 'static', spellCostLess: { filter: VILLAIN, n: 1 } },
  ],
});
inst(S, 'C', "Scorpion's Sting", '{1}{B}', '目標生物得-3/-3直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -3, t: -3 }] });
cr(S, 'C', 'Merciless Enforcers', '{1}{B}', 'Human Mercenary Villain', 2, 1, '繫命\n{3}{B}：此生物對每位對手各造成1點傷害。', {
  keywords: ['lifelink'],
  abilities: [act({ mana: '{3}{B}' }, [{ e: 'damage', n: 1, to: 'opp' }], '1點傷害')],
});
cr(S, 'C', 'Swarm, Being of Bees', '{2}{B}', 'Insect Villain', 2, 2, '閃現，飛行', { supertypes: ['Legendary'], keywords: ['flash', 'flying'] });
sorc(S, 'C', "Venom's Hunger", '{4}{B}', '若你操控反派，此咒語減少{2}來施放。\n消滅目標生物。你獲得2點生命。', {
  modes: [
    { text: '消滅生物', targets: [CR], effects: [destroyT0, { e: 'gain', n: 2 }] },
    { text: '操控反派時（{2}{B}）', cost: '{2}{B}', targets: [CR], effects: [destroyT0, { e: 'gain', n: 2 }] },
  ],
});
cr(S, 'C', 'Venom, Evil Unleashed', '{4}{B}', 'Symbiote Villain', 4, 5, '死觸', { supertypes: ['Legendary'], keywords: ['deathtouch'] });

// ---------------- 紅 ----------------
cr(S, 'R', 'Spider-Punk', '{1}{R}', 'Spider Human Hero', 2, 1, '敏捷\n由你操控的其他蜘蛛具有敏捷異能。', {
  supertypes: ['Legendary'],
  keywords: ['haste'],
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', other: true, ...SPIDER }, grant: { kw: ['haste'] } } }],
});
cr(S, 'U', 'Raging Goblinoids', '{4}{R}', 'Goblin Berserker Villain', 5, 4, '敏捷', { keywords: ['haste'] });
cr(S, 'U', 'Shocker, Unshakable', '{4}{R}{R}', 'Human Rogue Villain', 5, 5, '在你的回合中，此生物具有先攻異能。\n當此生物進戰場時，它對目標生物造成2點傷害，並對該生物的操控者造成2點傷害。', {
  supertypes: ['Legendary'],
  abilities: [
    { kind: 'static', self: { cond: { c: 'yourTurn' }, grant: { kw: ['first_strike'] } } },
    etb([{ e: 'damage', n: 2, to: 'T0' }, { e: 'damage', n: 2, to: 'T0ctrl' }], { targets: [OPP_CR] }),
  ],
});
cr(S, 'C', 'Angry Rabble', '{1}{R}', 'Human Citizen', 2, 2, '踐踏\n每當你施放法術力值為4或更多的咒語時，此生物對每位對手各造成1點傷害。\n{5}{R}：在此生物上放置兩個+1/+1指示物。只能於法術時機起動。', {
  keywords: ['trample'],
  abilities: [
    trig('castAny', [{ e: 'damage', n: 1, to: 'opp' }], { filter: { mvMin: 4 } }),
    act({ mana: '{5}{R}' }, [{ e: 'counters', what: 'self', n: 2 }], '+2指示物', { sorcery: true }),
  ],
});
sorc(S, 'C', "Electro's Bolt", '{2}{R}', '對目標生物造成4點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 4, to: 'T0' }] });
sorc(S, 'C', 'Romantic Rendezvous', '{1}{R}', '棄一張牌，然後抓兩張牌。', { effects: [{ e: 'discard', n: 1, who: 'you' }, { e: 'draw', n: 2 }] });
cr(S, 'C', 'Spider-Islanders', '{3}{R}', 'Spider Horror Citizen', 4, 3, '');
cr(S, 'C', 'Taxi Driver', '{1}{R}', 'Human Pilot', 3, 1, '{1}，{T}：目標生物獲得敏捷異能直到回合結束。', {
  abilities: [act({ mana: '{1}', tap: true }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['haste'] }], '給予敏捷', { targets: [MY_CR] })],
});
arti(S, 'C', 'Steel Wrecking Ball', '{5}', '當此神器進戰場時，它對目標生物造成5點傷害。', {
  abilities: [etb([{ e: 'damage', n: 5, to: 'T0' }], { targets: [CR] })],
});

// ---------------- 綠 ----------------
cr(S, 'R', 'Radioactive Spider', '{G}', 'Spider', 1, 1, '延勢，死觸\n{2}，犧牲此生物：從你的牌庫中搜尋一張蜘蛛英雄牌，將它置於你手上。只能於法術時機起動。', {
  keywords: ['reach', 'deathtouch'],
  abilities: [act({ mana: '{2}', sacSelf: true }, [{ e: 'tutor', filter: { sub: 'Hero', type: 'Creature', or: [{ sub: 'Spider' }] } }], '犧牲：搜尋蜘蛛英雄', { sorcery: true })],
});
cr(S, 'R', "Lizard, Connors's Curse", '{2}{G}{G}', 'Lizard Villain', 5, 5, '踐踏', { supertypes: ['Legendary'], keywords: ['trample'] });
cr(S, 'U', 'Ezekiel Sims, Spider-Totem', '{4}{G}', 'Spider Human Advisor', 3, 5, '延勢\n在你回合的戰鬥開始時，目標由你操控的蜘蛛得+2/+2直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['reach'],
  abilities: [trig('combatStart', [{ e: 'pump', what: 'T0', p: 2, t: 2 }], { targets: [{ kind: 'creature', filter: { ctrl: 'you', ...SPIDER }, optional: true }] })],
});
cr(S, 'U', 'Damage Control Crew', '{3}{G}', 'Human Citizen', 3, 3, '當此生物進戰場時，放逐至多一個目標神器或結界。', {
  abilities: [etb([{ e: 'exile', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] }, optional: true }] })],
});
inst(S, 'C', 'Grow Extra Arms', '{1}{G}', '目標生物得+4/+4直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 4, t: 4 }] });
cr(S, 'C', 'Guy in the Chair', '{2}{G}', 'Human Advisor', 2, 3, '{T}：加一點任意顏色的法術力。', { produces: ['W', 'U', 'B', 'R', 'G'] });
sorc(S, 'C', 'Kapow!', '{2}{G}', '在目標由你操控的生物上放置一個+1/+1指示物。它與目標由對手操控的生物互鬥。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'fight', a: 'T0', b: 'T1' }],
});
cr(S, 'C', "Kraven's Cats", '{1}{G}', 'Cat Villain', 2, 2, '{2}{G}：此生物得+2/+2直到回合結束。此異能每回合只能起動一次。', {
  abilities: [act({ mana: '{2}{G}' }, [{ e: 'pump', what: 'self', p: 2, t: 2 }], '+2/+2', { oncePerTurn: true })],
});
cr(S, 'C', 'Lurking Lizards', '{1}{G}', 'Lizard Villain', 1, 3, '踐踏\n每當你施放法術力值為4或更多的咒語時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['trample'],
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }], { filter: { mvMin: 4 } })],
});
cr(S, 'C', 'Spider-Rex, Daring Dino', '{4}{G}{G}', 'Spider Dinosaur Hero', 6, 6, '延勢，踐踏，守護{2}', {
  supertypes: ['Legendary'],
  keywords: ['reach', 'trample'],
  ward: 2,
});

// ---------------- 多色／無色 ----------------
cr(S, 'M', 'Cosmic Spider-Man', '{W}{U}{B}{R}{G}', 'Spider Human Hero', 5, 5, '飛行，先攻，踐踏，繫命，敏捷\n在你回合的戰鬥開始時，由你操控的其他蜘蛛獲得飛行、先攻、踐踏、繫命與敏捷異能直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['flying', 'first_strike', 'trample', 'lifelink', 'haste'],
  abilities: [
    trig('combatStart', [
      {
        e: 'pump',
        what: { all: { type: 'Creature', ctrl: 'you', other: true, ...SPIDER } },
        p: 0,
        t: 0,
        kw: ['flying', 'first_strike', 'trample', 'lifelink', 'haste'],
      },
    ]),
  ],
});
cr(S, 'R', 'Kraven the Hunter', '{1}{B}{G}', 'Human Warrior Villain', 4, 3, '踐踏\n每當一個由對手操控、力量為3或更多的生物死去時，抓一張牌並在此生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['trample'],
  abilities: [trig('otherDies', [{ e: 'draw', n: 1 }, { e: 'counters', what: 'self', n: 1 }], { filter: { ctrl: 'opp', powMin: 3 } })],
});
cr(S, 'R', 'Mary Jane Watson', '{1}{G/W}', 'Human Performer', 2, 2, '每當一個蜘蛛在你的操控下進戰場時，抓一張牌。此異能每回合只會觸發一次。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyEtb', [{ e: 'draw', n: 1 }], { filter: SPIDER, oncePerTurn: true })],
});
cr(S, 'R', 'Spider-Woman, Stunning Savior', '{1}{W/U}', 'Spider Human Hero', 2, 2, '飛行', { supertypes: ['Legendary'], keywords: ['flying'] });
cr(S, 'U', 'Spider-Girl, Legacy Hero', '{G}{W}', 'Spider Human Hero', 2, 2, '在你的回合中，此生物具有飛行異能。\n當此生物死去時，派出一個1/1綠白雙色人類市民衍生生物。', {
  supertypes: ['Legendary'],
  abilities: [YOUR_TURN_FLYING, trig('dies', [{ e: 'token', token: 'tok-citizen' }])],
});
cr(S, 'U', 'Sun-Spider, Nimble Webber', '{3}{W/U}', 'Spider Human Hero', 3, 2, '在你的回合中，此生物具有飛行異能。\n當此生物進戰場時，從你的牌庫中搜尋一張靈氣或武具牌，將它置於你手上。', {
  supertypes: ['Legendary'],
  abilities: [YOUR_TURN_FLYING, etb([{ e: 'tutor', filter: { sub: ['Aura', 'Equipment'] } }])],
});
cr(S, 'U', 'Vulture, Scheming Scavenger', '{5}{U/B}', 'Human Artificer Villain', 4, 6, '飛行\n每當此生物攻擊時，由你操控的其他反派獲得飛行異能直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [trig('attacks', [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', other: true, ...VILLAIN } }, p: 0, t: 0, kw: ['flying'] }])],
});
cr(S, 'U', 'Web-Warriors', '{4}{G/W}', 'Spider Hero', 4, 3, '當此生物進戰場時，在每個由你操控的其他生物上各放置一個+1/+1指示物。', {
  abilities: [etb([{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', other: true } }, n: 1 }])],
});
cr(S, 'U', 'Wraith, Vicious Vigilante', '{1}{W}{U}', 'Human Detective Hero', 1, 1, '連擊\n此生物不能被阻擋。', {
  supertypes: ['Legendary'],
  keywords: ['double_strike', 'unblockable'],
});
cr(S, 'U', 'Rhino, Barreling Brute', '{3}{R}{R}{G}{G}', 'Human Villain', 6, 7, '警戒，踐踏，敏捷', { supertypes: ['Legendary'], keywords: ['vigilance', 'trample', 'haste'] });
arti(S, 'U', 'Spider-Suit', '{1}', '佩帶此武具的生物得+2/+2。\n裝備{3}', { subtypes: ['Equipment'], equip: { cost: '{3}', grant: { p: 2, t: 2 } } });
cr(S, 'C', 'Gallant Citizen', '{G/W}{G/W}', 'Human Citizen', 1, 1, '當此生物進戰場時，抓一張牌。', { abilities: [etb([{ e: 'draw', n: 1 }])] });
cr(S, 'C', 'Spider Manifestation', '{1}{R/G}', 'Spider Avatar', 2, 2, '延勢\n{T}：加{R}或{G}。', { keywords: ['reach'], produces: ['R', 'G'] });
cr(S, 'C', 'News Helicopter', '{3}', 'Construct', 1, 1, '飛行\n當此生物進戰場時，派出一個1/1綠白雙色人類市民衍生生物。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [etb([{ e: 'token', token: 'tok-citizen' }])],
});
