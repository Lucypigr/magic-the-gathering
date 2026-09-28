import { displayName } from '../data/names';
import { useState } from 'react';
import type { Screen, UpdateProfile } from '../App';
import { SET_INFO } from '../data';
import { getDef } from '../engine/registry';
import { addToCollection, CLASSIC_PRODUCTS, openPack, poolSize, STANDARD_PRODUCTS, type PackResult, type Product } from '../meta/booster';
import { STANDARD_SETS } from '../engine/types';
import { DUPLICATE_GOLD, type Profile } from '../meta/profile';
import { CardBack, CardDetail, CardFace } from './CardView';
import { Gold, Modal } from './common';
import { TopBar } from './Home';

export function Shop({ profile, go, update }: { profile: Profile; go: (s: Screen) => void; update: UpdateProfile }) {
  const [opening, setOpening] = useState<{ product: Product; packs: PackResult[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function buy(p: Product) {
    if (profile.gold < p.price) {
      setMsg(`金幣不足：還差 ${p.price - profile.gold} 金幣。去對戰賺金幣吧！`);
      return;
    }
    setMsg(null);
    // 先在存檔複本上開包，再一次寫回
    const next = structuredClone(profile);
    next.gold -= p.price;
    next.packsOpened += p.packs;
    const results = Array.from({ length: p.packs }, () => addToCollection(next, openPack(p.set)));
    update((prof) => {
      Object.assign(prof, next);
    });
    setOpening({ product: p, packs: results });
  }

  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="商店" />
      <p className="muted">
        每包 12 張：7 普通、3 非普通、1 張稀有或秘稀，外加 1 張隨機稀有度。已經有 4 張的卡再開到會自動換成金幣（普通 {DUPLICATE_GOLD.C}、非普通 {DUPLICATE_GOLD.U}、稀有 {DUPLICATE_GOLD.R}、秘稀 {DUPLICATE_GOLD.M}）。
      </p>
      {msg && <p className="notice">{msg}</p>}
      <h3 className="section-title">標準賽系列</h3>
      <p className="muted small">開到的卡都能用在標準模式。最新的系列排在最前面。</p>
      <div className="set-shop">
        {[...STANDARD_SETS].reverse().map((s) => {
          const [one, five] = STANDARD_PRODUCTS.filter((p) => p.set === s);
          return (
            <div key={s} className={`set-tile set-${s}`}>
              <div className="set-tile-head">
                <span className="set-code">{s}</span>
                <div>
                  <div className="set-tile-name">{SET_INFO[s].short}</div>
                  <div className="muted small">
                    {SET_INFO[s].name} · {SET_INFO[s].released} · {poolSize(s)} 種卡
                  </div>
                </div>
              </div>
              <p className="small set-tile-desc">{SET_INFO[s].desc}</p>
              <div className="set-tile-buy">
                <button className="btn btn-primary btn-small" disabled={profile.gold < one.price} onClick={() => buy(one)}>
                  1 包 · {one.price}
                </button>
                <button className="btn btn-small" disabled={profile.gold < five.price} onClick={() => buy(five)}>
                  5 包 · {five.price}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <h3 className="section-title">經典補充包</h3>
      <p className="muted small">收錄歷年核心系列與過去環境的強卡，適合自由模式。</p>
      <div className="shop-grid">
        {CLASSIC_PRODUCTS.map((p) => (
          <div key={p.id} className={`product set-${p.set}`}>
            <div className="pack-art" aria-hidden="true">
              <span className="pack-set">{SET_INFO[p.set as 'FDN'].short}</span>
              {p.packs > 1 && <span className="pack-x">×{p.packs}</span>}
            </div>
            <div className="product-info">
              <h3>{p.name}</h3>
              <p className="muted small">{p.desc}</p>
              <div className="product-buy">
                <Gold n={p.price} />
                <button className="btn btn-primary" disabled={profile.gold < p.price} onClick={() => buy(p)}>
                  購買並開啟
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {opening && <PackOpening product={opening.product} packs={opening.packs} onDone={() => setOpening(null)} />}
    </div>
  );
}

function PackOpening({ product, packs, onDone }: { product: Product; packs: PackResult[]; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const pack = packs[idx];
  const allFlipped = flipped.size >= pack.cards.length;
  const last = idx === packs.length - 1;
  return (
    <Modal
      title={`${product.name}${packs.length > 1 ? `（第 ${idx + 1}／${packs.length} 包）` : ''}`}
      wide
      footer={
        <>
          {pack.gold > 0 && allFlipped && <span className="muted">重複卡換得 {pack.gold} 金幣</span>}
          {!allFlipped && (
            <button className="btn" onClick={() => setFlipped(new Set(pack.cards.map((_, i) => i)))}>
              全部翻開
            </button>
          )}
          {allFlipped &&
            (last ? (
              <button className="btn btn-primary" onClick={onDone}>
                完成
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setIdx(idx + 1);
                  setFlipped(new Set());
                }}
              >
                下一包
              </button>
            ))}
        </>
      }
    >
      <p className="muted small">點卡背翻開；翻開後點卡牌可看詳細內容。</p>
      <div className="pack-cards">
        {pack.cards.map((id, i) => {
          const def = getDef(id);
          const open = flipped.has(i);
          return (
            <div key={`${idx}-${i}`} className={`flip ${open ? 'open' : ''} rar-${def.rarity}`}>
              {open ? (
                <CardFace def={def} size="md" onClick={() => setDetail(id)}>
                  {pack.isNew[i] && !pack.converted[i] && <span className="new-tag">新卡</span>}
                  {pack.converted[i] && <span className="dup-tag">+{DUPLICATE_GOLD[def.rarity]} 金幣</span>}
                </CardFace>
              ) : (
                <button className="flip-btn" onClick={() => setFlipped(new Set([...flipped, i]))} aria-label="翻開">
                  <CardBack size="md" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {detail && (
        <Modal title={displayName(getDef(detail))} onClose={() => setDetail(null)} wide>
          <CardDetail def={getDef(detail)} />
        </Modal>
      )}
    </Modal>
  );
}
