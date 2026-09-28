import { useEffect, useRef, useState } from 'react';
import type { Screen } from '../App';
import { type Format } from '../data';
import { getDef, hasDef } from '../engine/registry';
import { DIVS, PIPS, TIERS, findOpponent, ladderReward, queueSeconds, rankOf, type Opponent } from '../meta/ladder';
import { FORMAT_NAME, checkDeck, type Profile } from '../meta/profile';
import { Art } from './CardView';
import { ColorPips } from './common';
import { deckColors } from './deckStats';
import { TopBar } from './Home';

export function RankBadge({ points, size = 'md' }: { points: number; size?: 'sm' | 'md' | 'lg' }) {
  const r = rankOf(points);
  const t = TIERS[r.tier];
  return (
    <div className={`rank-badge rb-${size}`} style={{ '--tier': t.color } as React.CSSProperties} title={r.label}>
      <div className="rb-gem">
        <span className="rb-div">{r.tier === 5 ? '★' : ['', 'I', 'II', 'III', 'IV'][r.div]}</span>
      </div>
      {r.tier < 5 && size !== 'sm' && (
        <div className="rb-pips" aria-label={`${r.pips}／${PIPS} 星`}>
          {Array.from({ length: PIPS }, (_, i) => (
            <span key={i} className={i < r.pips ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}

type Phase = { kind: 'idle' } | { kind: 'search'; since: number; wait: number } | { kind: 'found'; opp: Opponent };

export function Ladder({
  profile,
  go,
  auto,
  onStart,
}: {
  profile: Profile;
  go: (s: Screen) => void;
  auto?: boolean;
  onStart: (deckId: string, format: Format, opp: Opponent) => void;
}) {
  const [format, setFormat] = useState<Format>(profile.lastFormat ?? 'standard');
  const valid = (id: string | null, f: Format) => !!id && profile.decks.some((d) => d.id === id && checkDeck(profile, d, f).ok);
  const pickDefault = (f: Format) => (valid(profile.lastDeckId, f) ? profile.lastDeckId : (profile.decks.find((d) => checkDeck(profile, d, f).ok)?.id ?? null));
  const [deckId, setDeckId] = useState<string | null>(() => pickDefault(format));
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [now, setNow] = useState(Date.now());
  const lf = profile.ladder[format];
  const r = rankOf(lf.points);

  const search = () => {
    if (!valid(deckId, format)) return;
    setPhase({ kind: 'search', since: Date.now(), wait: queueSeconds(lf.points) * 1000 });
  };

  // 從對戰結果回來時自動繼續配對
  const autoDone = useRef(false);
  useEffect(() => {
    if (auto && !autoDone.current) {
      autoDone.current = true;
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  useEffect(() => {
    if (phase.kind !== 'search') return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    const t = setTimeout(() => {
      const recent = profile.ladder.history.slice(0, 6).map((h) => h.opponent.replace(/\d+$/, ''));
      setPhase({ kind: 'found', opp: findOpponent(lf.points, format, recent) });
    }, phase.wait);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase.kind !== 'found' || !deckId) return;
    const t = setTimeout(() => onStart(deckId, format, phase.opp), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const changeFormat = (f: Format) => {
    setFormat(f);
    if (!valid(deckId, f)) setDeckId(pickDefault(f));
  };
  const history = profile.ladder.history.filter((h) => h.format === format).slice(0, 10);
  const total = lf.w + lf.l;

  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="天梯配對" />
      <section className="panel ladder-head">
        <div className="seg" role="tablist" aria-label="賽制">
          {(['standard', 'free'] as const).map((f) => (
            <button key={f} role="tab" aria-selected={format === f} className={format === f ? 'on' : ''} onClick={() => changeFormat(f)} disabled={phase.kind !== 'idle'}>
              {FORMAT_NAME[f]}天梯
            </button>
          ))}
        </div>
        <div className="ladder-rank">
          <RankBadge points={lf.points} size="lg" />
          <div>
            <div className="lr-label" style={{ color: TIERS[r.tier].color }}>
              {r.label}
            </div>
            <div className="lr-sub">
              {r.tier < 5 ? `${r.pips}／${PIPS} 星 · 每個大段有 ${DIVS} 個小段` : '已達最高段位'}
            </div>
            <div className="lr-stats">
              <span>
                {lf.w} 勝 {lf.l} 敗{total ? `（勝率 ${Math.round((lf.w / total) * 100)}%）` : ''}
              </span>
              {lf.streak >= 2 && <span className="lr-streak">{lf.streak} 連勝中</span>}
              <span>最高：{rankOf(lf.best).label}</span>
            </div>
            <div className="lr-sub">
              獎勵：勝利 +{ladderReward(lf.points, true)} 金幣 · 落敗 +{ladderReward(lf.points, false)}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 className="section-title">選擇套牌</h3>
        <div className="choice-list">
          {profile.decks.map((d) => {
            const chk = checkDeck(profile, d, format);
            return (
              <button
                key={d.id}
                className={`choice ${deckId === d.id ? 'on' : ''}`}
                disabled={!chk.ok || phase.kind !== 'idle'}
                onClick={() => setDeckId(d.id)}
                title={chk.errors.join('\n')}
              >
                <ColorPips colors={deckColors(d.cards)} />
                <span className="choice-name">{d.name}</span>
                <span className="choice-sub">{chk.ok ? `${chk.size} 張` : chk.errors[0]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="setup-go">
        <button className="btn" onClick={() => go({ name: 'home' })}>
          返回
        </button>
        <button className="btn btn-primary btn-big btn-go" disabled={!valid(deckId, format) || phase.kind !== 'idle'} onClick={search}>
          開始配對
        </button>
      </div>

      <section className="panel">
        <h3 className="section-title">最近的對戰</h3>
        {history.length === 0 ? (
          <p className="muted small">還沒有{FORMAT_NAME[format]}天梯的對戰紀錄。</p>
        ) : (
          <ul className="ladder-history">
            {history.map((h) => (
              <li key={h.at} className={h.won ? 'won' : 'lost'}>
                <span className="lh-res">{h.won ? '勝' : '敗'}</span>
                <span className="lh-opp">
                  {h.opponent}
                  <span className="muted small">（{h.oppRank}）</span>
                </span>
                <span className="lh-deck muted small">
                  {h.myDeck} vs {h.oppDeck}
                </span>
                <span className={`lh-delta ${h.delta > 0 ? 'up' : h.delta < 0 ? 'down' : ''}`}>{h.delta > 0 ? `+${h.delta}` : h.delta || '±0'} ★</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {phase.kind !== 'idle' && (
        <div className="queue-overlay" role="dialog" aria-modal="true">
          {phase.kind === 'search' ? (
            <div className="queue-box">
              <div className="queue-spinner" />
              <h2>正在尋找對手…</h2>
              <p className="queue-time">
                {formatTime(Math.floor((now - phase.since) / 1000))}
                <span className="muted small"> · 預估 {formatTime(Math.ceil(phase.wait / 1000) + 3)}</span>
              </p>
              <p className="muted small">
                {FORMAT_NAME[format]}天梯 · {r.label}
              </p>
              <button className="btn" onClick={() => setPhase({ kind: 'idle' })}>
                取消配對
              </button>
            </div>
          ) : (
            <div className="queue-box found">
              <h2>找到對手！</h2>
              <div className="versus">
                <div className="vs-side">
                  <div className="vs-face me">
                    <span className="hero-glyph">你</span>
                  </div>
                  <div className="vs-name">你</div>
                  <div className="vs-rank">
                    <RankBadge points={lf.points} size="sm" /> {r.label}
                  </div>
                </div>
                <div className="vs-mark">VS</div>
                <div className="vs-side">
                  <div className="vs-face">{phase.opp.face && hasDef(phase.opp.face) ? <Art def={getDef(phase.opp.face)} /> : <span className="hero-glyph">?</span>}</div>
                  <div className="vs-name">{phase.opp.name}</div>
                  <div className="vs-rank">
                    <RankBadge points={phase.opp.points} size="sm" /> {phase.opp.rank} · Lv.{phase.opp.lv}
                  </div>
                </div>
              </div>
              <p className="muted small">對戰即將開始…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
