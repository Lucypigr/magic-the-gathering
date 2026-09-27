import type { Level } from '../ai/combatAI';
import { AI_DECKS, BASIC_LANDS, STARTER_DECKS, deckSize } from '../data';
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
  stats: { byLevel: Record<Level, Record_>; vsDeck: Record<string, Record_>; streak: number };
  settings: Settings;
  packsOpened: number;
  created: number;
}

const KEY = 'mtg-duel-arena-profile-v1';
export const START_GOLD = 300;
export const MIN_DECK = 40;
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
  for (const d of STARTER_DECKS) {
    for (const [id, n] of Object.entries(d.cards)) {
      if (isBasic(id)) continue;
      collection[id] = Math.max(collection[id] ?? 0, n);
    }
  }
  return {
    version: 1,
    gold: START_GOLD,
    collection,
    decks: STARTER_DECKS.map((d) => ({ id: d.id, name: d.name, cards: { ...d.cards } })),
    lastDeckId: STARTER_DECKS[0].id,
    lastLevel: 'normal',
    stats: {
      byLevel: { easy: { w: 0, l: 0 }, normal: { w: 0, l: 0 }, hard: { w: 0, l: 0 } },
      vsDeck: Object.fromEntries(AI_DECKS.map((d) => [d.id, { w: 0, l: 0 }])),
      streak: 0,
    },
    settings: { realImages: true, aiSpeed: 'normal', stopMode: 'smart' },
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
      if (p && p.version === 1) return sanitize(p);
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

export function checkDeck(p: Profile, d: SavedDeck): DeckCheck {
  const errors: string[] = [];
  const size = deckSize(d);
  if (size < MIN_DECK) errors.push(`套牌至少需要 ${MIN_DECK} 張（目前 ${size} 張）`);
  for (const [id, n] of Object.entries(d.cards)) {
    if (isBasic(id)) continue;
    if (n > MAX_COPIES) errors.push(`同名卡最多 ${MAX_COPIES} 張`);
    const own = p.collection[id] ?? 0;
    if (n > own) errors.push(`收藏不足：需要 ${n} 張，只有 ${own} 張`);
  }
  return { ok: errors.length === 0, size, errors: [...new Set(errors)] };
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
