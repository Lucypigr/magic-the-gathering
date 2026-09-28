import { describe, expect, it } from 'vitest';
import '../src/data';
import { CARDS, STANDARD_AI_DECKS, STANDARD_STARTERS, deckSize, expandDeck, isStandardLegal } from '../src/data';
import { getDef } from '../src/engine/registry';
import { runHeadless } from '../src/engine/controller';
import { colorsOf } from '../src/engine/mana';
import { STANDARD_SETS, type CardDef, type Color } from '../src/engine/types';

const BASIC: Record<Color, string> = { W: 'plains', U: 'island', B: 'swamp', R: 'mountain', G: 'forest' };

/** 用某系列的卡隨機組一副兩色 40 張的牌（固定亂數，方便重現） */
function randomDeck(set: string, colors: Color[], seed: number): string[] {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pool = CARDS.filter(
    (c: CardDef) => c.set === set && !c.types.includes('Land') && colorsOf(c).every((k) => colors.includes(k)),
  );
  const deck: string[] = [];
  for (let i = 0; i < 23 && pool.length; i++) deck.push(pool[Math.floor(rnd() * pool.length)].id);
  const lands = CARDS.filter((c) => c.set === set && c.types.includes('Land') && (c.produces ?? []).length && (c.produces ?? []).every((m) => colors.includes(m as Color)));
  for (const l of lands.slice(0, 3)) deck.push(l.id);
  while (deck.length < 40) deck.push(BASIC[colors[deck.length % colors.length]]);
  return deck;
}

const PAIRS: Color[][] = [
  ['W', 'U'],
  ['U', 'B'],
  ['B', 'R'],
  ['R', 'G'],
  ['G', 'W'],
  ['W', 'B'],
  ['U', 'R'],
  ['B', 'G'],
  ['R', 'W'],
  ['G', 'U'],
];

describe('標準賽系列的卡都能正常運作', () => {
  for (const set of STANDARD_SETS) {
    const cards = CARDS.filter((c) => c.set === set);
    if (!cards.length) continue;
    it(`${set}：${cards.length} 張卡，AI 互打能正常結束`, () => {
      for (let i = 0; i < 5; i++) {
        const a = PAIRS[(i * 2) % PAIRS.length];
        const b = PAIRS[(i * 2 + 1) % PAIRS.length];
        const g = runHeadless(
          { name: 'A', deckName: 'A', deck: randomDeck(set, a, i + 1), isAI: true },
          { name: 'B', deckName: 'B', deck: randomDeck(set, b, i + 11), isAI: true },
          i % 2 ? ['hard', 'normal'] : ['easy', 'hard'],
          1000 + i,
        );
        expect(g.winner).not.toBeNull();
      }
    });
  }
});

describe('標準賽套牌', () => {
  const decks = [...STANDARD_STARTERS, ...STANDARD_AI_DECKS];
  for (const d of decks) {
    it(`${d.name}：60 張、全部合法`, () => {
      expect(deckSize(d)).toBeGreaterThanOrEqual(60);
      for (const [id, n] of Object.entries(d.cards)) {
        const def = getDef(id);
        expect(isStandardLegal(def), `${def.name} 不是標準賽合法`).toBe(true);
        if (!def.supertypes?.includes('Basic')) expect(n, def.name).toBeLessThanOrEqual(4);
      }
    });
  }
  it('標準 AI 套牌互打都能正常結束', () => {
    let seed = 7;
    for (let i = 0; i < STANDARD_AI_DECKS.length; i++) {
      const a = STANDARD_AI_DECKS[i];
      const b = STANDARD_AI_DECKS[(i + 2) % STANDARD_AI_DECKS.length];
      const g = runHeadless(
        { name: 'A', deckName: a.name, deck: expandDeck(a), isAI: true },
        { name: 'B', deckName: b.name, deck: expandDeck(b), isAI: true },
        ['hard', 'normal'],
        seed++,
        [a.style ?? 'midrange', b.style ?? 'midrange'],
      );
      expect(g.winner).not.toBeNull();
    }
  });
});
