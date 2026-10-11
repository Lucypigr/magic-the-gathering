// ============================================================
// 獎勵碼：每個存檔每組碼只能兌換一次（不分大小寫）
// 碼本身以雜湊保存，原文不會出現在程式碼裡。
// ============================================================
import type { Profile } from './profile';

interface Reward {
  gold: number;
}

/** 雜湊 → 獎勵 */
const CODES: Record<string, Reward> = {
  '0aebc91b': { gold: 5000 },
};

/** FNV-1a 32 位元雜湊 */
export function codeHash(code: string): string {
  let x = 0x811c9dc5;
  for (const c of code.trim().toLowerCase()) {
    x ^= c.codePointAt(0)!;
    x = Math.imul(x, 0x01000193) >>> 0;
  }
  return x.toString(16).padStart(8, '0');
}

export type RedeemResult = { ok: true; gold: number } | { ok: false; reason: 'empty' | 'invalid' | 'used' };

/** 兌換獎勵碼（直接修改 profile） */
export function redeemCode(p: Profile, input: string): RedeemResult {
  if (!input.trim()) return { ok: false, reason: 'empty' };
  const h = codeHash(input);
  const r = CODES[h];
  if (!r) return { ok: false, reason: 'invalid' };
  p.redeemed ??= [];
  if (p.redeemed.includes(h)) return { ok: false, reason: 'used' };
  p.redeemed.push(h);
  p.gold += r.gold;
  return { ok: true, gold: r.gold };
}

/** 不修改存檔，先檢查能不能兌換（用於顯示訊息） */
export function checkCode(p: Profile, input: string): RedeemResult {
  return redeemCode(structuredClone(p), input);
}
