import { useCallback, useEffect, useState } from 'react';
import type { Level } from './ai/combatAI';
import { AI_DECKS, CARDS } from './data';
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
  | { name: 'battle'; deckId: string; aiDeckId: string; level: Level; key: number; random: boolean }
  | { name: 'decks' }
  | { name: 'collection' }
  | { name: 'shop' }
  | { name: 'help' };

export type UpdateProfile = (fn: (p: Profile) => void) => void;

export function randomAiDeck(): string {
  return AI_DECKS[Math.floor(Math.random() * AI_DECKS.length)].id;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [reward, setReward] = useState<number | null>(null);

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

  const startBattle = (deckId: string, level: Level, aiDeckId: string | null) => {
    setReward(null);
    update((p) => {
      p.lastDeckId = deckId;
      p.lastLevel = level;
    });
    go({ name: 'battle', deckId, level, aiDeckId: aiDeckId ?? randomAiDeck(), random: aiDeckId == null, key: Date.now() });
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
      const aiDeck = AI_DECKS.find((d) => d.id === screen.aiDeckId)!;
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
          onEnd={(r: BattleResult) => {
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
          onRematch={() => startBattle(s.deckId, s.level, s.random ? null : s.aiDeckId)}
        />
      );
      break;
    }
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
