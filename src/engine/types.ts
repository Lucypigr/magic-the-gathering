// ============================================================
// 萬智牌規則引擎：型別定義
// 卡牌能力以宣告式資料描述（DSL），引擎負責解讀與結算。
// ============================================================

export type PID = 0 | 1;
export type Color = 'W' | 'U' | 'B' | 'R' | 'G';
export type Mana = Color | 'C';
export type CardType = 'Creature' | 'Instant' | 'Sorcery' | 'Enchantment' | 'Artifact' | 'Land';
export type Rarity = 'C' | 'U' | 'R' | 'M' | 'L' | 'T'; // L = 基本地, T = 衍生物
/** 標準賽系列（依發售順序） */
export const STANDARD_SETS = [
  'WOE',
  'LCI',
  'MKM',
  'OTJ',
  'BLB',
  'DSK',
  'FDN',
  'DFT',
  'TDM',
  'FIN',
  'EOE',
  'SPM',
  'TLA',
  'ECL',
  'TMT',
  'SOS',
  'MSH',
  'HOB',
] as const;
export type StandardSet = (typeof STANDARD_SETS)[number];
export type SetCode = StandardSet | 'CORE' | 'META' | 'BAS' | 'TOK';

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
  /** 符合其中任一條件即可 */
  or?: Filter[];
  /** 佩帶著武具 */
  equipped?: boolean;
  /** 本回合受到過傷害 */
  damaged?: boolean;
  /** 沒有任何異能（白板生物） */
  vanilla?: boolean;
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
  /** 觸發事件中的玩家（例如施放咒語的玩家） */
  | 'evPlayer'
  /** 此效果中最近派出的衍生物 */
  | 'created'
  | { all: Filter };

export type Amt =
  | number
  | { count: Filter }
  | { gy: Filter }
  | { power: Ref }
  | { ev: true }
  | { hand: true }
  /** 由你操控的永久物中的顏色數量（繽紛） */
  | { colors: true }
  /** 來源上的指示物數量 */
  | { selfCounters: true }
  /** 你本回合施放過的咒語數量 */
  | { spellsCast: true };

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
  | { c: 'gyCount'; filter: Filter; n: number }
  /** 你本回合已施放 n 個或更多咒語 */
  | { c: 'spellsCast'; n: number }
  /** 你剛施放了本回合的第二個咒語 */
  | { c: 'secondSpell' }
  /** 有玩家的生命為 n 點或更少 */
  | { c: 'anyLifeLte'; n: number }
  /** 此永久物已橫置 */
  | { c: 'selfTapped' }
  /** 你本回合已抓了 n 張或更多牌 */
  | { c: 'drawsGte'; n: number }
  /** 你本回合攻擊過 */
  | { c: 'attacked' };

export interface ExtraCost {
  mana?: string;
  life?: number;
  discard?: number;
  sac?: Filter;
  /** 枯萎 n：在一個由你操控的生物上放置 n 個 -1/-1 指示物 */
  blight?: number;
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
  | { e: 'token'; token: string; n?: Amt; who?: Ref; tapped?: boolean; attacking?: boolean; attachTo?: Ref }
  /** 集結鬼怪 n：在你的軍隊上放置 n 個 +1/+1 指示物（沒有軍隊就先派出 0/0 鬼怪軍隊） */
  | { e: 'amass'; n: number }
  /** 密謀：抓一張牌，然後棄一張牌；若棄掉的不是地，在該生物上放置一個 +1/+1 指示物 */
  | { e: 'connive'; what: Ref }
  /** 將永久物置於其擁有者的牌庫底 */
  | { e: 'tuck'; what: Ref }
  /** 展示牌庫頂的牌並置於手上，你失去等同於其法術力值的生命 */
  | { e: 'revealDraw' }
  /** 招募：抓一張牌，然後棄一張牌；若棄掉的不是地，派出 1/1 人類士兵 */
  | { e: 'recruit' }
  /** 從牌庫中搜尋一張符合條件的牌放到手上 */
  | { e: 'tutor'; filter: Filter }
  /** 移除至多 n 個指示物 */
  | { e: 'removeCounters'; what: Ref; n: number }
  /** 大地彎折（簡化）：派出一個 0/0 具敏捷的大地元素，並放上 n 個 +1/+1 指示物 */
  | { e: 'earthbend'; n: Amt }
  | { e: 'mill'; n: Amt; who?: Ref }
  | { e: 'scry'; n: number }
  | { e: 'surveil'; n: number }
  | { e: 'dig'; n: number; take?: number; filter?: Filter; rest: 'bottom' | 'graveyard' }
  | { e: 'searchLand'; to: 'battlefield' | 'hand'; tapped?: boolean; untapIfLands?: number; who?: Ref; may?: boolean }
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
  | { e: 'cantGainLife'; who: Ref }
  /** 直到回合結束，永久物（通常是地）成為生物 */
  | { e: 'animate'; what: Ref; p: number; t: number; kw?: Keyword[]; subtypes?: string[]; colors?: Color[] };

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
  | 'sacrifice'
  /** 每當你於一回合中抓第二張牌時 */
  | 'drawSecond'
  /** 每當另一個生物（任何玩家的）死去時 */
  | 'otherDies'
  /** 每當另一個永久物（不限生物）在你的操控下進戰場時 */
  | 'allyPermEtb'
  /** 每當你在由你操控的生物上放置 +1/+1 指示物時 */
  | 'allyCounters'
  /** 每當由你操控的生物成為對手的咒語或異能的目標時 */
  | 'allyTargeted';

export interface TriggeredAbility {
  kind: 'trigger';
  on: TriggerOn;
  /** 觸發物件需要符合的條件（例如 allyEtb 的進場生物、castAny 的咒語） */
  filter?: Filter;
  /** 施放類觸發：任何玩家施放都會觸發 */
  anyPlayer?: boolean;
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
  /** 裝備異能 */
  isEquip?: boolean;
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
  /** 產生法術力時要犧牲自己（珍寶） */
  sacOnMana?: boolean;
  /** 過濾地：{T}：加{C}；{1}，{T}：加一點任意顏色的法術力 */
  filterMana?: boolean;
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
  costReduce?: { perGy?: Filter; perCount?: Filter; perMaxMv?: Filter; cond?: Cond; mana?: string };
  /** 以此生物為目標的裝備異能減少 {n} */
  equipDiscount?: number;
  /** 震地：生命多於10點時支付2點生命、未橫置進場；否則橫置進場 */
  shock?: boolean;
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
  /** 暫時變成生物前的原始定義（回合結束時還原） */
  baseDef?: CardDef;
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
  drawsThisTurn: number;
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
  | { type: 'sacrifice'; card: number; player: PID }
  | { type: 'drawSecond'; player: PID }
  | { type: 'counterPlaced'; card: number; controller: PID; amount: number };

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

/** 給畫面顯示用的事件（施放、起動、觸發、攻擊、阻擋） */
export interface Show {
  seq: number;
  kind: 'spell' | 'activated' | 'trigger' | 'attack' | 'block';
  player: PID;
  card?: number;
  targets?: (TargetRef | null)[];
  /** 攻擊：[攻擊者, -1]；阻擋：[阻擋者, 被阻擋的攻擊者] */
  pairs?: [number, number][];
  text?: string;
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
  /** 最近的畫面事件（模擬用的複本不記錄） */
  shows: Show[];
  showSeq: number;
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
  | 'landFromHand'
  | 'tutor'
  | 'blight';

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
