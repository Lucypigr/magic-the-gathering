// 把 public/cards 的卡圖以 data URI 內嵌到單檔版 dist-single/index.html，
// 產生可以完全離線、雙擊就能看到卡圖的檔案。
// 用法：npm run build:offline（需先執行 npm run fetch-images）
// 預設只內嵌卡圖插畫；加上 --full 會連完整卡面一起內嵌（檔案會大很多）。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'dist-single/index.html';
const MANIFEST = 'public/cards/manifest.json';
if (!existsSync(MANIFEST)) {
  console.error('找不到 public/cards/manifest.json，請先執行 npm run fetch-images');
  process.exit(1);
}
const full = process.argv.includes('--full');
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const images = {};
let bytes = 0;
const toData = (rel) => {
  const buf = readFileSync(join('public', rel));
  bytes += buf.length;
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
};
for (const [name, e] of Object.entries(manifest)) {
  const entry = {};
  if (e.art && existsSync(join('public', e.art))) entry.art = toData(e.art);
  if (full && e.full && existsSync(join('public', e.full))) entry.full = toData(e.full);
  images[name] = entry;
}
const html = readFileSync(FILE, 'utf8');
const tag = `<script>window.__CARD_IMAGES__=${JSON.stringify(images)};</script>`;
if (!html.includes('<script type="module"')) throw new Error('找不到主程式 script');
const out = html.replace('<script type="module"', `${tag}\n    <script type="module"`);
writeFileSync(FILE, out);
console.log(`已內嵌 ${Object.keys(images).length} 張卡圖（原始 ${(bytes / 1048576).toFixed(1)} MB），檔案大小 ${(out.length / 1048576).toFixed(1)} MB`);
