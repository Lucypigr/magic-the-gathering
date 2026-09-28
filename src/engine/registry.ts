import type { CardDef } from './types';

const DEFS = new Map<string, CardDef>();

export function registerCards(defs: CardDef[]): void {
  for (const d of defs) {
    if (DEFS.has(d.id) && DEFS.get(d.id) !== d) throw new Error(`重複的卡牌 id：${d.id}`);
    DEFS.set(d.id, d);
  }
}

export function getDef(id: string): CardDef {
  const d = DEFS.get(id);
  if (!d) throw new Error(`找不到卡牌：${id}`);
  return d;
}

export function hasDef(id: string): boolean {
  return DEFS.has(id);
}

export function allDefs(): CardDef[] {
  return [...DEFS.values()];
}
