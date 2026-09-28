import type {
  Ability,
  ActivatedAbility,
  CardDef,
  Effect,
  Mana,
  SetCode,
  Rarity,
  SpellSpec,
  TargetSpec,
  TriggeredAbility,
  TriggerOn,
} from '../engine/types';

// ============================================================
// 卡牌定義用的輔助函式（宣告式 DSL）
// 規則敘述為本遊戲引擎實際執行的效果（部分卡牌做了簡化）。
// ============================================================

export type X = Partial<CardDef>;
export const defs: CardDef[] = [];
export const seen = new Set<string>();

export const slug = (n: string) =>
  n
    .toLowerCase()
    .replace(/['’,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function add(d: Omit<CardDef, 'id'>) {
  const id = slug(d.name);
  if (seen.has(id)) throw new Error(`重複的卡牌：${d.name}`);
  seen.add(id);
  defs.push({ id, ...d });
}

export function cr(set: SetCode, r: Rarity, name: string, cost: string, subs: string, p: number, t: number, text: string, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Creature'], subtypes: subs.split(' ').filter(Boolean), power: p, toughness: t, text, ...x });
}
export function inst(set: SetCode, r: Rarity, name: string, cost: string, text: string, spell: SpellSpec, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Instant'], spell, text, ...x });
}
export function sorc(set: SetCode, r: Rarity, name: string, cost: string, text: string, spell: SpellSpec, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Sorcery'], spell, text, ...x });
}
export function ench(set: SetCode, r: Rarity, name: string, cost: string, text: string, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Enchantment'], text, ...x });
}
export function arti(set: SetCode, r: Rarity, name: string, cost: string, text: string, x: X = {}) {
  add({ set, rarity: r, name, cost, types: ['Artifact'], text, ...x });
}
export function land(set: SetCode, r: Rarity, name: string, produces: Mana[], text: string, x: X = {}) {
  add({ set, rarity: r, name, types: ['Land'], produces, text, ...x });
}

export const trig = (on: TriggerOn, effects: Effect[], x: Partial<TriggeredAbility> = {}): Ability => ({ kind: 'trigger', on, effects, ...x });
export const etb = (effects: Effect[], x: Partial<TriggeredAbility> = {}) => trig('etb', effects, x);
export const act = (cost: ActivatedAbility['cost'], effects: Effect[], label: string, x: Partial<ActivatedAbility> = {}): Ability => ({
  kind: 'activated',
  cost,
  effects,
  label,
  ...x,
});

export const ANY: TargetSpec = { kind: 'any' };
export const CR: TargetSpec = { kind: 'creature' };
export const OPP_CR: TargetSpec = { kind: 'creature', filter: { ctrl: 'opp' }, prompt: '選擇對手的生物' };
export const MY_CR: TargetSpec = { kind: 'creature', filter: { ctrl: 'you' }, prompt: '選擇你的生物' };
export const OPP: TargetSpec = { kind: 'opponent' };
export const PLAYER: TargetSpec = { kind: 'player' };
export const dmg = (n: number, to: 'T0' | 'opp' = 'T0'): Effect => ({ e: 'damage', n, to });
export const destroyT0: Effect = { e: 'destroy', what: 'T0' };
export const OUTLAWS = ['Assassin', 'Mercenary', 'Pirate', 'Rogue', 'Warlock'];

// ------------------------------------------------------------
// 常見的地
// ------------------------------------------------------------

/** 震地：生命多於10點時支付2點生命、未橫置進場 */
export function shockland(set: SetCode, name: string, a: Mana, b: Mana, subs: string) {
  land(set, 'R', name, [a, b], `（{T}：加{${a}}或{${b}}。）\n此地進戰場時，若你的生命多於10點，你支付2點生命；否則它橫置進戰場。`, {
    subtypes: subs.split(' '),
    shock: true,
  });
}

/** 雙色橫置地 */
export function tapland(set: SetCode, r: Rarity, name: string, a: Mana, b: Mana, x: X = {}, extraText = '') {
  land(set, r, name, [a, b], `此地橫置進戰場。\n{T}：加{${a}}或{${b}}。${extraText ? '\n' + extraText : ''}`, { etbTapped: true, ...x });
}

export const AIRBORNE: TargetSpec = { kind: 'creature', filter: { kw: 'flying' } };
export const ANY_OTHER: TargetSpec = { kind: 'any', notSelf: true };
/** 對手的非地永久物 */
export const OPP_NONLAND: TargetSpec = { kind: 'permanent', filter: { ctrl: 'opp', nonType: 'Land' } };
/** 你墳墓場中的生物牌 */
export const MY_GY_CR: TargetSpec = { kind: 'gyCard', filter: { ctrl: 'you', type: 'Creature' }, prompt: '選擇你墳墓場中的生物牌' };
