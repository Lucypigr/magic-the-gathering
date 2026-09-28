// ============================================================
// 對戰特效：攻擊／阻擋／目標的箭頭，以及施放咒語時的大圖提示
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { cardName } from '../../engine/state';
import type { GameState, PID, Show, TargetRef } from '../../engine/types';
import { CardFace } from '../CardView';

interface Arrow {
  key: string;
  kind: 'attack' | 'block' | 'target-mine' | 'target-theirs';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function findEl(root: HTMLElement, t: TargetRef): HTMLElement | null {
  if ('p' in t) return root.querySelector<HTMLElement>(`[data-player="${t.p}"]`);
  const id = String(t.c);
  return (
    root.querySelector<HTMLElement>(`[data-cid="${id}"]`) ??
    [...root.querySelectorAll<HTMLElement>('[data-cids]')].find((e) => e.dataset.cids!.split(' ').includes(id)) ??
    root.querySelector<HTMLElement>(`[data-scid="${id}"]`)
  );
}

function computeArrows(g: GameState, root: HTMLElement): Arrow[] {
  const base = root.getBoundingClientRect();
  const center = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - base.left + root.scrollLeft, y: r.top + r.height / 2 - base.top + root.scrollTop };
  };
  const out: Arrow[] = [];
  const add = (key: string, kind: Arrow['kind'], from: HTMLElement | null, to: HTMLElement | null) => {
    if (!from || !to || from === to) return;
    const a = center(from);
    const b = center(to);
    out.push({ key, kind, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  };
  for (const id of g.battlefield) {
    const c = g.cards[id];
    if (c.attacking) add(`a${id}`, 'attack', findEl(root, { c: id }), findEl(root, { p: (1 - c.controller) as PID }));
    if (c.blocking != null) add(`b${id}`, 'block', findEl(root, { c: id }), findEl(root, { c: c.blocking }));
  }
  for (const s of g.stack) {
    const from = root.querySelector<HTMLElement>(`[data-sid="${s.sid}"]`);
    s.targets.forEach((t, i) => {
      if (t) add(`s${s.sid}-${i}`, s.controller === 0 ? 'target-mine' : 'target-theirs', from, findEl(root, t));
    });
  }
  return out;
}

/** 在桌面上畫出攻擊、阻擋與咒語目標的箭頭 */
export function ArrowLayer({ g, rootRef }: { g: GameState; rootRef: RefObject<HTMLElement | null> }) {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const last = useRef('');
  const measure = () => {
    const root = rootRef.current;
    if (!root) return;
    const next = computeArrows(g, root);
    const key = JSON.stringify(next.map((a) => [a.key, Math.round(a.x1), Math.round(a.y1), Math.round(a.x2), Math.round(a.y2)]));
    if (key !== last.current) {
      last.current = key;
      setArrows(next);
    }
    if (root.scrollWidth !== size.w || root.scrollHeight !== size.h) setSize({ w: root.scrollWidth, h: root.scrollHeight });
  };
  useLayoutEffect(measure);
  useEffect(() => {
    // 等攻擊時往前推的動畫結束再量一次
    const t = setTimeout(measure, 260);
    return () => clearTimeout(t);
  });
  useEffect(() => {
    const root = rootRef.current;
    window.addEventListener('resize', measure);
    root?.addEventListener('scroll', measure);
    return () => {
      window.removeEventListener('resize', measure);
      root?.removeEventListener('scroll', measure);
    };
  });
  if (!arrows.length) return null;
  return (
    <svg className="arrow-layer" width={size.w} height={size.h} aria-hidden="true">
      <defs>
        {(['attack', 'block', 'target-mine', 'target-theirs'] as const).map((k) => (
          <marker key={k} id={`head-${k}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={`ah-${k}`} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => {
        // 稍微彎曲的弧線，終點縮短一點避免蓋住目標中心
        const dx = a.x2 - a.x1;
        const dy = a.y2 - a.y1;
        const len = Math.hypot(dx, dy) || 1;
        const shrink = Math.min(34, len * 0.25);
        const x2 = a.x2 - (dx / len) * shrink;
        const y2 = a.y2 - (dy / len) * shrink;
        const bend = Math.min(60, len * 0.18);
        const cx = (a.x1 + x2) / 2 - (dy / len) * bend;
        const cy = (a.y1 + y2) / 2 + (dx / len) * bend;
        const d = `M${a.x1},${a.y1} Q${cx},${cy} ${x2},${y2}`;
        return (
          <g key={a.key} className={`arrow arrow-${a.kind}`}>
            <path d={d} className="arrow-glow" />
            <path d={d} className="arrow-line" markerEnd={`url(#head-${a.kind})`} />
            <circle cx={a.x1} cy={a.y1} r={6} className="arrow-dot" />
          </g>
        );
      })}
    </svg>
  );
}

const SHOW_MS = { spell: 1900, activated: 1600, trigger: 1300, attack: 1400, block: 1300 } as const;

function targetText(g: GameState, targets?: (TargetRef | null)[]): string {
  const names = (targets ?? [])
    .filter((t): t is TargetRef => !!t)
    .map((t) => ('p' in t ? g.players[t.p].name : cardName(g.cards[t.c])));
  return names.length ? `→ ${names.join('、')}` : '';
}

/** 施放咒語、起動或觸發異能、宣告攻擊時，畫面上跳出提示 */
export function Spotlight({ g }: { g: GameState }) {
  const seen = useRef(g.showSeq);
  const [queue, setQueue] = useState<(Show & { at: number })[]>([]);
  const [cur, setCur] = useState<Show | null>(null);
  useEffect(() => {
    if (g.showSeq === seen.current) return;
    const now = Date.now();
    const fresh = g.shows.filter((s) => s.seq > seen.current).map((s) => ({ ...s, at: now }));
    seen.current = g.showSeq;
    if (fresh.length) setQueue((q) => [...q, ...fresh].slice(-6));
  });
  useEffect(() => {
    if (cur || !queue.length) return;
    // 排太久的提示已經過時（例如戰鬥早就結束），直接略過
    const now = Date.now();
    const inCombat = g.battlefield.some((id) => g.cards[id].attacking);
    const rest = [...queue];
    let next: Show | undefined;
    while (rest.length) {
      const s = rest.shift()!;
      const stale = now - s.at > 3500 || ((s.kind === 'attack' || s.kind === 'block') && !inCombat);
      if (!stale) {
        next = s;
        break;
      }
    }
    setQueue(rest);
    if (next) setCur(next);
  }, [cur, queue, g]);
  const queueLen = useRef(0);
  queueLen.current = queue.length;
  useEffect(() => {
    if (!cur) return;
    // 自己的動作與排隊中的提示顯示得短一點
    const ms = SHOW_MS[cur.kind] * (cur.player === 0 ? 0.6 : 1) * (queueLen.current > 1 ? 0.6 : 1);
    const t = setTimeout(() => setCur(null), ms);
    return () => clearTimeout(t);
  }, [cur]);
  if (!cur) return null;
  const who = g.players[cur.player].name;
  const mine = cur.player === 0;
  if (cur.kind === 'attack' || cur.kind === 'block') {
    const n = cur.pairs?.length ?? 0;
    const text =
      cur.kind === 'attack'
        ? `${who} 宣告攻擊：${cur.pairs!.map(([a]) => cardName(g.cards[a])).join('、')}`
        : `${who} 阻擋：${cur.pairs!.map(([b, a]) => `${cardName(g.cards[b])} 擋 ${cardName(g.cards[a])}`).join('；')}`;
    return (
      <div key={cur.seq} className={`combat-banner ${cur.kind} ${mine ? 'mine' : 'theirs'}`} role="status">
        <span className="cb-icon">{cur.kind === 'attack' ? '⚔' : '🛡'}</span>
        {n > 0 ? text : ''}
      </div>
    );
  }
  const c = cur.card != null ? g.cards[cur.card] : null;
  if (!c) return null;
  const verb = cur.kind === 'spell' ? '施放' : cur.kind === 'activated' ? '起動異能' : '觸發異能';
  return (
    <div key={cur.seq} className={`spotlight ${mine ? 'mine' : 'theirs'} sp-${cur.kind}`} role="status">
      <div className="sp-label">
        {who} {verb}
      </div>
      <CardFace def={c.def} size="md" showText className="sp-card" />
      {cur.kind === 'activated' && cur.text && <div className="sp-ability">{cur.text}</div>}
      {targetText(g, cur.targets) && <div className="sp-target">{targetText(g, cur.targets)}</div>}
    </div>
  );
}
