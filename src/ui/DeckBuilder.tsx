import { displayName, zhName } from '../data/names';
import { useMemo, useState } from 'react';
import type { Screen, UpdateProfile } from '../App';
import { BASIC_LANDS, COLLECTIBLE, SET_INFO, deckSize } from '../data';
import { colorsOf } from '../engine/mana';
import { getDef } from '../engine/registry';
import type { CardDef, Color } from '../engine/types';
import { MAX_COPIES, checkDeck, isBasic, uid, type Profile } from '../meta/profile';
import { CardDetail, CardFace } from './CardView';
import { ColorPips, Modal } from './common';
import { curve, deckColors, pipCounts, sortDefs, typeGroup } from './deckStats';
import { TopBar } from './Home';
import { COLOR_ZH, TYPE_ZH } from './i18n';
import { ManaCost, ManaSymbol } from './Mana';

export interface PoolFilter {
  q: string;
  color: '' | Color | 'C' | 'M';
  type: string;
  set: string;
  rarity: string;
}

export function matchFilter(d: CardDef, f: PoolFilter): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!d.name.toLowerCase().includes(q) && !d.text.includes(f.q) && !(zhName(d) ?? '').includes(f.q)) return false;
  }
  if (f.color) {
    const cols = colorsOf(d);
    if (f.color === 'C' && cols.length > 0) return false;
    if (f.color === 'M' && cols.length < 2) return false;
    if (f.color !== 'C' && f.color !== 'M' && !cols.includes(f.color)) return false;
  }
  if (f.type && !d.types.includes(f.type as CardDef['types'][number])) return false;
  if (f.set && d.set !== f.set) return false;
  if (f.rarity && d.rarity !== f.rarity) return false;
  return true;
}

export function FilterBar({ f, setF, extra }: { f: PoolFilter; setF: (f: PoolFilter) => void; extra?: React.ReactNode }) {
  return (
    <div className="filters">
      <input id="card-search" className="search" placeholder="搜尋卡名或規則文字" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
      <div className="color-filter" role="group" aria-label="顏色">
        {(['W', 'U', 'B', 'R', 'G'] as Color[]).map((c) => (
          <button key={c} className={`cf ${f.color === c ? 'on' : ''}`} onClick={() => setF({ ...f, color: f.color === c ? '' : c })} title={`${COLOR_ZH[c]}色`}>
            <ManaSymbol sym={c} size={20} />
          </button>
        ))}
        <button className={`cf cf-text ${f.color === 'M' ? 'on' : ''}`} onClick={() => setF({ ...f, color: f.color === 'M' ? '' : 'M' })}>
          多色
        </button>
        <button className={`cf cf-text ${f.color === 'C' ? 'on' : ''}`} onClick={() => setF({ ...f, color: f.color === 'C' ? '' : 'C' })}>
          無色
        </button>
      </div>
      <select id="type-filter" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="類別">
        <option value="">全部類別</option>
        {Object.entries(TYPE_ZH).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select id="set-filter" value={f.set} onChange={(e) => setF({ ...f, set: e.target.value })} aria-label="系列">
        <option value="">全部系列</option>
        {(['FDN', 'CORE', 'META'] as const).map((s) => (
          <option key={s} value={s}>
            {SET_INFO[s].short}
          </option>
        ))}
      </select>
      {extra}
    </div>
  );
}

export function DeckBuilder({ profile, go, update }: { profile: Profile; go: (s: Screen) => void; update: UpdateProfile }) {
  const [editId, setEditId] = useState<string>(profile.lastDeckId && profile.decks.some((d) => d.id === profile.lastDeckId) ? profile.lastDeckId : profile.decks[0]?.id);
  const [f, setF] = useState<PoolFilter>({ q: '', color: '', type: '', set: '', rarity: '' });
  const [tab, setTab] = useState<'pool' | 'deck'>('pool');
  const [detail, setDetail] = useState<CardDef | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const deck = profile.decks.find((d) => d.id === editId) ?? profile.decks[0];

  const pool = useMemo(
    () => COLLECTIBLE.filter((d) => (profile.collection[d.id] ?? 0) > 0 && matchFilter(d, f)).sort(sortDefs),
    [profile.collection, f],
  );

  if (!deck) {
    return (
      <div className="page">
        <TopBar profile={profile} go={go} title="套牌組建" />
        <button className="btn btn-primary" onClick={() => newDeck()}>
          建立新套牌
        </button>
      </div>
    );
  }

  function modify(fn: (cards: Record<string, number>) => void) {
    update((p) => {
      const d = p.decks.find((x) => x.id === deck.id);
      if (d) fn(d.cards);
    });
  }
  function canAdd(id: string): boolean {
    if (isBasic(id)) return true;
    const cur = deck.cards[id] ?? 0;
    return cur < MAX_COPIES && cur < (profile.collection[id] ?? 0);
  }
  const add = (id: string) =>
    canAdd(id) &&
    modify((c) => {
      c[id] = (c[id] ?? 0) + 1;
    });
  const remove = (id: string) =>
    modify((c) => {
      if (!c[id]) return;
      c[id]--;
      if (!c[id]) delete c[id];
    });
  function newDeck() {
    const id = uid();
    update((p) => {
      p.decks.push({ id, name: `新套牌 ${p.decks.length + 1}`, cards: {} });
      p.lastDeckId = id;
    });
    setEditId(id);
  }
  function duplicate() {
    const id = uid();
    update((p) => {
      p.decks.push({ id, name: `${deck.name}（複製）`, cards: { ...deck.cards } });
    });
    setEditId(id);
  }
  function del() {
    const rest = profile.decks.filter((d) => d.id !== deck.id);
    update((p) => {
      p.decks = p.decks.filter((d) => d.id !== deck.id);
      if (p.lastDeckId === deck.id) p.lastDeckId = p.decks[0]?.id ?? null;
    });
    setEditId(rest[0]?.id);
    setConfirmDel(false);
  }
  function autoLands() {
    const nonBasic = Object.entries(deck.cards).filter(([id]) => !isBasic(id));
    const spells = nonBasic.filter(([id]) => !getDef(id).types.includes('Land')).reduce((s, [, n]) => s + n, 0);
    const target = spells >= 30 ? 60 : 40;
    const need = target - deckSize(deck);
    if (need <= 0) return;
    const pips = pipCounts(deck.cards);
    const colors = (Object.keys(pips) as Color[]).filter((c) => pips[c] > 0);
    const basics: Record<Color, string> = { W: 'plains', U: 'island', B: 'swamp', R: 'mountain', G: 'forest' };
    const use = colors.length ? colors : (['W', 'U', 'B', 'R', 'G'] as Color[]);
    const total = use.reduce((s, c) => s + (pips[c] || 1), 0);
    const alloc = use.map((c) => ({ c, n: Math.floor((need * (pips[c] || 1)) / total) }));
    let left = need - alloc.reduce((s, a) => s + a.n, 0);
    alloc.sort((a, b) => (pips[b.c] || 1) - (pips[a.c] || 1));
    for (let i = 0; left > 0; i = (i + 1) % alloc.length, left--) alloc[i].n++;
    modify((cards) => {
      for (const a of alloc) if (a.n > 0) cards[basics[a.c]] = (cards[basics[a.c]] ?? 0) + a.n;
    });
  }

  const chk = checkDeck(profile, deck);
  const cv = curve(deck.cards);
  const maxCv = Math.max(1, ...cv);
  const entries = Object.entries(deck.cards)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ def: getDef(id), n }))
    .sort((a, b) => sortDefs(a.def, b.def));
  const groups = ['生物', '咒語', '其他', '地'] as const;
  const pips = pipCounts(deck.cards);

  return (
    <div className="page page-wide">
      <TopBar profile={profile} go={go} title="套牌組建" />
      <div className="deck-picker">
        {profile.decks.map((d) => (
          <button key={d.id} className={`deck-tab ${d.id === deck.id ? 'on' : ''}`} onClick={() => setEditId(d.id)}>
            <ColorPips colors={deckColors(d.cards)} />
            {d.name}
            {!checkDeck(profile, d).ok && <span className="warn-dot" title="套牌不完整" />}
          </button>
        ))}
        <button className="deck-tab add" onClick={newDeck}>
          ＋ 新套牌
        </button>
      </div>

      <div className="mobile-tabs">
        <button className={tab === 'pool' ? 'on' : ''} onClick={() => setTab('pool')}>
          卡池
        </button>
        <button className={tab === 'deck' ? 'on' : ''} onClick={() => setTab('deck')}>
          套牌（{chk.size}）
        </button>
      </div>

      <div className={`builder show-${tab}`}>
        <section className="pool">
          <FilterBar f={f} setF={setF} />
          <p className="muted small">點卡牌加入套牌；右上角的「i」查看詳細內容。每張非基本地的卡最多 {MAX_COPIES} 張，且不能超過你擁有的數量。</p>
          <div className="basics">
            {BASIC_LANDS.map((id) => {
              const d = getDef(id);
              return (
                <div key={id} className="basic">
                  <ManaSymbol sym={d.produces![0]} size={22} />
                  <span>{d.zh}</span>
                  <button className="icon-btn" onClick={() => remove(id)} aria-label={`減少${d.zh}`}>
                    −
                  </button>
                  <b>{deck.cards[id] ?? 0}</b>
                  <button className="icon-btn" onClick={() => add(id)} aria-label={`增加${d.zh}`}>
                    ＋
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pool-grid">
            {pool.map((d) => {
              const own = profile.collection[d.id] ?? 0;
              const inDeck = deck.cards[d.id] ?? 0;
              return (
                <div key={d.id} className="pool-card">
                  <CardFace def={d} size="sm" className={canAdd(d.id) ? 'pickable' : 'maxed'} onClick={() => add(d.id)} title={d.text} />
                  <div className="pool-meta">
                    <span className={inDeck ? 'in-deck' : ''}>
                      {inDeck}／{Math.min(own, MAX_COPIES)}
                    </span>
                    <button className="info-btn" onClick={() => setDetail(d)} aria-label="詳細">
                      i
                    </button>
                  </div>
                </div>
              );
            })}
            {pool.length === 0 && <p className="muted">沒有符合條件的卡。去商店開包吧！</p>}
          </div>
        </section>

        <section className="deck-panel">
          <div className="deck-head">
            <input
              id="deck-name"
              className="deck-name-input"
              value={deck.name}
              maxLength={24}
              onChange={(e) => {
                const v = e.target.value;
                update((p) => {
                  const d = p.decks.find((x) => x.id === deck.id);
                  if (d) d.name = v;
                });
              }}
              aria-label="套牌名稱"
            />
            <div className="deck-actions">
              <button className="btn btn-small" onClick={autoLands} title="依照顏色比例補足基本地到 40 或 60 張">
                自動補地
              </button>
              <button className="btn btn-small" onClick={duplicate}>
                複製
              </button>
              {profile.decks.length > 1 &&
                (confirmDel ? (
                  <button className="btn btn-small btn-danger" onClick={del}>
                    確定刪除
                  </button>
                ) : (
                  <button className="btn btn-small" onClick={() => setConfirmDel(true)}>
                    刪除
                  </button>
                ))}
            </div>
          </div>
          <div className={`deck-status ${chk.ok ? 'ok' : 'bad'}`}>
            <b>{chk.size}</b> 張
            {chk.ok ? '，可以出戰' : ''}
            {chk.errors.map((e) => (
              <div key={e} className="err">
                {e}
              </div>
            ))}
          </div>
          <div className="curve" aria-label="法術力曲線">
            {cv.map((n, i) => (
              <div key={i} className="curve-col">
                <span className="curve-n">{n || ''}</span>
                <div className="curve-track">
                  <div className="curve-bar" style={{ height: `${(n / maxCv) * 100}%` }} />
                </div>
                <span className="curve-x">{i === 6 ? '6+' : i}</span>
              </div>
            ))}
          </div>
          <div className="pip-row">
            {(['W', 'U', 'B', 'R', 'G'] as Color[])
              .filter((c) => pips[c] > 0)
              .map((c) => (
                <span key={c}>
                  <ManaSymbol sym={c} size={16} /> {pips[c]}
                </span>
              ))}
          </div>
          {groups.map((grp) => {
            const list = entries.filter((e) => typeGroup(e.def) === grp);
            if (!list.length) return null;
            return (
              <div key={grp} className="deck-group">
                <h4>
                  {grp}（{list.reduce((s, e) => s + e.n, 0)}）
                </h4>
                {list.map(({ def, n }) => (
                  <div key={def.id} className="deck-row">
                    <span className="dr-n">{n}</span>
                    <button className="dr-name linkish" onClick={() => setDetail(def)}>
                      {def.zh && isBasic(def.id) ? def.zh : displayName(def)}
                    </button>
                    <ManaCost cost={def.cost} size={14} />
                    <button className="icon-btn" onClick={() => remove(def.id)} aria-label="減少">
                      −
                    </button>
                    <button className="icon-btn" onClick={() => add(def.id)} disabled={!canAdd(def.id)} aria-label="增加">
                      ＋
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
          {entries.length === 0 && <p className="muted">套牌是空的。從卡池點選卡牌加入。</p>}
        </section>
      </div>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} wide>
          <CardDetail
            def={detail}
            extra={
              <div className="detail-actions">
                <span className="muted">
                  持有 {isBasic(detail.id) ? '∞' : profile.collection[detail.id] ?? 0} 張 · 套牌中 {deck.cards[detail.id] ?? 0} 張
                </span>
                <button className="btn" onClick={() => remove(detail.id)}>
                  移除一張
                </button>
                <button className="btn btn-primary" disabled={!canAdd(detail.id)} onClick={() => add(detail.id)}>
                  加入一張
                </button>
              </div>
            }
          />
        </Modal>
      )}
    </div>
  );
}
