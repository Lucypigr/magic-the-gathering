import { describe, expect, it } from 'vitest';
import '../src/data';
import { addToCollection, openPack, rollSpecial, SPECIAL_DUP_GOLD, SPECIAL_RATE } from '../src/meta/booster';
import { newProfile } from '../src/meta/profile';

describe('特殊版本', () => {
  it('開到特殊版本會記錄，也算一張可用的卡；重複的換金幣', () => {
    const p = newProfile();
    const cards = openPack('FDN', () => 0.5);
    const id = cards[11];
    const before = p.collection[id] ?? 0;
    const r = addToCollection(p, cards, 11);
    expect(r.special[11]).toBe(true);
    expect(r.special.filter(Boolean).length).toBe(1);
    expect(p.specials).toEqual([id]);
    expect(p.collection[id]).toBe(Math.min(before + 1, 4));
    const gold = p.gold;
    const r2 = addToCollection(p, [id], 0);
    expect(p.specials).toEqual([id]);
    expect(r2.gold).toBeGreaterThanOrEqual(SPECIAL_DUP_GOLD);
    expect(p.gold).toBe(gold + r2.gold);
  });

  it('沒有特殊版本時不記錄', () => {
    const p = newProfile();
    const r = addToCollection(p, openPack('FDN'));
    expect(r.special.every((x) => !x)).toBe(true);
    expect(p.specials ?? []).toEqual([]);
  });

  it('出現機率約為設定值', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cards = Array.from({ length: 12 }, (_, i) => `c${i}`);
    let hits = 0;
    for (let i = 0; i < 6000; i++) if (rollSpecial(cards, rng) >= 0) hits++;
    expect(hits / 6000).toBeGreaterThan(SPECIAL_RATE - 0.03);
    expect(hits / 6000).toBeLessThan(SPECIAL_RATE + 0.03);
  });
});
