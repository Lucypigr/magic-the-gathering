import type { CardDef, Color, Keyword, Phase, Rarity } from '../engine/types';

export const TYPE_ZH: Record<string, string> = {
  Creature: '生物',
  Instant: '瞬間',
  Sorcery: '法術',
  Enchantment: '結界',
  Artifact: '神器',
  Land: '地',
};

export const SUPER_ZH: Record<string, string> = { Basic: '基本', Legendary: '傳奇' };

export const SUB_ZH: Record<string, string> = {
  Cat: '貓',
  Human: '人類',
  Soldier: '士兵',
  Bird: '鳥',
  Cleric: '僧侶',
  Pegasus: '飛馬',
  Angel: '天使',
  Knight: '騎士',
  Aura: '靈氣',
  Spirit: '精怪',
  Pirate: '海盜',
  Merfolk: '人魚',
  Drake: '飛龍',
  Wizard: '巫師',
  Jellyfish: '水母',
  Glimmer: '微光',
  Elemental: '元素',
  Serpent: '海蛇',
  Djinn: '巨靈',
  Crab: '蟹',
  Vampire: '吸血鬼',
  Warlock: '術士',
  Zombie: '靈俑',
  Rat: '鼠',
  Shaman: '祭師',
  Horror: '怪物',
  Skeleton: '骷髏',
  Archer: '弓箭手',
  Monk: '武僧',
  Mouse: '老鼠',
  Lizard: '蜥蜴',
  Mercenary: '傭兵',
  Goblin: '鬼怪',
  Berserker: '狂戰士',
  Warrior: '戰士',
  Rogue: '浪客',
  Devil: '魔鬼',
  Dragon: '龍',
  Egg: '蛋',
  Ogre: '食人魔',
  Giant: '巨人',
  Beast: '野獸',
  Elf: '精靈',
  Druid: '德魯伊',
  Ooze: '泥怪',
  Plant: '植物',
  Bear: '熊',
  Hydra: '九頭龍',
  Centaur: '半人馬',
  Rhino: '犀牛',
  Dinosaur: '恐龍',
  Equipment: '武具',
  Role: '角色',
  Food: '食物',
  Goat: '山羊',
  Plains: '平原',
  Island: '海島',
  Swamp: '沼澤',
  Mountain: '山脈',
  Forest: '樹林',
};

export const KW_ZH: Record<Keyword, string> = {
  flying: '飛行',
  reach: '延勢',
  first_strike: '先攻',
  double_strike: '連擊',
  deathtouch: '死觸',
  trample: '踐踏',
  lifelink: '繫命',
  vigilance: '警戒',
  haste: '敏捷',
  menace: '威懾',
  defender: '守軍',
  indestructible: '不滅',
  hexproof: '辟邪',
  flash: '閃現',
  prowess: '勇行',
  unblockable: '不能被阻擋',
};

export const KW_DESC: Record<Keyword, string> = {
  flying: '只能被具有飛行或延勢的生物阻擋。',
  reach: '可以阻擋具有飛行的生物。',
  first_strike: '在沒有先攻的生物之前造成戰鬥傷害。',
  double_strike: '先攻傷害與一般傷害各造成一次。',
  deathtouch: '對生物造成的任何傷害都足以消滅它。',
  trample: '對阻擋者造成致命傷害後，多餘的傷害可以打到玩家身上。',
  lifelink: '此生物造成傷害時，你獲得等量的生命。',
  vigilance: '攻擊時不需要橫置。',
  haste: '進場的回合就能攻擊與使用 {T} 異能。',
  menace: '只能被兩個或更多生物阻擋。',
  defender: '不能攻擊。',
  indestructible: '不會因傷害或「消滅」效果而被置入墳墓場。',
  hexproof: '不能成為對手的咒語或異能的目標。',
  flash: '可以在任何你能施放瞬間的時機施放。',
  prowess: '每當你施放非生物咒語時，此生物得+1/+1直到回合結束。',
  unblockable: '這個生物不能被阻擋。',
};

export const KW_ICON: Partial<Record<Keyword, string>> = {
  flying: '翼',
  reach: '延',
  first_strike: '先',
  double_strike: '連',
  deathtouch: '死',
  trample: '踐',
  lifelink: '命',
  vigilance: '警',
  haste: '敏',
  menace: '懾',
  defender: '守',
  indestructible: '滅',
  hexproof: '辟',
  prowess: '勇',
  unblockable: '穿',
};

export const PHASE_ZH: Record<Phase, string> = {
  setup: '準備',
  untap: '重置',
  upkeep: '維持',
  draw: '抓牌',
  main1: '主要階段 1',
  combat_begin: '戰鬥開始',
  combat_attackers: '宣告攻擊',
  combat_blockers: '宣告阻擋',
  combat_damage_first: '先攻傷害',
  combat_damage: '戰鬥傷害',
  combat_end: '戰鬥結束',
  main2: '主要階段 2',
  end: '結束步驟',
  cleanup: '清除',
};

export const RARITY_ZH: Record<Rarity, string> = { C: '普通', U: '非普通', R: '稀有', M: '秘稀', L: '基本地', T: '衍生物' };

export const COLOR_ZH: Record<Color, string> = { W: '白', U: '藍', B: '黑', R: '紅', G: '綠' };

export const LEVEL_ZH = { easy: '簡單', normal: '普通', hard: '困難' } as const;

export function typeLine(def: CardDef): string {
  const sup = (def.supertypes ?? []).map((s) => SUPER_ZH[s] ?? s).join('');
  const types = def.types.map((t) => TYPE_ZH[t] ?? t).join('');
  const subs = (def.subtypes ?? []).map((s) => SUB_ZH[s] ?? s).join('／');
  return `${sup}${types}${subs ? ' — ' + subs : ''}`;
}
