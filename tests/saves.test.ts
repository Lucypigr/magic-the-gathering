import { beforeEach, describe, expect, it } from 'vitest';
import '../src/data';

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('多個存檔', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemStorage();
  });
  it('建立、切換、複製、刪除存檔各自保存進度', async () => {
    const P = await import('../src/meta/profile');
    const a = P.loadProfile();
    a.gold = 999;
    P.saveProfile(a);
    expect(P.listSlots().slots).toHaveLength(1);
    const b = P.createSlot('綠色路線');
    expect(b.gold).toBe(P.START_GOLD);
    b.gold = 5;
    P.saveProfile(b);
    const { active, slots } = P.listSlots();
    expect(slots).toHaveLength(2);
    expect(slots.find((s) => s.id === active)!.name).toBe('綠色路線');
    expect(P.switchSlot('main').gold).toBe(999);
    expect(P.switchSlot(active).gold).toBe(5);
    P.copySlot(active, '備份');
    expect(P.listSlots().slots).toHaveLength(3);
    const after = P.deleteSlot(active);
    expect(after?.gold).toBe(999);
    expect(P.listSlots().slots.map((s) => s.name)).toEqual(['存檔 1', '備份']);
    P.renameSlot('main', '主要存檔');
    expect(P.listSlots().slots[0].name).toBe('主要存檔');
  });
  it('舊存檔（沒有存檔清單）會成為第一個存檔', async () => {
    const P = await import('../src/meta/profile');
    const old = P.newProfile();
    old.gold = 1234;
    localStorage.setItem('mtg-duel-arena-profile-v1', JSON.stringify(old));
    expect(P.loadProfile().gold).toBe(1234);
    expect(P.listSlots().slots[0].id).toBe('main');
  });
});
