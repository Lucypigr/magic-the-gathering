import { useEffect, useMemo, useState } from 'react';
import type { Screen, UpdateProfile } from '../App';
import { deckSize } from '../data';
import { displayName } from '../data/names';
import { colorsOf } from '../engine/mana';
import type { CardDef, Color } from '../engine/types';
import {
  buildCards,
  buyMissing,
  deckColorsOf,
  findCard,
  importFromUrl,
  lookupCards,
  normName,
  parseDeckText,
  planUrl,
  resolveDeck,
  snapshotInfo,
  snapshotToParsed,
  type CardInfo,
  type NetDeck,
  type NetDeckSnapshot,
  type ParsedDeck,
} from '../meta/deckImport';
import { uid, type Profile, type SavedDeck } from '../meta/profile';
import { CardDetail } from './CardView';
import { ColorPips, Gold, Modal } from './common';
import { TopBar } from './Home';
import { ManaCost } from './Mana';

const SOURCE_NAME = { mtggoldfish: 'MTGGoldfish', mtgtop8: 'MTGTop8' } as const;

let snapshotCache: Promise<NetDeckSnapshot | null> | null = null;
function loadSnapshot(): Promise<NetDeckSnapshot | null> {
  snapshotCache ??= fetch(`${import.meta.env.BASE_URL}netdecks.json`)
    .then((r) => (r.ok ? (r.json() as Promise<NetDeckSnapshot>) : null))
    .catch(() => null);
  return snapshotCache;
}

interface Pending {
  deck: ParsedDeck;
  source: string;
  url?: string;
  info: Record<string, CardInfo>;
}

/** 抄牌組：貼上抄牌網的網址或牌表，一鍵套用成自己的套牌 */
export function NetDecks({
  profile,
  go,
  update,
  onTrial,
}: {
  profile: Profile;
  go: (s: Screen) => void;
  update: UpdateProfile;
  onTrial: (deck: SavedDeck) => void;
}) {
  const [snap, setSnap] = useState<NetDeckSnapshot | null | undefined>(undefined);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [showText, setShowText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mtggoldfish' | 'mtgtop8'>('all');
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    void loadSnapshot().then(setSnap);
  }, []);
  const snapInfo = useMemo(() => (snap ? snapshotInfo(snap) : {}), [snap]);

  /** 補查快照沒有的卡（未收錄的卡要知道是不是地、顏色與法術力值） */
  async function withInfo(deck: ParsedDeck): Promise<Record<string, CardInfo>> {
    const info = { ...snapInfo };
    const unknown = deck.main.filter((l) => !findCard(l.name) && !info[normName(l.name)]).map((l) => l.name);
    if (unknown.length) Object.assign(info, await lookupCards(unknown));
    return info;
  }

  async function open(deck: ParsedDeck, source: string, link?: string) {
    if (!deck.main.length) {
      setErr('沒有讀到任何卡牌。');
      return;
    }
    setPending({ deck, source, url: link, info: await withInfo(deck) });
  }

  async function fromUrl() {
    setErr(null);
    const plan = planUrl(url);
    if (!plan) {
      setErr('請貼上完整的網址（以 https:// 開頭）。');
      return;
    }
    const hit = snap?.decks.find((d) => d.id === plan.snapshotId);
    if (hit) {
      await open(snapshotToParsed(hit), SOURCE_NAME[hit.source], hit.url);
      return;
    }
    setBusy(true);
    try {
      const d = await importFromUrl(url);
      await open(d, d.site, url);
    } catch {
      setErr(`${plan.site} 不允許網頁直接讀取，代理伺服器也沒有回應。請在該網站按「Export／匯出」複製牌表，再用下方的「貼上牌表文字」。`);
      setShowText(true);
    } finally {
      setBusy(false);
    }
  }

  async function fromText() {
    setErr(null);
    setBusy(true);
    try {
      await open(parseDeckText(text), '貼上的牌表');
    } finally {
      setBusy(false);
    }
  }

  const list = (snap?.decks ?? []).filter((d) => filter === 'all' || d.source === filter);

  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="抄牌組" />

      <section className="panel nd-import">
        <h2 className="nd-h">貼上網址，一鍵套用</h2>
        <p className="muted small">支援 MTGTop8、MTGGoldfish、Moxfield、Archidekt、TappedOut、AetherHub 等抄牌網的牌組網址，也可以直接貼上牌表文字（MTG Arena 或 MTGO 格式）。</p>
        <form
          className="nd-url"
          onSubmit={(e) => {
            e.preventDefault();
            void fromUrl();
          }}
        >
          <input
            id="nd-url"
            type="url"
            inputMode="url"
            placeholder="https://mtgtop8.com/event?e=…&d=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="牌組網址"
          />
          <button className="btn btn-primary" disabled={busy || !url.trim()}>
            {busy ? '讀取中…' : '匯入'}
          </button>
        </form>
        <button className="linkish small" onClick={() => setShowText((s) => !s)}>
          {showText ? '▾' : '▸'} 貼上牌表文字
        </button>
        {showText && (
          <div className="nd-text">
            <textarea
              id="nd-text"
              rows={8}
              placeholder={'4 Lightning Strike\n4 Shock\n20 Mountain\n\nSideboard\n2 Negate'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="牌表文字"
            />
            <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => void fromText()}>
              解析牌表
            </button>
          </div>
        )}
        {err && <p className="nd-err">{err}</p>}
      </section>

      <section className="panel">
        <div className="section-head">
          <h3 className="section-title">標準賽熱門牌組</h3>
          <div className="nd-filter" role="tablist">
            {(
              [
                ['all', '全部'],
                ['mtggoldfish', '環境排行'],
                ['mtgtop8', '最新賽事'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {snap === undefined && <p className="muted">載入中…</p>}
        {snap === null && <p className="muted">目前無法載入熱門牌組，仍然可以用上方的網址或貼上牌表匯入。</p>}
        {snap && (
          <>
            <ul className="nd-list">
              {list.map((d) => (
                <NetDeckRow key={d.id} d={d} onOpen={() => void open(snapshotToParsed(d), SOURCE_NAME[d.source], d.url)} />
              ))}
            </ul>
            <p className="muted small">
              資料來源：
              <a href="https://www.mtggoldfish.com/metagame/standard" target="_blank" rel="noreferrer">
                MTGGoldfish
              </a>
              、
              <a href="https://mtgtop8.com/format?f=ST" target="_blank" rel="noreferrer">
                MTGTop8
              </a>
              。更新於 {new Date(snap.updated).toLocaleDateString('zh-TW')}，每天自動更新。
            </p>
          </>
        )}
      </section>

      {pending && (
        <ImportPreview
          key={pending.deck.name ?? pending.source}
          profile={profile}
          pending={pending}
          onClose={() => setPending(null)}
          onCreate={(deck, buy) => {
            update((p) => {
              if (buy) buyMissing(p, buy);
              p.decks.push(deck);
              p.lastDeckId = deck.id;
            });
            setPending(null);
            go({ name: 'decks' });
          }}
          onTrial={onTrial}
        />
      )}
    </div>
  );
}

function NetDeckRow({ d, onOpen }: { d: NetDeck; onOpen: () => void }) {
  const lines = useMemo(() => d.main.map(([n, name]) => ({ n, name })), [d]);
  const colors = d.colors ? ([...d.colors] as Color[]) : deckColorsOf(lines);
  const total = lines.reduce((s, l) => s + l.n, 0);
  const have = lines.reduce((s, l) => s + (findCard(l.name) ? l.n : 0), 0);
  return (
    <li>
      <button className="nd-row" onClick={onOpen}>
        <ColorPips colors={colors} />
        <span className="nd-main">
          <span className="nd-name">{d.name}</span>
          <span className="nd-sub">
            {d.source === 'mtggoldfish'
              ? `環境佔比 ${d.share ?? '?'}%`
              : `${d.rank ? `第 ${d.rank} 名` : ''}${d.player ? ` · ${d.player}` : ''}${d.event ? ` · ${d.event}` : ''}${d.date ? ` · ${d.date}` : ''}`}
          </span>
        </span>
        <span className="nd-cover" title="遊戲已收錄的卡（其餘會用基本地或相近的卡代替）">
          <span className="nd-bar">
            <span style={{ width: `${(have / total) * 100}%` }} />
          </span>
          收錄 {have}/{total}
        </span>
      </button>
    </li>
  );
}

function ImportPreview({
  profile,
  pending,
  onClose,
  onCreate,
  onTrial,
}: {
  profile: Profile;
  pending: Pending;
  onClose: () => void;
  onCreate: (deck: SavedDeck, buy: ReturnType<typeof resolveDeck> | null) => void;
  onTrial: (deck: SavedDeck) => void;
}) {
  const [name, setName] = useState((pending.deck.name ?? '匯入的套牌').slice(0, 24));
  const [substitute, setSubstitute] = useState(true);
  const [detail, setDetail] = useState<CardDef | null>(null);
  const plan = useMemo(() => resolveDeck(profile, pending.deck, { info: pending.info, substitute, standard: true }), [profile, pending, substitute]);
  const full = buildCards(plan, true);
  const size = deckSize({ cards: full });
  const missing = plan.lines.reduce((s, l) => s + l.missing, 0);
  const deckOf = (cards: Record<string, number>): SavedDeck => ({ id: uid(), name: name.trim() || '匯入的套牌', cards });

  const rows = [...plan.lines].sort((a, b) => rowOrder(a) - rowOrder(b) || (a.def?.cost?.length ?? 0) - (b.def?.cost?.length ?? 0));

  return (
    <Modal
      title="套用牌組"
      onClose={onClose}
      wide
      footer={
        <div className="nd-actions">
          <button className="btn" onClick={() => onTrial(deckOf(full))} title="用完整的牌組和 AI 打一場，不需要擁有這些卡，也不會獲得金幣">
            試玩一場
          </button>
          {missing > 0 ? (
            <>
              <button className="btn" onClick={() => onCreate(deckOf(full), null)} title="缺的卡之後開包或購買取得，補齊前套牌不能出戰">
                先建立（之後補卡）
              </button>
              <button className="btn btn-primary" disabled={profile.gold < plan.cost} onClick={() => onCreate(deckOf(full), plan)}>
                買齊 {missing} 張並建立 <Gold n={plan.cost} />
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => onCreate(deckOf(full), null)}>
              建立套牌
            </button>
          )}
        </div>
      }
    >
      <div className="nd-preview">
        <label className="nd-name-field">
          套牌名稱
          <input id="nd-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </label>
        <p className="muted small">
          來源：{pending.source}
          {pending.url && (
            <>
              {' '}
              ·{' '}
              <a href={pending.url} target="_blank" rel="noreferrer">
                原始牌表
              </a>
            </>
          )}
          {pending.deck.side.length > 0 && ` · 備牌 ${pending.deck.side.reduce((s, l) => s + l.n, 0)} 張（本遊戲沒有換備牌，略過）`}
        </p>

        <div className="nd-summary">
          <span className="chip chip-ok">原卡 {plan.exact}</span>
          {plan.landSubs > 0 && <span className="chip">地 → 基本地 {plan.landSubs}</span>}
          {plan.spellSubs > 0 && <span className="chip chip-sub">代替卡 {plan.spellSubs}</span>}
          {plan.dropped > 0 && <span className="chip chip-bad">無法放入 {plan.dropped}</span>}
          <span className={`chip ${size >= 60 ? 'chip-ok' : 'chip-bad'}`}>共 {size} 張</span>
        </div>
        <label className="nd-toggle">
          <input type="checkbox" checked={substitute} onChange={(e) => setSubstitute(e.target.checked)} />
          遊戲還沒收錄的咒語，自動換成顏色與法術力值相近的卡
        </label>
        <p className="small">
          {missing > 0 ? (
            <>
              你的收藏還缺 <b>{missing}</b> 張，買齊需要 <Gold n={plan.cost} />（你有 <Gold n={profile.gold} />）。
            </>
          ) : (
            '你已經擁有所有需要的卡！'
          )}
        </p>

        <ul className="nd-cards">
          {rows.map((l, i) => (
            <li key={i} className={`nd-card ${l.def ? (l.sub ? 'sub' : l.missing ? 'miss' : 'ok') : l.landSub ? 'land' : 'drop'}`}>
              <span className="nd-n">{l.n}</span>
              {l.def ? (
                <button className="linkish nd-cn" onClick={() => setDetail(l.def)}>
                  {l.sub ? (
                    <>
                      <s>{l.name}</s> → {displayName(l.def)}
                    </>
                  ) : (
                    displayName(l.def)
                  )}
                </button>
              ) : (
                <span className="nd-cn">{l.name}</span>
              )}
              {l.def?.cost && <ManaCost cost={l.def.cost} size={13} />}
              <span className="nd-st">{statusText(l)}</span>
            </li>
          ))}
        </ul>
      </div>
      {detail && (
        <Modal title={displayName(detail)} onClose={() => setDetail(null)} wide>
          <CardDetail def={detail} />
        </Modal>
      )}
    </Modal>
  );
}

function rowOrder(l: ReturnType<typeof resolveDeck>['lines'][number]): number {
  if (!l.def) return l.landSub ? 5 : 6;
  if (l.def.types.includes('Land')) return 4;
  if (l.def.types.includes('Creature')) return 1;
  return colorsOf(l.def).length ? 2 : 3;
}

function statusText(l: ReturnType<typeof resolveDeck>['lines'][number]): string {
  if (!l.def) return l.landSub ? '未收錄 · 換成基本地' : '未收錄';
  if (l.sub) return l.missing ? `代替卡 · 缺 ${l.missing}` : '代替卡';
  if (l.missing) return `缺 ${l.missing}`;
  return '✓';
}
