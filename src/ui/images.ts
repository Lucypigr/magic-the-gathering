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
  // 舊版用「A // B」查冒險牌會查不到而被記成沒有圖；清掉讓它重新查
  for (const k of Object.keys(cache)) if (cache[k] === null && k.includes(' // ')) delete cache[k];
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
  card_faces?: { name?: string; image_uris?: { art_crop?: string; normal?: string } }[];
}

// ------------------------------------------------------------
// Scryfall 請求排程：所有請求排隊依序送出（避免被限流），卡圖優先於中文卡名；
// 被限流（429）或暫時連不上時會等一下再重試。
// ------------------------------------------------------------
type Job = { url: string; init?: RequestInit; resolve: (r: Response) => void; reject: (e: unknown) => void };
type Priority = 'urgent' | 'high' | 'low';
const queues: Record<Priority, Job[]> = { urgent: [], high: [], low: [] };
/** 同時最多幾個請求；每個請求至少間隔多久才送出（Scryfall 建議 50～100 毫秒） */
const MAX_INFLIGHT = 3;
const GAP_MS = 110;
let active = 0;
let lastStart = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(job: Job): Promise<void> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(job.url, job.init);
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(Number(res.headers.get('Retry-After')) * 1000 || 800 * 2 ** attempt);
        continue;
      }
      job.resolve(res);
      return;
    } catch (e) {
      lastErr = e;
      await sleep(600 * 2 ** attempt);
    }
  }
  job.reject(lastErr);
}

function pump(): void {
  if (timer) return;
  while (active < MAX_INFLIGHT) {
    const wait = lastStart + GAP_MS - Date.now();
    if (wait > 0) {
      timer = setTimeout(() => {
        timer = null;
        pump();
      }, wait);
      return;
    }
    const job = queues.urgent.shift() ?? queues.high.shift() ?? queues.low.shift();
    if (!job) return;
    active++;
    lastStart = Date.now();
    void run(job).finally(() => {
      active--;
      pump();
    });
  }
}

function scryFetch(url: string, init: RequestInit | undefined, priority: Priority): Promise<Response> {
  return new Promise((resolve, reject) => {
    queues[priority].push({ url, init, resolve, reject });
    pump();
  });
}

/** 用 Scryfall 的 collection API 查一批卡的圖片；回傳查不到的名稱 */
async function fetchCollection(names: string[], priority: Priority = 'high'): Promise<string[]> {
  const res = await scryFetch(
    'https://api.scryfall.com/cards/collection',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ identifiers: names.map((name) => ({ name })) }),
    },
    priority,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data: ScryCard[]; not_found?: { name: string }[] };
  for (const c of json.data) {
    const iu = c.image_uris ?? c.card_faces?.[0]?.image_uris;
    const entry = { art: iu?.art_crop, full: iu?.normal };
    cache[c.name.toLowerCase()] = entry;
    cache[c.name.split(' // ')[0].toLowerCase()] = entry;
    // 雙面牌的背面有自己的圖
    for (const f of c.card_faces?.slice(1) ?? []) {
      if (f.name && f.image_uris) cache[f.name.toLowerCase()] = { art: f.image_uris.art_crop, full: f.image_uris.normal };
    }
  }
  return (json.not_found ?? []).map((x) => x.name);
}

/** 查一批卡；「A // B」查不到時改用正面的名稱再查一次（冒險牌需要） */
async function fetchImages(names: string[], priority: Priority = 'high'): Promise<void> {
  const missing = await fetchCollection(names, priority);
  const retry = missing.filter((n) => n.includes(' // '));
  if (retry.length) {
    const still = await fetchCollection(retry.map((n) => n.split(' // ')[0]), priority);
    for (const n of retry) {
      const full = n.toLowerCase();
      const front = full.split(' // ')[0];
      if (cache[front] && !cache[full]) cache[full] = cache[front];
    }
    for (const n of still) cache[n.toLowerCase()] = null;
  }
  for (const n of missing) if (!n.includes(' // ')) cache[n.toLowerCase()] = null;
  persist();
  notify();
}

// 正在查詢中的卡（避免重複查）
const sending = new Set<string>();
const has = (k: string) => k in cache || !!local[k];

/** 送出一批查詢；失敗時這些卡之後可以再查 */
async function sendBatch(names: string[], priority: Priority): Promise<void> {
  for (const n of names) sending.add(n.toLowerCase());
  try {
    await fetchImages(names, priority);
  } finally {
    for (const n of names) sending.delete(n.toLowerCase());
  }
}

// 畫面上需要、但還沒有圖的卡：集中起來插隊優先查
const wanted = new Set<string>();
let wantTimer: ReturnType<typeof setTimeout> | null = null;

function want(name: string): void {
  if (typeof window === 'undefined' || failed) return;
  const k = name.toLowerCase();
  if (has(k) || sending.has(k)) return;
  wanted.add(name);
  if (wantTimer) return;
  wantTimer = setTimeout(() => {
    wantTimer = null;
    const list = [...wanted].filter((n) => !has(n.toLowerCase()) && !sending.has(n.toLowerCase()));
    wanted.clear();
    for (let i = 0; i < list.length; i += 75) void sendBatch(list.slice(i, i + 75), 'urgent').catch(() => undefined);
  }, 60);
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
  const queue = [...new Set(names)].filter((n) => !has(n.toLowerCase()));
  if (!queue.length) return;
  inflight = true;
  let ok = 0;
  let bad = 0;
  // 背景下載：同時只排兩批，畫面上急需的卡可以插隊
  const worker = async () => {
    while (queue.length) {
      const batch: string[] = [];
      while (queue.length && batch.length < 75) {
        const n = queue.shift()!;
        const k = n.toLowerCase();
        if (!has(k) && !sending.has(k)) batch.push(n);
      }
      if (!batch.length) continue;
      try {
        await sendBatch(batch, 'high');
        ok++;
      } catch {
        bad++;
        // 一開始就連續失敗，多半是連不上 Scryfall：改用內建卡框
        if (ok === 0 && bad >= 2) {
          failed = true;
          notify();
          queue.length = 0;
        }
      }
    }
  };
  try {
    await Promise.all([worker(), worker()]);
  } finally {
    inflight = false;
  }
}

export function imageFor(name: string): ImageEntry | null {
  const k = name.toLowerCase();
  const base = local[k] ?? cache[k] ?? null;
  if (!base && !(k in cache)) want(name);
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
    const res: Response = await scryFetch(url, { headers: { Accept: 'application/json' } }, 'low');
    if (res.status === 404) break; // 沒有任何結果
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data: ScryPrint[]; has_more?: boolean; next_page?: string };
    out.push(...json.data);
    url = json.has_more && json.next_page ? json.next_page : null;
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
  const saveZh = () => {
    try {
      localStorage.setItem(ZH_KEY, JSON.stringify(zhCache));
    } catch {
      // 忽略
    }
    publishZhNames();
    notify();
  };
  try {
    // 一批一批查：每批先查繁中、再查簡中，查完就存起來（中途關掉網頁也不會白查）
    for (let i = 0; i < need.length; i += 20) {
      const batch = need.slice(i, i + 20);
      for (const lang of ['zht', 'zhs'] as const) {
        // 繁中版找不到卡名或卡面的，再到簡中版找
        const todo = batch.filter((n) => !found.get(n)?.name || !found.get(n)?.full);
        if (!todo.length) continue;
        const prints = await searchPrints(lang, todo.map((n) => original.get(n)!));
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
      for (const n of batch) zhCache[n] = found.get(n) ?? null;
      saveZh();
    }
  } catch {
    // 連不上就先保留已找到的，下次再試其他的
    for (const [n, e] of found) zhCache[n] = e;
    zhFailed = true;
  } finally {
    zhInflight = false;
  }
  saveZh();
}

export function zhStatus(): { named: number; failed: boolean; loading: boolean } {
  return { named: Object.values(zhCache).filter((z) => z?.name).length, failed: zhFailed, loading: zhInflight };
}
