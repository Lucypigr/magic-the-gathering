import { it } from 'vitest';
import '../src/data';
import { AI_DECKS, STARTER_DECKS, expandDeck } from '../src/data';
import { runHeadless } from '../src/engine/controller';
import type { Level } from '../src/ai/combatAI';

const all = [...STARTER_DECKS, ...AI_DECKS];
function match(lo: Level, hi: Level): [number, number] {
  let wl = 0, wh = 0, seed = 9000;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    for (const [dl, dh] of [[all[i], all[j]], [all[j], all[i]]]) {
      for (const hiSeat of [0, 1]) {
        const P = hiSeat === 0 ? [dh, dl] : [dl, dh];
        const g = runHeadless({ name: 'A', deckName: P[0].name, deck: expandDeck(P[0]), isAI: true },
          { name: 'B', deckName: P[1].name, deck: expandDeck(P[1]), isAI: true },
          hiSeat === 0 ? [hi, lo] : [lo, hi], seed++, [P[0].style ?? 'midrange', P[1].style ?? 'midrange']);
        if (g.winner === hiSeat) wh++; else if (g.winner !== 'draw') wl++;
      }
    }
  }
  return [wl, wh];
}

// 平衡測試：BALANCE=1 npx vitest run tests/balance.test.ts
it.skipIf(!process.env.BALANCE)('各難度 AI 互打勝率', () => {
  for (const [lo, hi] of [['easy','normal'],['normal','hard'],['easy','hard']] as [Level, Level][]) {
    const t0 = Date.now();
    const [a, b] = match(lo, hi);
    process.stdout.write(`${lo} ${a} vs ${hi} ${b}  (${Date.now()-t0}ms)\n`);
  }
}, 900000);
