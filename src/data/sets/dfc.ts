// ============================================================
// 雙面牌（手動定義）
// 轉化：戰場上的雙面牌翻到背面，變成另一張牌；離開戰場後會回到正面。
// 模式雙面牌：施放時可以選擇正面或背面。
// ============================================================
import type { CardDef, SetCode } from '../../engine/types';
import { ANY, add } from '../dsl';

const NOTE_TRANSFORM = (back: string) => `（雙面牌：轉化後會翻到背面《${back}》。）`;
const NOTE_MDFC = (back: string) => `（模式雙面牌：你可以選擇施放正面，或施放背面《${back}》。正面也可以付費轉化成背面。）`;

/** 背面的定義 */
function back(set: SetCode, rarity: CardDef['rarity'], front: string, d: Omit<CardDef, 'id' | 'set' | 'rarity'>): CardDef {
  return { id: `${front.toLowerCase().replace(/['’,]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-back`, set, rarity, ...d };
}

const craftText = (cost: string, self: string, what: string) =>
  `工藝—${cost}，放逐${self}與${what}（由你操控的，或在你墳墓場中的）：將${self}轉化後放回戰場。只能於法術時機起動。`;

// ---------------- 依克黎洞窟（LCI） ----------------
add({
  set: 'LCI',
  rarity: 'U',
  name: 'Clay-Fired Bricks',
  imageName: 'Clay-Fired Bricks // Cosmium Kiln',
  cost: '{1}{W}',
  types: ['Artifact'],
  text: `當此神器進戰場時，從你的牌庫中搜尋一張基本平原牌，展示該牌並置於你手上，然後將你的牌庫洗牌。你獲得2點生命。\n${craftText('{5}{W}{W}', '此神器', '另一個神器')}\n${NOTE_TRANSFORM('Cosmium Kiln')}`,
  abilities: [
    { kind: 'trigger', on: 'etb', effects: [{ e: 'tutor', filter: { type: 'Land', sub: 'Plains', basic: true } }, { e: 'gain', n: 2 }] },
    { kind: 'activated', cost: { mana: '{5}{W}{W}', craft: { type: 'Artifact' } }, sorcery: true, effects: [{ e: 'returnTransformed' }], label: '工藝：轉化' },
  ],
  back: back('LCI', 'U', 'Clay-Fired Bricks', {
    name: 'Cosmium Kiln',
    types: ['Artifact'],
    text: '當此神器進戰場時，派出兩個1/1無色的侏儒神器生物衍生物。\n由你操控的生物得+1/+1。',
    abilities: [
      { kind: 'trigger', on: 'etb', effects: [{ e: 'token', token: 'tok-gnome', n: 2 }] },
      { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you' }, grant: { p: 1, t: 1 } } },
    ],
  }),
});

add({
  set: 'LCI',
  rarity: 'C',
  name: 'Inverted Iceberg',
  imageName: 'Inverted Iceberg // Iceberg Titan',
  cost: '{1}{U}',
  types: ['Artifact'],
  text: `當此神器進戰場時，磨一張牌，然後抓一張牌。\n${craftText('{4}{U}{U}', '此神器', '另一個神器')}\n${NOTE_TRANSFORM('Iceberg Titan')}`,
  abilities: [
    { kind: 'trigger', on: 'etb', effects: [{ e: 'mill', n: 1 }, { e: 'draw', n: 1 }] },
    { kind: 'activated', cost: { mana: '{4}{U}{U}', craft: { type: 'Artifact' } }, sorcery: true, effects: [{ e: 'returnTransformed' }], label: '工藝：轉化' },
  ],
  back: back('LCI', 'C', 'Inverted Iceberg', {
    name: 'Iceberg Titan',
    types: ['Artifact', 'Creature'],
    subtypes: ['Golem'],
    power: 6,
    toughness: 6,
    text: '每當此生物攻擊時，你可以橫置目標神器或生物。（簡化：原本是橫置或重置）',
    abilities: [
      {
        kind: 'trigger',
        on: 'attacks',
        may: '橫置目標神器或生物？',
        targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'], ctrl: 'opp' } }],
        effects: [{ e: 'tap', what: 'T0' }],
      },
    ],
  }),
});

add({
  set: 'LCI',
  rarity: 'U',
  name: 'Visage of Dread',
  imageName: 'Visage of Dread // Dread Osseosaur',
  cost: '{1}{B}',
  types: ['Artifact'],
  text: `當此神器進戰場時，目標對手展示其手牌。你從中選擇一張神器或生物牌，該玩家棄掉那張牌。\n${craftText('{5}{B}', '此神器', '兩個生物')}\n${NOTE_TRANSFORM('Dread Osseosaur')}`,
  abilities: [
    {
      kind: 'trigger',
      on: 'etb',
      targets: [{ kind: 'opponent' }],
      effects: [{ e: 'discardChosen', who: 'T0', filter: { type: ['Artifact', 'Creature'] } }],
    },
    {
      kind: 'activated',
      cost: { mana: '{5}{B}', craft: { type: 'Creature' }, craftCount: 2 },
      sorcery: true,
      effects: [{ e: 'returnTransformed' }],
      label: '工藝：轉化',
    },
  ],
  back: back('LCI', 'U', 'Visage of Dread', {
    name: 'Dread Osseosaur',
    types: ['Creature'],
    subtypes: ['Dinosaur', 'Skeleton', 'Horror'],
    power: 5,
    toughness: 4,
    keywords: ['menace'],
    text: '威懾\n每當此生物進戰場或攻擊時，你可以磨兩張牌。',
    abilities: [
      { kind: 'trigger', on: 'etb', may: '磨兩張牌？', effects: [{ e: 'mill', n: 2 }] },
      { kind: 'trigger', on: 'attacks', may: '磨兩張牌？', effects: [{ e: 'mill', n: 2 }] },
    ],
  }),
});

add({
  set: 'LCI',
  rarity: 'C',
  name: 'Idol of the Deep King',
  imageName: "Idol of the Deep King // Sovereign's Macuahuitl",
  cost: '{2}{R}',
  types: ['Artifact'],
  keywords: ['flash'],
  text: `閃現\n當此神器進戰場時，它對任意一個目標造成2點傷害。\n${craftText('{2}{R}', '此神器', '另一個神器')}\n${NOTE_TRANSFORM("Sovereign's Macuahuitl")}`,
  abilities: [
    { kind: 'trigger', on: 'etb', targets: [ANY], effects: [{ e: 'damage', n: 2, to: 'T0' }] },
    { kind: 'activated', cost: { mana: '{2}{R}', craft: { type: 'Artifact' } }, sorcery: true, effects: [{ e: 'returnTransformed' }], label: '工藝：轉化' },
  ],
  back: back('LCI', 'C', 'Idol of the Deep King', {
    name: "Sovereign's Macuahuitl",
    types: ['Artifact'],
    subtypes: ['Equipment'],
    text: '當此武具進戰場時，將它裝備到目標由你操控的生物上。\n佩帶此武具的生物得+2/+0。\n裝備{2}',
    equip: { cost: '{2}', grant: { p: 2 } },
    abilities: [{ kind: 'trigger', on: 'etb', targets: [{ kind: 'creature', filter: { ctrl: 'you' } }], effects: [{ e: 'attach', what: 'T0' }] }],
  }),
});

add({
  set: 'LCI',
  rarity: 'M',
  name: 'Aclazotz, Deepest Betrayal',
  imageName: 'Aclazotz, Deepest Betrayal // Temple of the Dead',
  cost: '{3}{B}{B}',
  types: ['Creature'],
  supertypes: ['Legendary'],
  subtypes: ['Bat', 'God'],
  power: 4,
  toughness: 4,
  keywords: ['flying', 'lifelink'],
  text: `飛行，繫命\n每當此生物攻擊時，每位對手棄一張牌。若對手沒有手牌可棄，你抓一張牌。\n當此生物死去時，將它轉化並橫置放回戰場。\n（簡化：省略「對手棄掉地牌時派出蝙蝠」）\n${NOTE_TRANSFORM('Temple of the Dead')}`,
  abilities: [
    {
      kind: 'trigger',
      on: 'attacks',
      effects: [
        { e: 'if', cond: { c: 'handLte', who: 'opp', n: 0 }, then: [{ e: 'draw', n: 1 }] },
        { e: 'discard', n: 1, who: 'opp' },
      ],
    },
    { kind: 'trigger', on: 'dies', effects: [{ e: 'returnTransformed', tapped: true }] },
  ],
  back: back('LCI', 'M', 'Aclazotz, Deepest Betrayal', {
    name: 'Temple of the Dead',
    types: ['Land'],
    produces: ['B'],
    text: '{T}：加{B}。\n{2}{B}，{T}：轉化此地。只能在有玩家的手牌為一張或更少時，於法術時機起動。',
    abilities: [
      {
        kind: 'activated',
        cost: { mana: '{2}{B}', tap: true },
        sorcery: true,
        cond: { c: 'handLte', who: 'any', n: 1 },
        effects: [{ e: 'transform', what: 'self' }],
        label: '轉化為 Aclazotz',
      },
    ],
  }),
});

// ---------------- 太空戰士（FIN） ----------------
add({
  set: 'FIN',
  rarity: 'R',
  name: 'Venat, Heart of Hydaelyn',
  imageName: 'Venat, Heart of Hydaelyn // Hydaelyn, the Mothercrystal',
  cost: '{1}{W}{W}',
  types: ['Creature'],
  supertypes: ['Legendary'],
  subtypes: ['Elder', 'Wizard'],
  power: 3,
  toughness: 3,
  text: `每當你施放傳奇咒語時，抓一張牌。此異能每回合只會觸發一次。\n{7}，{T}：放逐目標非地永久物。轉化此生物。只能於法術時機起動。\n${NOTE_TRANSFORM('Hydaelyn, the Mothercrystal')}`,
  abilities: [
    { kind: 'trigger', on: 'castAny', filter: { legendary: true }, oncePerTurn: true, effects: [{ e: 'draw', n: 1 }] },
    {
      kind: 'activated',
      cost: { mana: '{7}', tap: true },
      sorcery: true,
      targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
      effects: [
        { e: 'exile', what: 'T0' },
        { e: 'transform', what: 'self' },
      ],
      label: '放逐並轉化',
    },
  ],
  back: back('FIN', 'R', 'Venat, Heart of Hydaelyn', {
    name: 'Hydaelyn, the Mothercrystal',
    types: ['Creature'],
    supertypes: ['Legendary'],
    subtypes: ['God'],
    power: 4,
    toughness: 4,
    keywords: ['indestructible'],
    text: '不滅\n在你回合的戰鬥開始時，在另一個目標由你操控的生物上放置一個+1/+1指示物，它獲得不滅異能直到回合結束。若該生物是傳奇，抓一張牌。（簡化：原本不滅持續到你的下個回合）',
    abilities: [
      {
        kind: 'trigger',
        on: 'combatStart',
        targets: [{ kind: 'creature', filter: { ctrl: 'you' }, notSelf: true }],
        effects: [
          { e: 'counters', what: 'T0', n: 1 },
          { e: 'pump', what: 'T0', p: 0, t: 0, kw: ['indestructible'] },
          { e: 'if', cond: { c: 'targetIs', t: 0, filter: { legendary: true } }, then: [{ e: 'draw', n: 1 }] },
        ],
      },
    ],
  }),
});

// ---------------- 模式雙面牌（SPM、MSH） ----------------
add({
  set: 'SPM',
  rarity: 'M',
  name: 'Peter Parker',
  imageName: 'Peter Parker // Amazing Spider-Man',
  cost: '{1}{W}',
  types: ['Creature'],
  supertypes: ['Legendary'],
  subtypes: ['Human', 'Scientist', 'Hero'],
  power: 0,
  toughness: 1,
  mdfc: true,
  text: `當此生物進戰場時，派出一個2/1綠色，具有延勢異能的蜘蛛衍生生物。\n{1}{G}{W}{U}：轉化此生物。只能於法術時機起動。\n${NOTE_MDFC('Amazing Spider-Man')}`,
  abilities: [
    { kind: 'trigger', on: 'etb', effects: [{ e: 'token', token: 'tok-spider-reach' }] },
    { kind: 'activated', cost: { mana: '{1}{G}{W}{U}' }, sorcery: true, effects: [{ e: 'transform', what: 'self' }], label: '轉化為蜘蛛人' },
  ],
  back: back('SPM', 'M', 'Peter Parker', {
    name: 'Amazing Spider-Man',
    cost: '{1}{G}{W}{U}',
    types: ['Creature'],
    supertypes: ['Legendary'],
    subtypes: ['Spider', 'Human', 'Hero'],
    power: 4,
    toughness: 4,
    keywords: ['vigilance', 'reach'],
    text: '警戒，延勢\n（簡化：省略「你施放的傳奇咒語具有蛛網飛盪」）',
  }),
});

add({
  set: 'SPM',
  rarity: 'M',
  name: 'Norman Osborn',
  imageName: 'Norman Osborn // Green Goblin',
  cost: '{1}{U}',
  types: ['Creature'],
  supertypes: ['Legendary'],
  subtypes: ['Human', 'Scientist', 'Villain'],
  power: 1,
  toughness: 1,
  keywords: ['unblockable'],
  mdfc: true,
  text: `此生物不能被阻擋。\n每當此生物對玩家造成戰鬥傷害時，它進行密謀。\n{1}{U}{B}{R}：轉化此生物。只能於法術時機起動。\n${NOTE_MDFC('Green Goblin')}`,
  abilities: [
    { kind: 'trigger', on: 'combatDamagePlayer', effects: [{ e: 'connive', what: 'self' }] },
    { kind: 'activated', cost: { mana: '{1}{U}{B}{R}' }, sorcery: true, effects: [{ e: 'transform', what: 'self' }], label: '轉化為綠惡魔' },
  ],
  back: back('SPM', 'M', 'Norman Osborn', {
    name: 'Green Goblin',
    cost: '{1}{U}{B}{R}',
    types: ['Creature'],
    supertypes: ['Legendary'],
    subtypes: ['Goblin', 'Human', 'Villain'],
    power: 3,
    toughness: 3,
    keywords: ['flying', 'menace'],
    text: '飛行，威懾\n（簡化：省略從墳墓場施放咒語的相關異能）',
  }),
});

add({
  set: 'SPM',
  rarity: 'M',
  name: 'Miles Morales',
  imageName: 'Miles Morales // Ultimate Spider-Man',
  cost: '{1}{G}',
  types: ['Creature'],
  supertypes: ['Legendary'],
  subtypes: ['Human', 'Citizen', 'Hero'],
  power: 1,
  toughness: 2,
  mdfc: true,
  text: `當此生物進戰場時，在至多兩個目標生物上各放置一個+1/+1指示物。\n{3}{R}{G}{W}：轉化此生物。只能於法術時機起動。\n${NOTE_MDFC('Ultimate Spider-Man')}`,
  abilities: [
    {
      kind: 'trigger',
      on: 'etb',
      targets: [
        { kind: 'creature', optional: true },
        { kind: 'creature', optional: true },
      ],
      effects: [
        { e: 'counters', what: 'T0', n: 1 },
        { e: 'counters', what: 'T1', n: 1 },
      ],
    },
    { kind: 'activated', cost: { mana: '{3}{R}{G}{W}' }, sorcery: true, effects: [{ e: 'transform', what: 'self' }], label: '轉化為終極蜘蛛人' },
  ],
  back: back('SPM', 'M', 'Miles Morales', {
    name: 'Ultimate Spider-Man',
    cost: '{3}{R}{G}{W}',
    types: ['Creature'],
    supertypes: ['Legendary'],
    subtypes: ['Spider', 'Human', 'Hero'],
    power: 4,
    toughness: 3,
    keywords: ['first_strike', 'haste'],
    text: '先攻，敏捷\n偽裝—{2}：在此生物上放置一個+1/+1指示物。它獲得辟邪異能直到回合結束。\n每當你攻擊時，由你操控的每個蜘蛛與傳奇生物上的+1/+1指示物數量加倍。',
    abilities: [
      {
        kind: 'activated',
        cost: { mana: '{2}' },
        effects: [
          { e: 'counters', what: 'self', n: 1 },
          { e: 'pump', what: 'self', p: 0, t: 0, kw: ['hexproof'] },
        ],
        label: '偽裝',
      },
      {
        kind: 'trigger',
        on: 'youAttack',
        effects: [{ e: 'doubleCounters', what: { all: { type: 'Creature', ctrl: 'you', or: [{ sub: 'Spider' }, { legendary: true }] } } }],
      },
    ],
  }),
});

add({
  set: 'MSH',
  rarity: 'M',
  name: 'Monica Rambeau',
  imageName: 'Monica Rambeau // Photon, Living Light',
  cost: '{2}{W}',
  types: ['Creature'],
  supertypes: ['Legendary'],
  subtypes: ['Human', 'Hero'],
  power: 3,
  toughness: 3,
  keywords: ['flying', 'prowess'],
  mdfc: true,
  text: `飛行，勇行\n{2}{R}{W}{W}：轉化此生物。只能於法術時機起動。\n${NOTE_MDFC('Photon, Living Light')}`,
  abilities: [{ kind: 'activated', cost: { mana: '{2}{R}{W}{W}' }, sorcery: true, effects: [{ e: 'transform', what: 'self' }], label: '轉化為光子' }],
  back: back('MSH', 'M', 'Monica Rambeau', {
    name: 'Photon, Living Light',
    cost: '{2}{R}{W}{W}',
    types: ['Creature'],
    supertypes: ['Legendary'],
    subtypes: ['Elemental', 'Hero'],
    power: 4,
    toughness: 4,
    keywords: ['flying', 'hexproof', 'prowess'],
    text: '飛行，辟邪，勇行\n每當你施放非生物咒語時，在由你操控的每個其他生物上各放置一個+1/+1指示物。',
    abilities: [
      { kind: 'trigger', on: 'castNoncreature', effects: [{ e: 'counters', what: { all: { type: 'Creature', ctrl: 'you', other: true } }, n: 1 }] },
    ],
  }),
});
