import type { Screen } from '../App';
import { SET_INFO } from '../data';
import type { Keyword } from '../engine/types';
import { REWARDS } from '../meta/profile';
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

        <h3>卡包與收藏</h3>
        <ul>
          {(['FDN', 'CORE', 'META'] as const).map((s) => (
            <li key={s}>
              <b>{SET_INFO[s].name}</b>：{SET_INFO[s].desc}
            </li>
          ))}
          <li>每包 12 張，至少 1 張稀有或秘稀。某張卡已經有 4 張時，再開到會自動換成金幣。</li>
          <li>在「我的收藏」可以出售卡牌換金幣。</li>
        </ul>

        <h3>組牌規則</h3>
        <ul>
          <li>套牌至少 40 張（建議 60 張，約 24 張地）。</li>
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
        </dl>

        <h3>關於卡牌與環境</h3>
        <p>
          卡名使用英文原名，規則文字為本遊戲實際執行的中文敘述，部分卡牌的效果有簡化（例如沒有鵬洛客、寶物與血衍生物）。卡圖來自 Scryfall，無法連線時會使用內建卡框。AI 的 7 套套牌參考 2026 年 9 月標準賽環境的熱門套路（單綠地落、迪米爾中速、伊捷咒術元素、瓊德獻祭、波洛斯快攻、歐佐夫回生、阿佐里斯飛行），以本遊戲收錄的卡重新組成。
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
