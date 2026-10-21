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

// 後續顏色的卡在下方追加
export { ANY, OPP, OPP_CR, arti, land };
