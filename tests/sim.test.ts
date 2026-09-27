import { describe, expect, it } from 'vitest';
import '../src/data';
import { AI_DECKS, STARTER_DECKS, expandDeck } from '../src/data';
import { runHeadless } from '../src/engine/controller';

const all = [...STARTER_DECKS, ...AI_DECKS];

describe('AI 對 AI 自動對戰', () => {
  it('每套牌組互打都能正常結束', () => {
    let seed = 1;
    const results: string[] = [];
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      const b = all[(i + 3) % all.length];
      const g = runHeadless(
        { name: 'A', deckName: a.name, deck: expandDeck(a), isAI: true },
        { name: 'B', deckName: b.name, deck: expandDeck(b), isAI: true },
        ['normal', 'hard'],
        seed++,
        [a.style ?? 'midrange', b.style ?? 'midrange'],
      );
      expect(g.winner).not.toBeNull();
      results.push(`${a.name} vs ${b.name}: 勝者=${g.winner} 回合=${g.turn}`);
    }
    console.log(results.join('\n'));
  });

  it('簡單 AI 也能正常完成對戰', () => {
    for (let s = 0; s < 4; s++) {
      const a = all[s % all.length];
      const b = all[(s + 5) % all.length];
      const g = runHeadless(
        { name: 'A', deckName: a.name, deck: expandDeck(a), isAI: true },
        { name: 'B', deckName: b.name, deck: expandDeck(b), isAI: true },
        ['easy', 'easy'],
        100 + s,
      );
      expect(g.winner).not.toBeNull();
    }
  });
});
