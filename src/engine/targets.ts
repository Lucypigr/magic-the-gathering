import { hasKw, isCreature, matches, other } from './state';
import type { Card, GameState, PID, TargetRef, TargetSpec } from './types';

/** 辟邪：不能成為對手的咒語或異能的目標 */
export function targetable(g: GameState, c: Card, by: PID): boolean {
  if (c.controller !== by && hasKw(g, c, 'hexproof')) return false;
  return true;
}

export function legalTargets(g: GameState, spec: TargetSpec, controller: PID, sourceId?: number): TargetRef[] {
  const out: TargetRef[] = [];
  const f = spec.filter;
  const addPlayers = (onlyOpp: boolean) => {
    for (const pid of [0, 1] as PID[]) {
      if (onlyOpp && pid === controller) continue;
      if (f?.ctrl === 'opp' && pid === controller) continue;
      if (f?.ctrl === 'you' && pid !== controller) continue;
      out.push({ p: pid });
    }
  };
  const addPerms = (creatureOnly: boolean) => {
    for (const id of g.battlefield) {
      const c = g.cards[id];
      if (creatureOnly && !isCreature(c)) continue;
      if (spec.notSelf && id === sourceId) continue;
      if (!matches(g, f, c, controller, sourceId)) continue;
      if (!targetable(g, c, controller)) continue;
      out.push({ c: id });
    }
  };
  switch (spec.kind) {
    case 'player':
      addPlayers(false);
      break;
    case 'opponent':
      out.push({ p: other(controller) });
      break;
    case 'creature':
      addPerms(true);
      break;
    case 'permanent':
      addPerms(false);
      break;
    case 'any': {
      addPerms(true);
      for (const pid of [0, 1] as PID[]) out.push({ p: pid });
      break;
    }
    case 'spell':
      for (const s of g.stack) {
        if (s.kind !== 'spell' || s.cardId === sourceId) continue;
        const c = g.cards[s.cardId];
        if (matches(g, f, c, controller, sourceId)) out.push({ c: c.id });
      }
      break;
    case 'gyCard':
      for (const pid of [0, 1] as PID[]) {
        if (f?.ctrl === 'you' && pid !== controller) continue;
        if (f?.ctrl === 'opp' && pid === controller) continue;
        for (const id of g.players[pid].graveyard) {
          const c = g.cards[id];
          if (matches(g, { ...f, ctrl: undefined }, c, controller, sourceId)) out.push({ c: id });
        }
      }
      break;
  }
  return out;
}

export function sameTarget(a: TargetRef | null, b: TargetRef | null): boolean {
  if (!a || !b) return false;
  if ('p' in a && 'p' in b) return a.p === b.p;
  if ('c' in a && 'c' in b) return a.c === b.c;
  return false;
}

export function isLegalTarget(
  g: GameState,
  spec: TargetSpec,
  t: TargetRef,
  controller: PID,
  sourceId?: number,
): boolean {
  if ('c' in t) {
    const c = g.cards[t.c];
    if (!c) return false;
    const zoneOk =
      spec.kind === 'spell' ? c.zone === 'stack' : spec.kind === 'gyCard' ? c.zone === 'graveyard' : c.zone === 'battlefield';
    if (!zoneOk) return false;
  }
  return legalTargets(g, spec, controller, sourceId).some((x) => sameTarget(x, t));
}

/** 驗證一組目標；回傳錯誤訊息或 null */
export function validateTargets(
  g: GameState,
  specs: TargetSpec[],
  targets: (TargetRef | null)[] | undefined,
  controller: PID,
  sourceId?: number,
): string | null {
  const ts = targets ?? [];
  for (let i = 0; i < specs.length; i++) {
    const t = ts[i] ?? null;
    if (!t) {
      if (!specs[i].optional) return '請選擇目標';
      continue;
    }
    if (!isLegalTarget(g, specs[i], t, controller, sourceId)) return '目標不合法';
    for (let j = 0; j < i; j++) {
      if (sameTarget(ts[j] ?? null, t) && specs[j].kind === specs[i].kind) return '不能重複選擇相同目標';
    }
  }
  return null;
}

/** 每個必選目標是否都至少有一個合法選項 */
export function hasTargetsAvailable(g: GameState, specs: TargetSpec[], controller: PID, sourceId?: number): boolean {
  return specs.every((s) => s.optional || legalTargets(g, s, controller, sourceId).length > 0);
}
