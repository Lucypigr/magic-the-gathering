import { useState } from 'react';
import type { Level } from '../ai/combatAI';
import type { Screen } from '../App';
import { aiDecksFor, type Format } from '../data';
import { checkDeck, FORMAT_NAME, MIN_DECK, MIN_DECK_STANDARD, REWARDS, type Profile } from '../meta/profile';
import { ColorPips } from './common';
import { deckColors } from './deckStats';
import { TopBar } from './Home';

const LEVELS: { id: Level; name: string; desc: string }[] = [
  { id: 'easy', name: '簡單', desc: '隨意出牌、亂攻擊，適合熟悉規則。' },
  { id: 'normal', name: '普通', desc: '會計算交換與除去目標，偶爾失誤。' },
  { id: 'hard', name: '困難', desc: '會在你的回合用瞬間、留著戰鬥技巧、精算攻擊與阻擋。' },
];

const FORMATS: { id: Format; desc: string }[] = [
  { id: 'free', desc: `收藏中的卡都能用，至少 ${MIN_DECK} 張。對手使用經典卡組成的環境套牌。` },
  { id: 'standard', desc: `只能用目前標準賽合法的卡，至少 ${MIN_DECK_STANDARD} 張。對手使用 2026 年 9 月標準賽的熱門套牌。` },
];

export function Setup({
  profile,
  go,
  onStart,
}: {
  profile: Profile;
  go: (s: Screen) => void;
  onStart: (deckId: string, level: Level, ai: string | null, format: Format) => void;
}) {
  const [format, setFormat] = useState<Format>(profile.lastFormat ?? 'free');
  const valid = (id: string | null) => !!id && profile.decks.some((d) => d.id === id && checkDeck(profile, d, format).ok);
  const pickDefault = (f: Format) => {
    if (profile.lastDeckId && profile.decks.some((d) => d.id === profile.lastDeckId && checkDeck(profile, d, f).ok)) return profile.lastDeckId;
    return profile.decks.find((d) => checkDeck(profile, d, f).ok)?.id ?? null;
  };
  const [deckId, setDeckId] = useState<string | null>(() => pickDefault(format));
  const [level, setLevel] = useState<Level>(profile.lastLevel);
  const [ai, setAi] = useState<string | null>(null);
  const aiDecks = aiDecksFor(format);
  const changeFormat = (f: Format) => {
    setFormat(f);
    setAi(null);
    if (!profile.decks.some((d) => d.id === deckId && checkDeck(profile, d, f).ok)) setDeckId(pickDefault(f));
  };
  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="對戰準備" />
      <section className="panel">
        <h3 className="section-title">1. 選擇賽制</h3>
        <div className="choice-list">
          {FORMATS.map((f) => (
            <button key={f.id} className={`choice ${format === f.id ? 'on' : ''}`} onClick={() => changeFormat(f.id)}>
              <span className="choice-name">{FORMAT_NAME[f.id]}模式</span>
              <span className="choice-sub">{f.desc}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3 className="section-title">2. 選擇你的套牌</h3>
        <div className="choice-list">
          {profile.decks.map((d) => {
            const chk = checkDeck(profile, d, format);
            return (
              <button
                key={d.id}
                className={`choice ${deckId === d.id ? 'on' : ''}`}
                disabled={!chk.ok}
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
        <button className="btn btn-small" onClick={() => go({ name: 'decks' })}>
          前往套牌組建
        </button>
      </section>
      <section className="panel">
        <h3 className="section-title">3. 選擇難度</h3>
        <div className="choice-list three">
          {LEVELS.map((l) => (
            <button key={l.id} className={`choice ${level === l.id ? 'on' : ''}`} onClick={() => setLevel(l.id)}>
              <span className="choice-name">{l.name}</span>
              <span className="choice-sub">{l.desc}</span>
              <span className="choice-reward">
                勝利 +{REWARDS[l.id].win} 金幣 · 落敗 +{REWARDS[l.id].loss}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3 className="section-title">4. 對手</h3>
        <div className="choice-list">
          <button className={`choice ${ai == null ? 'on' : ''}`} onClick={() => setAi(null)}>
            <span className="choice-name">隨機</span>
            <span className="choice-sub">從 {aiDecks.length} 套{FORMAT_NAME[format]}模式的環境套牌中隨機抽一套</span>
          </button>
          {aiDecks.map((d) => (
            <button key={d.id} className={`choice ${ai === d.id ? 'on' : ''}`} onClick={() => setAi(d.id)}>
              <ColorPips colors={d.colors} />
              <span className="choice-name">{d.name}</span>
              <span className="choice-sub">{d.meta}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="setup-go">
        <button className="btn" onClick={() => go({ name: 'home' })}>
          返回
        </button>
        <button className="btn btn-primary btn-big" disabled={!valid(deckId)} onClick={() => deckId && onStart(deckId, level, ai, format)}>
          開始對戰
        </button>
      </div>
    </div>
  );
}
