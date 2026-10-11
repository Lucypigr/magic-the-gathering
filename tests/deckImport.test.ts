import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../src/data';
import { deckSize } from '../src/data';
import {
  buildCards,
  buyMissing,
  findCard,
  importFromUrl,
  parseDeckText,
  planUrl,
  resolveDeck,
  snapshotInfo,
  snapshotToParsed,
  type NetDeckSnapshot,
} from '../src/meta/deckImport';
import { checkDeck, newProfile } from '../src/meta/profile';

describe('牌表解析', () => {
  it('MTGO／MTGTop8：Sideboard 標題', () => {
    const d = parseDeckText('4 Lightning Strike\n20 Mountain\nSideboard\n2 Negate\n');
    expect(d.main).toEqual([
      { n: 4, name: 'Lightning Strike' },
      { n: 20, name: 'Mountain' },
    ]);
    expect(d.side).toEqual([{ n: 2, name: 'Negate' }]);
  });

  it('MTGGoldfish：空行之後是備牌', () => {
    const d = parseDeckText('4 Shock\n4 Mountain\n\n3 Negate\n');
    expect(d.main.length).toBe(2);
    expect(d.side).toEqual([{ n: 3, name: 'Negate' }]);
  });

  it('MTG Arena：About／Deck 標題、系列與編號', () => {
    const d = parseDeckText('About\nName Red Deck Wins\n\nDeck\n4 Lightning Strike (FDN) 149\n\n20 Mountain (FDN) 279\n\nSideboard\n2 Negate (FDN) 47\n');
    expect(d.name).toBe('Red Deck Wins');
    // Arena 格式有 Deck 標題，主牌中的空行不代表備牌
    expect(d.main).toEqual([
      { n: 4, name: 'Lightning Strike' },
      { n: 20, name: 'Mountain' },
    ]);
    expect(d.side).toEqual([{ n: 2, name: 'Negate' }]);
  });

  it('.dec、SB:、4x 與 x4', () => {
    const d = parseDeckText('// NAME : Burn\n4 [FDN] Shock\n4x Lightning Strike\nMountain x20\nSB: 2 [FDN] Negate\n');
    expect(d.name).toBe('Burn');
    expect(d.main.map((l) => [l.n, l.name])).toEqual([
      [4, 'Shock'],
      [4, 'Lightning Strike'],
      [20, 'Mountain'],
    ]);
    expect(d.side).toEqual([{ n: 2, name: 'Negate' }]);
  });

  it('同名卡合併', () => {
    expect(parseDeckText('2 Shock\n2 shock\n').main).toEqual([{ n: 4, name: 'Shock' }]);
  });
});

describe('卡名對應', () => {
  it('一般卡、雙面卡、冒險卡、基本地中文名', () => {
    expect(findCard('Lightning Strike')?.id).toBe('lightning-strike');
    expect(findCard('Clay-Fired Bricks // Cosmium Kiln')?.name).toBe('Clay-Fired Bricks');
    expect(findCard('Cosmium Kiln')?.name).toBe('Clay-Fired Bricks');
    expect(findCard("Beluna's Gatekeeper // Entry Denied")?.name).toBe("Beluna's Gatekeeper");
    expect(findCard('beluna’s gatekeeper')?.name).toBe("Beluna's Gatekeeper");
    expect(findCard('山脈')?.id).toBe('mountain');
    expect(findCard('Definitely Not A Card')).toBeNull();
  });
});

describe('套用與購買', () => {
  it('收藏不足時計算金幣，買下後套牌可以出戰', () => {
    const p = newProfile();
    p.collection = {};
    p.gold = 10000;
    const plan = resolveDeck(p, parseDeckText('4 Lightning Strike\n4 Shock\n52 Mountain\n'));
    expect(plan.exact).toBe(60);
    expect(plan.cost).toBeGreaterThan(0);
    expect(deckSize({ cards: buildCards(plan, false) })).toBe(52);
    expect(buyMissing(p, plan)).toBe(true);
    const deck = { id: 'x', name: 'x', cards: buildCards(resolveDeck(p, parseDeckText('4 Lightning Strike\n4 Shock\n52 Mountain\n')), false) };
    expect(checkDeck(p, deck).ok).toBe(true);
  });

  it('金幣不足時不會購買', () => {
    const p = newProfile();
    p.collection = {};
    p.gold = 0;
    const plan = resolveDeck(p, parseDeckText('4 Lightning Strike\n56 Mountain\n'));
    expect(buyMissing(p, plan)).toBe(false);
    expect(p.collection['lightning-strike']).toBeUndefined();
  });

  it('未收錄的地換成基本地、未收錄的咒語找代替卡', () => {
    const p = newProfile();
    const info = {
      'fake land': { land: true, creature: false, mv: 0, colors: [] },
      'fake bolt': { land: false, creature: false, mv: 1, colors: ['R' as const] },
    };
    const plan = resolveDeck(p, parseDeckText('4 Lightning Strike\n4 Fake Bolt\n8 Fake Land\n44 Mountain\n'), { info, substitute: true, standard: true });
    expect(plan.landSubs).toBe(8);
    expect(plan.spellSubs).toBe(4);
    expect(plan.dropped).toBe(0);
    const cards = buildCards(plan, true);
    expect(deckSize({ cards })).toBe(60);
    expect(cards.mountain).toBe(52);
    const sub = plan.lines.find((l) => l.sub)!;
    expect(sub.def!.types.includes('Land')).toBe(false);
    expect(sub.def!.cost).toMatch(/R/);
  });
});

describe('熱門牌組快照', () => {
  const snap = JSON.parse(readFileSync('public/netdecks.json', 'utf8')) as NetDeckSnapshot;
  it('每副牌都能套成接近完整的套牌', () => {
    const p = newProfile();
    const info = snapshotInfo(snap);
    expect(snap.decks.length).toBeGreaterThan(10);
    for (const d of snap.decks) {
      const plan = resolveDeck(p, snapshotToParsed(d), { info, substitute: true, standard: true });
      const size = deckSize({ cards: buildCards(plan, true) });
      expect(size, d.name).toBeGreaterThanOrEqual(56);
      expect(plan.exact + plan.landSubs + plan.spellSubs + plan.dropped, d.name).toBe(plan.total);
    }
  });
});

describe('網址', () => {
  it('辨識各抄牌網', () => {
    expect(planUrl('https://mtgtop8.com/event?e=91922&d=898067&f=ST')).toMatchObject({ site: 'MTGTop8', fetch: ['https://mtgtop8.com/mtgo?d=898067'], snapshotId: 't8-898067' });
    expect(planUrl('https://www.mtggoldfish.com/deck/7967844#paper')).toMatchObject({ fetch: ['https://www.mtggoldfish.com/deck/download/7967844'], snapshotId: 'gf-7967844' });
    expect(planUrl('https://www.mtggoldfish.com/archetype/standard-izzet-spellementals-woe#paper')?.kind).toBe('goldfish-page');
    expect(planUrl('https://archidekt.com/decks/123456/my_deck')?.fetch[0]).toBe('https://archidekt.com/api/decks/123456/');
    expect(planUrl('https://moxfield.com/decks/AbC-12_x')?.kind).toBe('moxfield');
    expect(planUrl('not a url')).toBeNull();
  });

  it('下載失敗時改走代理', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      if (url.startsWith('https://mtgtop8.com')) throw new TypeError('CORS');
      return new Response('4 Shock\n56 Mountain\nSideboard\n2 Negate\n');
    }) as unknown as typeof fetch;
    const d = await importFromUrl('https://mtgtop8.com/event?e=1&d=42&f=ST', fetcher);
    expect(d.main.length).toBe(2);
    expect(d.side.length).toBe(1);
    expect(calls[0]).toBe('https://mtgtop8.com/mtgo?d=42');
    expect(calls[1]).toContain('allorigins');
  });

  it('Archidekt 與 Moxfield 的 JSON', async () => {
    const archi = (async () =>
      new Response(
        JSON.stringify({
          name: 'Archi',
          cards: [
            { quantity: 4, categories: ['Burn'], card: { oracleCard: { name: 'Shock' } } },
            { quantity: 2, categories: ['Sideboard'], card: { oracleCard: { name: 'Negate' } } },
            { quantity: 1, categories: ['Maybeboard'], card: { oracleCard: { name: 'Island' } } },
          ],
        }),
      )) as unknown as typeof fetch;
    const a = await importFromUrl('https://archidekt.com/decks/1/x', archi);
    expect(a).toMatchObject({ name: 'Archi', main: [{ n: 4, name: 'Shock' }], side: [{ n: 2, name: 'Negate' }] });

    const mox = (async () =>
      new Response(JSON.stringify({ name: 'Mox', boards: { mainboard: { cards: { a: { quantity: 3, card: { name: 'Shock' } } } }, sideboard: { cards: {} } } }))) as unknown as typeof fetch;
    const m = await importFromUrl('https://moxfield.com/decks/abc', mox);
    expect(m).toMatchObject({ name: 'Mox', main: [{ n: 3, name: 'Shock' }], side: [] });
  });

  it('下載到網頁而非牌表時回報錯誤', async () => {
    const html = (async () => new Response('<!DOCTYPE html><html></html>')) as unknown as typeof fetch;
    await expect(importFromUrl('https://example.com/deck', html)).rejects.toThrow();
  });
});
