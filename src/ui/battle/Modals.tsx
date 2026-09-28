import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Decision, GameState, TargetRef } from '../../engine/types';
import { CardFace } from '../CardView';
import { Modal } from '../common';

export function MulliganModal({ g, mulligans, onKeep, onMull }: { g: GameState; mulligans: number; onKeep: () => void; onMull: () => void }) {
  const hand = g.players[0].hand.map((id) => g.cards[id]);
  const lands = hand.filter((c) => c.def.types.includes('Land')).length;
  return (
    <Modal
      title={mulligans ? `重抽後的起手（第 ${mulligans} 次）` : '你的起手'}
      wide
      footer={
        <>
          <button className="btn" onClick={onMull} disabled={mulligans >= 5}>
            重抽
          </button>
          <button className="btn btn-primary" onClick={onKeep}>
            保留這手牌
          </button>
        </>
      }
    >
      <p className="muted">
        {g.firstPlayer === 0 ? '你先攻（第一回合不抓牌）。' : '對手先攻，你後手。'}這手牌有 {lands} 張地。
        {mulligans > 0 && `保留後需要把 ${mulligans} 張牌放到牌庫底。`}
      </p>
      <div className="card-grid">
        {hand.map((c) => (
          <CardFace key={c.id} def={c.def} size="md" />
        ))}
      </div>
    </Modal>
  );
}

export function ChooseModal({ g, d, onSubmit }: { g: GameState; d: Extract<Decision, { type: 'choose' }>; onSubmit: (ids: number[]) => void }) {
  const [sel, setSel] = useState<number[]>([]);
  const toggle = (id: number) => {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : d.max === 1 ? [id] : s.length >= d.max ? s : [...s, id]));
  };
  const ok = sel.length >= d.min && sel.length <= d.max;
  const hint =
    d.purpose === 'scryBottom'
      ? '被選的牌會放到牌庫底，其餘留在牌庫頂。'
      : d.purpose === 'surveilGy'
        ? '被選的牌會置入墳墓場，其餘留在牌庫頂。'
        : d.min === 0
          ? '也可以不選。'
          : '';
  return (
    <Modal
      title={d.prompt}
      wide
      footer={
        <>
          <span className="muted">
            已選 {sel.length}／{d.min === d.max ? d.min : `${d.min}–${d.max}`}
          </span>
          <button className="btn btn-primary" disabled={!ok} onClick={() => onSubmit(sel)}>
            確定
          </button>
        </>
      }
    >
      {hint && <p className="muted">{hint}</p>}
      <div className="card-grid">
        {d.options.map((id) => (
          <CardFace
            key={id}
            def={g.cards[id].def}
            size="md"
            className={`pickable ${sel.includes(id) ? 'picked' : ''}`}
            onClick={() => toggle(id)}
          />
        ))}
      </div>
    </Modal>
  );
}

export function YesNoModal({ g, d, onAnswer }: { g: GameState; d: Extract<Decision, { type: 'yesno' }>; onAnswer: (yes: boolean) => void }) {
  const src = d.source != null ? g.cards[d.source] : null;
  return (
    <Modal
      title="請選擇"
      footer={
        <>
          <button className="btn" onClick={() => onAnswer(false)}>
            不要
          </button>
          <button className="btn btn-primary" onClick={() => onAnswer(true)}>
            好
          </button>
        </>
      }
    >
      <div className="yesno">
        {src && <CardFace def={src.def} size="md" />}
        <p>{d.prompt}</p>
      </div>
    </Modal>
  );
}

export function PileModal({
  g,
  title,
  ids,
  selectable,
  onPick,
  onClose,
  footer,
}: {
  g: GameState;
  title: string;
  ids: number[];
  selectable?: Set<number>;
  onPick?: (id: number) => void;
  onClose?: () => void;
  footer?: ReactNode;
}) {
  return (
    <Modal title={title} wide onClose={onClose} footer={footer}>
      {ids.length === 0 ? (
        <p className="muted">沒有牌。</p>
      ) : (
        <div className="card-grid">
          {ids.map((id) => (
            <CardFace
              key={id}
              def={g.cards[id].def}
              size="md"
              className={selectable?.has(id) ? 'pickable' : selectable ? 'dim' : ''}
              onClick={selectable?.has(id) && onPick ? () => onPick(id) : undefined}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

export function GameOverModal({
  g,
  reward,
  aiDeck,
  onRematch,
  onExit,
  error,
  extra,
  rematchLabel = '再戰一場',
}: {
  g: GameState;
  reward: number | null;
  aiDeck: string;
  onRematch: () => void;
  onExit: () => void;
  error: string | null;
  extra?: ReactNode;
  rematchLabel?: string;
}) {
  const won = g.winner === 0;
  const draw = g.winner === 'draw';
  return (
    <Modal
      title={error ? '對戰中斷' : draw ? '平手' : won ? '勝利！' : '落敗'}
      footer={
        <>
          <button className="btn" onClick={onExit}>
            返回主選單
          </button>
          <button className="btn btn-primary" onClick={onRematch}>
            {rematchLabel}
          </button>
        </>
      }
    >
      <div className={`result ${won ? 'won' : 'lost'}`}>
        {error ? (
          <p>遊戲發生錯誤：{error}</p>
        ) : (
          <>
            <p>
              {g.players[1].name}使用「{aiDeck}」。共進行 {Math.max(1, Math.ceil(g.turn / 2))} 輪。
            </p>
            <p>
              你的生命 {g.players[0].life}，{g.players[1].name}生命 {g.players[1].life}。
            </p>
          </>
        )}
        {extra}
        {reward != null && (
          <p className="reward">
            獲得 <b>{reward}</b> 金幣
          </p>
        )}
      </div>
    </Modal>
  );
}

export type { TargetRef };
