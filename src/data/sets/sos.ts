// Secrets of Strixhaven（SOS，2026 年 4 月）
// 樂章（Opus）：每當你施放瞬間或法術咒語時觸發；法術力值5以上的咒語有額外效果。
// 灌注（Infusion）：若你本回合獲得過生命。
import type { Cond, Filter, Mana } from '../../engine/types';
import {
  ANY,
  CR,
  MY_CR,
  OPP,
  OPP_CR,
  act,
  arti,
  cr,
  destroyT0,
  ench,
  etb,
  inst,
  land,
  sorc,
  tapland,
  trig,
} from '../dsl';

const S = 'SOS';
const INST_SORC: Filter = { type: ['Instant', 'Sorcery'] };
const BIG_SPELL: Filter = { type: ['Instant', 'Sorcery'], mvMin: 5 };
const INFUSION: Cond = { c: 'gainedLifeGte', n: 1 };

// 雙色地
const slowland = (name: string, a: Mana, b: Mana) =>
  land(S, 'R', name, [a, b], `除非你操控兩個或更多其他地，否則此地橫置進戰場。\n{T}：加{${a}}或{${b}}。`, {
    etbTappedUnless: { c: 'controls', filter: { type: 'Land' }, n: 2 },
  });
slowland('Deathcap Glade', 'B', 'G');
slowland('Dreamroot Cascade', 'G', 'U');
slowland('Shattered Sanctum', 'W', 'B');
slowland('Stormcarved Coast', 'U', 'R');
slowland('Sundown Pass', 'R', 'W');
const surveilland = (name: string, a: Mana, b: Mana) =>
  tapland(S, 'C', name, a, b, {
    abilities: [act({ mana: `{2}{${a}}{${b}}`, tap: true }, [{ e: 'surveil', n: 1 }], '刺探1')],
  }, `{2}{${a}}{${b}}，{T}：刺探1。`);
surveilland('Fields of Strife', 'R', 'W');
surveilland('Forum of Amity', 'W', 'B');
surveilland('Paradox Gardens', 'G', 'U');
surveilland('Spectacle Summit', 'U', 'R');
surveilland("Titan's Grave", 'B', 'G');
land(S, 'C', 'Terramorphic Expanse', [], '{T}，犧牲此地：從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場，然後將你的牌庫洗牌。', {
  abilities: [act({ tap: true, sacSelf: true }, [{ e: 'searchLand', to: 'battlefield', tapped: true }], '搜尋基本地')],
});

// ---------------- 白 ----------------
inst(S, 'R', 'Erode', '{W}', '消滅目標生物。其操控者可以從其牌庫中搜尋一張基本地牌，將它橫置放進戰場。', {
  targets: [CR],
  effects: [destroyT0, { e: 'searchLand', to: 'battlefield', tapped: true, who: 'T0ctrl' }],
});
inst(S, 'U', 'Harsh Annotation', '{1}{W}', '消滅目標生物。其操控者派出一個1/1白黑雙色，具飛行異能的墨靈衍生生物。', {
  targets: [CR],
  effects: [destroyT0, { e: 'token', token: 'tok-inkling', who: 'T0ctrl' }],
});
inst(S, 'U', 'Stand Up for Yourself', '{2}{W}', '消滅目標力量為3或更多的生物。', {
  targets: [{ kind: 'creature', filter: { powMin: 3 } }],
  effects: [destroyT0],
});
inst(S, 'C', "Ajani's Response", '{4}{W}', '若此咒語以已橫置的生物為目標，則減少{3}來施放。\n消滅目標生物。', {
  modes: [
    { text: '消滅已橫置的生物（{1}{W}）', cost: '{1}{W}', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [destroyT0] },
    { text: '消滅生物', targets: [CR], effects: [destroyT0] },
  ],
});
inst(S, 'C', 'Interjection', '{W}', '目標生物得+2/+2並獲得先攻異能直到回合結束。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['first_strike'] }],
});
cr(S, 'C', 'Eager Glyphmage', '{3}{W}', 'Cat Cleric', 3, 3, '當此生物進戰場時，派出一個1/1白黑雙色，具飛行異能的墨靈衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-inkling' }])],
});
cr(S, 'C', 'Owlin Historian', '{2}{W}', 'Bird Cleric', 2, 3, '飛行\n當此生物進戰場時，刺探1。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'surveil', n: 1 }])],
});
cr(S, 'C', 'Shattered Acolyte', '{1}{W}', 'Dwarf Warlock', 2, 2, '繫命\n{1}，犧牲此生物：消滅目標神器或結界。', {
  keywords: ['lifelink'],
  abilities: [
    act({ mana: '{1}', sacSelf: true }, [destroyT0], '犧牲：消滅神器或結界', {
      targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Enchantment'] } }],
    }),
  ],
});

// ---------------- 藍 ----------------
cr(S, 'U', 'Matterbending Mage', '{2}{U}', 'Human Wizard', 2, 2, '當此生物進戰場時，將至多一個另外的目標生物移回其擁有者手上。', {
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ kind: 'creature', optional: true, notSelf: true }] })],
});
cr(S, 'U', 'Muse Seeker', '{1}{U}', 'Elf Wizard', 1, 2, '樂章—每當你施放瞬間或法術咒語時，抓一張牌，然後棄一張牌。', {
  abilities: [trig('castInstSorc', [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }])],
});
inst(S, 'C', 'Quick Study', '{2}{U}', '抓兩張牌。', { effects: [{ e: 'draw', n: 2 }] });
inst(S, 'C', 'Banishing Betrayal', '{1}{U}', '將目標非地永久物移回其擁有者手上。刺探1。', {
  targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'surveil', n: 1 }],
});
inst(S, 'C', 'Chase Inspiration', '{U}', '目標由你操控的生物得+0/+3並獲得辟邪異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 0, t: 3, kw: ['hexproof'] }],
});
inst(S, 'C', "Muse's Encouragement", '{4}{U}', '派出一個3/3藍紅雙色，具飛行異能的元素衍生生物。刺探2。', {
  effects: [{ e: 'token', token: 'tok-elemental-ur' }, { e: 'surveil', n: 2 }],
});

// ---------------- 黑 ----------------
sorc(S, 'M', 'Withering Curse', '{1}{B}{B}', '所有生物得-2/-2直到回合結束。\n灌注—若你本回合獲得過生命，改為消滅所有生物。', {
  effects: [
    {
      e: 'if',
      cond: INFUSION,
      then: [{ e: 'destroy', what: { all: { type: 'Creature' } } }],
      else: [{ e: 'pump', what: { all: { type: 'Creature' } }, p: -2, t: -2 }],
    },
  ],
});
cr(S, 'R', 'Tragedy Feaster', '{2}{B}{B}', 'Demon', 7, 6, '踐踏\n灌注—在你的結束步驟開始時，除非你本回合獲得過生命，否則犧牲一個生物。', {
  keywords: ['trample'],
  abilities: [trig('endStep', [{ e: 'if', cond: INFUSION, then: [], else: [{ e: 'edict', who: 'you' }] }])],
});
inst(S, 'U', 'Foolish Fate', '{2}{B}', '消滅目標生物。\n灌注—若你本回合獲得過生命，該生物的操控者失去3點生命。', {
  targets: [CR],
  effects: [{ e: 'if', cond: INFUSION, then: [{ e: 'lose', n: 3, who: 'T0ctrl' }] }, destroyT0],
});
cr(S, 'U', 'Arnyn, Deathbloom Botanist', '{2}{B}', 'Vampire Druid', 2, 2, '死觸\n每當一個由你操控、力量為1或更少的生物死去時，目標對手失去2點生命，且你獲得2點生命。', {
  supertypes: ['Legendary'],
  keywords: ['deathtouch'],
  abilities: [trig('allyDies', [{ e: 'lose', n: 2, who: 'T0' }, { e: 'gain', n: 2 }], { filter: { type: 'Creature', powMax: 1 }, includeSelf: false, targets: [OPP] })],
});
cr(S, 'U', "Poisoner's Apprentice", '{2}{B}', 'Orc Warlock', 2, 2, '灌注—當此生物進戰場時，若你本回合獲得過生命，目標由對手操控的生物得-4/-4直到回合結束。', {
  abilities: [etb([{ e: 'pump', what: 'T0', p: -4, t: -4 }], { targets: [OPP_CR], cond: INFUSION })],
});
inst(S, 'U', 'Dissection Practice', '{B}', '目標對手失去1點生命，且你獲得1點生命。至多一個目標生物得+1/+1直到回合結束。至多一個目標生物得-1/-1直到回合結束。', {
  targets: [OPP, { kind: 'creature', optional: true, prompt: '選擇得+1/+1的生物' }, { kind: 'creature', optional: true, prompt: '選擇得-1/-1的生物' }],
  effects: [
    { e: 'lose', n: 1, who: 'T0' },
    { e: 'gain', n: 1 },
    { e: 'pump', what: 'T1', p: 1, t: 1 },
    { e: 'pump', what: 'T2', p: -1, t: -1 },
  ],
});
inst(S, 'C', 'Last Gasp', '{1}{B}', '目標生物得-3/-3直到回合結束。', { targets: [CR], effects: [{ e: 'pump', what: 'T0', p: -3, t: -3 }] });
inst(S, 'C', 'Wander Off', '{3}{B}', '放逐目標生物。', { targets: [CR], effects: [{ e: 'exile', what: 'T0' }] });
inst(S, 'C', 'Masterful Flourish', '{B}', '目標由你操控的生物得+1/+0並獲得不滅異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 0, kw: ['indestructible'] }],
});
sorc(S, 'C', 'Cost of Brilliance', '{2}{B}', '你抓兩張牌並失去2點生命。在至多一個目標生物上放置一個+1/+1指示物。', {
  targets: [{ kind: 'creature', optional: true }],
  effects: [{ e: 'draw', n: 2 }, { e: 'lose', n: 2, who: 'you' }, { e: 'counters', what: 'T0', n: 1 }],
});
sorc(S, 'C', 'Send in the Pest', '{1}{B}', '每位對手各棄一張牌。你派出一個1/1黑綠雙色害獸衍生生物，它具有「每當此衍生物攻擊時，你獲得1點生命。」', {
  effects: [{ e: 'discard', n: 1, who: 'opp' }, { e: 'token', token: 'tok-pest' }],
});
cr(S, 'C', 'Sneering Shadewriter', '{4}{B}', 'Vampire Warlock', 3, 3, '飛行\n當此生物進戰場時，每位對手失去2點生命，且你獲得2點生命。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'lose', n: 2, who: 'opp' }, { e: 'gain', n: 2 }])],
});
cr(S, 'C', 'Burrog Banemaker', '{B}', 'Frog Warlock', 1, 1, '死觸\n{1}{B}：此生物得+1/+1直到回合結束。', {
  keywords: ['deathtouch'],
  abilities: [act({ mana: '{1}{B}' }, [{ e: 'pump', what: 'self', p: 1, t: 1 }], '+1/+1')],
});
cr(S, 'C', 'Ulna Alley Shopkeep', '{2}{B}', 'Goblin Warlock', 2, 3, '威懾\n灌注—只要你本回合獲得過生命，此生物得+2/+0。', {
  keywords: ['menace'],
  abilities: [{ kind: 'static', self: { cond: INFUSION, grant: { p: 2 } } }],
});

// ---------------- 紅 ----------------
cr(S, 'R', 'Molten-Core Maestro', '{1}{R}', 'Goblin Bard', 2, 2, '威懾\n樂章—每當你施放瞬間或法術咒語時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['menace'],
  abilities: [trig('castInstSorc', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'U', 'Thunderdrum Soloist', '{1}{R}', 'Dwarf Bard', 1, 3, '延勢\n樂章—每當你施放瞬間或法術咒語時，此生物對每位對手各造成1點傷害。若該咒語的法術力值為5或更多，改為造成3點傷害。', {
  keywords: ['reach'],
  abilities: [
    trig('castAny', [{ e: 'damage', n: 1, to: 'opp' }], { filter: { type: ['Instant', 'Sorcery'], mvMax: 4 } }),
    trig('castAny', [{ e: 'damage', n: 3, to: 'opp' }], { filter: BIG_SPELL }),
  ],
});
cr(S, 'U', 'Charging Strifeknight', '{2}{R}', 'Spirit Knight', 3, 3, '敏捷', { keywords: ['haste'] });
cr(S, 'C', 'Expressive Firedancer', '{1}{R}', 'Human Sorcerer', 2, 2, '樂章—每當你施放瞬間或法術咒語時，此生物得+1/+1直到回合結束。若該咒語的法術力值為5或更多，它還獲得連擊異能直到回合結束。', {
  abilities: [
    trig('castInstSorc', [{ e: 'pump', what: 'self', p: 1, t: 1 }]),
    trig('castAny', [{ e: 'pump', what: 'self', p: 0, t: 0, kw: ['double_strike'] }], { filter: BIG_SPELL }),
  ],
});
cr(S, 'C', 'Tackle Artist', '{3}{R}', 'Orc Sorcerer', 4, 3, '踐踏\n樂章—每當你施放瞬間或法術咒語時，在此生物上放置一個+1/+1指示物。若該咒語的法術力值為5或更多，改為放置兩個。', {
  keywords: ['trample'],
  abilities: [
    trig('castInstSorc', [{ e: 'counters', what: 'self', n: 1 }]),
    trig('castAny', [{ e: 'counters', what: 'self', n: 1 }], { filter: BIG_SPELL }),
  ],
});
cr(S, 'C', 'Rearing Embermare', '{4}{R}', 'Horse Beast', 4, 5, '延勢，敏捷', { keywords: ['reach', 'haste'] });
cr(S, 'C', 'Rubble Rouser', '{2}{R}', 'Dwarf Sorcerer', 1, 4, '當此生物進戰場時，你可以棄一張牌。若你如此作，抓一張牌。', {
  abilities: [etb([{ e: 'costThen', prompt: '棄一張牌來抓一張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] }])],
});
cr(S, 'C', 'Zealous Lorecaster', '{5}{R}', 'Giant Sorcerer', 4, 4, '當此生物進戰場時，將目標瞬間或法術牌從你的墳墓場移回你手上。', {
  abilities: [
    etb([{ e: 'toHand', what: 'T0' }], {
      targets: [{ kind: 'gyCard', filter: { ctrl: 'you', ...INST_SORC }, optional: true, prompt: '選擇墳墓場中的瞬間或法術牌' }],
    }),
  ],
});
inst(S, 'C', 'Unsubtle Mockery', '{2}{R}', '對目標生物造成4點傷害。刺探1。', {
  targets: [CR],
  effects: [{ e: 'damage', n: 4, to: 'T0' }, { e: 'surveil', n: 1 }],
});
inst(S, 'C', 'Heated Argument', '{4}{R}', '對目標生物造成6點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 6, to: 'T0' }] });
ench(S, 'U', 'Living History', '{1}{R}', '當此結界進戰場時，派出一個2/2紅白雙色精怪衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-spirit-rw' }])],
});

// ---------------- 綠 ----------------
cr(S, 'U', 'Environmental Scientist', '{1}{G}', 'Human Druid', 2, 2, '當此生物進戰場時，你可以從你的牌庫中搜尋一張基本地牌，將它置於你手上。', {
  abilities: [etb([{ e: 'searchLand', to: 'hand', may: true }])],
});
cr(S, 'U', 'Pestbrood Sloth', '{3}{G}', 'Plant Sloth', 4, 4, '延勢\n當此生物死去時，派出兩個1/1黑綠雙色害獸衍生生物，它們具有「每當此衍生物攻擊時，你獲得1點生命。」', {
  keywords: ['reach'],
  abilities: [trig('dies', [{ e: 'token', token: 'tok-pest', n: 2 }])],
});
cr(S, 'C', 'Noxious Newt', '{1}{G}', 'Salamander', 1, 2, '死觸\n{T}：加{G}。', { keywords: ['deathtouch'], produces: ['G'] });
cr(S, 'C', 'Mindful Biomancer', '{1}{G}', 'Dryad Druid', 2, 2, '當此生物進戰場時，你獲得1點生命。\n{2}{G}：此生物得+2/+2直到回合結束。此異能每回合只能起動一次。', {
  abilities: [etb([{ e: 'gain', n: 1 }]), act({ mana: '{2}{G}' }, [{ e: 'pump', what: 'self', p: 2, t: 2 }], '+2/+2', { oncePerTurn: true })],
});
cr(S, 'C', "Shopkeeper's Bane", '{2}{G}', 'Badger Pest', 4, 2, '踐踏\n每當此生物攻擊時，你獲得2點生命。', {
  keywords: ['trample'],
  abilities: [trig('attacks', [{ e: 'gain', n: 2 }])],
});
sorc(S, 'C', "Oracle's Restoration", '{G}', '目標由你操控的生物得+1/+1直到回合結束。你抓一張牌並獲得1點生命。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 1, t: 1 }, { e: 'draw', n: 1 }, { e: 'gain', n: 1 }],
});
inst(S, 'C', 'Glorious Decay', '{1}{G}', '選擇一項：\n• 消滅目標神器。\n• 對目標具飛行異能的生物造成4點傷害。', {
  modes: [
    { text: '消滅神器', targets: [{ kind: 'permanent', filter: { type: 'Artifact' } }], effects: [destroyT0] },
    { text: '對飛行生物造成4點傷害', targets: [{ kind: 'creature', filter: { kw: 'flying' } }], effects: [{ e: 'damage', n: 4, to: 'T0' }] },
  ],
});

// ---------------- 多色 ----------------
cr(S, 'R', 'Colorstorm Stallion', '{1}{U}{R}', 'Elemental Horse', 3, 3, '守護{1}，敏捷\n樂章—每當你施放瞬間或法術咒語時，此生物得+1/+1直到回合結束。', {
  keywords: ['haste'],
  ward: 1,
  abilities: [trig('castInstSorc', [{ e: 'pump', what: 'self', p: 1, t: 1 }])],
});
cr(S, 'R', 'Hardened Academic', '{R}{W}', 'Bird Cleric', 2, 1, '飛行，敏捷', { keywords: ['flying', 'haste'] });
arti(S, 'R', 'Cauldron of Essence', '{1}{B}{G}', '每當一個由你操控的生物死去時，每位對手失去1點生命，且你獲得1點生命。', {
  abilities: [trig('allyDies', [{ e: 'lose', n: 1, who: 'opp' }, { e: 'gain', n: 1 }], { filter: { type: 'Creature' } })],
});
inst(S, 'R', "Dina's Guidance", '{1}{B}{G}', '從你的牌庫中搜尋一張生物牌，將它置於你手上。', { effects: [{ e: 'tutor', filter: { type: 'Creature' } }] });
sorc(S, 'R', 'Splatter Technique', '{1}{U}{U}{R}{R}', '選擇一項：\n• 抓四張牌。\n• 對每個生物各造成4點傷害。', {
  modes: [
    { text: '抓四張牌', effects: [{ e: 'draw', n: 4 }] },
    { text: '每個生物4點傷害', effects: [{ e: 'damage', n: 4, to: { all: { type: 'Creature' } } }] },
  ],
});
inst(S, 'U', 'Prismari Charm', '{U}{R}', '選擇一項：\n• 刺探2，然後抓一張牌。\n• 對一個或兩個目標各造成1點傷害。\n• 將目標非地永久物移回其擁有者手上。', {
  modes: [
    { text: '刺探2並抓一張牌', effects: [{ e: 'surveil', n: 2 }, { e: 'draw', n: 1 }] },
    { text: '1點傷害（一或兩個目標）', targets: [ANY, { ...ANY, optional: true }], effects: [{ e: 'damage', n: 1, to: 'T0' }, { e: 'damage', n: 1, to: 'T1' }] },
    { text: '彈回非地永久物', targets: [{ kind: 'permanent', filter: { nonType: 'Land' } }], effects: [{ e: 'bounce', what: 'T0' }] },
  ],
});
inst(S, 'U', 'Quandrix Charm', '{G}{U}', '選擇一項：\n• 反擊目標咒語，除非其操控者支付{2}。\n• 消滅目標結界。', {
  modes: [
    { text: '反擊除非支付{2}', targets: [{ kind: 'spell' }], effects: [{ e: 'counterUnless', what: 'T0', pay: 2 }] },
    { text: '消滅結界', targets: [{ kind: 'permanent', filter: { type: 'Enchantment' } }], effects: [destroyT0] },
  ],
});
inst(S, 'U', 'Silverquill Charm', '{W}{B}', '選擇一項：\n• 在目標生物上放置兩個+1/+1指示物。\n• 放逐目標力量為2或更少的生物。\n• 每位對手失去3點生命，且你獲得3點生命。', {
  modes: [
    { text: '兩個+1/+1指示物', targets: [CR], effects: [{ e: 'counters', what: 'T0', n: 2 }] },
    { text: '放逐力量2以下的生物', targets: [{ kind: 'creature', filter: { powMax: 2 } }], effects: [{ e: 'exile', what: 'T0' }] },
    { text: '吸取3點生命', effects: [{ e: 'lose', n: 3, who: 'opp' }, { e: 'gain', n: 3 }] },
  ],
});
inst(S, 'U', 'Witherbloom Charm', '{B}{G}', '選擇一項：\n• 你可以犧牲一個永久物。若你如此作，抓兩張牌。\n• 你獲得5點生命。\n• 消滅目標法術力值為2或更少的非地永久物。', {
  modes: [
    { text: '犧牲永久物抓兩張', effects: [{ e: 'costThen', prompt: '犧牲一個永久物來抓兩張牌？', cost: { sac: {} }, then: [{ e: 'draw', n: 2 }] }] },
    { text: '獲得5點生命', effects: [{ e: 'gain', n: 5 }] },
    { text: '消滅法術力值2以下的非地永久物', targets: [{ kind: 'permanent', filter: { nonType: 'Land', mvMax: 2 } }], effects: [destroyT0] },
  ],
});
inst(S, 'U', 'Vibrant Outburst', '{U}{R}', '對任意一個目標造成3點傷害。橫置至多一個目標生物。', {
  targets: [ANY, { kind: 'creature', optional: true, prompt: '選擇要橫置的生物' }],
  effects: [{ e: 'damage', n: 3, to: 'T0' }, { e: 'tap', what: 'T1' }],
});
inst(S, 'U', 'Stress Dream', '{3}{U}{R}', '對至多一個目標生物造成5點傷害。檢視你牌庫頂的兩張牌，將其中一張置於你手上，另一張置於你的牌庫底。', {
  targets: [{ kind: 'creature', optional: true }],
  effects: [{ e: 'damage', n: 5, to: 'T0' }, { e: 'dig', n: 2, take: 1, rest: 'bottom' }],
});
cr(S, 'U', 'Spectacular Skywhale', '{2}{U}{R}', 'Elemental Whale', 1, 4, '飛行\n樂章—每當你施放瞬間或法術咒語時，此生物得+3/+0直到回合結束。', {
  keywords: ['flying'],
  abilities: [trig('castInstSorc', [{ e: 'pump', what: 'self', p: 3, t: 0 }])],
});
cr(S, 'U', "Teacher's Pest", '{B}{G}', 'Skeleton Pest', 1, 1, '威懾\n每當此生物攻擊時，你獲得1點生命。', {
  keywords: ['menace'],
  abilities: [trig('attacks', [{ e: 'gain', n: 1 }])],
});
cr(S, 'U', 'Old-Growth Educator', '{2}{B}{G}', 'Treefolk Druid', 4, 4, '延勢，警戒\n灌注—當此生物進戰場時，若你本回合獲得過生命，在其上放置兩個+1/+1指示物。', {
  keywords: ['reach', 'vigilance'],
  abilities: [etb([{ e: 'counters', what: 'self', n: 2 }], { cond: INFUSION })],
});
sorc(S, 'U', 'Growth Curve', '{G}{U}', '在目標由你操控的生物上放置一個+1/+1指示物，然後將其上的+1/+1指示物數量加倍。', {
  targets: [MY_CR],
  effects: [{ e: 'counters', what: 'T0', n: 1 }, { e: 'doubleCounters', what: 'T0' }],
});
cr(S, 'U', 'Startled Relic Sloth', '{2}{R}{W}', 'Sloth Beast', 4, 4, '踐踏，繫命', { keywords: ['trample', 'lifelink'] });
sorc(S, 'U', 'Root Manipulation', '{3}{B}{G}', '由你操控的生物得+2/+2並獲得威懾異能直到回合結束。', {
  effects: [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 2, t: 2, kw: ['menace'] }],
});
cr(S, 'U', 'Colossus of the Blood Age', '{4}{R}{W}', 'Construct', 6, 6, '當此生物進戰場時，它對每位對手各造成3點傷害，且你獲得3點生命。', {
  types: ['Artifact', 'Creature'],
  abilities: [etb([{ e: 'damage', n: 3, to: 'opp' }, { e: 'gain', n: 3 }])],
});
cr(S, 'C', 'Bogwater Lumaret', '{B}{G}', 'Spirit Frog', 2, 2, '每當此生物或另一個生物在你的操控下進戰場時，你獲得1點生命。', {
  abilities: [etb([{ e: 'gain', n: 1 }]), trig('allyEtb', [{ e: 'gain', n: 1 }])],
});
cr(S, 'C', 'Pest Mascot', '{1}{B}{G}', 'Pest Ape', 2, 3, '踐踏\n每當你獲得生命時，在此生物上放置一個+1/+1指示物。', {
  keywords: ['trample'],
  abilities: [trig('lifegain', [{ e: 'counters', what: 'self', n: 1 }])],
});
cr(S, 'C', 'Imperious Inkmage', '{1}{W}{B}', 'Orc Warlock', 3, 3, '警戒\n當此生物進戰場時，刺探2。', {
  keywords: ['vigilance'],
  abilities: [etb([{ e: 'surveil', n: 2 }])],
});
cr(S, 'C', 'Stadium Tidalmage', '{2}{U}{R}', 'Djinn Sorcerer', 4, 4, '每當此生物進戰場或攻擊時，你可以抓一張牌。若你如此作，棄一張牌。', {
  abilities: [
    etb([{ e: 'may', prompt: '抓一張牌再棄一張牌？', effects: [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }] }]),
    trig('attacks', [{ e: 'may', prompt: '抓一張牌再棄一張牌？', effects: [{ e: 'draw', n: 1 }, { e: 'discard', n: 1, who: 'you' }] }]),
  ],
});
sorc(S, 'C', 'Grapple with Death', '{1}{B}{G}', '消滅目標神器或生物。你獲得1點生命。', {
  targets: [{ kind: 'permanent', filter: { type: ['Artifact', 'Creature'] } }],
  effects: [destroyT0, { e: 'gain', n: 1 }],
});
cr(S, 'C', 'Fractal Mascot', '{4}{G}{U}', 'Fractal Elk', 6, 6, '踐踏\n當此生物進戰場時，橫置目標由對手操控的生物，並在其上放置一個暈眩指示物。', {
  keywords: ['trample'],
  abilities: [etb([{ e: 'tap', what: 'T0' }, { e: 'stun', what: 'T0' }], { targets: [OPP_CR] })],
});
inst(S, 'C', 'Embrace the Paradox', '{3}{G}{U}', '抓三張牌。你可以將一張地牌從你手上橫置放進戰場。', {
  effects: [{ e: 'draw', n: 3 }, { e: 'landFromHand' }],
});
