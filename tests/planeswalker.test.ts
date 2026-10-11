import { describe, expect, it } from 'vitest';
import '../src/data';
import { canActivate, performAction } from '../src/engine/actions';
import { combatDamage, declareAttackers } from '../src/engine/combat';
import { runEffects } from '../src/engine/effects';
import { checkSBA } from '../src/engine/flow';
import { getDef } from '../src/engine/registry';
import { createGame, newCard } from '../src/engine/state';
import { legalTargets } from '../src/engine/targets';
import type { Card, Effect, GameState, PID } from '../src/engine/types';
import { dealDamage, enterBattlefield } from '../src/engine/zones';

function mk(): GameState {
  const g = createGame({ name: 'A', deckName: '', deck: Array(30).fill('plains'), isAI: true }, { name: 'B', deckName: '', deck: Array(30).fill('island'), isAI: true }, 1);
  g.turn = 3;
  g.active = 0;
  g.phase = 'main1';
  return g;
}
function put(g: GameState, pid: PID, id: string): Card {
  const c = newCard(g, getDef(id), pid);
  c.zone = 'exile';
  enterBattlefield(g, c, pid);
  c.sick = false;
  c.tapped = false;
  g.pending = [];
  return c;
}
function run(g: GameState, src: Card, effects: Effect[]) {
  const it = runEffects(g, { controller: src.controller, source: src.id, targets: [] }, effects);
  let r = it.next();
  while (!r.done) r = it.next({ type: 'choose', ids: [] });
}

describe('鵬洛客', () => {
  it('以起始忠誠進場；忠誠異能每回合一次、法術時機、忠誠不足不能起動', () => {
    const g = mk();
    const jace = put(g, 0, 'the-theorist-jace-beleren');
    expect(jace.loyalty).toBe(3);
    // +1 是第二個異能（第一個是觸發式異能，不算在起動式異能裡）
    expect(performAction(g, 0, { type: 'activate', card: jace.id, ability: 0, targets: [] })).toBeNull();
    expect(jace.loyalty).toBe(4);
    expect(canActivate(g, 0, jace, 0)).toBe(false);
    // 新的回合（堆疊已結算）可以再起動；−6 忠誠不足
    g.stack = [];
    jace.usedThisTurn = [];
    expect(canActivate(g, 0, jace, 2)).toBe(false);
    jace.loyalty = 6;
    expect(canActivate(g, 0, jace, 2)).toBe(true);
    // 對手回合不能起動
    g.active = 1;
    expect(canActivate(g, 0, jace, 0)).toBe(false);
  });

  it('受到傷害會失去忠誠，忠誠為 0 時置入墳墓場', () => {
    const g = mk();
    const pw = put(g, 1, 'ajani-resolute');
    const src = put(g, 0, 'hinterland-sanctifier');
    dealDamage(g, src, 0, { c: pw.id }, 1);
    expect(pw.loyalty).toBe(1);
    dealDamage(g, src, 0, { c: pw.id }, 1);
    checkSBA(g);
    expect(pw.zone).toBe('graveyard');
  });

  it('「任意一個目標」可以選鵬洛客', () => {
    const g = mk();
    const pw = put(g, 1, 'ajani-resolute');
    expect(legalTargets(g, { kind: 'any' }, 0).some((t) => 'c' in t && t.c === pw.id)).toBe(true);
    expect(legalTargets(g, { kind: 'creature' }, 0).some((t) => 'c' in t && t.c === pw.id)).toBe(false);
  });

  it('生物可以攻擊鵬洛客，傷害移除忠誠而不是玩家生命', () => {
    const g = mk();
    const pw = put(g, 1, 'chandra-torch-of-defiance');
    const a = put(g, 0, 'nova-hellkite');
    g.phase = 'combat_attackers';
    declareAttackers(g, 0, [a.id], { [a.id]: pw.id });
    expect(a.attackTarget).toBe(pw.id);
    const life = g.players[1].life;
    combatDamage(g, 'all');
    expect(g.players[1].life).toBe(life);
    expect(pw.loyalty).toBe(0);
  });

  it('攻擊的鵬洛客先離場：攻擊者不造成傷害', () => {
    const g = mk();
    const pw = put(g, 1, 'chandra-torch-of-defiance');
    const a = put(g, 0, 'nova-hellkite');
    declareAttackers(g, 0, [a.id], { [a.id]: pw.id });
    pw.loyalty = 0;
    checkSBA(g);
    const life = g.players[1].life;
    combatDamage(g, 'all');
    expect(g.players[1].life).toBe(life);
  });

  it('強化傑斯：沒有傑斯衍生物時先派出一個，再放上忠誠', () => {
    const g = mk();
    const src = put(g, 0, 'plains');
    run(g, src, [{ e: 'empowerJace', n: 2 }]);
    const jaces = () => g.battlefield.map((id) => g.cards[id]).filter((c) => c.def.id === 'tok-jace');
    expect(jaces()).toHaveLength(1);
    expect(jaces()[0].loyalty).toBe(2);
    run(g, src, [{ e: 'empowerJace', n: 3 }]);
    expect(jaces()).toHaveLength(1);
    expect(jaces()[0].loyalty).toBe(5);
    checkSBA(g);
    expect(jaces()).toHaveLength(1);
  });
});
