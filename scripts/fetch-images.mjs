// 下載所有卡牌的圖片到 public/cards/，之後遊戲會直接讀取本機圖片，不必每次連線到 Scryfall。
// 用法：npm run fetch-images          （已下載的會略過）
//       npm run fetch-images -- --force（全部重新下載）
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const OUT = 'public/cards';
const force = process.argv.includes('--force');
const HEADERS = { 'User-Agent': 'mtg-duel-arena/1.0 (private fan project)', Accept: 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 透過 Vite 讀取 TypeScript 的卡牌資料
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { CARDS } = await server.ssrLoadModule('/src/data/cards.ts');
await server.close();

const cards = CARDS.filter((c) => !c.token);
const names = [...new Set(cards.map((c) => c.imageName ?? c.name))];
mkdirSync(OUT, { recursive: true });
console.log(`共 ${names.length} 張卡，開始查詢 Scryfall…`);

// 1. 查詢圖片網址（每次最多 75 張）
const found = new Map();
const missing = [];
for (let i = 0; i < names.length; i += 75) {
  const chunk = names.slice(i, i + 75);
  const res = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
  });
  if (!res.ok) throw new Error(`Scryfall 回應 ${res.status}：${await res.text()}`);
  const json = await res.json();
  for (const c of json.data) {
    const iu = c.image_uris ?? c.card_faces?.[0]?.image_uris;
    if (iu) found.set(c.name.toLowerCase(), iu);
  }
  for (const nf of json.not_found ?? []) missing.push(nf.name);
  await sleep(150);
}

const slug = (n) =>
  n
    .toLowerCase()
    .replace(/['’,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function download(url, file) {
  if (!force && existsSync(file)) return false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return true;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1000 * attempt);
    }
  }
}

// 2. 下載圖片：art 為卡圖插畫（用在卡框裡），full 為完整卡面（用在詳細資訊）
const manifest = {};
let done = 0;
let fresh = 0;
for (const name of names) {
  const iu = found.get(name.toLowerCase());
  done++;
  if (!iu) continue;
  const base = slug(name);
  const entry = {};
  if (iu.art_crop && (await download(iu.art_crop, join(OUT, `${base}-art.jpg`)))) fresh++;
  if (iu.art_crop) entry.art = `cards/${base}-art.jpg`;
  if (iu.normal && (await download(iu.normal, join(OUT, `${base}.jpg`)))) fresh++;
  if (iu.normal) entry.full = `cards/${base}.jpg`;
  manifest[name.toLowerCase()] = entry;
  process.stdout.write(`\r下載中 ${done}/${names.length}`);
  await sleep(60);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`\n完成：${Object.keys(manifest).length} 張卡有圖片，本次新下載 ${fresh} 個檔案，存放在 ${OUT}/`);
if (missing.length) console.log(`Scryfall 找不到：${missing.join('、')}`);
