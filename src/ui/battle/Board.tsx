import { activatedAbilities, manaSources } from '../../engine/actions';
import { cardName, isCreature, isLand, stats } from '../../engine/state';
import type { Card, GameState, Keyword, PID } from '../../engine/types';
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

interface ZoneProps {
  g: GameState;
  pid: PID;
  marks: Marks;
  onCard: (id: number) => void;
  onHover: (id: number | null) => void;
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

function LandGroup({ g, cards, marks, onCard, onHover }: { g: GameState; cards: Card[]; marks: Marks; onCard: (id: number) => void; onHover: (id: number | null) => void }) {
  const c = cards[0];
  const zh = c.def.zh ?? SUB_ZH[c.def.subtypes?.[0] ?? ''] ?? c.def.name;
  const sel = cards.some((x) => marks.selectable.has(x.id));
  return (
    <div
      className={`land-chip ${c.tapped ? 'tapped' : ''} ${sel ? 'selectable' : ''} ${marks.focus != null && cards.some((x) => x.id === marks.focus) ? 'focused' : ''}`}
      onClick={() => onCard(c.id)}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
      title={`${cardName(c)}${c.tapped ? '（已橫置）' : ''}`}
      role="button"
      tabIndex={0}
    >
      <span className="land-syms">
        {(c.def.produces ?? []).map((m) => (
          <ManaSymbol key={m} sym={m} size={16} />
        ))}
      </span>
      <span className="land-name">{c.def.supertypes?.includes('Basic') ? zh : cardName(c)}</span>
      {cards.length > 1 && <span className="land-count">×{cards.length}</span>}
    </div>
  );
}

export function PlayerField({ g, pid, marks, onCard, onHover }: ZoneProps) {
  const perms = g.battlefield.map((id) => g.cards[id]).filter((c) => c.controller === pid);
  const creatures = perms.filter((c) => isCreature(c));
  const others = perms.filter((c) => !isCreature(c) && !isLand(c) && !c.def.aura);
  const auras = perms.filter((c) => !isCreature(c) && c.def.aura && !c.token);
  const lands = perms.filter((c) => isLand(c) && !isCreature(c));
  // 沒有起動式異能的同名地合併顯示
  const groups: Card[][] = [];
  const singles: Card[] = [];
  for (const l of lands) {
    if (activatedAbilities(l.def).length > 0) {
      singles.push(l);
      continue;
    }
    const grp = groups.find((gr) => gr[0].def.id === l.def.id && gr[0].tapped === l.tapped);
    if (grp) grp.push(l);
    else groups.push([l]);
  }
  groups.sort((a, b) => a[0].def.name.localeCompare(b[0].def.name) || Number(a[0].tapped) - Number(b[0].tapped));
  const creatureRow = (
    <div className="row row-creatures">
      {creatures.length === 0 && others.length === 0 && auras.length === 0 && <div className="row-empty">沒有生物</div>}
      {creatures.map((c) => (
        <Permanent key={c.id} g={g} c={c} marks={marks} onCard={onCard} onHover={onHover} />
      ))}
      {others.length + auras.length > 0 && <div className="row-sep" />}
      {[...others, ...auras].map((c) => (
        <Permanent key={c.id} g={g} c={c} marks={marks} onCard={onCard} onHover={onHover} />
      ))}
    </div>
  );
  const landRow = (
    <div className="row row-lands">
      {lands.length === 0 && <div className="row-empty">沒有地</div>}
      {groups.map((gr) => (
        <LandGroup key={gr[0].id} g={g} cards={gr} marks={marks} onCard={onCard} onHover={onHover} />
      ))}
      {singles.map((c) => (
        <LandGroup key={c.id} g={g} cards={[c]} marks={marks} onCard={onCard} onHover={onHover} />
      ))}
    </div>
  );
  return <div className={`field field-${pid === 0 ? 'me' : 'opp'}`}>{pid === 0 ? [creatureRow, landRow].map((r, i) => <div key={i}>{r}</div>) : [landRow, creatureRow].map((r, i) => <div key={i}>{r}</div>)}</div>;
}

export function PlayerInfo({
  g,
  pid,
  selectable,
  onPlayer,
  onGraveyard,
}: {
  g: GameState;
  pid: PID;
  selectable: boolean;
  onPlayer: () => void;
  onGraveyard: () => void;
}) {
  const p = g.players[pid];
  const mana = manaSources(g, pid);
  const active = g.active === pid;
  return (
    <div className={`pinfo ${pid === 0 ? 'pinfo-me' : 'pinfo-opp'} ${active ? 'active' : ''}`}>
      <button className={`avatar ${selectable ? 'selectable' : ''}`} onClick={onPlayer} aria-label={`${p.name}（生命 ${p.life}）`}>
        <span className="life">{p.life}</span>
        <span className="life-label">生命</span>
      </button>
      <div className="pinfo-main">
        <div className="pname">
          {p.name}
          <span className="pdeck">{p.deckName}</span>
        </div>
        <div className="pstats">
          <span>手牌 {p.hand.length}</span>
          <span>牌庫 {p.library.length}</span>
          <button className="linkish" onClick={onGraveyard}>
            墳墓場 {p.graveyard.length}
          </button>
          {p.exile.length > 0 && <span>放逐 {p.exile.length}</span>}
        </div>
        <div className="pmana" title="目前可用的法術力來源">
          {mana.length === 0 ? <span className="dim">無可用法術力</span> : mana.map((m) => <ManaSymbol key={m.id} sym={m.produces.length === 1 ? m.produces[0] : 'C'} size={15} />)}
        </div>
      </div>
      {pid === 1 && (
        <div className="opp-hand" aria-label={`對手手牌 ${p.hand.length} 張`}>
          {p.hand.slice(0, 8).map((id) => (
            <CardBack key={id} size="xs" />
          ))}
        </div>
      )}
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
