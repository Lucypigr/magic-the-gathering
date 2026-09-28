import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Level } from './ai/combatAI';
import { ALL_AI_DECKS, CARDS, aiDecksFor, type Format } from './data';
import { TIERS, ladderReward, pointsDelta, rankOf, type Opponent } from './meta/ladder';
import { Ladder } from './ui/Ladder';
import { Saves } from './ui/Saves';
import { loadProfile, REWARDS, saveProfile, type Profile, type Settings } from './meta/profile';
import { Battle, type BattleResult } from './ui/battle/Battle';
import { ImagesEnabled } from './ui/CardView';
import { Collection } from './ui/Collection';
import { DeckBuilder } from './ui/DeckBuilder';
import { Help } from './ui/Help';
import { Home } from './ui/Home';
import { prefetchImages, prefetchZh, setLanguage, useImageVersion } from './ui/images';
import { Setup } from './ui/Setup';
import { Shop } from './ui/Shop';

export type Screen =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'battle'; deckId: string; aiDeckId: string; level: Level; key: number; random: boolean; format: Format; opponent?: Opponent }
  | { name: 'ladder'; auto?: boolean }
  | { name: 'saves' }
  | { name: 'decks' }
  | { name: 'collection' }
  | { name: 'shop' }
  | { name: 'help' };

export type UpdateProfile = (fn: (p: Profile) => void) => void;

export function randomAiDeck(format: Format): string {
  const list = aiDecksFor(format);
  return list[Math.floor(Math.random() * list.length)].id;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [reward, setReward] = useState<number | null>(null);
  const [resultExtra, setResultExtra] = useState<ReactNode>(null);

  const update: UpdateProfile = useCallback((fn) => {
    setProfile((prev) => {
      const next = structuredClone(prev);
      fn(next);
      saveProfile(next);
      return next;
    });
  }, []);

  // 語言要在渲染子元件前設定好；中文資料載入後重新渲染整個畫面
  const zh = profile.settings.cardLang === 'zh';
  setLanguage(zh);
  useImageVersion();
  useEffect(() => {
    if (zh) void prefetchZh(CARDS.filter((c) => !c.token && !c.supertypes?.includes('Basic')).map((c) => c.name));
  }, [zh]);

  useEffect(() => {
    if (profile.settings.realImages) void prefetchImages(CARDS.map((c) => c.imageName ?? c.name));
  }, [profile.settings.realImages]);

  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo?.(0, 0);
  };

  const startBattle = (deckId: string, level: Level, aiDeckId: string | null, format: Format) => {
    setReward(null);
    update((p) => {
      p.lastDeckId = deckId;
      p.lastLevel = level;
      p.lastFormat = format;
    });
    go({ name: 'battle', deckId, level, aiDeckId: aiDeckId ?? randomAiDeck(format), random: aiDeckId == null, key: Date.now(), format });
  };

  const startLadder = (deckId: string, format: Format, opp: Opponent) => {
    setReward(null);
    setResultExtra(null);
    update((p) => {
      p.lastDeckId = deckId;
      p.lastFormat = format;
    });
    go({ name: 'battle', deckId, level: opp.level, aiDeckId: opp.deck.id, random: true, key: Date.now(), format, opponent: opp });
  };

  const setSettings = (s: Settings) =>
    update((p) => {
      p.settings = s;
    });

  let body;
  switch (screen.name) {
    case 'home':
      body = <Home profile={profile} go={go} update={update} />;
      break;
    case 'setup':
      body = <Setup profile={profile} go={go} onStart={startBattle} />;
      break;
    case 'battle': {
      const deck = profile.decks.find((d) => d.id === screen.deckId);
      const aiDeck = screen.opponent?.deck ?? ALL_AI_DECKS.find((d) => d.id === screen.aiDeckId)!;
      if (!deck) {
        body = <Home profile={profile} go={go} update={update} />;
        break;
      }
      const s = screen;
      body = (
        <Battle
          key={s.key}
          playerDeck={deck}
          aiDeck={aiDeck}
          level={s.level}
          settings={profile.settings}
          reward={reward}
          onSettings={setSettings}
          opponent={s.opponent}
          resultExtra={s.opponent ? resultExtra : undefined}
          rematchLabel={s.opponent ? '繼續配對' : undefined}
          onEnd={(r: BattleResult) => {
            if (s.opponent) {
              const opp = s.opponent;
              const lf = profile.ladder[s.format];
              const won = r.won && !r.draw;
              const delta = r.draw ? 0 : pointsDelta(lf, won);
              const gold = r.draw ? ladderReward(lf.points, false) : r.conceded ? 0 : ladderReward(lf.points, won);
              const before = rankOf(lf.points);
              const after = rankOf(lf.points + delta);
              setReward(gold);
              setResultExtra(
                <p className="ladder-result">
                  {before.label}
                  {after.label !== before.label ? ` → ${after.label}` : ''}
                  <span className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>{delta > 0 ? `　+${delta} ★` : delta < 0 ? `　${delta} ★` : '　星數不變'}</span>
                  {after.tier > before.tier && <b style={{ color: TIERS[after.tier].color }}>　升上{TIERS[after.tier].name}！</b>}
                </p>,
              );
              update((p) => {
                p.gold += gold;
                const L = p.ladder[s.format];
                L.points = Math.max(0, L.points + delta);
                L.best = Math.max(L.best, L.points);
                if (!r.draw) {
                  if (won) {
                    L.w++;
                    L.streak = Math.max(0, L.streak) + 1;
                  } else {
                    L.l++;
                    L.streak = 0;
                  }
                }
                p.ladder.history.unshift({
                  at: Date.now(),
                  format: s.format,
                  opponent: opp.name,
                  oppRank: opp.rank,
                  oppDeck: aiDeck.name,
                  myDeck: deck.name,
                  won,
                  delta,
                });
                p.ladder.history = p.ladder.history.slice(0, 40);
              });
              return;
            }
            const gold = r.draw ? REWARDS[s.level].loss : r.won ? REWARDS[s.level].win : r.conceded ? 0 : REWARDS[s.level].loss;
            setReward(gold);
            update((p) => {
              p.gold += gold;
              if (!r.draw) {
                const rec = p.stats.byLevel[s.level];
                const vs = (p.stats.vsDeck[s.aiDeckId] ??= { w: 0, l: 0 });
                if (r.won) {
                  rec.w++;
                  vs.w++;
                  p.stats.streak = Math.max(0, p.stats.streak) + 1;
                } else {
                  rec.l++;
                  vs.l++;
                  p.stats.streak = Math.min(0, p.stats.streak) - 1;
                }
              }
            });
          }}
          onExit={() => go({ name: 'home' })}
          onRematch={() => (s.opponent ? go({ name: 'ladder', auto: true }) : startBattle(s.deckId, s.level, s.random ? null : s.aiDeckId, s.format))}
        />
      );
      break;
    }
    case 'ladder':
      body = <Ladder key={String(screen.auto)} profile={profile} go={go} auto={screen.auto} onStart={startLadder} />;
      break;
    case 'saves':
      body = <Saves profile={profile} go={go} onLoad={(p) => setProfile(p)} />;
      break;
    case 'decks':
      body = <DeckBuilder profile={profile} go={go} update={update} />;
      break;
    case 'collection':
      body = <Collection profile={profile} go={go} update={update} />;
      break;
    case 'shop':
      body = <Shop profile={profile} go={go} update={update} />;
      break;
    case 'help':
      body = <Help go={go} />;
      break;
  }
  return <ImagesEnabled.Provider value={profile.settings.realImages}>{body}</ImagesEnabled.Provider>;
}
