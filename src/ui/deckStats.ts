import { colorsOf, manaValue, parseCost } from '../engine/mana';
import { getDef, hasDef } from '../engine/registry';
import type { CardDef, Color } from '../engine/types';

const ORDER: Color[] = ['W', 'U', 'B', 'R', 'G'];

export function deckColors(cards: Record<string, number>): Color[] {
  const set = new Set<Color>();
  for (const id of Object.keys(cards)) {
    if (!hasDef(id) || !cards[id]) continue;
    const d = getDef(id);
    if (d.types.includes('Land')) continue;
    for (const c of colorsOf(d)) set.add(c);
  }
  return ORDER.filter((c) => set.has(c));
}

export function curve(cards: Record<string, number>): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const [id, n] of Object.entries(cards)) {
    if (!hasDef(id)) continue;
    const d = getDef(id);
    if (d.types.includes('Land')) continue;
    out[Math.min(6, manaValue(d))] += n;
  }
  return out;
}

export function pipCounts(cards: Record<string, number>): Record<Color, number> {
  const out: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const [id, n] of Object.entries(cards)) {
    if (!hasDef(id)) continue;
    const c = parseCost(getDef(id).cost);
    for (const k of ORDER) out[k] += c[k] * n;
  }
  return out;
}

export function typeGroup(d: CardDef): '生物' | '咒語' | '其他' | '地' {
  if (d.types.includes('Land')) return '地';
  if (d.types.includes('Creature')) return '生物';
  if (d.types.includes('Instant') || d.types.includes('Sorcery')) return '咒語';
  return '其他';
}

export function sortDefs(a: CardDef, b: CardDef): number {
  return manaValue(a) - manaValue(b) || a.name.localeCompare(b.name);
}
