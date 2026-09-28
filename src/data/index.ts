import { registerCards } from '../engine/registry';
import type { CardDef, SetCode } from '../engine/types';
import { CARDS } from './cards';
import { TOKENS } from './tokens';
import { REPRINTS, STANDARD_BANNED, STANDARD_LEGAL_CLASSICS } from './reprints';
import { AI_DECKS, type DeckList } from './decks';
import { STANDARD_AI_DECKS } from './standardDecks';
import { STANDARD_SETS } from '../engine/types';

registerCards(CARDS);
registerCards(TOKENS);

export { CARDS, BASIC_LANDS, slug } from './cards';
export { TOKENS } from './tokens';
export * from './decks';
export { STANDARD_AI_DECKS, STANDARD_STARTERS } from './standardDecks';
export { REPRINTS, STANDARD_BANNED } from './reprints';

export interface SetInfo {
  name: string;
  short: string;
  desc: string;
  /** 發售年月（標準賽系列） */
  released?: string;
}

export const SET_INFO: Record<Exclude<SetCode, 'TOK'>, SetInfo> = {
  WOE: { name: 'Wilds of Eldraine', short: '艾卓', desc: '童話王國：騎士、仙靈與角色衍生物。', released: '2023/09' },
  LCI: { name: 'The Lost Caverns of Ixalan', short: '依夏蘭', desc: '地底探險：恐龍、海盜與吸血鬼征服者。', released: '2023/11' },
  MKM: { name: 'Murders at Karlov Manor', short: '卡洛夫', desc: '偵探推理：線索、嫌犯與調查。', released: '2024/02' },
  OTJ: { name: 'Outlaws of Thunder Junction', short: '雷霆峽谷', desc: '荒野西部：法外者、搶劫與決鬥。', released: '2024/04' },
  BLB: { name: 'Bloomburrow', short: '布隆堡', desc: '動物王國：老鼠、松鼠、蜥蜴與蝙蝠的族群合作。', released: '2024/08' },
  DSK: { name: 'Duskmourn: House of Horror', short: '暮魘', desc: '恐怖鬼屋：結界、倖存者與夢魘。', released: '2024/09' },
  FDN: { name: 'Foundations', short: '基石', desc: '萬智牌最新的基本系列，收錄經典又好用的卡牌；標準賽合法到 2029 年。', released: '2024/11' },
  DFT: { name: 'Aetherdrift', short: '以太競速', desc: '跨鵬洛競速：載具、加速與極速衝刺。', released: '2025/02' },
  TDM: { name: 'Tarkir: Dragonstorm', short: '龍暴', desc: '龍族與氏族：三色氏族與龍的力量。', released: '2025/04' },
  FIN: { name: 'Final Fantasy', short: '太空戰士', desc: 'FINAL FANTASY 系列的英雄與召喚獸。', released: '2025/06' },
  EOE: { name: 'Edge of Eternities', short: '永恆邊際', desc: '太空科幻：星艦、行星與虛空。', released: '2025/08' },
  SPM: { name: "Marvel's Spider-Man", short: '蜘蛛人', desc: '蜘蛛人與他的夥伴、反派。', released: '2025/09' },
  TLA: { name: 'Avatar: The Last Airbender', short: '降世神通', desc: '四大元素的操控者：盟友與大地彎折。', released: '2025/11' },
  ECL: { name: 'Lorwyn Eclipsed', short: '洛溫蝕', desc: '重返洛溫：元素、妖精與 -1/-1 指示物。', released: '2026/01' },
  TMT: { name: 'Teenage Mutant Ninja Turtles', short: '忍者龜', desc: '忍者龜與下水道的夥伴們。', released: '2026/03' },
  SOS: { name: 'Secrets of Strixhaven', short: '斯翠海文', desc: '魔法學院：瞬間、法術與學院。', released: '2026/04' },
  MSH: { name: 'Marvel Super Heroes', short: '漫威英雄', desc: '漫威的超級英雄與反派。', released: '2026/06' },
  HOB: { name: 'The Hobbit', short: '哈比人', desc: '哈比人歷險記：矮人、鬼怪與龍。', released: '2026/08' },
  CORE: { name: '經典核心系列（M10–M21）', short: '核心', desc: '歷年核心系列的經典卡牌。' },
  META: { name: '競技環境精選', short: '環境', desc: '出現在競技環境套牌中的強力卡牌，稀有度較高。' },
  BAS: { name: '基本地', short: '基本地', desc: '' },
};

export const COLLECTIBLE: CardDef[] = CARDS.filter((c) => c.set !== 'BAS');

export function cardsInSet(set: SetCode): CardDef[] {
  return CARDS.filter((c) => c.set === set);
}

// ------------------------------------------------------------
// 賽制
// ------------------------------------------------------------
export type Format = 'free' | 'standard';

const STD_SET_CODES = new Set<string>(STANDARD_SETS);
// 在現行標準賽系列中重印過的卡也是標準賽合法
const STD_CLASSICS = new Set([...STANDARD_LEGAL_CLASSICS, ...Object.values(REPRINTS).flatMap((l) => (l ?? []).map(([id]) => id))]);
const STD_BANNED = new Set(STANDARD_BANNED);

/** 此卡在標準賽中是否可以使用 */
export function isStandardLegal(def: CardDef): boolean {
  if (def.set === 'BAS') return true;
  if (STD_BANNED.has(def.id)) return false;
  return STD_SET_CODES.has(def.set) || STD_CLASSICS.has(def.id);
}

export function isStandardBanned(def: CardDef): boolean {
  return STD_BANNED.has(def.id);
}

/** 某賽制下 AI 可以使用的環境套牌 */
export function aiDecksFor(format: Format): DeckList[] {
  return format === 'standard' ? STANDARD_AI_DECKS : AI_DECKS;
}

export const ALL_AI_DECKS: DeckList[] = [...AI_DECKS, ...STANDARD_AI_DECKS];
