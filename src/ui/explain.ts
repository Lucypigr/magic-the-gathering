// ============================================================
// 卡牌效果的白話解說：符號、每一行異能的種類、遊戲術語
// ============================================================
import type { CardDef } from '../engine/types';

export interface Term {
  term: string;
  /** 規則敘述中出現其中任何一個字串就顯示 */
  match: string[];
  desc: string;
}

/** 機制與術語（說明頁也使用這份清單） */
export const MECHANICS: Term[] = [
  { term: '地落', match: ['地落'], desc: '每當一個地在你的操控下進戰場時觸發。' },
  { term: '英勇', match: ['英勇'], desc: '每回合此生物第一次成為你的咒語或異能的目標時觸發。' },
  { term: '占卜 N', match: ['占卜'], desc: '檢視牌庫頂 N 張牌，把任意數量放到牌庫底，其餘放回牌庫頂。用來過濾接下來要抓的牌。' },
  { term: '刺探 N', match: ['刺探'], desc: '檢視牌庫頂 N 張牌，把任意數量置入墳墓場，其餘放回牌庫頂。' },
  { term: '守護 N', match: ['守護'], desc: '對手的咒語或異能以它為目標時，需要額外支付 {N}，否則那個咒語或異能被反擊。' },
  { term: '大地彎折 N', match: ['大地彎折'], desc: '（簡化）派出一個 0/0 具敏捷的大地元素，並放上 N 個 +1/+1 指示物。' },
  { term: '枯萎 N', match: ['枯萎'], desc: '在一個由你操控的生物上放置 N 個 -1/-1 指示物（通常是當作代價）。' },
  { term: '繽紛', match: ['繽紛'], desc: 'X 等於由你操控的永久物中的顏色數量。' },
  { term: '集結鬼怪 N', match: ['集結鬼怪'], desc: '在你的軍隊上放置 N 個 +1/+1 指示物；沒有軍隊就先派出 0/0 鬼怪軍隊。' },
  { term: '招募', match: ['招募'], desc: '抓一張牌再棄一張牌；棄掉的不是地時，派出 1/1 人類士兵。' },
  { term: '密謀', match: ['密謀'], desc: '抓一張牌再棄一張牌；棄掉的不是地時，該生物得到一個 +1/+1 指示物。' },
  { term: '樂章', match: ['樂章'], desc: '每當你施放瞬間或法術咒語時觸發；法術力值 5 以上的咒語效果更強。' },
  { term: '疾風', match: ['疾風'], desc: '每當你施放本回合的第二個咒語時觸發。' },
  { term: '灌注', match: ['灌注'], desc: '若你本回合獲得過生命，效果會增強或改變。' },
  { term: '詭異', match: ['詭異'], desc: '每當一個結界在你的操控下進戰場時觸發。' },
  { term: '生存', match: ['生存'], desc: '（簡化）在你的結束步驟開始時，若此生物已橫置則觸發。' },
  { term: '門檻', match: ['門檻'], desc: '你的墳墓場中有七張或更多牌時生效。' },
  { term: '傳說故事', match: ['傳說故事'], desc: '你操控三個或更多神器及／或傳奇永久物時生效。' },
  { term: '兇猛', match: ['兇猛'], desc: '你操控力量 4 以上的生物時生效。' },
  { term: '強化', match: ['強化'], desc: '一種每回合只能起動一次的起動式異能。' },
  { term: '結盟', match: ['結盟'], desc: '每當另一個生物在你的操控下進戰場時觸發。' },
  { term: '增幅', match: ['增幅'], desc: '施放時可以多付一筆額外費用，付了的話效果會變強（不付也能正常施放）。' },
  { term: '暈眩指示物', match: ['暈眩'], desc: '有暈眩指示物的永久物在重置步驟不會重置，而是移除一個暈眩指示物。' },
];

/** 一般的遊戲術語 */
const TERMS: Term[] = [
  { term: '橫置／重置', match: ['橫置', '重置'], desc: '把牌轉 90 度叫做「橫置」，代表這回合已經用過（攻擊、產生法術力或付了 ↷ 費用）。你的回合開始時，你的所有牌都會「重置」轉回直的。' },
  { term: '此地橫置進戰場', match: ['橫置進戰場'], desc: '這張牌放出來時是橫的，要等你下個回合才能用它產生法術力。' },
  { term: '犧牲', match: ['犧牲'], desc: '把你自己操控的一個永久物置入墳墓場，通常是當作代價。犧牲不是「消滅」，不滅也擋不住。' },
  { term: '消滅', match: ['消滅'], desc: '把目標永久物置入它擁有者的墳墓場。具有不滅的永久物不會被消滅。' },
  { term: '放逐', match: ['放逐'], desc: '把牌移出遊戲，放到放逐區。和墳墓場不同，大多數效果都拿不回來。' },
  { term: '反擊', match: ['反擊'], desc: '讓堆疊上的咒語失效，直接置入墳墓場，它的效果不會發生。只能在對手施放咒語、咒語還在堆疊上時使用。' },
  { term: '移回手上', match: ['手上'], desc: '把戰場上的牌拿回手上（俗稱彈回）。之後可以再施放，但牌上的指示物、結附的靈氣都會消失。' },
  { term: '墳墓場', match: ['墳墓場'], desc: '棄掉的牌、結算完的瞬間與法術、死去的生物都會放到擁有者的墳墓場（棄牌堆）。' },
  { term: '搜尋牌庫', match: ['搜尋'], desc: '翻看你的牌庫找出符合條件的牌，然後把牌庫洗勻。' },
  { term: '抓牌／棄牌', match: ['抓', '棄'], desc: '「抓」是從牌庫頂拿牌到手上；「棄」是把手上的牌置入墳墓場。' },
  { term: '衍生物', match: ['衍生'], desc: '由效果產生的替身牌（例如 1/1 士兵），在戰場上和一般的牌一樣。離開戰場就直接消失。' },
  { term: '+1/+1 指示物', match: ['+1/+1指示物', '+1/+1 指示物'], desc: '放在生物上的標記，每個讓力量與防禦力各 +1，會一直留著。' },
  { term: '-1/-1 指示物', match: ['-1/-1指示物', '-1/-1 指示物'], desc: '每個讓力量與防禦力各 -1，會一直留著。防禦力變成 0 的生物會死去。+1/+1 與 -1/-1 指示物會互相抵銷。' },
  { term: '進戰場', match: ['進戰場'], desc: '牌放到戰場上的時候（施放生物、打出地、派出衍生物等）。「當此生物進戰場時」的效果會在這時觸發一次。' },
  { term: '死去', match: ['死去'], desc: '生物從戰場置入墳墓場，例如受到致命傷害、被消滅或被犧牲。' },
  { term: '目標', match: ['目標'], desc: '寫著「目標」的效果，施放或起動時就要指定對象。對象若在結算前消失或變得不合法，效果不會發生。辟邪的生物不能被對手指定。' },
  { term: '任意一個目標', match: ['任意一個目標'], desc: '可以指定生物、玩家（包括你自己）當目標。' },
  { term: '直到回合結束', match: ['直到回合結束'], desc: '效果只持續到這個回合的結束步驟，下回合就恢復原狀。' },
  { term: '法術力值', match: ['法術力值'], desc: '牌左上角費用的總數。例如 {2}{R} 的法術力值是 3。' },
  { term: '裝備', match: ['裝備'], desc: '武具的起動式異能：支付裝備費用，把武具貼到你的一個生物上，讓它獲得加成。只能在你的主要階段、堆疊是空的時候使用。生物離開後，武具會留在戰場上。' },
  { term: '結附', match: ['結附'], desc: '靈氣貼在某個永久物上，給予它效果。被貼的永久物離開戰場時，靈氣會被置入墳墓場。' },
  { term: '只能於法術時機起動', match: ['法術時機'], desc: '只能在你自己的主要階段、而且堆疊上沒有東西時使用（和施放法術的時機一樣）。' },
  { term: '展示', match: ['展示'], desc: '把牌翻開給所有玩家看，看完放回原本的地方（除非效果另有說明）。' },
  { term: '額外費用', match: ['額外費用'], desc: '施放時除了原本的費用之外還要再付的東西。' },
];

export interface SymbolNote {
  sym: string;
  desc: string;
}

/** 規則敘述中出現的符號 */
export function symbolNotes(def: CardDef): SymbolNote[] {
  const text = def.text;
  const out: SymbolNote[] = [];
  if (text.includes('{T}'))
    out.push({
      sym: 'T',
      desc: '「橫置」符號：把這張牌轉橫，當作使用異能的代價。已經橫置的牌不能再用，所以通常每回合只能用一次，要等你的下個回合重置。生物剛進場的那個回合（召喚失調）不能用含 ↷ 的異能，除非它有敏捷。',
    });
  if (/\{[WUBRG]\}/.test(text)) out.push({ sym: 'R', desc: '有顏色的法術力符號（白、藍、黑、紅、綠），要用那個顏色的法術力支付，或表示「加」出那個顏色的法術力。' });
  if (/\{\d+\}/.test(text)) out.push({ sym: '2', desc: '數字表示要支付的法術力數量，任何顏色都可以。' });
  if (text.includes('{X}')) out.push({ sym: 'X', desc: 'X 由你在施放或起動時決定，付多少 X 效果就多大。' });
  if (/\{[WUBRG]\/[WUBRG]\}/.test(text)) out.push({ sym: 'W/U', desc: '混色符號：兩種顏色擇一支付即可。' });
  return out;
}

export type LineKind = 'keyword' | 'mana' | 'activated' | 'triggered' | 'static' | 'spell' | 'modes' | 'mode';

export const LINE_KIND_ZH: Record<LineKind, string> = {
  keyword: '關鍵字異能',
  mana: '法術力異能',
  activated: '起動式異能',
  triggered: '觸發式異能',
  static: '靜止式異能',
  spell: '咒語效果',
  modes: '模式咒語',
  mode: '選項',
};

export interface LineNote {
  kind: LineKind;
  text: string;
  cost?: string;
  effect?: string;
  desc: string;
}

const KEYWORD_WORDS = ['飛行', '延勢', '先攻', '連擊', '死觸', '踐踏', '繫命', '警戒', '敏捷', '威懾', '守軍', '不滅', '辟邪', '閃現', '勇行', '不能被阻擋'];

function isKeywordLine(line: string): boolean {
  const parts = line.split(/[，、,]/).map((x) => x.trim().replace(/[。.]$/, ''));
  return parts.length > 0 && parts.every((p) => KEYWORD_WORDS.some((k) => p === k || p.startsWith(`${k} `) || /^守護\s*\{?\d/.test(p)));
}

/** 把每一行規則敘述分類並用白話說明 */
export function lineNotes(def: CardDef): LineNote[] {
  const permanent = !def.types.includes('Instant') && !def.types.includes('Sorcery');
  const out: LineNote[] = [];
  for (const raw of def.text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('•')) {
      out.push({ kind: 'mode', text: line, desc: '可以選擇的其中一個效果。' });
      continue;
    }
    if (/^選擇(一|二|兩)項/.test(line)) {
      out.push({ kind: 'modes', text: line, desc: '施放時從下面的選項中挑選要發生的效果。' });
      continue;
    }
    if (isKeywordLine(line)) {
      out.push({ kind: 'keyword', text: line, desc: '一直有效的能力，說明請看下方的關鍵字解說。' });
      continue;
    }
    const eq = line.match(/^裝備\s*((?:\{[^}]+\})+)/);
    if (eq) {
      out.push({
        kind: 'activated',
        text: line,
        cost: eq[1],
        effect: '把這個武具貼到你的一個生物上',
        desc: '你可以主動使用：支付裝備費用，把武具移到你的一個生物上，讓它獲得武具的加成。只能在你的主要階段使用，可以重複移到別的生物上。',
      });
      continue;
    }
    // 「費用：效果」＝起動式異能（能力詞「英勇—每當…」不算）
    const m = line.match(/^([^：「」]+?)：(.+)$/);
    if (m && permanent && /\{|犧牲|棄|支付|移除|枯萎|橫置/.test(m[1]) && !/^(當|每當|在)/.test(m[1])) {
      const [, cost, effect] = m;
      if (/^加\{/.test(effect) || /^加一點/.test(effect) || /^加.*法術力/.test(effect)) {
        out.push({ kind: 'mana', text: line, cost, effect, desc: '付出冒號前的代價（通常是橫置這張牌），就能產生法術力，用來支付咒語的費用。隨時都能用。' });
      } else {
        const extra = cost.includes('{T}') ? '因為需要橫置，所以每回合只能用一次，生物剛進場的回合不能用（除非有敏捷）。' : '只要付得起，一回合可以用很多次。';
        const timing = effect.includes('法術時機') ? '只能在你的主要階段使用。' : '在你有優先權時都能使用，包括對手的回合。';
        out.push({ kind: 'activated', text: line, cost, effect, desc: `你可以主動使用：付出冒號前面的代價，得到冒號後面的效果。${timing}${extra}` });
      }
      continue;
    }
    const body = line.replace(/^[^—]{1,6}—/, '');
    if (/^(當|每當|在|於)/.test(body)) {
      out.push({ kind: 'triggered', text: line, desc: '條件達成時自動發生，不用你操作（有「可以」字樣時會問你要不要）。' });
      continue;
    }
    if (!permanent) {
      out.push({ kind: 'spell', text: line, desc: '施放並結算這張牌時發生的效果，結算完這張牌會進入墳墓場。' });
      continue;
    }
    out.push({ kind: 'static', text: line, desc: '只要這張牌在戰場上就一直有效，不需要任何操作。' });
  }
  return out;
}

/** 規則敘述中出現的術語與機制 */
export function termNotes(def: CardDef): Term[] {
  const text = def.text;
  return [...MECHANICS, ...TERMS].filter((t) => t.match.some((m) => text.includes(m)));
}

/** 卡牌類別的簡短說明 */
export function typeNote(def: CardDef): string {
  const t = def.types;
  if (t.includes('Land')) return '地：每回合可以打出一張（不算施放），主要用來產生法術力。';
  if (t.includes('Creature')) return '生物：施放後留在戰場上，可以攻擊與阻擋。剛進場的回合不能攻擊（召喚失調），除非有敏捷。';
  if (t.includes('Instant')) return '瞬間：任何時候都能施放，包括對手的回合和戰鬥中，用完進入墳墓場。';
  if (t.includes('Sorcery')) return '法術：只能在你的主要階段、堆疊是空的時候施放，用完進入墳墓場。';
  if (t.includes('Enchantment')) return def.aura ? '靈氣（結界）：施放時貼在一個目標上，給它效果。' : '結界：施放後留在戰場上，持續提供效果。';
  if (t.includes('Artifact')) return def.equip ? '武具（神器）：留在戰場上，支付裝備費用把它貼到你的生物上。' : '神器：施放後留在戰場上，持續提供效果或異能。';
  return '';
}
