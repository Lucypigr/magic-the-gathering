// ============================================================
// 傳奇（Saga）：進戰場時與你的抓牌步驟後各放一個傳奇指示物，觸發對應的章節；
// 最後一章結算後犧牲。召喚獸（FIN）是同時具有生物類別的傳奇。
// ============================================================
import type { CardDef, Effect, SetCode, TargetSpec } from '../../engine/types';
import { CR, MY_CR, MY_GY_CR, OPP, OPP_CR, add, dmg } from '../dsl';

type Chapter = { effects: Effect[]; targets?: TargetSpec[] };
const ch = (effects: Effect[], targets?: TargetSpec[]): Chapter => (targets ? { effects, targets } : { effects });
const NOTE = '（傳奇：進戰場時與你的抓牌步驟後，各放一個傳奇指示物並觸發對應的章節；最後一章結束後犧牲它。）';
const ZH_CH = ['一', '二', '三', '四', '五', '六'];

/** 依章節文字產生卡面敘述 */
function sagaText(lines: [number[], string][], extra = ''): string {
  return [...lines.map(([ns, t]) => `${ns.map((n) => `第${ZH_CH[n - 1]}章`).join('、')}—${t}`), extra, NOTE].filter(Boolean).join('\n');
}

function saga(set: SetCode, rarity: CardDef['rarity'], name: string, cost: string, lines: [number[], string][], chapters: Chapter[], extra = '', x: Partial<CardDef> = {}) {
  add({ set, rarity, name, cost, types: ['Enchantment'], subtypes: ['Saga'], saga: { chapters }, text: sagaText(lines, extra), ...x });
}

/** 召喚獸：傳奇生物 */
function summon(set: SetCode, rarity: CardDef['rarity'], name: string, cost: string, sub: string, p: number, t: number, lines: [number[], string][], chapters: Chapter[], extra = '', x: Partial<CardDef> = {}) {
  add({ set, rarity, name, cost, types: ['Enchantment', 'Creature'], subtypes: ['Saga', ...sub.split(' ')], power: p, toughness: t, saga: { chapters }, text: sagaText(lines, extra), ...x });
}

const MINE = { all: { type: 'Creature' as const, ctrl: 'you' as const } };
const OTHER_MINE = { all: { type: 'Creature' as const, ctrl: 'you' as const, other: true } };
const OPT_CR: TargetSpec = { ...CR, optional: true };
const OPT_MY_CR: TargetSpec = { ...MY_CR, optional: true };
const OPT_NONLAND: TargetSpec = { kind: 'permanent', filter: { nonType: 'Land' }, optional: true, prompt: '選擇非地永久物（可以不選）' };
const UNTAP_LAND: TargetSpec = { kind: 'permanent', filter: { type: 'Land', ctrl: 'you' }, optional: true, prompt: '選擇要重置的地' };

// ---------------- Final Fantasy（FIN）召喚獸 ----------------
const maduin: CardDef = {
  id: 'esper-origins-back',
  set: 'FIN',
  rarity: 'R',
  name: 'Summon: Esper Maduin',
  types: ['Enchantment', 'Creature'],
  subtypes: ['Saga', 'Elemental'],
  colors: ['G'],
  power: 4,
  toughness: 4,
  saga: {
    chapters: [
      ch([{ e: 'dig', n: 1, take: 1, filter: { nonType: ['Instant', 'Sorcery'] }, rest: 'top' }]),
      ch([{ e: 'untap', what: 'T0' }, { e: 'untap', what: 'T1' }], [UNTAP_LAND, UNTAP_LAND]),
      ch([{ e: 'pump', what: OTHER_MINE, p: 2, t: 2, kw: ['trample'] }]),
    ],
  },
  text: sagaText(
    [
      [[1], '展示你牌庫頂的牌。若它是永久物牌，將它置於你手上。'],
      [[2], '重置至多兩個由你操控的地。'],
      [[3], '由你操控的其他生物得+2/+2並獲得踐踏異能直到回合結束。'],
    ],
    '（簡化：第二章原本是加{G}{G}；沒有終局指示物）',
  ),
};
add({
  set: 'FIN',
  rarity: 'R',
  name: 'Esper Origins',
  cost: '{1}{G}',
  types: ['Sorcery'],
  spell: { effects: [{ e: 'surveil', n: 2 }, { e: 'gain', n: 2 }] },
  flashback: '{3}{G}',
  flashbackTransform: true,
  back: maduin,
  imageName: 'Esper Origins // Summon: Esper Maduin',
  text: '刺探2。你獲得2點生命。若此咒語是從墳墓場施放，改為將它轉化後放進戰場，成為召喚獸《Summon: Esper Maduin》。\n返照{3}{G}\n（雙面牌：背面是傳奇生物，點卡片可以看到背面。）',
});
summon('FIN', 'U', 'Summon: Shiva', '{3}{U}{U}', 'Elemental', 4, 5, [
  [[1, 2], '橫置目標由對手操控的生物，並在其上放置一個暈眩指示物。'],
  [[3], '對手每操控一個已橫置的生物，你便抓一張牌。'],
], [
  ch([{ e: 'stun', what: 'T0' }], [OPP_CR]),
  ch([{ e: 'stun', what: 'T0' }], [OPP_CR]),
  ch([{ e: 'draw', n: { count: { type: 'Creature', ctrl: 'opp', tapped: true } } }]),
]);
summon('FIN', 'U', 'Summon: Anima', '{4}{B}{B}', 'Horror', 4, 4, [
  [[1, 2, 3], '你抓一張牌並失去1點生命。'],
  [[4], '每位對手各犧牲一個生物並失去3點生命。'],
], [
  ch([{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }]),
  ch([{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }]),
  ch([{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }]),
  ch([{ e: 'edict', who: 'opp' }, { e: 'lose', n: 3, who: 'opp' }]),
], '威懾', { keywords: ['menace'] });
summon('FIN', 'R', 'Summon: Primal Odin', '{4}{B}{B}', 'Knight', 5, 3, [
  [[1], '消滅目標由對手操控的生物。'],
  [[2], '此生物得+3/+0直到回合結束。'],
  [[3], '抓兩張牌。每位玩家各失去2點生命。'],
], [
  ch([{ e: 'destroy', what: 'T0' }], [OPP_CR]),
  ch([{ e: 'pump', what: 'self', p: 3, t: 0 }]),
  ch([{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'players' }]),
], '（簡化：第二章原本是「造成戰鬥傷害時對方輸掉遊戲」）');
summon('FIN', 'M', 'Summon: Bahamut', '{9}', 'Dragon', 9, 9, [
  [[1, 2], '消滅至多一個目標非地永久物。'],
  [[3], '抓兩張牌。'],
  [[4], '此生物對每位對手各造成9點傷害。'],
], [
  ch([{ e: 'destroy', what: 'T0' }], [OPT_NONLAND]),
  ch([{ e: 'destroy', what: 'T0' }], [OPT_NONLAND]),
  ch([{ e: 'draw', n: 2 }]),
  ch([dmg(9, 'opp')]),
], '飛行\n（簡化：第四章原本是依你其他永久物的法術力值總和造成傷害）', { keywords: ['flying'] });
summon('FIN', 'M', 'Summon: Knights of Round', '{6}{W}{W}', 'Knight', 3, 3, [
  [[1, 2, 3, 4], '派出三個2/2白色，具有警戒異能的騎士衍生生物。'],
  [[5], '由你操控的其他生物得+2/+2並獲得不滅異能直到回合結束。'],
], [
  ...Array.from({ length: 4 }, () => ch([{ e: 'token', token: 'tok-knight', n: 3 }])),
  ch([{ e: 'pump', what: OTHER_MINE, p: 2, t: 2, kw: ['indestructible'] }]),
], '不滅\n（簡化：第五章的不滅只到回合結束）', { keywords: ['indestructible'] });
summon('FIN', 'C', 'Summon: Fat Chocobo', '{4}{G}', 'Bird', 4, 4, [
  [[1], '派出一個2/2綠色鳥衍生生物。'],
  [[2, 3, 4], '由你操控的生物獲得踐踏異能直到回合結束。'],
], [
  ch([{ e: 'token', token: 'tok-bird-g22' }]),
  ...Array.from({ length: 3 }, () => ch([{ e: 'pump', what: MINE, p: 0, t: 0, kw: ['trample'] }])),
], '（簡化：鳥衍生物沒有地落異能）');
summon('FIN', 'U', 'Summon: Esper Ramuh', '{2}{R}{R}', 'Wizard', 3, 3, [
  [[1], '此生物對目標由對手操控的生物造成X點傷害，X為你墳墓場中非生物非地牌的數量。'],
  [[2, 3], '由你操控的巫師得+1/+0直到回合結束。'],
], [
  ch([{ e: 'damage', n: { gy: { nonType: ['Creature', 'Land'] } }, to: 'T0' }], [OPP_CR]),
  ch([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', sub: 'Wizard' } }, p: 1, t: 0 }]),
  ch([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', sub: 'Wizard' } }, p: 1, t: 0 }]),
]);
summon('FIN', 'U', 'Summon: Fenrir', '{2}{G}', 'Wolf', 3, 2, [
  [[1], '從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場。'],
  [[2], '在目標由你操控的生物上放置一個+1/+1指示物。'],
  [[3], '抓一張牌。'],
], [
  ch([{ e: 'searchLand', to: 'battlefield', tapped: true }]),
  ch([{ e: 'counters', what: 'T0', n: 1 }], [MY_CR]),
  ch([{ e: 'draw', n: 1 }]),
], '（簡化：第二、三章的條件已省略）');

// ---------------- 哈比人（HOB） ----------------
saga('HOB', 'U', "The Mountain-king's Return", '{2}{W}', [
  [[1], '招募。（抓一張牌，然後棄一張牌；若棄掉的不是地，派出一個1/1人類士兵。）'],
  [[2], '將目標法術力值3或更少的生物牌從你的墳墓場移回戰場。'],
  [[3], '在至多一個目標生物上放置一個+1/+1指示物。'],
], [
  ch([{ e: 'recruit' }]),
  ch([{ e: 'reanimate', what: 'T0' }], [{ ...MY_GY_CR, filter: { ctrl: 'you', type: 'Creature', mvMax: 3 } }]),
  ch([{ e: 'counters', what: 'T0', n: 1 }], [OPT_CR]),
]);
saga('HOB', 'U', 'Down, Down to Goblin-town', '{2}{B}', [
  [[1], '目標對手展示其手牌，你從中選擇一張非地牌，該玩家棄掉那張牌。'],
  [[2], '集結鬼怪1。'],
  [[3, 4], '目標對手失去1點生命，你獲得1點生命。'],
], [
  ch([{ e: 'discardChosen', who: 'T0', filter: { nonType: 'Land' } }], [OPP]),
  ch([{ e: 'amass', n: 1 }]),
  ch([{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }]),
  ch([{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }]),
]);
saga('HOB', 'U', 'Burn, Burn, Tree and Fern', '{3}{R}', [
  [[1], '此傳奇對目標由對手操控的生物造成6點傷害。'],
  [[2], '消滅目標由對手操控的神器。'],
  [[3, 4], '對每位對手各造成1點傷害。'],
], [
  ch([dmg(6)], [OPP_CR]),
  ch([{ e: 'destroy', what: 'T0' }], [{ kind: 'permanent', filter: { type: 'Artifact', ctrl: 'opp' }, prompt: '選擇對手的神器' }]),
  ch([dmg(1, 'opp')]),
  ch([dmg(1, 'opp')]),
], '（簡化：第三、四章原本是加{R}）');
const misty: Chapter = ch([
  { e: 'token', token: 'tok-treasure' },
  { e: 'if', cond: { c: 'controls', filter: { sub: 'Treasure' }, n: 4 }, then: [{ e: 'sac', what: 'self' }, { e: 'token', token: 'tok-dragon66' }] },
]);
saga('HOB', 'R', 'The Misty Mountains Cold', '{2}{R}', [[[1, 2, 3, 4], '派出一個珍寶衍生物。然後若你操控四個或更多珍寶，犧牲此傳奇，並派出一個6/6紅色，具有飛行異能的龍衍生生物。']], [misty, misty, misty, misty]);
saga('HOB', 'R', 'Down in the Valley', '{2}{G}', [
  [[1], '從你的牌庫中搜尋一張基本地牌，展示並置於你手上。'],
  [[2], '派出一個1/1綠色精靈衍生生物。'],
  [[3, 4], '由你操控的精靈得+1/+0並獲得警戒異能直到回合結束。'],
], [
  ch([{ e: 'tutor', filter: { type: 'Land', basic: true } }]),
  ch([{ e: 'token', token: 'tok-elf-g11' }]),
  ch([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', sub: 'Elf' } }, p: 1, t: 0, kw: ['vigilance'] }]),
  ch([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you', sub: 'Elf' } }, p: 1, t: 0, kw: ['vigilance'] }]),
], '（簡化：第二章原本是讓此傳奇獲得地落異能）');

// ---------------- 漫威（MSH／SPM） ----------------
saga('MSH', 'R', 'Origin of the Avengers', '{1}{W}', [
  [[1], '占卜2。'],
  [[2], '抓一張牌。'],
  [[3], '在每個由你操控的生物上各放置一個+1/+1指示物。'],
], [ch([{ e: 'scry', n: 2 }]), ch([{ e: 'draw', n: 1 }]), ch([{ e: 'counters', what: MINE, n: 1 }])], '（簡化：第二章不能把英雄放進戰場）');
saga('MSH', 'R', 'Avengers: Under Siege', '{2}{B}{R}', [
  [[1], '派出兩個2/1黑色，具有威懾異能的反派衍生生物。'],
  [[2], '此傳奇對每個非反派生物和每位對手各造成2點傷害。'],
  [[3], '你每操控一個反派，便派出一個珍寶衍生物。'],
], [
  ch([{ e: 'token', token: 'tok-villain', n: 2 }]),
  ch([{ e: 'damage', n: 2, to: { all: { type: 'Creature', nonSub: 'Villain' } } }, dmg(2, 'opp')]),
  ch([{ e: 'token', token: 'tok-treasure', n: { count: { sub: 'Villain', ctrl: 'you' } } }]),
]);
saga('MSH', 'M', 'The Coming of Galactus', '{2}{B}{B}{G}', [
  [[1], '消滅至多一個目標非地永久物。'],
  [[2, 3], '每位對手各失去2點生命。'],
  [[4], '派出名為格拉克特斯的16/16黑色傳奇長者異星生物衍生物，它具有飛行與踐踏異能。'],
], [
  ch([{ e: 'destroy', what: 'T0' }], [OPT_NONLAND]),
  ch([{ e: 'lose', n: 2, who: 'opp' }]),
  ch([{ e: 'lose', n: 2, who: 'opp' }]),
  ch([{ e: 'token', token: 'tok-galactus' }]),
], '（簡化：格拉克特斯攻擊時不會消滅地）');
saga('SPM', 'R', 'Origin of Spider-Man', '{1}{W}', [
  [[1], '派出一個2/1綠色，具有延勢異能的蜘蛛衍生生物。'],
  [[2], '在目標由你操控的生物上放置一個+1/+1指示物。'],
  [[3], '目標由你操控的生物獲得連擊異能直到回合結束。'],
], [
  ch([{ e: 'token', token: 'tok-spider-reach' }]),
  ch([{ e: 'counters', what: 'T0', n: 1 }], [MY_CR]),
  ch([{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['double_strike'] }], [MY_CR]),
], '（簡化：第二章不會讓它成為傳奇蜘蛛英雄）');
saga('SPM', 'R', 'The Death of Gwen Stacy', '{2}{B}', [
  [[1], '消滅目標生物。'],
  [[2], '每位對手各棄一張牌。'],
  [[3], '你獲得3點生命。'],
], [ch([{ e: 'destroy', what: 'T0' }], [CR]), ch([{ e: 'discard', n: 1, who: 'opp' }]), ch([{ e: 'gain', n: 3 }])], '（簡化：第二章原本是「棄一張牌或失去3點生命」；第三章原本是放逐墳墓場）');

// ---------------- 龍暴（TDM） ----------------
saga('TDM', 'R', 'Awaken the Honored Dead', '{B}{G}{U}', [
  [[1], '消滅目標非地永久物。'],
  [[2], '碾磨三張牌。'],
  [[3], '你可以棄一張牌。若你如此作，將目標生物或地牌從你的墳墓場移回你手上。'],
], [
  ch([{ e: 'destroy', what: 'T0' }], [{ kind: 'permanent', filter: { nonType: 'Land' }, prompt: '選擇非地永久物' }]),
  ch([{ e: 'mill', n: 3 }]),
  ch([{ e: 'costThen', prompt: '棄一張牌，把墳墓場的生物或地牌拿回手上？', cost: { discard: 1 }, then: [{ e: 'toHand', what: 'T0' }] }], [
    { kind: 'gyCard', filter: { ctrl: 'you', type: ['Creature', 'Land'] }, optional: true, prompt: '選擇墳墓場中的生物或地牌' },
  ]),
]);
const look3: Chapter = ch([{ e: 'dig', n: 3, take: 1, rest: 'bottom' }]);
saga('TDM', 'R', 'Rediscover the Way', '{U}{R}{W}', [
  [[1, 2], '檢視你牌庫頂的三張牌。將其中一張置於你手上，其餘的置於你的牌庫底。'],
  [[3], '目標由你操控的生物獲得連擊異能直到回合結束。'],
], [look3, look3, ch([{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['double_strike'] }], [MY_CR])], '（簡化：第三章原本是本回合每施放非生物咒語就給予連擊）');
saga('TDM', 'R', 'Revival of the Ancestors', '{1}{W}{B}{G}', [
  [[1], '派出三個1/1白色精怪衍生生物。'],
  [[2], '在至多三個目標由你操控的生物上各放置一個+1/+1指示物。'],
  [[3], '由你操控的生物獲得踐踏與繫命異能直到回合結束。'],
], [
  ch([{ e: 'token', token: 'tok-spirit-w11', n: 3 }]),
  ch([{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }, { e: 'counters', what: 'T2', n: 1 }], [OPT_MY_CR, OPT_MY_CR, OPT_MY_CR]),
  ch([{ e: 'pump', what: MINE, p: 0, t: 0, kw: ['trample', 'lifelink'] }]),
]);
saga('TDM', 'R', 'Roar of Endless Song', '{2}{G}{U}{R}', [
  [[1, 2], '派出一個5/5綠色大象衍生生物。'],
  [[3], '由你操控的生物得+3/+3直到回合結束。'],
], [ch([{ e: 'token', token: 'tok-elephant55' }]), ch([{ e: 'token', token: 'tok-elephant55' }]), ch([{ e: 'pump', what: MINE, p: 3, t: 3 }])], '（簡化：第三章原本是力量與防禦力加倍）');
saga('TDM', 'R', 'Thunder of Unity', '{R}{W}{B}', [
  [[1], '你抓兩張牌並失去2點生命。'],
  [[2, 3], '每位對手各失去1點生命，你獲得1點生命。'],
], [ch([{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'you' }]), ch([{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }]), ch([{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }])], '（簡化：第二、三章原本是本回合每有生物進場就觸發一次）');

// ---------------- 降世神通（TLA） ----------------
saga('TLA', 'U', 'The Cave of Two Lovers', '{3}{R}', [
  [[1], '派出兩個1/1白色盟友衍生生物。'],
  [[2], '從你的牌庫中搜尋一張山脈或洞穴牌，展示並置於你手上。'],
  [[3], '大地彎折3。'],
], [ch([{ e: 'token', token: 'tok-ally', n: 2 }]), ch([{ e: 'tutor', filter: { sub: ['Mountain', 'Cave'] } }]), ch([{ e: 'earthbend', n: 3 }])]);
saga('TLA', 'U', 'Leaves from the Vine', '{1}{G}', [
  [[1], '碾磨三張牌，然後派出一個食物衍生物。'],
  [[2], '在至多兩個目標由你操控的生物上各放置一個+1/+1指示物。'],
  [[3], '若你的墳墓場中有生物或課程牌，抓一張牌。'],
], [
  ch([{ e: 'mill', n: 3 }, { e: 'token', token: 'tok-food' }]),
  ch([{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }], [OPT_MY_CR, OPT_MY_CR]),
  ch([{ e: 'if', cond: { c: 'gyCount', filter: { or: [{ type: 'Creature' }, { sub: 'Lesson' }] }, n: 1 }, then: [{ e: 'draw', n: 1 }] }]),
]);

// ---------------- 忍者龜（TMT） ----------------
saga('TMT', 'M', 'The Last Ronin', '{4}{B}{G}', [
  [[1], '消滅所有生物。'],
  [[2], '碾磨四張牌，然後將目標生物牌從你的墳墓場移回你手上。'],
  [[3], '在目標由你操控的生物上放置三個+1/+1指示物，它獲得踐踏、繫命與不滅異能直到回合結束。'],
], [
  ch([{ e: 'destroy', what: { all: { type: 'Creature' } } }]),
  ch([{ e: 'mill', n: 4 }, { e: 'toHand', what: 'T0' }], [{ ...MY_GY_CR, optional: true }]),
  ch([{ e: 'counters', what: 'T0', n: 3 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample', 'lifelink', 'indestructible'] }], [MY_CR]),
], '（簡化：第二章的目標在碾磨前選擇；第三章原本是單獨攻擊時觸發）');

// ---------------- 艾卓王權（WOE） ----------------
saga('WOE', 'U', 'The Princess Takes Flight', '{2}{W}', [
  [[1], '放逐至多一個目標生物，直到此傳奇離開戰場。'],
  [[2], '目標由你操控的生物得+2/+2並獲得飛行異能直到回合結束。'],
  [[3], '（此傳奇被犧牲時，放逐的牌回到戰場。）'],
], [ch([{ e: 'exileLinked', what: 'T0' }], [OPT_CR]), ch([{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['flying'] }], [MY_CR]), ch([])]);
saga('WOE', 'U', "The Witch's Vanity", '{1}{B}', [
  [[1], '消滅目標由對手操控，法術力值2或更少的生物。'],
  [[2], '派出一個食物衍生物。'],
  [[3], '在目標由你操控的生物上結附一個邪惡角色衍生物（所結附的生物得+1/+1）。'],
], [
  ch([{ e: 'destroy', what: 'T0' }], [{ kind: 'creature', filter: { ctrl: 'opp', mvMax: 2 }, prompt: '選擇對手法術力值2或更少的生物' }]),
  ch([{ e: 'token', token: 'tok-food' }]),
  ch([{ e: 'role', what: 'T0', token: 'tok-wicked-role' }], [MY_CR]),
]);
saga('WOE', 'U', 'Korvold and the Noble Thief', '{3}{R}', [
  [[1, 2], '派出一個珍寶衍生物。'],
  [[3], '放逐你牌庫頂的三張牌，本回合你可以使用它們。'],
], [ch([{ e: 'token', token: 'tok-treasure' }]), ch([{ e: 'token', token: 'tok-treasure' }]), ch([{ e: 'impulse', n: 3 }])], '（簡化：第三章原本是放逐對手的牌庫頂）');
saga('WOE', 'R', "The Huntsman's Redemption", '{2}{G}', [
  [[1], '派出一個3/3綠色野獸衍生生物。'],
  [[2], '你可以犧牲一個生物。若你如此作，從你的牌庫中搜尋一張生物或基本地牌，展示並置於你手上。'],
  [[3], '至多兩個目標生物各得+2/+2並獲得踐踏異能直到回合結束。'],
], [
  ch([{ e: 'token', token: 'tok-beast33' }]),
  ch([{ e: 'costThen', prompt: '犧牲一個生物來搜尋生物或基本地？', cost: { sac: { type: 'Creature' } }, then: [{ e: 'tutor', filter: { or: [{ type: 'Creature' }, { type: 'Land', basic: true }] } }] }]),
  ch([{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['trample'] }, { e: 'pump', what: 'T1', p: 2, t: 2, kw: ['trample'] }], [OPT_CR, OPT_CR]),
]);
saga('WOE', 'U', 'Welcome to Sweettooth', '{1}{G}', [
  [[1], '派出一個1/1白色人類衍生生物。'],
  [[2], '派出一個食物衍生物。'],
  [[3], '在目標由你操控的生物上放置X個+1/+1指示物，X為1加上你操控的食物數量。'],
], [
  ch([{ e: 'token', token: 'tok-human' }]),
  ch([{ e: 'token', token: 'tok-food' }]),
  ch([{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T0', n: { count: { sub: 'Food', ctrl: 'you' } } }], [MY_CR]),
]);
