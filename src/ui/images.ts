import { useSyncExternalStore } from 'react';

// 從 Scryfall 取得真實卡圖（僅圖片網址，快取在瀏覽器）。
// 無法連線時（離線、或頁面禁止外部連線）會自動改用內建的卡框繪製。

export interface ImageEntry {
  art?: string;
  full?: string;
}

const KEY = 'mtg-duel-arena-images-v1';
let cache: Record<string, ImageEntry | null> = {};
let failed = false;
let version = 0;
const listeners = new Set<() => void>();

try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (raw) cache = JSON.parse(raw);
} catch {
  cache = {};
}

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

export async function prefetchImages(names: string[]): Promise<void> {
  if (failed || inflight) return;
  const need = [...new Set(names)].filter((n) => !(n.toLowerCase() in cache));
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
        const front = c.name.split(' // ')[0].toLowerCase();
        cache[front] = entry;
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
  return cache[name.toLowerCase()] ?? null;
}

export function imagesUnavailable(): boolean {
  return failed;
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
