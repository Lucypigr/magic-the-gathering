import { describe, expect, it } from 'vitest';
import '../src/data';
import { CARDS } from '../src/data';
import { runHeadless } from '../src/engine/controller';

// 用實相裂隙（FRA）的卡隨機組套牌，AI 互打確認不會卡住或出錯
const FRA = CARDS.filter((d) => d.set === 'FRA' && !d.types.includes('Land') && !d.token);
const LANDS = CARDS.filter((d) => d.set === 'FRA' && d.types.includes('Land')).map((d) => d.id);
const BASICS = ['plains', 'island', 'swamp', 'mountain', 'forest'];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function deck(seed: number): string[] {
  const r = rng(seed);
  const cols = [0, 1, 2, 3, 4].sort(() => r() - 0.5).slice(0, 2);
  const letters = 'WUBRG';
  const pool = FRA.filter((d) => {
    const c = (d.cost ?? '').replace(/[^WUBRG]/g, '');
    return [...c].every((ch) => cols.includes(letters.indexOf(ch)));
  });
  const out: string[] = [];
  for (let i = 0; i < 23; i++) out.push(pool[Math.floor(r() * pool.length)].id);
  for (let i = 0; i < 17; i++) out.push(i < 3 ? LANDS[Math.floor(r() * LANDS.length)] : BASICS[cols[i % 2]]);
  return out;
}

describe('FRA AI 互打', () => {
  it('隨機 FRA 套牌都能正常打完', () => {
    for (let seed = 1; seed <= 24; seed++) {
      const g = runHeadless(
        { name: 'A', deckName: 'A', deck: deck(seed * 11), isAI: true },
        { name: 'B', deckName: 'B', deck: deck(seed * 17 + 5), isAI: true },
        ['hard', 'hard'],
        seed,
      );
      expect(g.winner, `seed ${seed}`).not.toBeNull();
    }
  });
});
