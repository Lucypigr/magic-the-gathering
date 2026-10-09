import { useState } from 'react';
import type { Screen, UpdateProfile } from '../App';
import { hasDef, getDef } from '../engine/registry';
import type { Profile } from '../meta/profile';
import { CardDetail, CardFace } from './CardView';
import { Modal } from './common';
import { TopBar } from './Home';
import { RulesText } from './Mana';
import { CHAPTERS, CHAPTER_REWARD, type Chapter } from './tutorial';

/** 新手教學：章節列表與章節內容 */
export function Tutorial({
  profile,
  go,
  update,
  onPractice,
  initial,
}: {
  profile: Profile;
  go: (s: Screen) => void;
  update: UpdateProfile;
  onPractice: (deckId: string, aiId: string) => void;
  initial?: string;
}) {
  const [open, setOpen] = useState<string | null>(initial ?? null);
  const done = profile.tutorial ?? {};
  const count = CHAPTERS.filter((c) => done[c.id]).length;
  const ch = CHAPTERS.find((c) => c.id === open);
  if (ch) {
    const idx = CHAPTERS.indexOf(ch);
    return (
      <ChapterView
        key={ch.id}
        ch={ch}
        profile={profile}
        go={go}
        done={!!done[ch.id]}
        onBack={() => setOpen(null)}
        onNext={idx < CHAPTERS.length - 1 ? () => setOpen(CHAPTERS[idx + 1].id) : null}
        onComplete={() =>
          update((p) => {
            p.tutorial ??= {};
            if (!p.tutorial[ch.id]) {
              p.tutorial[ch.id] = true;
              p.gold += CHAPTER_REWARD;
            }
          })
        }
        onPractice={onPractice}
      />
    );
  }
  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="新手教學" />
      <section className="panel tut-intro">
        <h2 className="tut-h">從零開始學萬智牌</h2>
        <p className="muted">
          一共 {CHAPTERS.length} 章，每章幾分鐘就能讀完，最後有小測驗。第一次讀完每一章可以獲得 {CHAPTER_REWARD} 金幣，部分章節還能直接開一場練習對戰。
        </p>
        <div className="tut-progress" aria-label={`已完成 ${count}／${CHAPTERS.length} 章`}>
          <div className="tut-bar" style={{ width: `${(count / CHAPTERS.length) * 100}%` }} />
        </div>
        <p className="small muted">
          已完成 {count}／{CHAPTERS.length} 章
        </p>
      </section>
      <ol className="tut-list">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button className={`tut-item ${done[c.id] ? 'done' : ''}`} onClick={() => setOpen(c.id)}>
              <span className="tut-num">{done[c.id] ? '✓' : i + 1}</span>
              <span className="tut-text">
                <span className="tut-title">{c.title.replace(/^第 \d+ 章：/, '')}</span>
                <span className="tut-sum">{c.summary}</span>
              </span>
              {!done[c.id] && <span className="tut-reward">+{CHAPTER_REWARD}</span>}
            </button>
          </li>
        ))}
      </ol>
      <div className="setup-go">
        <button className="btn" onClick={() => go({ name: 'home' })}>
          返回主選單
        </button>
      </div>
    </div>
  );
}

function ChapterView({
  ch,
  profile,
  go,
  done,
  onBack,
  onNext,
  onComplete,
  onPractice,
}: {
  ch: Chapter;
  profile: Profile;
  go: (s: Screen) => void;
  done: boolean;
  onBack: () => void;
  onNext: (() => void) | null;
  onComplete: () => void;
  onPractice: (deckId: string, aiId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(ch.quiz.map(() => null));
  const [detail, setDetail] = useState<string | null>(null);
  const quizPage = page === ch.pages.length;
  const p = ch.pages[page];
  const allRight = answers.every((a, i) => a === ch.quiz[i].answer);
  const total = ch.pages.length + 1;

  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="新手教學" />
      <section className="panel tut-chapter">
        <div className="tut-crumb">
          <button className="linkish" onClick={onBack}>
            ← 章節列表
          </button>
          <span className="muted small">
            {Math.min(page + 1, total)}／{total}
          </span>
        </div>
        <h2 className="tut-h">{ch.title}</h2>
        <div className="tut-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i === page ? 'on' : i < page ? 'past' : ''} />
          ))}
        </div>

        {!quizPage ? (
          <div className="tut-page">
            <h3 className="tut-ptitle">{p.title}</h3>
            {p.body.map((b, i) => (
              <div key={i} className="tut-para">
                <RulesText text={b} size={15} />
              </div>
            ))}
            {p.cards && p.cards.filter(hasDef).length > 0 && (
              <div className="tut-cards">
                {p.cards.filter(hasDef).map((id) => (
                  <CardFace key={id} def={getDef(id)} size="md" onClick={() => setDetail(id)} title="點一下看詳細資訊" />
                ))}
              </div>
            )}
            {p.tip && <div className="tut-tip">💡 {p.tip}</div>}
          </div>
        ) : (
          <div className="tut-page">
            <h3 className="tut-ptitle">小測驗</h3>
            {ch.quiz.map((q, qi) => (
              <div key={qi} className="tut-q">
                <p className="tut-qtext">
                  {qi + 1}. {q.q}
                </p>
                <div className="tut-opts">
                  {q.options.map((o, oi) => {
                    const picked = answers[qi] === oi;
                    const state = answers[qi] == null ? '' : oi === q.answer && picked ? 'right' : picked ? 'wrong' : '';
                    return (
                      <button
                        key={oi}
                        className={`tut-opt ${state}`}
                        onClick={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
                {answers[qi] != null && (
                  <p className={`tut-explain ${answers[qi] === q.answer ? 'right' : 'wrong'}`}>
                    {answers[qi] === q.answer ? '答對了！' : '再想想看。'}
                    {answers[qi] === q.answer && ` ${q.explain}`}
                  </p>
                )}
              </div>
            ))}
            {allRight && (
              <div className="tut-done">
                {done ? <p>這一章已經完成了。</p> : <p>全部答對！完成本章可以獲得 {CHAPTER_REWARD} 金幣。</p>}
                <div className="tut-done-actions">
                  {!done && (
                    <button className="btn btn-primary" onClick={onComplete}>
                      完成本章（+{CHAPTER_REWARD} 金幣）
                    </button>
                  )}
                  {ch.practice && (
                    <button
                      className="btn"
                      onClick={() => {
                        if (!done) onComplete();
                        onPractice(ch.practice!.deck, ch.practice!.ai);
                      }}
                      title={ch.practice.hint}
                    >
                      練習對戰（簡單 AI）
                    </button>
                  )}
                  {onNext && (
                    <button
                      className="btn"
                      onClick={() => {
                        if (!done) onComplete();
                        onNext();
                      }}
                    >
                      下一章 →
                    </button>
                  )}
                </div>
                {ch.practice && <p className="muted small">{ch.practice.hint}</p>}
              </div>
            )}
          </div>
        )}

        <div className="tut-nav">
          <button className="btn" disabled={page === 0} onClick={() => setPage((x) => x - 1)}>
            ← 上一頁
          </button>
          {!quizPage && (
            <button className="btn btn-primary" onClick={() => setPage((x) => x + 1)}>
              {page === ch.pages.length - 1 ? '進入小測驗 →' : '下一頁 →'}
            </button>
          )}
        </div>
      </section>
      {detail && (
        <Modal title="卡牌詳細資訊" onClose={() => setDetail(null)} wide>
          <CardDetail def={getDef(detail)} />
        </Modal>
      )}
    </div>
  );
}
