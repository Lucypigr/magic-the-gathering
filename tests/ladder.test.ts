import { describe, expect, it } from 'vitest';
import '../src/data';
import { STANDARD_AI_DECKS, deckSize, expandDeck, isStandardLegal } from '../src/data';
import { runHeadless } from '../src/engine/controller';
import { getDef, hasDef } from '../src/engine/registry';
import { buildOpponentDeck, type DeckKind } from '../src/meta/oppDecks';
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
    let s = 1;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const hardShare = (pts: number) => {
      let hard = 0;
      for (let i = 0; i < 300; i++) {
        const o = findOpponent(pts, i % 2 ? 'standard' : 'free', [], rnd);
        expect(deckSize(o.deck)).toBeGreaterThanOrEqual(i % 2 ? 60 : 40);
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

describe('對手的套牌', () => {
  let s = 99;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  it('各種套牌都合法：張數、每張最多 4 張、標準賽合法', () => {
    const kinds = new Map<DeckKind, number>();
    for (let i = 0; i < 600; i++) {
      const format = i % 2 ? 'standard' : 'free';
      const { deck, kind } = buildOpponentDeck(format, i % 6, rnd);
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
      expect(deckSize(deck), `${kind} ${deck.name}`).toBeGreaterThanOrEqual(format === 'standard' ? 60 : 40);
      for (const [id, n] of Object.entries(deck.cards)) {
        expect(hasDef(id), id).toBe(true);
        const def = getDef(id);
        if (!def.supertypes?.includes('Basic')) expect(n, `${deck.name}：${def.name}`).toBeLessThanOrEqual(4);
        expect(n).toBeGreaterThan(0);
        if (format === 'standard') expect(isStandardLegal(def), def.name).toBe(true);
      }
    }
    expect(kinds.size).toBe(6);
  });
  it('自組與雜牌也能正常打完', () => {
    let seed = 3;
    for (let i = 0; i < 12; i++) {
      const format = i % 2 ? 'standard' : 'free';
      const { deck } = buildOpponentDeck(format, 0, rnd);
      const other = STANDARD_AI_DECKS[i % STANDARD_AI_DECKS.length];
      const g = runHeadless(
        { name: 'A', deckName: deck.name, deck: expandDeck(deck), isAI: true },
        { name: 'B', deckName: other.name, deck: expandDeck(other), isAI: true },
        ['normal', 'easy'],
        seed++,
        [deck.style ?? 'midrange', other.style ?? 'midrange'],
      );
      expect(g.winner).not.toBeNull();
    }
  });
});
