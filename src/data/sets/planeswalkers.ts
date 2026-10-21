// ============================================================
// 鵬洛客：各標準系列的鵬洛客
// 忠誠異能每回合只能起動一次，只能於法術時機；+N 放置、−N 移除忠誠指示物。
// 終極異能中「獲得徽記」的部分本遊戲沒有實作，會在卡面註明。
// ============================================================
import type { Ability, ActivatedAbility, Effect, SetCode } from '../../engine/types';
import { CR, MY_CR, MY_GY_CR, OPP, OPP_CR, add, dmg, trig } from '../dsl';

/** 忠誠異能 */
function L(n: number, label: string, effects: Effect[], x: Partial<ActivatedAbility> = {}): Ability {
  const sign = n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0';
  return { kind: 'activated', cost: { loyalty: n }, effects, label: `${sign}：${label}`, ...x };
}

function pw(set: SetCode, rarity: 'R' | 'M', name: string, cost: string, sub: string, loyalty: number, text: string, abilities: Ability[]) {
  add({ set, rarity, name, cost, types: ['Planeswalker'], supertypes: ['Legendary'], subtypes: [sub], loyalty, abilities, text });
}

const NO_ULT = '（簡化：沒有終極異能的徽記）';

// ---------------- 實相裂隙（FRA） ----------------

// ---------------- 其他系列 ----------------
pw('SOS', 'M', 'Ral Zarek, Guest Lecturer', '{1}{B}{B}', 'Ral', 3, `+1：刺探2。\n−1：目標對手棄一張牌。\n−2：將目標法術力值3或更少的生物牌從你的墳墓場移回戰場。\n${NO_ULT.replace('徽記', '擲硬幣')}`, [
  L(1, '刺探2', [{ e: 'surveil', n: 2 }]),
  L(-1, '對手棄一張牌', [{ e: 'discard', n: 1, who: 'T0' }], { targets: [OPP] }),
  L(-2, '生物牌回戰場', [{ e: 'reanimate', what: 'T0' }], { targets: [{ ...MY_GY_CR, filter: { ctrl: 'you', type: 'Creature', mvMax: 3 } }] }),
]);
pw('SOS', 'M', 'Professor Dellian Fel', '{2}{B}{G}', 'Dellian', 5, `+2：你獲得3點生命。\n0：你抓一張牌並失去1點生命。\n−3：消滅目標生物。\n${NO_ULT}`, [
  L(2, '獲得3點生命', [{ e: 'gain', n: 3 }]),
  L(0, '抓一張牌，失去1點生命', [{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }]),
  L(-3, '消滅生物', [{ e: 'destroy', what: 'T0' }], { targets: [CR] }),
]);
pw('TDM', 'M', 'Elspeth, Storm Slayer', '{3}{W}{W}', 'Elspeth', 5, '+1：派出兩個1/1白色士兵衍生生物。\n0：在每個由你操控的生物上各放置一個+1/+1指示物，它們獲得飛行異能直到回合結束。\n−3：消滅目標由對手操控，法術力值3或更多的生物。\n（簡化：沒有衍生物加倍的效果，+1 直接派出兩個；飛行只到回合結束）', [
  L(1, '派出兩個士兵', [{ e: 'token', token: 'tok-soldier', n: 2 }]),
  L(0, '全軍指示物與飛行', [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you' } }, n: 1 }, { e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 0, t: 0, kw: ['flying'] }]),
  L(-3, '消滅大生物', [{ e: 'destroy', what: 'T0' }], { targets: [{ kind: 'creature', filter: { ctrl: 'opp', mvMin: 3 }, prompt: '選擇對手法術力值3或更多的生物' }] }),
]);
pw('BLB', 'M', 'Ral, Crackling Wit', '{2}{U}{R}', 'Ral', 4, `每當你施放非生物咒語時，在拉爾上放置一個忠誠指示物。\n+1：派出一個1/1藍紅色，具有勇行異能的水獺衍生生物。\n−3：抓三張牌，然後棄兩張牌。\n${NO_ULT}`, [
  trig('castNoncreature', [{ e: 'loyalty', what: 'self', n: 1 }]),
  L(1, '派出水獺', [{ e: 'token', token: 'tok-otter-prowess' }]),
  L(-3, '抓三棄二', [{ e: 'draw', n: 3 }, { e: 'discard', n: 2, who: 'you' }]),
]);
pw('ECL', 'M', 'Ajani, Outland Chaperone', '{1}{W}{W}', 'Ajani', 3, '+1：派出一個1/1綠白色奇索衍生生物。\n−2：阿耶尼對目標已橫置的生物造成4點傷害。\n（簡化：沒有 −8 異能）', [
  L(1, '派出奇索', [{ e: 'token', token: 'tok-kithkin' }]),
  L(-2, '對已橫置的生物造成4點傷害', [dmg(4)], { targets: [{ kind: 'creature', filter: { tapped: true }, prompt: '選擇已橫置的生物' }] }),
]);
pw('EOE', 'M', 'Tezzeret, Cruel Captain', '{3}', 'Tezzeret', 4, `每當一個神器在你的操控下進戰場時，在特茲瑞上放置一個忠誠指示物。\n0：重置目標神器或生物。若它是神器生物，在其上放置一個+1/+1指示物。\n−3：從你的牌庫中搜尋一張法術力值1或更少的神器牌，展示並置於你手上。\n${NO_ULT}`, [
  trig('allyPermEtb', [{ e: 'loyalty', what: 'self', n: 1 }], { filter: { type: 'Artifact' } }),
  L(0, '重置神器或生物', [{ e: 'untap', what: 'T0' }, { e: 'if', cond: { c: 'targetIs', t: 0, filter: { type: 'Artifact' } }, then: [{ e: 'if', cond: { c: 'targetIs', t: 0, filter: { type: 'Creature' } }, then: [{ e: 'counters', what: 'T0', n: 1 }] }] }], {
    targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'] }, prompt: '選擇神器或生物' }],
  }),
  L(-3, '搜尋小神器', [{ e: 'tutor', filter: { type: 'Artifact', mvMax: 1 } }]),
]);
pw('FDN', 'M', 'Kaito, Cunning Infiltrator', '{1}{U}{U}', 'Kaito', 3, `每當由你操控的生物對玩家造成戰鬥傷害時，在凱多上放置一個忠誠指示物。\n+1：至多一個目標由你操控的生物本回合不能被阻擋。抓一張牌，然後棄一張牌。\n−2：派出一個2/1藍色忍者衍生生物。\n${NO_ULT}`, [
  trig('allyCombatDamagePlayer', [{ e: 'loyalty', what: 'self', n: 1 }]),
  L(1, '不能被阻擋＋抓一棄一', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['unblockable'] }, { e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }], { targets: [{ ...MY_CR, optional: true }] }),
  L(-2, '派出忍者', [{ e: 'token', token: 'tok-ninja21' }]),
]);
pw('FDN', 'M', 'Chandra, Flameshaper', '{5}{R}{R}', 'Chandra', 6, '+2：放逐你牌庫頂的牌。本回合你可以使用它。\n−4：茜卓納拉對至多兩個目標生物各造成4點傷害。\n（簡化：+2 只放逐一張且不加法術力；沒有 +1 異能；−4 改為各造成4點）', [
  L(2, '放逐牌庫頂，本回合可用', [{ e: 'impulse', n: 1 }]),
  L(-4, '對兩個生物各造成4點傷害', [dmg(4), { e: 'damage', n: 4, to: 'T1' }], { targets: [{ ...CR, optional: true }, { ...CR, optional: true }] }),
]);
pw('FDN', 'M', 'Ajani, Caller of the Pride', '{1}{W}{W}', 'Ajani', 4, '+1：在至多一個目標生物上放置一個+1/+1指示物。\n−3：目標生物獲得飛行與連擊異能直到回合結束。\n（簡化：沒有 −8 異能）', [
  L(1, '+1/+1 指示物', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ ...CR, optional: true }] }),
  L(-3, '飛行＋連擊', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['flying', 'double_strike'] }], { targets: [CR] }),
]);
pw('FDN', 'M', 'Liliana, Dreadhorde General', '{4}{B}{B}', 'Liliana', 6, '每當由你操控的生物死去時，抓一張牌。\n+1：派出一個2/2黑色靈俑衍生生物。\n−4：每位玩家各犧牲兩個生物。\n（簡化：沒有 −9 異能）', [
  trig('allyDies', [{ e: 'draw', n: 1 }]),
  L(1, '派出靈俑', [{ e: 'token', token: 'tok-zombie' }]),
  L(-4, '每位玩家犧牲兩個生物', [{ e: 'edict', who: 'players' }, { e: 'edict', who: 'players' }]),
]);
pw('FDN', 'M', 'Vivien Reid', '{3}{G}{G}', 'Vivien', 5, `+1：檢視你牌庫頂的四張牌。你可以將其中一張生物或地牌置於你手上。其餘的置於你的牌庫底。\n−3：消滅目標神器、結界或具有飛行異能的生物。\n${NO_ULT}`, [
  L(1, '找生物或地', [{ e: 'dig', n: 4, take: 1, filter: { type: ['Creature', 'Land'] }, rest: 'bottom' }]),
  L(-3, '消滅神器、結界或飛行生物', [{ e: 'destroy', what: 'T0' }], {
    targets: [{ kind: 'permanent', filter: { or: [{ type: 'Artifact' }, { type: 'Enchantment' }, { type: 'Creature', kw: 'flying' }] }, prompt: '選擇神器、結界或飛行生物' }],
  }),
]);
pw('LCI', 'M', 'Quintorius Kand', '{3}{R}{W}', 'Quintorius', 4, '+1：派出一個3/2紅白色精怪衍生生物。\n（簡化：沒有從放逐區施放的觸發、發掘與終極異能）', [L(1, '派出 3/2 精怪', [{ e: 'token', token: 'tok-spirit32' }])]);
pw('MKM', 'M', "Kaya, Spirits' Justice", '{2}{W}{B}', 'Kaya', 3, '+2：刺探2。\n+1：派出一個1/1白黑色，具有飛行異能的精怪衍生生物。\n−2：放逐目標由你操控的生物，以及至多一個目標由對手操控的生物。\n（簡化：沒有複製的觸發式異能；+2 不會放逐墳墓場的牌）', [
  L(2, '刺探2', [{ e: 'surveil', n: 2 }]),
  L(1, '派出飛行精怪', [{ e: 'token', token: 'tok-spirit-flyer-wb' }]),
  L(-2, '放逐雙方各一個生物', [{ e: 'exile', what: 'T0' }, { e: 'exile', what: 'T1' }], { targets: [MY_CR, { ...OPP_CR, optional: true }] }),
]);
pw('OTJ', 'M', 'Oko, the Ringleader', '{2}{G}{U}', 'Oko', 3, '+1：抓兩張牌，然後棄兩張牌。\n−1：派出一個3/3綠色麋鹿衍生生物。\n（簡化：沒有變成生物複製品的異能；不考慮犯罪；沒有 −5 異能）', [
  L(1, '抓二棄二', [{ e: 'draw', n: 2 }, { e: 'discard', n: 2, who: 'you' }]),
  L(-1, '派出 3/3 麋鹿', [{ e: 'token', token: 'tok-elk' }]),
]);
pw('OTJ', 'M', 'Jace Reawakened', '{U}{U}', 'Jace', 3, '+1：抓一張牌，然後棄一張牌。\n（簡化：沒有施放回合的限制、預謀與終極異能）', [L(1, '抓一棄一', [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }])]);
pw('TDM', 'M', 'Ugin, Eye of the Storms', '{7}', 'Ugin', 7, '當烏金進戰場時，放逐至多一個目標有顏色的永久物。\n每當你施放無色咒語時，放逐至多一個目標有顏色的永久物。\n+2：你獲得3點生命並抓一張牌。\n（簡化：施放觸發改為進戰場觸發；沒有 0 與 −11 異能）', [
  trig('etb', [{ e: 'exile', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { color: ['W', 'U', 'B', 'R', 'G'] }, optional: true, prompt: '選擇有顏色的永久物（可以不選）' }] }),
  trig('castAny', [{ e: 'exile', what: 'T0' }], {
    filter: { nonColor: ['W', 'U', 'B', 'R', 'G'] },
    targets: [{ kind: 'permanent', filter: { color: ['W', 'U', 'B', 'R', 'G'] }, optional: true, prompt: '選擇有顏色的永久物（可以不選）' }],
  }),
  L(2, '獲得3點生命並抓一張牌', [{ e: 'gain', n: 3 }, { e: 'draw', n: 1 }]),
]);
pw('WOE', 'M', 'Ashiok, Wicked Manipulator', '{3}{B}{B}', 'Ashiok', 5, '+1：檢視你牌庫頂的兩張牌。將其中一張置於你手上，另一張置入你的墳墓場。\n−2：派出兩個1/1黑色夢魘衍生生物。\n（簡化：沒有付生命的取代效果；+1 的另一張改為置入墳墓場；夢魘沒有成長異能；沒有 −7 異能）', [
  L(1, '看兩張取一張', [{ e: 'dig', n: 2, take: 1, rest: 'graveyard' }]),
  L(-2, '派出兩個夢魘', [{ e: 'token', token: 'tok-nightmare', n: 2 }]),
]);
