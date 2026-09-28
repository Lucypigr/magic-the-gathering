// Final Fantasy（FIN，2025 年 6 月）
import type { Mana } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, OPP_NONLAND, act, arti, cr, destroyT0, etb, inst, land, sorc, trig } from '../dsl';

const S = 'FIN';

// 城鎮雙色地
const town = (name: string, a: Mana, b: Mana) =>
  land(S, 'C', name, [a, b], `此地橫置進戰場。\n{T}：加{${a}}或{${b}}。`, { etbTapped: true, subtypes: ['Town'] });
town('Baron, Airship Kingdom', 'U', 'R');
town('Gohn, Town of Ruin', 'B', 'G');
town('Gongaga, Reactor Town', 'R', 'G');
town('Guadosalam, Farplane Gateway', 'G', 'U');
town('Insomnia, Crown City', 'W', 'B');
town('Rabanastre, Royal City', 'R', 'W');
town('Sharlayan, Nation of Scholars', 'W', 'U');
town('Treno, Dark City', 'U', 'B');
town('Vector, Imperial Capital', 'B', 'R');
town('Windurst, Federation Center', 'G', 'W');
land(S, 'C', "Adventurer's Inn", ['C'], '當此地進戰場時，你獲得2點生命。\n{T}：加{C}。', {
  subtypes: ['Town'],
  abilities: [etb([{ e: 'gain', n: 2 }])],
});

// ---------------- 白 ----------------
cr(S, 'R', 'Minwu, White Mage', '{3}{W}{W}', 'Human Cleric', 3, 3, '警戒，繫命\n每當你獲得生命時，在每個由你操控的僧侶上各放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['vigilance', 'lifelink'],
  abilities: [trig('lifegain', [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', sub: 'Cleric' } }, n: 1 }])],
});
inst(S, 'R', "Moogles' Valor", '{3}{W}{W}', '由你操控的生物每有一個，便派出一個1/2白色，具繫命異能的莫古利衍生生物。然後由你操控的生物獲得不滅異能直到回合結束。', {
  effects: [
    { e: 'token', token: 'tok-moogle', n: { count: { type: 'Creature', ctrl: 'you' } } },
    { e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 0, t: 0, kw: ['indestructible'] },
  ],
});
cr(S, 'U', 'Adelbert Steiner', '{1}{W}', 'Human Knight', 2, 1, '繫命\n由你操控的武具每有一個，此生物便得+1/+1。', {
  supertypes: ['Legendary'],
  keywords: ['lifelink'],
  abilities: [{ kind: 'static', self: { cond: { c: 'controls', filter: { sub: 'Equipment' } }, grant: { p: 1, t: 1 } } }],
  text: '繫命\n只要你操控武具，此生物得+1/+1。',
});
cr(S, 'U', "G'raha Tia", '{4}{W}', 'Cat Archer', 3, 5, '延勢\n每當一個或更多由你操控的其他生物及／或神器死去時，抓一張牌。此異能每回合只會觸發一次。', {
  supertypes: ['Legendary'],
  keywords: ['reach'],
  abilities: [trig('allyDies', [{ e: 'draw', n: 1 }], { filter: { type: ['Creature', 'Artifact'] }, oncePerTurn: true })],
});
sorc(S, 'U', "The Crystal's Chosen", '{5}{W}{W}', '派出四個1/1無色英雄衍生生物。然後在每個由你操控的生物上各放置一個+1/+1指示物。', {
  effects: [{ e: 'token', token: 'tok-hero-cl', n: 4 }, { e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }],
});
cr(S, 'C', 'Coeurl', '{1}{W}', 'Cat Beast', 2, 2, '{1}{W}，{T}：橫置目標生物。', {
  abilities: [act({ mana: '{1}{W}', tap: true }, [{ e: 'tap', what: 'T0' }], '橫置生物', { targets: [OPP_CR] })],
});
cr(S, 'C', 'Dwarven Castle Guard', '{1}{W}', 'Dwarf Soldier', 2, 1, '當此生物死去時，派出一個1/1無色英雄衍生生物。', {
  abilities: [trig('dies', [{ e: 'token', token: 'tok-hero-cl' }])],
});
inst(S, 'C', 'Fate of the Sun-Cryst', '{4}{W}', '若此咒語以已橫置的生物為目標，則減少{2}來施放。\n消滅目標非地永久物。', {
  modes: [
    { text: '消滅非地永久物', targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }], effects: [destroyT0] },
    { text: '消滅已橫置的生物（{2}{W}）', cost: '{2}{W}', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [destroyT0] },
  ],
});
cr(S, 'C', 'Gaelicat', '{2}{W}', 'Cat', 1, 3, '飛行，警戒\n只要你操控兩個或更多神器，此生物得+2/+0。', {
  keywords: ['flying', 'vigilance'],
  abilities: [{ kind: 'static', self: { cond: { c: 'controls', filter: { type: 'Artifact' }, n: 2 }, grant: { p: 2 } } }],
});
inst(S, 'C', 'Slash of Light', '{1}{W}', '對目標生物造成傷害，其數量等同於由你操控的生物與武具的總數。', {
  targets: [CR],
  effects: [{ e: 'damage', n: { count: { ctrl: 'you', or: [{ type: 'Creature' }, { sub: 'Equipment' }] } }, to: 'T0' }],
});
arti(S, 'C', 'White Auracite', '{2}{W}{W}', '當此神器進戰場時，放逐目標由對手操控的非地永久物，直到此神器離開戰場為止。\n{T}：加{W}。', {
  produces: ['W'],
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [OPP_NONLAND] })],
});
inst(S, 'C', "You're Not Alone", '{W}', '目標生物得+2/+2直到回合結束。若你操控三個或更多生物，改為得+4/+4。', {
  targets: [CR],
  effects: [
    {
      e: 'if',
      cond: { c: 'controls', filter: { type: 'Creature' }, n: 3 },
      then: [{ e: 'pump', what: 'T0', p: 4, t: 4 }],
      else: [{ e: 'pump', what: 'T0', p: 2, t: 2 }],
    },
  ],
});

// ---------------- 藍 ----------------
cr(S, 'R', 'Edgar, King of Figaro', '{4}{U}{U}', 'Human Artificer Noble', 4, 5, '當此生物進戰場時，由你操控的神器每有一個，便抓一張牌。', {
  supertypes: ['Legendary'],
  abilities: [etb([{ e: 'draw', n: { count: { type: 'Artifact', ctrl: 'you' } } }])],
});
inst(S, 'U', 'Eject', '{3}{U}', '此咒語不能被反擊。\n將目標非地永久物移回其擁有者手上。抓一張牌。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'draw', n: 1 }],
});
cr(S, 'U', 'Il Mheg Pixie', '{1}{U}', 'Faerie', 2, 1, '飛行\n每當此生物攻擊時，刺探1。', {
  keywords: ['flying'],
  abilities: [trig('attacks', [{ e: 'surveil', n: 1 }])],
});
sorc(S, 'C', 'Combat Tutorial', '{2}{U}', '你抓兩張牌。在至多一個目標由你操控的生物上放置一個+1/+1指示物。', {
  targets: [{ ...MY_CR, optional: true }],
  effects: [{ e: 'draw', n: 2 }, { e: 'counters', what: 'T0', n: 1 }],
});
cr(S, 'C', "Dragoon's Wyvern", '{2}{U}', 'Drake', 2, 1, '飛行\n當此生物進戰場時，派出一個1/1無色英雄衍生生物。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'token', token: 'tok-hero-cl' }])],
});
inst(S, 'C', 'Magic Damper', '{U}', '目標由你操控的生物得+1/+1並獲得辟邪異能直到回合結束。重置該生物。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 1, kw: ['hexproof'] }, { e: 'untap', what: 'T0' }],
});
cr(S, 'C', 'Qiqirn Merchant', '{2}{U}', 'Beast Citizen', 1, 4, '{1}，{T}：抓一張牌，然後棄一張牌。', {
  abilities: [act({ mana: '{1}', tap: true }, [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }], '抓一棄一')],
});
arti(S, 'C', 'Instant Ramen', '{2}', '閃現\n當此神器進戰場時，抓一張牌。\n{2}，{T}，犧牲此神器：你獲得3點生命。', {
  subtypes: ['Food'],
  keywords: ['flash'],
  abilities: [etb([{ e: 'draw', n: 1 }]), act({ mana: '{2}', tap: true, sacSelf: true }, [{ e: 'gain', n: 3 }], '吃掉：獲得3點生命')],
});

// ---------------- 黑 ----------------
cr(S, 'M', 'Dark Confidant', '{1}{B}', 'Human Wizard', 2, 1, '在你的維持開始時，展示你牌庫頂的牌並將它置於你手上。你失去等同於其法術力值的生命。', {
  abilities: [trig('upkeep', [{ e: 'revealDraw' }])],
});
cr(S, 'U', 'Al Bhed Salvagers', '{2}{B}', 'Human Artificer Warrior', 2, 3, '每當此生物或另一個由你操控的生物或神器死去時，目標對手失去1點生命，且你獲得1點生命。', {
  abilities: [trig('allyDies', [{ e: 'lose', n: 1, who: 'T0' }, { e: 'gain', n: 1 }], { filter: { type: ['Creature', 'Artifact'] }, includeSelf: true, targets: [OPP] })],
});
sorc(S, 'U', 'Evil Reawakened', '{4}{B}', '將目標生物牌從你的墳墓場移回戰場，且它額外得到兩個+1/+1指示物。', {
  targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' }],
  effects: [{ e: 'reanimate', what: 'T0' }, { e: 'counters', what: 'T0', n: 2 }],
});
inst(S, 'U', 'Overkill', '{2}{B}', '目標生物得-0/-9999直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 0, t: -9999 }] });
sorc(S, 'U', 'Poison the Waters', '{1}{B}', '選擇一項：\n• 所有生物得-1/-1直到回合結束。\n• 目標玩家展示其手牌。你從中選擇一張神器或生物牌，該玩家棄掉那張牌。', {
  modes: [
    { text: '所有生物-1/-1', effects: [{ e: 'pump', what: { all: { type: 'Creature' } }, p: -1, t: -1 }] },
    { text: '對手棄掉神器或生物牌', targets: [OPP], effects: [{ e: 'discardChosen', who: 'T0', filter: { type: ['Artifact', 'Creature'] } }] },
  ],
});
cr(S, 'C', 'Ahriman', '{2}{B}', 'Eye Horror', 2, 2, '飛行，死觸\n{3}，犧牲另一個生物或神器：抓一張牌。', {
  keywords: ['flying', 'deathtouch'],
  abilities: [act({ mana: '{3}', sacOther: { type: ['Creature', 'Artifact'] } }, [{ e: 'draw', n: 1 }], '犧牲：抓一張牌')],
});
sorc(S, 'C', 'Cornered by Black Mages', '{1}{B}{B}', '目標對手犧牲一個生物。派出一個0/1黑色巫師衍生生物，它具有「每當你施放非生物咒語時，此衍生物對每位對手各造成1點傷害。」', {
  targets: [OPP],
  effects: [{ e: 'edict', who: 'T0' }, { e: 'token', token: 'tok-wizard-ping' }],
});
inst(S, 'C', 'Fight On!', '{2}{B}', '將至多兩張目標生物牌從你的墳墓場移回你手上。', {
  targets: [
    { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
    { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' },
  ],
  effects: [{ e: 'toHand', what: 'T0' }, { e: 'toHand', what: 'T1' }],
});
cr(S, 'C', 'Hecteyes', '{1}{B}', 'Ooze Horror', 1, 1, '當此生物進戰場時，每位對手各棄一張牌。', { abilities: [etb([{ e: 'discard', n: 1, who: 'opp' }])] });
inst(S, 'C', "Sephiroth's Intervention", '{3}{B}', '消滅目標生物。你獲得2點生命。', { targets: [CR], effects: [destroyT0, { e: 'gain', n: 2 }] });

// ---------------- 紅 ----------------
inst(S, 'U', 'Opera Love Song', '{1}{R}', '選擇一項：\n• 放逐你牌庫頂的兩張牌。本回合你可以使用這些牌。\n• 一或兩個目標生物各得+2/+0直到回合結束。', {
  modes: [
    { text: '放逐牌庫頂兩張牌', effects: [{ e: 'impulse', n: 2 }] },
    { text: '一或兩個生物+2/+0', targets: [MY_CR, { ...MY_CR, optional: true }], effects: [{ e: 'pump', what: 'T0', p: 2, t: 0 }, { e: 'pump', what: 'T1', p: 2, t: 0 }] },
  ],
});
cr(S, 'U', 'Sandworm', '{4}{R}', 'Worm', 5, 4, '敏捷\n當此生物進戰場時，消滅目標地。其操控者可以從其牌庫中搜尋一張基本地牌，將它橫置放進戰場。', {
  keywords: ['haste'],
  abilities: [
    etb([destroyT0, { e: 'searchLand', to: 'battlefield', tapped: true, who: 'T0ctrl' }], { targets: [{ kind: 'permanent', filter: { type: 'Land', ctrl: 'opp' } }] }),
  ],
});
inst(S, 'U', 'Self-Destruct', '{1}{R}', '目標由你操控的生物對另一個任意目標造成X點傷害，並對自己造成X點傷害，X為其力量。', {
  targets: [MY_CR, { ...ANY, prompt: '選擇另一個目標' }],
  effects: [
    { e: 'damage', n: { power: 'T0' }, to: 'T1' },
    { e: 'damage', n: { power: 'T0' }, to: 'T0' },
  ],
});
arti(S, 'U', 'Coral Sword', '{R}', '閃現\n當此武具進戰場時，將它裝備到目標由你操控的生物上。該生物獲得先攻異能直到回合結束。\n佩帶此武具的生物得+1/+0。\n裝備{1}', {
  subtypes: ['Equipment'],
  keywords: ['flash'],
  equip: { cost: '{1}', grant: { p: 1 } },
  abilities: [etb([{ e: 'attach', what: 'T0' }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['first_strike'] }], { targets: [MY_CR] })],
});
arti(S, 'U', 'Lion Heart', '{4}', '當此武具進戰場時，它對任意一個目標造成2點傷害。\n佩帶此武具的生物得+2/+1。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { p: 2, t: 1 } },
  abilities: [etb([{ e: 'damage', n: 2, to: 'T0' }], { targets: [ANY] })],
});
inst(S, 'C', 'Haste Magic', '{1}{R}', '目標生物得+3/+1並獲得敏捷異能直到回合結束。放逐你牌庫頂的一張牌，本回合你可以使用該牌。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 3, t: 1, kw: ['haste'] }, { e: 'impulse', n: 1 }],
});
cr(S, 'C', 'Hill Gigas', '{4}{R}{R}', 'Giant', 5, 4, '踐踏，敏捷', { keywords: ['trample', 'haste'] });
inst(S, 'C', 'Light of Judgment', '{4}{R}', '對目標生物造成6點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 6, to: 'T0' }] });
cr(S, 'C', 'Mysidian Elder', '{2}{R}', 'Human Wizard', 1, 3, '當此生物進戰場時，派出一個0/1黑色巫師衍生生物，它具有「每當你施放非生物咒語時，此衍生物對每位對手各造成1點傷害。」', {
  abilities: [etb([{ e: 'token', token: 'tok-wizard-ping' }])],
});
cr(S, 'C', 'Sabotender', '{1}{R}', 'Plant', 2, 1, '延勢\n地落—每當一個地在你的操控下進戰場時，此生物對每位對手各造成1點傷害。', {
  keywords: ['reach'],
  abilities: [trig('landfall', [{ e: 'damage', n: 1, to: 'opp' }])],
});
sorc(S, 'C', 'Suplex', '{1}{R}', '選擇一項：\n• 對目標生物造成3點傷害。\n• 放逐目標神器。', {
  modes: [
    { text: '3點傷害', targets: [CR], effects: [{ e: 'damage', n: 3, to: 'T0' }] },
    { text: '放逐神器', targets: [{ kind: 'permanent', filter: { type: 'Artifact' } }], effects: [{ e: 'exile', what: 'T0' }] },
  ],
});

// ---------------- 綠 ----------------
cr(S, 'R', 'Tifa Lockhart', '{1}{G}', 'Human Monk', 1, 2, '踐踏\n地落—每當一個地在你的操控下進戰場時，此生物的力量加倍直到回合結束。', {
  supertypes: ['Legendary'],
  keywords: ['trample'],
  abilities: [trig('landfall', [{ e: 'pump', what: 'self', p: { power: 'self' }, t: 0 }])],
});
cr(S, 'R', 'Jumbo Cactuar', '{5}{G}{G}', 'Plant', 1, 7, '一萬根針—每當此生物攻擊時，它得+9999/+0直到回合結束。', {
  abilities: [trig('attacks', [{ e: 'pump', what: 'self', p: 9999, t: 0 }])],
});
cr(S, 'U', 'Coliseum Behemoth', '{5}{G}{G}', 'Beast', 7, 7, '踐踏\n當此生物進戰場時，抓一張牌。', { keywords: ['trample'], abilities: [etb([{ e: 'draw', n: 1 }])] });
cr(S, 'U', "Sazh's Chocobo", '{G}', 'Bird', 0, 1, '地落—每當一個地在你的操控下進戰場時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('landfall', [{ e: 'counters', what: 'self', n: 1 }])],
});
arti(S, 'U', 'Ride the Shoopuf', '{1}{G}', '地落—每當一個地在你的操控下進戰場時，在目標由你操控的生物上放置一個+1/+1指示物。', {
  types: ['Enchantment'],
  abilities: [trig('landfall', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] })],
});
inst(S, 'C', 'Airship Crash', '{2}{G}', '消滅目標神器、結界或具飛行異能的生物。', {
  targets: [{ kind: 'permanent', filter: { or: [{ type: ['Artifact', 'Enchantment'] }, { type: 'Creature', kw: 'flying' }] } }],
  effects: [destroyT0],
});
cr(S, 'C', 'Balamb T-Rexaur', '{4}{G}{G}', 'Dinosaur', 6, 6, '踐踏\n當此生物進戰場時，你獲得3點生命。', { keywords: ['trample'], abilities: [etb([{ e: 'gain', n: 3 }])] });
inst(S, 'C', 'Blitzball Shot', '{1}{G}', '目標生物得+3/+3並獲得踐踏異能直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 3, kw: ['trample'] }] });
cr(S, 'C', 'Gigantoad', '{3}{G}', 'Frog', 4, 4, '只要你操控七個或更多地，此生物得+2/+2。', {
  abilities: [{ kind: 'static', self: { cond: { c: 'controls', filter: { type: 'Land' }, n: 7 }, grant: { p: 2, t: 2 } } }],
});
cr(S, 'C', 'Goobbue Gardener', '{1}{G}', 'Plant Beast', 1, 3, '{T}：加{G}。', { produces: ['G'] });
cr(S, 'C', 'Gran Pulse Ochu', '{G}', 'Plant Beast', 1, 1, '死觸', { keywords: ['deathtouch'] });
cr(S, 'C', 'Loporrit Scout', '{2}{G}', 'Rabbit Scout', 3, 2, '每當另一個生物在你的操控下進戰場時，此生物得+1/+1直到回合結束。', {
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 1, t: 1 }])],
});
inst(S, 'C', "Prishe's Wanderings", '{2}{G}', '從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。在目標由你操控的生物上放置一個+1/+1指示物。', {
  targets: [{ ...MY_CR, optional: true }],
  effects: [{ e: 'searchLand', to: 'battlefield', tapped: true }, { e: 'counters', what: 'T0', n: 1 }],
});

// ---------------- 多色／無色 ----------------
cr(S, 'M', 'Absolute Virtue', '{6}{W}{U}', 'Avatar Warrior', 8, 8, '此咒語不能被反擊。\n飛行', { supertypes: ['Legendary'], keywords: ['flying'] });
cr(S, 'U', 'Black Waltz No. 3', '{2}{B}{R}', 'Wizard', 2, 2, '飛行，死觸\n每當你施放非生物咒語時，此生物對每位對手各造成2點傷害。', {
  supertypes: ['Legendary'],
  keywords: ['flying', 'deathtouch'],
  abilities: [trig('castNoncreature', [{ e: 'damage', n: 2, to: 'opp' }])],
});
cr(S, 'U', 'Giott, King of the Dwarves', '{R}{W}', 'Dwarf Noble', 1, 1, '連擊\n每當此生物或另一個矮人在你的操控下進戰場，以及每當武具在你的操控下進戰場時，你可以棄一張牌。若你如此作，抓一張牌。', {
  supertypes: ['Legendary'],
  keywords: ['double_strike'],
  abilities: [
    etb([{ e: 'costThen', prompt: '棄一張牌來抓一張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }]),
    trig('allyPermEtb', [{ e: 'costThen', prompt: '棄一張牌來抓一張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }], {
      filter: { sub: ['Dwarf', 'Equipment'] },
    }),
  ],
});
cr(S, 'U', 'Judge Magister Gabranth', '{W}{B}', 'Human Advisor Knight', 2, 2, '威懾\n每當另一個由你操控的生物或神器死去時，在此生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  keywords: ['menace'],
  abilities: [trig('allyDies', [{ e: 'counters', what: 'self', n: 1 }], { filter: { type: ['Creature', 'Artifact'] } })],
});
cr(S, 'U', 'Locke Cole', '{1}{U}{B}', 'Human Rogue', 2, 3, '死觸，繫命\n每當此生物對玩家造成戰鬥傷害時，抓一張牌，然後棄一張牌。', {
  supertypes: ['Legendary'],
  keywords: ['deathtouch', 'lifelink'],
  abilities: [trig('combatDamagePlayer', [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }])],
});
cr(S, 'U', 'Tidus, Blitzball Star', '{1}{W}{U}', 'Human Warrior', 2, 1, '每當一個神器在你的操控下進戰場時，在此生物上放置一個+1/+1指示物。\n每當此生物攻擊時，橫置目標由對手操控的生物。', {
  supertypes: ['Legendary'],
  abilities: [
    trig('allyPermEtb', [{ e: 'counters', what: 'self', n: 1 }], { filter: { type: 'Artifact' } }),
    trig('attacks', [{ e: 'tap', what: 'T0' }], { targets: [{ ...OPP_CR, optional: true }] }),
  ],
});
arti(S, 'R', 'Genji Glove', '{5}', '佩帶此武具的生物具有連擊異能。\n裝備{3}', { subtypes: ['Equipment'], equip: { cost: '{3}', grant: { kw: ['double_strike'] } } });
cr(S, 'C', 'Iron Giant', '{7}', 'Demon', 6, 6, '延勢，警戒，踐踏', { types: ['Artifact', 'Creature'], keywords: ['reach', 'vigilance', 'trample'] });
