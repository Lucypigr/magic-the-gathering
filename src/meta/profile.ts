import type { Level } from '../ai/combatAI';
import { ALL_AI_DECKS, BASIC_LANDS, STANDARD_STARTERS, STARTER_DECKS, deckSize, isStandardLegal, type Format } from '../data';
import { getDef } from '../engine/registry';
import { displayName } from '../data/names';
import { hasDef } from '../engine/registry';
import type { Rarity } from '../engine/types';
import { newLadder, type LadderState } from './ladder';

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
  /** 天梯配對 */
  ladder: LadderState;
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
    ladder: newLadder(),
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// 多個存檔
// ------------------------------------------------------------
const SLOTS_KEY = 'mtg-duel-arena-slots-v1';

export interface SlotInfo {
  id: string;
  name: string;
  created: number;
  updated: number;
  /** 存檔摘要（列表顯示用） */
  gold: number;
  cards: number;
  decks: number;
  wins: number;
}

interface SlotIndex {
  active: string;
  slots: SlotInfo[];
}

/** 第一個存檔沿用舊的儲存位置，舊玩家的進度不會消失 */
function slotKey(id: string): string {
  return id === 'main' ? KEY : `${KEY}:${id}`;
}

function summary(p: Profile): Pick<SlotInfo, 'gold' | 'cards' | 'decks' | 'wins'> {
  const lv = p.stats.byLevel;
  return {
    gold: p.gold,
    cards: Object.values(p.collection).reduce((a, b) => a + b, 0),
    decks: p.decks.length,
    wins: lv.easy.w + lv.normal.w + lv.hard.w + p.ladder.standard.w + p.ladder.free.w,
  };
}

function readIndex(): SlotIndex {
  try {
    const raw = storage()?.getItem(SLOTS_KEY);
    if (raw) {
      const idx = JSON.parse(raw) as SlotIndex;
      if (idx && Array.isArray(idx.slots) && idx.slots.length) {
        if (!idx.slots.some((x) => x.id === idx.active)) idx.active = idx.slots[0].id;
        return idx;
      }
    }
  } catch {
    // 讀取失敗就重建
  }
  // 第一次使用存檔功能：把原本的進度當成第一個存檔
  const now = Date.now();
  let info = { gold: START_GOLD, cards: 0, decks: 0, wins: 0 };
  try {
    const raw = storage()?.getItem(KEY);
    info = summary(raw ? sanitize(JSON.parse(raw) as Profile) : newProfile());
  } catch {
    // 用預設值
  }
  const idx = { active: 'main', slots: [{ id: 'main', name: '存檔 1', created: now, updated: now, ...info }] };
  writeIndex(idx);
  return idx;
}

function writeIndex(idx: SlotIndex): void {
  try {
    storage()?.setItem(SLOTS_KEY, JSON.stringify(idx));
  } catch {
    // 無法儲存：忽略
  }
}

export function listSlots(): { active: string; slots: SlotInfo[] } {
  const idx = readIndex();
  return { active: idx.active, slots: [...idx.slots] };
}

/** 建立新存檔（全新的進度），並切換過去 */
export function createSlot(name: string): Profile {
  const idx = readIndex();
  const id = uid();
  const p = newProfile();
  const now = Date.now();
  idx.slots.push({ id, name: name.trim() || `存檔 ${idx.slots.length + 1}`, created: now, updated: now, ...summary(p) });
  idx.active = id;
  writeIndex(idx);
  saveProfile(p);
  return p;
}

export function switchSlot(id: string): Profile {
  const idx = readIndex();
  if (idx.slots.some((x) => x.id === id)) {
    idx.active = id;
    writeIndex(idx);
  }
  return loadProfile();
}

export function renameSlot(id: string, name: string): void {
  const idx = readIndex();
  const s = idx.slots.find((x) => x.id === id);
  if (s && name.trim()) s.name = name.trim().slice(0, 24);
  writeIndex(idx);
}

/** 刪除存檔（不能刪掉最後一個）；回傳刪除後正在使用的存檔 */
export function deleteSlot(id: string): Profile | null {
  const idx = readIndex();
  if (idx.slots.length <= 1) return null;
  idx.slots = idx.slots.filter((x) => x.id !== id);
  try {
    storage()?.removeItem(slotKey(id));
  } catch {
    // 忽略
  }
  const switched = idx.active === id;
  if (switched) idx.active = idx.slots[0].id;
  writeIndex(idx);
  return switched ? loadProfile() : null;
}

/** 複製存檔（例如想試另一條路線） */
export function copySlot(id: string, name: string): void {
  const idx = readIndex();
  const src = idx.slots.find((x) => x.id === id);
  if (!src) return;
  try {
    const raw = storage()?.getItem(slotKey(id));
    if (!raw) return;
    const nid = uid();
    storage()?.setItem(slotKey(nid), raw);
    const now = Date.now();
    idx.slots.push({ ...src, id: nid, name: name.trim() || `${src.name}（複製）`, created: now, updated: now });
    writeIndex(idx);
  } catch {
    // 忽略
  }
}

export function loadProfile(): Profile {
  const key = slotKey(readIndex().active);
  try {
    const raw = storage()?.getItem(key);
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
    ladder: {
      standard: { ...base.ladder.standard, ...p.ladder?.standard },
      free: { ...base.ladder.free, ...p.ladder?.free },
      history: p.ladder?.history ?? [],
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
  const idx = readIndex();
  try {
    storage()?.setItem(slotKey(idx.active), JSON.stringify(p));
  } catch {
    // 無法儲存（例如私密瀏覽）：忽略
  }
  const s = idx.slots.find((x) => x.id === idx.active);
  if (s) {
    Object.assign(s, summary(p), { updated: Date.now() });
    writeIndex(idx);
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
