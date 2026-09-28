// ============================================================
// 萬智牌規則引擎：型別定義
// 卡牌能力以宣告式資料描述（DSL），引擎負責解讀與結算。
// ============================================================

export type PID = 0 | 1;
export type Color = 'W' | 'U' | 'B' | 'R' | 'G';
export type Mana = Color | 'C';
export type CardType = 'Creature' | 'Instant' | 'Sorcery' | 'Enchantment' | 'Artifact' | 'Land';
export type Rarity = 'C' | 'U' | 'R' | 'M' | 'L' | 'T'; // L = 基本地, T = 衍生物
export type SetCode = 'FDN' | 'CORE' | 'META' | 'BAS' | 'TOK';

export type Keyword =
  | 'flying'
  | 'reach'
  | 'first_strike'
  | 'double_strike'
  | 'deathtouch'
  | 'trample'
  | 'lifelink'
  | 'vigilance'
  | 'haste'
  | 'menace'
  | 'defender'
  | 'indestructible'
  | 'hexproof'
  | 'flash'
  | 'prowess'
  | 'unblockable';

/** 篩選條件：用來描述「哪些物件」符合。ctrl 以能力控制者的視角判斷。 */
export interface Filter {
  type?: CardType | CardType[];
  nonType?: CardType | CardType[];
  ctrl?: 'you' | 'opp';
  color?: Color | Color[];
  nonColor?: Color | Color[];
  sub?: string | string[];
  nonSub?: string | string[];
  kw?: Keyword;
  nonKw?: Keyword;
  powMax?: number;
  powMin?: number;
  toughMin?: number;
  mvMax?: number;
  mvMin?: number;
  sumPTMax?: number;
  tapped?: boolean;
  attacking?: boolean;
  inCombat?: boolean;
  other?: boolean;
  token?: boolean;
  stunned?: boolean;
  hasCounters?: boolean;
  legendary?: boolean;
  basic?: boolean;
}

export type TargetKind = 'creature' | 'player' | 'opponent' | 'any' | 'permanent' | 'spell' | 'gyCard';

export interface TargetSpec {
  kind: TargetKind;
  filter?: Filter;
  /** 「至多一個目標」：可以不選 */
  optional?: boolean;
  /** 不可以選擇此能力的來源本身 */
  notSelf?: boolean;
  prompt?: string;
}

/** 效果作用對象 */
export type Ref =
  | 'T0'
  | 'T1'
  | 'T2'
  | 'self'
  | 'you'
  | 'opp'
  | 'players'
  | 'trig'
  | 'attached'
  | 'T0ctrl'
  | { all: Filter };

export type Amt =
  | number
  | { count: Filter }
  | { gy: Filter }
  | { power: Ref }
  | { ev: true }
  | { hand: true };

export interface Grant {
  p?: number;
  t?: number;
  kw?: Keyword[];
  cantAttack?: boolean;
  cantBlock?: boolean;
}

export type Cond =
  | { c: 'controls'; filter: Filter; n?: number }
  | { c: 'lifeGte'; n: number }
  | { c: 'lifeLte'; n: number }
  | { c: 'gainedLifeGte'; n: number }
  | { c: 'targetIs'; t: number; filter: Filter }
  | { c: 'instSorcCast'; n: number }
  | { c: 'oppLostLife' }
  | { c: 'yourTurn' }
  | { c: 'notYourTurn' }
  | { c: 'oppLifeGteYou' }
  | { c: 'youLifeGteOpp' }
  | { c: 'landsLte'; n: number }
  | { c: 'gyCount'; filter: Filter; n: number };

export interface ExtraCost {
  mana?: string;
  life?: number;
  discard?: number;
  sac?: Filter;
}

export type Effect =
  | { e: 'damage'; n: Amt; to: Ref; noLifeGain?: boolean }
  | { e: 'draw'; n: Amt; who?: Ref }
  | { e: 'discard'; n: Amt; who: Ref }
  | { e: 'discardChosen'; who: Ref; filter?: Filter }
  | { e: 'gain'; n: Amt; who?: Ref }
  | { e: 'lose'; n: Amt; who: Ref }
  | { e: 'destroy'; what: Ref }
  | { e: 'exile'; what: Ref }
  | { e: 'exileLinked'; what: Ref }
  | { e: 'bounce'; what: Ref }
  | { e: 'tap'; what: Ref }
  | { e: 'untap'; what: Ref }
  | { e: 'stun'; what: Ref; n?: number }
  | { e: 'pump'; what: Ref; p: Amt; t: Amt; kw?: Keyword[] }
  | { e: 'counters'; what: Ref; n: Amt }
  | { e: 'doubleCounters'; what: Ref }
  | { e: 'token'; token: string; n?: Amt; who?: Ref; tapped?: boolean; attacking?: boolean }
  | { e: 'mill'; n: Amt; who?: Ref }
  | { e: 'scry'; n: number }
  | { e: 'surveil'; n: number }
  | { e: 'dig'; n: number; take?: number; filter?: Filter; rest: 'bottom' | 'graveyard' }
  | { e: 'searchLand'; to: 'battlefield' | 'hand'; tapped?: boolean; untapIfLands?: number }
  | { e: 'counter'; what: Ref }
  | { e: 'counterUnless'; what: Ref; pay: number }
  | { e: 'fight'; a: Ref; b: Ref }
  | { e: 'bite'; a: Ref; b: Ref }
  | { e: 'toHand'; what: Ref }
  | { e: 'reanimate'; what: Ref }
  | { e: 'edict'; who: Ref; filter?: Filter }
  | { e: 'sac'; what: Ref }
  | { e: 'impulse'; n: number }
  | { e: 'role'; what: Ref; token: string }
  | { e: 'attach'; what: Ref }
  | { e: 'if'; cond: Cond; then: Effect[]; else?: Effect[] }
  | { e: 'may'; prompt: string; effects: Effect[] }
  | { e: 'costThen'; prompt: string; cost: ExtraCost; then: Effect[] }
  | { e: 'shuffleIn'; what: Ref }
  | { e: 'exileGy'; what: Ref }
  | { e: 'landFromHand' }
  | { e: 'cantGainLife'; who: Ref };

export type TriggerOn =
  | 'etb'
  | 'dies'
  | 'attacks'
  | 'blocks'
  | 'upkeep'
  | 'endStep'
  | 'combatStart'
  | 'castNoncreature'
  | 'castInstSorc'
  | 'castAny'
  | 'allyEtb'
  | 'anyEtb'
  | 'allyDies'
  | 'landfall'
  | 'lifegain'
  | 'combatDamagePlayer'
  | 'allyCombatDamagePlayer'
  | 'dealtDamage'
  | 'targeted'
  | 'youAttack'
  | 'oppLifeLoss'
  | 'sacrifice';

export interface TriggeredAbility {
  kind: 'trigger';
  on: TriggerOn;
  /** 觸發物件需要符合的條件（例如 allyEtb 的進場生物、castAny 的咒語） */
  filter?: Filter;
  /** allyDies 是否包含自己 */
  includeSelf?: boolean;
  /** targeted：只計算咒語（不含異能） */
  spellOnly?: boolean;
  /** 介入條件（觸發時與結算時都要成立） */
  cond?: Cond;
  targets?: TargetSpec[];
  effects: Effect[];
  /** 「你可以」：結算時詢問 */
  may?: string;
  oncePerTurn?: boolean;
}

export interface ActivatedAbility {
  kind: 'activated';
  cost: { mana?: string; tap?: boolean; sacSelf?: boolean; sacOther?: Filter; life?: number };
  targets?: TargetSpec[];
  effects: Effect[];
  sorcery?: boolean;
  oncePerTurn?: boolean;
  cond?: Cond;
  /** 按鈕上顯示的簡短描述 */
  label: string;
}

export interface StaticAbility {
  kind: 'static';
  anthem?: { filter: Filter; grant: Grant };
  self?: { cond?: Cond; grant: Grant };
  /** 你施放符合條件的咒語時少付 {n} */
  spellCostLess?: { filter: Filter; n: number };
  /** 你獲得生命時額外多獲得 n 點 */
  lifegainPlus?: number;
}

export type Ability = TriggeredAbility | ActivatedAbility | StaticAbility;

export interface Mode {
  text: string;
  /** 取代原本費用（用於增幅等） */
  cost?: string;
  targets?: TargetSpec[];
  effects: Effect[];
}

export interface SpellSpec {
  targets?: TargetSpec[];
  effects?: Effect[];
  modes?: Mode[];
}

export interface CardDef {
  id: string;
  name: string;
  set: SetCode;
  rarity: Rarity;
  cost?: string;
  colors?: Color[];
  types: CardType[];
  supertypes?: ('Basic' | 'Legendary')[];
  subtypes?: string[];
  power?: number;
  toughness?: number;
  keywords?: Keyword[];
  /** {T}：加一點列出的任一種法術力 */
  produces?: Mana[];
  etbTapped?: boolean;
  etbTappedUnless?: Cond;
  etbCounters?: number;
  ward?: number;
  /** 不能被力量小於等於 n 的生物阻擋 */
  evadePowLte?: number;
  spell?: SpellSpec;
  aura?: { target?: TargetSpec; grant: Grant };
  equip?: { cost: string; grant: Grant };
  abilities?: Ability[];
  /** 額外費用（例如：犧牲一個生物、支付生命） */
  addCost?: ExtraCost;
  /** 此咒語的費用減免 */
  costReduce?: { perGy?: Filter; cond?: Cond; mana?: string };
  /** 起手時可直接放進戰場 */
  leyline?: boolean;
  /** 中文規則敘述 */
  text: string;
  /** 衍生物不會出現在補充包 */
  token?: boolean;
  /** 查詢 Scryfall 卡圖用的名稱（預設同 name） */
  imageName?: string;
  /** 中文名稱（若有） */
  zh?: string;
}

export type Zone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'stack';

export interface Card {
  id: number;
  def: CardDef;
  owner: PID;
  controller: PID;
  zone: Zone;
  tapped: boolean;
  sick: boolean;
  damage: number;
  dtDamage: boolean;
  counters: number;
  stun: number;
  attachedTo: number | null;
  token: boolean;
  attacking: boolean;
  blocking: number | null;
  blockedBy: number[];
  wasBlocked: boolean;
  enteredTurn: number;
  /** 暫時可以從放逐區使用（值為回合數） */
  playableTurn?: number;
  playableBy?: PID;
  /** 被哪個永久物放逐（直到其離場） */
  exiledBy?: number;
  /** 本回合已觸發/起動過的能力索引 */
  usedThisTurn: number[];
  /** 最近一次在戰場上的狀態（用於死去時的最後已知資訊） */
  lastPower?: number;
}

export interface Player {
  id: PID;
  name: string;
  deckName: string;
  life: number;
  library: number[];
  hand: number[];
  graveyard: number[];
  exile: number[];
  landsPlayed: number;
  spellsThisTurn: number;
  instSorcThisTurn: number;
  lifeGainedThisTurn: number;
  lifeLostThisTurn: number;
  drewFromEmpty: boolean;
  lost: boolean;
  cantGainLife: boolean;
  mulligans: number;
  isAI: boolean;
}

export type TargetRef = { p: PID } | { c: number };

export interface StackItem {
  sid: number;
  kind: 'spell' | 'trigger' | 'activated';
  controller: PID;
  /** spell：卡牌本身；ability：來源 */
  cardId: number;
  targets: (TargetRef | null)[];
  targetSpecs: TargetSpec[];
  effects: Effect[];
  text: string;
  modeIndex?: number;
  may?: string;
  cond?: Cond;
  ev?: GameEvent;
  lkiPower?: number;
}

export interface EotEffect {
  card: number;
  p: number;
  t: number;
  kw: Keyword[];
}

export type Phase =
  | 'setup'
  | 'untap'
  | 'upkeep'
  | 'draw'
  | 'main1'
  | 'combat_begin'
  | 'combat_attackers'
  | 'combat_blockers'
  | 'combat_damage_first'
  | 'combat_damage'
  | 'combat_end'
  | 'main2'
  | 'end'
  | 'cleanup';

export type GameEvent =
  | { type: 'etb'; card: number; controller: PID }
  | { type: 'dies'; card: number; controller: PID; power: number }
  | { type: 'attacks'; card: number }
  | { type: 'youAttack'; player: PID; attackers: number[] }
  | { type: 'blocks'; card: number }
  | { type: 'step'; step: 'upkeep' | 'endStep' | 'combatStart'; player: PID }
  | { type: 'cast'; card: number; player: PID; opponentTurn: boolean }
  | { type: 'lifegain'; player: PID; amount: number }
  | { type: 'lifeloss'; player: PID; amount: number }
  | { type: 'combatDamage'; source: number; player: PID; amount: number }
  | { type: 'damaged'; card: number; amount: number }
  | { type: 'targeted'; card: number; by: PID; spell: boolean }
  | { type: 'sacrifice'; card: number; player: PID };

export interface PendingTrigger {
  source: number;
  controller: PID;
  ability: TriggeredAbility;
  abilityIndex: number;
  ev: GameEvent;
  lkiPower?: number;
}

export interface LogEntry {
  turn: number;
  player?: PID;
  text: string;
  kind?: 'info' | 'cast' | 'combat' | 'damage' | 'life' | 'turn' | 'result';
}

export interface GameState {
  cards: Record<number, Card>;
  nextId: number;
  nextSid: number;
  players: [Player, Player];
  battlefield: number[];
  stack: StackItem[];
  turn: number;
  active: PID;
  firstPlayer: PID;
  phase: Phase;
  priority: PID | null;
  eot: EotEffect[];
  pending: PendingTrigger[];
  log: LogEntry[];
  winner: PID | 'draw' | null;
  rngState: number;
  /** 是否為 AI 模擬用的複本（不寫日誌） */
  sim: boolean;
  version: number;
  /** 本回合是否已經有生物宣告攻擊 */
  attackedThisTurn: boolean;
  maxTurns: number;
}

// ------------------------------------------------------------
// 決策：引擎向玩家（人類或 AI）詢問
// ------------------------------------------------------------

export type Decision =
  | { type: 'priority'; player: PID }
  | { type: 'mulligan'; player: PID; mulligans: number }
  | { type: 'attackers'; player: PID }
  | { type: 'blockers'; player: PID }
  | { type: 'targets'; player: PID; source: number; specs: TargetSpec[]; text: string; effects: Effect[] }
  | {
      type: 'choose';
      player: PID;
      prompt: string;
      options: number[];
      min: number;
      max: number;
      purpose: ChoosePurpose;
      /** 由 options 以外的區域展示（例如牌庫頂的牌） */
      reveal?: boolean;
    }
  | { type: 'yesno'; player: PID; prompt: string; source?: number; purpose?: 'may' | 'pay' | 'leyline' };

export type ChoosePurpose =
  | 'bottom'
  | 'discard'
  | 'sacrifice'
  | 'scryBottom'
  | 'surveilGy'
  | 'dig'
  | 'search'
  | 'opponentDiscard'
  | 'landFromHand';

export type PriorityAction =
  | { type: 'pass' }
  | { type: 'play'; card: number }
  | { type: 'cast'; card: number; targets: (TargetRef | null)[]; mode?: number; sac?: number; discard?: number }
  | { type: 'activate'; card: number; ability: number; targets: (TargetRef | null)[]; sac?: number };

export type Response =
  | PriorityAction
  | { type: 'keep'; keep: boolean }
  | { type: 'attackers'; ids: number[] }
  | { type: 'blockers'; blocks: [number, number][] }
  | { type: 'targets'; targets: (TargetRef | null)[] }
  | { type: 'choose'; ids: number[] }
  | { type: 'yesno'; yes: boolean };

export type Flow = Generator<Decision, void, Response>;
export type SubFlow<T = void> = Generator<Decision, T, Response>;
