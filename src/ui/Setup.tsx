import { useState } from 'react';
import type { Level } from '../ai/combatAI';
import type { Screen } from '../App';
import { AI_DECKS } from '../data';
import { checkDeck, REWARDS, type Profile } from '../meta/profile';
import { ColorPips } from './common';
import { deckColors } from './deckStats';
import { TopBar } from './Home';

const LEVELS: { id: Level; name: string; desc: string }[] = [
  { id: 'easy', name: '簡單', desc: '隨意出牌、亂攻擊，適合熟悉規則。' },
  { id: 'normal', name: '普通', desc: '會計算交換與除去目標，偶爾失誤。' },
  { id: 'hard', name: '困難', desc: '會在你的回合用瞬間、留著戰鬥技巧、精算攻擊與阻擋。' },
];

export function Setup({ profile, go, onStart }: { profile: Profile; go: (s: Screen) => void; onStart: (deckId: string, level: Level, ai: string | null) => void }) {
  const firstValid = profile.decks.find((d) => checkDeck(profile, d).ok);
  const [deckId, setDeckId] = useState<string | null>(
    profile.lastDeckId && profile.decks.some((d) => d.id === profile.lastDeckId && checkDeck(profile, d).ok) ? profile.lastDeckId : firstValid?.id ?? null,
  );
  const [level, setLevel] = useState<Level>(profile.lastLevel);
  const [ai, setAi] = useState<string | null>(null);
  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="對戰準備" />
      <section className="panel">
        <h3 className="section-title">1. 選擇你的套牌</h3>
        <div className="choice-list">
          {profile.decks.map((d) => {
            const chk = checkDeck(profile, d);
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
        <h3 className="section-title">2. 選擇難度</h3>
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
        <h3 className="section-title">3. 對手</h3>
        <div className="choice-list">
          <button className={`choice ${ai == null ? 'on' : ''}`} onClick={() => setAi(null)}>
            <span className="choice-name">隨機</span>
            <span className="choice-sub">從 7 套環境套牌中隨機抽一套</span>
          </button>
          {AI_DECKS.map((d) => (
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
        <button className="btn btn-primary btn-big" disabled={!deckId} onClick={() => deckId && onStart(deckId, level, ai)}>
          開始對戰
        </button>
      </div>
    </div>
  );
}
