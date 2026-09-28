import { activatedAbilities, manaSources } from '../../engine/actions';
import { cardName, isCreature, isLand, stats } from '../../engine/state';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Card, CardDef, GameState, Keyword, PID } from '../../engine/types';
import { Art, CardBack, CardFace, frameClass } from '../CardView';
import { KW_ICON, KW_ZH, PHASE_ZH, SUB_ZH } from '../i18n';
import { ManaSymbol } from '../Mana';

export interface Marks {
  /** 可以點選（目標、攻擊者、阻擋者…） */
  selectable: Set<number>;
  /** 已選擇 */
  selected: Set<number>;
  /** 額外標籤，例如「擋 → 灰熊」 */
  labels: Map<number, string>;
  focus: number | null;
  playable: Set<number>;
}

const SHOW_KW: Keyword[] = ['flying', 'first_strike', 'double_strike', 'deathtouch', 'trample', 'lifelink', 'vigilance', 'menace', 'reach', 'hexproof', 'indestructible', 'defender', 'haste', 'unblockable'];

export function Permanent({ g, c, marks, onCard, onHover }: { g: GameState; c: Card; marks: Marks; onCard: (id: number) => void; onHover: (id: number | null) => void }) {
  const cr = isCreature(c);
  const st = stats(g, c);
  const kws = SHOW_KW.filter((k) => st.kw.has(k) && (k !== 'haste' || c.sick));
  const cls = [
    'perm',
    frameClass(c.def),
    c.tapped ? 'tapped' : '',
    c.attacking ? 'attacking' : '',
    c.blocking != null ? 'blocking' : '',
    marks.selectable.has(c.id) ? 'selectable' : '',
    marks.selected.has(c.id) ? 'selected' : '',
    marks.focus === c.id ? 'focused' : '',
    marks.playable.has(c.id) ? 'playable' : '',
    c.controller === 0 ? 'mine' : 'theirs',
  ].join(' ');
  const attached = g.battlefield.map((id) => g.cards[id]).filter((a) => a.attachedTo === c.id);
  const label = marks.labels.get(c.id) ?? (c.blocking != null ? `擋 ${cardName(g.cards[c.blocking])}` : null);
  const lethal = cr && c.damage > 0;
  return (
    <div
      className={cls}
      onClick={() => onCard(c.id)}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCard(c.id)}
      aria-label={cardName(c)}
    >
      <div className="perm-rot">
        <Art def={c.def} />
        <div className="perm-name">{cardName(c)}</div>
        {kws.length > 0 && (
          <div className="perm-kw">
            {kws.map((k) => (
              <span key={k} title={KW_ZH[k]}>
                {KW_ICON[k]}
              </span>
            ))}
          </div>
        )}
        {cr && <div className={`perm-pt ${st.p > (c.def.power ?? 0) || st.t > (c.def.toughness ?? 0) ? 'up' : st.p < (c.def.power ?? 0) || st.t < (c.def.toughness ?? 0) ? 'down' : ''}`}>{`${st.p}/${st.t}`}</div>}
        <div className="perm-badges">
          {c.counters !== 0 && <span className="b-counter">{c.counters > 0 ? `+${c.counters}` : c.counters}</span>}
          {lethal && <span className="b-dmg">-{c.damage}</span>}
          {c.stun > 0 && <span className="b-stun">暈{c.stun}</span>}
          {cr && c.sick && !st.kw.has('haste') && c.controller === g.active && <span className="b-sick">召喚失調</span>}
          {attached.length > 0 && <span className="b-att">{attached.map((a) => (a.def.equip ? '裝' : '靈')).join('')}</span>}
          {c.def.aura && c.attachedTo != null && <span className="b-att">→{cardName(g.cards[c.attachedTo])}</span>}
          {c.def.equip && c.attachedTo != null && <span className="b-att">→{cardName(g.cards[c.attachedTo])}</span>}
        </div>
      </div>
      {label && <div className="perm-label">{label}</div>}
    </div>
  );
}

function LandPile({ cards, marks, onCard, onHover }: { cards: Card[]; marks: Marks; onCard: (id: number) => void; onHover: (id: number | null) => void }) {
  const c = cards[0];
  const zh = c.def.zh ?? SUB_ZH[c.def.subtypes?.[0] ?? ''] ?? c.def.name;
  const sel = cards.some((x) => marks.selectable.has(x.id));
  const layers = Math.min(cards.length, 4);
  return (
    <div
      className={`land-pile ${frameClass(c.def)} ${c.tapped ? 'tapped' : ''} ${sel ? 'selectable' : ''} ${marks.focus != null && cards.some((x) => x.id === marks.focus) ? 'focused' : ''} ${cards.some((x) => marks.playable.has(x.id)) ? 'playable' : ''}`}
      style={{ '--layers': layers } as CSSProperties}
      onClick={() => onCard(c.id)}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
      title={`${cardName(c)}${cards.length > 1 ? ` ×${cards.length}` : ''}${c.tapped ? '（已橫置）' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCard(c.id)}
      aria-label={`${cardName(c)} ${cards.length} 張`}
    >
      <div className="lp-rot">
        {Array.from({ length: layers - 1 }, (_, i) => (
          <div key={i} className="lp-under" style={{ '--k': layers - 1 - i } as CSSProperties} />
        ))}
        <div className="lp-top">
          <Art def={c.def} />
          <div className="lp-name">{c.def.supertypes?.includes('Basic') ? zh : cardName(c)}</div>
          <div className="lp-syms">
            {(c.def.produces ?? []).map((m) => (
              <ManaSymbol key={m} sym={m} size={13} />
            ))}
          </div>
        </div>
      </div>
      {cards.length > 1 && <span className="lp-count">×{cards.length}</span>}
    </div>
  );
}

function permsOf(g: GameState, pid: PID) {
  return g.battlefield.map((id) => g.cards[id]).filter((c) => c.controller === pid);
}

interface PartProps {
  g: GameState;
  pid: PID;
  marks: Marks;
  onCard: (id: number) => void;
  onHover: (id: number | null) => void;
}

/** 生物區（戰場中央） */
export function CreatureZone({ g, pid, marks, onCard, onHover }: PartProps) {
  const creatures = permsOf(g, pid).filter((c) => isCreature(c));
  return (
    <div className={`zone-creatures ${pid === 0 ? 'me' : 'opp'}`}>
      {creatures.map((c) => (
        <Permanent key={c.id} g={g} c={c} marks={marks} onCard={onCard} onHover={onHover} />
      ))}
    </div>
  );
}

/** 地：同名地疊成一疊並標示數量 */
export function LandZone({ g, pid, marks, onCard, onHover }: PartProps) {
  const lands = permsOf(g, pid).filter((c) => isLand(c) && !isCreature(c));
  const groups: Card[][] = [];
  for (const l of lands) {
    const grp = activatedAbilities(l.def).length > 0 ? undefined : groups.find((gr) => gr[0].def.id === l.def.id && gr[0].tapped === l.tapped);
    if (grp) grp.push(l);
    else groups.push([l]);
  }
  groups.sort((a, b) => a[0].def.name.localeCompare(b[0].def.name) || Number(a[0].tapped) - Number(b[0].tapped));
  return (
    <div className="zone-lands">
      {groups.map((gr) => (
        <LandPile key={gr[0].id} cards={gr} marks={marks} onCard={onCard} onHover={onHover} />
      ))}
    </div>
  );
}

/** 神器、結界等非生物非地的永久物 */
export function OtherZone({ g, pid, marks, onCard, onHover }: PartProps) {
  const others = permsOf(g, pid).filter((c) => !isCreature(c) && !isLand(c) && !(c.def.aura && c.token));
  if (!others.length) return null;
  return (
    <div className="zone-others">
      {others.map((c) => (
        <Permanent key={c.id} g={g} c={c} marks={marks} onCard={onCard} onHover={onHover} />
      ))}
    </div>
  );
}

/** 玩家頭像與生命值 */
export function Avatar({ g, pid, face, selectable, onPlayer }: { g: GameState; pid: PID; face: CardDef | null; selectable: boolean; onPlayer: () => void }) {
  const p = g.players[pid];
  const mana = manaSources(g, pid);
  const prev = useRef(p.life);
  const [flash, setFlash] = useState<'hit' | 'heal' | null>(null);
  useEffect(() => {
    if (p.life === prev.current) return;
    setFlash(p.life < prev.current ? 'hit' : 'heal');
    prev.current = p.life;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [p.life]);
  return (
    <div className={`hero-seat ${pid === 0 ? 'me' : 'opp'} ${g.active === pid ? 'active' : ''}`}>
      <button className={`hero-portrait ${selectable ? 'selectable' : ''} ${flash ?? ''}`} onClick={onPlayer} aria-label={`${p.name}（生命 ${p.life}）`}>
        {face ? <Art def={face} /> : <span className="hero-glyph">{pid === 0 ? '你' : 'AI'}</span>}
      </button>
      <div className={`hero-life ${p.life <= 5 ? 'low' : ''}`}>{p.life}</div>
      <div className="hero-meta">
        <span className="hero-name">{p.name}</span>
        <span className="hero-mana" title="目前可用的法術力來源">
          {mana.map((m) => (
            <ManaSymbol key={m.id} sym={m.produces.length === 1 ? m.produces[0] : 'C'} size={12} />
          ))}
        </span>
      </div>
    </div>
  );
}

/** 牌庫、墳墓場、放逐區 */
export function Piles({ g, pid, onGraveyard, onHover }: { g: GameState; pid: PID; onGraveyard: () => void; onHover: (id: number | null) => void }) {
  const p = g.players[pid];
  const top = p.graveyard.length ? g.cards[p.graveyard[p.graveyard.length - 1]] : null;
  return (
    <div className={`piles ${pid === 0 ? 'me' : 'opp'}`}>
      <div className="pile" title={`牌庫 ${p.library.length} 張`}>
        <CardBack size="xs" />
        <span className="pile-count">{p.library.length}</span>
        <span className="pile-label">牌庫</span>
      </div>
      <button className="pile pile-gy" onClick={onGraveyard} onMouseEnter={() => top && onHover(top.id)} onMouseLeave={() => onHover(null)} title={`墳墓場 ${p.graveyard.length} 張`}>
        {top ? <CardFace def={top.def} size="xs" /> : <div className="pile-empty" />}
        <span className="pile-count">{p.graveyard.length}</span>
        <span className="pile-label">墳墓場</span>
      </button>
      {p.exile.length > 0 && (
        <div className="pile" title={`放逐區 ${p.exile.length} 張`}>
          <div className="pile-empty exile" />
          <span className="pile-count">{p.exile.length}</span>
          <span className="pile-label">放逐</span>
        </div>
      )}
    </div>
  );
}

/** 對手的手牌（牌背） */
export function OppHand({ g }: { g: GameState }) {
  const n = g.players[1].hand.length;
  return (
    <div className="opp-hand" aria-label={`對手手牌 ${n} 張`} title={`對手手牌 ${n} 張`}>
      {Array.from({ length: Math.min(n, 8) }, (_, i) => (
        <CardBack key={i} size="xs" />
      ))}
      <span className="opp-hand-n">{n}</span>
    </div>
  );
}

export function PhaseTrack({ g }: { g: GameState }) {
  const steps: [string, string[]][] = [
    ['維持', ['untap', 'upkeep']],
    ['抓牌', ['draw']],
    ['主要1', ['main1']],
    ['戰鬥', ['combat_begin', 'combat_attackers', 'combat_blockers', 'combat_damage_first', 'combat_damage', 'combat_end']],
    ['主要2', ['main2']],
    ['結束', ['end', 'cleanup']],
  ];
  const mine = g.active === 0;
  return (
    <div className={`phase-track ${mine ? 'mine' : 'theirs'}`}>
      <span className="turn-who">
        {mine ? '你的回合' : '對手回合'} · 第 {Math.max(1, Math.ceil(g.turn / 2))} 輪
      </span>
      <ol>
        {steps.map(([label, ps]) => (
          <li key={label} className={ps.includes(g.phase) ? 'now' : ''} title={ps.includes(g.phase) ? PHASE_ZH[g.phase] : undefined}>
            {label}
          </li>
        ))}
      </ol>
      <span className="phase-now">{PHASE_ZH[g.phase]}</span>
    </div>
  );
}

export function StackView({ g, marks, onCard, onHover }: { g: GameState; marks: Marks; onCard: (id: number) => void; onHover: (id: number | null) => void }) {
  if (!g.stack.length) return null;
  const items = [...g.stack].reverse();
  return (
    <div className="stack">
      <div className="stack-title">堆疊（由上往下結算）</div>
      <div className="stack-items">
        {items.map((s, i) => {
          const c = g.cards[s.cardId];
          const tnames = s.targets
            .filter((t) => t)
            .map((t) => ('p' in t! ? g.players[t!.p].name : cardName(g.cards[t!.c])))
            .join('、');
          return (
            <div
              key={s.sid}
              className={`stack-item ${s.controller === 0 ? 'mine' : 'theirs'} ${i === 0 ? 'top' : ''} ${marks.selectable.has(s.cardId) ? 'selectable' : ''}`}
              onClick={() => onCard(s.cardId)}
              onMouseEnter={() => onHover(s.cardId)}
              onMouseLeave={() => onHover(null)}
              role="button"
              tabIndex={0}
            >
              <CardFace def={c.def} size="xs" />
              <div className="stack-desc">
                <div className="stack-name">
                  {s.kind === 'spell' ? '' : '能力：'}
                  {cardName(c)}
                </div>
                <div className="stack-who">{s.controller === 0 ? '你' : '對手'}{tnames ? ` → ${tnames}` : ''}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
