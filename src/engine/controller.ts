import { AIPlayer, type Style } from '../ai/ai';
import type { Level } from '../ai/combatAI';
import { playOptions } from './actions';
import { runGame } from './flow';
import { createGame, type PlayerSetup } from './state';
import type { Decision, Flow, GameState, PID, Response } from './types';

export interface MatchOptions {
  human: PlayerSetup;
  ai: PlayerSetup;
  level: Level;
  aiStyle?: Style;
  seed?: number;
  /** 0 = 立即；數值越大 AI 動作越慢（毫秒） */
  aiDelay?: number;
  firstPlayer?: PID;
}

export type StopMode = 'smart' | 'all';

/**
 * 對戰控制器：驅動規則引擎的產生器，並在 AI 與人類玩家之間分派決策。
 * 人類玩家永遠是 0 號玩家。
 */
export class MatchController {
  g: GameState;
  decision: Decision | null = null;
  finished = false;
  ai: AIPlayer;
  aiThinking = false;
  stopMode: StopMode = 'smart';
  /** 略過到下一回合（人類按下「結束回合」） */
  skipUntilTurn: number | null = null;
  private gen: Flow;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  aiDelay: number;
  error: string | null = null;

  constructor(opts: MatchOptions) {
    this.g = createGame(opts.human, opts.ai, opts.seed ?? Date.now());
    this.ai = new AIPlayer(1, opts.level, opts.aiStyle);
    this.aiDelay = opts.aiDelay ?? 600;
    this.gen = runGame(this.g, opts.firstPlayer);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.g.version++;
    for (const fn of this.listeners) fn();
  }

  start(): void {
    this.advance(undefined);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.listeners.clear();
    this.finished = true;
  }

  concede(): void {
    if (this.finished) return;
    this.g.winner = 1;
    this.g.log.push({ turn: this.g.turn, text: '你投降了', kind: 'result' });
    this.finished = true;
    this.decision = null;
    if (this.timer) clearTimeout(this.timer);
    this.notify();
  }

  /** 人類玩家送出決策 */
  submit(resp: Response): void {
    if (!this.decision || this.finished) return;
    this.decision = null;
    this.advance(resp);
  }

  endTurn(): void {
    this.skipUntilTurn = this.g.turn + 1;
    if (this.decision?.type === 'priority') this.submit({ type: 'pass' });
    else if (this.decision?.type === 'attackers') this.submit({ type: 'attackers', ids: [] });
  }

  private advance(resp: Response | undefined): void {
    let r;
    try {
      r = this.gen.next(resp as Response);
      for (let guard = 0; guard < 100000; guard++) {
        if (r.done) {
          this.finished = true;
          this.decision = null;
          this.notify();
          return;
        }
        const d = r.value;
        if (d.player === this.ai.pid) {
          const a = this.ai.decide(this.g, d);
          const meaningful = !(d.type === 'priority' && a.type === 'pass') && d.type !== 'yesno';
          if (this.aiDelay > 0 && meaningful) {
            this.aiThinking = true;
            this.decision = null;
            this.notify();
            this.timer = setTimeout(() => {
              this.timer = null;
              this.aiThinking = false;
              this.advance(a);
            }, this.aiDelay);
            return;
          }
          r = this.gen.next(a);
          continue;
        }
        const auto = this.autoResponse(d);
        if (auto) {
          r = this.gen.next(auto);
          continue;
        }
        this.decision = d;
        this.notify();
        return;
      }
    } catch (e) {
      console.error(e);
      this.error = e instanceof Error ? e.message : String(e);
      this.finished = true;
      this.decision = null;
      this.notify();
    }
  }

  /** 自動替人類玩家略過不需要操作的時機 */
  private autoResponse(d: Decision): Response | null {
    const g = this.g;
    const me: PID = 0;
    const skipping = this.skipUntilTurn !== null && g.turn < this.skipUntilTurn;
    if (this.skipUntilTurn !== null && g.turn >= this.skipUntilTurn) this.skipUntilTurn = null;
    if (d.type === 'attackers' && skipping) return { type: 'attackers', ids: [] };
    if (d.type !== 'priority') return null;
    const top = g.stack[g.stack.length - 1];
    if (top && top.controller === me) return { type: 'pass' };
    const hasActions = playOptions(g, me).length > 0;
    if (!hasActions) return { type: 'pass' };
    if (skipping && !(top && top.controller !== me)) return { type: 'pass' };
    if (this.stopMode === 'all') return null;
    if (top) return null; // 對手的咒語或異能在堆疊上：可以回應
    if (g.active === me) {
      if (g.phase === 'main1' || g.phase === 'main2' || g.phase === 'combat_blockers') return null;
      return { type: 'pass' };
    }
    if (g.phase === 'combat_attackers' || g.phase === 'combat_blockers' || g.phase === 'end') return null;
    return { type: 'pass' };
  }
}

/** 無介面的同步對戰（測試用） */
export function runHeadless(
  p0: PlayerSetup,
  p1: PlayerSetup,
  levels: [Level, Level],
  seed: number,
  styles: [Style, Style] = ['midrange', 'midrange'],
): GameState {
  const g = createGame(p0, p1, seed);
  g.maxTurns = 60;
  const ais = [new AIPlayer(0, levels[0], styles[0]), new AIPlayer(1, levels[1], styles[1])];
  const gen = runGame(g);
  let r = gen.next(undefined as unknown as Response);
  let steps = 0;
  while (!r.done) {
    if (++steps > 200000) throw new Error('對戰步數過多');
    r = gen.next(ais[r.value.player].decide(g, r.value));
  }
  return g;
}
