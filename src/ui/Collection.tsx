import { displayName } from '../data/names';
import { useMemo, useState } from 'react';
import type { Screen, UpdateProfile } from '../App';
import { COLLECTIBLE, SET_INFO } from '../data';
import { STANDARD_SETS } from '../engine/types';
import type { CardDef } from '../engine/types';
import { SELL_PRICE, type Profile } from '../meta/profile';
import { CardDetail, CardFace } from './CardView';
import { Modal } from './common';
import { FilterBar, matchFilter, type PoolFilter } from './DeckBuilder';
import { sortDefs } from './deckStats';
import { TopBar } from './Home';
import { RARITY_ZH } from './i18n';

export function Collection({ profile, go, update }: { profile: Profile; go: (s: Screen) => void; update: UpdateProfile }) {
  const [f, setF] = useState<PoolFilter>({ q: '', color: '', type: '', set: '', rarity: '' });
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [specialOnly, setSpecialOnly] = useState(false);
  const [showSpecial, setShowSpecial] = useState(true);
  const specials = useMemo(() => new Set(profile.specials ?? []), [profile.specials]);
  const [detail, setDetail] = useState<CardDef | null>(null);
  const list = useMemo(
    () => COLLECTIBLE.filter((d) => matchFilter(d, f) && (!ownedOnly || (profile.collection[d.id] ?? 0) > 0) && (!specialOnly || specials.has(d.id))).sort(sortDefs),
    [f, ownedOnly, specialOnly, specials, profile.collection],
  );
  const sets = ([...[...STANDARD_SETS].reverse(), 'CORE', 'META'] as const).map((s) => {
    const all = COLLECTIBLE.filter((c) => c.set === s);
    const own = all.filter((c) => (profile.collection[c.id] ?? 0) > 0).length;
    return { s, own, total: all.length, sp: all.filter((c) => specials.has(c.id)).length };
  });
  const usedInDecks = (id: string) => Math.max(0, ...profile.decks.map((d) => d.cards[id] ?? 0));
  return (
    <div className="page page-wide">
      <TopBar profile={profile} go={go} title="我的收藏" />
      <div className="set-progress">
        {sets.map(({ s, own, total, sp }) => (
          <button key={s} className={`sp ${f.set === s ? 'on' : ''}`} onClick={() => setF({ ...f, set: f.set === s ? '' : s })} title={SET_INFO[s].name}>
            <div className="sp-name">{SET_INFO[s].short}</div>
            <div className="sp-bar">
              <div style={{ width: `${(own / total) * 100}%` }} />
            </div>
            <div className="sp-n">
              {own}／{total}
              {sp > 0 && <span className="special-text"> ★{sp}</span>}
            </div>
          </button>
        ))}
      </div>
      <FilterBar
        f={f}
        setF={setF}
        extra={
          <>
            <select id="rarity-filter" value={f.rarity} onChange={(e) => setF({ ...f, rarity: e.target.value })} aria-label="稀有度">
              <option value="">全部稀有度</option>
              {(['C', 'U', 'R', 'M'] as const).map((r) => (
                <option key={r} value={r}>
                  {RARITY_ZH[r]}
                </option>
              ))}
            </select>
            <label className="check">
              <input id="owned-only" type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} />
              只看已擁有
            </label>
            <label className="check">
              <input id="special-only" type="checkbox" checked={specialOnly} onChange={(e) => setSpecialOnly(e.target.checked)} />
              只看特殊版本（{specials.size}）
            </label>
          </>
        }
      />
      <div className="pool-grid">
        {list.map((d) => {
          const n = profile.collection[d.id] ?? 0;
          return (
            <div key={d.id} className="pool-card">
              <CardFace def={d} size="sm" special={specials.has(d.id)} className={n ? 'pickable' : 'unowned'} onClick={() => setDetail(d)} />
              <div className="pool-meta">
                <span className={n ? 'in-deck' : 'muted'}>
                  {n ? `×${n}` : '未擁有'}
                  {specials.has(d.id) && <span className="special-text"> ★</span>}
                </span>
                <span className={`rarity-tag r-${d.rarity}`}>{RARITY_ZH[d.rarity]}</span>
              </div>
            </div>
          );
        })}
      </div>
      {detail && (
        <Modal title={displayName(detail)} onClose={() => setDetail(null)} wide>
          <CardDetail
            def={detail}
            special={specials.has(detail.id) && showSpecial}
            extra={
              <div className="detail-actions">
                {specials.has(detail.id) && (
                  <button className="btn btn-small" onClick={() => setShowSpecial(!showSpecial)}>
                    {showSpecial ? '看一般版本' : '看特殊版本'}
                  </button>
                )}
                <span className="muted">
                  持有 {profile.collection[detail.id] ?? 0} 張
                  {usedInDecks(detail.id) > 0 && ` · 套牌最多使用 ${usedInDecks(detail.id)} 張`}
                </span>
                <button
                  className="btn"
                  disabled={(profile.collection[detail.id] ?? 0) === 0}
                  onClick={() =>
                    update((p) => {
                      const n = p.collection[detail.id] ?? 0;
                      if (n <= 0) return;
                      p.collection[detail.id] = n - 1;
                      if (!p.collection[detail.id]) delete p.collection[detail.id];
                      p.gold += SELL_PRICE[detail.rarity];
                    })
                  }
                >
                  出售一張（+{SELL_PRICE[detail.rarity]} 金幣）
                </button>
              </div>
            }
          />
          {(profile.collection[detail.id] ?? 0) <= usedInDecks(detail.id) && (profile.collection[detail.id] ?? 0) > 0 && (
            <p className="muted small">注意：再出售會讓使用這張卡的套牌張數不足。</p>
          )}
        </Modal>
      )}
    </div>
  );
}
