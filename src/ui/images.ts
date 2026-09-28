import { useSyncExternalStore } from 'react';

// 卡圖來源（依優先順序）：
// 1. 單檔版內嵌的圖片（window.__CARD_IMAGES__，由 npm run build:offline 產生）
// 2. 本機下載的圖片（public/cards/manifest.json，由 npm run fetch-images 產生）
// 3. 直接向 Scryfall 取得圖片網址（快取在瀏覽器）
// 都拿不到時改用內建的卡框繪製。

export interface ImageEntry {
  art?: string;
  full?: string;
}

declare global {
  interface Window {
    __CARD_IMAGES__?: Record<string, ImageEntry>;
  }
}

const KEY = 'mtg-duel-arena-images-v1';
let cache: Record<string, ImageEntry | null> = {};
let local: Record<string, ImageEntry> = {};
let failed = false;
let version = 0;
const listeners = new Set<() => void>();

try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (raw) cache = JSON.parse(raw);
} catch {
  cache = {};
}
if (typeof window !== 'undefined' && window.__CARD_IMAGES__) local = { ...window.__CARD_IMAGES__ };

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // 忽略
  }
}

function notify() {
  version++;
  for (const fn of listeners) fn();
}

interface ScryCard {
  name: string;
  image_uris?: { art_crop?: string; normal?: string };
  card_faces?: { image_uris?: { art_crop?: string; normal?: string } }[];
}

let inflight = false;
let localLoaded = false;

/** 讀取本機下載的卡圖清單（沒有就略過） */
async function loadLocalManifest(): Promise<void> {
  if (localLoaded) return;
  localLoaded = true;
  if (typeof location !== 'undefined' && location.protocol === 'file:') return;
  try {
    const res = await fetch('cards/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const json = (await res.json()) as Record<string, ImageEntry>;
    for (const [name, e] of Object.entries(json)) {
      local[name] = {
        art: e.art ? new URL(e.art, location.href).href : undefined,
        full: e.full ? new URL(e.full, location.href).href : undefined,
      };
    }
    notify();
  } catch {
    // 沒有本機卡圖
  }
}

export async function prefetchImages(names: string[]): Promise<void> {
  await loadLocalManifest();
  if (failed || inflight) return;
  const need = [...new Set(names)].filter((n) => !local[n.toLowerCase()] && !(n.toLowerCase() in cache));
  if (!need.length) return;
  inflight = true;
  try {
    for (let i = 0; i < need.length; i += 75) {
      const chunk = need.slice(i, i + 75);
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: ScryCard[]; not_found?: { name: string }[] };
      for (const c of json.data) {
        const iu = c.image_uris ?? c.card_faces?.[0]?.image_uris;
        const entry = { art: iu?.art_crop, full: iu?.normal };
        cache[c.name.toLowerCase()] = entry;
        cache[c.name.split(' // ')[0].toLowerCase()] = entry;
      }
      for (const nf of json.not_found ?? []) cache[nf.name.toLowerCase()] = null;
      persist();
      notify();
      await new Promise((r) => setTimeout(r, 120));
    }
  } catch {
    failed = true;
    notify();
  } finally {
    inflight = false;
  }
}

export function imageFor(name: string): ImageEntry | null {
  const k = name.toLowerCase();
  return local[k] ?? cache[k] ?? null;
}

export function hasLocalImages(): boolean {
  return Object.keys(local).length > 0;
}

export function imagesUnavailable(): boolean {
  return failed && !hasLocalImages();
}

export function useImageVersion(): number {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => version,
  );
}
