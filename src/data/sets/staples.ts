// ============================================================
// 職業牌組常用卡：MTGTop8／MTGGoldfish 標準賽牌組中出現最多、但自動產生器無法處理的卡
// 每張卡標在原本的系列；規則敘述是本遊戲實際執行的效果，簡化的地方以括號註明。
// ============================================================
import type { Effect, Filter, Mana } from '../../engine/types';
import { ANY, CR, MY_CR, MY_GY_CR, OPP, OPP_CR, OPP_NONLAND, act, add, arti, cr, dmg, ench, etb, inst, land, sorc, trig } from '../dsl';

const ALL5: Mana[] = ['W', 'U', 'B', 'R', 'G'];
const INST_SORC: Filter = { type: ['Instant', 'Sorcery'] };
const PAIN_TEXT = '{T}：加{C}。\n{T}，支付1點生命：加一點任意顏色的法術力。';

// ---------------- 地 ----------------
land('FIN', 'R', 'Starting Town', ['C', ...ALL5], `除非這是你的第一、第二或第三個回合，否則此地橫置進戰場。\n${PAIN_TEXT}`, {
  subtypes: ['Town'],
  painMana: true,
  etbTappedUnless: { c: 'myTurnLte', n: 3 },
});
land('SOS', 'R', 'Great Hall of the Biblioplex', ['C', ...ALL5], `${PAIN_TEXT}\n（簡化：有色法術力沒有咒語類別限制，也沒有變成生物的異能）`, { painMana: true });
land('LCI', 'M', 'Cavern of Souls', ['C', ...ALL5], `${PAIN_TEXT}\n（簡化：改為支付1點生命產生任意顏色，沒有生物類別限制與「不能被反擊」）`, { painMana: true });
land('MSH', 'R', 'Castle Doom', ['C', ...ALL5], `${PAIN_TEXT}\n{3}，{T}，犧牲一個神器：派出一個3/3無色，名為末日機器人的機器人反派神器衍生生物。只能於法術時機起動。\n（簡化：有色法術力沒有神器咒語的限制）`, {
  painMana: true,
  abilities: [act({ mana: '{3}', tap: true, sacOther: { type: 'Artifact' } }, [{ e: 'token', token: 'tok-doombot' }], '派出末日機器人', { sorcery: true })],
});
land('TDM', 'R', 'Maelstrom of the Spirit Dragon', ['C', ...ALL5], `${PAIN_TEXT}\n{4}，{T}，犧牲此地：從你的牌庫中搜尋一張龍牌，展示並置於你手上。\n（簡化：有色法術力沒有龍與預兆咒語的限制）`, {
  painMana: true,
  abilities: [act({ mana: '{4}', tap: true, sacSelf: true }, [{ e: 'tutor', filter: { sub: 'Dragon' } }], '搜尋龍牌')],
});
land('SPM', 'R', 'Multiversal Passage', ALL5, '此地進戰場時，若你的生命多於10點，你支付2點生命；否則它橫置進戰場。\n{T}：加一點任意顏色的法術力。\n（簡化：不必選定基本地類別）', {
  shock: true,
});
land('SOS', 'R', 'Petrified Hamlet', ['C'], '{T}：加{C}。\n（簡化：沒有指定地名、封鎖異能的效果）');
land('FDN', 'U', 'Demolition Field', ['C'], '{T}：加{C}。\n{2}，{T}，犧牲此地：消滅目標由對手操控的非基本地。該地的操控者可以從其牌庫中搜尋一張基本地牌放進戰場。你也可以從你的牌庫中搜尋一張基本地牌放進戰場。', {
  abilities: [
    act(
      { mana: '{2}', tap: true, sacSelf: true },
      [
        { e: 'destroy', what: 'T0' },
        { e: 'searchLand', to: 'battlefield', who: 'T0ctrl', may: true },
        { e: 'searchLand', to: 'battlefield', may: true },
      ],
      '消滅非基本地',
      { targets: [{ kind: 'permanent', filter: { type: 'Land', basic: false, ctrl: 'opp' }, prompt: '選擇對手的非基本地' }] },
    ),
  ],
});
land('LCI', 'R', 'Restless Anchorage', ['W', 'U'], '此地橫置進戰場。\n{T}：加{W}或{U}。\n{1}{W}{U}：直到回合結束，此地成為2/3白藍色，具有飛行異能的鳥生物，且仍是地。\n（簡化：攻擊時不會派出地圖衍生物）', {
  etbTapped: true,
  abilities: [act({ mana: '{1}{W}{U}' }, [{ e: 'animate', what: 'self', p: 2, t: 3, kw: ['flying'], subtypes: ['Bird'], colors: ['W', 'U'] }], '變成 2/3 飛行鳥')],
});

// ---------------- 白 ----------------
cr('FDN', 'C', 'Hinterland Sanctifier', '{W}', 'Rabbit Cleric', 1, 2, '每當另一個生物在你的操控下進戰場時，你獲得1點生命。', {
  abilities: [trig('allyEtb', [{ e: 'gain', n: 1 }])],
});
cr('FRA', 'R', 'Liliana the Faultless', '{W}', 'Human Cleric', 1, 1, '每當另一個生物在你的操控下進戰場時，你獲得1點生命。\n（簡化：沒有棄牌給予辟邪的異能）', {
  supertypes: ['Legendary'],
  abilities: [trig('allyEtb', [{ e: 'gain', n: 1 }])],
});
cr('EOE', 'R', 'Haliya, Guided by Light', '{2}{W}', 'Human Soldier', 3, 3, '每當海莉亞或另一個生物或神器在你的操控下進戰場時，你獲得1點生命。\n在你的結束步驟開始時，若你本回合獲得了3點或更多生命，抓一張牌。\n（簡化：沒有曲速）', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'gain', n: 1 }]),
    trig('allyPermEtb', [{ e: 'gain', n: 1 }], { filter: { type: ['Creature', 'Artifact'] } }),
    trig('endStep', [{ e: 'draw', n: 1 }], { cond: { c: 'gainedLifeGte', n: 3 } }),
  ],
});
cr('FRA', 'M', 'Enlightened Confidant', '{1}{W}', 'Kor Cleric', 2, 1, '繫命\n在你的結束步驟開始時，若你本回合獲得過生命，刺探1。\n（簡化：不會把刺探的牌放回手上）', {
  keywords: ['lifelink'],
  abilities: [trig('endStep', [{ e: 'surveil', n: 1 }], { cond: { c: 'gainedLifeGte', n: 1 } })],
});
cr('TDM', 'R', 'Sage of the Skies', '{2}{W}', 'Human Monk', 2, 3, '飛行，繫命\n（簡化：施放時不會複製）', { keywords: ['flying', 'lifelink'] });
cr('EOE', 'U', 'Starfield Shepherd', '{3}{W}{W}', 'Angel', 3, 2, '飛行\n當此生物進戰場時，從你的牌庫中搜尋一張基本平原牌或法術力值1或更少的生物牌，展示並置於你手上。\n（簡化：沒有曲速）', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'tutor', filter: { or: [{ type: 'Land', sub: 'Plains', basic: true }, { type: 'Creature', mvMax: 1 }] } }])],
});
inst('LCI', 'R', 'Get Lost', '{1}{W}', '消滅目標生物、結界或鵬洛客。其操控者派出兩個地圖衍生物。（地圖：{1}，{T}，犧牲：目標由你操控的生物探險。只能於法術時機起動。）', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Enchantment', 'Planeswalker'] }, prompt: '選擇生物、結界或鵬洛客' }],
  effects: [{ e: 'token', token: 'tok-map', n: 2, who: 'T0ctrl' }, { e: 'destroy', what: 'T0' }],
});
sorc('TDM', 'R', 'United Battlefront', '{3}{W}', '檢視你牌庫頂的七張牌。將其中至多兩張法術力值3或更少的非生物非地永久物牌放進戰場。其餘的置於你的牌庫底。', {
  effects: [{ e: 'dig', n: 7, take: 2, filter: { nonType: ['Creature', 'Land', 'Instant', 'Sorcery'], mvMax: 3 }, rest: 'bottom', to: 'battlefield' }],
});
sorc('SOS', 'R', 'Practiced Offense', '{2}{W}', '選擇一項：\n• 在每個由你操控的生物上各放置一個+1/+1指示物。目標生物獲得連擊異能直到回合結束。\n• 在每個由你操控的生物上各放置一個+1/+1指示物。目標生物獲得繫命異能直到回合結束。\n返照{1}{W}\n（簡化：指示物只放在你的生物上）', {
  modes: [
    { text: '指示物＋連擊', targets: [CR], effects: [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['double_strike'] }] },
    { text: '指示物＋繫命', targets: [CR], effects: [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['lifelink'] }] },
  ],
}, { flashback: '{1}{W}' });
arti('DFT', 'R', 'Perilous Snare', '{2}{W}', '當此神器進戰場時，放逐目標由對手操控的非地永久物，直到此神器離開戰場。\n（簡化：沒有速度機制）', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [OPP_NONLAND] })],
});
arti('EOE', 'R', 'Pinnacle Starcage', '{1}{W}{W}', '當此神器進戰場時，放逐所有法術力值2或更少的神器與生物，直到此神器離開戰場。\n（簡化：沒有 {6}{W}{W} 的異能）', {
  abilities: [etb([{ e: 'exileLinked', what: { all: { type: ['Artifact', 'Creature'], mvMax: 2 } } }])],
});
arti('MSH', 'M', 'The Mind Stone', '{1}{W}', '不滅\n{T}：加{W}。\n（簡化：沒有駕馭與 ∞ 異能）', {
  supertypes: ['Legendary'],
  subtypes: ['Infinity Stone'],
  keywords: ['indestructible'],
  produces: ['W'],
});

// ---------------- 藍 ----------------
inst('ECL', 'U', 'Spell Snare', '{U}', '反擊目標法術力值為2的咒語。', {
  targets: [{ kind: 'spell', filter: { mvMin: 2, mvMax: 2 }, prompt: '選擇法術力值為2的咒語' }],
  effects: [{ e: 'counter', what: 'T0' }],
});
inst('FRA', 'U', 'Countersculpt', '{1}{U}{U}', '若你操控傑斯，此咒語減少{1}來施放。\n反擊目標咒語。強化傑斯1。（在你的傑斯衍生物上放置忠誠指示物；沒有的話先派出一個具有「−1：刺探1」「−3：抓一張牌」的藍色傑斯鵬洛客衍生物）\n（簡化：注視傑斯只看戰場上的傑斯）', {
  targets: [{ kind: 'spell' }],
  effects: [{ e: 'counter', what: 'T0' }, { e: 'empowerJace', n: 1 }],
}, { costReduce: { cond: { c: 'controls', filter: { sub: 'Jace' } }, mana: '{1}' } });
inst('FRA', 'R', "Jace's Machinations", '{2}{U}', '強化傑斯8。（在你的傑斯衍生物上放置忠誠指示物；沒有的話先派出一個具有「−1：刺探1」「−3：抓一張牌」的藍色傑斯鵬洛客衍生物）\n（簡化：沒有在瞬間時機起動忠誠異能的效果）', {
  effects: [{ e: 'empowerJace', n: 8 }],
});
cr('FRA', 'M', 'Avatar of Burgeoning Echoes', '{G}{U}', 'Avatar', 2, 3, '地落～每當一個地在你的操控下進戰場時，強化傑斯2。（在你的傑斯衍生物上放置忠誠指示物；沒有的話先派出一個具有「−1：刺探1」「−3：抓一張牌」的藍色傑斯鵬洛客衍生物）\n（簡化：沒有給予鵬洛客 −10 異能）', {
  abilities: [trig('landfall', [{ e: 'empowerJace', n: 2 }])],
});
ench('FRA', 'U', 'Way of the Pyromancer', '{1}{R}', '當此結界進戰場時，強化傑斯2。（在你的傑斯衍生物上放置忠誠指示物；沒有的話先派出一個具有「−1：刺探1」「−3：抓一張牌」的藍色傑斯鵬洛客衍生物）\n（簡化：沒有給予鵬洛客加{R}的異能）', {
  supertypes: ['Legendary'],
  abilities: [etb([{ e: 'empowerJace', n: 2 }])],
});
land('FRA', 'R', "Theorist's Sanctum", ['U'], '（{T}：加{U}。）\n除非你操控傑斯，否則此地橫置進戰場。\n{2}{U}，{T}：強化傑斯2。\n（簡化：注視傑斯只看戰場上的傑斯）', {
  subtypes: ['Island'],
  etbTappedUnless: { c: 'controls', filter: { sub: 'Jace' } },
  abilities: [act({ mana: '{2}{U}', tap: true }, [{ e: 'empowerJace', n: 2 }], '強化傑斯2')],
});
inst('OTJ', 'R', 'Three Steps Ahead', '{U}', '選擇一項：\n• {1}{U}{U}：反擊目標咒語。\n• {2}{U}：抓兩張牌，然後棄一張牌。\n• {3}{U}{U}：反擊目標咒語，抓兩張牌，然後棄一張牌。\n（簡化：沒有複製永久物的選項）', {
  modes: [
    { text: '反擊咒語', cost: '{1}{U}{U}', targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] },
    { text: '抓二棄一', cost: '{2}{U}', effects: [{ e: 'draw', n: 2 }, { e: 'discard', n: 1, who: 'you' }] },
    { text: '反擊＋抓二棄一', cost: '{3}{U}{U}', targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }, { e: 'draw', n: 2 }, { e: 'discard', n: 1, who: 'you' }] },
  ],
});
const LANDS_YOU = { count: { type: 'Land', ctrl: 'you' } } as const;
inst('EOE', 'R', 'Consult the Star Charts', '{1}{U}', '增幅{1}{U}\n檢視你牌庫頂的X張牌，X為你操控的地數量。將其中一張置於你手上；若此咒語已增幅，則改為兩張。其餘的置於你的牌庫底。', {
  modes: [
    { text: '取一張', effects: [{ e: 'dig', n: LANDS_YOU, take: 1, rest: 'bottom' }] },
    { text: '增幅：取兩張', cost: '{2}{U}{U}', effects: [{ e: 'dig', n: LANDS_YOU, take: 2, rest: 'bottom' }] },
  ],
});
const dig3 = (take: number): Effect => ({ e: 'dig', n: 3, take, rest: 'bottom' });
sorc('SOS', 'U', 'Flow State', '{1}{U}', '檢視你牌庫頂的三張牌。將其中一張置於你手上，其餘的置於你的牌庫底。若你的墳墓場中有瞬間牌和法術牌，則改為將其中兩張置於你手上。', {
  effects: [
    {
      e: 'if',
      cond: { c: 'gyCount', filter: { type: 'Instant' }, n: 1 },
      then: [{ e: 'if', cond: { c: 'gyCount', filter: { type: 'Sorcery' }, n: 1 }, then: [dig3(2)], else: [dig3(1)] }],
      else: [dig3(1)],
    },
  ],
});
sorc('TDM', 'R', 'Winternight Stories', '{2}{U}', '抓三張牌，然後棄兩張牌。\n（簡化：沒有「棄一張生物牌代替」與協奏）', {
  effects: [{ e: 'draw', n: 3 }, { e: 'discard', n: 2, who: 'you' }],
});
cr('FRA', 'M', 'Seasoned Cryomancer', '{1}{U}{U}', 'Human Wizard', 2, 2, '當此生物進戰場時，抓兩張牌，然後棄兩張牌。然後你可以橫置目標由對手操控的生物，並在其上放置一個暈眩指示物。\n（簡化：橫置不再取決於棄掉的牌，沒有墳墓場的異能）', {
  abilities: [
    etb([{ e: 'draw', n: 2 }, { e: 'discard', n: 2, who: 'you' }, { e: 'stun', what: 'T0' }], {
      targets: [{ kind: 'creature', filter: { ctrl: 'opp' }, optional: true, prompt: '選擇要暈眩的對手生物（可以不選）' }],
    }),
  ],
});
cr('FRA', 'U', 'Geist of Saint Thalia', '{1}{U}', 'Spirit Cleric', 1, 2, '飛行\n你施放的非生物咒語減少{1}來施放。', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [{ kind: 'static', spellCostLess: { filter: { nonType: 'Creature' }, n: 1 } }],
});
arti('EOE', 'C', 'Cryogen Relic', '{1}{U}', '當此神器進戰場時，抓一張牌。\n{1}{U}，犧牲此神器：在至多一個目標已橫置的生物上放置一個暈眩指示物。抓一張牌。\n（簡化：離場抓牌只在犧牲時發生）', {
  abilities: [
    etb([{ e: 'draw', n: 1 }]),
    act({ mana: '{1}{U}', sacSelf: true }, [{ e: 'stun', what: 'T0' }, { e: 'draw', n: 1 }], '暈眩並抓牌', {
      targets: [{ kind: 'creature', filter: { tapped: true }, optional: true, prompt: '選擇已橫置的生物（可以不選）' }],
    }),
  ],
});
arti('OTJ', 'M', 'Simulacrum Synthesizer', '{2}{U}', '當此神器進戰場時，占卜2。\n每當另一個法術力值3或更多的神器在你的操控下進戰場時，派出一個0/0無色構裝體神器衍生生物，它具有「你每操控一個神器，此衍生物便得+1/+1。」', {
  abilities: [
    etb([{ e: 'scry', n: 2 }]),
    trig('allyPermEtb', [{ e: 'token', token: 'tok-construct-x' }], { filter: { type: 'Artifact', mvMin: 3 } }),
  ],
});

// ---------------- 黑 ----------------
sorc('MKM', 'R', 'Deadly Cover-Up', '{3}{B}{B}', '消滅所有生物。\n（簡化：沒有蒐證的額外效果）', {
  effects: [{ e: 'destroy', what: { all: { type: 'Creature' } } }],
});
sorc('TDM', 'U', 'Strategic Betrayal', '{1}{B}', '目標對手犧牲一個生物。\n（簡化：原本是放逐該生物與其墳墓場）', {
  targets: [OPP],
  effects: [{ e: 'edict', who: 'T0' }],
});
inst('EOE', 'R', "Archenemy's Charm", '{B}{B}{B}', '選擇一項：\n• 放逐目標生物。\n• 將目標生物牌從你的墳墓場移回你手上。\n• 在目標由你操控的生物上放置兩個+1/+1指示物，它獲得繫命異能直到回合結束。', {
  modes: [
    { text: '放逐生物', targets: [CR], effects: [{ e: 'exile', what: 'T0' }] },
    { text: '生物牌回手', targets: [MY_GY_CR], effects: [{ e: 'toHand', what: 'T0' }] },
    { text: '兩個指示物＋繫命', targets: [MY_CR], effects: [{ e: 'counters', what: 'T0', n: 2 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['lifelink'] }] },
  ],
});
cr('SOS', 'R', "Moseo, Vein's New Dean", '{2}{B}', 'Bird Skeleton Warlock', 2, 1, '飛行\n當莫西歐進戰場時，派出一個1/1黑綠色害獸衍生生物，它具有「每當此衍生物攻擊時，你獲得1點生命。」\n灌注～在你的結束步驟開始時，若你本回合獲得過生命，將至多一張目標法術力值3或更少的生物牌從你的墳墓場移回戰場。\n（簡化：法術力值上限固定為3）', {
  supertypes: ['Legendary'],
  keywords: ['flying'],
  abilities: [
    etb([{ e: 'token', token: 'tok-pest' }]),
    trig('endStep', [{ e: 'reanimate', what: 'T0' }], {
      cond: { c: 'gainedLifeGte', n: 1 },
      targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature', mvMax: 3 }, optional: true, prompt: '選擇法術力值3或更少的生物牌' }],
    }),
  ],
});
cr('FRA', 'R', 'Dark Matter Manipulator', '{B}', 'Human Warlock', 1, 2, '當此生物進戰場時，碾磨三張牌。\n你的墳墓場中每有七張牌，此生物便得+2/+0（最多計算到十四張）。', {
  abilities: [
    etb([{ e: 'mill', n: 3 }]),
    { kind: 'static', self: { cond: { c: 'gyCount', filter: {}, n: 7 }, grant: { p: 2 } } },
    { kind: 'static', self: { cond: { c: 'gyCount', filter: {}, n: 14 }, grant: { p: 2 } } },
  ],
});
cr('BLB', 'U', 'Starscape Cleric', '{1}{B}', 'Bat Cleric', 2, 1, '飛行\n此生物不能阻擋。\n每當你獲得生命時，每位對手各失去1點生命。\n（簡化：沒有子嗣）', {
  keywords: ['flying'],
  abilities: [{ kind: 'static', self: { grant: { cantBlock: true } } }, trig('lifegain', [{ e: 'lose', n: 1, who: 'opp' }])],
});
cr('BLB', 'R', 'Iridescent Vinelasher', '{B}', 'Lizard Assassin', 1, 2, '地落～每當一個地在你的操控下進戰場時，此生物對目標對手造成1點傷害。\n（簡化：沒有子嗣）', {
  abilities: [trig('landfall', [dmg(1, 'opp')])],
});
cr('HOB', 'R', 'The Sackville-Bagginses', '{1}{B}', 'Halfling Citizen', 2, 2, '當薩克維爾－巴金斯一家進戰場時，你可以犧牲另一個生物或神器。若你如此作，抓一張牌並派出一個珍寶衍生物。\n每當你犧牲一個衍生物時，每位對手各失去1點生命。', {
  supertypes: ['Legendary'],
  abilities: [
    etb([
      {
        e: 'costThen',
        prompt: '你可以犧牲另一個生物或神器來抓一張牌並派出珍寶',
        cost: { sac: { type: ['Creature', 'Artifact'], other: true } },
        then: [{ e: 'draw', n: 1 }, { e: 'token', token: 'tok-treasure' }],
      },
    ]),
    trig('sacrifice', [{ e: 'lose', n: 1, who: 'opp' }], { filter: { token: true, ctrl: 'you' } }),
  ],
});
ench('TLA', 'R', 'Obsessive Pursuit', '{1}{B}', '當此結界進戰場時以及在你的維持開始時，你失去1點生命並派出一個線索衍生物。\n（簡化：沒有攻擊時放置指示物的異能）', {
  abilities: [
    etb([{ e: 'lose', n: 1, who: 'you' }, { e: 'token', token: 'tok-clue' }]),
    trig('upkeep', [{ e: 'lose', n: 1, who: 'you' }, { e: 'token', token: 'tok-clue' }]),
  ],
});
cr('OTJ', 'M', 'Harvester of Misery', '{3}{B}{B}', 'Spirit', 5, 4, '威懾\n當此生物進戰場時，其他生物得-2/-2直到回合結束。\n（簡化：沒有從手上棄掉的異能）', {
  keywords: ['menace'],
  abilities: [etb([{ e: 'pump', what: { all: { type: 'Creature', other: true } }, p: -2, t: -2 }])],
});
arti('FRA', 'R', "Lich's Relic", '{B}', '當此武具進戰場時，你可以支付{2}。若你如此作，消滅至多一個目標由對手操控的生物。\n佩帶此武具的生物得+2/+1。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { p: 2, t: 1 } },
  abilities: [
    etb([{ e: 'costThen', prompt: '支付{2}消滅對手的生物？', cost: { mana: '{2}' }, then: [{ e: 'destroy', what: 'T0' }] }], {
      targets: [{ ...OPP_CR, optional: true }],
    }),
  ],
});

// ---------------- 紅 ----------------
sorc('SOS', 'U', 'Impractical Joke', '{R}', '對至多一個目標生物造成3點傷害。\n（簡化：沒有「傷害不能被防止」）', {
  targets: [{ ...CR, optional: true }],
  effects: [dmg(3)],
});
inst('TLA', 'C', 'Firebending Lesson', '{R}', '增幅{4}\n對目標生物造成2點傷害。若此咒語已增幅，則改為造成5點傷害。', {
  modes: [
    { text: '造成2點傷害', targets: [CR], effects: [dmg(2)] },
    { text: '增幅：造成5點傷害', cost: '{4}{R}', targets: [CR], effects: [dmg(5)] },
  ],
}, { subtypes: ['Lesson'] });
inst('WOE', 'C', 'Torch the Tower', '{R}', '對目標生物造成2點傷害。\n（簡化：沒有交易）', { targets: [CR], effects: [dmg(2)] });
inst('TLA', 'U', 'Combustion Technique', '{1}{R}', '對目標生物造成2點傷害，再造成等同於你墳墓場中課程牌數量的傷害。\n（簡化：死去時不會被放逐）', {
  targets: [CR],
  effects: [dmg(2), { e: 'damage', n: { gy: { sub: 'Lesson' } }, to: 'T0' }],
}, { subtypes: ['Lesson'] });
arti('SOS', 'U', 'Tablet of Discovery', '{2}{R}', '當此神器進戰場時，放逐你牌庫頂的牌，本回合你可以使用它。\n{T}：加{R}。\n（簡化：原本是碾磨後從墳墓場使用；沒有{R}{R}的異能）', {
  produces: ['R'],
  abilities: [etb([{ e: 'impulse', n: 1 }])],
});
arti('FIN', 'R', 'The Fire Crystal', '{2}{R}{R}', '你施放的紅色咒語減少{1}來施放。\n由你操控的生物具有敏捷異能。\n（簡化：沒有複製生物的異能）', {
  supertypes: ['Legendary'],
  abilities: [
    { kind: 'static', spellCostLess: { filter: { color: 'R' }, n: 1 } },
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you' }, grant: { kw: ['haste'] } } },
  ],
});
cr('WOE', 'U', 'Hearth Elemental', '{5}{R}', 'Elemental', 4, 5, '你的墳墓場中每有一張瞬間或法術牌，此咒語便減少{1}來施放。\n冒險—《Stoke Genius》{1}{R}（法術）：棄掉你的手牌，然後抓兩張牌。\n（你可以改為施放這個冒險法術。結算後此牌會被放逐，之後你可以從放逐區施放本體。）', {
  costReduce: { perGy: INST_SORC },
  adventure: { name: 'Stoke Genius', cost: '{1}{R}', types: ['Sorcery'], text: '棄掉你的手牌，然後抓兩張牌。', spell: { effects: [{ e: 'discard', n: { hand: true }, who: 'you' }, { e: 'draw', n: 2 }] } },
  imageName: 'Hearth Elemental // Stoke Genius',
});
cr('EOE', 'R', 'Nova Hellkite', '{3}{R}{R}', 'Dragon', 4, 5, '飛行，敏捷\n當此生物進戰場時，它對目標由對手操控的生物造成1點傷害。\n（簡化：沒有曲速）', {
  keywords: ['flying', 'haste'],
  abilities: [etb([dmg(1)], { targets: [OPP_CR] })],
});
cr('TDM', 'R', 'Magmatic Hellkite', '{2}{R}{R}', 'Dragon', 4, 5, '飛行\n當此生物進戰場時，消滅目標由對手操控的非基本地。其操控者從其牌庫中搜尋一張基本地牌，將它橫置放進戰場。\n（簡化：該地上不會放置暈眩指示物）', {
  keywords: ['flying'],
  abilities: [
    etb([{ e: 'destroy', what: 'T0' }, { e: 'searchLand', to: 'battlefield', tapped: true, who: 'T0ctrl', may: true }], {
      targets: [{ kind: 'permanent', filter: { type: 'Land', basic: false, ctrl: 'opp' }, prompt: '選擇對手的非基本地' }],
    }),
  ],
});
cr('HOB', 'M', 'Smaug the Magnificent', '{2}{R}{R}', 'Dragon', 4, 3, '飛行，敏捷\n每當史矛革攻擊時，他對任意一個目標造成等同於你操控的珍寶數量的傷害。\n在你的維持開始時，派出一個珍寶衍生物。', {
  supertypes: ['Legendary'],
  keywords: ['flying', 'haste'],
  abilities: [
    trig('attacks', [{ e: 'damage', n: { count: { sub: 'Treasure', ctrl: 'you' } }, to: 'T0' }], { targets: [ANY] }),
    trig('upkeep', [{ e: 'token', token: 'tok-treasure' }]),
  ],
});
cr('FDN', 'C', 'Ghitu Lavarunner', '{R}', 'Human Wizard', 1, 2, '只要你的墳墓場中有兩張或更多瞬間和／或法術牌，此生物便得+1/+0且具有敏捷異能。', {
  abilities: [{ kind: 'static', self: { cond: { c: 'gyCount', filter: INST_SORC, n: 2 }, grant: { p: 1, kw: ['haste'] } } }],
});

// ---------------- 綠 ----------------
cr('EOE', 'R', 'Icetill Explorer', '{2}{G}{G}', 'Insect Scout', 2, 4, '你每回合可以多使用一張地。\n地落～每當一個地在你的操控下進戰場時，碾磨一張牌。\n（簡化：不能從墳墓場使用地）', {
  abilities: [{ kind: 'static', extraLand: 1 }, trig('landfall', [{ e: 'mill', n: 1 }])],
});
cr('EOE', 'R', 'Mightform Harmonizer', '{2}{G}{G}', 'Insect Druid', 4, 4, '地落～每當一個地在你的操控下進戰場時，使目標由你操控的生物的力量加倍直到回合結束。\n（簡化：沒有曲速）', {
  abilities: [trig('landfall', [{ e: 'pump', what: 'T0', p: { power: 'T0' }, t: 0 }], { targets: [MY_CR] })],
});
cr('FRA', 'R', 'Simulacrum Shaper', '{1}{G}{G}', 'Elf Druid', 2, 2, '當此生物進戰場時，你可以從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。\n當此生物死去時，抓一張牌。', {
  abilities: [etb([{ e: 'searchLand', to: 'battlefield', tapped: true, may: true }]), trig('dies', [{ e: 'draw', n: 1 }])],
});
ench('ECL', 'R', 'Sapling Nursery', '{6}{G}{G}', '你每操控一個樹林，此咒語便減少{1}來施放。\n地落～每當一個地在你的操控下進戰場時，派出一個3/4綠色，具有延勢異能的樹妖衍生生物。\n（簡化：沒有放逐此結界給予不滅的異能）', {
  costReduce: { perCount: { sub: 'Forest', ctrl: 'you' } },
  abilities: [trig('landfall', [{ e: 'token', token: 'tok-treefolk-reach' }])],
});
add({
  set: 'EOE',
  rarity: 'U',
  name: "Meltstrider's Resolve",
  cost: '{G}',
  types: ['Enchantment'],
  subtypes: ['Aura'],
  aura: { target: MY_CR, grant: { t: 2 } },
  abilities: [etb([{ e: 'fight', a: 'attached', b: 'T0' }], { targets: [{ ...OPP_CR, optional: true }] })],
  text: '結附於由你操控的生物\n當此靈氣進戰場時，所結附的生物與至多一個目標由對手操控的生物互鬥。\n所結附的生物得+0/+2。\n（簡化：沒有「不能被超過一個生物阻擋」）',
});

// ---------------- 多色 ----------------
cr('ECL', 'M', 'Deceit', '{4}{U/B}{U/B}', 'Elemental Incarnation', 5, 5, '當此生物進戰場時，將至多一個另外的目標非地永久物移回其擁有者手上。然後目標對手展示其手牌，你從中選擇一張非地牌，該玩家棄掉那張牌。\n（簡化：不論支付哪種顏色，兩個效果都會發生；沒有呼喚）', {
  abilities: [
    etb([{ e: 'bounce', what: 'T0' }, { e: 'discardChosen', who: 'opp', filter: { nonType: 'Land' } }], {
      targets: [{ kind: 'permanent', filter: { nonType: 'Land' }, optional: true, notSelf: true, prompt: '選擇要移回手上的非地永久物（可以不選）' }],
    }),
  ],
});
ench('BLB', 'R', 'Lunar Convocation', '{W}{B}', '在你的結束步驟開始時，若你本回合獲得過生命，每位對手各失去1點生命。\n在你的結束步驟開始時，若你本回合獲得過生命且失去過生命，派出一個1/1黑色，具有飛行異能的蝙蝠衍生生物。\n{1}{B}，支付2點生命：抓一張牌。', {
  abilities: [
    trig('endStep', [{ e: 'lose', n: 1, who: 'opp' }], { cond: { c: 'gainedLifeGte', n: 1 } }),
    trig('endStep', [{ e: 'if', cond: { c: 'lostLifeGte', n: 1 }, then: [{ e: 'token', token: 'tok-bat' }] }], { cond: { c: 'gainedLifeGte', n: 1 } }),
    act({ mana: '{1}{B}', life: 2 }, [{ e: 'draw', n: 1 }], '支付2點生命：抓一張牌'),
  ],
});
inst('FRA', 'U', 'Fatehold Charm', '{W}{U}', '選擇一項：\n• 抓一張牌。強化傑斯2。\n• 將目標生物移回其擁有者手上。\n• 由你操控的生物得+1/+2直到回合結束。\n（簡化：不能以咒語為目標）', {
  modes: [
    { text: '抓一張牌，強化傑斯2', effects: [{ e: 'draw', n: 1 }, { e: 'empowerJace', n: 2 }] },
    { text: '生物回手', targets: [CR], effects: [{ e: 'bounce', what: 'T0' }] },
    { text: '你的生物+1/+2', effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 2 }] },
  ],
});
inst('FRA', 'U', 'Stingerquill Charm', '{B}{R}', '選擇一項：\n• 對任意一個目標造成3點傷害。\n• 目標生物獲得先攻與死觸異能直到回合結束。\n• 派出一個2/2無色，名為學員的巫師士兵衍生生物。它獲得敏捷異能直到回合結束。', {
  modes: [
    { text: '造成3點傷害', targets: [ANY], effects: [dmg(3)] },
    { text: '先攻＋死觸', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['first_strike', 'deathtouch'] }] },
    { text: '派出學員', effects: [{ e: 'token', token: 'tok-cadet' }, { e: 'pump', what: 'created', p: 0, t: 0, kw: ['haste'] }] },
  ],
});
sorc('FRA', 'R', 'Maelstrom Pulse', '{1}{B}{G}', '消滅目標非地永久物，以及所有與它同名的其他永久物。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'destroy', what: 'T0', sameName: true }],
});
inst('TLA', 'C', 'Abandon Attachments', '{1}{U/R}', '你可以棄一張牌。若你如此作，抓兩張牌。', {
  effects: [{ e: 'costThen', prompt: '你可以棄一張牌來抓兩張牌', cost: { discard: 1 }, then: [{ e: 'draw', n: 2 }] }],
}, { subtypes: ['Lesson'] });
inst('TLA', 'U', 'Accumulate Wisdom', '{1}{U}', '檢視你牌庫頂的三張牌。將其中一張置於你手上，其餘的置於你的牌庫底。若你的墳墓場中有三張或更多課程牌，則改為將它們全部置於你手上。', {
  effects: [{ e: 'if', cond: { c: 'gyCount', filter: { sub: 'Lesson' }, n: 3 }, then: [dig3(3)], else: [dig3(1)] }],
}, { subtypes: ['Lesson'] });

// ---------------- 神器 ----------------
arti('ECL', 'C', 'Firdoch Core', '{3}', '{T}：加一點任意顏色的法術力。\n{4}：此神器成為4/4神器生物直到回合結束。\n（簡化：沒有變形者）', {
  produces: ALL5,
  abilities: [act({ mana: '{4}' }, [{ e: 'animate', what: 'self', p: 4, t: 4 }], '變成 4/4 生物')],
});

// ---------------- 探險、動員與其他常用卡 ----------------
const EXPLORE_NOTE = '（探險：展示你牌庫頂的牌；是地就放到手上，否則在此生物上放一個+1/+1指示物，並可以把那張牌置入墳墓場。）';
const MOBILIZE = (n: number) => trig('attacks', [{ e: 'token', token: 'tok-warrior-r11', n, tapped: true, attacking: true, temp: true }]);
const MOBILIZE_TEXT = (n: number) => `動員${n}（每當此生物攻擊時，派出${n === 1 ? '一' : '兩'}個橫置且進行攻擊的1/1紅色戰士衍生生物。在下一個結束步驟開始時犧牲它們。）`;
cr('LCI', 'R', 'Amalia Benavides Aguirre', '{W}{B}', 'Vampire Scout', 2, 2, `每當你獲得生命時，阿瑪莉亞探險。${EXPLORE_NOTE}\n（簡化：沒有守護，也沒有力量為20時消滅其他生物的效果）`, {
  supertypes: ['Legendary'],
  abilities: [trig('lifegain', [{ e: 'explore', what: 'self' }])],
});
cr('TDM', 'R', 'Voice of Victory', '{1}{W}', 'Human Bard', 1, 3, `${MOBILIZE_TEXT(2)}\n（簡化：沒有「對手不能在你的回合施放咒語」）`, { abilities: [MOBILIZE(2)] });
cr('TDM', 'R', 'Stadium Headliner', '{R}', 'Goblin Warrior', 1, 1, `${MOBILIZE_TEXT(1)}\n{1}{R}，犧牲此生物：它對目標生物造成等同於你操控的生物數量的傷害。`, {
  abilities: [
    MOBILIZE(1),
    act({ mana: '{1}{R}', sacSelf: true }, [{ e: 'damage', n: { count: { type: 'Creature', ctrl: 'you' } }, to: 'T0' }], '依生物數造成傷害', { targets: [CR] }),
  ],
});
inst('BLB', 'C', 'Cache Grab', '{1}{G}', '檢視你牌庫頂的四張牌。你可以將其中一張永久物牌置於你手上，其餘的置入你的墳墓場。\n（簡化：沒有松鼠的食物效果）', {
  effects: [{ e: 'dig', n: 4, take: 1, filter: { nonType: ['Instant', 'Sorcery'] }, rest: 'graveyard' }],
});
cr('FRA', 'R', 'Vraska, the Cutting Glare', '{B}{B}{G}', 'Gorgon Assassin', 4, 4, '死觸\n當薇拉絲卡進戰場時，若你操控六個或更多地，消滅目標由對手操控的永久物。其操控者派出一個珍寶衍生物。', {
  supertypes: ['Legendary'],
  keywords: ['deathtouch'],
  abilities: [
    etb([{ e: 'token', token: 'tok-treasure', who: 'T0ctrl' }, { e: 'destroy', what: 'T0' }], {
      cond: { c: 'controls', filter: { type: 'Land' }, n: 6 },
      targets: [{ kind: 'permanent', filter: { ctrl: 'opp' }, prompt: '選擇對手的永久物' }],
    }),
  ],
});
ench('LCI', 'R', 'Corpses of the Lost', '{2}{B}', '由你操控的骷髏得+1/+0且具有敏捷異能。\n當此結界進戰場時，派出一個2/2黑色骷髏海盜衍生生物。\n（簡化：不能付生命移回手上）', {
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', sub: 'Skeleton' }, grant: { p: 1, kw: ['haste'] } } },
    etb([{ e: 'token', token: 'tok-skeleton-pirate' }]),
  ],
});
cr('OTJ', 'U', 'Forsaken Miner', '{B}', 'Skeleton Rogue', 2, 2, '此生物不能阻擋。\n（簡化：沒有犯罪時從墳墓場返回的異能）', {
  abilities: [{ kind: 'static', self: { grant: { cantBlock: true } } }],
});
sorc('SPM', 'U', "Heroes' Hangout", '{R}', '選擇一項：\n• 約會之夜～放逐你牌庫頂的牌。本回合你可以使用它。\n• 巡邏之夜～至多兩個目標生物各得+1/+0並獲得先攻異能直到回合結束。\n（簡化：約會之夜只放逐一張，且只到本回合）', {
  modes: [
    { text: '放逐牌庫頂，本回合可用', effects: [{ e: 'impulse', n: 1 }] },
    {
      text: '兩個生物 +1/+0 先攻',
      targets: [CR, { ...CR, optional: true }],
      effects: [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['first_strike'] }, { e: 'pump', what: 'T1', p: 1, t: 0, kw: ['first_strike'] }],
    },
  ],
});
cr('WOE', 'R', 'Likeness Looter', '{U}{B}', 'Faerie Shapeshifter', 1, 1, '飛行\n{T}：抓一張牌，然後棄一張牌。\n（簡化：沒有變成墳墓場生物複製品的異能）', {
  keywords: ['flying'],
  abilities: [act({ tap: true }, [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }], '抓一棄一')],
});
cr('EOE', 'R', 'Biotech Specialist', '{R}{G}', 'Insect Scientist', 1, 3, '當此生物進戰場時，派出一個登陸器衍生物。（{2}，{T}，犧牲：搜尋一張基本地，橫置放進戰場。）\n每當你犧牲一個神器時，此生物對每位對手各造成2點傷害。', {
  abilities: [etb([{ e: 'token', token: 'tok-lander' }]), trig('sacrifice', [dmg(2, 'opp')], { filter: { type: 'Artifact', ctrl: 'you' } })],
});
sorc('TDM', 'C', 'Wild Ride', '{R}', '目標生物得+3/+0並獲得敏捷異能直到回合結束。\n（簡化：沒有協奏）', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 3, t: 0, kw: ['haste'] }],
});
ench('MKM', 'R', 'Case of the Uneaten Feast', '{W}', '每當一個生物在你的操控下進戰場時，你獲得1點生命。\n（簡化：沒有破案與破案後的效果）', {
  subtypes: ['Case'],
  abilities: [trig('allyEtb', [{ e: 'gain', n: 1 }])],
});
cr('TDM', 'R', 'Sarkhan, Dragon Ascendant', '{1}{R}', 'Human Druid', 2, 2, '當薩卡進戰場時，若你操控龍，派出一個珍寶衍生物。\n每當一個龍在你的操控下進戰場時，在薩卡上放置一個+1/+1指示物，他獲得飛行異能直到回合結束。\n（簡化：注視龍只看戰場上的龍）', {
  supertypes: ['Legendary'],
  abilities: [
    etb([{ e: 'token', token: 'tok-treasure' }], { cond: { c: 'controls', filter: { sub: 'Dragon' } } }),
    trig('allyEtb', [{ e: 'counters', what: 'self', n: 1 }, { e: 'pump', what: 'self', p: 0, t: 0, kw: ['flying'] }], { filter: { sub: 'Dragon' } }),
  ],
});
ench('FDN', 'R', 'Authority of the Consuls', '{W}', '每當一個由對手操控的生物進戰場時，橫置它，你獲得1點生命。\n（簡化：「橫置進戰場」改為進場後橫置）', {
  abilities: [trig('anyEtb', [{ e: 'tap', what: 'trig' }, { e: 'gain', n: 1 }], { filter: { ctrl: 'opp' } })],
});
sorc('SOS', 'U', 'Daydream', '{W}', '放逐目標由你操控的生物，然後將它在擁有者的操控下放回戰場，並在其上放置一個+1/+1指示物。\n返照{2}{W}', {
  targets: [MY_CR],
  effects: [{ e: 'flicker', what: 'T0', counters: 1 }],
}, { flashback: '{2}{W}' });

// ---------------- X 咒語 ----------------
const X: { x: true } = { x: true };
sorc('TLA', 'R', 'Day of Black Sun', '{X}{B}{B}', '消滅每個法術力值等於或小於X的生物。\n（簡化：沒有「失去所有異能」）', {
  effects: [{ e: 'destroy', what: { all: { type: 'Creature' } }, mvMaxX: true }],
});
sorc('WOE', 'R', 'Song of Totentanz', '{X}{R}', '派出X個1/1黑色，具有「此衍生物不能阻擋。」的老鼠衍生生物。由你操控的生物獲得敏捷異能直到回合結束。', {
  effects: [{ e: 'token', token: 'tok-rat', n: X }, { e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 0, t: 0, kw: ['haste'] }],
});
cr('FRA', 'R', 'Guiding Hydra', '{X}{W}', 'Hydra Horror', 1, 0, '此生物進戰場時帶有X個+1/+1指示物。\n（簡化：沒有戰鬥開始時移動指示物的異能）', { etbCountersX: true });
cr('WOE', 'R', 'Elusive Otter', '{U}', 'Otter', 1, 1, '勇行\n冒險—《Grove\'s Bounty》{X}{G}（法術）：在目標由你操控的生物上放置X個+1/+1指示物。\n（你可以改為施放這個冒險法術。結算後此牌會被放逐，之後你可以從放逐區施放本體。）\n（簡化：沒有閃避阻擋的異能；指示物只放在一個生物上）', {
  keywords: ['prowess'],
  adventure: { name: "Grove's Bounty", cost: '{X}{G}', types: ['Sorcery'], text: '在目標由你操控的生物上放置X個+1/+1指示物。', spell: { targets: [MY_CR], effects: [{ e: 'counters', what: 'T0', n: X }] } },
  imageName: "Elusive Otter // Grove's Bounty",
});
