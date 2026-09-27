import { registerCards } from '../engine/registry';
import type { CardDef, SetCode } from '../engine/types';
import { CARDS } from './cards';
import { TOKENS } from './tokens';

registerCards(CARDS);
registerCards(TOKENS);

export { CARDS, BASIC_LANDS, slug } from './cards';
export { TOKENS } from './tokens';
export * from './decks';

export const SET_INFO: Record<Exclude<SetCode, 'TOK'>, { name: string; short: string; desc: string }> = {
  FDN: { name: '基本系列：基石（Foundations）', short: '基石', desc: '萬智牌最新的基本系列，收錄經典又好用的卡牌。' },
  CORE: { name: '經典核心系列（M10–M21）', short: '核心', desc: '歷年核心系列的經典卡牌。' },
  META: { name: '競技環境精選', short: '環境', desc: '出現在競技環境套牌中的強力卡牌，稀有度較高。' },
  BAS: { name: '基本地', short: '基本地', desc: '' },
};

export const COLLECTIBLE: CardDef[] = CARDS.filter((c) => c.set !== 'BAS');

export function cardsInSet(set: SetCode): CardDef[] {
  return CARDS.filter((c) => c.set === set);
}
