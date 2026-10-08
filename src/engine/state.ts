import { displayName } from '../data/names';
import { colorsOf, manaValue } from './mana';
import { getDef } from './registry';
import type {
  Card,
  CardDef,
  CardType,
  Cond,
  Filter,
  GameState,
  Grant,
  Keyword,
  LogEntry,
  PID,
  Player,
  Show,
  TargetRef,
} from './types';

export class GameOver extends Error {
  constructor() {
    super('game over');
  }
}

export const other = (p: PID): PID => (p === 0 ? 1 : 0);

// ------------------------------------------------------------
// 亂數（可重現，AI 模擬時可複製狀態）
// ------------------------------------------------------------
export function rand(g: GameState): number {
  let t = (g.rngState = (g.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(g: GameState, n: number): number {
  return Math.floor(rand(g) * n);
}

export function shuffleArr<T>(g: GameState, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(g, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ------------------------------------------------------------
// 建立遊戲
// ------------------------------------------------------------
export interface PlayerSetup {
  name: string;
  deckName: string;
  deck: string[];
  isAI: boolean;
}

export function newPlayer(id: PID, s: PlayerSetup): Player {
  return {
    id,
    name: s.name,
    deckName: s.deckName,
    life: 20,
    library: [],
    hand: [],
    graveyard: [],
    exile: [],
    landsPlayed: 0,
    spellsThisTurn: 0,
    instSorcThisTurn: 0,
    lifeGainedThisTurn: 0,
    lifeLostThisTurn: 0,
    drawsThisTurn: 0,
    drewFromEmpty: false,
    lost: false,
    cantGainLife: false,
    mulligans: 0,
    isAI: s.isAI,
  };
}

export function createGame(p0: PlayerSetup, p1: PlayerSetup, seed = Date.now()): GameState {
  const g: GameState = {
    cards: {},
    nextId: 1,
    nextSid: 1,
    players: [newPlayer(0, p0), newPlayer(1, p1)],
    battlefield: [],
    stack: [],
    turn: 0,
    active: 0,
    firstPlayer: 0,
    phase: 'setup',
    priority: null,
    eot: [],
    pending: [],
    log: [],
    winner: null,
    rngState: seed | 0,
    sim: false,
    version: 0,
    attackedThisTurn: false,
    maxTurns: 200,
    shows: [],
    showSeq: 0,
  };
  [p0, p1].forEach((s, i) => {
    const pid = i as PID;
    for (const id of s.deck) {
      const c = newCard(g, getDef(id), pid);
      c.zone = 'library';
      g.players[pid].library.push(c.id);
    }
    shuffleArr(g, g.players[pid].library);
  });
  return g;
}

export function newCard(g: GameState, def: CardDef, owner: PID, token = false): Card {
  const c: Card = {
    id: g.nextId++,
    def,
    owner,
    controller: owner,
    zone: 'library',
    tapped: false,
    sick: false,
    damage: 0,
    dtDamage: false,
    counters: 0,
    stun: 0,
    attachedTo: null,
    token,
    attacking: false,
    blocking: null,
    blockedBy: [],
    wasBlocked: false,
    enteredTurn: 0,
    usedThisTurn: [],
  };
  g.cards[c.id] = c;
  return c;
}

export function cloneGame(g: GameState): GameState {
  const cards: Record<number, Card> = {};
  for (const k in g.cards) {
    const c = g.cards[k];
    cards[k] = { ...c, blockedBy: c.blockedBy.slice(), usedThisTurn: c.usedThisTurn.slice() };
  }
  const cp = (p: Player): Player => ({
    ...p,
    library: p.library.slice(),
    hand: p.hand.slice(),
    graveyard: p.graveyard.slice(),
    exile: p.exile.slice(),
  });
  return {
    ...g,
    cards,
    players: [cp(g.players[0]), cp(g.players[1])],
    battlefield: g.battlefield.slice(),
    stack: g.stack.map((s) => ({ ...s, targets: s.targets.slice() })),
    eot: g.eot.map((e) => ({ ...e })),
    pending: g.pending.slice(),
    log: [],
    shows: [],
    sim: true,
  };
}

// ------------------------------------------------------------
// 日誌
// ------------------------------------------------------------
/** 記錄一個畫面事件（施放、攻擊等），讓介面可以顯示動畫 */
export function show(g: GameState, s: Omit<Show, 'seq'>): void {
  if (g.sim) return;
  g.shows.push({ ...s, seq: ++g.showSeq });
  if (g.shows.length > 30) g.shows.splice(0, g.shows.length - 30);
}

export function log(g: GameState, text: string, player?: PID, kind: LogEntry['kind'] = 'info'): void {
  g.version++;
  if (g.sim) return;
  g.log.push({ turn: g.turn, player, text, kind });
  if (g.log.length > 400) g.log.splice(0, g.log.length - 400);
}

export function cardName(c: Card | undefined): string {
  return c ? displayName(c.def) : '?';
}

// ------------------------------------------------------------
// 基本查詢
// ------------------------------------------------------------
export const isType = (def: CardDef, t: CardType) => def.types.includes(t);
export const isCreature = (c: Card) => c.def.types.includes('Creature');
export const isLand = (c: Card) => c.def.types.includes('Land');
export const isPermanentDef = (def: CardDef) => !def.types.includes('Instant') && !def.types.includes('Sorcery');

export function creaturesOf(g: GameState, pid: PID): Card[] {
  const out: Card[] = [];
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller === pid && isCreature(c)) out.push(c);
  }
  return out;
}

export function permanentsOf(g: GameState, pid: PID): Card[] {
  return g.battlefield.map((id) => g.cards[id]).filter((c) => c.controller === pid);
}

export function landsOf(g: GameState, pid: PID): Card[] {
  return permanentsOf(g, pid).filter(isLand);
}

const asArr = <T,>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

// ------------------------------------------------------------
// 持續性效應：計算生物的實際力量/防禦力/異能
// ------------------------------------------------------------
export interface Stats {
  p: number;
  t: number;
  kw: Set<Keyword>;
  cantAttack: boolean;
  cantBlock: boolean;
}

export function stats(g: GameState, c: Card, ignoreEot = false): Stats {
  const d = c.def;
  const st: Stats = {
    p: d.power ?? 0,
    t: d.toughness ?? 0,
    kw: new Set<Keyword>(d.keywords ?? []),
    cantAttack: false,
    cantBlock: false,
  };
  if (c.zone !== 'battlefield') return st;
  st.p += c.counters;
  st.t += c.counters;
  const apply = (gr: Grant) => {
    st.p += gr.p ?? 0;
    st.t += gr.t ?? 0;
    if (gr.kw) for (const k of gr.kw) st.kw.add(k);
    if (gr.cantAttack) st.cantAttack = true;
    if (gr.cantBlock) st.cantBlock = true;
  };
  for (const sid of g.battlefield) {
    const s = g.cards[sid];
    const abs = s.def.abilities;
    if (abs) {
      for (const ab of abs) {
        if (ab.kind !== 'static') continue;
        if (ab.anthem && matches(g, ab.anthem.filter, c, s.controller, s.id)) apply(ab.anthem.grant);
        if (ab.self && s.id === c.id && (!ab.self.cond || checkCond(g, ab.self.cond, s.controller, s.id, []))) apply(ab.self.grant);
      }
    }
    if (s.attachedTo === c.id) {
      const gr = s.def.aura?.grant ?? s.def.equip?.grant;
      if (gr) apply(gr);
    }
  }
  if (!ignoreEot) {
    for (const e of g.eot) {
      if (e.card !== c.id) continue;
      st.p += e.p;
      st.t += e.t;
      for (const k of e.kw) st.kw.add(k);
    }
  }
  return st;
}

export function hasKw(g: GameState, c: Card, kw: Keyword): boolean {
  if (c.zone !== 'battlefield') return (c.def.keywords ?? []).includes(kw);
  return stats(g, c).kw.has(kw);
}

// ------------------------------------------------------------
// 篩選
// ------------------------------------------------------------
export function matches(g: GameState, f: Filter | undefined, c: Card, pov: PID, sourceId?: number): boolean {
  if (!f) return true;
  const d = c.def;
  if (f.type && !asArr(f.type).some((t) => d.types.includes(t))) return false;
  if (f.nonType && asArr(f.nonType).some((t) => d.types.includes(t))) return false;
  if (f.ctrl) {
    const ctl = c.zone === 'battlefield' || c.zone === 'stack' ? c.controller : c.owner;
    if (f.ctrl === 'you' ? ctl !== pov : ctl === pov) return false;
  }
  if (f.color || f.nonColor) {
    const cols = colorsOf(d);
    if (f.color && !asArr(f.color).some((x) => cols.includes(x))) return false;
    if (f.nonColor && asArr(f.nonColor).some((x) => cols.includes(x))) return false;
  }
  if (f.sub && !asArr(f.sub).some((s) => d.subtypes?.includes(s))) return false;
  if (f.nonSub && asArr(f.nonSub).some((s) => d.subtypes?.includes(s))) return false;
  if (f.legendary !== undefined && !!d.supertypes?.includes('Legendary') !== f.legendary) return false;
  if (f.basic !== undefined && !!d.supertypes?.includes('Basic') !== f.basic) return false;
  if (f.mvMax !== undefined && manaValue(d) > f.mvMax) return false;
  if (f.mvMin !== undefined && manaValue(d) < f.mvMin) return false;
  if (f.tapped !== undefined && c.tapped !== f.tapped) return false;
  if (f.attacking && !c.attacking) return false;
  if (f.inCombat && !c.attacking && c.blocking == null) return false;
  if (f.other && c.id === sourceId) return false;
  if (f.token !== undefined && c.token !== f.token) return false;
  if (f.stunned && c.stun <= 0) return false;
  if (f.hasCounters !== undefined && (c.counters !== 0) !== f.hasCounters) return false;
  if (f.or && !f.or.some((x) => matches(g, x, c, pov, sourceId))) return false;
  if (f.vanilla !== undefined && (d.text.trim() === '' && !d.keywords?.length) !== f.vanilla) return false;
  if (f.damaged !== undefined && c.damage > 0 !== f.damaged) return false;
  if (f.equipped !== undefined) {
    const eq = g.battlefield.some((id) => g.cards[id].attachedTo === c.id && !!g.cards[id].def.equip);
    if (eq !== f.equipped) return false;
  }
  if (
    f.kw ||
    f.nonKw ||
    f.powMax !== undefined ||
    f.powMin !== undefined ||
    f.toughMin !== undefined ||
    f.sumPTMax !== undefined
  ) {
    const st = stats(g, c);
    if (f.kw && !st.kw.has(f.kw)) return false;
    if (f.nonKw && st.kw.has(f.nonKw)) return false;
    if (f.powMax !== undefined && st.p > f.powMax) return false;
    if (f.powMin !== undefined && st.p < f.powMin) return false;
    if (f.toughMin !== undefined && st.t < f.toughMin) return false;
    if (f.sumPTMax !== undefined && st.p + st.t > f.sumPTMax) return false;
  }
  return true;
}

export function countMatching(g: GameState, f: Filter, pov: PID, sourceId?: number): number {
  let n = 0;
  for (const id of g.battlefield) if (matches(g, f, g.cards[id], pov, sourceId)) n++;
  return n;
}

// ------------------------------------------------------------
// 條件
// ------------------------------------------------------------
export function checkCond(
  g: GameState,
  cond: Cond,
  controller: PID,
  sourceId: number | undefined,
  targets: (TargetRef | null)[],
): boolean {
  const me = g.players[controller];
  const opp = g.players[other(controller)];
  switch (cond.c) {
    case 'controls':
      return countMatching(g, { ...cond.filter, ctrl: 'you' }, controller, sourceId) >= (cond.n ?? 1);
    case 'lifeGte':
      return me.life >= cond.n;
    case 'lifeLte':
      return me.life <= cond.n;
    case 'gainedLifeGte':
      return me.lifeGainedThisTurn >= cond.n;
    case 'targetIs': {
      const t = targets[cond.t];
      if (!t || !('c' in t)) return false;
      const c = g.cards[t.c];
      return !!c && matches(g, cond.filter, c, controller, sourceId);
    }
    case 'instSorcCast':
      return me.instSorcThisTurn >= cond.n;
    case 'oppLostLife':
      return opp.lifeLostThisTurn > 0;
    case 'yourTurn':
      return g.active === controller;
    case 'notYourTurn':
      return g.active !== controller;
    case 'oppLifeGteYou':
      return opp.life >= me.life;
    case 'youLifeGteOpp':
      return me.life >= opp.life;
    case 'landsLte':
      return landsOf(g, controller).length <= cond.n;
    case 'anyLifeLte':
      return me.life <= cond.n || opp.life <= cond.n;
    case 'handLte':
      return opp.hand.length <= cond.n || (cond.who === 'any' && me.hand.length <= cond.n);
    case 'attacked':
      return g.active === controller && g.attackedThisTurn;
    case 'drawsGte':
      return me.drawsThisTurn >= cond.n;
    case 'selfTapped':
      return sourceId != null && !!g.cards[sourceId]?.tapped;
    case 'spellsCast':
      return me.spellsThisTurn >= cond.n;
    case 'secondSpell':
      return me.spellsThisTurn === 2;
    case 'gyCount': {
      let n = 0;
      for (const id of me.graveyard) if (matches(g, cond.filter, g.cards[id], controller, sourceId)) n++;
      return n >= cond.n;
    }
  }
}

export function lifegainBonus(g: GameState, pid: PID): number {
  let n = 0;
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.controller !== pid) continue;
    for (const ab of c.def.abilities ?? []) if (ab.kind === 'static' && ab.lifegainPlus) n += ab.lifegainPlus;
  }
  return n;
}
