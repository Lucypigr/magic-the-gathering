import { describe, expect, it } from 'vitest';
import '../src/data';
import { checkCode, redeemCode } from '../src/meta/codes';
import { newProfile } from '../src/meta/profile';

describe('獎勵碼', () => {
  it('evon 送 5000 金幣，不分大小寫，每個存檔只能兌換一次', () => {
    const p = newProfile();
    const before = p.gold;
    expect(checkCode(p, ' EVON ')).toEqual({ ok: true, gold: 5000 });
    expect(p.gold).toBe(before);
    expect(redeemCode(p, ' EVON ')).toEqual({ ok: true, gold: 5000 });
    expect(p.gold).toBe(before + 5000);
    expect(redeemCode(p, 'evon')).toEqual({ ok: false, reason: 'used' });
    expect(p.gold).toBe(before + 5000);
  });

  it('錯誤或空白的碼', () => {
    const p = newProfile();
    expect(redeemCode(p, 'nope')).toEqual({ ok: false, reason: 'invalid' });
    expect(redeemCode(p, '   ')).toEqual({ ok: false, reason: 'empty' });
    expect(p.redeemed ?? []).toEqual([]);
  });
});
