import type { Screen } from '../App';
import { SET_INFO } from '../data';
import { STANDARD_SETS, type Keyword } from '../engine/types';
import { MYTHIC_PTS, PIPS, ladderReward } from '../meta/ladder';
import { MIN_DECK, MIN_DECK_STANDARD, REWARDS } from '../meta/profile';
import { KW_DESC, KW_ZH } from './i18n';

export function Help({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="page help">
      <header className="topbar">
        <button className="brand" onClick={() => go({ name: 'home' })}>
          <span className="brand-mark">萬</span>
          <span className="brand-name">萬智牌決鬥場</span>
        </button>
        <h1 className="topbar-title">規則與操作</h1>
        <span />
      </header>

      <section className="panel prose">
        <h3>遊戲目標</h3>
        <p>雙方各從 20 點生命開始。把對手的生命降到 0，或讓對手在需要抓牌時牌庫已空，你就獲勝。</p>

        <h3>回合流程</h3>
        <ol>
          <li>重置：把你橫置的永久物轉正。</li>
          <li>維持、抓牌：抓一張牌（先攻玩家的第一回合不抓）。</li>
          <li>主要階段 1：每回合可以打出一張地，也可以施放生物、法術、結界、神器。</li>
          <li>戰鬥：選擇要攻擊的生物，由對手決定如何阻擋，然後造成傷害。剛進場的生物有「召喚失調」，下個回合才能攻擊。</li>
          <li>主要階段 2：戰鬥後還能再施放咒語。</li>
          <li>結束：手牌超過 7 張要棄到 7 張，生物身上的傷害清除。</li>
        </ol>
        <p>瞬間與具有「閃現」的牌可以在任何時候施放，包括對手的回合，或回應對手的咒語。</p>

        <h3>怎麼操作</h3>
        <ul>
          <li>點一下手牌或戰場上的卡牌，右側（手機在下方）會顯示詳細內容與可以進行的動作；桌機上雙擊手牌可以直接使用。</li>
          <li>會發亮的手牌代表現在可以使用。法術力會自動從你的地與生物支付。</li>
          <li>需要目標時，合法目標會以金框標示，點一下就能選擇；目標是玩家時點選生命值圓框。</li>
          <li>攻擊：點選要攻擊的生物，再按「攻擊」。阻擋：先點你的生物，再點它要阻擋的攻擊生物。</li>
          <li>「結束回合」會一路略過到對手回合；若對手施放咒語而你有牌可以回應，遊戲仍會停下來。</li>
          <li>「停頓：智慧」只在可能需要你操作的時機停下；改成「全部」則每次有可用動作都停下。</li>
        </ul>

        <h3>難度與獎勵</h3>
        <ul>
          <li>簡單：AI 隨意出牌與攻擊。勝利 {REWARDS.easy.win} 金幣，落敗 {REWARDS.easy.loss} 金幣。</li>
          <li>普通：AI 會評估每個動作的價值，但不會在你的回合主動出手，偶爾選錯。勝利 {REWARDS.normal.win}，落敗 {REWARDS.normal.loss}。</li>
          <li>困難：AI 會回應你的咒語、在你攻擊時使用除去、保留戰鬥技巧與閃現生物，並推演整個戰鬥。勝利 {REWARDS.hard.win}，落敗 {REWARDS.hard.loss}。</li>
          <li>投降不會獲得金幣。</li>
        </ul>

        <h3>天梯配對</h3>
        <ul>
          <li>從主選單的「天梯配對」選擇賽制與套牌後開始配對，系統會找一位段位相近的對手。對手由 AI 扮演：名字、段位、思考速度與強度各不相同，段位越高越常遇到困難的對手。對手的套牌也五花八門：完整的環境套牌、自己改過的版本、入門套牌、自組的部族牌，甚至是地數不對的雜牌；段位越高，越常遇到完整的環境套牌。</li>
          <li>段位由低到高為青銅、白銀、黃金、白金、鑽石、秘稀；每個大段有 IV 到 I 四個小段，每小段 {PIPS} 顆星。勝利 +1 星，黃金以下連勝 3 場起每勝 +2 星；落敗 -1 星（青銅不掉星，也不會掉出目前的大段）。</li>
          <li>勝利可得 {ladderReward(0, true)}～{ladderReward(MYTHIC_PTS, true)} 金幣，段位越高越多；投降沒有金幣。標準與自由兩種天梯分開計算。</li>
          <li>對戰中可以點頭像旁的 💬 發表情，覺得吵可以按「靜音對手」。</li>
        </ul>

        <h3>卡包與收藏</h3>
        <ul>
          <li>
            <b>標準賽系列</b>：{STANDARD_SETS.length} 個現行標準賽系列各有自己的補充包（{STANDARD_SETS.map((s) => SET_INFO[s].short).join('、')}），每包 100 金幣。
          </li>
          {(['CORE', 'META'] as const).map((s) => (
            <li key={s}>
              <b>{SET_INFO[s].name}</b>：{SET_INFO[s].desc}
            </li>
          ))}
          <li>每包 12 張，至少 1 張稀有或秘稀。某張卡已經有 4 張時，再開到會自動換成金幣。</li>
          <li>在「我的收藏」可以出售卡牌換金幣。</li>
        </ul>

        <h3>賽制</h3>
        <ul>
          <li>
            <b>自由模式</b>：收藏中的卡都能用，套牌至少 {MIN_DECK} 張。對手使用經典卡組成的 7 套環境套牌。
          </li>
          <li>
            <b>標準模式</b>：只能用目前標準賽合法的卡（{STANDARD_SETS.length} 個現行系列，加上仍在標準賽中的經典卡，禁卡除外），套牌至少 {MIN_DECK_STANDARD} 張。對手使用 2026 年 9 月標準賽的 7 套熱門套牌。
          </li>
          <li>一開始就有兩套自由模式與兩套標準模式的入門套牌。卡牌的詳細資訊會標示是否能用於標準賽。</li>
        </ul>

        <h3>組牌規則</h3>
        <ul>
          <li>自由模式至少 {MIN_DECK} 張，標準模式至少 {MIN_DECK_STANDARD} 張（約 24 張地）。</li>
          <li>同名的卡最多 4 張，基本地不限數量，而且不需要收集。</li>
          <li>只能使用收藏中擁有的卡。「自動補地」會依照咒語的顏色比例補足基本地。</li>
        </ul>

        <h3>關鍵字異能</h3>
        <dl className="kw-glossary">
          {(Object.keys(KW_ZH) as Keyword[]).map((k) => (
            <div key={k}>
              <dt>{KW_ZH[k]}</dt>
              <dd>{KW_DESC[k]}</dd>
            </div>
          ))}
          <div>
            <dt>地落</dt>
            <dd>每當一個地在你的操控下進戰場時觸發。</dd>
          </div>
          <div>
            <dt>英勇</dt>
            <dd>每回合此生物第一次成為你的咒語或異能的目標時觸發。</dd>
          </div>
          <div>
            <dt>占卜 N</dt>
            <dd>檢視牌庫頂 N 張牌，把任意數量放到牌庫底，其餘放回牌庫頂。</dd>
          </div>
          <div>
            <dt>刺探 N</dt>
            <dd>檢視牌庫頂 N 張牌，把任意數量置入墳墓場，其餘放回牌庫頂。</dd>
          </div>
          <div>
            <dt>守護 N</dt>
            <dd>對手的咒語或異能以它為目標時，需要額外支付 {'{N}'}。</dd>
          </div>
          <div>
            <dt>大地彎折 N</dt>
            <dd>（簡化）派出一個 0/0 具敏捷的大地元素，並放上 N 個 +1/+1 指示物。</dd>
          </div>
          <div>
            <dt>枯萎 N</dt>
            <dd>在一個由你操控的生物上放置 N 個 -1/-1 指示物。</dd>
          </div>
          <div>
            <dt>繽紛</dt>
            <dd>X 等於由你操控的永久物中的顏色數量。</dd>
          </div>
          <div>
            <dt>集結鬼怪 N</dt>
            <dd>在你的軍隊上放置 N 個 +1/+1 指示物；沒有軍隊就先派出 0/0 鬼怪軍隊。</dd>
          </div>
          <div>
            <dt>招募</dt>
            <dd>抓一張牌再棄一張牌；棄掉的不是地時，派出 1/1 人類士兵。</dd>
          </div>
          <div>
            <dt>密謀</dt>
            <dd>抓一張牌再棄一張牌；棄掉的不是地時，該生物得到一個 +1/+1 指示物。</dd>
          </div>
          <div>
            <dt>樂章</dt>
            <dd>每當你施放瞬間或法術咒語時觸發；法術力值 5 以上的咒語效果更強。</dd>
          </div>
          <div>
            <dt>疾風</dt>
            <dd>每當你施放本回合的第二個咒語時觸發。</dd>
          </div>
          <div>
            <dt>灌注</dt>
            <dd>若你本回合獲得過生命，效果會增強或改變。</dd>
          </div>
          <div>
            <dt>詭異</dt>
            <dd>每當一個結界在你的操控下進戰場時觸發。</dd>
          </div>
          <div>
            <dt>生存</dt>
            <dd>（簡化）在你的結束步驟開始時，若此生物已橫置則觸發。</dd>
          </div>
          <div>
            <dt>門檻</dt>
            <dd>你的墳墓場中有七張或更多牌時生效。</dd>
          </div>
          <div>
            <dt>傳說故事</dt>
            <dd>你操控三個或更多神器及／或傳奇永久物時生效。</dd>
          </div>
          <div>
            <dt>兇猛</dt>
            <dd>你操控力量 4 以上的生物時生效。</dd>
          </div>
          <div>
            <dt>強化</dt>
            <dd>一種每回合只能起動一次的起動式異能。</dd>
          </div>
          <div>
            <dt>結盟</dt>
            <dd>每當另一個生物在你的操控下進戰場時觸發。</dd>
          </div>
          <div>
            <dt>暈眩指示物</dt>
            <dd>有暈眩指示物的永久物在重置步驟不會重置，而是移除一個暈眩指示物。</dd>
          </div>
        </dl>

        <h3>關於卡牌與環境</h3>
        <p>
          規則文字為本遊戲實際執行的中文敘述，部分卡牌的效果有簡化（例如沒有鵬洛客、載具、寶物與冒險，某些機制改成遊戲內能處理的形式）。卡圖與中文卡名來自 Scryfall，無法連線時會使用內建卡框與英文卡名。標準模式的 AI 套牌參考 2026 年 9 月標準賽的熱門套路（單綠地落、迪米爾中速、伊捷咒術元素、波洛斯矮人、瓊德獻祭、拉克多斯鬼怪、阿佐里斯控制），以本遊戲收錄的卡重新組成。
        </p>
      </section>
      <div className="setup-go">
        <button className="btn" onClick={() => go({ name: 'home' })}>
          返回主選單
        </button>
      </div>
    </div>
  );
}
