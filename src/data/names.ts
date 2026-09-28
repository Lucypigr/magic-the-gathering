// 顯示用的卡名。規則引擎一律以英文原名辨識卡牌，只有顯示在畫面與紀錄時才換成中文。
// 中文卡名由介面層（ui/images.ts）向 Scryfall 取得後填入。

interface Named {
  name: string;
  zh?: string;
}

const zhNames = new Map<string, string>();
let useZh = false;

export function setCardLanguage(zh: boolean): void {
  useZh = zh;
}

export function setZhNames(entries: Iterable<[string, string]>): void {
  for (const [en, zh] of entries) zhNames.set(en.toLowerCase(), zh);
}

/** 中文卡名（沒有就回傳 undefined），不受語言設定影響 */
export function zhName(def: Named): string | undefined {
  return zhNames.get(def.name.toLowerCase()) ?? def.zh;
}

/** 依目前的語言設定回傳要顯示的卡名 */
export function displayName(def: Named): string {
  return (useZh && zhName(def)) || def.name;
}
