# 萬智牌決鬥場

單人的萬智牌（Magic: The Gathering）對戰遊戲：和三種難度的 AI 對戰、贏金幣買補充包、開包收集卡牌，並用收藏自由組牌。支援「自由模式」與「標準模式」兩種賽制。

- **對戰**：完整的回合流程（重置、維持、抓牌、主要階段、戰鬥、結束）、堆疊與優先權、觸發式與起動式異能、先攻／連擊／死觸／踐踏／繫命等關鍵字。
- **賽制**：自由模式可以用任何收藏中的卡（至少 40 張）；標準模式只能用 2026 年 9 月標準賽合法的卡（至少 60 張，禁卡除外）。
- **AI**：簡單、普通、困難三種難度。每種賽制各有 7 套 AI 環境套牌，對戰時隨機挑一套或自己指定。
- **玩家**：一開始有四套入門套牌：自由模式的紅白「烈焰軍團」、綠藍「森海巨獸」，標準模式的白藍「晨光飛翼」、黑綠「林地獵群」。
- **經濟**：勝利或落敗都會得到金幣，在商店購買補充包；每包 12 張、隨機掉落，至少 1 張稀有或秘稀。
- **組牌**：收藏中的卡都能自由搭配（同名最多 4 張、基本地無限），組牌畫面會同時顯示兩種賽制是否合法。
- **存檔**：自動保存在瀏覽器（localStorage）。

## 開始遊玩

需要 Node.js 20 以上。

```bash
npm install
npm run dev          # 開發模式，打開終端機顯示的網址
```

### 真實卡圖（建議先做一次）

```bash
npm run fetch-images   # 從 Scryfall 下載全部卡圖到 public/cards/（約 1,400 張，只需執行一次）
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

## 部署到 GitHub Pages

專案已附上自動部署設定（`.github/workflows/deploy.yml`），每次推送到 `main` 都會自動測試、建置並發佈。

1. GitHub 上的 repo → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
2. 把程式合併到 `main`（或到 **Actions** 頁面手動執行「部署到 GitHub Pages」）。
3. 完成後網址是 `https://<你的帳號>.github.io/magic-the-gathering/`。

部署後卡圖會在瀏覽器裡直接向 Scryfall 取得，不需要先下載。注意：免費帳號的 GitHub Pages 網址任何人都能打開，只是不會主動出現在任何地方；卡圖不會放進 repo。

## 卡牌與系列

目前收錄約 1,400 張卡。

### 標準賽系列（標準模式可用）

2026 年 9 月的標準賽包含以下 18 個系列，每個系列都有自己的補充包（100 金幣，五包 450 金幣）：

| 代碼 | 系列 | 發售 |
| --- | --- | --- |
| WOE | Wilds of Eldraine | 2023/09 |
| LCI | The Lost Caverns of Ixalan | 2023/11 |
| MKM | Murders at Karlov Manor | 2024/02 |
| OTJ | Outlaws of Thunder Junction | 2024/04 |
| BLB | Bloomburrow | 2024/08 |
| DSK | Duskmourn: House of Horror | 2024/09 |
| FDN | Foundations | 2024/11 |
| DFT | Aetherdrift | 2025/02 |
| TDM | Tarkir: Dragonstorm | 2025/04 |
| FIN | Final Fantasy | 2025/06 |
| EOE | Edge of Eternities | 2025/08 |
| SPM | Marvel's Spider-Man | 2025/09 |
| TLA | Avatar: The Last Airbender | 2025/11 |
| ECL | Lorwyn Eclipsed | 2026/01 |
| TMT | Teenage Mutant Ninja Turtles | 2026/03 |
| SOS | Secrets of Strixhaven | 2026/04 |
| MSH | Marvel Super Heroes | 2026/06 |
| HOB | The Hobbit | 2026/08 |

每個系列收錄 55–95 張能在遊戲裡運作的卡（不是整個系列），包含環境常用的卡、各系列的雙色地與震地。卡牌資料（名稱、費用、類別、力量／防禦力、稀有度、標準賽合法性與禁卡）取自 [Scryfall](https://scryfall.com/)。下一次輪替在 2027 年 2 月，屆時 WOE 到 DSK 會離開標準賽。

### 經典補充包（自由模式用）

| 補充包 | 內容 | 價格 |
| --- | --- | --- |
| 經典核心系列（M10–M21） | 歷年核心系列的卡 | 100 金幣 |
| 競技環境精選 | 過去環境中的強卡，稀有度較高 | 180 金幣 |

經典卡中仍在標準賽合法的（例如在現行系列重印過的卡）也能用於標準模式；卡牌詳細資訊會標示「標準賽合法／非標準賽／標準賽禁卡」。

### 卡牌效果

規則文字是本遊戲實際執行的中文敘述。部分卡牌做了簡化：沒有鵬洛客、載具、冒險、雙面牌與寶物；大地彎折改成派出帶指示物的大地元素、生存改在結束步驟檢查等。卡名預設顯示中文（從 Scryfall 取得繁中或簡中版卡名），在設定中可以切換成英文。

## AI 的環境套牌

### 標準模式（2026 年 9 月標準賽）

| 套牌 | 參考套路 | 風格 |
| --- | --- | --- |
| 單綠地落 | Mono-Green Landfall | 精靈加速，蒂法與地落生物靠每個地變大 |
| 迪米爾中速 | Dimir Midrange | 閃現生物、報應咒法等便宜除去 |
| 伊捷咒術元素 | Izzet Spellementals | 大量廉價咒語觸發樂章與勇行，渦旋泥蟹、碎群者收尾 |
| 波洛斯矮人 | Boros Dwarves | 矮人搭配武具，連擊的斧頭一擊致命 |
| 瓊德獻祭 | Jund Sacrifice | 犧牲小生物換價值，每次死亡都讓對手流血 |
| 拉克多斯鬼怪 | Rakdos Goblins | 大鬼怪領軍，集結鬼怪軍隊造成傷害 |
| 阿佐里斯控制 | Azorius Control | 除去與反擊拖到後期，再用飛行大生物收尾 |

環境資料來源：[Metagame Mentor（magic.gg）](https://magic.gg/news/metagame-mentor-the-top-standard-decks-for-september-2026s-rcqs)、[MTGDecks Standard](https://mtgdecks.net/Standard)、[Draftsim：2026 與 2027 年標準賽輪替](https://draftsim.com/mtg-standard-rotation/)。

### 自由模式

使用經典卡組成的 7 套套牌：單綠地落、迪米爾中速、伊捷咒術元素、瓊德獻祭、波洛斯快攻、歐佐夫回生、阿佐里斯飛行。

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
  data/     卡牌資料（sets/ 為標準賽各系列）、衍生物、玩家與 AI 套牌
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

經典卡在 `src/data/cards.ts`，標準賽各系列的卡在 `src/data/sets/`（每個系列一個檔案）。重印與禁卡清單在 `src/data/reprints.ts`；自由模式的套牌在 `src/data/decks.ts`，標準模式的套牌在 `src/data/standardDecks.ts`。

本專案為非官方的愛好者作品，與 Wizards of the Coast 無關。
