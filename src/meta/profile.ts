import type { Level } from '../ai/combatAI';
import { ALL_AI_DECKS, BASIC_LANDS, STANDARD_STARTERS, STARTER_DECKS, deckSize, isStandardLegal, type Format } from '../data';
import { getDef } from '../engine/registry';
import { displayName } from '../data/names';
import { hasDef } from '../engine/registry';
import type { Rarity } from '../engine/types';

export interface SavedDeck {
  id: string;
  name: string;
  cards: Record<string, number>;
}

export interface Settings {
  realImages: boolean;
  aiSpeed: 'slow' | 'normal' | 'fast';
  stopMode: 'smart' | 'all';
  /** 卡名與卡面的語言 */
  cardLang: 'zh' | 'en';
}

export interface Record_ {
  w: number;
  l: number;
}

export interface Profile {
  version: 1;
  gold: number;
  collection: Record<string, number>;
  decks: SavedDeck[];
  lastDeckId: string | null;
  lastLevel: Level;
  /** 上次選擇的賽制 */
  lastFormat?: Format;
  /** 已發放標準入門套牌 */
  standardStarters?: boolean;
  stats: { byLevel: Record<Level, Record_>; vsDeck: Record<string, Record_>; streak: number };
  settings: Settings;
  packsOpened: number;
  created: number;
}

const KEY = 'mtg-duel-arena-profile-v1';
export const START_GOLD = 300;
export const MIN_DECK = 40;
export const MIN_DECK_STANDARD = 60;
export const FORMAT_NAME: Record<Format, string> = { free: '自由', standard: '標準' };
export const MAX_COPIES = 4;

export const REWARDS: Record<Level, { win: number; loss: number }> = {
  easy: { win: 60, loss: 15 },
  normal: { win: 100, loss: 25 },
  hard: { win: 160, loss: 40 },
};

export const SELL_PRICE: Record<Rarity, number> = { C: 5, U: 12, R: 35, M: 70, L: 0, T: 0 };
export const DUPLICATE_GOLD: Record<Rarity, number> = { C: 5, U: 10, R: 25, M: 50, L: 0, T: 0 };

export function isBasic(id: string): boolean {
  return BASIC_LANDS.includes(id);
}

export function newProfile(): Profile {
  const collection: Record<string, number> = {};
  for (const d of [...STARTER_DECKS, ...STANDARD_STARTERS]) {
    for (const [id, n] of Object.entries(d.cards)) {
      if (isBasic(id)) continue;
      collection[id] = Math.max(collection[id] ?? 0, n);
    }
  }
  return {
    version: 1,
    gold: START_GOLD,
    collection,
    decks: [...STARTER_DECKS, ...STANDARD_STARTERS].map((d) => ({ id: d.id, name: d.name, cards: { ...d.cards } })),
    lastDeckId: STARTER_DECKS[0].id,
    lastLevel: 'normal',
    lastFormat: 'free',
    standardStarters: true,
    stats: {
      byLevel: { easy: { w: 0, l: 0 }, normal: { w: 0, l: 0 }, hard: { w: 0, l: 0 } },
      vsDeck: Object.fromEntries(ALL_AI_DECKS.map((d) => [d.id, { w: 0, l: 0 }])),
      streak: 0,
    },
    settings: { realImages: true, aiSpeed: 'normal', stopMode: 'smart', cardLang: 'zh' },
    packsOpened: 0,
    created: Date.now(),
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadProfile(): Profile {
  try {
    const raw = storage()?.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Profile;
      if (p && p.version === 1) {
        const out = sanitize(p);
        // 升級過的存檔立即寫回，避免重複補發
        if (!p.standardStarters) saveProfile(out);
        return out;
      }
    }
  } catch {
    // 讀取失敗就建立新存檔
  }
  return newProfile();
}

function sanitize(p: Profile): Profile {
  const base = newProfile();
  const out: Profile = {
    ...base,
    ...p,
    settings: { ...base.settings, ...p.settings },
    stats: {
      byLevel: { ...base.stats.byLevel, ...p.stats?.byLevel },
      vsDeck: { ...base.stats.vsDeck, ...p.stats?.vsDeck },
      streak: p.stats?.streak ?? 0,
    },
  };
  // 舊存檔：補發兩套標準入門套牌
  if (!p.standardStarters) {
    for (const d of STANDARD_STARTERS) {
      for (const [id, n] of Object.entries(d.cards)) {
        if (isBasic(id)) continue;
        out.collection[id] = Math.max(out.collection[id] ?? 0, n);
      }
      if (!out.decks.some((x) => x.id === d.id)) out.decks.push({ id: d.id, name: d.name, cards: { ...d.cards } });
    }
    out.standardStarters = true;
  }
  for (const id of Object.keys(out.collection)) if (!hasDef(id)) delete out.collection[id];
  for (const d of out.decks) for (const id of Object.keys(d.cards)) if (!hasDef(id)) delete d.cards[id];
  return out;
}

export function saveProfile(p: Profile): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(p));
  } catch {
    // 無法儲存（例如私密瀏覽）：忽略
  }
}

export function resetProfile(): Profile {
  const p = newProfile();
  saveProfile(p);
  return p;
}

export interface DeckCheck {
  ok: boolean;
  size: number;
  errors: string[];
}

export function checkDeck(p: Profile, d: SavedDeck, format: Format = 'free'): DeckCheck {
  const errors: string[] = [];
  const size = deckSize(d);
  const min = format === 'standard' ? MIN_DECK_STANDARD : MIN_DECK;
  if (size < min) errors.push(`${format === 'standard' ? '標準賽' : ''}套牌至少需要 ${min} 張（目前 ${size} 張）`);
  for (const [id, n] of Object.entries(d.cards)) {
    if (isBasic(id)) continue;
    if (format === 'standard' && !isStandardLegal(getDef(id))) errors.push(`${displayName(getDef(id))} 不能用於標準賽`);
    if (n > MAX_COPIES) errors.push(`同名卡最多 ${MAX_COPIES} 張`);
    const own = p.collection[id] ?? 0;
    if (n > own) errors.push(`收藏不足：需要 ${n} 張，只有 ${own} 張`);
  }
  return { ok: errors.length === 0, size, errors: [...new Set(errors)] };
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
