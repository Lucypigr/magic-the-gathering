import { useSyncExternalStore } from 'react';
import { setCardLanguage, setZhNames } from '../data/names';

// 卡圖來源（依優先順序）：
// 1. 單檔版內嵌的圖片（window.__CARD_IMAGES__，由 npm run build:offline 產生）
// 2. 本機下載的圖片（public/cards/manifest.json，由 npm run fetch-images 產生）
// 3. 直接向 Scryfall 取得圖片網址（快取在瀏覽器）
// 都拿不到時改用內建的卡框繪製。
//
// 卡牌語言選中文時，另外向 Scryfall 搜尋中文版印刷：先找繁體中文（zht），
// 找不到再找簡體中文（zhs，卡名轉成繁體字），都沒有就維持英文。
// 中文版只用在完整卡面與卡名；卡框裡的插畫各語言相同，沿用上面的來源。

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
  const base = local[k] ?? cache[k] ?? null;
  const z = zhOn ? zhCache[k] : null;
  if (z?.full) return { art: base?.art, full: z.full };
  return base;
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

// ------------------------------------------------------------
// 中文版卡牌
// ------------------------------------------------------------

export interface ZhEntry {
  /** 中文卡名（繁體字） */
  name?: string;
  /** 中文版完整卡面 */
  full?: string;
  /** 卡面語言 */
  lang?: 'zht' | 'zhs';
}

interface ScryPrint {
  name: string;
  lang: string;
  printed_name?: string;
  image_status?: string;
  image_uris?: { normal?: string };
  card_faces?: { printed_name?: string; image_uris?: { normal?: string } }[];
}

const ZH_KEY = 'mtg-duel-arena-zh-v1';
let zhCache: Record<string, ZhEntry | null> = {};
let zhOn = false;
let zhFailed = false;
let zhInflight = false;

try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ZH_KEY) : null;
  if (raw) zhCache = JSON.parse(raw);
} catch {
  zhCache = {};
}
publishZhNames();

function publishZhNames() {
  setZhNames(Object.entries(zhCache).flatMap(([en, z]) => (z?.name ? [[en, z.name] as [string, string]] : [])));
}

/** 切換卡牌語言（在渲染時呼叫，不會觸發重新渲染） */
export function setLanguage(zh: boolean): void {
  zhOn = zh;
  setCardLanguage(zh);
}

let toTraditional: ((s: string) => string) | null = null;
async function traditional(s: string): Promise<string> {
  if (!toTraditional) {
    try {
      const { Converter } = await import('opencc-js/cn2t');
      toTraditional = Converter({ from: 'cn', to: 'tw' });
    } catch {
      return s;
    }
  }
  return toTraditional(s);
}

/** 搜尋某語言的所有印刷版本，新的在前 */
async function searchPrints(lang: 'zht' | 'zhs', names: string[]): Promise<ScryPrint[]> {
  const q = `lang:${lang} (${names.map((n) => `!"${n.replace(/"/g, '')}"`).join(' or ')})`;
  let url: string | null = `https://api.scryfall.com/cards/search?${new URLSearchParams({ q, unique: 'prints', order: 'released', dir: 'desc' })}`;
  const out: ScryPrint[] = [];
  while (url) {
    const res: Response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 404) break; // 沒有任何結果
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data: ScryPrint[]; has_more?: boolean; next_page?: string };
    out.push(...json.data);
    url = json.has_more && json.next_page ? json.next_page : null;
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

function printedName(c: ScryPrint): string | undefined {
  const n = c.printed_name ?? c.card_faces?.[0]?.printed_name;
  return n?.trim() || undefined;
}

function printImage(c: ScryPrint): string | undefined {
  if (c.image_status === 'missing' || c.image_status === 'placeholder') return undefined;
  return c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal;
}

/** 取得中文卡名與中文卡面（已查過的會略過） */
export async function prefetchZh(names: string[]): Promise<void> {
  if (zhFailed || zhInflight) return;
  const original = new Map(names.map((n) => [n.toLowerCase(), n]));
  const need = [...original.keys()].filter((n) => !(n in zhCache));
  if (!need.length) return;
  zhInflight = true;
  notify();
  const found = new Map<string, ZhEntry>();
  const keysOf = (c: ScryPrint) => {
    const k = c.name.toLowerCase();
    return [k, k.split(' // ')[0]].filter((x) => need.includes(x));
  };
  try {
    for (const lang of ['zht', 'zhs'] as const) {
      // 繁中版找不到卡名或卡面的，再到簡中版找
      const todo = need.filter((n) => !found.get(n)?.name || !found.get(n)?.full);
      for (let i = 0; i < todo.length; i += 20) {
        const prints = await searchPrints(lang, todo.slice(i, i + 20).map((n) => original.get(n)!));
        for (const c of prints) {
          for (const k of keysOf(c)) {
            const e = found.get(k) ?? {};
            const name = printedName(c);
            if (!e.name && name) e.name = lang === 'zhs' ? await traditional(name) : name;
            const full = printImage(c);
            if (!e.full && full) {
              e.full = full;
              e.lang = lang;
            }
            found.set(k, e);
          }
        }
      }
    }
    for (const n of need) zhCache[n] = found.get(n) ?? null;
  } catch {
    // 連不上就先保留已找到的，下次再試其他的
    for (const [n, e] of found) zhCache[n] = e;
    zhFailed = true;
  } finally {
    zhInflight = false;
  }
  try {
    localStorage.setItem(ZH_KEY, JSON.stringify(zhCache));
  } catch {
    // 忽略
  }
  publishZhNames();
  notify();
}

export function zhStatus(): { named: number; failed: boolean; loading: boolean } {
  return { named: Object.values(zhCache).filter((z) => z?.name).length, failed: zhFailed, loading: zhInflight };
}
