import { describe, expect, it } from 'vitest';
import '../src/data';
import { ALL_AI_DECKS, STANDARD_STARTERS, STARTER_DECKS } from '../src/data';
import { MYTHIC_PTS, findOpponent, newLadder, pointsDelta, rankOf } from '../src/meta/ladder';

describe('天梯段位', () => {
  it('積分換算段位', () => {
    expect(rankOf(0).label).toBe('青銅 4');
    expect(rankOf(5).label).toBe('青銅 3');
    expect(rankOf(19)).toMatchObject({ tier: 0, div: 1, pips: 4 });
    expect(rankOf(20).label).toBe('白銀 4');
    expect(rankOf(MYTHIC_PTS).tier).toBe(5);
  });
  it('青銅不掉星、不會掉出大段、連勝加星', () => {
    const lf = newLadder().standard;
    expect(pointsDelta(lf, false)).toBe(0);
    lf.points = 20; // 白銀 4 的 0 星
    expect(pointsDelta(lf, false)).toBe(0);
    lf.points = 23;
    expect(pointsDelta(lf, false)).toBe(-1);
    lf.streak = 2;
    expect(pointsDelta(lf, true)).toBe(2);
    lf.points = 70; // 鑽石不加連勝星
    expect(pointsDelta(lf, true)).toBe(1);
  });
  it('對手：段位越高越強，套牌都存在', () => {
    const all = new Set([...ALL_AI_DECKS, ...STARTER_DECKS, ...STANDARD_STARTERS].map((d) => d.id));
    let s = 1;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const hardShare = (pts: number) => {
      let hard = 0;
      for (let i = 0; i < 300; i++) {
        const o = findOpponent(pts, i % 2 ? 'standard' : 'free', [], rnd);
        expect(all.has(o.deckId), o.deckId).toBe(true);
        expect(o.name.length).toBeGreaterThan(0);
        if (o.level === 'hard') hard++;
      }
      return hard / 300;
    };
    const low = hardShare(0);
    const high = hardShare(MYTHIC_PTS + 5);
    expect(high).toBeGreaterThan(low + 0.4);
  });
});
