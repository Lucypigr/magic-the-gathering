import type { Color } from '../engine/types';
import { slug } from './cards';

export interface DeckList {
  id: string;
  name: string;
  desc: string;
  colors: Color[];
  /** 卡牌 id → 張數 */
  cards: Record<string, number>;
  /** AI 風格 */
  style?: 'aggro' | 'midrange' | 'control' | 'tempo';
  /** 環境參考 */
  meta?: string;
}

function deck(id: string, name: string, desc: string, colors: Color[], list: [number, string][], extra: Partial<DeckList> = {}): DeckList {
  const cards: Record<string, number> = {};
  for (const [n, nm] of list) cards[slug(nm)] = (cards[slug(nm)] ?? 0) + n;
  return { id, name, desc, colors, cards, ...extra };
}

export function deckSize(d: { cards: Record<string, number> }): number {
  return Object.values(d.cards).reduce((a, b) => a + b, 0);
}

export function expandDeck(d: { cards: Record<string, number> }): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(d.cards)) for (let i = 0; i < n; i++) out.push(id);
  return out;
}

// ============================================================
// 玩家的兩套基本套牌
// ============================================================
export const STARTER_DECKS: DeckList[] = [
  deck(
    'starter-boros',
    '烈焰軍團（紅白）',
    '快速展開小生物，用燒傷咒語清除障礙，再以戰鬥技巧打穿對手。',
    ['R', 'W'],
    [
      [7, 'Plains'],
      [8, 'Mountain'],
      [2, 'Wind-Scarred Crag'],
      [3, 'Savannah Lions'],
      [2, 'Fanatical Firebrand'],
      [2, 'Goblin Instigator'],
      [2, 'Viashino Pyromancer'],
      [2, 'Inspiring Overseer'],
      [2, 'Pegasus Courser'],
      [2, 'Onakke Ogre'],
      [2, 'Aven Sentry'],
      [2, 'Hill Giant'],
      [2, 'Keldon Raider'],
      [1, 'Serra Angel'],
      [3, 'Shock'],
      [2, 'Lightning Strike'],
      [2, 'Pacifism'],
      [2, 'Raise the Alarm'],
      [2, 'Sure Strike'],
      [1, 'Inspired Charge'],
      [2, 'Divine Verdict'],
      [2, "Krenko's Command"],
      [2, 'Tactical Advantage'],
      [2, 'Revitalize'],
      [1, 'Take Vengeance'],
    ],
    { style: 'aggro' },
  ),
  deck(
    'starter-simic',
    '森海巨獸（綠藍）',
    '用精靈加速法術力，放出大型生物；藍色的彈回與反擊咒語保護你的節奏。',
    ['G', 'U'],
    [
      [9, 'Forest'],
      [6, 'Island'],
      [2, 'Thornwood Falls'],
      [3, 'Llanowar Elves'],
      [3, 'Grizzly Bears'],
      [2, 'Brineborn Cutthroat'],
      [3, 'Centaur Courser'],
      [2, 'Wind Drake'],
      [2, "Man-o'-War"],
      [2, 'Llanowar Visionary'],
      [1, 'Air Elemental'],
      [2, 'Frilled Sea Serpent'],
      [2, 'Colossal Dreadmaw'],
      [2, 'Gnarlback Rhino'],
      [3, 'Giant Growth'],
      [2, 'Titanic Growth'],
      [2, 'Unsummon'],
      [2, 'Divination'],
      [2, 'Essence Scatter'],
      [3, 'Rabid Bite'],
      [2, 'Prey Upon'],
      [3, 'Opt'],
    ],
    { style: 'midrange' },
  ),
];

// ============================================================
// AI 的 7 套環境套牌（參考 2026 年 9 月標準賽環境）
// ============================================================
export const AI_DECKS: DeckList[] = [
  deck(
    'ai-mono-green-landfall',
    '單綠地落',
    '環境最強套牌之一：林奧那精靈加速，地落觸發讓苔生九頭龍與刺毛比爾快速成長。',
    ['G'],
    [
      [16, 'Forest'],
      [4, 'Evolving Wilds'],
      [2, 'Fabled Passage'],
      [4, 'Llanowar Elves'],
      [4, 'Bristly Bill, Spine Sower'],
      [4, 'Mossborn Hydra'],
      [2, 'Thornweald Archer'],
      [2, 'Scavenging Ooze'],
      [3, 'Steel Leaf Champion'],
      [3, 'Gnarlback Rhino'],
      [2, 'Llanowar Visionary'],
      [2, 'Rampaging Baloths'],
      [3, 'Snakeskin Veil'],
      [2, 'Giant Growth'],
      [3, 'Rabid Bite'],
      [2, 'Up the Beanstalk'],
      [2, 'Titanic Growth'],
    ],
    { style: 'aggro', meta: 'Mono-Green Landfall' },
  ),
  deck(
    'ai-dimir-midrange',
    '迪米爾中速',
    '閃現生物搭配大量除去與反擊，用持久好奇心累積卡差。',
    ['U', 'B'],
    [
      [9, 'Island'],
      [8, 'Swamp'],
      [4, 'Darkslick Shores'],
      [3, 'Dismal Backwater'],
      [4, 'Floodpits Drowner'],
      [2, 'Spectral Sailor'],
      [2, 'Brineborn Cutthroat'],
      [3, 'Enduring Curiosity'],
      [3, 'Vampire Nighthawk'],
      [2, 'Preacher of the Schism'],
      [3, 'Cut Down'],
      [2, 'Go for the Throat'],
      [2, 'Bitter Triumph'],
      [2, 'Shoot the Sheriff'],
      [2, 'Essence Scatter'],
      [2, 'Spell Pierce'],
      [3, 'Opt'],
      [2, 'Fading Hope'],
      [2, 'Infernal Grasp'],
    ],
    { style: 'control', meta: 'Dimir Midrange' },
  ),
  deck(
    'ai-izzet-spells',
    '伊捷咒術元素',
    '大量廉價咒語過濾牌庫，讓風暴翼實體、渦旋泥蟹以低費登場，再用燒傷收尾。',
    ['U', 'R'],
    [
      [7, 'Island'],
      [6, 'Mountain'],
      [4, 'Spirebluff Canal'],
      [4, 'Swiftwater Cliffs'],
      [4, 'Monastery Swiftspear'],
      [2, 'Slickshot Show-Off'],
      [2, 'Brineborn Cutthroat'],
      [3, 'Stormwing Entity'],
      [2, 'Eddymurk Crab'],
      [2, 'Tolarian Terror'],
      [4, 'Opt'],
      [2, 'Consider'],
      [2, 'Sleight of Hand'],
      [4, 'Burst Lightning'],
      [2, 'Shock'],
      [2, 'Lightning Strike'],
      [2, 'Izzet Charm'],
      [2, 'Spell Pierce'],
      [2, 'Fading Hope'],
      [2, 'Strangle'],
    ],
    { style: 'tempo', meta: 'Izzet Spellementals' },
  ),
  deck(
    'ai-jund-sacrifice',
    '瓊德獻祭',
    '犧牲自己的生物換取價值，惡魔騷亂與復仇血巫讓每次死亡都變成傷害。',
    ['B', 'R', 'G'],
    [
      [7, 'Swamp'],
      [5, 'Mountain'],
      [3, 'Forest'],
      [3, 'Blackcleave Cliffs'],
      [2, 'Bloodfell Caves'],
      [2, 'Blooming Marsh'],
      [1, 'Rugged Highlands'],
      [3, 'Viscera Seer'],
      [2, 'Fanatical Firebrand'],
      [4, 'Vengeful Bloodwitch'],
      [2, 'Doomed Dissenter'],
      [2, 'Scavenging Ooze'],
      [3, 'Woe Strider'],
      [4, 'Mayhem Devil'],
      [2, 'Beetleback Chief'],
      [2, 'Gravedigger'],
      [1, 'Dragon Egg'],
      [3, 'Village Rites'],
      [2, 'Bake into a Pie'],
      [2, 'Putrefy'],
      [2, 'Dreadbore'],
      [2, 'Burst Lightning'],
      [1, "Krenko's Command"],
    ],
    { style: 'midrange', meta: 'Jund Sacrifice' },
  ),
  deck(
    'ai-boros-aggro',
    '波洛斯快攻',
    '一費生物搶攻，英勇老鼠配上戰鬥技巧與燒傷，力求在第五回合前結束比賽。',
    ['R', 'W'],
    [
      [11, 'Mountain'],
      [3, 'Plains'],
      [4, 'Inspiring Vantage'],
      [2, 'Wind-Scarred Crag'],
      [4, 'Monastery Swiftspear'],
      [4, 'Heartfire Hero'],
      [3, 'Hired Claw'],
      [3, 'Emberheart Challenger'],
      [2, 'Manifold Mouse'],
      [2, 'Slickshot Show-Off'],
      [2, 'Screaming Nemesis'],
      [2, 'Cathar Commando'],
      [4, 'Burst Lightning'],
      [3, 'Lightning Helix'],
      [2, 'Boltwave'],
      [3, 'Monstrous Rage'],
      [2, 'Might of the Meek'],
      [2, 'Boros Charm'],
      [2, 'Leyline Axe'],
    ],
    { style: 'aggro', meta: 'Boros Aggro / Boros Dwarves' },
  ),
  deck(
    'ai-orzhov-lifegain',
    '歐佐夫回生',
    '每次獲得生命都會讓生物成長、讓對手流血。',
    ['W', 'B'],
    [
      [8, 'Plains'],
      [7, 'Swamp'],
      [4, 'Scoured Barrens'],
      [4, 'Concealed Courtyard'],
      [3, "Healer's Hawk"],
      [2, 'Soul Warden'],
      [4, "Ajani's Pridemate"],
      [2, 'Vito, Thorn of the Dusk Rose'],
      [3, 'Marauding Blight-Priest'],
      [3, 'Vampire Nighthawk'],
      [2, 'Twinblade Paladin'],
      [2, 'Angel of Vitality'],
      [2, 'Resplendent Angel'],
      [2, 'Bloodthirsty Conqueror'],
      [2, "Ajani's Welcome"],
      [2, "Sovereign's Bite"],
      [2, 'Infernal Grasp'],
      [2, 'Anguished Unmaking'],
      [2, 'Revitalize'],
      [2, 'Banishing Light'],
    ],
    { style: 'midrange', meta: 'Orzhov Lifegain' },
  ),
  deck(
    'ai-azorius-fliers',
    '阿佐里斯飛行',
    '大量飛行生物從空中進攻，反擊咒語與除去保護優勢。',
    ['W', 'U'],
    [
      [8, 'Plains'],
      [7, 'Island'],
      [4, 'Seachrome Coast'],
      [4, 'Tranquil Cove'],
      [4, "Healer's Hawk"],
      [3, 'Spectral Sailor'],
      [3, 'Warden of Evos Isle'],
      [2, 'Pegasus Courser'],
      [4, 'Inspiring Overseer'],
      [2, 'Angel of Vitality'],
      [2, 'Serra Angel'],
      [1, 'Lyra Dawnbringer'],
      [1, 'Air Elemental'],
      [2, 'Essence Scatter'],
      [2, 'Absorb'],
      [2, 'Valorous Stance'],
      [2, 'Glorious Anthem'],
      [2, 'Banishing Light'],
      [2, 'Stroke of Midnight'],
      [3, 'Opt'],
    ],
    { style: 'tempo', meta: 'Azorius Fliers' },
  ),
];
