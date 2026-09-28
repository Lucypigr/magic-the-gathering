export interface Tuning {
  /** 生物以外的動作需要超過的價值門檻 */
  actThreshold: number;
  /** 非生物咒語的門檻 */
  spellThreshold: number;
  /** 閃現生物留到對手回合 */
  holdFlash: boolean;
  /** 沒有戰鬥用途的生物等到戰鬥後才施放 */
  deferCreatures: boolean;
  /** 戰鬥技巧 / 保護咒語只在戰鬥中或回應時使用 */
  holdTricks: boolean;
  /** 攻擊時考慮對手反擊的權重 */
  crackback: number;
  /** 交換阻擋：自己的生物價值 <= 攻擊者價值 × ratio 時才換 */
  tradeRatio: number;
  gangBlocks: boolean;
  /** 在接近致命時提前擋死 */
  chumpMargin: boolean;
  /** 模擬攻擊時假設對手用哪種等級阻擋 */
  predictBlocks: 'normal' | 'hard';
  strictMulligan: boolean;
}

export const TUNING: Record<'normal' | 'hard', Tuning> = {
  normal: {
    actThreshold: 0.5,
    spellThreshold: 0.9,
    holdFlash: false,
    deferCreatures: false,
    holdTricks: false,
    crackback: 0.7,
    tradeRatio: 1.1,
    gangBlocks: false,
    chumpMargin: false,
    predictBlocks: 'normal',
    strictMulligan: false,
  },
  hard: {
    actThreshold: 0.3,
    spellThreshold: 0.6,
    holdFlash: true,
    deferCreatures: true,
    holdTricks: true,
    crackback: 1,
    tradeRatio: 0.95,
    gangBlocks: true,
    chumpMargin: true,
    predictBlocks: 'hard',
    strictMulligan: true,
  },
};
