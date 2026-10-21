// 實相裂隙（FRA）手寫的卡：效果與原版卡面一致（鵬洛客以外的部分）。
// 規則敘述為本遊戲引擎實際執行的中文敘述。
import type { Ability, ActivatedAbility, Amt, CardDef, CardType, Effect, Filter, Keyword, SpellSpec, TargetSpec } from '../../engine/types';
import { ANY, CR, MY_CR, OPP, OPP_CR, OPP_NONLAND, act, add, arti, cr, ench, etb, inst, land, sorc, trig } from '../dsl';

const S = 'FRA';

// ------------------------------------------------------------
// 共用的文字與輔助函式
// ------------------------------------------------------------
/** 強化傑斯 N 的完整說明 */
export const EMP = (n: number | string) =>
  `強化傑斯${n}（在你的傑斯衍生物上放置${typeof n === 'number' ? n + '個' : '等量的'}忠誠指示物；沒有的話先派出一個具有「−1：刺探1」「−3：抓一張牌」的藍色傑斯鵬洛客衍生物）`;
const EMP_X = '（在你的傑斯衍生物上放置等量的忠誠指示物；沒有的話先派出一個具有「−1：刺探1」「−3：抓一張牌」的藍色傑斯鵬洛客衍生物）';
const FB = (cost: string) => `返照${cost}（你可以支付返照費用，從你的墳墓場施放此牌。之後此牌會被放逐。）`;
const PREP_NOTE = '（已準備時，你可以施放它附帶咒語的複製。施放後它就不再是已準備。）';
const ENTERS_PREPARED = '此生物以已準備的狀態進戰場。';
const CADET = '2/2無色，名為學員的巫師士兵衍生生物';
const THOPTER = '1/1無色，具有飛行異能的機械鳥神器衍生生物';
const TYPE_ZH: Record<string, string> = { Instant: '瞬間', Sorcery: '法術' };

const cadet = (n: number | { lifeGained: true } | { count: Filter } = 1): Effect => ({ e: 'token', token: 'tok-cadet', ...(n === 1 ? {} : { n }) });
const empower = (n: Amt): Effect => ({ e: 'empowerJace', n });
const MY_PW: Filter = { type: 'Planeswalker', ctrl: 'you' };
const MY_CREATURES: Filter = { type: 'Creature', ctrl: 'you' };

/** 具有「準備」的生物：生物本身加上附帶的瞬間／法術 */
function prepared(
  rarity: 'C' | 'U' | 'R' | 'M',
  name: string,
  cost: string,
  subs: string,
  p: number,
  t: number,
  /** 此生物自己的敘述；用 [前, 後] 可以分別放在「已準備」之前與之後 */
  texts: string | [string, string],
  spellName: string,
  spellCost: string,
  spellTypes: CardType[],
  spellText: string,
  spell: SpellSpec,
  x: Partial<CardDef> = {},
  enters = true,
) {
  const tz = TYPE_ZH[spellTypes[0]];
  const [before, after] = Array.isArray(texts) ? texts : [texts, ''];
  add({
    set: S,
    rarity,
    name,
    cost,
    types: ['Creature'],
    subtypes: subs.split(' ').filter(Boolean),
    power: p,
    toughness: t,
    ...(enters ? { etbPrepared: true } : {}),
    prepare: { name: spellName, cost: spellCost, types: spellTypes, text: spellText, spell },
    imageName: `${name} // ${spellName}`,
    text: `${before ? before + '\n' : ''}${enters ? ENTERS_PREPARED + '\n' : ''}${after ? after + '\n' : ''}準備—《${spellName}》${spellCost}（${tz}）：${spellText}\n${PREP_NOTE}`,
    ...x,
  });
}

const legend = { supertypes: ['Legendary' as const] };
const lcr = (r: 'C' | 'U' | 'R' | 'M', name: string, cost: string, subs: string, p: number, t: number, text: string, x: Partial<CardDef> = {}) =>
  cr(S, r, name, cost, subs, p, t, text, { ...legend, ...x });

const gyTarget = (filter: Filter, prompt: string): TargetSpec => ({ kind: 'gyCard', filter: { ctrl: 'you', ...filter }, prompt });

// ============================================================
// 白
// ============================================================
prepared('C', 'Blossom-Blessed Angel', '{3}{W}', 'Angel Cleric', 2, 4, '飛行，警戒', 'Seed Suture', '{G/W}', ['Sorcery'], '在目標生物上放置一個+1/+1指示物。你獲得1點生命。', {
  targets: [CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'gain', n: 1 }],
}, { keywords: ['flying', 'vigilance'] });

cr(S, 'C', 'Fateshaper Aspirant', '{4}{W}', 'Rhino Cleric', 3, 4, '當此生物進戰場時，選擇一項：\n• 將目標傳奇牌從你的墳墓場移回你手上。\n• 在目標生物上放置一個+1/+1指示物。它獲得警戒與不滅異能直到回合結束。', {
  abilities: [
    etb([], {
      modes: [
        { text: '傳奇牌回手', targets: [gyTarget({ legendary: true }, '選擇你墳墓場中的傳奇牌')], effects: [{ e: 'toHand', what: 'T0' }] },
        { text: '+1/+1指示物並獲得警戒、不滅', targets: [CR], effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['vigilance', 'indestructible'] }] },
      ],
    }),
  ],
});

cr(S, 'R', 'Flickering Hound', '{3}{W}', 'Dog', 2, 2, '每當你施放生物咒語時，放逐至多一個其他目標由你操控的生物，然後將該牌在其擁有者的操控下放回戰場。', {
  abilities: [trig('castAny', [{ e: 'flicker', what: 'T0' }], { filter: { type: 'Creature' }, targets: [{ ...MY_CR, optional: true, notSelf: true }] })],
});

sorc(S, 'U', 'Generous Revival', '{2}{W}', `將目標法術力值為3或更少的生物牌從你的墳墓場移回戰場，並額外帶有一個+1/+1指示物。\n${FB('{4}{W}')}`, {
  targets: [gyTarget({ type: 'Creature', mvMax: 3 }, '選擇你墳墓場中法術力值3或更少的生物牌')],
  effects: [{ e: 'reanimate', what: 'T0', counters: 1 }],
}, { flashback: '{4}{W}' });

inst(S, 'R', 'Germinate Recruits', '{2}{W}', `派出X個${CADET}，X為你本回合獲得的生命總量。`, {
  effects: [cadet({ lifeGained: true })],
});

cr(S, 'C', 'Graft Surgeon', '{2}{W}', 'Human Cleric', 2, 2, '此生物進戰場時上面有一個+1/+1指示物。\n當此生物死去時，將它身上的指示物放置到至多一個目標由你操控的生物上。', {
  etbCounters: 1,
  abilities: [trig('dies', [{ e: 'counters', what: 'T0', n: { lkiCounters: true } }], { targets: [{ ...MY_CR, optional: true }] })],
});

sorc(S, 'C', 'Hexhaven Battalion', '{4}{W}{W}', `派出三個${CADET}。${EMP(2)}\n基本地循環{2}（{2}，從手上棄掉此牌：從你的牌庫中搜尋一張基本地牌，展示並置於你手上，然後洗牌。）`, {
  effects: [cadet(3), empower(2)],
}, { cycling: { cost: '{2}', search: { type: 'Land', basic: true } } });

sorc(S, 'R', 'Kindred Judgment', '{5}{W}{W}', '選擇一個生物類別。消滅所有不是所選類別的生物。', { effects: [{ e: 'kindredJudgment' }] });

inst(S, 'R', 'Loyal Tutor', '{W}', '從你的牌庫中搜尋一張鵬洛客牌，展示該牌，然後洗牌，並將該牌置於你的牌庫頂。', {
  effects: [{ e: 'tutor', filter: { type: 'Planeswalker' }, to: 'top' }],
});

ench(S, 'C', 'Memory Trap', '{2}{W}', '當此結界進戰場時，放逐目標由對手操控的非地永久物，直到此結界離開戰場。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [OPP_NONLAND] })],
});

sorc(S, 'C', 'Predictive Preparations', '{1}{W}', `在每個至多兩個目標生物上各放置一個+1/+1指示物。\n${FB('{3}{W}')}`, {
  targets: [CR, { ...CR, optional: true }],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'counters', what: 'T1', n: 1 }],
}, { flashback: '{3}{W}' });

inst(S, 'U', 'Prophesied End', '{1}{W}', '消滅目標生物。若它不是進行攻擊的生物，其操控者抓一張牌。', {
  targets: [CR],
  effects: [
    {
      e: 'if',
      cond: { c: 'targetIs', t: 0, filter: { attacking: true } },
      then: [{ e: 'destroy', what: 'T0' }],
      else: [{ e: 'draw', n: 1, who: 'T0ctrl' }, { e: 'destroy', what: 'T0' }],
    },
  ],
});

sorc(S, 'U', 'Refute Destiny', '{1}{W}', '放逐目標綠色或藍色的生物或鵬洛客。刺探1。', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'], color: ['G', 'U'] }, prompt: '選擇綠色或藍色的生物或鵬洛客' }],
  effects: [{ e: 'exile', what: 'T0' }, { e: 'surveil', n: 1 }],
});

cr(S, 'R', 'Repurposed Enforcer', '{1}{W}', 'Human Soldier', 3, 2, `每當此生物攻擊時，強化傑斯X，X為由你操控的生物數量。${EMP_X}`, {
  abilities: [trig('attacks', [empower({ count: MY_CREATURES })])],
});

sorc(S, 'M', 'Return to the Light Realms', '{7}{W}{W}', '將你墳墓場中所有非地的永久物牌放進戰場。', {
  effects: [{ e: 'reanimateAll', filter: { nonType: ['Land', 'Instant', 'Sorcery'] } }],
});

sorc(S, 'C', 'Surgical Precision', '{1}{W}', '選擇一項：\n• 消滅目標防禦力為4或更大的生物。你獲得1點生命。\n• 你抓一張牌並獲得2點生命。', {
  modes: [
    { text: '消滅防禦力4以上的生物並獲得1點生命', targets: [{ kind: 'creature', filter: { toughMin: 4 }, prompt: '選擇防禦力4或更大的生物' }], effects: [{ e: 'destroy', what: 'T0' }, { e: 'gain', n: 1 }] },
    { text: '抓一張牌並獲得2點生命', effects: [{ e: 'draw', n: 1 }, { e: 'gain', n: 2 }] },
  ],
});

lcr('U', 'Danitha, Sword of Hope', '{2}{W}', 'Human Knight', 2, 2, '先攻\n每當你施放武具咒語或以由你操控的生物為目標的咒語時，抓一張牌。此異能每回合只會觸發一次。', {
  keywords: ['first_strike'],
  abilities: [trig('castAny', [{ e: 'draw', n: 1 }], { filter: { sub: 'Equipment' }, orTargets: MY_CREATURES, oncePerTurn: true })],
});

lcr('U', 'Ghalta the Immovable', '{8}{W}', 'Elder Dinosaur', 0, 7, '此咒語減少{X}來施放，X為由你操控的生物中最大的防禦力。\n由你操控的生物可以攻擊，如同它們沒有防衛異能。\n由你操控的每個防禦力大於力量的生物，都以防禦力而非力量來分配戰鬥傷害。', {
  costReduce: { perMaxStat: { stat: 'toughness', filter: MY_CREATURES } },
  abilities: [{ kind: 'static', anthem: { filter: MY_CREATURES, grant: { ignoreDefender: true, damageByToughness: true } } }],
});

add({
  set: S,
  rarity: 'R',
  name: "Gideon's Memorial",
  cost: '{1}{W}',
  types: ['Artifact'],
  supertypes: ['Legendary'],
  produces: ['W', 'U', 'B', 'R', 'G'],
  manaOnly: 'planeswalker',
  text: '由你操控的衍生生物得+1/+0並具有警戒異能。\n{T}：加一點任意顏色的法術力。只能用來施放鵬洛客咒語。\n{1}{W}，棄掉此牌：此牌對目標進行攻擊或阻擋的生物造成4點傷害。',
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', token: true, ctrl: 'you' }, grant: { p: 1, kw: ['vigilance'] } } },
    act({ mana: '{1}{W}', discardSelf: true }, [{ e: 'damage', n: 4, to: 'T0' }], '棄掉：造成4點傷害', {
      fromHand: true,
      targets: [{ kind: 'creature', filter: { inCombat: true }, prompt: '選擇進行攻擊或阻擋的生物' }],
    }),
  ],
});

lcr('U', 'Koth of the Homestead', '{2}{W}', 'Human Citizen', 2, 3, '地落—每當一個地在你的操控下進戰場時，你獲得1點生命。\n每當一個平原在你的操控下進戰場時，在目標生物上放置一個+1/+1指示物。', {
  abilities: [
    trig('landfall', [{ e: 'gain', n: 1 }]),
    trig('landfall', [{ e: 'counters', what: 'T0', n: 1 }], { filter: { sub: 'Plains' }, targets: [CR] }),
  ],
});

lcr('R', 'Lyra, Archangel of Dawn', '{2}{W}', 'Angel Knight', 3, 3, '飛行\n每當你獲得生命時，在每個由你操控的天使上各放置一個+1/+1指示物。', {
  keywords: ['flying'],
  abilities: [trig('lifegain', [{ e: 'counters', what: { all: { type: 'Creature', sub: 'Angel', ctrl: 'you' } }, n: 1 }])],
});

lcr('U', 'Rescue Girl, First Responder', '{2}{W}', 'Human Cleric', 1, 3, '飛行\n{T}：將另一個目標由你操控的永久物移回其擁有者手上。只能在你的回合起動。', {
  keywords: ['flying'],
  abilities: [
    act({ tap: true }, [{ e: 'bounce', what: 'T0' }], '將另一個永久物移回手上', {
      cond: { c: 'yourTurn' },
      targets: [{ kind: 'permanent', filter: { ctrl: 'you' }, notSelf: true, prompt: '選擇另一個由你操控的永久物' }],
    }),
  ],
});

lcr('U', 'Saheeli, Consul of Oversight', '{3}{W}{W}', 'Human Advisor', 4, 4, `飛行\n每當你占卜或刺探時，派出一個${THOPTER}。此異能每回合只會觸發一次。`, {
  keywords: ['flying'],
  abilities: [trig('scry', [{ e: 'token', token: 'tok-thopter' }], { oncePerTurn: true })],
});

lcr('U', 'Teyo, Lightshield Expert', '{1}{W}', 'Human Cleric', 1, 1, '閃現\n當此生物進戰場時，目標由你操控的永久物獲得辟邪異能直到回合結束。若它是生物，在它上面放置一個+1/+1指示物。若它是鵬洛客，在它上面放置一個忠誠指示物。', {
  keywords: ['flash'],
  abilities: [
    etb(
      [
        { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['hexproof'] },
        { e: 'if', cond: { c: 'targetIs', t: 0, filter: { type: 'Creature' } }, then: [{ e: 'counters', what: 'T0', n: 1 }] },
        { e: 'if', cond: { c: 'targetIs', t: 0, filter: { type: 'Planeswalker' } }, then: [{ e: 'loyalty', what: 'T0', n: 1 }] },
      ],
      { targets: [{ kind: 'permanent', filter: { ctrl: 'you' }, prompt: '選擇由你操控的永久物' }] },
    ),
  ],
});

lcr('U', 'Thalia, the Survivor', '{3}{W}', 'Human Soldier', 3, 4, '繫命\n對手施放的非生物咒語費用多{1}。', {
  keywords: ['lifelink'],
  abilities: [{ kind: 'static', spellCostMore: { filter: { nonType: 'Creature' }, n: 1, who: 'opp' } }],
});

lcr('U', 'Tomik, Orzhov Lawmage', '{1}{W}', 'Human Advisor', 2, 1, '飛行\n由你操控的鵬洛客具有「每個戰鬥只能有一個生物攻擊此鵬洛客。」\n{T}：目標有+1/+1指示物的生物獲得飛行異能直到回合結束。', {
  keywords: ['flying'],
  abilities: [
    { kind: 'static', pwOneAttacker: true },
    act({ tap: true }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['flying'] }], '有指示物的生物獲得飛行', {
      targets: [{ kind: 'creature', filter: { plusCounters: true }, prompt: '選擇有+1/+1指示物的生物' }],
    }),
  ],
});

const WAY_HEAD = (n: number) => `當此結界進戰場時，${EMP(n)}`;
const grantPw = (abilities: ActivatedAbility[]): Ability => ({ kind: 'static', grantAbilities: { filter: { type: 'Planeswalker' }, abilities } });
const loyalty = (n: number, effects: Effect[], label: string, targets?: TargetSpec[]): ActivatedAbility => ({
  kind: 'activated',
  cost: { loyalty: n },
  effects,
  label,
  ...(targets ? { targets } : {}),
});

add({
  set: S, rarity: 'U', name: 'Way of the Healer', cost: '{3}{W}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(5)}\n由你操控的鵬洛客具有「[−2]：派出一個${CADET}。刺探1。」`,
  abilities: [etb([empower(5)]), grantPw([loyalty(-2, [cadet(), { e: 'surveil', n: 1 }], '−2：派出學員並刺探1')])],
});

add({
  set: S, rarity: 'U', name: 'Way of the Mentor', cost: '{2}{W}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(5)}\n每當你獲得生命時，在每個由你操控的鵬洛客上各放置一個忠誠指示物。`,
  abilities: [etb([empower(5)]), trig('lifegain', [{ e: 'loyalty', what: { all: MY_PW }, n: 1 }])],
});

lcr('U', 'Yoshimaru, Beloved Companion', '{2}{W}', 'Dog', 2, 2, '若一個或更多個+1/+1指示物將要被放置在由你操控的生物上，改為放置多一個的+1/+1指示物。\n{6}：在目標傳奇生物上放置一個+1/+1指示物。', {
  abilities: [
    { kind: 'static', counterPlus: 1 },
    act({ mana: '{6}' }, [{ e: 'counters', what: 'T0', n: 1 }], '傳奇生物+1/+1指示物', { targets: [{ kind: 'creature', filter: { legendary: true }, prompt: '選擇傳奇生物' }] }),
  ],
});

lcr('U', 'Yuriko, Blade of the Mighty', '{3}{W}', 'Human Samurai', 2, 3, '戰鬥中，玩家不能施放咒語或起動不是法術力異能的異能。\n每當由你操控的生物單獨攻擊一位玩家時，它獲得連擊異能直到回合結束。', {
  abilities: [{ kind: 'static', noCombatActions: true }, trig('youAttack', [{ e: 'pump', what: 'trig', p: 0, t: 0, kw: ['double_strike'] }], { alone: true })],
});

// ============================================================
// 藍
// ============================================================
sorc(S, 'R', 'Cruel Calculations', '{2}{U}', '抓X張牌，X為本回合從目標玩家的牌庫置入其墳墓場的牌數。', {
  targets: [{ kind: 'player', prompt: '選擇一位玩家' }],
  effects: [{ e: 'draw', n: { libToGy: 'T0' } }],
});

cr(S, 'C', 'Cryotheory Adept', '{1}{U}', 'Human Wizard', 2, 1, '勇行\n{3}{U}，從你的墳墓場放逐此牌：橫置目標生物，並在其上放置一個暈眩指示物。只能於法術時機起動。', {
  keywords: ['prowess'],
  abilities: [
    act({ mana: '{3}{U}' }, [{ e: 'tap', what: 'T0' }, { e: 'stun', what: 'T0' }], '橫置並放置暈眩指示物', { fromGraveyard: true, sorcery: true, targets: [CR] }),
  ],
});

prepared('R', 'Diviner of Victory', '{U}', 'Dwarf Wizard', 1, 1, ['', '每當你占卜或刺探時，此生物得+1/+1直到回合結束。'], 'Unwind History', '{1}{U}', ['Sorcery'], '將目標法術力值為3或更少，且由對手操控的生物移回其擁有者手上。刺探1。', {
  targets: [{ kind: 'creature', filter: { ctrl: 'opp', mvMax: 3 }, prompt: '選擇對手操控、法術力值3或更少的生物' }],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'surveil', n: 1 }],
}, { abilities: [trig('scry', [{ e: 'pump', what: 'self', p: 1, t: 1 }])] });

cr(S, 'C', 'Divining Duelist', '{2}{U}', 'Merfolk Wizard', 3, 2, '閃現\n當此生物進戰場時，選擇一項：\n• 橫置目標生物。\n• 重置目標生物。\n• 抓一張牌，然後棄一張牌。', {
  keywords: ['flash'],
  abilities: [
    etb([], {
      modes: [
        { text: '橫置目標生物', targets: [CR], effects: [{ e: 'tap', what: 'T0' }] },
        { text: '重置目標生物', targets: [CR], effects: [{ e: 'untap', what: 'T0' }] },
        { text: '抓一張牌，然後棄一張牌', effects: [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }] },
      ],
    }),
  ],
});

inst(S, 'C', 'Icy Reception', '{1}{U}', '選擇一項：\n• 反擊目標生物或傳奇咒語，除非其操控者支付{3}。\n• 目標生物得-5/-0直到回合結束。', {
  modes: [
    { text: '反擊生物或傳奇咒語，除非支付{3}', targets: [{ kind: 'spell', filter: { or: [{ type: 'Creature' }, { legendary: true }] }, prompt: '選擇生物或傳奇咒語' }], effects: [{ e: 'counterUnless', what: 'T0', pay: 3 }] },
    { text: '目標生物得-5/-0', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -5, t: 0 }] },
  ],
});

ench(S, 'C', 'Infinite Coursework', '{2}{U}', '結附於生物\n當此靈氣進戰場時，橫置所結附的生物。它不再是已準備。\n所結附的生物失去所有異能，且在其操控者的重置步驟中不會重置。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { loseAbilities: true, noUntap: true } },
  abilities: [etb([{ e: 'tap', what: 'attached' }, { e: 'unprepare', what: 'attached' }])],
});

inst(S, 'U', 'Perfected Theory', '{U}', '選擇一項：\n• 目標生物的基礎力量與防禦力為1/1，直到回合結束。\n• 目標生物的基礎力量與防禦力為4/5，直到回合結束。', {
  modes: [
    { text: '基礎力量與防禦力為1/1', targets: [CR], effects: [{ e: 'setBase', what: 'T0', p: 1, t: 1 }] },
    { text: '基礎力量與防禦力為4/5', targets: [CR], effects: [{ e: 'setBase', what: 'T0', p: 4, t: 5 }] },
  ],
});

ench(S, 'U', 'Plan for All Outcomes', '{3}{U}', `當此結界進戰場時，至多一個其他目標非地永久物的擁有者，將它放在其牌庫的頂端或底端（由該玩家選擇）。\n每當你施放你本回合的第一個非生物咒語時，${EMP(1)}。`, {
  abilities: [
    etb([{ e: 'topOrBottom', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { nonType: 'Land' }, optional: true, notSelf: true, prompt: '選擇至多一個其他非地永久物' }] }),
    trig('castNoncreature', [empower(1)], { when: { c: 'noncreatureCastEq', n: 1 } }),
  ],
});

inst(S, 'U', 'Precise Redaction', '{1}{U}', '反擊目標白色或黑色的咒語。', {
  targets: [{ kind: 'spell', filter: { color: ['W', 'B'] }, prompt: '選擇白色或黑色的咒語' }],
  effects: [{ e: 'counter', what: 'T0' }],
});

prepared('C', 'Semester Foreseer', '{3}{U}', 'Human Wizard', 3, 4, ['', '當此生物進戰場時，刺探1。'], 'Peer Review', '{2}{W/U}', ['Sorcery'], `派出一個${CADET}。刺探1。`, {
  effects: [cadet(), { e: 'surveil', n: 1 }],
}, { abilities: [etb([{ e: 'surveil', n: 1 }])] });

cr(S, 'R', 'Sphinx of False Conclusions', '{2}{U}{U}', 'Sphinx Illusion', 4, 2, '閃現\n飛行\n每當此生物攻擊時，抓一張牌，然後棄一張牌。\n當此生物死去時，若它不是衍生物，派出一個它的衍生物複製。', {
  keywords: ['flash', 'flying'],
  abilities: [
    trig('attacks', [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }]),
    trig('dies', [{ e: 'copyOfSelf' }], { cond: { c: 'selfNotToken' } }),
  ],
});

inst(S, 'C', "Sphinx's Approach", '{1}{U}{U}', '抓兩張牌。然後你可以放逐此咒語與你墳墓場中四張名為「Sphinx\'s Approach」的牌。若你如此作，從你的牌庫中搜尋一張人面獅身生物牌，將它放進戰場，然後洗牌。\n套牌中可以有任意數量名為「Sphinx\'s Approach」的牌。', {
  effects: [
    { e: 'draw', n: 2 },
    { e: 'costThen', prompt: "要放逐此咒語與四張名為 Sphinx's Approach 的牌，搜尋人面獅身嗎？", cost: { exileNamed: 4 }, then: [{ e: 'tutor', filter: { type: 'Creature', sub: 'Sphinx' }, to: 'battlefield' }] },
  ],
}, { anyNumber: true });

cr(S, 'C', 'Surveillance Phantasm', '{1}{U}', 'Bird Illusion', 2, 3, '防衛，飛行，警戒\n只要你本回合占卜或刺探過，此生物可以攻擊，如同它沒有防衛異能。\n{3}{U}：刺探1。', {
  keywords: ['defender', 'flying', 'vigilance'],
  abilities: [
    { kind: 'static', self: { cond: { c: 'scried' }, grant: { ignoreDefender: true } } },
    act({ mana: '{3}{U}' }, [{ e: 'surveil', n: 1 }], '刺探1'),
  ],
});

cr(S, 'R', "Theorist's Proxy", '{1}{U}', 'Illusion', 0, 3, `閃現\n當此生物進戰場時，${EMP(3)}\n{U}，犧牲此生物：你本回合施放的下一個咒語不能被反擊。`, {
  keywords: ['flash'],
  abilities: [etb([empower(3)]), act({ mana: '{U}', sacSelf: true }, [{ e: 'nextSpellUncounterable' }], '下一個咒語不能被反擊')],
});

prepared('R', 'Variable Chaser', '{2}{U}', 'Human Wizard', 2, 3, '飛行，勇行', 'Arc of Fortune', '{2}{U}', ['Sorcery'], '每位玩家可以棄掉手牌，然後抓七張牌。', { effects: [{ e: 'wheel' }] }, { keywords: ['flying', 'prowess'] });

lcr('U', 'Arni, Humble Scribe', '{2}{U}', 'Human Wizard', 3, 2, '每當另一個非衍生物的生物在你的操控下進戰場時，重置此生物。\n{T}：抓一張牌，然後棄一張牌。', {
  abilities: [
    trig('allyEtb', [{ e: 'untap', what: 'self' }], { filter: { token: false } }),
    act({ tap: true }, [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }], '抓一張牌，然後棄一張牌'),
  ],
});

lcr('U', 'Fblthp, Impossibly Lost', '{1}{U}', 'Homunculus', 1, 1, '每當你的回合中一個或更多對手被造成戰鬥傷害時，抓兩張牌。若你的牌庫中沒有牌，你贏得這場遊戲。此生物的擁有者將它洗入其牌庫。', {
  abilities: [trig('oppCombatDamaged', [{ e: 'draw', n: 2 }, { e: 'if', cond: { c: 'libraryEmpty' }, then: [{ e: 'win' }] }, { e: 'shuffleIn', what: 'self' }])],
});

lcr('U', 'Hapatra, the Desert Frost', '{3}{U}', 'Human Wizard', 4, 3, '當此生物進戰場時，對每位對手，橫置至多一個由該玩家操控的目標生物，並在其上放置一個暈眩指示物。\n{2}{U}：重置目標生物。', {
  abilities: [
    etb([{ e: 'tap', what: 'T0' }, { e: 'stun', what: 'T0' }], { targets: [{ ...OPP_CR, optional: true }] }),
    act({ mana: '{2}{U}' }, [{ e: 'untap', what: 'T0' }], '重置目標生物', { targets: [CR] }),
  ],
});

lcr('R', 'Lyra, Tolarian Archangel', '{1}{U}{U}', 'Angel Wizard', 3, 3, '飛行\n在每個結束步驟開始時，若你本回合抓了三張或更多牌，派出一個3/3藍色，具有飛行異能的天使衍生生物。\n{3}{U}{U}：直到回合結束，每當此生物對玩家造成戰鬥傷害時，抓兩張牌。', {
  keywords: ['flying'],
  abilities: [
    trig('eachEndStep', [{ e: 'token', token: 'tok-fra-angel' }], { cond: { c: 'drawsGte', n: 3 } }),
    act({ mana: '{3}{U}{U}' }, [{ e: 'delayed', on: 'combatDamagePlayer', effects: [{ e: 'draw', n: 2 }], once: false }], '本回合造成戰鬥傷害時抓兩張牌'),
  ],
});

lcr('U', 'Proft, Consulting Detective', '{1}{U}', 'Human Detective', 2, 2, '每當你占卜或刺探時，你可以支付{2}。若你如此作，在此生物上放置一個+1/+1指示物，並抓一張牌。', {
  abilities: [trig('scry', [{ e: 'costThen', prompt: '要支付{2}，放置一個+1/+1指示物並抓一張牌嗎？', cost: { mana: '{2}' }, then: [{ e: 'counters', what: 'self', n: 1 }, { e: 'draw', n: 1 }] }])],
});

lcr('U', 'Ruric Thar, Biomagus', '{4}{U}{U}', 'Ogre Crab Wizard', 4, 6, '飛行\n勇行，勇行\n每當此生物成為對手操控的咒語或異能的目標時，抓一張牌。', {
  keywords: ['flying', 'prowess'],
  abilities: [trig('castNoncreature', [{ e: 'pump', what: 'self', p: 1, t: 1 }]), trig('targetedByOpp', [{ e: 'draw', n: 1 }])],
});

lcr('R', 'Samut, Tyrant of Naktamun', '{1}{U}', 'Human Wizard', 2, 1, '由你操控的瞬間與法術咒語具有切割。（堆疊上有切割咒語時，玩家不能施放咒語或起動不是法術力異能的異能。）', {
  abilities: [{ kind: 'static', splitSecondSpells: true }],
});

lcr('U', 'Tetsuko Umezawa, Fugitive', '{1}{U}', 'Human Rogue', 1, 3, '由你操控的力量或防禦力為1或更少的生物不能被阻擋。', {
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', or: [{ powMax: 1 }, { toughMax: 1 }] }, grant: { kw: ['unblockable'] } } }],
});

add({
  set: S, rarity: 'U', name: 'Traxos, Academy Guardian', cost: '{3}{U}', types: ['Artifact', 'Creature'], supertypes: ['Legendary'], subtypes: ['Dragon', 'Construct'],
  power: 1, toughness: 5, keywords: ['flying', 'vigilance', 'prowess'],
  text: '如果你本回合施放過非生物咒語，此咒語減少{2}來施放。\n飛行，警戒\n勇行',
  costReduce: { cond: { c: 'noncreatureCastGte', n: 1 }, mana: '{2}' },
});

add({
  set: S, rarity: 'U', name: 'Way of the Cryomancer', cost: '{2}{U}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(5)}\n由你操控的鵬洛客具有「[−3]：當你本回合下一次施放瞬間或法術咒語時，複製該咒語。你可以選擇複製品的新目標。」`,
  abilities: [etb([empower(5)]), grantPw([loyalty(-3, [{ e: 'delayed', on: 'castInstSorc', effects: [{ e: 'copySpell' }] }], '−3：複製下一個瞬間或法術')])],
});

add({
  set: S, rarity: 'U', name: 'Way of the Mind Sculptor', cost: '{4}{U}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(5)}\n每當你起動忠誠異能時，若你為了起動它而移除了兩個或更多忠誠指示物，抓一張牌。`,
  abilities: [etb([empower(5)]), trig('loyaltyActivated', [{ e: 'draw', n: 1 }], { minRemoved: 2 })],
});

lcr('U', 'Yuriko, Hope from the Shadows', '{U}', 'Human Ninja', 1, 1, '閃現\n當此生物進戰場時，選擇一項：\n• 目標生物得-X/-0直到回合結束，X為你墳墓場中的牌數。\n• 刺探2。', {
  keywords: ['flash'],
  abilities: [
    etb([], {
      modes: [
        { text: '目標生物得-X/-0（X為你墳墓場中的牌數）', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: { negOf: { gy: {} } }, t: 0 }] },
        { text: '刺探2', effects: [{ e: 'surveil', n: 2 }] },
      ],
    }),
  ],
});

// ============================================================
// 黑
// ============================================================
const GY_CR_PW: Filter = { type: ['Creature', 'Planeswalker'] };
const loyaltyTarget = (kw: Keyword): Effect[] => [
  { e: 'pump', what: 'T0', p: 0, t: 0, kw: [kw] },
  { e: 'if', cond: { c: 'targetIs', t: 0, filter: { type: 'Creature' } }, then: [{ e: 'counters', what: 'T0', n: 1 }] },
  { e: 'if', cond: { c: 'targetIs', t: 0, filter: { type: 'Planeswalker' } }, then: [{ e: 'loyalty', what: 'T0', n: 1 }] },
];

prepared('M', 'Bloodline Recollector', '{1}{B}', 'Vampire Warlock', 2, 2, ['在每個結束步驟開始時，若本回合有三個或更多生物死去，此生物成為已準備。', ''], 'Ancestral Craving', '{B}', ['Instant'], '目標玩家抓三張牌並失去3點生命。', {
  targets: [{ kind: 'player', prompt: '選擇一位玩家' }],
  effects: [{ e: 'draw', n: 3, who: 'T0' }, { e: 'lose', n: 3, who: 'T0' }],
}, { abilities: [trig('eachEndStep', [{ e: 'prepare' }], { cond: { c: 'creaturesDiedGte', n: 3 } })] }, false);

inst(S, 'U', 'Break Under Pressure', '{2}{B}', '目標對手犧牲由其操控的生物與鵬洛客中，法術力值最大的一個。你獲得2點生命。', {
  targets: [OPP],
  effects: [{ e: 'edictMax', who: 'T0' }, { e: 'gain', n: 2 }],
});

sorc(S, 'C', 'Cast Away Doubt', '{2}{B}', '抓兩張牌。此咒語對每位玩家各造成2點傷害。', {
  effects: [{ e: 'draw', n: 2 }, { e: 'damage', n: 2, to: 'players' }],
});

cr(S, 'M', 'Darklight Phoenix', '{3}{B}', 'Phoenix', 3, 2, '飛行，敏捷\n在你回合的戰鬥開始時，若本回合有兩個或更多生物死去，將此牌從你的墳墓場移回戰場。', {
  keywords: ['flying', 'haste'],
  abilities: [trig('combatStart', [{ e: 'reanimate', what: 'selfAny' }], { fromGraveyard: true, cond: { c: 'creaturesDiedGte', n: 2 } })],
});

inst(S, 'C', 'Extended Absence', '{3}{B}', '放逐目標生物或鵬洛客。此咒語對每位對手各造成1點傷害，且你獲得1點生命。', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'] }, prompt: '選擇生物或鵬洛客' }],
  effects: [{ e: 'exile', what: 'T0' }, { e: 'damage', n: 1, to: 'opp' }, { e: 'gain', n: 1 }],
});

sorc(S, 'R', 'Extrapolate the Impossible', '{1}{B}', '你可以展示兩張你擁有、名稱不同、在遊戲外的牌。由一位對手選擇其中一張。你將那張牌加入你的手牌。\n（本遊戲沒有備牌，因此沒有遊戲外的牌可以展示，此咒語沒有效果。）', { effects: [] });

inst(S, 'U', 'Multiply by Zero', '{1}{B}', '目標生物的基礎力量與防禦力為0/0，直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'setBase', what: 'T0', p: 0, t: 0 }],
});

sorc(S, 'M', 'Overwrite the Multiverse', '{4}{B}{B}', `放逐所有生物。強化傑斯X，X為以此法放逐的生物數量。${EMP_X}`, {
  effects: [{ e: 'exile', what: { all: { type: 'Creature' } } }, empower({ last: true })],
});

sorc(S, 'U', 'Rewrite Regrets', '{3}{B}', `將目標法術力值為6或更少的生物或鵬洛客牌從你的墳墓場移回戰場。\n${EMP(2)}`, {
  targets: [gyTarget({ type: ['Creature', 'Planeswalker'], mvMax: 6 }, '選擇你墳墓場中法術力值6或更少的生物或鵬洛客牌')],
  effects: [{ e: 'reanimate', what: 'T0' }, empower(2)],
});

inst(S, 'R', 'Rise of the Deathbringer', '{4}{B}', '選擇一項：\n• 抓牌，張數等同於由你操控的生物中最大的力量。你失去等同於以此法抓牌張數的生命。\n• 所有生物得-3/-3直到回合結束。', {
  modes: [
    { text: '抓牌並失去等量生命', effects: [{ e: 'draw', n: { maxPower: MY_CREATURES } }, { e: 'lose', n: { last: true }, who: 'you' }] },
    { text: '所有生物得-3/-3', effects: [{ e: 'pump', what: { all: { type: 'Creature' } }, p: -3, t: -3 }] },
  ],
});

cr(S, 'R', 'Sanctum Lurker', '{2}{B}', 'Horror', 3, 2, `當此生物進戰場時，${EMP(1)}\n由你操控的鵬洛客不會因為忠誠為0而置入其擁有者的墳墓場。\n由你操控的鵬洛客具有「[+2]：此鵬洛客對每位對手各造成1點傷害，且你獲得1點生命。」`, {
  abilities: [
    etb([empower(1)]),
    { kind: 'static', noZeroLoyaltyDeath: true },
    grantPw([loyalty(2, [{ e: 'damage', n: 1, to: 'opp' }, { e: 'gain', n: 1 }], '+2：對每位對手造成1點傷害並獲得1點生命')]),
  ],
});

cr(S, 'C', 'Screeching Soulbreaker', '{2}{B}', 'Siren Bard', 1, 4, '飛行\n每當此生物攻擊時，它對每位對手各造成1點傷害，且你獲得1點生命。', {
  keywords: ['flying'],
  abilities: [trig('attacks', [{ e: 'damage', n: 1, to: 'opp' }, { e: 'gain', n: 1 }])],
});

sorc(S, 'C', 'Silence the Echo', '{1}{B}', '作為施放此咒語的額外費用，犧牲一個生物或鵬洛客，或支付{3}。\n消滅目標生物或鵬洛客。', {
  modes: [
    { text: '犧牲一個生物或鵬洛客', sac: GY_CR_PW, targets: [{ kind: 'permanent', filter: GY_CR_PW, prompt: '選擇生物或鵬洛客' }], effects: [{ e: 'destroy', what: 'T0' }] },
    { text: '支付{3}', cost: '{4}{B}', targets: [{ kind: 'permanent', filter: GY_CR_PW, prompt: '選擇生物或鵬洛客' }], effects: [{ e: 'destroy', what: 'T0' }] },
  ],
});

sorc(S, 'C', 'Solve for Disappointment', '{1}{B}', `目標對手展示其手牌。你從中選擇一張非地的永久物牌。該玩家棄掉那張牌。\n${EMP(1)}`, {
  targets: [OPP],
  effects: [{ e: 'discardChosen', who: 'T0', filter: { nonType: ['Land', 'Instant', 'Sorcery'] } }, empower(1)],
});

inst(S, 'U', 'Terminal Criticism', '{1}{B}', '消滅目標藍色或紅色的生物或鵬洛客。你獲得1點生命。', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'], color: ['U', 'R'] }, prompt: '選擇藍色或紅色的生物或鵬洛客' }],
  effects: [{ e: 'destroy', what: 'T0' }, { e: 'gain', n: 1 }],
});

cr(S, 'C', 'Theoretical Necromancer', '{2}{B}', 'Vampire Warlock', 4, 1, '{3}{B}，從你的墳墓場放逐此牌：將另一張目標生物牌從你的墳墓場移回你手上。', {
  abilities: [act({ mana: '{3}{B}' }, [{ e: 'toHand', what: 'T0' }], '另一張生物牌回手', { fromGraveyard: true, targets: [{ ...gyTarget({ type: 'Creature' }, '選擇你墳墓場中的另一張生物牌'), notSelf: true }] })],
});

prepared('C', 'Void Extrapolator', '{1}{B}', 'Aetherborn Warlock', 2, 2, ['', '門檻—只要你的墳墓場中有七張或更多牌，此生物便得+1/+1。'], 'Omit Variables', '{U/B}', ['Sorcery'], '碾磨三張牌。（將你牌庫頂的三張牌置入你的墳墓場。）', {
  effects: [{ e: 'mill', n: 3 }],
}, { abilities: [{ kind: 'static', self: { cond: { c: 'gyCount', filter: {}, n: 7 }, grant: { p: 1, t: 1 } } }] });

lcr('U', 'Danitha, Spear of Agony', '{2}{B}', 'Human Knight', 2, 2, '先攻\n每當你施放以對手或由對手操控的生物為目標的咒語時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['first_strike'],
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }], { targetsOpp: true })],
});

lcr('U', 'Gallia, Tragic Host', '{1}{B}', 'Zombie Satyr', 2, 1, '威懾\n{4}{B}，從你的墳墓場放逐另一張生物牌：將此牌從你的墳墓場橫置放回戰場，並帶有一個+1/+1指示物。', {
  keywords: ['menace'],
  abilities: [
    act({ mana: '{4}{B}' }, [{ e: 'costThen', prompt: '選擇要放逐的另一張生物牌', cost: { exileGy: { type: 'Creature' } }, then: [{ e: 'reanimate', what: 'selfAny', tapped: true, counters: 1 }] }], '放逐另一張生物牌：回到戰場', {
      fromGraveyard: true,
      keepSelf: true,
      cond: { c: 'gyCount', filter: { type: 'Creature' }, n: 2 },
    }),
  ],
});

lcr('R', 'Gideon the Oathless', '{2}{B}', 'Human Mercenary', 3, 3, '守護—棄掉一張牌\n每當由對手操控的生物進戰場時，此生物對該玩家造成1點傷害。\n每當對手起動忠誠異能時，此生物對該玩家造成1點傷害。', {
  wardDiscard: true,
  abilities: [
    trig('anyEtb', [{ e: 'damage', n: 1, to: 'opp' }], { filter: { ctrl: 'opp' } }),
    trig('oppLoyaltyActivated', [{ e: 'damage', n: 1, to: 'opp' }]),
  ],
});

lcr('R', 'Liliana the Repentant', '{1}{B}', 'Human Warlock', 2, 2, '每當另一個由你操控的生物或鵬洛客進戰場時，碾磨兩張牌。\n竭力—{5}{B}：將目標生物或鵬洛客牌從你的墳墓場移回戰場。在此生物上放置一個+1/+1指示物。只能於法術時機起動。（每個竭力異能只能起動一次。）', {
  abilities: [
    trig('allyPermEtb', [{ e: 'mill', n: 2 }], { filter: GY_CR_PW }),
    act({ mana: '{5}{B}' }, [{ e: 'reanimate', what: 'T0' }, { e: 'counters', what: 'self', n: 1 }], '竭力：生物或鵬洛客牌回到戰場', {
      oncePerGame: true,
      sorcery: true,
      targets: [gyTarget(GY_CR_PW, '選擇你墳墓場中的生物或鵬洛客牌')],
    }),
  ],
});

lcr('U', 'Loot, the Anomaly', '{2}{B}', 'Beast Horror', -2, 4, '若此生物的力量為負，它以力量為正來分配戰鬥傷害。\n門檻—犧牲另一個生物或鵬洛客：此生物得-2/-0直到回合結束。只能在你的墳墓場中有七張或更多牌時起動。', {
  abilities: [
    { kind: 'static', self: { grant: { damageAbs: true } } },
    act({ sacOther: { type: ['Creature', 'Planeswalker'], other: true } }, [{ e: 'pump', what: 'self', p: -2, t: 0 }], '犧牲另一個生物：得-2/-0', { cond: { c: 'gyCount', filter: {}, n: 7 } }),
  ],
});

lcr('U', 'Mabel, Bitter Recluse', '{B}', 'Mouse Warlock', 1, 1, '死觸\n當此生物進戰場時，從另一個目標生物或鵬洛客上移除至多三個指示物。', {
  keywords: ['deathtouch'],
  abilities: [etb([{ e: 'removeCounters', what: 'T0', n: 3, upTo: true }], { targets: [{ kind: 'permanent', filter: GY_CR_PW, notSelf: true, prompt: '選擇另一個生物或鵬洛客' }] })],
});

lcr('U', 'Massacre Girl, Most Wanted', '{4}{B}', 'Human Assassin', 4, 4, '每當另一個由你操控的生物或鵬洛客死去時，此生物對目標對手造成1點傷害，且你獲得1點生命。\n每當對手被造成非戰鬥傷害時，在此生物上放置一個+1/+1指示物。', {
  abilities: [
    trig('allyDies', [{ e: 'damage', n: 1, to: 'T0' }, { e: 'gain', n: 1 }], { includePw: true, targets: [OPP] }),
    trig('noncombatOpp', [{ e: 'counters', what: 'self', n: 1 }]),
  ],
});

lcr('U', 'Proft, Sinister Mastermind', '{2}{B}', 'Human Rogue', 5, 5, '門檻—除非你的墳墓場中有七張或更多牌，否則你不能施放此咒語。\n威懾\n{B}，棄掉此牌：目標生物得-3/-1直到回合結束。', {
  keywords: ['menace'],
  castCond: { c: 'gyCount', filter: {}, n: 7 },
  abilities: [act({ mana: '{B}', discardSelf: true }, [{ e: 'pump', what: 'T0', p: -3, t: -1 }], '棄掉：目標生物得-3/-1', { fromHand: true, targets: [CR] })],
});

lcr('U', 'Teyo, Diamondblade Mage', '{3}{B}', 'Human Warlock', 3, 1, '閃現\n當此生物進戰場時，目標由你操控的永久物獲得死觸異能直到回合結束。若它是生物，在它上面放置一個+1/+1指示物。若它是鵬洛客，在它上面放置一個忠誠指示物。', {
  keywords: ['flash'],
  abilities: [etb(loyaltyTarget('deathtouch'), { targets: [{ kind: 'permanent', filter: { ctrl: 'you' }, prompt: '選擇由你操控的永久物' }] })],
});

lcr('U', 'Tinybones, Pocket Nuisance', '{2}{B}', 'Skeleton Rogue', 2, 1, '當此生物進戰場時，每位對手棄一張牌。\n每當一位玩家棄掉一張或更多牌時，此生物對每位對手各造成1點傷害。', {
  abilities: [etb([{ e: 'discard', n: 1, who: 'opp' }]), trig('anyDiscard', [{ e: 'damage', n: 1, to: 'opp' }])],
});

add({
  set: S, rarity: 'U', name: 'Way of the Deathbringer', cost: '{2}{B}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(5)}\n由你操控的鵬洛客具有「[−2]：你可以犧牲一個生物。若你如此作，派出一個4/4綠色，具有踐踏異能的野獸衍生生物。」`,
  abilities: [
    etb([empower(5)]),
    grantPw([loyalty(-2, [{ e: 'costThen', prompt: '要犧牲一個生物，派出一個4/4的野獸嗎？', cost: { sac: { type: 'Creature' } }, then: [{ e: 'token', token: 'tok-beast-trample' }] }], '−2：犧牲生物派出4/4野獸')]),
  ],
});

add({
  set: S, rarity: 'U', name: 'Way of the Necromancer', cost: '{1}{B}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(2)}\n每當一個由你操控的生物死去時，在每個由你操控的鵬洛客上各放置一個忠誠指示物。`,
  abilities: [etb([empower(2)]), trig('allyDies', [{ e: 'loyalty', what: { all: MY_PW }, n: 1 }], { includeSelf: true })],
});

lcr('U', 'Winter, Tormented Loner', '{2}{B}', 'Human Warlock', 0, 3, '當此生物進戰場時，你可以犧牲一個生物或鵬洛客。當你如此作時，每位對手犧牲一個由其選擇的生物。\n此生物每有一張在你的墳墓場中的生物牌與鵬洛客牌，便得+1/+0。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '要犧牲一個生物或鵬洛客，讓每位對手犧牲一個生物嗎？', cost: { sac: GY_CR_PW }, then: [{ e: 'edict', who: 'opp', filter: { type: 'Creature' } }] }]),
    { kind: 'static', selfPumpPerGy: { filter: GY_CR_PW, p: 1 } },
  ],
});

// ============================================================
// 紅
// ============================================================
const MY_ARTIFACTS: Filter = { type: 'Artifact', ctrl: 'you' };
const dragon5 = { e: 'token', token: 'tok-fra-dragon' } as const;

sorc(S, 'U', 'Command the Stage', '{2}{R}', `派出一個${CADET}，然後在每個其他由你操控的巫師衍生物上各放置一個+1/+1指示物。\n在每個維持開始時，若上個回合有對手被造成非戰鬥傷害，將此牌從你的墳墓場移回你手上。`, {
  effects: [{ e: 'counters', what: { all: { type: 'Creature', sub: 'Wizard', token: true, ctrl: 'you' } }, n: 1 }, cadet()],
}, { abilities: [trig('eachUpkeep', [{ e: 'toHand', what: 'selfAny' }], { fromGraveyard: true, cond: { c: 'oppNoncombatLastTurn' } })] });

add({
  set: S, rarity: 'M', name: 'Craterclaw Colossus', cost: '{4}{R}{R}{R}', types: ['Artifact', 'Creature'], subtypes: ['Beast', 'Construct'], power: 5, toughness: 5, keywords: ['haste'],
  text: '敏捷\n當此生物進戰場時，由你操控的生物獲得踐踏異能，並得+X/+0直到回合結束，X為由你操控的神器數量。',
  abilities: [etb([{ e: 'pump', what: { all: MY_CREATURES }, p: { count: MY_ARTIFACTS }, t: 0, kw: ['trample'] }])],
});

cr(S, 'R', 'Curse-Marred Demon', '{2}{R}{R}', 'Demon', 4, 4, '飛行，踐踏\n當此生物進戰場時，從你的牌庫中搜尋一張牌，將它置於你手上，然後洗牌，然後隨機棄一張牌。', {
  keywords: ['flying', 'trample'],
  abilities: [etb([{ e: 'tutor', filter: {} }, { e: 'discard', n: 1, who: 'you', random: true }])],
});

cr(S, 'R', 'Draconic Visitor', '{3}{R}{R}', 'Dragon', 5, 5, '飛行\n如果一個或更多神器衍生物將在你的操控下被派出，改為派出同樣數量的5/5紅色，具有飛行異能的龍衍生生物。', {
  keywords: ['flying'],
  abilities: [{ kind: 'static', artifactTokenDragon: true }],
});

cr(S, 'C', 'Eardrum Rattler', '{1}{R}', 'Human Bard', 2, 2, '{1}，{T}：另一個目標力量為2或更少，且由你操控的生物本回合不能被阻擋。', {
  abilities: [act({ mana: '{1}', tap: true }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['unblockable'] }], '另一個生物本回合不能被阻擋', { targets: [{ kind: 'creature', filter: { ctrl: 'you', powMax: 2 }, notSelf: true, prompt: '選擇另一個力量2或更少的生物' }] })],
});

inst(S, 'U', 'Essence Burn', '{1}{R}', '此咒語對目標黑色或綠色的生物或鵬洛客造成5點傷害。如果該永久物本回合將要死去，改為放逐它。', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'], color: ['B', 'G'] }, prompt: '選擇黑色或綠色的生物或鵬洛客' }],
  effects: [{ e: 'exileIfDies', what: 'T0' }, { e: 'damage', n: 5, to: 'T0' }],
});

sorc(S, 'R', 'Face Yourself', '{5}{R}{R}', '對目標玩家操控的每個生物，派出一個它的衍生物複製，但它具有敏捷異能與「在結束步驟開始時，若你沒有操控鵬洛客，犧牲此生物。」', {
  targets: [{ kind: 'player', prompt: '選擇一位玩家' }],
  effects: [{ e: 'copyCreatures', who: 'T0' }],
});

inst(S, 'U', 'Fulminous Forte', '{2}{R}', '選擇一項：\n• 此咒語對每個由對手操控的生物與鵬洛客各造成1點傷害。\n• 此咒語對目標生物或鵬洛客造成5點傷害。', {
  modes: [
    { text: '對對手的每個生物與鵬洛客造成1點傷害', effects: [{ e: 'damage', n: 1, to: { all: { type: ['Creature', 'Planeswalker'], ctrl: 'opp' } } }] },
    { text: '對目標生物或鵬洛客造成5點傷害', targets: [{ kind: 'permanent', filter: GY_CR_PW, prompt: '選擇生物或鵬洛客' }], effects: [{ e: 'damage', n: 5, to: 'T0' }] },
  ],
});

prepared('C', 'Hallway Heckler', '{2}{R}', 'Elemental Sorcerer', 2, 3, ['', '{T}，棄一張牌：抓一張牌。'], 'Vicious Verse', '{B/R}', ['Sorcery'], '此咒語對目標對手造成1點傷害。', {
  targets: [OPP],
  effects: [{ e: 'damage', n: 1, to: 'T0' }],
}, {
  abilities: [act({ tap: true }, [{ e: 'costThen', prompt: '要棄一張牌來抓一張牌嗎？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }], '棄一張牌：抓一張牌', { cond: { c: 'handGte', n: 1 } })],
});

cr(S, 'C', 'Heartstring Puller', '{3}{R}', 'Elf Sorcerer', 3, 1, `踐踏\n當此生物進戰場時，派出一個${CADET}。`, {
  keywords: ['trample'],
  abilities: [etb([cadet()])],
});

ench(S, 'R', 'Identity Echo', '{2}{R}', '{3}{R}：放逐目標由你操控的生物或鵬洛客。展示你牌庫頂的牌，直到展示出生物或鵬洛客牌為止。將那張牌放進戰場，其餘的牌以隨機順序置於你的牌庫底。只能於法術時機起動。', {
  abilities: [act({ mana: '{3}{R}' }, [{ e: 'exile', what: 'T0' }, { e: 'revealUntil', filter: GY_CR_PW }], '放逐你的生物並換成新的', { sorcery: true, targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'], ctrl: 'you' }, prompt: '選擇由你操控的生物或鵬洛客' }] })],
});

cr(S, 'R', 'Master of Barbs', '{1}{R}', 'Lizard Bard', 2, 1, '威懾\n每當一位或更多對手被造成非戰鬥傷害時，由你操控的生物得+1/+0直到回合結束。', {
  keywords: ['menace'],
  abilities: [trig('noncombatOpp', [{ e: 'pump', what: { all: MY_CREATURES }, p: 1, t: 0 }])],
});

prepared('R', 'Pompous Battlemage', '{R}', 'Goblin Sorcerer', 1, 1, '勇行', 'Improvised Act', '{R}', ['Sorcery'], '你可以棄一張牌。若你如此作，抓一張牌。', {
  effects: [{ e: 'costThen', prompt: '要棄一張牌來抓一張牌嗎？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }],
}, { keywords: ['prowess'] });

prepared('R', 'Pyre Rhymer', '{1}{R}{R}', 'Elemental Sorcerer', 3, 3, '勇行', 'Molten Tide', '{R}', ['Instant'], '直到回合結束，每當你為山脈橫置來產生法術力時，額外加{R}。', {
  effects: [{ e: 'mountainBonus' }],
}, { keywords: ['prowess'] });

cr(S, 'M', 'Stingcaster Mage', '{1}{R}', 'Human Wizard', 2, 1, '敏捷\n當此生物進戰場時，目標在你墳墓場中的瞬間或法術牌，直到回合結束獲得返照異能。其返照費用等同於它的法術力費用。', {
  keywords: ['haste'],
  abilities: [etb([{ e: 'grantFlashback', what: 'T0' }], { targets: [gyTarget({ type: ['Instant', 'Sorcery'] }, '選擇你墳墓場中的瞬間或法術牌')] })],
});

cr(S, 'C', 'Tether Technician', '{4}{R}', 'Minotaur Artificer', 4, 5, '延勢\n當此生物進戰場時，你可以棄一張牌。當你如此作時，此生物對任意一個目標造成2點傷害。', {
  keywords: ['reach'],
  abilities: [etb([{ e: 'costThen', prompt: '要棄一張牌，對任意一個目標造成2點傷害嗎？', cost: { discard: 1 }, then: [{ e: 'reflexive', targets: [ANY], effects: [{ e: 'damage', n: 2, to: 'T0' }] }] }])],
});

inst(S, 'U', 'Violent Echoes', '{2}{R}{R}', `此咒語對目標生物或鵬洛客造成6點傷害。若對該永久物造成了過量傷害，強化傑斯X，X為該過量傷害。${EMP_X}`, {
  targets: [{ kind: 'permanent', filter: GY_CR_PW, prompt: '選擇生物或鵬洛客' }],
  effects: [{ e: 'damage', n: 6, to: 'T0' }, empower({ excess: true })],
});

inst(S, 'C', 'Wrath of the Bloodmane', '{2}{R}', '如果你操控傳奇生物，此咒語減少{1}來施放。\n此咒語對目標生物或鵬洛客造成4點傷害。', {
  targets: [{ kind: 'permanent', filter: GY_CR_PW, prompt: '選擇生物或鵬洛客' }],
  effects: [{ e: 'damage', n: 4, to: 'T0' }],
}, { costReduce: { cond: { c: 'controls', filter: { type: 'Creature', legendary: true } }, mana: '{1}' } });

lcr('U', 'Arni, Renowned Champion', '{3}{R}', 'Human Berserker', 1, 5, '踐踏\n每當另一個生物在你的操控下進戰場時，此生物得+X/+0直到回合結束，X為該生物的力量。', {
  keywords: ['trample'],
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: { power: 'trig' }, t: 0 }])],
});

lcr('U', 'Gallia, the Merrymaker', '{1}{R}', 'Satyr', 2, 1, '敏捷\n每個其他有+1/+1指示物，且由你操控的生物都具有敏捷異能。\n{1}{R}，{T}：在目標本回合進戰場的生物上放置一個+1/+1指示物。', {
  keywords: ['haste'],
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', other: true, plusCounters: true }, grant: { kw: ['haste'] } } },
    act({ mana: '{1}{R}', tap: true }, [{ e: 'counters', what: 'T0', n: 1 }], '本回合進戰場的生物+1/+1指示物', { targets: [{ kind: 'creature', filter: { enteredThisTurn: true }, prompt: '選擇本回合進戰場的生物' }] }),
  ],
});

lcr('U', 'Jiang Yanggu, Alone', '{4}{R}', 'Human Berserker', 4, 4, '威懾\n每當由你操控的生物單獨攻擊一位玩家時，棄一張牌，然後抓一張牌。然後在該生物上放置你本回合已棄掉的牌數個+1/+1指示物。', {
  keywords: ['menace'],
  abilities: [trig('youAttack', [{ e: 'discard', n: 1, who: 'you' }, { e: 'draw', n: 1 }, { e: 'counters', what: 'trig', n: { discardedThisTurn: true } }], { alone: true })],
});

lcr('U', 'Kiora of Fire and Ashes', '{4}{R}{R}', 'Merfolk Noble', 2, 2, '當此生物進戰場時，派出一個5/5紅色，具有飛行異能的龍衍生生物。\n{8}：派出一個5/5紅色，具有飛行異能的龍衍生生物。', {
  abilities: [etb([dragon5]), act({ mana: '{8}' }, [dragon5], '派出一個5/5龍')],
});

lcr('U', 'Koth, the Geomancer', '{2}{R}', 'Human Warrior', 3, 2, '延勢\n地落—每當一個地在你的操控下進戰場時，此生物對每位對手各造成1點傷害。若該地是山脈，加{R}。', {
  keywords: ['reach'],
  abilities: [trig('landfall', [{ e: 'damage', n: 1, to: 'opp' }, { e: 'if', cond: { c: 'evCardIs', filter: { sub: 'Mountain' } }, then: [{ e: 'addMana', mana: ['R'] }] }])],
});

lcr('U', 'Marwyn, the Clearcutter', '{R}', 'Elf Warrior', 2, 1, '{2}，{T}，犧牲一個神器或地：抓一張牌。', {
  abilities: [act({ mana: '{2}', tap: true, sacOther: { or: [{ type: 'Artifact' }, { type: 'Land' }] } }, [{ e: 'draw', n: 1 }], '犧牲神器或地：抓一張牌')],
});

lcr('U', 'Pia, Determined Rebuilder', '{2}{R}', 'Human Artificer', 2, 2, `當此生物進戰場時，派出一個${THOPTER}。\n{5}{R}：目標生物得+X/+0直到回合結束，X為由你操控的神器數量。`, {
  abilities: [etb([{ e: 'token', token: 'tok-thopter' }]), act({ mana: '{5}{R}' }, [{ e: 'pump', what: 'T0', p: { count: MY_ARTIFACTS }, t: 0 }], '目標生物得+X/+0', { targets: [CR] })],
});

lcr('U', 'Tetsuko Umezawa, Pursuer', '{3}{R}', 'Human Mercenary', 2, 4, '雙擊\n勇行\n每當由對手操控，且力量或防禦力為1或更少的生物阻擋時，此生物對該生物的操控者造成1點傷害。', {
  keywords: ['double_strike', 'prowess'],
  abilities: [trig('oppBlocks', [{ e: 'damage', n: 1, to: 'opp' }], { filter: { or: [{ powMax: 1 }, { toughMax: 1 }] } })],
});

lcr('U', 'Tomik, Izzet Sparkmage', '{1}{R}', 'Human Wizard', 1, 2, '勇行\n如果由你操控的來源將對對手或由對手操控的永久物造成非戰鬥傷害，改為造成多1點的傷害。', {
  keywords: ['prowess'],
  abilities: [{ kind: 'static', noncombatPlus: 1 }],
});

add({
  set: S, rarity: 'U', name: 'Way of the Warlord', cost: '{2}{R}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(5)}\n由你操控的鵬洛客具有「[−4]：此鵬洛客對至多一個目標生物或鵬洛客造成2點傷害，並對目標玩家造成2點傷害。」`,
  abilities: [
    etb([empower(5)]),
    grantPw([loyalty(-4, [{ e: 'damage', n: 2, to: 'T0' }, { e: 'damage', n: 2, to: 'T1' }], '−4：造成2點傷害與2點傷害', [{ kind: 'permanent', filter: GY_CR_PW, optional: true, prompt: '選擇至多一個生物或鵬洛客' }, { kind: 'player', prompt: '選擇一位玩家' }])]),
  ],
});

// ============================================================
// 綠
// ============================================================
const OPP_CR_PW: TargetSpec = { kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'], ctrl: 'opp' }, prompt: '選擇由對手操控的生物或鵬洛客' };

cr(S, 'C', 'Budding Insurgent', '{2}{G}', 'Dryad Scout', 3, 3, '警戒\n犧牲此生物：消滅目標神器或結界。若該永久物是傳奇結界，抓一張牌。只能於法術時機起動。', {
  keywords: ['vigilance'],
  abilities: [
    act({ sacSelf: true }, [
      { e: 'if', cond: { c: 'targetIs', t: 0, filter: { type: 'Enchantment', legendary: true } }, then: [{ e: 'draw', n: 1 }] },
      { e: 'destroy', what: 'T0' },
    ], '犧牲：消滅神器或結界', { sorcery: true, targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] }, prompt: '選擇神器或結界' }] }),
  ],
});

prepared('R', 'Carnivorous Cultivator', '{1}{G}', 'Elf Warlock', 2, 3, ['死觸', '每當此生物對玩家造成戰鬥傷害時，將目標地牌從你的墳墓場移回你手上。'], 'Enroot', '{G}', ['Sorcery'], '從你的牌庫中搜尋一張地牌，將它置入你的墳墓場，然後洗牌。', {
  effects: [{ e: 'tutor', filter: { type: 'Land' }, to: 'graveyard' }],
}, { keywords: ['deathtouch'], abilities: [trig('combatDamagePlayer', [{ e: 'toHand', what: 'T0' }], { targets: [gyTarget({ type: 'Land' }, '選擇你墳墓場中的地牌')] })] });

inst(S, 'C', 'Compel Brutality', '{1}{G}', '選擇一項：\n• 目標由你操控的生物對目標由對手操控的生物或鵬洛客造成等同其力量的傷害。\n• 目標由你操控的鵬洛客對目標由對手操控的生物或鵬洛客造成等同其忠誠的傷害。', {
  modes: [
    { text: '你的生物造成等同其力量的傷害', targets: [MY_CR, OPP_CR_PW], effects: [{ e: 'bite', a: 'T0', b: 'T1' }] },
    { text: '你的鵬洛客造成等同其忠誠的傷害', targets: [{ kind: 'permanent', filter: MY_PW, prompt: '選擇由你操控的鵬洛客' }, OPP_CR_PW], effects: [{ e: 'bite', a: 'T0', b: 'T1', byLoyalty: true }] },
  ],
});

inst(S, 'U', 'Flourishing Grapple', '{G}', '目標紅色或白色，且由對手操控的生物或鵬洛客直到回合結束失去所有異能。目標由你操控的生物對該永久物造成等同其力量的傷害。', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'], ctrl: 'opp', color: ['R', 'W'] }, prompt: '選擇紅色或白色，且由對手操控的生物或鵬洛客' }, MY_CR],
  effects: [{ e: 'loseAbilitiesEot', what: 'T0' }, { e: 'bite', a: 'T1', b: 'T0' }],
});

ench(S, 'R', 'Gardenize', '{1}{G}{G}', '每當一個由你操控的生物死去時，在此結界上放置一個充能指示物。\n在你的第一個主要階段開始時，此結界上每有一個充能指示物，便加{G}。', {
  abilities: [
    trig('allyDies', [{ e: 'chargeCounter', what: 'self', n: 1 }]),
    trig('mainStart', [{ e: 'addMana', mana: ['G'], n: { selfCounters: true } }]),
  ],
});

prepared('U', 'Heartwood Crafter', '{G}', 'Elf Artificer', 1, 1, ['', '{T}：加{C}。這點法術力不能用來從你手上施放咒語。'], 'Soul Tether', '{2}{R/G}', ['Sorcery'], '派出一個心材衍生物。（它是紅綠雙色的神器，具有「{T}：加{R}或{G}。」）', {
  effects: [{ e: 'token', token: 'tok-heartwood' }],
}, { produces: ['C'], manaOnly: 'notFromHand' });

cr(S, 'M', 'Hexhaven Invigorator', '{G}{G}{G}{G}', 'Chimera Horror', 6, 6, '警戒\n每當此生物受到傷害時，你可以從你的牌庫中搜尋至多等量的地牌，將它們橫置放進戰場，然後洗牌。', {
  keywords: ['vigilance'],
  abilities: [trig('dealtDamage', [{ e: 'tutorMany', filter: { type: 'Land' }, n: { ev: true }, to: 'battlefield', tapped: true }], { may: '要搜尋地牌嗎？' })],
});

add({
  set: S, rarity: 'R', name: 'Hungering Puppetbeast', cost: '{3}{G}{G}', types: ['Artifact', 'Creature'], subtypes: ['Beast', 'Construct'], power: 5, toughness: 5,
  text: '當此生物進戰場時，派出一個心材衍生物。（它是紅綠雙色的神器，具有「{T}：加{R}或{G}。」）\n{1}，犧牲另一個神器：在此生物上放置一個+1/+1指示物。它獲得你選擇的踐踏、辟邪或敏捷異能直到回合結束。',
  abilities: [
    etb([{ e: 'token', token: 'tok-heartwood' }]),
    act({ mana: '{1}', sacOther: { type: 'Artifact', other: true } }, [{ e: 'counters', what: 'self', n: 1 }, { e: 'pumpChoice', what: 'self', kws: ['trample', 'hexproof', 'haste'] }], '犧牲神器：+1/+1指示物並獲得異能'),
  ],
});

add({
  set: S, rarity: 'U', name: "Hunter's Axe", cost: '{G}', types: ['Artifact'], subtypes: ['Equipment'],
  text: '佩帶此武具的生物得+2/+0，並具有「每當此生物攻擊時，它獲得你選擇的踐踏或死觸異能直到回合結束。」\n裝備{2}',
  equip: { cost: '{2}', grant: { p: 2 }, trigger: { kind: 'trigger', on: 'attacks', effects: [{ e: 'pumpChoice', what: 'self', kws: ['trample', 'deathtouch'] }] } },
});

cr(S, 'C', 'Inspired Tethermage', '{2}{G}', 'Elf Warrior', 3, 2, `每當你在鵬洛客上放置一個或更多忠誠指示物時，在此生物上放置一個+1/+1指示物。\n{6}：${EMP(2)}`, {
  abilities: [trig('loyaltyPlaced', [{ e: 'counters', what: 'self', n: 1 }]), act({ mana: '{6}' }, [empower(2)], '強化傑斯2')],
});

ench(S, 'M', 'Omnipresence', '{5}{G}{G}{G}', '你可以從手上免費施放法術力值小於或等於你操控的生物數量的咒語。', {
  abilities: [{ kind: 'static', freeCastByCreatures: true }],
});

ench(S, 'R', 'Puppet Crafting', '{1}{G}', '結附於神器或非靈氣的結界\n所結附的永久物除了原有的類別外，還是基礎力量與防禦力為5/5的構裝體生物。\n{4}{G}：將此牌從你的墳墓場移回你手上。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'permanent', filter: { or: [{ type: 'Artifact' }, { type: 'Enchantment', nonSub: 'Aura' }] }, prompt: '選擇神器或非靈氣的結界' }, grant: { animate: { p: 5, t: 5, subtype: 'Construct' } } },
  abilities: [act({ mana: '{4}{G}' }, [{ e: 'toHand', what: 'selfAny' }], '回到手上', { fromGraveyard: true, keepSelf: true })],
});

inst(S, 'U', 'Restore with Empathy', '{2}{G}', '將目標永久物牌從你的墳墓場移回你手上。你獲得4點生命。', {
  targets: [gyTarget({ nonType: ['Instant', 'Sorcery'] }, '選擇你墳墓場中的永久物牌')],
  effects: [{ e: 'toHand', what: 'T0' }, { e: 'gain', n: 4 }],
});

inst(S, 'C', 'Something Worth Saving', '{1}{G}', '碾磨四張牌。你可以從其中選擇一張永久物牌置於你手上。你獲得1點生命。（碾磨四張牌：將你牌庫頂的四張牌置入你的墳墓場。）', {
  effects: [{ e: 'mill', n: 4 }, { e: 'retrieveMilled', filter: { nonType: ['Instant', 'Sorcery'] } }, { e: 'gain', n: 1 }],
});

cr(S, 'C', 'Sureshot Sower', '{1}{G}', 'Human Archer', 3, 1, '延勢\n{3}{G}，棄掉此牌：消滅目標具有飛行異能的生物。', {
  keywords: ['reach'],
  abilities: [act({ mana: '{3}{G}', discardSelf: true }, [{ e: 'destroy', what: 'T0' }], '棄掉：消滅飛行生物', { fromHand: true, targets: [{ kind: 'creature', filter: { kw: 'flying' }, prompt: '選擇具有飛行異能的生物' }] })],
});

cr(S, 'M', 'Tarmogoyf', '{1}{G}', 'Lhurgoyf', 0, 1, '此生物的力量等同於所有墳墓場中的牌的類別數量，防禦力等於該數量加1。', {
  abilities: [{ kind: 'static', selfPumpGraveyardTypes: true }],
});

inst(S, 'C', "Tethermage's Advantage", '{G}', '目標生物得+2/+2並獲得延勢異能直到回合結束。重置它。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['reach'] }, { e: 'untap', what: 'T0' }],
});

cr(S, 'R', 'Verdant Kraken', '{4}{G}{G}{G}', 'Plant Kraken', 6, 6, '在每位玩家的維持開始時，你派出一個3/3綠色的森林觸手地生物衍生物。（它具有「{T}：加{G}。」在你的下個回合開始前，它受召喚失調影響。）', {
  abilities: [trig('eachUpkeep', [{ e: 'token', token: 'tok-forest-tentacle' }])],
});

lcr('U', 'Edgar, Moonlit Sovereign', '{3}{G}{G}', 'Werewolf Noble', 4, 4, '閃現\n在你的結束步驟開始時，若你本回合沒有施放咒語，在此生物上放置兩個+1/+1指示物。\n{4}{G}：在每個由你操控且有+1/+1指示物的生物上各放置一個+1/+1指示物。', {
  keywords: ['flash'],
  abilities: [
    trig('endStep', [{ e: 'counters', what: 'self', n: 2 }], { cond: { c: 'not', cond: { c: 'spellsCast', n: 1 } } }),
    act({ mana: '{4}{G}' }, [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', plusCounters: true } }, n: 1 }], '有指示物的生物各+1/+1指示物'),
  ],
});

add({
  set: S, rarity: 'U', name: 'Fblthp, Knows the Way', cost: '{X}{G}{G}', types: ['Creature'], supertypes: ['Legendary'], subtypes: ['Homunculus', 'Scout'], power: 0, toughness: 2,
  text: '領域—此生物的力量等同於由你操控的地中基本地類別的數量。\n當此生物進戰場時，從你的牌庫中搜尋至多X張名稱各不相同的基本地牌，展示它們並置於你手上，然後洗牌。',
  abilities: [{ kind: 'static', selfPowerDomain: true }, etb([{ e: 'tutorMany', filter: { type: 'Land', basic: true }, n: { x: true }, to: 'hand', distinct: true }])],
});

lcr('U', 'Ghalta the Unstoppable', '{8}{G}', 'Elder Dinosaur', 8, 8, '此咒語減少{X}來施放，X為由你操控的生物中最大的力量。\n踐踏\n由你操控的其他生物具有踐踏異能。', {
  keywords: ['trample'],
  costReduce: { perMaxStat: { stat: 'power', filter: MY_CREATURES } },
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', other: true }, grant: { kw: ['trample'] } } }],
});

lcr('U', 'Jiang Yanggu, Never Alone', '{3}{G}', 'Human Druid', 2, 2, '當此生物進戰場時，派出名為慕烏，3/3綠色的傳奇狗生物衍生物。\n在你的結束步驟開始時，重置所有由你操控的衍生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-mowu' }]), trig('endStep', [{ e: 'untap', what: { all: { token: true, ctrl: 'you' } } }])],
});

lcr('U', 'Loot, the Nexus', '{2}{G}', 'Beast Noble', 2, 1, '{T}：選擇一種顏色。由你操控的生物中，每有一種不同的力量，便加一點該顏色的法術力。', {
  abilities: [act({ tap: true }, [{ e: 'addManaOfChoice', n: { distinctPowers: true } }], '依不同力量的數量加入法術力')],
});

lcr('U', 'Marwyn, the Preserver', '{1}{G}', 'Elf Druid', 3, 2, '由你操控的地具有辟邪異能。\n{2}：將目標地牌從你的墳墓場移回你手上。', {
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Land', ctrl: 'you' }, grant: { kw: ['hexproof'] } } },
    act({ mana: '{2}' }, [{ e: 'toHand', what: 'T0' }], '地牌回到手上', { targets: [gyTarget({ type: 'Land' }, '選擇你墳墓場中的地牌')] }),
  ],
});

lcr('U', 'Pia, Aether Ascetic', '{2}{G}', 'Human Druid', 2, 2, '當此生物進戰場時，你可以棄一張牌。若你如此作，從你的牌庫中搜尋一張結界牌，展示該牌並置於你手上，然後洗牌。', {
  abilities: [etb([{ e: 'costThen', prompt: '要棄一張牌，搜尋一張結界牌嗎？', cost: { discard: 1 }, then: [{ e: 'tutor', filter: { type: 'Enchantment' } }] }])],
});

lcr('U', 'Ruric Thar, Magecrusher', '{5}{G}{G}', 'Ogre Warrior', 7, 7, '此咒語不能被反擊。\n延勢，警戒，踐踏\n只要此生物還沒有造成過戰鬥傷害，它就具有辟邪異能。', {
  keywords: ['reach', 'vigilance', 'trample'],
  uncounterable: true,
  abilities: [{ kind: 'static', self: { cond: { c: 'selfNoCombatDamage' }, grant: { kw: ['hexproof'] } } }],
});

lcr('U', 'Titanbones, Towering Heart', '{3}{G}', 'Skeleton Druid', 4, 3, '延勢\n每當你獲得生命時，在此生物上放置兩個+1/+1指示物。\n當你棄掉此牌時，你獲得3點生命。', {
  keywords: ['reach'],
  abilities: [trig('lifegain', [{ e: 'counters', what: 'self', n: 2 }]), trig('discardSelf', [{ e: 'gain', n: 3 }])],
});

add({
  set: S, rarity: 'U', name: 'Way of the Paradox', cost: '{2}{G}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `${WAY_HEAD(5)}\n每當你起動忠誠異能時，你獲得1點生命。你本回合可以多打出一個地。`,
  abilities: [etb([empower(5)]), trig('loyaltyActivated', [{ e: 'gain', n: 1 }, { e: 'extraLandThisTurn' }])],
});

add({
  set: S, rarity: 'U', name: 'Way of the Wildspeaker', cost: '{4}{G}', types: ['Enchantment'], supertypes: ['Legendary'],
  text: `當此結界進戰場時，${EMP(7)}\n由你操控的鵬洛客具有「[−4]：派出一個4/4綠色，具有踐踏異能的野獸衍生生物。」`,
  abilities: [etb([empower(7)]), grantPw([loyalty(-4, [{ e: 'token', token: 'tok-beast-trample' }], '−4：派出4/4野獸')])],
});

lcr('U', 'Yoshimaru, Scrappy Stray', '{1}{G}', 'Dog', 1, 1, '當此生物進戰場時，另一個目標由你操控的生物與至多一個目標由對手操控的生物互鬥。\n{6}：在目標非傳奇生物上放置一個+1/+1指示物。', {
  abilities: [
    etb([{ e: 'fight', a: 'T0', b: 'T1' }], { targets: [{ ...MY_CR, notSelf: true }, { ...OPP_CR, optional: true }] }),
    act({ mana: '{6}' }, [{ e: 'counters', what: 'T0', n: 1 }], '非傳奇生物+1/+1指示物', { targets: [{ kind: 'creature', filter: { legendary: false }, prompt: '選擇非傳奇生物' }] }),
  ],
});

// ============================================================
// 多色／混色
// ============================================================
const HEARTWOOD: Effect = { e: 'token', token: 'tok-heartwood' };
const ANY_NONLAND: TargetSpec = { kind: 'permanent', filter: { nonType: 'Land' }, prompt: '選擇非地永久物' };
const SEED_SUTURE_TEXT = '在目標生物上放置一個+1/+1指示物。你獲得1點生命。';
const SEED_SUTURE: SpellSpec = { targets: [CR], effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'gain', n: 1 }] };
const PEER_REVIEW_TEXT = `派出一個${CADET}。刺探1。`;
const PEER_REVIEW: SpellSpec = { effects: [cadet(), { e: 'surveil', n: 1 }] };
const SOUL_TETHER_TEXT = '派出一個心材衍生物。（它是紅綠雙色的神器，具有「{T}：加{R}或{G}。」）';
const SOUL_TETHER: SpellSpec = { effects: [HEARTWOOD] };
const VICIOUS_VERSE_TEXT = '此咒語對目標對手造成1點傷害。';
const VICIOUS_VERSE: SpellSpec = { targets: [{ kind: 'opponent', prompt: '選擇對手' }], effects: [{ e: 'damage', n: 1, to: 'T0' }] };
const OMIT_TEXT = '碾磨三張牌。（將你牌庫頂的三張牌置入你的墳墓場。）';
const OMIT: SpellSpec = { effects: [{ e: 'mill', n: 3 }] };
const prepareAtUpkeep = trig('upkeep', [{ e: 'prepare' }], { cond: { c: 'notPrepared' } });
const PREP_UPKEEP = '在你的維持開始時，若此生物不是已準備，它成為已準備。';

lcr('M', 'Aerid Konstrari', '{1}{R}{G}{G}', 'Elder Sphinx', 5, 4, '飛行\n當此生物進戰場或死去時，派出一個心材衍生物。（它是紅綠雙色的神器，具有「{T}：加{R}或{G}。」）\n{6}：派出一個心材衍生物。然後此生物得+X/+0直到回合結束，X為由你操控的神器數量。', {
  keywords: ['flying'],
  abilities: [
    etb([HEARTWOOD]),
    trig('dies', [HEARTWOOD]),
    act({ mana: '{6}' }, [HEARTWOOD, { e: 'pump', what: 'self', p: { count: MY_ARTIFACTS }, t: 0 }], '派出心材並得+X/+0'),
  ],
});

cr(S, 'C', 'Blessed Ghoul', '{W/B}', 'Zombie Cleric', 1, 1, '系帶\n{2}{W/B}：將此牌從你的墳墓場移回你手上。', {
  keywords: ['lifelink'],
  abilities: [act({ mana: '{2}{W/B}' }, [{ e: 'toHand', what: 'selfAny' }], '回到手上', { fromGraveyard: true, keepSelf: true })],
});

cr(S, 'U', 'Bloombrute', '{2}{G}{W}', 'Plant Elemental', 4, 4, '每當你獲得生命時，抓一張牌。此異能每回合只會觸發一次。\n{4}{G}{W}：目標生物獲得踐踏與系帶異能直到回合結束。', {
  abilities: [
    trig('lifegain', [{ e: 'draw', n: 1 }], { oncePerTurn: true }),
    act({ mana: '{4}{G}{W}' }, [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample', 'lifelink'] }], '目標獲得踐踏與系帶', { targets: [CR] }),
  ],
});

inst(S, 'U', 'Clash of Elements', '{1}{U}{R}', '選擇目標非地永久物。其擁有者可以將它放在其牌庫頂。若該玩家如此作，此咒語對該玩家造成2點傷害。若該玩家沒有將牌放在牌庫頂，改為放在牌庫底。', {
  targets: [ANY_NONLAND],
  effects: [{ e: 'topOrBottom', what: 'T0', damageTop: 2 }],
});

cr(S, 'U', 'Craftwork Crusher', '{3}{R}{R}{G}{G}', 'Boar Construct', 7, 5, `踐踏\n當此生物進戰場時，選擇兩項：\n• 此生物對目標生物或鵬洛客造成4點傷害。\n• 派出一個${CADET}。\n• 抓一張牌。`, {
  types: ['Artifact', 'Creature'],
  keywords: ['trample'],
  abilities: [
    etb([], {
      chooseN: 2,
      modes: [
        { text: '對生物或鵬洛客造成4點傷害', targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'] }, prompt: '選擇生物或鵬洛客' }], effects: [{ e: 'damage', n: 4, to: 'T0', from: 'self' }] },
        { text: '派出學員', effects: [cadet()] },
        { text: '抓一張牌', effects: [{ e: 'draw', n: 1 }] },
      ],
    }),
  ],
});

lcr('M', 'Denzilore Fatehold', '{1}{W}{U}{U}', 'Elder Sphinx', 3, 4, '閃現\n飛行\n每當你占卜或刺探時，在每個由你操控的生物上各放置一個+1/+1指示物。', {
  keywords: ['flash', 'flying'],
  abilities: [trig('scry', [{ e: 'counters', what: { all: MY_CREATURES }, n: 1 }])],
});

cr(S, 'U', 'Desperate Futurescribe', '{2}{W}{U}', 'Kor Scout', 3, 4, '飛行\n在你的戰鬥開始時，另一個目標由你操控的生物得+1/+1直到回合結束。若你本回合占卜或刺探過，改為在該生物上放置一個+1/+1指示物。', {
  keywords: ['flying'],
  abilities: [
    trig(
      'combatStart',
      [{ e: 'if', cond: { c: 'scried' }, then: [{ e: 'counters', what: 'T0', n: 1 }], else: [{ e: 'pump', what: 'T0', p: 1, t: 1 }] }],
      { targets: [{ ...MY_CR, notSelf: true }] },
    ),
  ],
});

prepared('C', 'Emergency Phytomedic', '{G/W}', 'Dryad Cleric', 1, 1, '', 'Seed Suture', '{G/W}', ['Sorcery'], SEED_SUTURE_TEXT, SEED_SUTURE);

sorc(S, 'R', 'Entrust the Spark', '{3}{G}{U}', '你可以犧牲一個鵬洛客。若你如此作，從你的牌庫中搜尋一張鵬洛客牌，將它放進戰場，然後洗牌。', {
  effects: [{ e: 'costThen', prompt: '要犧牲一個鵬洛客嗎？', cost: { sac: { type: 'Planeswalker' } }, then: [{ e: 'tutor', filter: { type: 'Planeswalker' }, to: 'battlefield' }] }],
});

prepared('C', 'Fatehold Chronologist', '{1}{W/U}', 'Bird Wizard', 1, 2, '飛行', 'Peer Review', '{2}{W/U}', ['Sorcery'], PEER_REVIEW_TEXT, PEER_REVIEW, { keywords: ['flying'] });

ench(S, 'C', 'Ferocity of the Hunt', '{1}{B/G}', '閃現\n結附於生物\n所結附的生物得+1/+0並具有死觸異能。\n當所結附的生物死去時，將該牌橫置放回戰場，由其擁有者操控。', {
  subtypes: ['Aura'],
  keywords: ['flash'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { p: 1, kw: ['deathtouch'] } },
  abilities: [trig('attachedDies', [{ e: 'reanimate', what: 'evCard', tapped: true, owner: true }])],
});

cr(S, 'R', 'Frostbite Pyromental', '{U}{R}{R}', 'Elemental', 4, 4, '踐踏，敏捷\n每當此生物對玩家造成戰鬥傷害時，抓兩張牌。\n在每個結束步驟開始時，犧牲此生物。', {
  keywords: ['trample', 'haste'],
  abilities: [trig('combatDamagePlayer', [{ e: 'draw', n: 2 }]), trig('eachEndStep', [{ e: 'sac', what: 'self' }])],
});

cr(S, 'U', 'Grim Repriser', '{B}{R}', 'Zombie Bard', 2, 2, '勇行\n{B}{R}：將此牌從你的墳墓場放回戰場，並帶有一個終結指示物。只有在有對手本回合被造成非戰鬥傷害時才能起動。（帶有終結指示物的生物將要死去時，改為放逐它。）', {
  keywords: ['prowess'],
  abilities: [act({ mana: '{B}{R}' }, [{ e: 'reanimate', what: 'selfAny', finality: true }], '帶著終結指示物回到戰場', { fromGraveyard: true, keepSelf: true, cond: { c: 'oppNoncombatThisTurn' } })],
});

lcr('M', 'Ingris Stingerquill', '{B}{R}{R}', 'Elder Sphinx', 1, 4, `飛行\n每當一個由你操控的生物攻擊時，它對每位對手各造成1點傷害。\n{4}：派出一個${CADET}。然後由你操控的生物獲得敏捷異能直到回合結束。`, {
  keywords: ['flying'],
  abilities: [
    trig('allyAttacks', [{ e: 'damage', n: 1, to: 'opp', from: 'trig' }]),
    act({ mana: '{4}' }, [cadet(), { e: 'pump', what: { all: MY_CREATURES }, p: 0, t: 0, kw: ['haste'] }], '派出學員，生物獲得敏捷'),
  ],
});

inst(S, 'U', 'Konstrari Charm', '{R}{G}', '選擇一項：\n• 此咒語對目標具有飛行異能的生物造成6點傷害。\n• 在目標生物上放置兩個+1/+1指示物。它獲得踐踏異能直到回合結束。\n• 加{C}{C}{C}。', {
  modes: [
    { text: '對飛行生物造成6點傷害', targets: [{ kind: 'creature', filter: { kw: 'flying' }, prompt: '選擇具有飛行異能的生物' }], effects: [{ e: 'damage', n: 6, to: 'T0' }] },
    { text: '+1/+1指示物×2並獲得踐踏', targets: [CR], effects: [{ e: 'counters', what: 'T0', n: 2 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample'] }] },
    { text: '加{C}{C}{C}', effects: [{ e: 'addMana', mana: ['C'], n: 3 }] },
  ],
});

prepared('C', 'Konstrari Improviser', '{1}{R/G}', 'Human Artificer', 2, 2, '', 'Soul Tether', '{2}{R/G}', ['Sorcery'], SOUL_TETHER_TEXT, SOUL_TETHER);

lcr('M', 'Kwia Vigorbloom', '{3}{G}{W}{W}', 'Elder Sphinx', 6, 6, '飛行，警戒，系帶，守護{2}\n每當你獲得生命時，派出一個無色，名為蓮花的神器衍生物，其具有「{T}，犧牲此衍生物：加三點任一種顏色的法術力。」此異能每回合只會觸發一次。', {
  keywords: ['flying', 'vigilance', 'lifelink'],
  ward: 2,
  abilities: [trig('lifegain', [{ e: 'token', token: 'tok-lotus' }], { oncePerTurn: true })],
});

cr(S, 'U', 'Mind Meanderer', '{3}{G}{U}{U}', 'Bird Fish Illusion', 4, 4, '飛行\n只要你操控傑斯鵬洛客，此生物就具有警戒異能。\n當此生物進戰場時，它與至多一個目標由對手操控的生物互鬥。', {
  keywords: ['flying'],
  abilities: [
    { kind: 'static', self: { cond: { c: 'controls', filter: { type: 'Planeswalker', sub: 'Jace', ctrl: 'you' } }, grant: { kw: ['vigilance'] } } },
    etb([{ e: 'fight', a: 'self', b: 'T0' }], { targets: [{ ...OPP_CR, optional: true }] }),
  ],
});

cr(S, 'R', 'Null Summoner', '{2}{U}{B}', 'Human Warlock', 4, 2, '當此生物進戰場時，若你施放了它，目標對手展示其手牌。你選擇其中一張非地牌，放逐該牌。\n門檻—只要你的墳墓場中有七張或更多牌，你就可以施放該被放逐的牌，且可以用任何類型的法術力來支付該咒語的費用。', {
  abilities: [etb([{ e: 'exileFromHandLinked', who: 'opp', filter: { nonType: 'Land' } }], { cond: { c: 'selfWasCast' } })],
});

prepared('U', 'Paradox Shaper', '{1}{U/B}', 'Octopus Wizard', 1, 3, `${PREP_UPKEEP}\n{2}：將目標你墳墓場中的牌放到你牌庫底。`, 'Omit Variables', '{U/B}', ['Sorcery'], OMIT_TEXT, OMIT, {
  abilities: [prepareAtUpkeep, act({ mana: '{2}' }, [{ e: 'toLibraryBottom', what: 'T0' }], '墳墓場的牌放到牌庫底', { targets: [gyTarget({}, '選擇你墳墓場中的牌')] })],
}, false);

cr(S, 'U', 'Primal Witchstalker', '{1}{B}{G}', 'Wolf', 2, 1, '威懾\n當此生物進戰場時，碾磨四張牌。當你如此作時，將目標地牌從你的墳墓場橫置放回戰場。（碾磨四張牌：將你牌庫頂的四張牌置入你的墳墓場。）', {
  keywords: ['menace'],
  abilities: [
    etb([
      { e: 'mill', n: 4 },
      { e: 'reflexive', targets: [gyTarget({ type: 'Land' }, '選擇你墳墓場中的地牌')], effects: [{ e: 'reanimate', what: 'T0', tapped: true }] },
    ]),
  ],
});

cr(S, 'R', 'Proctor of Potential', '{W}{U}', 'Human Cleric', 3, 1, '每當此生物或另一個由你操控的生物進戰場時，刺探1。\n{W}{U}：將此牌從你的墳墓場放回戰場，並帶有一個終結指示物。只有在你本回合占卜或刺探過時才能起動。（帶有終結指示物的生物將要死去時，改為放逐它。）', {
  abilities: [
    etb([{ e: 'surveil', n: 1 }]),
    trig('allyEtb', [{ e: 'surveil', n: 1 }]),
    act({ mana: '{W}{U}' }, [{ e: 'reanimate', what: 'selfAny', finality: true }], '帶著終結指示物回到戰場', { fromGraveyard: true, keepSelf: true, cond: { c: 'scried' } }),
  ],
});

prepared('U', 'Prudent Fateseer', '{1}{W/U}{W/U}', 'Dwarf Wizard', 1, 4, ['', '每當你占卜或刺探時，由你操控的生物得+1/+0直到回合結束。此異能每回合只會觸發一次。'], 'Peer Review', '{2}{W/U}', ['Sorcery'], PEER_REVIEW_TEXT, PEER_REVIEW, {
  abilities: [trig('scry', [{ e: 'pump', what: { all: MY_CREATURES }, p: 1, t: 0 }], { oncePerTurn: true })],
});

sorc(S, 'U', 'Recursive Recruitment', '{2}{U}{B}', `派出兩個${CADET}。若此咒語是從墳墓場施放的，在每個衍生物上，你墳墓場中每有三張牌就放置一個+1/+1指示物。\n${FB('{6}{U}{B}')}`, {
  effects: [cadet(2), { e: 'if', cond: { c: 'castFromGy' }, then: [{ e: 'counters', what: 'allCreated', n: { gyThirds: true } }] }],
}, { flashback: '{6}{U}{B}' });

cr(S, 'R', 'Solarium Sentry', '{G}{W}', 'Cat Soldier', 3, 3, '每當對手施放法術力值2或更少的咒語時，你獲得2點生命。', {
  abilities: [trig('castAny', [{ e: 'gain', n: 2 }], { oppOnly: true, filter: { mvMax: 2 } })],
});

arti(S, 'R', 'Solitary Cell', '{R}{W}', '當此神器進戰場時，放逐目標由對手操控，且法術力值為3或更少的非地永久物，直到此神器離開戰場。\n{1}，{T}，棄掉一張傳奇牌：抓一張牌。', {
  abilities: [
    etb([{ e: 'exileLinked', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { nonType: 'Land', ctrl: 'opp', mvMax: 3 }, prompt: '選擇對手操控、法術力值3或更少的非地永久物' }] }),
    act({ mana: '{1}', tap: true }, [{ e: 'costThen', prompt: '要棄掉一張傳奇牌嗎？', cost: { discardFilter: { legendary: true } }, then: [{ e: 'draw', n: 1 }] }], '棄掉傳奇牌：抓一張牌', { cond: { c: 'handHas', filter: { legendary: true } } }),
  ],
});

prepared('U', 'Stingerquill Voxmancer', '{B/R}', 'Goblin Sorcerer', 1, 2, PREP_UPKEEP, 'Vicious Verse', '{B/R}', ['Sorcery'], VICIOUS_VERSE_TEXT, VICIOUS_VERSE, { abilities: [prepareAtUpkeep] }, false);

sorc(S, 'R', 'Stinging Vitriol', '{B}{R}', '此咒語對目標對手造成2點傷害。該玩家展示其手牌。你選擇其中一張非地牌，該玩家棄掉那張牌。', {
  targets: [{ kind: 'opponent', prompt: '選擇對手' }],
  effects: [{ e: 'damage', n: 2, to: 'T0' }, { e: 'discardChosen', who: 'T0', filter: { nonType: 'Land' } }],
});

cr(S, 'R', 'Tenured Tethermage', '{1}{R}{G}', 'Human Artificer', 1, 1, '當此生物進戰場時，你可以犧牲一個地。若你如此作，派出兩個橫置的心材衍生物。\n橫置兩個由你操控的未橫置神器：在此生物上放置兩個+1/+1指示物。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '要犧牲一個地嗎？', cost: { sac: { type: 'Land' } }, then: [{ e: 'token', token: 'tok-heartwood', n: 2, tapped: true }] }]),
    act({ tapN: { filter: { type: 'Artifact', ctrl: 'you' }, n: 2 } }, [{ e: 'counters', what: 'self', n: 2 }], '橫置兩個神器：+1/+1指示物×2'),
  ],
});

prepared('C', 'Theorix Metamage', '{2}{U/B}', 'Shade Wizard', 2, 3, ['', '門檻—只要你的墳墓場中有七張或更多牌，此生物便得+1/+0並具有飛行異能。'], 'Omit Variables', '{U/B}', ['Sorcery'], OMIT_TEXT, OMIT, {
  abilities: [{ kind: 'static', self: { cond: { c: 'gyCount', filter: {}, n: 7 }, grant: { p: 1, kw: ['flying'] } } }],
});

inst(S, 'C', 'Twinned Vision', '{1}{U/R}', '抓一張牌。若此咒語不是從你手上施放的，改為抓兩張牌。\n返照—{1}{U/R}{U/R}，棄掉一張牌。（你可以支付此返照費用並從你的墳墓場施放此牌。之後此牌會被放逐。）', {
  effects: [{ e: 'if', cond: { c: 'castFromGy' }, then: [{ e: 'draw', n: 2 }], else: [{ e: 'draw', n: 1 }] }],
}, { flashback: '{1}{U/R}{U/R}', flashbackAddCost: { discard: 1 } });

sorc(S, 'U', 'Twisted Fates', '{2}{W}{W}{B}', '消滅目標非地永久物。在每個由目標玩家操控的生物上各放置一個+1/+1指示物。', {
  targets: [ANY_NONLAND, { kind: 'player', prompt: '選擇玩家' }],
  effects: [{ e: 'destroy', what: 'T0' }, { e: 'countersEachOf', who: 'T1', n: 1 }],
});

lcr('M', 'Uldaros Theorix', '{3}{U}{B}{B}', 'Elder Sphinx', 5, 5, '飛行\n當此生物進戰場時，若你施放了他，從你的墳墓場中，為每種類別各放逐至多一張目標非地牌。複製那些牌。你可以免付法術力費用施放其中任意數量總法術力值為6或更少的複製品。（以此法施放的永久物咒語會成為衍生物。）', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'theorix' }], { cond: { c: 'selfWasCast' } })],
});

inst(S, 'U', 'Vigorbloom Charm', '{G}{W}', '選擇一項：\n• 目標由你操控的永久物獲得辟邪與不滅異能直到回合結束。\n• 你抓一張牌並獲得3點生命。\n• 在目標由你操控的生物上放置一個+1/+1指示物。然後它與目標由對手操控的生物互鬥。', {
  modes: [
    { text: '永久物獲得辟邪與不滅', targets: [{ kind: 'permanent', filter: { ctrl: 'you' }, prompt: '選擇由你操控的永久物' }], effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['hexproof', 'indestructible'] }] },
    { text: '抓一張牌並獲得3點生命', effects: [{ e: 'draw', n: 1 }, { e: 'gain', n: 3 }] },
    { text: '+1/+1指示物並互鬥', targets: [MY_CR, OPP_CR], effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'fight', a: 'T0', b: 'T1' }] },
  ],
});

prepared('U', 'Vigorbloom Vanguard', '{1}{G/W}', 'Troll Druid', 2, 2, ['', '每個身上有+1/+1指示物且由你操控的生物都具有警戒異能。'], 'Seed Suture', '{G/W}', ['Sorcery'], SEED_SUTURE_TEXT, SEED_SUTURE, {
  abilities: [{ kind: 'static', anthem: { filter: { ...MY_CREATURES, plusCounters: true }, grant: { kw: ['vigilance'] } } }],
});

inst(S, 'R', 'Vindictive Triumph', '{W}{B}{B}', '放逐目標生物或鵬洛客。若該永久物的法術力值為3或更少，改為將它橫置放回戰場，由你操控，並在下一個結束步驟開始時放逐它。', {
  targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'] }, prompt: '選擇生物或鵬洛客' }],
  effects: [{ e: 'exileThenSteal', what: 'T0', mvMax: 3 }],
});

add({
  set: S, rarity: 'U', name: "Warrior's Blades", cost: '{2}{R}{W}', types: ['Artifact'], subtypes: ['Equipment'],
  text: '當此武具進戰場時，它對任意一個目標造成3點傷害，且你獲得3點生命。\n裝備的生物得+2/+1。\n裝備{3}。目標生物上每有一個+1/+1指示物，此異能的起動費用就減少{1}。',
  equip: { cost: '{3}', costLessPerCounter: true, grant: { p: 2, t: 1 } },
  abilities: [etb([{ e: 'damage', n: 3, to: 'T0', from: 'self' }, { e: 'gain', n: 3 }], { targets: [ANY] })],
});

prepared('C', 'Whiplash Wordsmith', '{3}{B/R}', 'Vampire Sorcerer', 3, 3, ['', '只要有對手本回合被造成非戰鬥傷害，此生物就具有飛行與敏捷異能。'], 'Vicious Verse', '{B/R}', ['Sorcery'], VICIOUS_VERSE_TEXT, VICIOUS_VERSE, {
  abilities: [{ kind: 'static', self: { cond: { c: 'oppNoncombatThisTurn' }, grant: { kw: ['flying', 'haste'] } } }],
});

prepared('U', 'Woodwork Prodigy', '{2}{R/G}', 'Cat Druid', 3, 3, PREP_UPKEEP, 'Soul Tether', '{2}{R/G}', ['Sorcery'], SOUL_TETHER_TEXT, SOUL_TETHER, { abilities: [prepareAtUpkeep] }, false);

lcr('U', 'Edgar, Ancient Bloodlord', '{W}{B}', 'Vampire Noble', 2, 3, '每當另一個由你操控的生物或鵬洛客死去時，你獲得1點生命。\n{2}，犧牲另一個生物或鵬洛客：在艾德加上放置一個+1/+1指示物。他獲得威懾異能直到回合結束。', {
  abilities: [
    trig('allyDies', [{ e: 'gain', n: 1 }], { includePw: true }),
    act({ mana: '{2}', sacOther: { type: ['Creature', 'Planeswalker'], other: true } }, [{ e: 'counters', what: 'self', n: 1 }, { e: 'pump', what: 'self', p: 0, t: 0, kw: ['menace'] }], '犧牲另一個生物或鵬洛客'),
  ],
});

lcr('U', 'Hapatra, the Desert Fang', '{2}{B}{B}{G}', 'Human Cleric', 3, 3, '當哈帕特拉進戰場時，對每位對手，在至多一個由該玩家操控的目標生物上放置X個-1/-1指示物，X為你墳墓場中的牌的最大法術力值。', {
  abilities: [etb([{ e: 'counters', what: 'T0', n: { negOf: { gyMaxMv: true } } }], { targets: [{ ...OPP_CR, optional: true }] })],
});

add({
  set: S, rarity: 'R', name: 'Karn, Gilded Guardian', cost: '{2/W}{2/U}{2/B}{2/R}{2/G}', types: ['Artifact', 'Creature'], supertypes: ['Legendary'], subtypes: ['Golem'], power: 5, toughness: 5,
  keywords: ['vigilance', 'trample'],
  text: '警戒，踐踏\n當卡恩進戰場時，在由你操控的其他神器中，每有一種顏色，你就抓一張牌。',
  abilities: [etb([{ e: 'draw', n: { artifactColors: true } }])],
});

lcr('U', 'Kiora of Salt and Sand', '{1}{G}{U}', 'Merfolk Noble', 2, 4, '每當你進行攻擊時，若你本回合起動過忠誠異能，則將目標進行攻擊的生物重置。本回合它不能被阻擋。\n由你操控的鵬洛客具有「[−8]：派出一個8/8藍色，具有辟邪異能的利維坦衍生生物。」', {
  abilities: [
    trig('youAttack', [{ e: 'untap', what: 'T0' }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['unblockable'] }], { cond: { c: 'loyaltyActivatedThisTurn' }, targets: [{ kind: 'creature', filter: { attacking: true }, prompt: '選擇進行攻擊的生物' }] }),
    grantPw([loyalty(-8, [{ e: 'token', token: 'tok-leviathan' }], '−8：派出8/8利維坦')]),
  ],
});

lcr('U', 'Mabel, Valley Hero', '{1}{R}{W}', 'Mouse Soldier', 1, 2, '每當瑪貝爾或另一個由你操控的生物進戰場時，在目標本回合進戰場的生物上放置一個+1/+1指示物。', {
  abilities: [
    etb([{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ kind: 'creature', filter: { enteredThisTurn: true }, prompt: '選擇本回合進戰場的生物' }] }),
    trig('allyEtb', [{ e: 'counters', what: 'T0', n: 1 }], { targets: [{ kind: 'creature', filter: { enteredThisTurn: true }, prompt: '選擇本回合進戰場的生物' }] }),
  ],
});

lcr('U', 'Saheeli, Jewel of Avishkar', '{2}{U}{R}', 'Human Artificer', 2, 4, `由你操控的機械鳥具有敏捷異能。\n每當你施放非生物咒語時，派出一個${THOPTER}。`, {
  abilities: [
    { kind: 'static', anthem: { filter: { sub: 'Thopter', ctrl: 'you' }, grant: { kw: ['haste'] } } },
    trig('castNoncreature', [{ e: 'token', token: 'tok-thopter' }]),
  ],
});

lcr('R', 'Tam, the Possibility', '{1}{G}{U}', 'Gorgon Wizard', 2, 4, '你施放的鵬洛客咒語減少{1}。\n{W}{U}{B}{R}{G}，{T}：增殖X次，X為由你操控的鵬洛客中不同鵬洛客類別的數量。', {
  abilities: [
    { kind: 'static', spellCostLess: { filter: { type: 'Planeswalker' }, n: 1 } },
    act({ mana: '{W}{U}{B}{R}{G}', tap: true }, [{ e: 'proliferate', times: { pwTypes: true } }], '增殖X次'),
  ],
});

lcr('R', 'Vraska, Soul of Stone', '{U}{R}{W}', 'Gorgon Wizard', 3, 3, '由你操控的神器生物具有警戒異能。\n每當你施放非生物咒語時，派出一個1/1無色，名為雕塑珍寶的神器生物衍生物，其具有「{T}，犧牲此衍生物：加一點任意顏色的法術力。」', {
  abilities: [
    { kind: 'static', anthem: { filter: { type: ['Artifact', 'Creature'], ctrl: 'you' }, grant: { kw: ['vigilance'] } } },
    trig('castNoncreature', [{ e: 'token', token: 'tok-sculpture-treasure' }]),
  ],
});

// ============================================================
// 無色與地
// ============================================================
const ALL_COLORS = ['W', 'U', 'B', 'R', 'G'] as const;

add({
  set: S, rarity: 'M', name: 'Emrakul, the Exigent Doom', cost: '{10}', types: ['Creature'], supertypes: ['Legendary'], subtypes: ['Eldrazi'], power: 12, toughness: 12,
  keywords: ['flying', 'trample'],
  wardSac: 3,
  text: '當你施放此咒語時，重置你操控的所有地。\n飛行，踐踏\n守護—犧牲三個永久物。\n{3}，從你手上放逐此牌：目標地獲得「{T}：加{C}{C}」，直到此牌從放逐區被施放為止。只要它仍在放逐區，你就可以施放此牌。',
  castEffects: [{ e: 'untap', what: { all: { type: 'Land', ctrl: 'you' } } }],
  abilities: [
    act({ mana: '{3}', exileSelf: true }, [{ e: 'bonusMana', what: 'T0' }, { e: 'allowCastFromExile' }], '放逐此牌：目標地加{C}{C}，之後可從放逐區施放', {
      fromHand: true,
      targets: [{ kind: 'permanent', filter: { type: 'Land' }, prompt: '選擇一個地' }],
    }),
  ],
});

cr(S, 'C', 'Afterthought Sentry', '{2}', 'Gargoyle', 2, 2, '{2}：此生物獲得飛行異能直到回合結束。\n每當此生物攻擊時，放逐至多一張目標在任一墳墓場中的牌。', {
  types: ['Artifact', 'Creature'],
  abilities: [
    act({ mana: '{2}' }, [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['flying'] }], '獲得飛行'),
    trig('attacks', [{ e: 'exileGy', what: 'T0' }], { targets: [{ kind: 'gyCard', optional: true, prompt: '選擇任一墳墓場中的牌' }] }),
  ],
});

cr(S, 'U', 'Archive Arbiter', '{6}', 'Sphinx', 4, 4, '飛行\n當此生物進戰場時，選擇一項：\n• 消滅目標非生物，非地的永久物。\n• 你獲得4點生命。', {
  types: ['Artifact', 'Creature'],
  keywords: ['flying'],
  abilities: [
    etb([], {
      modes: [
        { text: '消滅非生物、非地的永久物', targets: [{ kind: 'permanent', filter: { nonType: ['Creature', 'Land'] }, prompt: '選擇非生物、非地的永久物' }], effects: [{ e: 'destroy', what: 'T0' }] },
        { text: '獲得4點生命', effects: [{ e: 'gain', n: 4 }] },
      ],
    }),
  ],
});

lcr('R', 'Codie, Ravenous Codex', '{3}', 'Book Construct', 1, 4, '每當你施放已準備的咒語時，複製它。你可以選擇新的目標。\n{W}{U}{B}{R}{G}，{T}：由你操控的每個生物都成為已準備。（只有具有準備咒語的生物才能成為已準備。）', {
  types: ['Artifact', 'Creature'],
  abilities: [
    trig('castAny', [{ e: 'copySpell' }], { preparedOnly: true, filter: {} }),
    act({ mana: '{W}{U}{B}{R}{G}', tap: true }, [{ e: 'prepare', what: { all: MY_CREATURES } }], '每個生物成為已準備'),
  ],
});

add({
  set: S, rarity: 'M', name: 'The Echoverse Fulcrum', cost: '{2}', types: ['Artifact'], supertypes: ['Legendary'],
  text: '當此神器進戰場時，抓一張牌，然後棄一張牌。\n{5}，{T}，放逐此神器：消滅所有生物。只能於法術時機起動。',
  abilities: [
    etb([{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }]),
    act({ mana: '{5}', tap: true, exileSelf: true }, [{ e: 'destroy', what: { all: { type: 'Creature' } } }], '消滅所有生物', { sorcery: true }),
  ],
});

arti(S, 'U', 'Eye of Jace', '{1}', '在你的維持開始時，刺探1。然後若你的墳墓場中有七張或更多牌，犧牲此神器，它對每位對手各造成2點傷害，且你獲得2點生命。', {
  abilities: [
    trig('upkeep', [
      { e: 'surveil', n: 1 },
      { e: 'if', cond: { c: 'gyCount', filter: {}, n: 7 }, then: [{ e: 'sac', what: 'self' }, { e: 'damage', n: 2, to: 'opp', from: 'self' }, { e: 'gain', n: 2 }] },
    ]),
  ],
});

cr(S, 'C', 'Living Library', '{2}', 'Book Illusion', 0, 4, '{6}，犧牲此生物：選擇目標由對手操控的生物或鵬洛客。其擁有者將它洗入其牌庫。', {
  types: ['Artifact', 'Creature'],
  abilities: [
    act({ mana: '{6}', sacSelf: true }, [{ e: 'shuffleIn', what: 'T0' }], '洗入牌庫', { targets: [{ kind: 'permanent', filter: { type: ['Creature', 'Planeswalker'], ctrl: 'opp' }, prompt: '選擇對手操控的生物或鵬洛客' }] }),
  ],
});

add({
  set: S, rarity: 'C', name: "Medic's Kitesail", cost: '{2}', types: ['Artifact'], subtypes: ['Equipment'],
  text: '裝備的生物得+1/+0並具有飛行異能與「每當此生物攻擊時，你獲得1點生命。」\n裝備{2}。',
  equip: { cost: '{2}', grant: { p: 1, kw: ['flying'] }, trigger: { kind: 'trigger', on: 'attacks', effects: [{ e: 'gain', n: 1 }] } },
});

add({
  set: S, rarity: 'C', name: 'Murmuring Volume', cost: '{3}', types: ['Artifact'], subtypes: ['Book'], produces: [...ALL_COLORS],
  text: '{T}：加一點任意顏色的法術力。\n{2}，{T}，棄掉一張牌：抓一張牌。',
  abilities: [act({ mana: '{2}', tap: true }, [{ e: 'costThen', prompt: '要棄掉一張牌嗎？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }], '棄一張牌：抓一張牌', { cond: { c: 'handGte', n: 1 } })],
});

lcr('R', 'Karn, Argent Defender', '{2}', 'Golem', 1, 3, '神器與生物進戰場不會使異能觸發。', {
  types: ['Artifact', 'Creature'],
  abilities: [{ kind: 'static', suppressEtbTriggers: true }],
});

lcr('U', 'Traxos, Scourge Eternal', '{4}', 'Dragon Construct', 5, 4, '踐踏\n超艾克索斯在你的重置步驟中不會重置。\n每當你施放神器或生物咒語時，重置超艾克索斯。', {
  types: ['Artifact', 'Creature'],
  keywords: ['trample'],
  abilities: [
    { kind: 'static', self: { grant: { noUntap: true } } },
    trig('castAny', [{ e: 'untap', what: 'self' }], { filter: { or: [{ type: 'Artifact' }, { type: 'Creature' }] } }),
  ],
});

land(S, 'R', 'Hall of Echoes', ['C'], '{T}：加{C}。\n{5}：直到回合結束，此地成為目標由你操控的生物的複製。本回合傳奇規則不適用於由你操控的永久物。', {
  abilities: [act({ mana: '{5}' }, [{ e: 'becomeCopy', what: 'T0' }, { e: 'legendExempt' }], '成為生物的複製', { targets: [MY_CR] })],
});

land(S, 'U', 'Hexhaven Dueling Arena', ['C'], '{T}：加{C}。\n{2}，{T}：目標本回合進行過攻擊的生物成為已準備。只能於法術時機起動。\n{4}，{T}：目標生物成為已準備。（只有具有準備咒語的生物才能成為已準備。）', {
  abilities: [
    act({ mana: '{2}', tap: true }, [{ e: 'prepare', what: 'T0' }], '進行過攻擊的生物成為已準備', { sorcery: true, targets: [{ kind: 'creature', filter: { attackedThisTurn: true }, prompt: '選擇本回合進行過攻擊的生物' }] }),
    act({ mana: '{4}', tap: true }, [{ e: 'prepare', what: 'T0' }], '生物成為已準備', { targets: [CR] }),
  ],
});

land(S, 'R', 'Roiling Canopy', ['G'], '此地以橫置狀態進戰場。\n每當一個森林在你的操控下進戰場時，若你操控至少另外五個森林，目標由你操控的生物得+3/+3直到回合結束。\n{T}：加{G}。', {
  etbTapped: true,
  abilities: [trig('landfall', [{ e: 'pump', what: 'T0', p: 3, t: 3 }], { filter: { sub: 'Forest' }, cond: { c: 'controls', filter: { type: 'Land', sub: 'Forest', ctrl: 'you' }, n: 6 }, targets: [MY_CR] })],
});

// 後續顏色的卡在下方追加
export { ANY, OPP, OPP_CR, arti, land };
