import { describe, expect, it } from 'vitest';
import '../src/data';
import { CARDS, TOKENS } from '../src/data';
import { hasDef } from '../src/engine/registry';

/** 找出卡牌定義中所有引用到的衍生物 id */
function tokenRefs(x: unknown, out: Set<string>) {
  if (Array.isArray(x)) for (const v of x) tokenRefs(v, out);
  else if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) {
      if (k === 'token' && typeof v === 'string') out.add(v);
      else tokenRefs(v, out);
    }
  }
}

describe('衍生物', () => {
  it('每張卡會派出的衍生物都有定義', () => {
    const refs = new Set<string>();
    for (const c of [...CARDS, ...TOKENS]) tokenRefs(c, refs);
    const missing = [...refs].filter((id) => !hasDef(id));
    expect(missing).toEqual([]);
  });
});
