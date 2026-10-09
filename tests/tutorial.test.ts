import { describe, expect, it } from 'vitest';
import '../src/data';
import { AI_DECKS, STARTER_DECKS } from '../src/data';
import { hasDef } from '../src/engine/registry';
import { CHAPTERS } from '../src/ui/tutorial';

describe('新手教學', () => {
  it('章節資料完整：範例卡存在、答案合法、練習用的套牌存在', () => {
    const ids = new Set(CHAPTERS.map((c) => c.id));
    expect(ids.size).toBe(CHAPTERS.length);
    for (const ch of CHAPTERS) {
      expect(ch.pages.length).toBeGreaterThan(0);
      expect(ch.quiz.length).toBeGreaterThan(0);
      for (const p of ch.pages) for (const id of p.cards ?? []) expect(hasDef(id), `${ch.id}：${id}`).toBe(true);
      for (const q of ch.quiz) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
      if (ch.practice) {
        expect(STARTER_DECKS.some((d) => d.id === ch.practice!.deck)).toBe(true);
        expect(AI_DECKS.some((d) => d.id === ch.practice!.ai)).toBe(true);
      }
    }
  });
});
