// 從抄牌網抓標準賽的熱門牌組，存成 public/netdecks.json，讓遊戲內可以一鍵套用。
// 來源：MTGGoldfish 環境排行（每個套路的代表牌組）與 MTGTop8 最新賽事的前幾名。
// 用法：node scripts/fetch-netdecks.mjs
// 抓取失敗時不覆蓋舊檔案，並以非零結束碼結束（部署流程會忽略錯誤、沿用舊資料）。
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = new URL('../public/netdecks.json', import.meta.url);
const UA = { 'User-Agent': 'mtg-duel-arena deck snapshot (+https://github.com/Lucypigr/magic-the-gathering)' };
const GOLDFISH_ARCHETYPES = 20;
const TOP8_EVENTS = 6;
const TOP8_DECKS_PER_EVENT = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, latin1 = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      await sleep(350);
      return new TextDecoder(latin1 ? 'latin1' : 'utf-8').decode(buf);
    } catch (e) {
      if (i === 2) throw new Error(`${url}: ${e.message}`);
      await sleep(1500 * (i + 1));
    }
  }
}

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

/** 「4 Card Name」格式的牌表；Sideboard 行或空行之後是備牌 */
function parseList(text) {
  const main = [];
  const side = [];
  let cur = main;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (main.length) cur = side;
      continue;
    }
    if (/^sideboard/i.test(line)) {
      cur = side;
      continue;
    }
    const m = line.match(/^(\d+)x?\s+(.+)$/);
    if (m) cur.push([+m[1], decode(m[2])]);
  }
  return { main, side };
}

const count = (list) => list.reduce((s, [n]) => s + n, 0);

async function goldfish() {
  const html = await get('https://www.mtggoldfish.com/metagame/standard/full#online');
  const tiles = html.split("<div class='archetype-tile'").slice(1);
  const out = [];
  for (const t of tiles.slice(0, GOLDFISH_ARCHETYPES)) {
    const href = t.match(/href="(\/archetype\/[^"#]+)#online">([^<]+)</);
    const share = t.match(/META%\s*<\/div>\s*<div class='archetype-tile-statistic-value'>\s*([\d.]+)%/);
    const colors = (t.match(/aria-label='colors: ([^']*)'/)?.[1] ?? '')
      .split(' ')
      .map((c) => ({ white: 'W', blue: 'U', black: 'B', red: 'R', green: 'G' })[c])
      .filter(Boolean)
      .join('');
    if (!href) continue;
    try {
      const page = await get(`https://www.mtggoldfish.com${href[1]}`);
      const id = page.match(/\/deck\/download\/(\d+)/)?.[1];
      if (!id) continue;
      const list = parseList(await get(`https://www.mtggoldfish.com/deck/download/${id}`));
      if (count(list.main) < 40) continue;
      out.push({
        id: `gf-${id}`,
        source: 'mtggoldfish',
        url: `https://www.mtggoldfish.com/deck/${id}`,
        archetypeUrl: `https://www.mtggoldfish.com${href[1]}`,
        name: decode(href[2]),
        share: share ? +share[1] : undefined,
        colors,
        ...list,
      });
      console.log(`goldfish: ${decode(href[2])} (${count(list.main)})`);
    } catch (e) {
      console.warn(`goldfish: 略過 ${href[1]}：${e.message}`);
    }
  }
  return out;
}

async function top8() {
  const html = await get('https://mtgtop8.com/format?f=ST', true);
  const events = [...new Set([...html.matchAll(/event\?e=(\d+)&f=ST/g)].map((m) => m[1]))].slice(0, TOP8_EVENTS);
  const out = [];
  for (const e of events) {
    try {
      const page = await get(`https://mtgtop8.com/event?e=${e}&f=ST`, true);
      const title = decode(page.match(/<div class=event_title>([^<]*)/)?.[1] ?? 'MTGTop8');
      const info = page.match(/(\d+) players - (\d\d\/\d\d\/\d\d)/);
      const rows = [
        ...page.matchAll(/class=S14>(\d+(?:-\d+)?)<\/div>[\s\S]*?<a href=\?e=\d+&d=(\d+)&f=ST>([^<]+)<\/a>[\s\S]*?class=player href=[^>]*>([^<]*)</g),
      ];
      const seen = new Set();
      for (const [, rank, d, name, player] of rows) {
        if (seen.has(d) || seen.size >= TOP8_DECKS_PER_EVENT) continue;
        seen.add(d);
        const list = parseList(await get(`https://mtgtop8.com/mtgo?d=${d}`, true));
        if (count(list.main) < 40) continue;
        out.push({
          id: `t8-${d}`,
          source: 'mtgtop8',
          url: `https://mtgtop8.com/event?e=${e}&d=${d}&f=ST`,
          name: decode(name),
          player: decode(player),
          event: title,
          rank,
          players: info ? +info[1] : undefined,
          date: info ? info[2] : undefined,
          ...list,
        });
      }
      console.log(`mtgtop8: ${title}（${seen.size} 副）`);
    } catch (err) {
      console.warn(`mtgtop8: 略過賽事 ${e}：${err.message}`);
    }
  }
  return out;
}

const results = await Promise.allSettled([goldfish(), top8()]);
const decks = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
for (const r of results) if (r.status === 'rejected') console.warn(r.reason.message);
if (decks.length < 5) {
  console.error(`只抓到 ${decks.length} 副牌組，保留舊的 netdecks.json`);
  process.exit(existsSync(OUT) ? 1 : 2);
}

/** 每張卡的類別、法術力值與顏色（遊戲未收錄的卡需要這些資訊才能找代替卡） */
async function cardInfo(names) {
  const out = {};
  for (let i = 0; i < names.length; i += 75) {
    const batch = names.slice(i, i + 75);
    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { ...UA, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifiers: batch.map((name) => ({ name: name.split(' // ')[0] })) }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      for (const c of j.data) {
        const front = (c.card_faces?.[0]?.type_line ?? c.type_line ?? '').split(' // ')[0];
        const colors = (c.colors ?? c.card_faces?.[0]?.colors ?? c.color_identity ?? []).join('');
        const info = { land: /\bLand\b/.test(front), creature: /\bCreature\b/.test(front), mv: c.cmc ?? 0, colors };
        out[c.name] = info;
        if (c.name.includes(' // ')) out[c.name.split(' // ')[0]] = info;
      }
    } catch (e) {
      console.warn(`scryfall: ${e.message}`);
    }
    await sleep(150);
  }
  return out;
}

const names = [...new Set(decks.flatMap((d) => d.main.map(([, n]) => n)))];
const cards = await cardInfo(names);
console.log(`卡牌資訊 ${Object.keys(cards).length}／${names.length}`);
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), decks, cards }));
console.log(`寫入 ${decks.length} 副牌組${prev ? `（原本 ${prev.decks.length} 副）` : ''}`);
