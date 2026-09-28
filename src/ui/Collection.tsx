import { displayName } from '../data/names';
import { useMemo, useState } from 'react';
import type { Screen, UpdateProfile } from '../App';
import { COLLECTIBLE, SET_INFO } from '../data';
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
  const [detail, setDetail] = useState<CardDef | null>(null);
  const list = useMemo(
    () => COLLECTIBLE.filter((d) => matchFilter(d, f) && (!ownedOnly || (profile.collection[d.id] ?? 0) > 0)).sort(sortDefs),
    [f, ownedOnly, profile.collection],
  );
  const sets = (['FDN', 'CORE', 'META'] as const).map((s) => {
    const all = COLLECTIBLE.filter((c) => c.set === s);
    const own = all.filter((c) => (profile.collection[c.id] ?? 0) > 0).length;
    return { s, own, total: all.length };
  });
  const usedInDecks = (id: string) => Math.max(0, ...profile.decks.map((d) => d.cards[id] ?? 0));
  return (
    <div className="page page-wide">
      <TopBar profile={profile} go={go} title="我的收藏" />
      <div className="set-progress">
        {sets.map(({ s, own, total }) => (
          <div key={s} className="sp">
            <div className="sp-name">{SET_INFO[s].name}</div>
            <div className="sp-bar">
              <div style={{ width: `${(own / total) * 100}%` }} />
            </div>
            <div className="sp-n">
              {own}／{total}
            </div>
          </div>
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
          </>
        }
      />
      <div className="pool-grid">
        {list.map((d) => {
          const n = profile.collection[d.id] ?? 0;
          return (
            <div key={d.id} className="pool-card">
              <CardFace def={d} size="sm" className={n ? 'pickable' : 'unowned'} onClick={() => setDetail(d)} />
              <div className="pool-meta">
                <span className={n ? 'in-deck' : 'muted'}>{n ? `×${n}` : '未擁有'}</span>
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
            extra={
              <div className="detail-actions">
                <span className="muted">
                  {SET_INFO[detail.set as 'FDN'].short} · 持有 {profile.collection[detail.id] ?? 0} 張
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
