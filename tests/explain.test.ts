import { describe, expect, it } from 'vitest';
import '../src/data';
import { CARDS } from '../src/data';
import type { CardDef } from '../src/engine/types';
import { lineNotes, symbolNotes, termNotes } from '../src/ui/explain';

const fake = (text: string, types: CardDef['types'] = ['Creature']): CardDef => ({ id: 'x', name: 'X', set: 'FDN', rarity: 'C', types, text } as CardDef);

describe('效果解說', () => {
  it('分辨起動式、法術力、觸發式與咒語效果', () => {
    const k = lineNotes(fake('敏捷\n{T}，犧牲此生物：它對任意一個目標造成1點傷害。')).map((l) => l.kind);
    expect(k).toEqual(['keyword', 'activated']);
    expect(lineNotes(fake('{T}：加{R}或{W}。', ['Land']))[0].kind).toBe('mana');
    expect(lineNotes(fake('當此生物進戰場時，抓一張牌。'))[0].kind).toBe('triggered');
    expect(lineNotes(fake('英勇—每當此生物每回合第一次成為你的咒語或異能的目標時，抓一張牌。'))[0].kind).toBe('triggered');
    expect(lineNotes(fake('消滅目標生物。', ['Instant']))[0].kind).toBe('spell');
    expect(lineNotes(fake('裝備{2}', ['Artifact']))[0]).toMatchObject({ kind: 'activated', cost: '{2}' });
  });
  it('解釋 ↷ 符號與術語', () => {
    const d = fake('{T}，犧牲此生物：消滅目標生物。');
    expect(symbolNotes(d).some((n) => n.sym === 'T')).toBe(true);
    const terms = termNotes(d).map((t) => t.term);
    expect(terms).toContain('犧牲');
    expect(terms).toContain('消滅');
  });
  it('所有卡牌都能產生解說', () => {
    for (const c of CARDS) expect(() => lineNotes(c)).not.toThrow();
  });
});
