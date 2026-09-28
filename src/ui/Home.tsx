import { useState } from 'react';
import type { Screen, UpdateProfile } from '../App';
import { AI_DECKS, COLLECTIBLE } from '../data';
import { resetProfile, type Profile } from '../meta/profile';
import { ColorPips, Gold } from './common';
import { LEVEL_ZH } from './i18n';
import { hasLocalImages, imagesUnavailable, useImageVersion } from './images';

export function TopBar({ profile, go, title }: { profile: Profile; go: (s: Screen) => void; title: string }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => go({ name: 'home' })}>
        <span className="brand-mark">萬</span>
        <span className="brand-name">萬智牌決鬥場</span>
      </button>
      <h1 className="topbar-title">{title}</h1>
      <Gold n={profile.gold} />
    </header>
  );
}

export function Home({ profile, go, update }: { profile: Profile; go: (s: Screen) => void; update: UpdateProfile }) {
  useImageVersion();
  const [confirmReset, setConfirmReset] = useState(false);
  const owned = COLLECTIBLE.filter((c) => (profile.collection[c.id] ?? 0) > 0).length;
  const lv = profile.stats.byLevel;
  const wins = lv.easy.w + lv.normal.w + lv.hard.w;
  const losses = lv.easy.l + lv.normal.l + lv.hard.l;
  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="主選單" />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">單人對戰 · 開包 · 自由組牌</p>
          <h2 className="hero-title">挑戰 7 套環境套牌</h2>
          <p className="hero-sub">
            用基本套牌出發，贏下對戰賺取金幣，買補充包擴充收藏，組出屬於你的套牌。AI 會從 2026 年 9 月標準賽環境的 7 個熱門套路中隨機選一套。
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-big" onClick={() => go({ name: 'setup' })}>
              開始對戰
            </button>
            <button className="btn btn-big" onClick={() => go({ name: 'help' })}>
              規則與操作
            </button>
          </div>
        </div>
        <dl className="record">
          <div>
            <dt>戰績</dt>
            <dd>
              {wins} 勝 {losses} 敗
            </dd>
          </div>
          {(['easy', 'normal', 'hard'] as const).map((k) => (
            <div key={k}>
              <dt>{LEVEL_ZH[k]}</dt>
              <dd>
                {lv[k].w}–{lv[k].l}
              </dd>
            </div>
          ))}
          <div>
            <dt>收藏</dt>
            <dd>
              {owned}／{COLLECTIBLE.length}
            </dd>
          </div>
          <div>
            <dt>已開包數</dt>
            <dd>{profile.packsOpened}</dd>
          </div>
        </dl>
      </section>

      <nav className="menu-grid">
        <button className="menu-tile" onClick={() => go({ name: 'decks' })}>
          <span className="mt-title">套牌組建</span>
          <span className="mt-sub">{profile.decks.length} 副套牌 · 自由搭配收藏中的卡</span>
        </button>
        <button className="menu-tile" onClick={() => go({ name: 'shop' })}>
          <span className="mt-title">商店</span>
          <span className="mt-sub">用金幣購買補充包，隨機掉落卡牌</span>
        </button>
        <button className="menu-tile" onClick={() => go({ name: 'collection' })}>
          <span className="mt-title">我的收藏</span>
          <span className="mt-sub">瀏覽全部卡牌、出售多餘的卡</span>
        </button>
      </nav>

      <section className="panel">
        <h3 className="section-title">AI 的環境套牌</h3>
        <ul className="deck-list-ai">
          {AI_DECKS.map((d) => {
            const r = profile.stats.vsDeck[d.id] ?? { w: 0, l: 0 };
            return (
              <li key={d.id}>
                <ColorPips colors={d.colors} />
                <div>
                  <div className="dl-name">
                    {d.name}
                    <span className="dl-meta">{d.meta}</span>
                  </div>
                  <div className="dl-desc">{d.desc}</div>
                </div>
                <div className="dl-rec">
                  {r.w}勝 {r.l}敗
                </div>
              </li>
            );
          })}
          <li className="dl-cta">
            <div className="dl-desc">每場對戰會從這 7 套中隨機挑一套，也可以在對戰準備時指定對手。</div>
            <button className="btn btn-small" onClick={() => go({ name: 'setup' })}>
              挑選對手
            </button>
          </li>
        </ul>
      </section>

      <section className="panel settings">
        <h3 className="section-title">設定</h3>
        <label className="check">
          <input
            id="real-images"
            type="checkbox"
            checked={profile.settings.realImages}
            onChange={(e) =>
              update((p) => {
                p.settings.realImages = e.target.checked;
              })
            }
          />
          顯示真實卡圖（從 Scryfall 載入；無法連線時使用內建卡框）
        </label>
        {profile.settings.realImages && hasLocalImages() && <p className="muted small">正在使用本機下載的卡圖。</p>}
        {profile.settings.realImages && imagesUnavailable() && (
          <p className="muted small">目前無法連線到 Scryfall，已改用內建卡框。在專案資料夾執行 npm run fetch-images 可以把卡圖下載到本機。</p>
        )}
        <div className="reset-row">
          {confirmReset ? (
            <>
              <span>確定要清除所有進度嗎？金幣、收藏與套牌都會重置。</span>
              <button
                className="btn btn-danger"
                onClick={() => {
                  const p = resetProfile();
                  update((q) => Object.assign(q, p));
                  setConfirmReset(false);
                }}
              >
                清除進度
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                取消
              </button>
            </>
          ) : (
            <button className="btn btn-small" onClick={() => setConfirmReset(true)}>
              重新開始遊戲…
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
