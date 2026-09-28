// Wilds of Eldraine（WOE，2023 年 9 月）
import { CR, MY_CR, OPP, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, sorc, trig } from '../dsl';

const S = 'WOE';
const RAT_TEXT = '派出一個1/1黑色，具有「此衍生物不能阻擋」的老鼠衍生生物。';
const FAERIE = { sub: 'Faerie' };

// ---------------- 白 ----------------
cr(S, 'M', 'Moonshaker Cavalry', '{5}{W}{W}{W}', 'Spirit Knight', 6, 6, '飛行\n當此生物進戰場時，由你操控的生物獲得飛行異能並得+X/+X直到回合結束，X為由你操控的生物數量。', {
  keywords: ['flying'],
  abilities: [
    etb([
      {
        e: 'pump',
        what: { all: { type: 'Creature', ctrl: 'you' } },
        p: { count: { type: 'Creature', ctrl: 'you' } },
        t: { count: { type: 'Creature', ctrl: 'you' } },
        kw: ['flying'],
      },
    ]),
  ],
});
cr(S, 'R', 'Werefox Bodyguard', '{1}{W}{W}', 'Elf Fox Knight', 2, 2, '閃現\n當此生物進戰場時，放逐至多一個另外的目標非狐狸生物，直到此生物離開戰場為止。\n{1}{W}，犧牲此生物：你獲得2點生命。', {
  keywords: ['flash'],
  abilities: [
    etb([{ e: 'exileLinked', what: 'T0' }], { targets: [{ kind: 'creature', filter: { ctrl: 'opp', nonSub: 'Fox' }, optional: true }] }),
    act({ mana: '{1}{W}', sacSelf: true }, [{ e: 'gain', n: 2 }], '犧牲：獲得2點生命'),
  ],
});
cr(S, 'R', 'Archon of the Wild Rose', '{2}{W}{W}', 'Archon', 4, 4, '飛行', { keywords: ['flying'] });
cr(S, 'U', 'Dutiful Griffin', '{3}{W}{W}', 'Griffin', 4, 4, '飛行', { keywords: ['flying'] });
arti(S, 'U', 'Glass Casket', '{1}{W}', '當此神器進戰場時，放逐目標由對手操控、法術力值為3或更少的生物，直到此神器離開戰場為止。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [{ kind: 'creature', filter: { ctrl: 'opp', mvMax: 3 } }] })],
});
inst(S, 'C', 'Break the Spell', '{W}', '消滅目標結界。', { targets: [{ kind: 'permanent', filter: { type: 'Enchantment' } }], effects: [destroyT0] });
ench(S, 'C', 'Cooped Up', '{1}{W}', '結附於生物\n所結附的生物不能攻擊或阻擋。\n{2}{W}：放逐所結附的生物。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { cantAttack: true, cantBlock: true } },
  abilities: [act({ mana: '{2}{W}' }, [{ e: 'exile', what: 'attached' }], '放逐所結附的生物')],
});
cr(S, 'C', 'Frostbridge Guard', '{1}{W}', 'Elemental Soldier', 2, 2, '{2}{W}，{T}：橫置目標生物。', {
  abilities: [act({ mana: '{2}{W}', tap: true }, [{ e: 'tap', what: 'T0' }], '橫置生物', { targets: [OPP_CR] })],
});
inst(S, 'C', 'Moment of Valor', '{2}{W}', '選擇一項：\n• 重置目標生物。它得+1/+0並獲得不滅異能直到回合結束。\n• 消滅目標力量為4或更多的生物。', {
  modes: [
    { text: '重置並獲得不滅', targets: [MY_CR], effects: [{ e: 'untap', what: 'T0' }, { e: 'pump', what: 'T0', p: 1, t: 0, kw: ['indestructible'] }] },
    { text: '消滅力量4以上的生物', targets: [{ kind: 'creature', filter: { powMin: 4 } }], effects: [destroyT0] },
  ],
});
inst(S, 'C', 'Plunge into Winter', '{1}{W}', '橫置至多一個目標生物。占卜1，然後抓一張牌。', {
  targets: [{ kind: 'creature', optional: true }],
  effects: [{ e: 'tap', what: 'T0' }, { e: 'scry', n: 1 }, { e: 'draw', n: 1 }],
});
cr(S, 'C', 'Rimefur Reindeer', '{3}{W}', 'Elk', 3, 4, '每當一個結界在你的操控下進戰場時，橫置目標由對手操控的生物。', {
  abilities: [trig('allyPermEtb', [{ e: 'tap', what: 'T0' }], { filter: { type: 'Enchantment' }, targets: [{ ...OPP_CR, optional: true }] })],
});
cr(S, 'C', 'Savior of the Sleeping', '{2}{W}', 'Human Knight', 2, 3, '警戒', { keywords: ['vigilance'] });
cr(S, 'C', 'Slumbering Keepguard', '{W}', 'Human Knight', 1, 1, '每當一個結界在你的操控下進戰場時，占卜1。', {
  abilities: [trig('allyPermEtb', [{ e: 'scry', n: 1 }], { filter: { type: 'Enchantment' } })],
});
cr(S, 'C', 'Stockpiling Celebrant', '{2}{W}', 'Dwarf Knight', 3, 2, '當此生物進戰場時，你可以將另一個目標由你操控的非地永久物移回其擁有者手上。若你如此作，占卜2。', {
  abilities: [
    etb([{ e: 'if', cond: { c: 'targetIs', t: 0, filter: { ctrl: 'you' } }, then: [{ e: 'bounce', what: 'T0' }, { e: 'scry', n: 2 }] }], {
      targets: [{ kind: 'permanent', filter: { ctrl: 'you', nonType: 'Land' }, notSelf: true, optional: true }],
    }),
  ],
});

// ---------------- 藍 ----------------
cr(S, 'R', 'Sleep-Cursed Faerie', '{U}', 'Faerie Wizard', 3, 3, '飛行，守護{2}\n此生物橫置進戰場，且上面有三個暈眩指示物。\n{1}{U}：重置此生物。', {
  keywords: ['flying'],
  ward: 2,
  etbTapped: true,
  abilities: [etb([{ e: 'stun', what: 'self', n: 3 }]), act({ mana: '{1}{U}' }, [{ e: 'untap', what: 'self' }], '重置')],
});
cr(S, 'U', 'Archive Dragon', '{4}{U}{U}', 'Dragon Wizard', 4, 6, '飛行，守護{2}\n當此生物進戰場時，占卜2。', {
  keywords: ['flying'],
  ward: 2,
  abilities: [etb([{ e: 'scry', n: 2 }])],
});
inst(S, 'U', 'Disdainful Stroke', '{1}{U}', '反擊目標法術力值為4或更多的咒語。', {
  targets: [{ kind: 'spell', filter: { mvMin: 4 } }],
  effects: [{ e: 'counter', what: 'T0' }],
});
inst(S, 'U', 'Succumb to the Cold', '{2}{U}', '橫置一或兩個由對手操控的目標生物。在它們上面各放置一個暈眩指示物。', {
  targets: [OPP_CR, { ...OPP_CR, optional: true }],
  effects: [{ e: 'stun', what: 'T0' }, { e: 'stun', what: 'T1' }],
});
sorc(S, 'C', 'Freeze in Place', '{1}{U}', '橫置目標由對手操控的生物，並在其上放置三個暈眩指示物。占卜2。', {
  targets: [OPP_CR],
  effects: [{ e: 'stun', what: 'T0', n: 3 }, { e: 'scry', n: 2 }],
});
sorc(S, 'C', 'Into the Fae Court', '{3}{U}{U}', '抓三張牌。派出一個1/1藍黑雙色，具飛行異能的妖精衍生生物。', {
  effects: [{ e: 'draw', n: 3 }, { e: 'token', token: 'tok-faerie' }],
});
cr(S, 'C', 'Merfolk Coralsmith', '{2}{U}', 'Merfolk', 2, 3, '{1}：此生物得+1/-1直到回合結束。\n當此生物死去時，占卜2。', {
  abilities: [act({ mana: '{1}' }, [{ e: 'pump', what: 'self', p: 1, t: -1 }], '+1/-1'), trig('dies', [{ e: 'scry', n: 2 }])],
});
inst(S, 'C', 'Misleading Motes', '{3}{U}', '將目標生物置於其擁有者的牌庫底。', { targets: [CR], effects: [{ e: 'tuck', what: 'T0' }] });
cr(S, 'C', 'Mocking Sprite', '{2}{U}', 'Faerie Rogue', 2, 1, '飛行\n你施放的瞬間與法術咒語減少{1}來施放。', {
  keywords: ['flying'],
  abilities: [{ kind: 'static', spellCostLess: { filter: { type: ['Instant', 'Sorcery'] }, n: 1 } }],
});
inst(S, 'C', 'Spell Stutter', '{1}{U}', '反擊目標咒語，除非其操控者支付{2}。', { targets: [{ kind: 'spell' }], effects: [{ e: 'counterUnless', what: 'T0', pay: 2 }] });
cr(S, 'C', 'Stormkeld Prowler', '{1}{U}', 'Human Rogue', 2, 1, '每當你施放法術力值為5或更多的咒語時，在此生物上放置兩個+1/+1指示物。', {
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 2 }], { filter: { mvMin: 5 } })],
});

// ---------------- 黑 ----------------
sorc(S, 'R', "Rankle's Prank", '{2}{B}{B}', '選擇一項：\n• 每位玩家各棄兩張牌。\n• 每位玩家各失去4點生命。\n• 每位玩家各犧牲兩個生物。', {
  modes: [
    { text: '每位玩家棄兩張牌', effects: [{ e: 'discard', n: 2, who: 'players' }] },
    { text: '每位玩家失去4點生命', effects: [{ e: 'lose', n: 4, who: 'players' }] },
    { text: '每位玩家犧牲兩個生物', effects: [{ e: 'edict', who: 'players' }, { e: 'edict', who: 'players' }] },
  ],
});
cr(S, 'R', 'Tangled Colony', '{1}{B}', 'Rat', 3, 2, '此生物不能阻擋。', { abilities: [{ kind: 'static', self: { grant: { cantBlock: true } } }] });
cr(S, 'U', 'Dream Spoilers', '{3}{B}', 'Faerie Warlock', 2, 2, '飛行\n每當你於對手的回合中施放咒語時，至多一個目標由對手操控的生物得-1/-1直到回合結束。', {
  keywords: ['flying'],
  abilities: [trig('castAny', [{ e: 'pump', what: 'T0', p: -1, t: -1 }], { cond: { c: 'notYourTurn' }, targets: [{ ...OPP_CR, optional: true }] })],
});
sorc(S, 'U', 'Ego Drain', '{B}', '目標對手展示其手牌。你從中選擇一張非地牌，該玩家棄掉那張牌。', {
  targets: [OPP],
  effects: [{ e: 'discardChosen', who: 'T0', filter: { nonType: 'Land' } }],
});
inst(S, 'U', 'Taken by Nightmares', '{2}{B}{B}', '放逐目標生物。若你操控結界，占卜2。', {
  targets: [CR],
  effects: [{ e: 'exile', what: 'T0' }, { e: 'if', cond: { c: 'controls', filter: { type: 'Enchantment' } }, then: [{ e: 'scry', n: 2 }] }],
});
cr(S, 'C', 'Barrow Naughty', '{1}{B}', 'Faerie', 1, 3, '飛行\n只要你操控另一個妖精，此生物具有繫命異能。\n{2}{B}：此生物得+1/+0直到回合結束。', {
  keywords: ['flying'],
  abilities: [
    { kind: 'static', self: { cond: { c: 'controls', filter: { ...FAERIE, other: true } }, grant: { kw: ['lifelink'] } } },
    act({ mana: '{2}{B}' }, [{ e: 'pump', what: 'self', p: 1, t: 0 }], '+1/+0'),
  ],
});
ench(S, 'C', 'Hopeless Nightmare', '{B}', '當此結界進戰場時，每位對手各棄一張牌並失去2點生命。', {
  abilities: [etb([{ e: 'discard', n: 1, who: 'opp' }, { e: 'lose', n: 2, who: 'opp' }])],
});
inst(S, 'C', 'Rat Out', '{B}', `至多一個目標生物得-1/-1直到回合結束。你${RAT_TEXT}`, {
  targets: [{ kind: 'creature', optional: true }],
  effects: [{ e: 'pump', what: 'T0', p: -1, t: -1 }, { e: 'token', token: 'tok-rat' }],
});
cr(S, 'C', 'Stingblade Assassin', '{3}{B}', 'Faerie Assassin', 3, 1, '閃現，飛行\n當此生物進戰場時，消滅目標本回合受到過傷害、由對手操控的生物。', {
  keywords: ['flash', 'flying'],
  abilities: [etb([destroyT0], { targets: [{ kind: 'creature', filter: { ctrl: 'opp', damaged: true }, optional: true }] })],
});
inst(S, 'C', 'Sugar Rush', '{1}{B}', '目標生物得+3/+0直到回合結束。抓一張牌。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 0 }, { e: 'draw', n: 1 }] });
cr(S, 'C', 'Voracious Vermin', '{2}{B}', 'Rat', 2, 1, `當此生物進戰場時，${RAT_TEXT}\n每當另一個由你操控的生物死去時，在此生物上放置一個+1/+1指示物。`, {
  abilities: [etb([{ e: 'token', token: 'tok-rat' }]), trig('allyDies', [{ e: 'counters', what: 'self', n: 1 }], { filter: { type: 'Creature' } })],
});

// ---------------- 紅 ----------------
cr(S, 'U', 'Boundary Lands Ranger', '{1}{R}', 'Human Ranger', 2, 2, '在你回合的戰鬥開始時，若你操控力量為4或更多的生物，你可以棄一張牌。若你如此作，抓一張牌。', {
  abilities: [
    trig('combatStart', [{ e: 'costThen', prompt: '棄一張牌來抓一張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }], {
      cond: { c: 'controls', filter: { type: 'Creature', powMin: 4 } },
    }),
  ],
});
inst(S, 'U', 'Witchstalker Frenzy', '{3}{R}', '對目標生物造成5點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 5, to: 'T0' }] });
cr(S, 'C', 'Edgewall Pack', '{3}{R}', 'Dog', 3, 3, `威懾\n當此生物進戰場時，${RAT_TEXT}`, {
  keywords: ['menace'],
  abilities: [etb([{ e: 'token', token: 'tok-rat' }])],
});
inst(S, 'C', 'Gnawing Crescendo', '{2}{R}', '由你操控的生物得+2/+0直到回合結束。', { effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 2, t: 0 }] });
cr(S, 'C', 'Harried Spearguard', '{R}', 'Human Soldier', 1, 1, `敏捷\n當此生物死去時，${RAT_TEXT}`, {
  keywords: ['haste'],
  abilities: [trig('dies', [{ e: 'token', token: 'tok-rat' }])],
});
inst(S, 'C', 'Kindled Heroism', '{R}', '目標生物得+1/+0並獲得先攻異能直到回合結束。占卜1。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['first_strike'] }, { e: 'scry', n: 1 }],
});
cr(S, 'C', 'Skewer Slinger', '{1}{R}', 'Dwarf Knight', 1, 3, '延勢', { keywords: ['reach'] });
cr(S, 'C', 'Unruly Catapult', '{2}{R}', 'Construct', 0, 4, '守軍\n{T}：此生物對每位對手各造成1點傷害。\n每當你施放瞬間或法術咒語時，重置此生物。', {
  types: ['Artifact', 'Creature'],
  keywords: ['defender'],
  abilities: [act({ tap: true }, [{ e: 'damage', n: 1, to: 'opp' }], '對手1點傷害'), trig('castInstSorc', [{ e: 'untap', what: 'self' }])],
});

// ---------------- 綠 ----------------
cr(S, 'U', 'Redtooth Vanguard', '{1}{G}', 'Elf Warrior', 3, 1, '踐踏', { keywords: ['trample'] });
ench(S, 'C', 'Bestial Bloodline', '{1}{G}', '結附於生物\n所結附的生物得+2/+2。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇要結附的生物' }, grant: { p: 2, t: 2 } },
});
sorc(S, 'C', 'Commune with Nature', '{G}', '檢視你牌庫頂的五張牌。你可以展示其中一張生物牌並置於你手上。將其餘的牌置於你的牌庫底。', {
  effects: [{ e: 'dig', n: 5, take: 1, rest: 'bottom', filter: { type: 'Creature' } }],
});
inst(S, 'C', 'Leaping Ambush', '{G}', '目標生物得+1/+3並獲得延勢異能直到回合結束。重置該生物。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 3, kw: ['reach'] }, { e: 'untap', what: 'T0' }],
});
cr(S, 'C', 'Rootrider Faun', '{1}{G}', 'Satyr Scout', 1, 3, '{T}：加{G}。', { produces: ['G'] });
cr(S, 'C', 'Toadstool Admirer', '{G}', 'Ouphe', 1, 1, '守護{2}\n{3}{G}：在此生物上放置一個+1/+1指示物。', {
  ward: 2,
  abilities: [act({ mana: '{3}{G}' }, [{ e: 'counters', what: 'self', n: 1 }], '+1/+1指示物')],
});
cr(S, 'C', 'Verdant Outrider', '{2}{G}', 'Human Knight', 4, 2, '');

// ---------------- 多色／無色 ----------------
cr(S, 'M', 'Rowan, Scion of War', '{1}{B}{R}', 'Human Wizard', 4, 2, '威懾', { supertypes: ['Legendary'], keywords: ['menace'] });
cr(S, 'M', 'Will, Scion of Peace', '{1}{W}{U}', 'Human Wizard', 2, 4, '警戒', { supertypes: ['Legendary'], keywords: ['vigilance'] });
cr(S, 'U', 'Obyra, Dreaming Duelist', '{U}{B}', 'Faerie Warrior', 2, 2, '閃現，飛行\n每當另一個妖精在你的操控下進戰場時，每位對手失去1點生命。', {
  supertypes: ['Legendary'],
  keywords: ['flash', 'flying'],
  abilities: [trig('allyEtb', [{ e: 'lose', n: 1, who: 'opp' }], { filter: FAERIE })],
});
arti(S, 'R', "Hylda's Crown of Winter", '{3}', '{1}，{T}：橫置目標生物。', {
  supertypes: ['Legendary'],
  abilities: [act({ mana: '{1}', tap: true }, [{ e: 'tap', what: 'T0' }], '橫置生物', { targets: [OPP_CR] })],
});
arti(S, 'C', 'Candy Trail', '{1}', '當此神器進戰場時，占卜2。\n{2}，{T}，犧牲此神器：你獲得3點生命並抓一張牌。', {
  subtypes: ['Food', 'Clue'],
  abilities: [etb([{ e: 'scry', n: 2 }]), act({ mana: '{2}', tap: true, sacSelf: true }, [{ e: 'gain', n: 3 }, { e: 'draw', n: 1 }], '犧牲：獲得3點生命並抓牌')],
});
arti(S, 'C', 'Prophetic Prism', '{2}', '當此神器進戰場時，抓一張牌。\n{T}：加一點任意顏色的法術力。', {
  produces: ['W', 'U', 'B', 'R', 'G'],
  abilities: [etb([{ e: 'draw', n: 1 }])],
});
arti(S, 'U', 'Soul-Guide Lantern', '{1}', '{1}，{T}，犧牲此神器：抓一張牌。', {
  abilities: [act({ mana: '{1}', tap: true, sacSelf: true }, [{ e: 'draw', n: 1 }], '犧牲：抓一張牌')],
});
