// ============================================================
// 萬智牌規則引擎：型別定義
// 卡牌能力以宣告式資料描述（DSL），引擎負責解讀與結算。
// ============================================================

export type PID = 0 | 1;
export type Color = 'W' | 'U' | 'B' | 'R' | 'G';
export type Mana = Color | 'C';
export type CardType = 'Creature' | 'Instant' | 'Sorcery' | 'Enchantment' | 'Artifact' | 'Land' | 'Planeswalker';
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
  'FRA',
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
  toughMax?: number;
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
  /** 身上有 +1/+1 指示物 */
  plusCounters?: boolean;
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
  | { spellsCast: true }
  /** 施放時決定的 X */
  | { x: true }
  /** 你本回合獲得的生命總量 */
  | { lifeGained: true }
  /** 另一個數量的負值 */
  | { negOf: Amt }
  /** 本回合從牌庫置入該玩家墳墓場的牌數 */
  | { libToGy: Ref }
  /** 來源離開戰場前的 +1/+1 指示物數量（最後已知資訊） */
  | { lkiCounters: true };

export interface Grant {
  p?: number;
  t?: number;
  kw?: Keyword[];
  cantAttack?: boolean;
  cantBlock?: boolean;
  /** 可以攻擊，如同沒有防衛異能 */
  ignoreDefender?: boolean;
  /** 防禦力大於力量時，以防禦力代替力量造成戰鬥傷害 */
  damageByToughness?: boolean;
  /** 失去所有異能 */
  loseAbilities?: boolean;
  /** 在其操控者的重置步驟中不會重置 */
  noUntap?: boolean;
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
  | { c: 'attacked' }
  /** 手牌數量在 n 張或以下（對手／任一玩家） */
  | { c: 'handLte'; who: 'opp' | 'any'; n: number }
  /** 這是你的第 n 個或更早的回合 */
  | { c: 'myTurnLte'; n: number }
  /** 你本回合已失去 n 點或更多生命 */
  | { c: 'lostLifeGte'; n: number }
  /** 死亡：本回合有生物死去 */
  | { c: 'morbid' }
  /** 譫妄：你墳墓場中的牌有四種或更多類別 */
  | { c: 'delirium' }
  /** 慶典：本回合有兩個或更多非地永久物在你的操控下進戰場 */
  | { c: 'celebration' }
  /** 下潛：本回合有永久物牌置入你的墳墓場 */
  | { c: 'descended' }
  /** 此坐騎本回合已騎乘 */
  | { c: 'saddled' }
  /** 虛空 */
  | { c: 'void' }
  /** 你本回合占卜或刺探過 */
  | { c: 'scried' }
  /** 你本回合施放的非生物咒語恰好是第 n 個（用於「每回合第一個」） */
  | { c: 'noncreatureCastEq'; n: number }
  /** 你本回合已施放過至少 n 個非生物咒語 */
  | { c: 'noncreatureCastGte'; n: number }
  /** 你的牌庫是空的 */
  | { c: 'libraryEmpty' }
  /** 此來源不是衍生物（用於「若它不是衍生物」） */
  | { c: 'selfNotToken' }
  /** 本回合有對手被造成非戰鬥傷害 */
  | { c: 'oppNoncombatThisTurn' }
  /** 上一個回合有對手被造成非戰鬥傷害 */
  | { c: 'oppNoncombatLastTurn' }
  /** 此生物不是已準備 */
  | { c: 'notPrepared' }
  /** 你的速度已達最高（4） */
  | { c: 'maxSpeed' };

export interface ExtraCost {
  /** 從你的墳墓場放逐 n 張與此來源同名的牌（以及此咒語本身） */
  exileNamed?: number;
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
  /** sameName：連同所有與它同名的其他永久物一起消滅 */
  | { e: 'destroy'; what: Ref; sameName?: boolean; mvMaxX?: boolean }
  | { e: 'exile'; what: Ref }
  | { e: 'exileLinked'; what: Ref }
  | { e: 'bounce'; what: Ref }
  | { e: 'tap'; what: Ref }
  | { e: 'untap'; what: Ref }
  | { e: 'stun'; what: Ref; n?: number }
  | { e: 'pump'; what: Ref; p: Amt; t: Amt; kw?: Keyword[] }
  | { e: 'counters'; what: Ref; n: Amt }
  | { e: 'doubleCounters'; what: Ref }
  /** temp：在下一個結束步驟開始時犧牲（動員） */
  | { e: 'token'; token: string; n?: Amt; who?: Ref; tapped?: boolean; attacking?: boolean; attachTo?: Ref; temp?: boolean }
  /** 探險：展示牌庫頂；是地就放到手上，否則在該生物上放一個 +1/+1 指示物，並可以把那張牌置入墳墓場 */
  | { e: 'explore'; what: Ref }
  /** 閃現：放逐後立即以擁有者的操控放回戰場（可附帶 +1/+1 指示物） */
  | { e: 'flicker'; what: Ref; counters?: number }
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
  | { e: 'tutor'; filter: Filter; to?: 'hand' | 'top' | 'battlefield' }
  /** 移除至多 n 個指示物 */
  | { e: 'removeCounters'; what: Ref; n: number }
  /** 大地彎折（簡化）：派出一個 0/0 具敏捷的大地元素，並放上 n 個 +1/+1 指示物 */
  | { e: 'earthbend'; n: Amt }
  /** 堅忍 n：在此永久物上放置 n 個 +1/+1 指示物；它不在戰場上時改為派出一個 0/0 白色精靈並放上 n 個指示物 */
  | { e: 'endure'; n: Amt }
  /** 顯化恐懼：檢視牌庫頂兩張，一張面朝下放進戰場成為 2/2 生物，另一張置入墳墓場 */
  | { e: 'manifestDread' }
  /** 斗篷：將牌庫頂的牌面朝下放進戰場，成為具有守護{2}的 2/2 生物 */
  | { e: 'cloak' }
  /** 騎乘：此坐騎本回合成為已騎乘 */
  | { e: 'saddle' }
  /** 選擇一個生物類別，消滅所有不是該類別的生物 */
  | { e: 'kindredJudgment' }
  /** 此生物成為已準備 */
  | { e: 'prepare' }
  /** 取消準備 */
  | { e: 'unprepare'; what: Ref }
  /** 直到回合結束，該生物的基礎力量與防禦力 */
  | { e: 'setBase'; what: Ref; p: number; t: number }
  /** 擁有者選擇把永久物放在牌庫頂或牌庫底 */
  | { e: 'topOrBottom'; what: Ref }
  /** 你贏得這場遊戲 */
  | { e: 'win' }
  /** 本回合的延遲觸發（once：只觸發一次） */
  | { e: 'delayed'; on: TriggerOn; effects: Effect[]; once?: boolean; what?: Ref }
  /** 複製觸發的咒語（可以選擇新目標） */
  | { e: 'copySpell' }
  /** 你本回合施放的下一個咒語不能被反擊 */
  | { e: 'nextSpellUncounterable' }
  /** 每位玩家可以棄掉手牌，然後抓七張牌 */
  | { e: 'wheel' }
  /** 派出一個此來源的衍生物複製 */
  | { e: 'copyOfSelf' }
  /** 懷疑：該生物具有威懾且不能阻擋 */
  | { e: 'suspect'; what: Ref }
  | { e: 'mill'; n: Amt; who?: Ref }
  | { e: 'scry'; n: number }
  | { e: 'surveil'; n: number }
  | { e: 'dig'; n: Amt; take?: number; filter?: Filter; rest: 'bottom' | 'graveyard' | 'top'; to?: 'hand' | 'battlefield' }
  | { e: 'searchLand'; to: 'battlefield' | 'hand'; tapped?: boolean; untapIfLands?: number; who?: Ref; may?: boolean }
  | { e: 'counter'; what: Ref }
  | { e: 'counterUnless'; what: Ref; pay: number }
  | { e: 'fight'; a: Ref; b: Ref }
  | { e: 'bite'; a: Ref; b: Ref }
  | { e: 'toHand'; what: Ref }
  /** counters：額外的 +1/+1 指示物；finality：帶著終結指示物（死去時改為放逐） */
  | { e: 'reanimate'; what: Ref; counters?: number; finality?: boolean }
  /** 將符合條件的牌從你的墳墓場全部放進戰場 */
  | { e: 'reanimateAll'; filter: Filter }
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
  /** 在鵬洛客上放置（或移除）忠誠指示物 */
  | { e: 'loyalty'; what: Ref; n: Amt }
  /** 強化傑斯 n：在你的傑斯衍生物上放置 n 個忠誠指示物（沒有就先派出一個） */
  | { e: 'empowerJace'; n: Amt }
  /** 直到回合結束，永久物（通常是地）成為生物 */
  /** 轉化（翻到另一面） */
  | { e: 'transform'; what: Ref }
  /** 放逐此牌（不論在戰場或墳墓場），再以轉化後的面放回戰場 */
  | { e: 'returnTransformed'; tapped?: boolean }
  | { e: 'animate'; what: Ref; p: number; t: number; kw?: Keyword[]; subtypes?: string[]; colors?: Color[] };

export type TriggerOn =
  | 'etb'
  | 'dies'
  | 'attacks'
  | 'blocks'
  | 'upkeep'
  /** 在每位對手的維持開始時 */
  | 'oppUpkeep'
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
  | 'allyTargeted'
  /** 當此生物翻成正面時 */
  | 'turnedFaceUp'
  /** 每當你占卜或刺探時 */
  | 'scry'
  /** 每當你在鵬洛客上放置忠誠指示物時 */
  | 'loyaltyPlaced'
  /** 每當你起動忠誠異能時 */
  | 'loyaltyActivated'
  /** 每當有對手被造成非戰鬥傷害時 */
  | 'noncombatOpp'
  /** 每當有玩家棄牌時 */
  | 'anyDiscard'
  /** 在每個結束步驟開始時（任何玩家的回合） */
  | 'eachEndStep'
  /** 每當此永久物成為對手的咒語或異能的目標時 */
  | 'targetedByOpp'
  /** 在你的回合中，有一個或更多對手被造成戰鬥傷害時（每個傷害步驟一次） */
  | 'oppCombatDamaged'
  /** 當你棄掉這張牌時（來源在墳墓場） */
  | 'discardSelf';

export interface TriggerMode {
  text: string;
  targets?: TargetSpec[];
  effects: Effect[];
}

export interface TriggeredAbility {
  kind: 'trigger';
  on: TriggerOn;
  /** 模式式觸發：先選擇模式再選目標（此時 effects 為空） */
  modes?: TriggerMode[];
  /** 要選擇幾個模式（預設 1） */
  chooseN?: number;
  /** 施放類觸發：或是該咒語的目標中有符合此條件的永久物 */
  orTargets?: Filter;
  /** 攻擊類觸發：只有在單獨一個生物攻擊玩家時 */
  alone?: boolean;
  /** 起動忠誠異能的觸發：至少要移除幾個忠誠指示物 */
  minRemoved?: number;
  /** 觸發條件：只在事件發生時檢查（和 cond 不同，結算時不再檢查） */
  when?: Cond;
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
  /** loyalty：忠誠異能（+N 放置、-N 移除忠誠指示物；每個鵬洛客每回合只能起動一次，只能於法術時機） */
  /** crew：駕駛 N（橫置總力量 N 或更多的其他未橫置生物） */
  cost: { mana?: string; tap?: boolean; discardSelf?: boolean; exileSelf?: boolean; sacSelf?: boolean; sacOther?: Filter; life?: number; craft?: Filter; craftCount?: number; loyalty?: number; crew?: number };
  targets?: TargetSpec[];
  effects: Effect[];
  sorcery?: boolean;
  oncePerTurn?: boolean;
  /** 竭力：每場遊戲只能起動一次 */
  oncePerGame?: boolean;
  /** 強化：每場遊戲只能起動一次；此永久物本回合才進場時，費用減去其法術力費用 */
  powerUp?: boolean;
  /** 特殊動作：不使用堆疊，立即生效（例如把面朝下的生物翻成正面） */
  special?: boolean;
  /** 從墳墓場起動，代價包含放逐此牌 */
  fromGraveyard?: boolean;
  /** 從手上起動，代價包含棄掉或放逐此牌 */
  fromHand?: boolean;
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
  /** 你每回合可以多使用 n 張地 */
  extraLand?: number;
  /** 符合條件的永久物（你操控的）擁有這些起動式異能 */
  grantAbilities?: { filter: Filter; abilities: ActivatedAbility[] };
  /** 由你操控的鵬洛客忠誠為 0 時不會置入墳墓場 */
  noZeroLoyaltyDeath?: boolean;
  /** 你操控的瞬間與法術咒語具有切割 */
  splitSecondSpells?: boolean;
  /** 由你操控的鵬洛客每個戰鬥只能被一個生物攻擊 */
  pwOneAttacker?: boolean;
  /** 戰鬥中，所有玩家都不能施放咒語或起動異能（法術力異能除外） */
  noCombatActions?: boolean;
  /** 符合條件的咒語，對應玩家施放時費用多 {n}（who: opp＝你的對手） */
  spellCostMore?: { filter: Filter; n: number; who: 'opp' | 'all' };
  /** 你的來源對對手或其永久物造成非戰鬥傷害時，多造成 n 點 */
  noncombatPlus?: number;
  /** 在你操控的生物上放置 +1/+1 指示物時，多放 n 個 */
  counterPlus?: number;
}

export type Ability = TriggeredAbility | ActivatedAbility | StaticAbility;

export interface Mode {
  text: string;
  /** 取代原本費用（用於增幅等） */
  cost?: string;
  /** 交易：施放這個模式時要犧牲符合條件的永久物 */
  sac?: Filter;
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
  /** 產生有色法術力時要支付1點生命（{C} 不用） */
  painMana?: boolean;
  /** 產生的法術力只能用來施放某類咒語 */
  manaOnly?: 'planeswalker';
  /** 冒險：同一張牌上的另一個瞬間或法術；施放後此牌放逐，之後可以從放逐區施放本體 */
  adventure?: { name: string; zh?: string; cost: string; types: CardType[]; text: string; spell: SpellSpec };
  /** 準備：此生物附帶的咒語；已準備時可以施放它的複製（之後取消準備） */
  prepare?: { name: string; zh?: string; cost: string; types: CardType[]; text: string; spell: SpellSpec };
  /** 折躍：可以用此費用從手上施放，下一個結束步驟開始時放逐，之後的回合可以從放逐區施放 */
  warp?: string;
  /** 子嗣：可以多付此費用，進戰場時派出一個 1/1 的衍生物複製 */
  offspring?: string;
  /** 騷亂：本回合棄掉此牌後，可以用此費用從墳墓場施放 */
  mayhem?: string;
  /** 和聲：可以用此費用從墳墓場施放（可以橫置一個生物，減少等同其力量的費用），之後放逐 */
  harmonize?: string;
  /** 召集：你的生物可以幫忙支付此咒語 */
  convoke?: boolean;
  /** 此生物以已準備的狀態進戰場 */
  etbPrepared?: boolean;
  /** 返照：可以支付此費用從墳墓場施放，之後放逐 */
  flashback?: string;
  /** 以返照施放時，結算後不放逐，而是轉化成背面放進戰場 */
  flashbackTransform?: boolean;
  /** 雙面牌的背面 */
  back?: CardDef;
  /** 可以選擇施放背面（模式雙面牌） */
  mdfc?: boolean;
  etbTappedUnless?: Cond;
  etbCounters?: number;
  /** 進戰場時帶有 X 個 +1/+1 指示物（X 為施放時決定的值） */
  etbCountersX?: boolean;
  ward?: number;
  /** 守護—支付 n 點生命 */
  wardLife?: number;
  /** 循環：從手上支付費用、棄掉此牌，然後抓一張牌（有 search 時改為搜尋符合條件的牌） */
  cycling?: { cost: string; search?: Filter };
  /** 變形者：具有所有生物類別 */
  changeling?: boolean;
  /** 套牌中可以有任意數量的同名卡 */
  anyNumber?: boolean;
  /** 此咒語不能被反擊 */
  uncounterable?: boolean;
  /** 切割：堆疊上有此咒語時，玩家不能施放咒語或起動異能 */
  splitSecond?: boolean;
  /** 偽裝：可以支付 {3} 面朝下施放，之後支付此費用翻成正面 */
  disguise?: string;
  /** 預謀：可以支付此費用從手上放逐此牌，之後的回合免費施放 */
  plot?: string;
  /** 發動引擎！：你沒有速度時，速度變為 1 */
  startEngines?: boolean;
  /** 面朝下的 2/2 生物（真正的牌記在 Card.hidden） */
  faceDown?: boolean;
  /** 不能被力量小於等於 n 的生物阻擋 */
  evadePowLte?: number;
  spell?: SpellSpec;
  aura?: { target?: TargetSpec; grant: Grant };
  equip?: { cost: string; grant: Grant };
  abilities?: Ability[];
  /** 額外費用（例如：犧牲一個生物、支付生命） */
  addCost?: ExtraCost;
  /** 此咒語的費用減免 */
  costReduce?: { perGy?: Filter; perCount?: Filter; perMaxMv?: Filter; perMaxStat?: { stat: 'power' | 'toughness'; filter: Filter }; cond?: Cond; mana?: string };
  /** 以此生物為目標的裝備異能減少 {n} */
  equipDiscount?: number;
  /** 震地：生命多於10點時支付2點生命、未橫置進場；否則橫置進場 */
  shock?: boolean;
  /** 起手時可直接放進戰場 */
  leyline?: boolean;
  /** 鵬洛客的起始忠誠 */
  loyalty?: number;
  /** 傳奇（Saga）：每一章的效果；進場時與你的抓牌步驟後各放一個傳奇指示物並觸發對應的章節 */
  saga?: { chapters: { effects: Effect[]; targets?: TargetSpec[] }[] };
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
  /** 冒險中：在放逐區，可以施放本體 */
  onAdventure?: boolean;
  /** 已轉化：目前是背面，這是正面的定義 */
  front?: CardDef;
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
  /** 鵬洛客目前的忠誠 */
  loyalty?: number;
  /** 傳奇目前的章節（傳奇指示物數量） */
  lore?: number;
  /** 在下一個結束步驟開始時犧牲（動員派出的衍生物） */
  sacAtEnd?: boolean;
  /** 折躍：在下一個結束步驟開始時放逐 */
  exileAtEnd?: boolean;
  /** 因折躍被放逐的回合（之後的回合可以從放逐區施放） */
  warpExiled?: number;
  /** 被棄掉的回合（騷亂） */
  discardedTurn?: number;
  /** 被懷疑：具有威懾且不能阻擋 */
  suspected?: boolean;
  /** 帶著終結指示物：死去時改為放逐 */
  finality?: boolean;
  /** 離開戰場前的 +1/+1 指示物數量 */
  lastCounters?: number;
  /** 已準備（可以施放附帶咒語的複製） */
  prepared?: boolean;
  /** 面朝下時，真正的牌 */
  hidden?: CardDef;
  /** 預謀的回合 */
  plottedTurn?: number;
  /** 騎乘的回合 */
  saddledTurn?: number;
  /** 已起動過的竭力異能 */
  exhausted?: number[];
  /** 攻擊中的生物所攻擊的鵬洛客（沒有就是攻擊玩家） */
  attackTarget?: number | null;
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
  /** 本回合在你的操控下進戰場的非地永久物數量 */
  nonlandEtbThisTurn?: number;
  /** 本回合有永久物牌置入你的墳墓場 */
  permToGyThisTurn?: boolean;
  /** 本回合占卜或刺探過 */
  scriedThisTurn?: boolean;
  /** 本回合施放的非生物咒語數量 */
  noncreatureThisTurn?: number;
  /** 你本回合施放的下一個咒語不能被反擊 */
  nextSpellUncounterable?: boolean;
  /** 本回合從牌庫置入墳墓場的牌數 */
  libToGyThisTurn?: number;
  /** 本回合被造成非戰鬥傷害 */
  noncombatThisTurn?: boolean;
  /** 上一個回合被造成非戰鬥傷害 */
  noncombatLastTurn?: boolean;
  /** 速度（發動引擎！），0～4 */
  speed?: number;
  /** 上一次提升速度的回合 */
  speedUpTurn?: number;
  drewFromEmpty: boolean;
  lost: boolean;
  cantGainLife: boolean;
  mulligans: number;
  isAI: boolean;
}

export type TargetRef = { p: PID } | { c: number };

/** 特殊的施放方式 */
/** cycle：循環（從手上支付費用並棄掉此牌） */
/** disguise：面朝下施放；plot：預謀（付費放逐）；plotted：免費施放預謀的牌 */
/** prepared：施放已準備的生物附帶咒語的複製 */
/** warp：折躍；offspring：子嗣（多付費用）；mayhem／harmonize：從墳墓場施放 */
export type CastAlt = 'adventure' | 'flashback' | 'back' | 'cycle' | 'disguise' | 'plot' | 'plotted' | 'prepared' | 'warp' | 'offspring' | 'mayhem' | 'harmonize';

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
  /** 以冒險或返照的方式施放 */
  alt?: CastAlt;
  /** 施放時決定的 X */
  x?: number;
  /** 不能被反擊 */
  uncounterable?: boolean;
}

export interface EotEffect {
  card: number;
  p: number;
  t: number;
  kw: Keyword[];
  /** 直到回合結束的基礎力量與防禦力 */
  base?: { p: number; t: number };
}

/** 延遲觸發：本回合內，事件發生時觸發 */
export interface DelayedTrigger {
  controller: PID;
  source: number;
  on: TriggerOn;
  effects: Effect[];
  once: boolean;
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
  | { type: 'turnedFaceUp'; card: number }
  | { type: 'scry'; player: PID }
  | { type: 'combatBatch'; attacker: PID; damaged: PID }
  | { type: 'loyaltyPlaced'; card: number; controller: PID; amount: number }
  | { type: 'loyaltyActivated'; card: number; controller: PID; removed: number }
  | { type: 'noncombat'; player: PID; amount: number; sourceController: PID }
  | { type: 'discard'; player: PID; card: number }
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
  /** 本回合有生物死去 */
  creatureDiedThisTurn?: boolean;
  /** 本回合的延遲觸發 */
  delayed?: DelayedTrigger[];
  /** 場上有「失去所有異能」的光環（用來避免不必要的檢查） */
  loseAbilities?: boolean;
  /** 虛空：本回合有非地永久物離開戰場，或有咒語以折躍施放 */
  voidThisTurn?: boolean;
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
  | { type: 'yesno'; player: PID; prompt: string; source?: number; purpose?: 'may' | 'pay' | 'leyline' }
  /** 選擇模式（或選擇一個選項，例如生物類別） */
  | {
      type: 'mode';
      player: PID;
      prompt: string;
      source?: number;
      options: string[];
      count: number;
      purpose: 'trigger' | 'creatureType';
      /** 觸發的模式：每個選項的效果與目標（AI 判斷用） */
      meta?: { effects: Effect[][]; specs: TargetSpec[][] };
    };

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
  | { type: 'cast'; card: number; targets: (TargetRef | null)[]; mode?: number; sac?: number; discard?: number; alt?: CastAlt; x?: number }
  | { type: 'activate'; card: number; ability: number; targets: (TargetRef | null)[]; sac?: number };

export type Response =
  | PriorityAction
  | { type: 'keep'; keep: boolean }
  /** targets：攻擊者 → 被攻擊的鵬洛客（沒列出的攻擊玩家） */
  | { type: 'attackers'; ids: number[]; targets?: Record<number, number> }
  | { type: 'blockers'; blocks: [number, number][] }
  | { type: 'targets'; targets: (TargetRef | null)[] }
  | { type: 'choose'; ids: number[] }
  | { type: 'yesno'; yes: boolean }
  | { type: 'modes'; picks: number[] };

export type Flow = Generator<Decision, void, Response>;
export type SubFlow<T = void> = Generator<Decision, T, Response>;
