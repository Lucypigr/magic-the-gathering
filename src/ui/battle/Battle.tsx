import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Level } from '../../ai/combatAI';
import { expandDeck, type DeckList } from '../../data';
import {
  activatedAbilities,
  castOptionsFor,
  playOptions,
  sacChoices,
  spellCost,
  type PlayOption,
} from '../../engine/actions';
import { attackCandidates, blockCandidates, canBlock } from '../../engine/combat';
import { MatchController } from '../../engine/controller';
import { costToString } from '../../engine/mana';
import { cardName, isCreature, stats } from '../../engine/state';
import { legalTargets, sameTarget } from '../../engine/targets';
import type { Filter, PID, PriorityAction, TargetRef, TargetSpec } from '../../engine/types';
import type { SavedDeck, Settings } from '../../meta/profile';
import { CardDetail, CardFace } from '../CardView';
import { LEVEL_ZH, PHASE_ZH } from '../i18n';
import { ManaCost } from '../Mana';
import { PhaseTrack, PlayerField, PlayerInfo, StackView, type Marks } from './Board';
import { ChooseModal, GameOverModal, MulliganModal, PileModal, YesNoModal } from './Modals';

export interface BattleResult {
  won: boolean;
  draw: boolean;
  conceded: boolean;
}

interface Props {
  playerDeck: SavedDeck;
  aiDeck: DeckList;
  level: Level;
  settings: Settings;
  reward: number | null;
  onEnd: (r: BattleResult) => void;
  onExit: () => void;
  onRematch: () => void;
  onSettings: (s: Settings) => void;
}

interface Draft {
  kind: 'cast' | 'activate' | 'trigger';
  source: number;
  ability?: number;
  mode?: number;
  specs: TargetSpec[];
  targets: (TargetRef | null)[];
  sacFilter?: Filter;
  sac?: number;
  stage: 'targets' | 'sac';
  label: string;
}

const SPEED_MS = { slow: 1100, normal: 650, fast: 250 } as const;

function specPrompt(spec: TargetSpec): string {
  if (spec.prompt) return spec.prompt;
  switch (spec.kind) {
    case 'any':
      return '選擇任意一個目標（生物或玩家）';
    case 'creature':
      return spec.filter?.ctrl === 'you' ? '選擇你的生物' : spec.filter?.ctrl === 'opp' ? '選擇對手的生物' : '選擇一個生物';
    case 'player':
      return '選擇一位玩家';
    case 'opponent':
      return '選擇對手';
    case 'permanent':
      return '選擇一個永久物';
    case 'spell':
      return '選擇堆疊上的咒語';
    case 'gyCard':
      return '選擇墳墓場中的牌';
  }
}

export function Battle(props: Props) {
  const { playerDeck, aiDeck, level, settings } = props;
  const [ctl, setCtl] = useState<MatchController | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [attackSel, setAttackSel] = useState<Set<number>>(new Set());
  const [blocks, setBlocks] = useState<Map<number, number>>(new Map());
  const [blockSel, setBlockSel] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pile, setPile] = useState<PID | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [confirmConcede, setConfirmConcede] = useState(false);
  const [seq, setSeq] = useState(0);
  const ended = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = new MatchController({
      human: { name: '你', deckName: playerDeck.name, deck: expandDeck(playerDeck), isAI: false },
      ai: { name: '對手', deckName: aiDeck.name, deck: expandDeck(aiDeck), isAI: true },
      level,
      aiStyle: aiDeck.style,
      aiDelay: SPEED_MS[settings.aiSpeed],
    });
    c.stopMode = settings.stopMode;
    const un = c.subscribe(force);
    setCtl(c);
    c.start();
    return () => {
      un();
      c.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ctl) return;
    ctl.aiDelay = SPEED_MS[settings.aiSpeed];
    ctl.stopMode = settings.stopMode;
  }, [ctl, settings.aiSpeed, settings.stopMode]);

  const g = ctl?.g ?? null;
  const d = ctl?.decision ?? null;

  // 決策改變時重設選擇狀態
  const lastDecision = useRef<unknown>(null);
  useEffect(() => {
    if (d === lastDecision.current) return;
    lastDecision.current = d;
    setAttackSel(new Set());
    setBlocks(new Map());
    setBlockSel(null);
    setSeq((n) => n + 1);
    if (d?.type === 'targets') {
      const dr: Draft = { kind: 'trigger', source: d.source, specs: d.specs, targets: [], stage: 'targets', label: '觸發式能力' };
      const filled = autoFill(dr);
      if (isComplete(filled)) {
        setDraft(null);
        ctl?.submit({ type: 'targets', targets: filled.targets });
      } else setDraft(filled);
    } else setDraft(null);
  });

  useEffect(() => {
    if (!ctl || !ctl.finished || ended.current) return;
    ended.current = true;
    props.onEnd({ won: ctl.g.winner === 0, draw: ctl.g.winner === 'draw', conceded: false });
  });

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [g?.log.length, showLog]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const myPriority = d?.type === 'priority' && d.player === 0;

  const options = useMemo(() => (g && myPriority ? playOptions(g, 0) : []), [g, myPriority, g?.version]);
  const playable = useMemo(() => new Set(options.map((o) => o.card)), [options]);

  // ---------- 目標選擇 ----------
  function legalNow(dr: Draft | null): TargetRef[] {
    if (!g || !dr || dr.stage !== 'targets') return [];
    const spec = dr.specs[dr.targets.length];
    if (!spec) return [];
    return legalTargets(g, spec, 0, dr.source).filter((t) => !dr.targets.some((x) => sameTarget(x, t)));
  }

  function sacNow(dr: Draft | null): number[] {
    if (!g || !dr || dr.stage !== 'sac' || !dr.sacFilter) return [];
    return sacChoices(g, 0, dr.sacFilter, dr.kind === 'activate' ? dr.source : undefined);
  }

  function autoFill(dr: Draft): Draft {
    let cur = dr;
    while (cur.stage === 'targets' && cur.targets.length < cur.specs.length) {
      const spec = cur.specs[cur.targets.length];
      const legal = g ? legalTargets(g, spec, 0, cur.source).filter((t) => !cur.targets.some((x) => sameTarget(x, t))) : [];
      if (spec.kind === 'opponent' && legal.length === 1) cur = { ...cur, targets: [...cur.targets, legal[0]] };
      else if (spec.optional && legal.length === 0) cur = { ...cur, targets: [...cur.targets, null] };
      else break;
    }
    if (cur.stage === 'targets' && cur.targets.length >= cur.specs.length && cur.sacFilter && cur.sac == null) cur = { ...cur, stage: 'sac' };
    return cur;
  }

  function isComplete(dr: Draft): boolean {
    return dr.targets.length >= dr.specs.length && (!dr.sacFilter || dr.sac != null);
  }

  function proceed(dr: Draft) {
    const next = autoFill(dr);
    if (isComplete(next)) finish(next);
    else setDraft(next);
  }

  function finish(dr: Draft) {
    if (!ctl) return;
    if (dr.kind === 'trigger') {
      ctl.submit({ type: 'targets', targets: dr.targets });
      setDraft(null);
      return;
    }
    const a: PriorityAction =
      dr.kind === 'cast'
        ? { type: 'cast', card: dr.source, targets: dr.targets, mode: dr.mode, sac: dr.sac }
        : { type: 'activate', card: dr.source, ability: dr.ability!, targets: dr.targets, sac: dr.sac };
    submitAction(a);
  }

  function submitAction(a: PriorityAction) {
    if (!ctl) return;
    const err = ctl.validate(a);
    setDraft(null);
    if (err) {
      setToast(err);
      return;
    }
    setFocus(null);
    ctl.submit(a);
  }

  function startOption(o: PlayOption) {
    if (o.kind === 'play') {
      submitAction({ type: 'play', card: o.card });
      return;
    }
    setFocus(null);
    const dr: Draft = {
      kind: o.kind,
      source: o.card,
      ability: o.ability,
      mode: o.mode,
      specs: o.specs,
      targets: [],
      sacFilter: o.sacFilter,
      stage: 'targets',
      label: o.label,
    };
    proceed(dr);
  }

  function chooseTarget(t: TargetRef | null) {
    if (!draft) return;
    proceed({ ...draft, targets: [...draft.targets, t] });
  }

  // ---------- 點擊 ----------
  const legal = legalNow(draft);
  const legalCards = new Set(legal.filter((t): t is { c: number } => 'c' in t).map((t) => t.c));
  const legalPlayers = new Set(legal.filter((t): t is { p: PID } => 'p' in t).map((t) => t.p));
  const sacs = new Set(sacNow(draft));
  const attackable = useMemo(() => new Set(g && d?.type === 'attackers' ? attackCandidates(g, 0).map((c) => c.id) : []), [g, d]);
  const myBlockers = useMemo(() => new Set(g && d?.type === 'blockers' ? blockCandidates(g, 0).map((c) => c.id) : []), [g, d]);

  function onCard(id: number) {
    if (!g) return;
    if (draft?.stage === 'targets' && legalCards.has(id)) {
      chooseTarget({ c: id });
      return;
    }
    if (draft?.stage === 'sac' && sacs.has(id)) {
      finish({ ...draft, sac: id });
      return;
    }
    if (!draft && d?.type === 'attackers' && attackable.has(id)) {
      setAttackSel((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
      return;
    }
    if (!draft && d?.type === 'blockers') {
      const c = g.cards[id];
      if (myBlockers.has(id)) {
        if (blocks.has(id)) {
          const n = new Map(blocks);
          n.delete(id);
          setBlocks(n);
          setBlockSel(null);
        } else setBlockSel(blockSel === id ? null : id);
        return;
      }
      if (c.attacking && blockSel != null) {
        if (canBlock(g, g.cards[blockSel], c)) {
          const n = new Map(blocks);
          n.set(blockSel, id);
          setBlocks(n);
          setBlockSel(null);
        } else setToast(`${cardName(g.cards[blockSel])} 不能阻擋 ${cardName(c)}`);
        return;
      }
    }
    setFocus(id);
  }

  function onPlayer(pid: PID) {
    if (draft?.stage === 'targets' && legalPlayers.has(pid)) chooseTarget({ p: pid });
  }

  function quickCast(id: number) {
    if (!g || !myPriority || draft) return;
    const c = g.cards[id];
    const opts = castOptionsFor(g, 0, c);
    if (opts.length) startOption(opts[0]);
  }

  if (!ctl || !g) return <div className="battle loading">準備對戰中…</div>;

  // ---------- 標記 ----------
  const marks: Marks = {
    selectable: new Set<number>(),
    selected: new Set<number>(),
    labels: new Map(),
    focus,
    playable: myPriority && !draft ? playable : new Set(),
  };
  if (draft?.stage === 'targets') legalCards.forEach((id) => marks.selectable.add(id));
  if (draft?.stage === 'sac') sacs.forEach((id) => marks.selectable.add(id));
  if (draft) draft.targets.forEach((t) => t && 'c' in t && marks.selected.add(t.c));
  if (!draft && d?.type === 'attackers') {
    attackable.forEach((id) => marks.selectable.add(id));
    attackSel.forEach((id) => marks.selected.add(id));
  }
  if (!draft && d?.type === 'blockers') {
    myBlockers.forEach((id) => marks.selectable.add(id));
    if (blockSel != null) {
      marks.selected.add(blockSel);
      for (const id of g.battlefield) {
        const c = g.cards[id];
        if (c.attacking && canBlock(g, g.cards[blockSel], c)) marks.selectable.add(id);
      }
    }
    blocks.forEach((a, b) => {
      marks.selected.add(b);
      marks.labels.set(b, `擋 ${cardName(g.cards[a])}`);
    });
  }

  // ---------- 提示與按鈕 ----------
  const top = g.stack[g.stack.length - 1];
  let prompt = '';
  const buttons: { label: string; onClick: () => void; primary?: boolean; danger?: boolean }[] = [];
  if (ctl.finished) prompt = '對戰結束';
  else if (draft?.stage === 'targets') {
    const spec = draft.specs[draft.targets.length];
    prompt = `${cardName(g.cards[draft.source])}：${specPrompt(spec)}${draft.specs.length > 1 ? `（${draft.targets.length + 1}/${draft.specs.length}）` : ''}`;
    if (spec.optional) buttons.push({ label: '不選這個目標', onClick: () => chooseTarget(null) });
    if (draft.kind !== 'trigger') buttons.push({ label: '取消', onClick: () => setDraft(null) });
    else if (legal.length === 0) buttons.push({ label: '繼續', onClick: () => chooseTarget(null) });
  } else if (draft?.stage === 'sac') {
    prompt = `${cardName(g.cards[draft.source])}：選擇要犧牲的永久物`;
    buttons.push({ label: '取消', onClick: () => setDraft(null) });
  } else if (!d) {
    prompt = ctl.aiThinking ? '對手行動中…' : '…';
  } else if (d.type === 'priority') {
    const opp = top && top.controller === 1;
    if (opp) {
      prompt = `對手的「${cardName(g.cards[top.cardId])}」在堆疊上，要回應嗎？`;
      buttons.push({ label: '不回應', onClick: () => ctl.submit({ type: 'pass' }), primary: true });
    } else if (g.active === 0) {
      if (g.phase === 'main1') {
        prompt = '你的主要階段：打出地、施放咒語。點選手牌查看可用動作，雙擊可直接使用。';
        const canAtk = attackCandidates(g, 0).length > 0;
        buttons.push({ label: canAtk ? '進入戰鬥' : '下一步', onClick: () => ctl.submit({ type: 'pass' }), primary: true });
        buttons.push({ label: '結束回合', onClick: () => ctl.endTurn() });
      } else if (g.phase === 'main2') {
        prompt = '第二主要階段：還可以打出地或施放咒語。';
        buttons.push({ label: '結束回合', onClick: () => ctl.submit({ type: 'pass' }), primary: true });
      } else {
        prompt = `${PHASE_ZH[g.phase]}：可以施放瞬間或起動異能。`;
        buttons.push({ label: '繼續', onClick: () => ctl.submit({ type: 'pass' }), primary: true });
      }
    } else {
      prompt = `對手的${PHASE_ZH[g.phase]}：可以施放瞬間、閃現生物或起動異能。`;
      buttons.push({ label: '繼續', onClick: () => ctl.submit({ type: 'pass' }), primary: true });
    }
  } else if (d.type === 'attackers') {
    prompt = '宣告攻擊：點選要攻擊的生物。';
    buttons.push({ label: `攻擊（${attackSel.size}）`, onClick: () => ctl.submit({ type: 'attackers', ids: [...attackSel] }), primary: attackSel.size > 0 });
    buttons.push({ label: '全部攻擊', onClick: () => setAttackSel(new Set(attackable)) });
    buttons.push({ label: '不攻擊', onClick: () => ctl.submit({ type: 'attackers', ids: [] }), primary: attackSel.size === 0 });
  } else if (d.type === 'blockers') {
    const incoming = g.battlefield.map((id) => g.cards[id]).filter((c) => c.attacking);
    const dmg = incoming.filter((a) => ![...blocks.values()].includes(a.id)).reduce((s, a) => s + Math.max(0, stats(g, a).p), 0);
    prompt = blockSel != null ? `選擇 ${cardName(g.cards[blockSel])} 要阻擋的攻擊生物` : `宣告阻擋：先點你的生物，再點攻擊生物。未阻擋的傷害約 ${dmg} 點。`;
    buttons.push({ label: `確認阻擋（${blocks.size}）`, onClick: () => ctl.submit({ type: 'blockers', blocks: [...blocks.entries()] }), primary: true });
    buttons.push({ label: '不阻擋', onClick: () => ctl.submit({ type: 'blockers', blocks: [] }) });
  } else if (d.type === 'mulligan') prompt = '決定是否保留起手。';
  else if (d.type === 'choose' || d.type === 'yesno') prompt = '請做出選擇。';

  // ---------- 檢視器 ----------
  const inspectId = draft ? (focus ?? draft.source) : (focus ?? hover);
  const inspected = inspectId != null ? g.cards[inspectId] : null;
  let actions: PlayOption[] = [];
  if (inspected && myPriority && !draft && focus === inspectId) {
    if (inspected.zone === 'hand' || inspected.zone === 'exile') actions = castOptionsFor(g, 0, inspected);
    else if (inspected.zone === 'battlefield') actions = options.filter((o) => o.card === inspected.id && o.kind === 'activate');
  }

  const hand = g.players[0].hand.map((id) => g.cards[id]);
  const exiled = g.players[0].exile.map((id) => g.cards[id]).filter((c) => c.playableTurn === g.turn && c.playableBy === 0);
  const gySpec = draft?.stage === 'targets' && draft.specs[draft.targets.length]?.kind === 'gyCard';

  return (
    <div className="battle">
      <header className="battle-top">
        <div className="bt-left">
          <span className="bt-level">難度：{LEVEL_ZH[level]}</span>
          <span className="bt-vs">對手套牌：{aiDeck.name}</span>
        </div>
        <div className="bt-right">
          <label className="mini-select">
            AI 速度
            <select
              id="ai-speed"
              value={settings.aiSpeed}
              onChange={(e) => props.onSettings({ ...settings, aiSpeed: e.target.value as Settings['aiSpeed'] })}
            >
              <option value="slow">慢</option>
              <option value="normal">中</option>
              <option value="fast">快</option>
            </select>
          </label>
          <label className="mini-select" title="智慧：只在可能需要你操作時停下；全部：每次有可用動作都停下">
            停頓
            <select
              id="stop-mode"
              value={settings.stopMode}
              onChange={(e) => props.onSettings({ ...settings, stopMode: e.target.value as Settings['stopMode'] })}
            >
              <option value="smart">智慧</option>
              <option value="all">全部</option>
            </select>
          </label>
          <button className="btn btn-small" onClick={() => setShowLog((s) => !s)}>
            紀錄
          </button>
          {!ctl.finished &&
            (confirmConcede ? (
              <button
                className="btn btn-small btn-danger"
                onClick={() => {
                  ctl.concede();
                  if (!ended.current) {
                    ended.current = true;
                    props.onEnd({ won: false, draw: false, conceded: true });
                  }
                }}
              >
                確定投降
              </button>
            ) : (
              <button className="btn btn-small" onClick={() => setConfirmConcede(true)} onBlur={() => setConfirmConcede(false)}>
                投降
              </button>
            ))}
        </div>
      </header>

      <div className="battle-body">
        <main className="table">
          <PlayerInfo g={g} pid={1} selectable={legalPlayers.has(1)} onPlayer={() => onPlayer(1)} onGraveyard={() => setPile(1)} />
          <PlayerField g={g} pid={1} marks={marks} onCard={onCard} onHover={setHover} />
          <div className="midline">
            <PhaseTrack g={g} />
            <StackView g={g} marks={marks} onCard={onCard} onHover={setHover} />
            <div className={`prompt-bar ${d && d.player === 0 ? 'your-move' : ''}`}>
              <p className="prompt-text">{prompt}</p>
              <div className="prompt-buttons">
                {buttons.map((b) => (
                  <button key={b.label} className={`btn ${b.primary ? 'btn-primary' : ''}`} onClick={b.onClick}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <PlayerField g={g} pid={0} marks={marks} onCard={onCard} onHover={setHover} />
          <PlayerInfo g={g} pid={0} selectable={legalPlayers.has(0)} onPlayer={() => onPlayer(0)} onGraveyard={() => setPile(0)} />
          <div className="hand" aria-label="你的手牌">
            {hand.map((c) => (
              <CardFace
                key={c.id}
                def={c.def}
                size="md"
                className={`hand-card ${marks.playable.has(c.id) ? 'playable' : ''} ${focus === c.id ? 'focused' : ''} ${marks.selectable.has(c.id) ? 'selectable' : ''}`}
                onClick={() => onCard(c.id)}
                onDoubleClick={() => quickCast(c.id)}
                onMouseEnter={() => setHover(c.id)}
              />
            ))}
            {exiled.map((c) => (
              <CardFace
                key={c.id}
                def={c.def}
                size="md"
                className={`hand-card exiled ${marks.playable.has(c.id) ? 'playable' : ''} ${focus === c.id ? 'focused' : ''}`}
                onClick={() => onCard(c.id)}
                onDoubleClick={() => quickCast(c.id)}
                onMouseEnter={() => setHover(c.id)}
              >
                <span className="exile-tag">放逐區・本回合可用</span>
              </CardFace>
            ))}
            {hand.length === 0 && exiled.length === 0 && <div className="row-empty">手上沒有牌</div>}
          </div>
        </main>

        <aside className="side">
          <div className={`inspector ${inspected ? '' : 'empty'} ${focus != null ? 'pinned' : ''}`}>
          {inspected ? (
            <>
              <button className="icon-btn inspector-close" onClick={() => setFocus(null)} aria-label="關閉">
                ✕
              </button>
              <CardDetail
                def={inspected.def}
                extra={
                  <>
                    {inspected.zone === 'battlefield' && isCreature(inspected) && (
                      <div className="live-stats">
                        目前 {stats(g, inspected).p}/{stats(g, inspected).t}
                        {inspected.damage > 0 && `，受到 ${inspected.damage} 點傷害`}
                        {inspected.tapped && '，已橫置'}
                        {inspected.controller === 1 ? '（對手操控）' : ''}
                      </div>
                    )}
                    {actions.length > 0 && (
                      <div className="actions">
                        {actions.map((o, i) => (
                          <button key={i} className="btn btn-primary btn-block" onClick={() => startOption(o)}>
                            {o.kind === 'play' ? '打出這張地' : o.kind === 'activate' ? `起動：${o.label}` : inspected.def.spell?.modes ? o.label : '施放'}
                            {o.kind === 'cast' && <ManaCost cost={costToString(spellCost(g, inspected, 0, o.mode))} size={15} />}
                            {o.kind === 'activate' && activatedAbilities(inspected.def)[o.ability!].cost.mana && (
                              <ManaCost cost={activatedAbilities(inspected.def)[o.ability!].cost.mana} size={15} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {focus === inspectId && myPriority && !draft && actions.length === 0 && (inspected.zone === 'hand' || inspected.controller === 0) && (
                      <p className="muted small">現在無法使用這張牌（時機、法術力或目標不符）。</p>
                    )}
                  </>
                }
              />
            </>
          ) : (
            <div className="inspector-hint">
              <p>將滑鼠移到卡牌上可以查看詳細內容；點一下卡牌會顯示可以進行的動作。</p>
            </div>
          )}
          </div>
          <div className={`log ${showLog ? 'open' : ''}`} ref={logRef}>
            {g.log.slice(-120).map((l, i) => (
              <div key={i} className={`log-line k-${l.kind ?? 'info'} ${l.player === 0 ? 'p-me' : l.player === 1 ? 'p-opp' : ''}`}>
                {l.text}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}

      {d?.type === 'mulligan' && d.player === 0 && (
        <MulliganModal g={g} mulligans={d.mulligans} onKeep={() => ctl.submit({ type: 'keep', keep: true })} onMull={() => ctl.submit({ type: 'keep', keep: false })} />
      )}
      {d?.type === 'choose' && d.player === 0 && <ChooseModal key={seq} g={g} d={d} onSubmit={(ids) => ctl.submit({ type: 'choose', ids })} />}
      {d?.type === 'yesno' && d.player === 0 && <YesNoModal g={g} d={d} onAnswer={(yes) => ctl.submit({ type: 'yesno', yes })} />}
      {gySpec && draft && (
        <PileModal
          g={g}
          title={specPrompt(draft.specs[draft.targets.length])}
          ids={[...g.players[0].graveyard, ...g.players[1].graveyard]}
          selectable={legalCards}
          onPick={(id) => chooseTarget({ c: id })}
          footer={
            <>
              {draft.specs[draft.targets.length].optional && (
                <button className="btn" onClick={() => chooseTarget(null)}>
                  不選
                </button>
              )}
              {draft.kind !== 'trigger' && (
                <button className="btn" onClick={() => setDraft(null)}>
                  取消
                </button>
              )}
            </>
          }
        />
      )}
      {pile != null && !gySpec && (
        <PileModal g={g} title={`${g.players[pile].name}的墳墓場`} ids={[...g.players[pile].graveyard].reverse()} onClose={() => setPile(null)} />
      )}
      {ctl.finished && (
        <GameOverModal g={g} reward={props.reward} aiDeck={aiDeck.name} onRematch={props.onRematch} onExit={props.onExit} error={ctl.error} />
      )}
    </div>
  );
}
