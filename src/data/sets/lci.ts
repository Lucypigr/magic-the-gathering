// The Lost Caverns of Ixalan（LCI，2023 年 11 月）
import { CR, MY_CR, OPP, OPP_CR, act, arti, cr, destroyT0, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'LCI';
const DINO = { sub: 'Dinosaur' };

land(S, 'C', 'Promising Vein', ['C'], '{T}：加{C}。\n{1}，{T}，犧牲此地：從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。', {
  subtypes: ['Cave'],
  abilities: [act({ mana: '{1}', tap: true, sacSelf: true }, [{ e: 'searchLand', to: 'battlefield', tapped: true }], '搜尋基本地')],
});

// ---------------- 白 ----------------
cr(S, 'R', 'Sanguine Evangelist', '{2}{W}', 'Vampire Cleric', 2, 1, '當此生物進戰場或死去時，派出一個1/1黑色，具飛行異能的蝙蝠衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-bat' }]), trig('dies', [{ e: 'token', token: 'tok-bat' }])],
});
sorc(S, 'U', 'Helping Hand', '{W}', '將目標法術力值為3或更少的生物牌從你的墳墓場移回戰場。', {
  targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature', mvMax: 3 }, prompt: '選擇墳墓場中的生物牌' }],
  effects: [{ e: 'reanimate', what: 'T0' }],
});
cr(S, 'U', 'Malamet War Scribe', '{3}{W}{W}', 'Cat Warrior', 4, 3, '當此生物進戰場時，由你操控的生物得+2/+1直到回合結束。', {
  abilities: [etb([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 2, t: 1 }])],
});
ench(S, 'U', 'Might of the Ancestors', '{2}{W}', '在你回合的戰鬥開始時，目標由你操控的生物得+2/+0並獲得警戒異能直到回合結束。', {
  abilities: [trig('combatStart', [{ e: 'pump', what: 'T0', p: 2, t: 0, kw: ['vigilance'] }], { targets: [MY_CR] })],
});
cr(S, 'U', 'Mischievous Pup', '{2}{W}', 'Dog', 3, 1, '閃現\n當此生物進戰場時，將至多一個另外的目標由你操控的永久物移回其擁有者手上。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'you', nonType: 'Land' }, notSelf: true, optional: true }] })],
});
cr(S, 'U', 'Vanguard of the Rose', '{1}{W}', 'Vampire Knight', 3, 1, '{1}，犧牲另一個生物或神器：此生物獲得不滅異能直到回合結束。橫置它。', {
  abilities: [
    act({ mana: '{1}', sacOther: { type: ['Creature', 'Artifact'] } }, [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['indestructible'] }, { e: 'tap', what: 'self' }], '犧牲：獲得不滅'),
  ],
});
inst(S, 'C', 'Acrobatic Leap', '{W}', '目標生物得+1/+3並獲得飛行異能直到回合結束。重置該生物。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 3, kw: ['flying'] }, { e: 'untap', what: 'T0' }],
});
inst(S, 'C', 'Cosmium Blast', '{1}{W}', '對目標進行攻擊或阻擋的生物造成4點傷害。', {
  targets: [{ kind: 'creature', filter: { inCombat: true } }],
  effects: [{ e: 'damage', n: 4, to: 'T0' }],
});
cr(S, 'C', 'Envoy of Okinec Ahau', '{2}{W}', 'Cat Advisor', 3, 3, '{4}{W}：派出一個1/1無色侏儒神器衍生生物。', {
  abilities: [act({ mana: '{4}{W}' }, [{ e: 'token', token: 'tok-gnome' }], '派出侏儒')],
});
inst(S, 'C', 'Family Reunion', '{1}{W}', '選擇一項：\n• 由你操控的生物得+1/+1直到回合結束。\n• 由你操控的生物獲得辟邪異能直到回合結束。', {
  modes: [
    { text: '全體+1/+1', effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }] },
    { text: '全體辟邪', effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 0, t: 0, kw: ['hexproof'] }] },
  ],
});
cr(S, 'C', 'Glorifier of Suffering', '{2}{W}', 'Vampire Soldier', 3, 2, '當此生物進戰場時，你可以犧牲另一個生物或神器。若你如此作，在至多兩個目標生物上各放置一個+1/+1指示物。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '犧牲一個生物或神器來放置指示物？', cost: { sac: { type: ['Creature', 'Artifact'], other: true } }, then: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }] }], {
      targets: [
        { ...MY_CR, optional: true },
        { ...MY_CR, optional: true },
      ],
    }),
  ],
});
cr(S, 'C', 'Ironpaw Aspirant', '{1}{W}', 'Cat Warrior', 1, 2, '當此生物進戰場時，在目標生物上放置一個+1/+1指示物。', {
  abilities: [etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Oltec Cloud Guard', '{3}{W}', 'Human Soldier', 3, 2, '飛行\n當此生物進戰場時，派出一個1/1無色侏儒神器衍生生物。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'token', token: 'tok-gnome' }])],
});
ench(S, 'C', 'Petrify', '{1}{W}', '結附於神器或生物\n所結附的永久物不能攻擊或阻擋。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { cantAttack: true, cantBlock: true } },
});
inst(S, 'C', 'Quicksand Whirlpool', '{5}{W}', '若此咒語以已橫置的生物為目標，則減少{3}來施放。\n放逐目標生物。', {
  modes: [
    { text: '放逐生物', targets: [CR], effects: [{ e: 'exile', what: 'T0' }] },
    { text: '放逐已橫置的生物（{2}{W}）', cost: '{2}{W}', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [{ e: 'exile', what: 'T0' }] },
  ],
});
cr(S, 'C', 'Soaring Sandwing', '{4}{W}{W}', 'Dinosaur', 3, 5, '飛行\n當此生物進戰場時，你獲得3點生命。', { keywords: ['flying'], abilities: [etb([{ e: 'gain', n: 3 }])] });
cr(S, 'C', 'Thousand Moons Infantry', '{2}{W}', 'Human Soldier', 2, 4, '');
arti(S, 'C', "Tinker's Tote", '{2}{W}', '當此神器進戰場時，派出兩個1/1無色侏儒神器衍生生物。\n{W}，犧牲此神器：你獲得3點生命。', {
  abilities: [etb([{ e: 'token', token: 'tok-gnome', n: 2 }]), act({ mana: '{W}', sacSelf: true }, [{ e: 'gain', n: 3 }], '犧牲：獲得3點生命')],
});

// ---------------- 藍 ----------------
sorc(S, 'U', 'Chart a Course', '{1}{U}', '抓兩張牌。然後除非你本回合攻擊過，否則棄一張牌。', {
  effects: [{ e: 'draw', n: 2 }, { e: 'if', cond: { c: 'attacked' }, then: [], else: [{ e: 'discard', n: 1, who: 'you' }] }],
});
inst(S, 'U', 'Confounding Riddle', '{2}{U}', '選擇一項：\n• 檢視你牌庫頂的四張牌。將其中一張置於你手上，其餘置入你的墳墓場。\n• 反擊目標咒語，除非其操控者支付{4}。', {
  modes: [
    { text: '檢視四張牌', effects: [{ e: 'dig', n: 4, take: 1, rest: 'graveyard' }] },
    { text: '反擊除非支付{4}', targets: [{ kind: 'spell' }], effects: [{ e: 'counterUnless', what: 'T0', pay: 4 }] },
  ],
});
cr(S, 'U', 'Hermitic Nautilus', '{1}{U}', 'Nautilus', 1, 4, '警戒\n{1}{U}：此生物得+3/-3直到回合結束。', {
  types: ['Artifact', 'Creature'],
  keywords: ['vigilance'],
  abilities: [act({ mana: '{1}{U}' }, [{ e: 'pump', what: 'self', p: 3, t: -3 }], '+3/-3')],
});
sorc(S, 'C', 'Ancestral Reminiscence', '{3}{U}', '抓三張牌，然後棄一張牌。', { effects: [{ e: 'draw', n: 3 }, { e: 'discard', n: 1, who: 'you' }] });
cr(S, 'C', 'Cogwork Wrestler', '{U}', 'Gnome', 1, 2, '閃現\n當此生物進戰場時，目標由對手操控的生物得-2/-0直到回合結束。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flash'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: -2, t: 0 }], { targets: [{ ...OPP_CR, optional: true }] })],
});
inst(S, 'C', 'Out of Air', '{2}{U}{U}', '若此咒語以生物咒語為目標，則減少{2}來施放。\n反擊目標咒語。', {
  modes: [
    { text: '反擊咒語', targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] },
    { text: '反擊生物咒語（{U}{U}）', cost: '{U}{U}', targets: [{ kind: 'spell', filter: { type: 'Creature' } }], effects: [{ e: 'counter', what: 'T0' }] },
  ],
});
cr(S, 'C', 'Sage of Days', '{2}{U}', 'Human Wizard', 3, 2, '當此生物進戰場時，刺探3。', { abilities: [etb([{ e: 'surveil', n: 3 }])] });
inst(S, 'C', 'Unlucky Drop', '{3}{U}', '將目標神器或生物置於其擁有者的牌庫底。', {
  targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'] } }],
  effects: [{ e: 'tuck', what: 'T0' }],
});

// ---------------- 黑 ----------------
cr(S, 'M', 'Bloodletter of Aclazotz', '{1}{B}{B}{B}', 'Vampire Demon', 2, 4, '飛行', { keywords: ['flying'] });
cr(S, 'U', 'Abyssal Gorestalker', '{4}{B}{B}', 'Horror', 6, 6, '當此生物進戰場時，每位玩家各犧牲兩個生物。', {
  abilities: [etb([{ e: 'edict', who: 'players' }, { e: 'edict', who: 'players' }])],
});
cr(S, 'U', 'Deep-Cavern Bat', '{1}{B}', 'Bat', 1, 1, '飛行，繫命\n當此生物進戰場時，檢視目標對手的手牌。你從中選擇一張非地牌，該玩家棄掉那張牌。', {
  keywords: ['flying', 'lifelink'],
  abilities: [etb([{ e: 'discardChosen', who: 'T0', filter: { nonType: 'Land' } }], { targets: [OPP] })],
});
sorc(S, 'U', 'Malicious Eclipse', '{1}{B}{B}', '所有生物得-2/-2直到回合結束。', { effects: [{ e: 'pump', what: { all: { type: 'Creature' } }, p: -2, t: -2 }] });
cr(S, 'U', 'Synapse Necromage', '{2}{B}', 'Fungus Wizard', 3, 1, '當此生物死去時，派出兩個1/1黑色，具有「此衍生物不能阻擋」的真菌衍生生物。', {
  abilities: [trig('dies', [{ e: 'token', token: 'tok-fungus', n: 2 }])],
});
arti(S, 'U', 'Bloodthorn Flail', '{B}', '佩帶此武具的生物得+2/+1。\n裝備{3}', { subtypes: ['Equipment'], equip: { cost: '{3}', grant: { p: 2, t: 1 } } });
cr(S, 'C', 'Acolyte of Aclazotz', '{2}{B}', 'Vampire Cleric', 1, 4, '{T}，犧牲另一個生物或神器：每位對手失去1點生命，且你獲得1點生命。', {
  abilities: [act({ tap: true, sacOther: { type: ['Creature', 'Artifact'] } }, [{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }], '犧牲：吸取1點生命')],
});
ench(S, 'C', 'Dead Weight', '{B}', '結附於生物\n所結附的生物得-2/-2。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { p: -2, t: -2 } },
});
arti(S, 'C', 'Mephitic Draught', '{1}{B}', '當此神器進戰場時，你抓一張牌並失去1點生命。', { abilities: [etb([{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }])] });
sorc(S, 'C', 'Ray of Ruin', '{4}{B}', '放逐目標生物。占卜1。', { targets: [CR], effects: [{ e: 'exile', what: 'T0' }, { e: 'scry', n: 1 }] });
cr(S, 'C', 'Skullcap Snail', '{1}{B}', 'Fungus Snail', 1, 1, '當此生物進戰場時，目標對手棄一張牌。', { abilities: [etb([{ e: 'discard', n: 1, who: 'T0' }], { targets: [OPP] })] });
cr(S, 'C', "Vito's Inquisitor", '{3}{B}', 'Vampire Knight', 3, 3, '{B}，犧牲另一個生物或神器：在此生物上放置一個+1/+1指示物。它獲得威懾異能直到回合結束。', {
  abilities: [
    act({ mana: '{B}', sacOther: { type: ['Creature', 'Artifact'] } }, [{ e: 'counters', what: 'self', n: 1 }, { e: 'pump', what: 'self', p: 0, t: 0, kw: ['menace'] }], '犧牲：+1/+1指示物'),
  ],
});

// ---------------- 紅 ----------------
cr(S, 'U', 'Belligerent Yearling', '{1}{R}', 'Dinosaur', 3, 2, '踐踏', { keywords: ['trample'] });
inst(S, 'U', "Dreadmaw's Ire", '{R}', '目標進行攻擊的生物得+2/+2並獲得踐踏異能直到回合結束。', {
  targets: [{ kind: 'creature', filter: { attacking: true } }],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['trample'] }],
});
cr(S, 'U', 'Rampaging Ceratops', '{4}{R}', 'Dinosaur', 5, 4, '威懾', { keywords: ['menace'] });
inst(S, 'C', 'Abrade', '{1}{R}', '選擇一項：\n• 對目標生物造成3點傷害。\n• 消滅目標神器。', {
  modes: [
    { text: '3點傷害', targets: [CR], effects: [{ e: 'damage', n: 3, to: 'T0' }] },
    { text: '消滅神器', targets: [{ kind: 'permanent', filter: { type: 'Artifact' } }], effects: [destroyT0] },
  ],
});
cr(S, 'C', 'Brazen Blademaster', '{2}{R}', 'Orc Pirate', 2, 3, '每當此生物攻擊時，若你操控兩個或更多神器，它得+2/+1直到回合結束。', {
  abilities: [trig('attacks', [{ e: 'pump', what: 'self', p: 2, t: 1 }], { cond: { c: 'controls', filter: { type: 'Artifact' }, n: 2 } })],
});
cr(S, 'C', 'Burning Sun Cavalry', '{1}{R}', 'Human Knight', 2, 2, '每當此生物攻擊或阻擋時，若你操控恐龍，它得+1/+1直到回合結束。', {
  abilities: [
    trig('attacks', [{ e: 'pump', what: 'self', p: 1, t: 1 }], { cond: { c: 'controls', filter: DINO } }),
    trig('blocks', [{ e: 'pump', what: 'self', p: 1, t: 1 }], { cond: { c: 'controls', filter: DINO } }),
  ],
});
cr(S, 'C', 'Dinotomaton', '{3}{R}', 'Dinosaur Gnome', 4, 3, '威懾\n當此生物進戰場時，目標由你操控的生物獲得威懾異能直到回合結束。', {
  types: ['Artifact', 'Creature'],
  keywords: ['menace'],
  abilities: [etb([{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['menace'] }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Goblin Tomb Raider', '{R}', 'Goblin Pirate', 1, 2, '只要你操控神器，此生物得+1/+0且具有敏捷異能。', {
  abilities: [{ kind: 'static', self: { cond: { c: 'controls', filter: { type: 'Artifact' } }, grant: { p: 1, kw: ['haste'] } } }],
});
cr(S, 'C', 'Hotfoot Gnome', '{2}{R}', 'Gnome', 3, 1, '敏捷\n{T}：另一個目標生物獲得敏捷異能直到回合結束。', {
  types: ['Artifact', 'Creature'],
  keywords: ['haste'],
  abilities: [act({ tap: true }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['haste'] }], '給予敏捷', { targets: [{ ...MY_CR, notSelf: true }] })],
});
cr(S, 'C', 'Panicked Altisaur', '{4}{R}', 'Dinosaur', 4, 5, '延勢\n{T}：此生物對每位對手各造成2點傷害。', {
  keywords: ['reach'],
  abilities: [act({ tap: true }, [{ e: 'damage', n: 2, to: 'opp' }], '對手2點傷害')],
});
sorc(S, 'C', 'Rumbling Rockslide', '{3}{R}', '對目標生物造成傷害，其數量等同於由你操控的地數量。', {
  targets: [CR],
  effects: [{ e: 'damage', n: { count: { type: 'Land', ctrl: 'you' } }, to: 'T0' }],
});
cr(S, 'C', 'Seismic Monstrosaur', '{4}{R}{R}', 'Dinosaur', 6, 5, '踐踏\n{2}{R}，犧牲一個地：抓一張牌。', {
  keywords: ['trample'],
  abilities: [act({ mana: '{2}{R}', sacOther: { type: 'Land' } }, [{ e: 'draw', n: 1 }], '犧牲地：抓一張牌')],
});
sorc(S, 'C', 'Tectonic Hazard', '{R}', '對每位對手與其操控的每個生物各造成1點傷害。', {
  effects: [{ e: 'damage', n: 1, to: 'opp' }, { e: 'damage', n: 1, to: { all: { type: 'Creature', ctrl: 'opp' } } }],
});

// ---------------- 綠 ----------------
cr(S, 'M', 'Ghalta, Stampede Tyrant', '{5}{G}{G}{G}', 'Elder Dinosaur', 12, 12, '踐踏', { supertypes: ['Legendary'], keywords: ['trample'] });
cr(S, 'R', 'Hulking Raptor', '{2}{G}{G}', 'Dinosaur', 5, 3, '守護{2}', { ward: 2 });
cr(S, 'R', 'Pugnacious Hammerskull', '{2}{G}', 'Dinosaur', 6, 6, '每當此生物攻擊時，若你沒有操控其他恐龍，在其上放置一個暈眩指示物。', {
  abilities: [
    trig('attacks', [{ e: 'if', cond: { c: 'controls', filter: { ...DINO, other: true } }, then: [], else: [{ e: 'stun', what: 'self' }] }]),
  ],
});
cr(S, 'U', 'Colossadactyl', '{2}{G}{G}', 'Dinosaur', 4, 5, '延勢，踐踏', { keywords: ['reach', 'trample'] });
cr(S, 'U', 'Earthshaker Dreadmaw', '{4}{G}{G}', 'Dinosaur', 6, 6, '踐踏\n當此生物進戰場時，由你操控的其他恐龍每有一個，便抓一張牌。', {
  keywords: ['trample'],
  abilities: [etb([{ e: 'draw', n: { count: { type: 'Creature', ctrl: 'you', other: true, ...DINO } } }])],
});
sorc(S, 'U', 'Glimpse the Core', '{1}{G}', '從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。', { effects: [{ e: 'searchLand', to: 'battlefield', tapped: true }] });
sorc(S, 'U', 'Malamet Battle Glyph', '{G}', '目標由你操控的生物與目標不由你操控的生物互鬥。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'fight', a: 'T0', b: 'T1' }],
});
cr(S, 'U', 'Thrashing Brontodon', '{1}{G}{G}', 'Dinosaur', 3, 4, '{1}，犧牲此生物：消滅目標神器或結界。', {
  abilities: [act({ mana: '{1}', sacSelf: true }, [destroyT0], '犧牲：消滅神器或結界', { targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] } }] })],
});
cr(S, 'C', 'Armored Kincaller', '{2}{G}', 'Dinosaur', 3, 3, '當此生物進戰場時，若你操控另一個恐龍，你獲得3點生命。', {
  abilities: [etb([{ e: 'gain', n: 3 }], { cond: { c: 'controls', filter: { ...DINO, other: true } } })],
});
inst(S, 'C', "Huatli's Final Strike", '{2}{G}', '目標由你操控的生物得+1/+0直到回合結束。它對目標由對手操控的生物造成傷害，其數量等同於其力量。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 0 }, { e: 'bite', a: 'T0', b: 'T1' }],
});
inst(S, 'C', 'In the Presence of Ages', '{2}{G}', '檢視你牌庫頂的四張牌。你可以將其中一張生物或地牌置於你手上。其餘置入你的墳墓場。', {
  effects: [{ e: 'dig', n: 4, take: 1, rest: 'graveyard', filter: { type: ['Creature', 'Land'] } }],
});
cr(S, 'C', 'Malamet Brawler', '{1}{G}', 'Cat Warrior', 2, 2, '每當此生物攻擊時，目標進行攻擊的生物獲得踐踏異能直到回合結束。', {
  abilities: [trig('attacks', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample'] }], { targets: [{ kind: 'creature', filter: { ctrl: 'you', attacking: true } }] })],
});
arti(S, 'C', 'Malamet Scythe', '{2}{G}', '閃現\n當此武具進戰場時，將它裝備到目標由你操控的生物上。\n佩帶此武具的生物得+2/+2。\n裝備{4}', {
  subtypes: ['Equipment'],
  keywords: ['flash'],
  equip: { cost: '{4}', grant: { p: 2, t: 2 } },
  abilities: [etb([{ e: 'attach', what: 'T0' }], { targets: [MY_CR] })],
});
cr(S, 'C', 'Poison Dart Frog', '{1}{G}', 'Frog', 1, 1, '延勢\n{T}：加一點任意顏色的法術力。\n{2}：此生物獲得死觸異能直到回合結束。', {
  keywords: ['reach'],
  produces: ['W', 'U', 'B', 'R', 'G'],
  abilities: [act({ mana: '{2}' }, [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['deathtouch'] }], '獲得死觸')],
});
inst(S, 'C', 'Staggering Size', '{1}{G}', '目標生物得+3/+3並獲得踐踏異能直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 3, kw: ['trample'] }] });

// ---------------- 多色／無色 ----------------
cr(S, 'R', 'Abuelo, Ancestral Echo', '{1}{W}{U}', 'Spirit', 2, 2, '飛行，守護{2}', { supertypes: ['Legendary'], keywords: ['flying'], ward: 2 });
arti(S, 'R', "Tarrian's Soulcleaver", '{1}', '佩帶此武具的生物具有警戒異能。\n每當另一個神器或生物從戰場進入墳墓場時，在佩帶此武具的生物上放置一個+1/+1指示物。\n裝備{2}', {
  supertypes: ['Legendary'],
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { kw: ['vigilance'] } },
  abilities: [trig('otherDies', [{ e: 'counters', what: 'attached', n: 1 }])],
});
cr(S, 'U', 'Bartolomé del Presidio', '{W}{B}', 'Vampire Knight', 2, 1, '犧牲另一個生物或神器：在此生物上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  abilities: [act({ sacOther: { type: ['Creature', 'Artifact'] } }, [{ e: 'counters', what: 'self', n: 1 }], '犧牲：+1/+1指示物')],
});
cr(S, 'U', 'Captain Storm, Cosmium Raider', '{U}{R}', 'Human Pirate', 2, 2, '每當一個神器在你的操控下進戰場時，在目標由你操控的海盜上放置一個+1/+1指示物。', {
  supertypes: ['Legendary'],
  abilities: [trig('allyPermEtb', [{ e: 'counters', what: 'T0', n: 1 }], { filter: { type: 'Artifact' }, targets: [{ kind: 'creature', filter: { ctrl: 'you', sub: 'Pirate' } }] })],
});
cr(S, 'U', 'Itzquinth, Firstborn of Gishath', '{R}{G}', 'Dinosaur', 2, 3, '敏捷\n當此生物進戰場時，你可以支付{2}。若你如此作，目標由你操控的恐龍對另一個目標生物造成傷害，其數量等同於其力量。', {
  supertypes: ['Legendary'],
  keywords: ['haste'],
  abilities: [
    etb([{ e: 'costThen', prompt: '支付{2}讓恐龍咬擊？', cost: { mana: '{2}' }, then: [{ e: 'bite', a: 'T0', b: 'T1' }] }], {
      targets: [{ kind: 'creature', filter: { ctrl: 'you', ...DINO } }, { ...OPP_CR, optional: true }],
    }),
  ],
});
cr(S, 'U', 'Scampering Surveyor', '{4}', 'Gnome', 3, 2, '當此生物進戰場時，從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([{ e: 'searchLand', to: 'battlefield', tapped: true }])],
});
arti(S, 'C', "Hunter's Blowgun", '{1}', '佩帶此武具的生物得+1/+1且具有死觸異能。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { p: 1, t: 1, kw: ['deathtouch'] } },
});
arti(S, 'C', 'Runaway Boulder', '{6}', '閃現\n當此神器進戰場時，它對目標由對手操控的生物造成6點傷害。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'damage', n: 6, to: 'T0' }], { targets: [OPP_CR] })],
});
