import type {
  Ability,
  ActivatedAbility,
  CardDef,
  Effect,
  Mana,
  SetCode,
  Rarity,
  SpellSpec,
  TargetSpec,
  TriggeredAbility,
  TriggerOn,
} from '../engine/types';

// ============================================================
// 卡牌資料庫
// 系列：FDN = 基本系列（Foundations）、CORE = 經典核心系列、META = 競技環境精選
// 規則敘述為本遊戲引擎實際執行的效果（部分卡牌做了簡化）。
// ============================================================

type X = Partial<CardDef>;
const defs: CardDef[] = [];

export const slug = (n: string) =>
  n
    .toLowerCase()
    .replace(/['’,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function add(d: Omit<CardDef, 'id'>) {
  defs.push({ id: slug(d.name), ...d });
}

function cr(set: SetCode, r: Rarity, name: string, cost: string, subs: string, p: number, t: number, text: string, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Creature'], subtypes: subs.split(' ').filter(Boolean), power: p, toughness: t, text, ...x });
}
function inst(set: SetCode, r: Rarity, name: string, cost: string, text: string, spell: SpellSpec, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Instant'], spell, text, ...x });
}
function sorc(set: SetCode, r: Rarity, name: string, cost: string, text: string, spell: SpellSpec, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Sorcery'], spell, text, ...x });
}
function ench(set: SetCode, r: Rarity, name: string, cost: string, text: string, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Enchantment'], text, ...x });
}
function arti(set: SetCode, r: Rarity, name: string, cost: string, text: string, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Artifact'], text, ...x });
}
function land(set: SetCode, r: Rarity, name: string, produces: Mana[], text: string, x: X = {}) {
  add({ set, rarity: r, name, types: ['Land'], produces, text, ...x });
}

const trig = (on: TriggerOn, effects: Effect[], x: Partial<TriggeredAbility> = {}): Ability => ({ kind: 'trigger', on, effects, ...x });
const etb = (effects: Effect[], x: Partial<TriggeredAbility> = {}) => trig('etb', effects, x);
const act = (cost: ActivatedAbility['cost'], effects: Effect[], label: string, x: Partial<ActivatedAbility> = {}): Ability => ({
  kind: 'activated',
  cost,
  effects,
  label,
  ...x,
});

const ANY: TargetSpec = { kind: 'any' };
const CR: TargetSpec = { kind: 'creature' };
const OPP_CR: TargetSpec = { kind: 'creature', filter: { ctrl: 'opp' }, prompt: '選擇對手的生物' };
const MY_CR: TargetSpec = { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇你的生物' };
const OPP: TargetSpec = { kind: 'opponent' };
const PLAYER: TargetSpec = { kind: 'player' };
const dmg = (n: number, to: 'T0' | 'opp' = 'T0'): Effect => ({ e: 'damage', n, to });
const destroyT0: Effect = { e: 'destroy', what: 'T0' };
const OUTLAWS = ['Assassin', 'Mercenary', 'Pirate', 'Rogue', 'Warlock'];

// ============================================================
// 基本地
// ============================================================
land('BAS', 'L', 'Plains', ['W'], '{T}：加{W}。', { supertypes: ['Basic'], subtypes: ['Plains'], zh: '平原' });
land('BAS', 'L', 'Island', ['U'], '{T}：加{U}。', { supertypes: ['Basic'], subtypes: ['Island'], zh: '海島' });
land('BAS', 'L', 'Swamp', ['B'], '{T}：加{B}。', { supertypes: ['Basic'], subtypes: ['Swamp'], zh: '沼澤' });
land('BAS', 'L', 'Mountain', ['R'], '{T}：加{R}。', { supertypes: ['Basic'], subtypes: ['Mountain'], zh: '山脈' });
land('BAS', 'L', 'Forest', ['G'], '{T}：加{G}。', { supertypes: ['Basic'], subtypes: ['Forest'], zh: '樹林' });

// ============================================================
// 白色
// ============================================================
cr('CORE', 'C', 'Savannah Lions', '{W}', 'Cat', 2, 1, '');
cr('CORE', 'C', 'Sanctuary Cat', '{W}', 'Cat', 1, 2, '');
cr('META', 'C', "Healer's Hawk", '{W}', 'Bird', 1, 1, '飛行，繫命', { keywords: ['flying', 'lifelink'] });
cr('CORE', 'U', 'Soul Warden', '{W}', 'Human Cleric', 1, 1, '每當另一個生物進戰場時，你獲得1點生命。', {
  abilities: [trig('anyEtb', [{ e: 'gain', n: 1 }])],
});
cr('FDN', 'U', "Ajani's Pridemate", '{1}{W}', 'Cat Soldier', 2, 2, '每當你獲得生命時，在此生物上放置一個+1/+1指示物。', {
  abilities: [trig('lifegain', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr('FDN', 'U', 'Resolute Reinforcements', '{1}{W}', 'Human Soldier', 1, 1, '閃現\n當此生物進戰場時，派出一個1/1白色士兵衍生生物。', {
  keywords: ['flash'],
  abilities: [etb([{ e: 'token', token: 'tok-soldier' }])],
});
cr('META', 'C', 'Cathar Commando', '{1}{W}', 'Human Soldier', 3, 1, '閃現\n{1}，犧牲此生物：消滅目標神器或結界。', {
  keywords: ['flash'],
  abilities: [
    act({ mana: '{1}', sacSelf: true }, [destroyT0], '犧牲：消滅神器或結界', {
      targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] } }],
    }),
  ],
});
cr('CORE', 'C', 'Pegasus Courser', '{2}{W}', 'Pegasus', 1, 3, '飛行\n每當此生物攻擊時，至多一個另外的目標進行攻擊的生物獲得飛行異能直到回合結束。', {
  keywords: ['flying'],
  abilities: [
    trig('attacks', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['flying'] }], {
      targets: [{ kind: 'creature', filter: { attacking: true, other: true, ctrl: 'you' }, optional: true }],
    }),
  ],
});
cr('FDN', 'C', 'Inspiring Overseer', '{2}{W}', 'Angel Cleric', 2, 1, '飛行\n當此生物進戰場時，你獲得1點生命並抓一張牌。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'gain', n: 1 }, { e: 'draw', n: 1 }])],
});
cr('CORE', 'U', 'Angel of Vitality', '{2}{W}', 'Angel', 2, 2, '飛行\n每當你獲得生命時，改為獲得該數量加1點生命。\n只要你的生命不少於25點，此生物得+2/+2。', {
  keywords: ['flying'],
  abilities: [
    { kind: 'static', lifegainPlus: 1 },
    { kind: 'static', self: { cond: { c: 'lifeGte', n: 25 }, grant: { p: 2, t: 2 } } },
  ],
});
cr('CORE', 'M', 'Resplendent Angel', '{1}{W}{W}', 'Angel', 3, 3,
  '飛行\n在你的回合結束步驟開始時，若你本回合獲得了5點或更多生命，派出一個4/4白色，具飛行與警戒異能的天使衍生生物。\n{3}{W}{W}{W}：此生物得+2/+0並獲得繫命異能直到回合結束。',
  {
    keywords: ['flying'],
    abilities: [
      trig('endStep', [{ e: 'token', token: 'tok-angel' }], { cond: { c: 'gainedLifeGte', n: 5 } }),
      act({ mana: '{3}{W}{W}{W}' }, [{ e: 'pump', what: 'self', p: 2, t: 0, kw: ['lifelink'] }], '+2/+0 並獲得繫命'),
    ],
  });
cr('FDN', 'U', 'Twinblade Paladin', '{3}{W}', 'Human Knight', 3, 3, '每當你獲得生命時，在此生物上放置一個+1/+1指示物。\n只要你的生命不少於25點，此生物具有連擊異能。', {
  abilities: [
    trig('lifegain', [{ e: 'counters', what: 'self', n: 1 }]),
    { kind: 'static', self: { cond: { c: 'lifeGte', n: 25 }, grant: { kw: ['double_strike'] } } },
  ],
});
cr('CORE', 'C', 'Aven Sentry', '{3}{W}', 'Bird Soldier', 3, 2, '飛行', { keywords: ['flying'] });
cr('CORE', 'R', 'Leonin Warleader', '{2}{W}{W}', 'Cat Soldier', 4, 4, '每當此生物攻擊時，派出兩個1/1白色，具繫命異能的貓衍生生物，且它們以橫置且正在攻擊的狀態進戰場。', {
  abilities: [trig('attacks', [{ e: 'token', token: 'tok-cat', n: 2, tapped: true, attacking: true }])],
});
cr('META', 'R', 'Benalish Marshal', '{W}{W}{W}', 'Human Knight', 3, 3, '由你操控的其他生物得+1/+1。', {
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', other: true }, grant: { p: 1, t: 1 } } }],
});
cr('FDN', 'U', 'Serra Angel', '{3}{W}{W}', 'Angel', 4, 4, '飛行，警戒', { keywords: ['flying', 'vigilance'] });
cr('META', 'M', 'Lyra Dawnbringer', '{3}{W}{W}', 'Angel', 5, 5, '飛行，先攻，繫命\n由你操控的其他天使得+1/+1且具有繫命異能。', {
  supertypes: ['Legendary'],
  keywords: ['flying', 'first_strike', 'lifelink'],
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', sub: 'Angel', ctrl: 'you', other: true }, grant: { p: 1, t: 1, kw: ['lifelink'] } } },
  ],
});
ench('CORE', 'C', 'Pacifism', '{1}{W}', '結附於生物\n所結附的生物不能攻擊或阻擋。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { cantAttack: true, cantBlock: true } },
});
ench('FDN', 'U', 'Banishing Light', '{2}{W}', '當此結界進戰場時，放逐目標由對手操控的非地永久物，直到此結界離開戰場為止。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }], { targets: [{ kind: 'permanent', filter: { ctrl: 'opp', nonType: 'Land' } }] })],
});
ench('FDN', 'R', 'Glorious Anthem', '{1}{W}{W}', '由你操控的生物得+1/+1。', {
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you' }, grant: { p: 1, t: 1 } } }],
});
ench('CORE', 'U', "Ajani's Welcome", '{W}', '每當一個生物在你的操控下進戰場時，你獲得1點生命。', {
  abilities: [trig('allyEtb', [{ e: 'gain', n: 1 }])],
});
inst('CORE', 'C', 'Raise the Alarm', '{1}{W}', '派出兩個1/1白色士兵衍生生物。', { effects: [{ e: 'token', token: 'tok-soldier', n: 2 }] });
inst('CORE', 'C', 'Inspired Charge', '{2}{W}{W}', '由你操控的生物得+2/+1直到回合結束。', {
  effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 2, t: 1 }],
});
inst('CORE', 'C', 'Divine Verdict', '{3}{W}', '消滅目標進行攻擊或阻擋的生物。', {
  targets: [{ kind: 'creature', filter: { inCombat: true } }],
  effects: [destroyT0],
});
sorc('CORE', 'C', 'Take Vengeance', '{W}', '消滅目標已橫置的生物。', {
  targets: [{ kind: 'creature', filter: { tapped: true } }],
  effects: [destroyT0],
});
inst('CORE', 'C', 'Revitalize', '{1}{W}', '你獲得3點生命。抓一張牌。', { effects: [{ e: 'gain', n: 3 }, { e: 'draw', n: 1 }] });
inst('CORE', 'C', 'Tactical Advantage', '{W}', '目標由你操控、正在攻擊或阻擋的生物得+2/+2直到回合結束。', {
  targets: [{ kind: 'creature', filter: { ctrl: 'you', inCombat: true } }],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2 }],
});
inst('META', 'U', 'Valorous Stance', '{1}{W}', '選擇一項：\n• 目標生物獲得不滅異能直到回合結束。\n• 消滅目標防禦力為4或更多的生物。', {
  modes: [
    { text: '目標生物獲得不滅', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['indestructible'] }] },
    { text: '消滅防禦力4以上的生物', targets: [{ kind: 'creature', filter: { toughMin: 4 } }], effects: [destroyT0] },
  ],
});
inst('META', 'U', 'Stroke of Midnight', '{2}{W}', '消滅目標非地永久物。其操控者派出一個1/1白色人類衍生生物。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [destroyT0, { e: 'token', token: 'tok-human', who: 'T0ctrl' }],
});

// ============================================================
// 藍色
// ============================================================
cr('FDN', 'U', 'Spectral Sailor', '{U}', 'Spirit Pirate', 1, 1, '閃現，飛行\n{3}{U}：抓一張牌。', {
  keywords: ['flash', 'flying'],
  abilities: [act({ mana: '{3}{U}' }, [{ e: 'draw', n: 1 }], '抓一張牌')],
});
cr('FDN', 'U', 'Brineborn Cutthroat', '{1}{U}', 'Merfolk Pirate', 2, 1, '閃現\n每當你於對手的回合中施放咒語時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['flash'],
  abilities: [trig('castAny', [{ e: 'counters', what: 'self', n: 1 }], { cond: { c: 'notYourTurn' } })],
});
cr('META', 'U', 'Floodpits Drowner', '{1}{U}', 'Merfolk', 2, 1,
  '閃現，警戒\n當此生物進戰場時，橫置目標由對手操控的生物，並在其上放置一個暈眩指示物。\n{1}{U}，{T}：將此生物與目標有暈眩指示物的生物洗入其擁有者的牌庫。',
  {
    keywords: ['flash', 'vigilance'],
    abilities: [
      etb([{ e: 'tap', what: 'T0' }, { e: 'stun', what: 'T0' }], { targets: [OPP_CR] }),
      act({ mana: '{1}{U}', tap: true }, [{ e: 'shuffleIn', what: 'self' }, { e: 'shuffleIn', what: 'T0' }], '洗回暈眩的生物', {
        targets: [{ kind: 'creature', filter: { stunned: true } }],
      }),
    ],
  });
cr('CORE', 'C', 'Wind Drake', '{2}{U}', 'Drake', 2, 2, '飛行', { keywords: ['flying'] });
cr('CORE', 'U', 'Warden of Evos Isle', '{2}{U}', 'Bird Wizard', 2, 2, '飛行\n你施放的具飛行異能之生物咒語減少{1}來施放。', {
  keywords: ['flying'],
  abilities: [{ kind: 'static', spellCostLess: { filter: { type: 'Creature', kw: 'flying' }, n: 1 } }],
});
cr('CORE', 'C', "Man-o'-War", '{2}{U}', 'Jellyfish', 2, 2, '當此生物進戰場時，將目標生物移回其擁有者手上。', {
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [CR] })],
});
cr('META', 'R', 'Enduring Curiosity', '{2}{U}{U}', 'Cat Glimmer', 4, 3, '閃現\n每當一個由你操控的生物對玩家造成戰鬥傷害時，抓一張牌。', {
  keywords: ['flash'],
  abilities: [trig('allyCombatDamagePlayer', [{ e: 'draw', n: 1 }])],
});
cr('CORE', 'U', 'Air Elemental', '{3}{U}{U}', 'Elemental', 4, 4, '飛行', { keywords: ['flying'] });
cr('META', 'R', 'Stormwing Entity', '{3}{U}{U}', 'Elemental', 3, 3,
  '若你本回合施放過瞬間或法術咒語，則此咒語減少{2}{U}來施放。\n飛行，勇行\n當此生物進戰場時，占卜2。',
  {
    keywords: ['flying', 'prowess'],
    costReduce: { cond: { c: 'instSorcCast', n: 1 }, mana: '{2}{U}' },
    abilities: [etb([{ e: 'scry', n: 2 }])],
  });
cr('CORE', 'C', 'Frilled Sea Serpent', '{4}{U}{U}', 'Serpent', 4, 6, '{5}{U}{U}：此生物本回合不能被阻擋。', {
  abilities: [act({ mana: '{5}{U}{U}' }, [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['unblockable'] }], '本回合不能被阻擋')],
});
cr('CORE', 'R', 'Mahamoti Djinn', '{4}{U}{U}', 'Djinn', 5, 6, '飛行', { keywords: ['flying'] });
cr('META', 'C', 'Tolarian Terror', '{6}{U}', 'Serpent', 5, 5, '你墳墓場中每有一張瞬間或法術牌，此咒語便減少{1}來施放。\n守護{2}（對手的咒語或異能以它為目標時需額外支付{2}）', {
  ward: 2,
  costReduce: { perGy: { type: ['Instant', 'Sorcery'] } },
});
cr('META', 'U', 'Eddymurk Crab', '{5}{U}{U}', 'Elemental Crab', 5, 5,
  '閃現\n你墳墓場中每有一張瞬間或法術牌，此咒語便減少{1}來施放。\n當此生物進戰場時，橫置至多兩個目標生物。',
  {
    keywords: ['flash'],
    costReduce: { perGy: { type: ['Instant', 'Sorcery'] } },
    abilities: [
      etb([{ e: 'tap', what: 'T0' }, { e: 'tap', what: 'T1' }], {
        targets: [
          { kind: 'creature', optional: true },
          { kind: 'creature', optional: true },
        ],
      }),
    ],
  });
inst('CORE', 'C', 'Opt', '{U}', '占卜1。抓一張牌。', { effects: [{ e: 'scry', n: 1 }, { e: 'draw', n: 1 }] });
inst('META', 'C', 'Consider', '{U}', '刺探1。抓一張牌。', { effects: [{ e: 'surveil', n: 1 }, { e: 'draw', n: 1 }] });
sorc('META', 'C', 'Sleight of Hand', '{U}', '檢視你牌庫頂的兩張牌。將其中一張置於你手上，另一張置於你的牌庫底。', {
  effects: [{ e: 'dig', n: 2, take: 1, rest: 'bottom' }],
});
inst('FDN', 'C', 'Essence Scatter', '{1}{U}', '反擊目標生物咒語。', {
  targets: [{ kind: 'spell', filter: { type: 'Creature' } }],
  effects: [{ e: 'counter', what: 'T0' }],
});
inst('FDN', 'C', 'Negate', '{1}{U}', '反擊目標非生物咒語。', {
  targets: [{ kind: 'spell', filter: { nonType: 'Creature' } }],
  effects: [{ e: 'counter', what: 'T0' }],
});
inst('CORE', 'C', 'Cancel', '{1}{U}{U}', '反擊目標咒語。', { targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] });
inst('META', 'C', 'Spell Pierce', '{U}', '反擊目標非生物咒語，除非其操控者支付{2}。', {
  targets: [{ kind: 'spell', filter: { nonType: 'Creature' } }],
  effects: [{ e: 'counterUnless', what: 'T0', pay: 2 }],
});
inst('FDN', 'C', 'Unsummon', '{U}', '將目標生物移回其擁有者手上。', { targets: [CR], effects: [{ e: 'bounce', what: 'T0' }] });
inst('META', 'C', 'Fading Hope', '{U}', '將目標生物移回其擁有者手上。若其法術力值為3或更少，占卜1。', {
  targets: [CR],
  effects: [
    {
      e: 'if',
      cond: { c: 'targetIs', t: 0, filter: { mvMax: 3 } },
      then: [{ e: 'bounce', what: 'T0' }, { e: 'scry', n: 1 }],
      else: [{ e: 'bounce', what: 'T0' }],
    },
  ],
});
sorc('CORE', 'C', 'Divination', '{2}{U}', '抓兩張牌。', { effects: [{ e: 'draw', n: 2 }] });
inst('CORE', 'C', 'Frost Breath', '{2}{U}', '橫置至多兩個目標生物。它們於其操控者的下一個重置步驟中不能重置。', {
  targets: [
    { kind: 'creature', optional: true },
    { kind: 'creature', optional: true },
  ],
  effects: [{ e: 'stun', what: 'T0' }, { e: 'stun', what: 'T1' }],
});
sorc('CORE', 'U', "Talrand's Invocation", '{2}{U}{U}', '派出兩個2/2藍色，具飛行異能的飛龍衍生生物。', {
  effects: [{ e: 'token', token: 'tok-drake', n: 2 }],
});
sorc('CORE', 'U', 'Sleep', '{2}{U}{U}', '橫置目標對手操控的所有生物。它們於其操控者的下一個重置步驟中不能重置。', {
  targets: [OPP],
  effects: [{ e: 'stun', what: { all: { type: 'Creature', ctrl: 'opp' } } }],
});

// ============================================================
// 黑色
// ============================================================
cr('CORE', 'U', 'Viscera Seer', '{B}', 'Vampire Wizard', 1, 1, '犧牲一個生物：占卜1。', {
  abilities: [act({ sacOther: { type: 'Creature' } }, [{ e: 'scry', n: 1 }], '犧牲生物：占卜1')],
});
cr('FDN', 'U', 'Vengeful Bloodwitch', '{1}{B}', 'Vampire Warlock', 1, 1, '每當此生物或另一個由你操控的生物死去時，目標對手失去1點生命，且你獲得1點生命。', {
  abilities: [
    trig('allyDies', [{ e: 'lose', n: 1, who: 'T0' }, { e: 'gain', n: 1 }], {
      includeSelf: true,
      filter: { type: 'Creature' },
      targets: [OPP],
    }),
  ],
});
cr('CORE', 'C', 'Walking Corpse', '{1}{B}', 'Zombie', 2, 2, '');
cr('CORE', 'C', 'Doomed Dissenter', '{1}{B}', 'Human', 1, 1, '當此生物死去時，派出一個2/2黑色靈俑衍生生物。', {
  abilities: [trig('dies', [{ e: 'token', token: 'tok-zombie' }])],
});
cr('FDN', 'C', 'Burglar Rat', '{1}{B}', 'Rat', 1, 1, '當此生物進戰場時，每位對手各棄一張牌。', {
  abilities: [etb([{ e: 'discard', n: 1, who: 'opp' }])],
});
cr('FDN', 'U', 'Vampire Gourmand', '{1}{B}', 'Vampire', 2, 2, '每當此生物攻擊時，你可以犧牲另一個生物。若你如此作，抓一張牌，且此生物本回合不能被阻擋。', {
  abilities: [
    trig('attacks', [
      {
        e: 'costThen',
        prompt: '你可以犧牲另一個生物：抓一張牌，且此生物本回合不能被阻擋',
        cost: { sac: { type: 'Creature', other: true } },
        then: [{ e: 'draw', n: 1 }, { e: 'pump', what: 'self', p: 0, t: 0, kw: ['unblockable'] }],
      },
    ]),
  ],
});
cr('CORE', 'R', 'Vito, Thorn of the Dusk Rose', '{2}{B}', 'Vampire Cleric', 1, 3,
  '每當你獲得生命時，目標對手失去等量的生命。\n{3}{B}{B}：由你操控的生物獲得繫命異能直到回合結束。',
  {
    supertypes: ['Legendary'],
    abilities: [
      trig('lifegain', [{ e: 'lose', n: { ev: true }, who: 'T0' }], { targets: [OPP] }),
      act({ mana: '{3}{B}{B}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 0, t: 0, kw: ['lifelink'] }], '你的生物獲得繫命'),
    ],
  });
cr('FDN', 'C', 'Marauding Blight-Priest', '{2}{B}', 'Vampire Cleric', 3, 2, '每當你獲得生命時，每位對手各失去1點生命。', {
  abilities: [trig('lifegain', [{ e: 'lose', n: 1, who: 'opp' }])],
});
cr('FDN', 'U', 'Vampire Nighthawk', '{1}{B}{B}', 'Vampire Shaman', 2, 3, '飛行，死觸，繫命', {
  keywords: ['flying', 'deathtouch', 'lifelink'],
});
cr('META', 'R', 'Woe Strider', '{2}{B}', 'Horror', 3, 2, '當此生物進戰場時，派出一個0/1白色山羊衍生生物。\n犧牲另一個生物：占卜1。', {
  abilities: [
    etb([{ e: 'token', token: 'tok-goat' }]),
    act({ sacOther: { type: 'Creature', other: true } }, [{ e: 'scry', n: 1 }], '犧牲另一個生物：占卜1'),
  ],
});
cr('META', 'R', 'Preacher of the Schism', '{2}{B}', 'Vampire Cleric', 2, 4,
  '死觸\n每當此生物攻擊時，若對手的生命不少於你，派出一個1/1白色，具繫命異能的吸血鬼衍生生物；若你的生命不少於對手，你抓一張牌並失去1點生命。',
  {
    keywords: ['deathtouch'],
    abilities: [
      trig('attacks', [
        { e: 'if', cond: { c: 'oppLifeGteYou' }, then: [{ e: 'token', token: 'tok-vampire' }] },
        { e: 'if', cond: { c: 'youLifeGteOpp' }, then: [{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }] },
      ]),
    ],
  });
cr('FDN', 'U', 'Gravedigger', '{3}{B}', 'Zombie', 2, 2, '當此生物進戰場時，你可以將目標生物牌從你的墳墓場移回你手上。', {
  abilities: [
    etb([{ e: 'toHand', what: 'T0' }], {
      targets: [{ kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, optional: true, prompt: '選擇墳墓場中的生物牌' }],
    }),
  ],
});
cr('CORE', 'C', 'Skeleton Archer', '{3}{B}', 'Skeleton Archer', 3, 3, '當此生物進戰場時，對任意一個目標造成1點傷害。', {
  abilities: [etb([dmg(1)], { targets: [ANY] })],
});
cr('CORE', 'U', 'Vampire Sovereign', '{3}{B}{B}', 'Vampire', 3, 4, '飛行\n當此生物進戰場時，目標對手失去3點生命，且你獲得3點生命。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'lose', n: 3, who: 'T0' }, { e: 'gain', n: 3 }], { targets: [OPP] })],
});
cr('FDN', 'M', 'Bloodthirsty Conqueror', '{3}{B}{B}', 'Vampire Knight', 5, 5, '飛行，死觸\n每當對手失去生命時，你獲得等量的生命。', {
  keywords: ['flying', 'deathtouch'],
  abilities: [trig('oppLifeLoss', [{ e: 'gain', n: { ev: true } }])],
});
inst('FDN', 'C', 'Murder', '{1}{B}{B}', '消滅目標生物。', { targets: [CR], effects: [destroyT0] });
inst('META', 'U', 'Cut Down', '{B}', '消滅目標力量與防禦力總和為5或更少的生物。', {
  targets: [{ kind: 'creature', filter: { sumPTMax: 5 } }],
  effects: [destroyT0],
});
inst('META', 'U', 'Go for the Throat', '{1}{B}', '消滅目標非神器生物。', {
  targets: [{ kind: 'creature', filter: { nonType: 'Artifact' } }],
  effects: [destroyT0],
});
inst('META', 'U', 'Bitter Triumph', '{1}{B}', '施放此咒語的額外費用為支付3點生命。\n消滅目標生物。', {
  targets: [CR],
  effects: [destroyT0],
}, { addCost: { life: 3 } });
inst('META', 'U', 'Shoot the Sheriff', '{1}{B}', '消滅目標非亡命之徒的生物。（刺客、傭兵、海盜、浪客、術士都是亡命之徒）', {
  targets: [{ kind: 'creature', filter: { nonSub: OUTLAWS } }],
  effects: [destroyT0],
});
inst('META', 'U', 'Infernal Grasp', '{1}{B}', '消滅目標生物。你失去2點生命。', {
  targets: [CR],
  effects: [destroyT0, { e: 'lose', n: 2, who: 'you' }],
});
inst('CORE', 'C', 'Village Rites', '{B}', '施放此咒語的額外費用為犧牲一個生物。\n抓兩張牌。', {
  effects: [{ e: 'draw', n: 2 }],
}, { addCost: { sac: { type: 'Creature' } } });
sorc('CORE', 'C', 'Mind Rot', '{2}{B}', '目標對手棄兩張牌。', { targets: [OPP], effects: [{ e: 'discard', n: 2, who: 'T0' }] });
sorc('CORE', 'C', 'Duress', '{B}', '目標對手展示其手牌。你從中選擇一張非生物、非地的牌。該玩家棄掉那張牌。', {
  targets: [OPP],
  effects: [{ e: 'discardChosen', who: 'T0', filter: { nonType: ['Creature', 'Land'] } }],
});
sorc('CORE', 'C', "Sovereign's Bite", '{1}{B}', '目標對手失去3點生命，且你獲得3點生命。', {
  targets: [OPP],
  effects: [{ e: 'lose', n: 3, who: 'T0' }, { e: 'gain', n: 3 }],
});
inst('FDN', 'C', 'Bake into a Pie', '{2}{B}{B}', '消滅目標生物。派出一個食物衍生物。', {
  targets: [CR],
  effects: [destroyT0, { e: 'token', token: 'tok-food' }],
});

// ============================================================
// 紅色
// ============================================================
cr('META', 'U', 'Monastery Swiftspear', '{R}', 'Human Monk', 1, 2, '敏捷\n勇行（每當你施放非生物咒語時，此生物得+1/+1直到回合結束。）', {
  keywords: ['haste', 'prowess'],
});
cr('META', 'U', 'Heartfire Hero', '{R}', 'Mouse Soldier', 1, 1,
  '英勇—每回合此生物第一次成為由你操控的咒語或異能的目標時，在其上放置一個+1/+1指示物。\n當此生物死去時，它對每位對手造成等同於其力量的傷害。',
  {
    abilities: [
      trig('targeted', [{ e: 'counters', what: 'self', n: 1 }], { oncePerTurn: true }),
      trig('dies', [{ e: 'damage', n: { power: 'self' }, to: 'opp' }]),
    ],
  });
cr('META', 'R', 'Hired Claw', '{R}', 'Lizard Mercenary', 1, 2,
  '每當你以一個或數個蜥蜴攻擊時，此生物對目標對手造成1點傷害。\n{1}{R}：在此生物上放置一個+1/+1指示物。只能在本回合有對手失去過生命時起動，且每回合只能起動一次。',
  {
    abilities: [
      trig('youAttack', [dmg(1)], { filter: { sub: 'Lizard' }, targets: [OPP] }),
      act({ mana: '{1}{R}' }, [{ e: 'counters', what: 'self', n: 1 }], '+1/+1指示物', { oncePerTurn: true, cond: { c: 'oppLostLife' } }),
    ],
  });
cr('FDN', 'C', 'Fanatical Firebrand', '{R}', 'Goblin Pirate', 1, 1, '敏捷\n{T}，犧牲此生物：它對任意一個目標造成1點傷害。', {
  keywords: ['haste'],
  abilities: [act({ tap: true, sacSelf: true }, [dmg(1)], '犧牲：1點傷害', { targets: [ANY] })],
});
cr('CORE', 'C', 'Raging Goblin', '{R}', 'Goblin Berserker', 1, 1, '敏捷', { keywords: ['haste'] });
cr('CORE', 'C', 'Scorch Spitter', '{R}', 'Elemental Lizard', 1, 1, '每當此生物攻擊時，它對防禦玩家造成1點傷害。', {
  abilities: [trig('attacks', [dmg(1, 'opp')])],
});
cr('META', 'C', 'Voldaren Epicure', '{R}', 'Vampire', 1, 1, '當此生物進戰場時，它對每位對手各造成1點傷害。', {
  abilities: [etb([dmg(1, 'opp')])],
});
cr('META', 'R', 'Emberheart Challenger', '{1}{R}', 'Mouse Warrior', 2, 2,
  '敏捷，勇行\n英勇—每回合此生物第一次成為由你操控的咒語或異能的目標時，放逐你牌庫頂的牌。直到回合結束，你可以使用該牌。',
  {
    keywords: ['haste', 'prowess'],
    abilities: [trig('targeted', [{ e: 'impulse', n: 1 }], { oncePerTurn: true })],
  });
cr('META', 'R', 'Manifold Mouse', '{1}{R}', 'Mouse Soldier', 1, 2, '在你回合的戰鬥開始時，目標由你操控的老鼠獲得連擊異能直到回合結束。', {
  abilities: [
    trig('combatStart', [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['double_strike'] }], {
      targets: [{ kind: 'creature', filter: { ctrl: 'you', sub: 'Mouse' } }],
    }),
  ],
});
cr('META', 'R', 'Slickshot Show-Off', '{1}{R}', 'Bird Wizard', 1, 2, '飛行，敏捷\n每當你施放非生物咒語時，此生物得+2/+0直到回合結束。', {
  keywords: ['flying', 'haste'],
  abilities: [trig('castNoncreature', [{ e: 'pump', what: 'self', p: 2, t: 0 }])],
});
cr('CORE', 'C', 'Viashino Pyromancer', '{1}{R}', 'Lizard Wizard', 2, 1, '當此生物進戰場時，它對目標玩家造成2點傷害。', {
  abilities: [etb([dmg(2)], { targets: [PLAYER] })],
});
cr('CORE', 'C', 'Goblin Instigator', '{1}{R}', 'Goblin Rogue', 1, 1, '當此生物進戰場時，派出一個1/1紅色鬼怪衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-goblin' }])],
});
cr('FDN', 'U', 'Guttersnipe', '{2}{R}', 'Goblin Shaman', 2, 2, '每當你施放瞬間或法術咒語時，此生物對每位對手各造成2點傷害。', {
  abilities: [trig('castInstSorc', [dmg(2, 'opp')])],
});
cr('META', 'M', 'Screaming Nemesis', '{2}{R}', 'Spirit', 3, 3,
  '敏捷\n每當此生物受到傷害時，它對另外任意一個目標造成等量的傷害。以此法受到傷害的玩家於本局遊戲剩餘時間內不能獲得生命。',
  {
    keywords: ['haste'],
    abilities: [
      trig('dealtDamage', [{ e: 'damage', n: { ev: true }, to: 'T0', noLifeGain: true }], {
        targets: [{ kind: 'any', notSelf: true }],
      }),
    ],
  });
cr('CORE', 'U', 'Dragon Egg', '{2}{R}', 'Dragon Egg', 0, 2, '守軍\n當此生物死去時，派出一個2/2紅色，具飛行異能與「{R}：此生物得+1/+0直到回合結束」的龍衍生生物。', {
  keywords: ['defender'],
  abilities: [trig('dies', [{ e: 'token', token: 'tok-dragon' }])],
});
cr('CORE', 'C', 'Onakke Ogre', '{2}{R}', 'Ogre Warrior', 4, 2, '');
cr('CORE', 'C', 'Hill Giant', '{3}{R}', 'Giant', 3, 3, '');
cr('CORE', 'C', 'Kiln Fiend', '{3}{R}', 'Elemental Beast', 3, 3, '每當你施放瞬間或法術咒語時，此生物得+3/+0直到回合結束。', {
  abilities: [trig('castInstSorc', [{ e: 'pump', what: 'self', p: 3, t: 0 }])],
});
cr('CORE', 'U', 'Beetleback Chief', '{2}{R}{R}', 'Goblin Warrior', 2, 2, '當此生物進戰場時，派出兩個1/1紅色鬼怪衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-goblin', n: 2 }])],
});
cr('CORE', 'C', 'Keldon Raider', '{2}{R}{R}', 'Human Warrior', 4, 3, '當此生物進戰場時，你可以棄一張牌。若你如此作，抓一張牌。', {
  abilities: [etb([{ e: 'costThen', prompt: '你可以棄一張牌，然後抓一張牌', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }])],
});
cr('FDN', 'R', 'Goblin Chieftain', '{1}{R}{R}', 'Goblin', 2, 2, '敏捷\n由你操控的其他鬼怪生物得+1/+1且具有敏捷異能。', {
  keywords: ['haste'],
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', sub: 'Goblin', ctrl: 'you', other: true }, grant: { p: 1, t: 1, kw: ['haste'] } } },
  ],
});
cr('CORE', 'R', 'Shivan Dragon', '{4}{R}{R}', 'Dragon', 5, 5, '飛行\n{R}：此生物得+1/+0直到回合結束。', {
  keywords: ['flying'],
  abilities: [act({ mana: '{R}' }, [{ e: 'pump', what: 'self', p: 1, t: 0 }], '+1/+0')],
});
inst('FDN', 'C', 'Shock', '{R}', '對任意一個目標造成2點傷害。', { targets: [ANY], effects: [dmg(2)] });
inst('FDN', 'C', 'Burst Lightning', '{R}', '增幅{4}\n對任意一個目標造成2點傷害。若此咒語已增幅，則改為造成4點傷害。', {
  modes: [
    { text: '造成2點傷害', targets: [ANY], effects: [dmg(2)] },
    { text: '增幅：造成4點傷害', cost: '{4}{R}', targets: [ANY], effects: [dmg(4)] },
  ],
});
inst('CORE', 'C', 'Lightning Strike', '{1}{R}', '對任意一個目標造成3點傷害。', { targets: [ANY], effects: [dmg(3)] });
sorc('META', 'C', 'Strangle', '{R}', '對目標生物造成3點傷害。', { targets: [CR], effects: [dmg(3)] });
sorc('FDN', 'U', 'Boltwave', '{R}', '對每位對手各造成3點傷害。', { effects: [dmg(3, 'opp')] });
inst('CORE', 'C', "Chandra's Outrage", '{2}{R}{R}', '對目標生物造成4點傷害，並對其操控者造成2點傷害。', {
  targets: [CR],
  effects: [dmg(4), { e: 'damage', n: 2, to: 'T0ctrl' }],
});
inst('CORE', 'C', 'Sure Strike', '{1}{R}', '目標生物得+3/+0並獲得先攻異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 3, t: 0, kw: ['first_strike'] }],
});
sorc('FDN', 'C', "Krenko's Command", '{1}{R}', '派出兩個1/1紅色鬼怪衍生生物。', { effects: [{ e: 'token', token: 'tok-goblin', n: 2 }] });
inst('META', 'U', 'Monstrous Rage', '{R}', '目標生物得+2/+0直到回合結束。派出一個怪物角色衍生物結附於它。（所結附的生物得+1/+1且具有踐踏異能。）', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 0 }, { e: 'role', what: 'T0', token: 'tok-monster-role' }],
});
inst('META', 'C', 'Might of the Meek', '{R}', '目標生物得+1/+0並獲得踐踏與敏捷異能直到回合結束。抓一張牌。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['trample', 'haste'] }, { e: 'draw', n: 1 }],
});

// ============================================================
// 綠色
// ============================================================
cr('FDN', 'C', 'Llanowar Elves', '{G}', 'Elf Druid', 1, 1, '{T}：加{G}。', { produces: ['G'], zh: '林奧那精靈' });
cr('FDN', 'R', 'Scavenging Ooze', '{1}{G}', 'Ooze', 2, 2,
  '{G}：放逐目標在墳墓場中的牌。若它是生物牌，在此生物上放置一個+1/+1指示物，且你獲得1點生命。',
  {
    abilities: [
      act(
        { mana: '{G}' },
        [
          {
            e: 'if',
            cond: { c: 'targetIs', t: 0, filter: { type: 'Creature' } },
            then: [{ e: 'exileGy', what: 'T0' }, { e: 'counters', what: 'self', n: 1 }, { e: 'gain', n: 1 }],
            else: [{ e: 'exileGy', what: 'T0' }],
          },
        ],
        '放逐墳墓場的牌',
        { targets: [{ kind: 'gyCard', prompt: '選擇墳墓場中的一張牌' }] },
      ),
    ],
  });
cr('FDN', 'U', 'Thornweald Archer', '{1}{G}', 'Elf Archer', 2, 1, '延勢，死觸', { keywords: ['reach', 'deathtouch'] });
cr('META', 'M', 'Bristly Bill, Spine Sower', '{1}{G}', 'Plant Druid', 2, 2,
  '地落—每當一個地在你的操控下進戰場時，在目標生物上放置一個+1/+1指示物。若該生物上已有指示物，則改為放置兩個。\n{3}{G}{G}：將由你操控的每個生物上的+1/+1指示物數量加倍。',
  {
    supertypes: ['Legendary'],
    abilities: [
      trig(
        'landfall',
        [
          {
            e: 'if',
            cond: { c: 'targetIs', t: 0, filter: { hasCounters: true } },
            then: [{ e: 'counters', what: 'T0', n: 2 }],
            else: [{ e: 'counters', what: 'T0', n: 1 }],
          },
        ],
        { targets: [CR] },
      ),
      act({ mana: '{3}{G}{G}' }, [{ e: 'doubleCounters', what: { all: { type: 'Creature', ctrl: 'you' } } }], '指示物加倍'),
    ],
  });
cr('CORE', 'C', 'Grizzly Bears', '{1}{G}', 'Bear', 2, 2, '', { zh: '灰熊' });
cr('FDN', 'R', 'Mossborn Hydra', '{2}{G}', 'Elemental Hydra', 0, 0,
  '踐踏\n此生物進戰場時上面有一個+1/+1指示物。\n地落—每當一個地在你的操控下進戰場時，將此生物上的+1/+1指示物數量加倍。',
  {
    keywords: ['trample'],
    etbCounters: 1,
    abilities: [trig('landfall', [{ e: 'doubleCounters', what: 'self' }])],
  });
cr('CORE', 'C', 'Centaur Courser', '{2}{G}', 'Centaur Warrior', 3, 3, '');
cr('CORE', 'C', 'Llanowar Visionary', '{2}{G}', 'Elf Druid', 2, 2, '當此生物進戰場時，抓一張牌。\n{T}：加{G}。', {
  produces: ['G'],
  abilities: [etb([{ e: 'draw', n: 1 }])],
});
cr('FDN', 'U', 'Gnarlback Rhino', '{2}{G}{G}', 'Rhino', 4, 4, '踐踏\n每當你施放以此生物為目標的咒語時，抓一張牌。', {
  keywords: ['trample'],
  abilities: [trig('targeted', [{ e: 'draw', n: 1 }], { spellOnly: true })],
});
cr('META', 'R', 'Steel Leaf Champion', '{G}{G}{G}', 'Elf Knight', 5, 4, '此生物不能被力量等於或小於2的生物阻擋。', { evadePowLte: 2 });
cr('CORE', 'R', 'Rampaging Baloths', '{4}{G}{G}', 'Beast', 6, 6, '踐踏\n地落—每當一個地在你的操控下進戰場時，你可以派出一個4/4綠色野獸衍生生物。', {
  keywords: ['trample'],
  abilities: [trig('landfall', [{ e: 'token', token: 'tok-beast' }], { may: '要派出一個4/4野獸衍生生物嗎？' })],
});
cr('CORE', 'C', 'Colossal Dreadmaw', '{4}{G}{G}', 'Dinosaur', 6, 6, '踐踏', { keywords: ['trample'] });
inst('FDN', 'C', 'Giant Growth', '{G}', '目標生物得+3/+3直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 3, t: 3 }] }, { zh: '巨人成長' });
inst('CORE', 'C', 'Titanic Growth', '{1}{G}', '目標生物得+4/+4直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 4, t: 4 }] });
inst('META', 'C', 'Snakeskin Veil', '{G}', '在目標由你操控的生物上放置一個+1/+1指示物。它獲得辟邪異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['hexproof'] }],
});
sorc('CORE', 'C', 'Rabid Bite', '{1}{G}', '目標由你操控的生物對目標非由你操控的生物造成等同於其力量的傷害。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'bite', a: 'T0', b: 'T1' }],
});
sorc('CORE', 'C', 'Prey Upon', '{G}', '目標由你操控的生物與目標非由你操控的生物互鬥。（兩者各對對方造成等同於自身力量的傷害。）', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'fight', a: 'T0', b: 'T1' }],
});
ench('META', 'U', 'Up the Beanstalk', '{1}{G}', '當此結界進戰場時，抓一張牌。\n每當你施放法術力值為5或更多的咒語時，抓一張牌。', {
  abilities: [etb([{ e: 'draw', n: 1 }]), trig('castAny', [{ e: 'draw', n: 1 }], { filter: { mvMin: 5 } })],
});
ench('FDN', 'U', "Garruk's Uprising", '{2}{G}',
  '當此結界進戰場時，若你操控力量為4或更多的生物，抓一張牌。\n由你操控的生物具有踐踏異能。\n每當一個力量為4或更多的生物在你的操控下進戰場時，抓一張牌。',
  {
    abilities: [
      etb([{ e: 'if', cond: { c: 'controls', filter: { type: 'Creature', powMin: 4 } }, then: [{ e: 'draw', n: 1 }] }]),
      { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you' }, grant: { kw: ['trample'] } } },
      trig('allyEtb', [{ e: 'draw', n: 1 }], { filter: { powMin: 4 } }),
    ],
  });

// ============================================================
// 多色
// ============================================================
inst('META', 'U', 'Lightning Helix', '{R}{W}', '對任意一個目標造成3點傷害，且你獲得3點生命。', {
  targets: [ANY],
  effects: [dmg(3), { e: 'gain', n: 3 }],
});
inst('META', 'U', 'Boros Charm', '{R}{W}', '選擇一項：\n• 對目標玩家造成4點傷害。\n• 由你操控的永久物獲得不滅異能直到回合結束。\n• 目標生物獲得連擊異能直到回合結束。', {
  modes: [
    { text: '對玩家造成4點傷害', targets: [PLAYER], effects: [dmg(4)] },
    { text: '你的永久物獲得不滅', effects: [{ e: 'pump', what: { all: { ctrl: 'you' } }, p: 0, t: 0, kw: ['indestructible'] }] },
    { text: '目標生物獲得連擊', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['double_strike'] }] },
  ],
});
inst('META', 'R', 'Absorb', '{W}{U}{U}', '反擊目標咒語。你獲得3點生命。', {
  targets: [{ kind: 'spell' }],
  effects: [{ e: 'counter', what: 'T0' }, { e: 'gain', n: 3 }],
});
inst('META', 'C', 'Growth Spiral', '{G}{U}', '抓一張牌。你可以將一張地牌從你手上放進戰場。', {
  effects: [{ e: 'draw', n: 1 }, { e: 'landFromHand' }],
});
inst('META', 'U', 'Izzet Charm', '{U}{R}', '選擇一項：\n• 反擊目標非生物咒語，除非其操控者支付{2}。\n• 對目標生物造成2點傷害。\n• 抓兩張牌，然後棄兩張牌。', {
  modes: [
    { text: '反擊非生物咒語（除非支付{2}）', targets: [{ kind: 'spell', filter: { nonType: 'Creature' } }], effects: [{ e: 'counterUnless', what: 'T0', pay: 2 }] },
    { text: '對生物造成2點傷害', targets: [CR], effects: [dmg(2)] },
    { text: '抓兩張再棄兩張', effects: [{ e: 'draw', n: 2 }, { e: 'discard', n: 2, who: 'you' }] },
  ],
});
sorc('META', 'R', 'Dreadbore', '{B}{R}', '消滅目標生物。', { targets: [CR], effects: [destroyT0] });
inst('META', 'U', 'Putrefy', '{1}{B}{G}', '消滅目標神器或生物。', {
  targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'] } }],
  effects: [destroyT0],
});
cr('META', 'U', 'Mayhem Devil', '{1}{B}{R}', 'Devil', 3, 3, '每當一位玩家犧牲一個永久物時，此生物對任意一個目標造成1點傷害。', {
  abilities: [trig('sacrifice', [dmg(1)], { targets: [ANY] })],
});
inst('META', 'R', 'Anguished Unmaking', '{1}{W}{B}', '放逐目標非地永久物。你失去3點生命。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'exile', what: 'T0' }, { e: 'lose', n: 3, who: 'you' }],
});
inst('META', 'U', 'Selesnya Charm', '{G}{W}', '選擇一項：\n• 目標生物得+2/+2並獲得踐踏異能直到回合結束。\n• 放逐目標力量為5或更多的生物。\n• 派出一個2/2白色，具警戒異能的騎士衍生生物。', {
  modes: [
    { text: '+2/+2 並獲得踐踏', targets: [CR], effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['trample'] }] },
    { text: '放逐力量5以上的生物', targets: [{ kind: 'creature', filter: { powMin: 5 } }], effects: [{ e: 'exile', what: 'T0' }] },
    { text: '派出2/2騎士', effects: [{ e: 'token', token: 'tok-knight' }] },
  ],
});

// ============================================================
// 神器
// ============================================================
arti('CORE', 'C', 'Short Sword', '{1}', '佩帶此武具的生物得+1/+1。\n裝備{1}', {
  subtypes: ['Equipment'],
  equip: { cost: '{1}', grant: { p: 1, t: 1 } },
});
arti('CORE', 'U', 'Vulshok Morningstar', '{2}', '佩帶此武具的生物得+2/+2。\n裝備{2}', {
  subtypes: ['Equipment'],
  equip: { cost: '{2}', grant: { p: 2, t: 2 } },
});
arti('FDN', 'U', 'Swiftfoot Boots', '{2}', '佩帶此武具的生物具有辟邪與敏捷異能。\n裝備{1}', {
  subtypes: ['Equipment'],
  equip: { cost: '{1}', grant: { kw: ['hexproof', 'haste'] } },
});
arti('META', 'R', 'Leyline Axe', '{4}', '若此牌在你的起手手牌中，你可以讓它在遊戲開始時就在戰場上。\n佩帶此武具的生物得+1/+1且具有連擊與踐踏異能。\n裝備{3}', {
  subtypes: ['Equipment'],
  leyline: true,
  equip: { cost: '{3}', grant: { p: 1, t: 1, kw: ['double_strike', 'trample'] } },
});
arti('CORE', 'U', 'Mind Stone', '{2}', '{T}：加{C}。\n{1}，{T}，犧牲此神器：抓一張牌。', {
  produces: ['C'],
  abilities: [act({ mana: '{1}', tap: true, sacSelf: true }, [{ e: 'draw', n: 1 }], '犧牲：抓一張牌')],
});

// ============================================================
// 非基本地
// ============================================================
const gainland = (name: string, a: Mana, b: Mana) =>
  land('FDN', 'C', name, [a, b], `此地橫置進戰場。\n當此地進戰場時，你獲得1點生命。\n{T}：加{${a}}或{${b}}。`, {
    etbTapped: true,
    abilities: [etb([{ e: 'gain', n: 1 }])],
  });
gainland('Scoured Barrens', 'W', 'B');
gainland('Tranquil Cove', 'W', 'U');
gainland('Dismal Backwater', 'U', 'B');
gainland('Swiftwater Cliffs', 'U', 'R');
gainland('Bloodfell Caves', 'B', 'R');
gainland('Jungle Hollow', 'B', 'G');
gainland('Rugged Highlands', 'R', 'G');
gainland('Wind-Scarred Crag', 'R', 'W');
gainland('Blossoming Sands', 'G', 'W');
gainland('Thornwood Falls', 'G', 'U');

const fastland = (name: string, a: Mana, b: Mana) =>
  land('META', 'R', name, [a, b], `除非你操控兩個或更少的其他地，否則此地橫置進戰場。\n{T}：加{${a}}或{${b}}。`, {
    etbTappedUnless: { c: 'landsLte', n: 2 },
  });
fastland('Inspiring Vantage', 'R', 'W');
fastland('Concealed Courtyard', 'W', 'B');
fastland('Seachrome Coast', 'W', 'U');
fastland('Darkslick Shores', 'U', 'B');
fastland('Spirebluff Canal', 'U', 'R');
fastland('Blackcleave Cliffs', 'B', 'R');
fastland('Blooming Marsh', 'B', 'G');
fastland('Copperline Gorge', 'R', 'G');
fastland('Botanical Sanctum', 'G', 'U');
fastland('Razorverge Thicket', 'G', 'W');

land('FDN', 'C', 'Evolving Wilds', [], '{T}，犧牲此地：從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場，然後將你的牌庫洗牌。', {
  abilities: [act({ tap: true, sacSelf: true }, [{ e: 'searchLand', to: 'battlefield', tapped: true }], '搜尋基本地')],
});
land('META', 'R', 'Fabled Passage', [], '{T}，犧牲此地：從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場，然後將你的牌庫洗牌。然後若你操控四個或更多地，重置該地。', {
  abilities: [act({ tap: true, sacSelf: true }, [{ e: 'searchLand', to: 'battlefield', tapped: true, untapIfLands: 4 }], '搜尋基本地')],
});

export const CARDS: CardDef[] = defs;
export const BASIC_LANDS = ['plains', 'island', 'swamp', 'mountain', 'forest'];
