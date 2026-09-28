// ============================================================
// 天梯配對：段位、積分與模擬的線上對手
// 對手由 AI 扮演，依段位決定強度（難度、套牌、思考速度、個性）。
// ============================================================
import type { Level } from '../ai/combatAI';
import { COLLECTIBLE, STANDARD_STARTERS, STARTER_DECKS, aiDecksFor, type Format } from '../data';
import { getDef } from '../engine/registry';

export const TIERS = [
  { id: 'bronze', name: '青銅', color: '#b0764a' },
  { id: 'silver', name: '白銀', color: '#b9c3cc' },
  { id: 'gold', name: '黃金', color: '#e0b64e' },
  { id: 'platinum', name: '白金', color: '#6fd0c4' },
  { id: 'diamond', name: '鑽石', color: '#8fa8ff' },
  { id: 'mythic', name: '秘稀', color: '#f07b3c' },
] as const;

/** 每個小段的星數 */
export const PIPS = 5;
/** 每個大段有 4 個小段（4 → 1） */
export const DIVS = 4;
const TIER_PTS = PIPS * DIVS;
/** 積分達到這個值就進入秘稀 */
export const MYTHIC_PTS = TIER_PTS * 5;

export interface RankInfo {
  tier: number;
  /** 4 ~ 1；秘稀為 0 */
  div: number;
  pips: number;
  /** 秘稀名次（假的排名） */
  mythicPlace?: number;
  label: string;
}

export function rankOf(points: number): RankInfo {
  const p = Math.max(0, points);
  if (p >= MYTHIC_PTS) {
    const over = p - MYTHIC_PTS;
    const place = Math.max(1, Math.round(1800 / (1 + over * 0.35)));
    return { tier: 5, div: 0, pips: 0, mythicPlace: place, label: `秘稀 #${place}` };
  }
  const tier = Math.floor(p / TIER_PTS);
  const inTier = p % TIER_PTS;
  const div = DIVS - Math.floor(inTier / PIPS);
  const pips = inTier % PIPS;
  return { tier, div, pips, label: `${TIERS[tier].name} ${div}` };
}

export interface LadderRecord {
  at: number;
  format: Format;
  opponent: string;
  oppRank: string;
  oppDeck: string;
  myDeck: string;
  won: boolean;
  delta: number;
}

export interface LadderFormat {
  points: number;
  best: number;
  w: number;
  l: number;
  streak: number;
}

export interface LadderState {
  standard: LadderFormat;
  free: LadderFormat;
  history: LadderRecord[];
}

export function newLadder(): LadderState {
  const f = (): LadderFormat => ({ points: 0, best: 0, w: 0, l: 0, streak: 0 });
  return { standard: f(), free: f(), history: [] };
}

/** 勝負後的積分變化（黃金以下連勝加星、青銅不掉星、不會掉出目前大段） */
export function pointsDelta(lf: LadderFormat, won: boolean): number {
  const r = rankOf(lf.points);
  if (won) {
    if (r.tier === 5) return 2;
    return r.tier <= 2 && lf.streak >= 2 ? 2 : 1;
  }
  if (r.tier === 0) return 0;
  if (r.tier === 5) return -2;
  const floor = r.tier * TIER_PTS;
  return lf.points - 1 < floor ? 0 : -1;
}

export function ladderReward(points: number, won: boolean): number {
  const t = rankOf(points).tier;
  return won ? 90 + t * 15 : 20 + t * 4;
}

// ---------------- 模擬的對手 ----------------

export interface Opponent {
  name: string;
  /** 顯示用的玩家等級 */
  lv: number;
  points: number;
  rank: string;
  tier: number;
  /** 頭像卡牌 id */
  face: string | null;
  deckId: string;
  level: Level;
  /** 思考速度倍率（越大越慢） */
  think: number;
  /** 0 ~ 1：愛不愛發表情 */
  chatty: number;
  /** 0 ~ 1：局勢無望時投降的機率 */
  quitter: number;
  /** 是否有禮貌（會打招呼、說 GG） */
  polite: boolean;
}

const NAMES = [
  '夜貓打牌中', '綠色大軍', '藍控仔', 'SpikeTW', 'Timmy愛大隻', '茶葉蛋', '咖啡不加糖', 'PlaneswalkerLin', '抽牌看天',
  'MoxOrNothing', '阿明', '法術力燒傷', '塞拉天使粉', 'RDW_forever', '鹽酸兔', '雷霆一擊', '一回合殺', '猛獁象', '傑斯的學生',
  'BoltTheBird', 'IslandGo', '三色瓊德', '陸行鳥騎士', '矮人鐵匠', 'Kai_0917', '小瑜', 'mana_screw', '地太多了', '再抽一張',
  'TopdeckKing', '魔法師小艾', 'Sunny_Chen', '松鼠大王', '墳場管理員', '鬼怪頭目', 'Tarmogoyf', 'NoMoreLies', '白天鵝',
  '桌遊咖', '哈比人', 'Evergreen', 'wenwen', '黑魔導', '阿佐里斯議員', '史瑞克', 'Dimir_Agent', '飛天小女警', 'LandGoBrrr',
  '賽博龐克', 'Mulligan7', '不抽地', 'Jeff_TW', '烏賊哥', '小火龍', 'OneMoreTurn', '打牌不累', '北極熊', 'Draftosaurus',
  '雨天打牌', 'Chloe', '台中陳先生', 'kevin_mtg', 'NinjaMom', '青蛙王子', 'LlanowarElf', '萬智新手', 'grindy', '海鹽拿鐵',
];

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function weighted<T>(items: [T, number][], rnd: () => number): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rnd() * total;
  for (const [v, w] of items) {
    if ((x -= w) < 0) return v;
  }
  return items[items.length - 1][0];
}

/** 各段位的難度分布：[簡單, 普通, 困難] */
const LEVEL_MIX: [number, number, number][] = [
  [60, 35, 5],
  [35, 50, 15],
  [15, 55, 30],
  [5, 45, 50],
  [0, 30, 70],
  [0, 15, 85],
];

export function findOpponent(points: number, format: Format, recent: string[] = [], rnd: () => number = Math.random): Opponent {
  // 配對到段位相近的玩家
  const spread = Math.round((rnd() - 0.45) * 12);
  const oppPts = Math.max(0, points + spread);
  const r = rankOf(oppPts);
  const mix = LEVEL_MIX[r.tier];
  const level = weighted<Level>(
    [
      ['easy', mix[0]],
      ['normal', mix[1]],
      ['hard', mix[2]],
    ],
    rnd,
  );
  // 低段位的玩家常常拿入門套牌
  const starters = format === 'standard' ? STANDARD_STARTERS : STARTER_DECKS;
  const starterChance = [0.5, 0.3, 0.12, 0.04, 0, 0][r.tier];
  const pool = rnd() < starterChance ? starters : aiDecksFor(format);
  const deck = pick(pool, rnd);
  // 名字：避開最近遇過的
  let name = pick(NAMES, rnd);
  for (let i = 0; i < 5 && recent.includes(name); i++) name = pick(NAMES, rnd);
  if (rnd() < 0.35) name += String(Math.floor(rnd() * 99) + 1);
  // 頭像：套牌裡的生物，傳奇優先
  const creatures = Object.keys(deck.cards)
    .filter((id) => {
      try {
        return getDef(id).types.includes('Creature');
      } catch {
        return false;
      }
    })
    .map((id) => getDef(id));
  const legends = creatures.filter((d) => d.supertypes?.includes('Legendary'));
  const faceDef = rnd() < 0.25 ? pick(COLLECTIBLE.filter((c) => c.types.includes('Creature') && c.rarity === 'M'), rnd) : pick(legends.length ? legends : creatures.length ? creatures : COLLECTIBLE, rnd);
  return {
    name,
    lv: Math.max(1, Math.round(4 + r.tier * 22 + rnd() * 30 + oppPts * 0.4)),
    points: oppPts,
    rank: r.label,
    tier: r.tier,
    face: faceDef?.id ?? null,
    deckId: deck.id,
    level,
    think: 0.7 + rnd() * 1.1 + (level === 'hard' ? 0.2 : 0),
    chatty: rnd(),
    quitter: rnd() * 0.7,
    polite: rnd() < 0.75,
  };
}

/** 模擬配對等待秒數：高段位與秘稀人少，等比較久 */
export function queueSeconds(points: number, rnd: () => number = Math.random): number {
  const t = rankOf(points).tier;
  return 2 + rnd() * (4 + t * 1.5);
}

export const EMOTES = ['你好！', '打得好！', '謝謝', '哎呀！', '讓我想想…', 'GG'] as const;
export type Emote = (typeof EMOTES)[number];
