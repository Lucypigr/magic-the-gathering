# 萬智牌決鬥場

單人的萬智牌（Magic: The Gathering）對戰遊戲：和三種難度的 AI 對戰、贏金幣買補充包、開包收集卡牌，並用收藏自由組牌。

- **對戰**：完整的回合流程（重置、維持、抓牌、主要階段、戰鬥、結束）、堆疊與優先權、觸發式與起動式異能、先攻／連擊／死觸／踐踏／繫命等關鍵字。
- **AI**：簡單、普通、困難三種難度。AI 從 7 套參考 2026 年 9 月標準賽環境的套牌中隨機挑一套。
- **玩家**：一開始有兩套基本套牌（紅白「烈焰軍團」、綠藍「森海巨獸」）。
- **經濟**：勝利或落敗都會得到金幣，在商店購買補充包；每包 12 張、隨機掉落，至少 1 張稀有或秘稀。
- **組牌**：只要是收藏中的卡都能自由搭配（至少 40 張、同名最多 4 張、基本地無限）。
- **存檔**：自動保存在瀏覽器（localStorage）。

## 開始遊玩

需要 Node.js 20 以上。

```bash
npm install
npm run dev          # 開發模式，打開終端機顯示的網址
```

### 真實卡圖（建議先做一次）

```bash
npm run fetch-images   # 從 Scryfall 下載全部卡圖到 public/cards/（約 170 張，只需執行一次）
```

下載後網站會直接讀取本機圖片，不必每次連線；還沒下載時遊戲會即時向 Scryfall 取圖，連不上則使用內建卡框。卡圖版權屬於 Wizards of the Coast，本專案只供私人使用，`public/cards/` 預設不會提交到 git；若你的 repo 是私人的、想一起保存，把 `.gitignore` 裡那一行刪掉即可。

其他指令：

```bash
npm run build        # 產生靜態網站到 dist/，可放到任何靜態主機（例如 GitHub Pages）
npm run build:single # 產生單一 HTML 檔 dist-single/index.html，雙擊即可遊玩（卡圖即時向 Scryfall 取得）
npm run build:offline # 同上，並把已下載的卡圖內嵌進檔案，完全離線也有卡圖（需先 fetch-images）
npm test             # 規則單元測試 + AI 自動對戰測試
BALANCE=1 npx vitest run tests/balance.test.ts   # 各難度 AI 互打勝率
```

## 卡牌與系列

目前收錄約 170 張卡，分成三個補充包：

| 補充包 | 內容 | 價格 |
| --- | --- | --- |
| 基本系列：基石（Foundations） | 最新基本系列的經典卡 | 100 金幣 |
| 經典核心系列（M10–M21） | 歷年核心系列的卡 | 100 金幣 |
| 競技環境精選 | 出現在競技環境套牌中的強卡，稀有度較高 | 180 金幣 |

卡名使用英文原名，規則文字是本遊戲實際執行的中文敘述。部分卡牌做了簡化，例如沒有鵬洛客、寶物與血衍生物，「英勇」和「增幅」等機制改成遊戲內能處理的形式。卡圖會從 [Scryfall](https://scryfall.com/) 載入（只取圖片網址並快取在瀏覽器），無法連線時改用內建卡框。

## AI 的 7 套環境套牌

參考 2026 年 9 月標準賽的熱門套路，用本遊戲收錄的卡重新組成：

| 套牌 | 參考套路 | 風格 |
| --- | --- | --- |
| 單綠地落 | Mono-Green Landfall | 林奧那精靈加速，苔生九頭龍、刺毛比爾靠地落成長 |
| 迪米爾中速 | Dimir Midrange | 閃現生物、大量除去與反擊 |
| 伊捷咒術元素 | Izzet Spellementals | 廉價咒語過濾，低費放出渦旋泥蟹、風暴翼實體 |
| 瓊德獻祭 | Jund Sacrifice | 犧牲生物換價值，惡魔騷亂把死亡變成傷害 |
| 波洛斯快攻 | Boros Aggro／Boros Burn | 英勇老鼠、戰鬥技巧、燒傷咒語 |
| 歐佐夫回生 | Orzhov Lifegain | 獲得生命就讓生物成長、讓對手流血 |
| 阿佐里斯飛行 | Azorius Fliers | 飛行生物從空中進攻，反擊保護優勢 |

環境資料來源：[MTGDecks Standard](https://mtgdecks.net/Standard)、[Metagame Mentor（magic.gg）](https://magic.gg/news/metagame-mentor-hottest-standard-decks-winning-september-2026-rcqs)、[MTGGoldfish 套牌庫](https://www.mtggoldfish.com/archetype/standard-mono-green-landfall-woe)。

## 難度

| 難度 | AI 行為 | 勝利／落敗獎勵 |
| --- | --- | --- |
| 簡單 | 隨意出牌、隨機攻擊與阻擋 | 60／15 金幣 |
| 普通 | 模擬推演每個動作的結果來選擇，但不會在你的回合主動出手，偶爾選錯 | 100／25 金幣 |
| 困難 | 會回應你的咒語、在你攻擊時使用除去、保留戰鬥技巧與閃現生物，推演所有攻擊組合並考慮反擊 | 160／40 金幣 |

用 AI 互打測試的勝率：普通對簡單約 87%，困難對普通約 58%。

## 專案結構

```
src/
  engine/   規則引擎：型別（卡牌 DSL）、法術力、區域、效果、戰鬥、回合流程、對戰控制器
  ai/       AI：盤面評估、模擬推演、攻擊與阻擋、難度參數
  data/     卡牌資料、衍生物、玩家與 AI 套牌
  meta/     存檔、補充包、金幣經濟
  ui/       React 介面：對戰、套牌組建、收藏、商店、說明
tests/      規則測試、AI 對戰測試、平衡測試
```

卡牌能力以宣告式資料描述，例如：

```ts
cr('FDN', 'R', 'Mossborn Hydra', '{2}{G}', 'Elemental Hydra', 0, 0,
  '踐踏\n此生物進戰場時上面有一個+1/+1指示物。\n地落—每當一個地在你的操控下進戰場時，將此生物上的+1/+1指示物數量加倍。',
  {
    keywords: ['trample'],
    etbCounters: 1,
    abilities: [trig('landfall', [{ e: 'doubleCounters', what: 'self' }])],
  });
```

新增卡牌時在 `src/data/cards.ts` 加一筆資料即可；新增 AI 套牌則在 `src/data/decks.ts` 的 `AI_DECKS` 加入清單。

本專案為非官方的愛好者作品，與 Wizards of the Coast 無關。
