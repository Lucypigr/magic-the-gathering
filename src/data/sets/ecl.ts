// Lorwyn Eclipsed（ECL，2026 年 1 月）
// 枯萎 n：在一個由你操控的生物上放置 n 個 -1/-1 指示物。
// 繽紛：X 等於由你操控的永久物中的顏色數量。
import { ANY, CR, MY_CR, MY_GY_CR, OPP_CR, OPP_NONLAND, act, cr, destroyT0, ench, etb, inst, shockland, sorc, trig } from '../dsl';

const S = 'ECL';

shockland(S, 'Blood Crypt', 'B', 'R', 'Swamp Mountain');
shockland(S, 'Hallowed Fountain', 'W', 'U', 'Plains Island');
shockland(S, 'Overgrown Tomb', 'B', 'G', 'Swamp Forest');
shockland(S, 'Steam Vents', 'U', 'R', 'Island Mountain');
shockland(S, 'Temple Garden', 'G', 'W', 'Forest Plains');

// ---------------- 白 ----------------
cr(S, 'R', 'Adept Watershaper', '{2}{W}', 'Merfolk Cleric', 3, 4, '由你操控的其他已橫置生物具有不滅異能。', {
  abilities: [{ kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', tapped: true, other: true }, grant: { kw: ['indestructible'] } } }],
});
cr(S, 'C', 'Timid Shieldbearer', '{1}{W}', 'Kithkin Soldier', 2, 2, '{4}{W}：由你操控的生物得+1/+1直到回合結束。', {
  abilities: [act({ mana: '{4}{W}' }, [{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 1 }], '全體+1/+1')],
});
cr(S, 'C', 'Shore Lurker', '{3}{W}', 'Merfolk Scout', 3, 3, '飛行\n當此生物進戰場時，刺探1。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'surveil', n: 1 }])],
});
cr(S, 'C', 'Gallant Fowlknight', '{3}{W}', 'Kithkin Knight', 3, 4, '當此生物進戰場時，由你操控的生物得+1/+0直到回合結束。', {
  abilities: [etb([{ e: 'pump', what: { all: { type: 'Creature', ctrl: 'you' } }, p: 1, t: 0 }])],
});
cr(S, 'C', 'Reluctant Dounguard', '{2}{W}', 'Kithkin Soldier', 4, 4, '此生物進戰場時上面有兩個-1/-1指示物。\n每當另一個生物在你的操控下進戰場時，從此生物上移除一個-1/-1指示物。', {
  etbCounters: -2,
  abilities: [trig('allyEtb', [{ e: 'removeCounters', what: 'self', n: 1 }])],
});
inst(S, 'C', 'Keep Out', '{1}{W}', '選擇一項：\n• 對目標已橫置的生物造成4點傷害。\n• 消滅目標結界。', {
  modes: [
    { text: '對已橫置的生物造成4點傷害', targets: [{ kind: 'creature', filter: { tapped: true } }], effects: [{ e: 'damage', n: 4, to: 'T0' }] },
    { text: '消滅結界', targets: [{ kind: 'permanent', filter: { type: 'Enchantment' } }], effects: [destroyT0] },
  ],
});
inst(S, 'C', "Riverguard's Reflexes", '{1}{W}', '目標生物得+2/+2並獲得先攻異能直到回合結束。重置該生物。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['first_strike'] }, { e: 'untap', what: 'T0' }],
});
ench(S, 'C', 'Liminal Hold', '{3}{W}', '當此結界進戰場時，放逐至多一個目標由對手操控的非地永久物，直到此結界離開戰場為止。你獲得2點生命。', {
  abilities: [etb([{ e: 'exileLinked', what: 'T0' }, { e: 'gain', n: 2 }], { targets: [{ ...OPP_NONLAND, optional: true }] })],
});
ench(S, 'C', 'Spiral into Solitude', '{1}{W}', '結附於生物\n所結附的生物不能攻擊或阻擋。', {
  subtypes: ['Aura'],
  aura: { target: { kind: 'creature', prompt: '選擇要結附的生物' }, grant: { cantAttack: true, cantBlock: true } },
});

// ---------------- 藍 ----------------
cr(S, 'R', 'Sunderflock', '{7}{U}{U}', 'Elemental', 5, 5,
  '此咒語減少{X}來施放，X為由你操控的元素中最高的法術力值。\n飛行\n當此生物進戰場時，將所有非元素生物移回其擁有者手上。',
  {
    keywords: ['flying'],
    costReduce: { perMaxMv: { type: 'Creature', sub: 'Elemental' } },
    abilities: [etb([{ e: 'bounce', what: { all: { type: 'Creature', nonSub: 'Elemental' } } }])],
  });
cr(S, 'U', 'Rimekin Recluse', '{2}{U}', 'Elemental Wizard', 3, 2, '當此生物進戰場時，將至多一個另外的目標生物移回其擁有者手上。', {
  abilities: [etb([{ e: 'bounce', what: 'T0' }], { targets: [{ kind: 'creature', optional: true, notSelf: true }] })],
});
cr(S, 'U', 'Tanufel Rimespeaker', '{3}{U}', 'Elemental Wizard', 2, 4, '每當你施放法術力值為4或更多的咒語時，抓一張牌。', {
  abilities: [trig('castAny', [{ e: 'draw', n: 1 }], { filter: { mvMin: 4 } })],
});
cr(S, 'U', 'Unwelcome Sprite', '{1}{U}', 'Faerie Rogue', 2, 1, '飛行\n每當你於對手的回合中施放咒語時，刺探2。', {
  keywords: ['flying'],
  abilities: [trig('castAny', [{ e: 'surveil', n: 2 }], { cond: { c: 'notYourTurn' } })],
});
cr(S, 'C', 'Glamermite', '{2}{U}', 'Faerie Rogue', 2, 2, '閃現，飛行\n當此生物進戰場時，橫置至多一個目標生物。', {
  keywords: ['flash', 'flying'],
  abilities: [etb([{ e: 'tap', what: 'T0' }], { targets: [{ kind: 'creature', optional: true }] })],
});
cr(S, 'C', 'Summit Sentinel', '{1}{U}', 'Elemental Soldier', 1, 3, '當此生物死去時，抓一張牌。', {
  abilities: [trig('dies', [{ e: 'draw', n: 1 }])],
});
cr(S, 'C', 'Kulrath Mystic', '{2}{U}', 'Elemental Wizard', 2, 4, '每當你施放法術力值為4或更多的咒語時，此生物得+2/+0並獲得警戒異能直到回合結束。', {
  abilities: [trig('castAny', [{ e: 'pump', what: 'self', p: 2, t: 0, kw: ['vigilance'] }], { filter: { mvMin: 4 } })],
});
inst(S, 'C', 'Run Away Together', '{1}{U}', '選擇兩個由不同玩家操控的目標生物。將它們移回其擁有者手上。', {
  targets: [MY_CR, OPP_CR],
  effects: [{ e: 'bounce', what: 'T0' }, { e: 'bounce', what: 'T1' }],
});
inst(S, 'C', 'Wild Unraveling', '{U}{U}', '作為施放此咒語的額外費用，枯萎2或支付{1}。\n反擊目標咒語。', {
  modes: [
    { text: '支付{1}：反擊咒語', cost: '{1}{U}{U}', targets: [{ kind: 'spell' }], effects: [{ e: 'counter', what: 'T0' }] },
    {
      text: '枯萎2：反擊咒語',
      targets: [{ kind: 'spell' }, { ...MY_CR, prompt: '選擇要枯萎的生物' }],
      effects: [{ e: 'counters', what: 'T1', n: -2 }, { e: 'counter', what: 'T0' }],
    },
  ],
});

// ---------------- 黑 ----------------
cr(S, 'M', 'Bitterbloom Bearer', '{B}{B}', 'Faerie Rogue', 1, 1, '閃現，飛行\n在你的維持開始時，你失去1點生命，並派出一個1/1藍黑雙色，具飛行異能的妖精衍生生物。', {
  keywords: ['flash', 'flying'],
  abilities: [trig('upkeep', [{ e: 'lose', n: 1, who: 'you' }, { e: 'token', token: 'tok-faerie' }])],
});
inst(S, 'U', 'Requiting Hex', '{B}', '作為施放此咒語的額外費用，你可以枯萎1。\n消滅目標法術力值為2或更少的生物。若已支付額外費用，你獲得2點生命。', {
  modes: [
    { text: '消滅法術力值2以下的生物', targets: [{ kind: 'creature', filter: { mvMax: 2 } }], effects: [destroyT0] },
    {
      text: '枯萎1：消滅並獲得2點生命',
      targets: [{ kind: 'creature', filter: { mvMax: 2 } }, { ...MY_CR, prompt: '選擇要枯萎的生物' }],
      effects: [{ e: 'counters', what: 'T1', n: -1 }, destroyT0, { e: 'gain', n: 2 }],
    },
  ],
});
sorc(S, 'U', 'Darkness Descends', '{2}{B}{B}', '在每個生物上各放置兩個-1/-1指示物。', {
  effects: [{ e: 'counters', what: { all: { type: 'Creature' } }, n: -2 }],
});
cr(S, 'U', 'Graveshifter', '{3}{B}', 'Shapeshifter', 2, 2, '當此生物進戰場時，你可以將目標生物牌從你的墳墓場移回你手上。', {
  abilities: [etb([{ e: 'toHand', what: 'T0' }], { targets: [{ ...MY_GY_CR, optional: true }] })],
});
cr(S, 'U', 'Nightmare Sower', '{3}{B}', 'Faerie Assassin', 2, 3, '飛行，繫命\n每當你於對手的回合中施放咒語時，在至多一個目標生物上放置一個-1/-1指示物。', {
  keywords: ['flying', 'lifelink'],
  abilities: [
    trig('castAny', [{ e: 'counters', what: 'T0', n: -1 }], { cond: { c: 'notYourTurn' }, targets: [{ kind: 'creature', optional: true }] }),
  ],
});
cr(S, 'U', 'Voracious Tome-Skimmer', '{U/B}{U/B}{U/B}', 'Faerie Rogue', 2, 3, '飛行\n每當你於對手的回合中施放咒語時，你可以支付1點生命。若你如此作，抓一張牌。', {
  keywords: ['flying'],
  abilities: [
    trig('castAny', [{ e: 'costThen', prompt: '支付1點生命來抓一張牌？', cost: { life: 1 }, then: [{ e: 'draw', n: 1 }] }], {
      cond: { c: 'notYourTurn' },
    }),
  ],
});
cr(S, 'U', 'Shimmercreep', '{4}{B}', 'Elemental', 3, 5, '威懾\n繽紛—當此生物進戰場時，每位對手失去X點生命，且你獲得X點生命，X為由你操控的永久物中的顏色數量。', {
  keywords: ['menace'],
  abilities: [etb([{ e: 'lose', n: { colors: true }, who: 'opp' }, { e: 'gain', n: { colors: true } }])],
});
inst(S, 'C', 'Blight Rot', '{2}{B}', '在目標生物上放置四個-1/-1指示物。', {
  targets: [CR],
  effects: [{ e: 'counters', what: 'T0', n: -4 }],
});
sorc(S, 'C', "Bogslither's Embrace", '{1}{B}', '作為施放此咒語的額外費用，枯萎1或支付{3}。\n放逐目標生物。', {
  modes: [
    { text: '支付{3}：放逐生物', cost: '{4}{B}', targets: [CR], effects: [{ e: 'exile', what: 'T0' }] },
    {
      text: '枯萎1：放逐生物',
      targets: [CR, { ...MY_CR, prompt: '選擇要枯萎的生物' }],
      effects: [{ e: 'counters', what: 'T1', n: -1 }, { e: 'exile', what: 'T0' }],
    },
  ],
});
cr(S, 'C', 'Dream Seizer', '{3}{B}', 'Faerie Rogue', 3, 2, '飛行\n當此生物進戰場時，你可以枯萎1。若你如此作，每位對手各棄一張牌。', {
  keywords: ['flying'],
  abilities: [etb([{ e: 'costThen', prompt: '枯萎1讓對手棄一張牌？', cost: { blight: 1 }, then: [{ e: 'discard', n: 1, who: 'opp' }] }])],
});
cr(S, 'C', 'Moonglove Extractor', '{2}{B}', 'Elf Warlock', 2, 1, '每當此生物攻擊時，你抓一張牌並失去1點生命。', {
  abilities: [trig('attacks', [{ e: 'draw', n: 1 }, { e: 'lose', n: 1, who: 'you' }])],
});
cr(S, 'C', 'Bile-Vial Boggart', '{B}', 'Goblin Assassin', 1, 1, '當此生物死去時，在至多一個目標生物上放置一個-1/-1指示物。', {
  abilities: [trig('dies', [{ e: 'counters', what: 'T0', n: -1 }], { targets: [{ kind: 'creature', optional: true }] })],
});
cr(S, 'C', 'Mischievous Sneakling', '{1}{U/B}', 'Shapeshifter', 2, 2, '閃現', { keywords: ['flash'] });
cr(S, 'C', 'Prideful Feastling', '{2}{W/B}', 'Shapeshifter', 2, 3, '繫命', { keywords: ['lifelink'] });

// ---------------- 紅 ----------------
inst(S, 'U', 'Sear', '{1}{R}', '對目標生物造成4點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 4, to: 'T0' }] });
sorc(S, 'U', 'Boulder Dash', '{1}{R}', '對任意一個目標造成2點傷害，並對另一個任意目標造成1點傷害。', {
  targets: [
    { ...ANY, prompt: '選擇受到2點傷害的目標' },
    { ...ANY, prompt: '選擇受到1點傷害的目標' },
  ],
  effects: [
    { e: 'damage', n: 2, to: 'T0' },
    { e: 'damage', n: 1, to: 'T1' },
  ],
});
inst(S, 'U', 'Giantfall', '{1}{R}', '選擇一項：\n• 目標由你操控的生物對目標由對手操控的生物造成傷害，其數量等同於其力量。\n• 消滅目標神器。', {
  modes: [
    { text: '咬擊', targets: [MY_CR, OPP_CR], effects: [{ e: 'bite', a: 'T0', b: 'T1' }] },
    { text: '消滅神器', targets: [{ kind: 'permanent', filter: { type: 'Artifact' } }], effects: [destroyT0] },
  ],
});
cr(S, 'U', 'Explosive Prodigy', '{1}{R}', 'Elemental Sorcerer', 1, 1, '繽紛—當此生物進戰場時，它對目標由對手操控的生物造成X點傷害，X為由你操控的永久物中的顏色數量。', {
  abilities: [etb([{ e: 'damage', n: { colors: true }, to: 'T0' }], { targets: [OPP_CR] })],
});
sorc(S, 'U', 'Impolite Entrance', '{R}', '目標生物獲得踐踏與敏捷異能直到回合結束。抓一張牌。', {
  targets: [CR],
  effects: [{ e: 'pump', what: 'T0', p: 0, t: 0, kw: ['trample', 'haste'] }, { e: 'draw', n: 1 }],
});
cr(S, 'U', 'Sourbread Auntie', '{2}{R}{R}', 'Goblin Warrior', 4, 3, '當此生物進戰場時，你可以枯萎2。若你如此作，派出兩個1/1鬼怪衍生生物。', {
  abilities: [etb([{ e: 'costThen', prompt: '枯萎2來派出兩個鬼怪？', cost: { blight: 2 }, then: [{ e: 'token', token: 'tok-goblin', n: 2 }] }])],
});
cr(S, 'U', 'Boggart Cursecrafter', '{B}{R}', 'Goblin Warlock', 2, 3, '死觸\n每當另一個由你操控的鬼怪死去時，此生物對每位對手各造成1點傷害。', {
  keywords: ['deathtouch'],
  abilities: [trig('allyDies', [{ e: 'damage', n: 1, to: 'opp' }], { filter: { sub: 'Goblin' } })],
});
cr(S, 'C', 'Elder Auntie', '{2}{R}', 'Goblin Warlock', 2, 2, '當此生物進戰場時，派出一個1/1鬼怪衍生生物。', {
  abilities: [etb([{ e: 'token', token: 'tok-goblin' }])],
});
cr(S, 'C', 'Flame-Chain Mauler', '{1}{R}', 'Elemental Warrior', 2, 2, '{1}{R}：此生物得+1/+0並獲得威懾異能直到回合結束。', {
  abilities: [act({ mana: '{1}{R}' }, [{ e: 'pump', what: 'self', p: 1, t: 0, kw: ['menace'] }], '+1/+0 並獲得威懾')],
});
inst(S, 'C', 'Feed the Flames', '{3}{R}', '對目標生物造成5點傷害。', { targets: [CR], effects: [{ e: 'damage', n: 5, to: 'T0' }] });
inst(S, 'C', 'Tweeze', '{2}{R}', '對任意一個目標造成3點傷害。你可以棄一張牌。若你如此作，抓一張牌。', {
  targets: [ANY],
  effects: [
    { e: 'damage', n: 3, to: 'T0' },
    { e: 'costThen', prompt: '棄一張牌來抓一張牌？', cost: { discard: 1 }, then: [{ e: 'draw', n: 1 }] },
  ],
});
cr(S, 'C', 'Gangly Stompling', '{2}{R/G}', 'Shapeshifter', 4, 2, '踐踏', { keywords: ['trample'] });

// ---------------- 綠 ----------------
cr(S, 'R', 'Bristlebane Battler', '{1}{G}', 'Kithkin Soldier', 6, 6, '踐踏，守護{2}\n此生物進戰場時上面有五個-1/-1指示物。\n每當另一個生物在你的操控下進戰場時，從此生物上移除一個-1/-1指示物。', {
  keywords: ['trample'],
  ward: 2,
  etbCounters: -5,
  abilities: [trig('allyEtb', [{ e: 'removeCounters', what: 'self', n: 1 }])],
});
cr(S, 'R', 'Formidable Speaker', '{2}{G}', 'Elf Druid', 2, 4, '當此生物進戰場時，你可以棄一張牌。若你如此作，從你的牌庫中搜尋一張生物牌，將它置於你手上。', {
  abilities: [
    etb([{ e: 'costThen', prompt: '棄一張牌來搜尋一張生物牌？', cost: { discard: 1 }, then: [{ e: 'tutor', filter: { type: 'Creature' } }] }]),
  ],
});
inst(S, 'U', 'Blossoming Defense', '{G}', '目標由你操控的生物得+2/+2並獲得辟邪異能直到回合結束。', {
  targets: [MY_CR],
  effects: [{ e: 'pump', what: 'T0', p: 2, t: 2, kw: ['hexproof'] }],
});
cr(S, 'U', 'Virulent Emissary', '{G}', 'Elf Assassin', 1, 1, '死觸\n每當另一個生物在你的操控下進戰場時，你獲得1點生命。', {
  keywords: ['deathtouch'],
  abilities: [trig('allyEtb', [{ e: 'gain', n: 1 }])],
});
cr(S, 'U', 'Luminollusk', '{3}{G}', 'Elemental', 2, 4, '死觸\n繽紛—當此生物進戰場時，你獲得X點生命，X為由你操控的永久物中的顏色數量。', {
  keywords: ['deathtouch'],
  abilities: [etb([{ e: 'gain', n: { colors: true } }])],
});
cr(S, 'U', "Morcant's Loyalist", '{1}{B}{G}', 'Elf Warrior', 3, 2, '由你操控的其他精靈得+1/+1。\n當此生物死去時，將另一張目標精靈牌從你的墳墓場移回你手上。', {
  abilities: [
    { kind: 'static', anthem: { filter: { type: 'Creature', ctrl: 'you', sub: 'Elf', other: true }, grant: { p: 1, t: 1 } } },
    trig('dies', [{ e: 'toHand', what: 'T0' }], {
      targets: [{ kind: 'gyCard', filter: { ctrl: 'you', sub: 'Elf', other: true }, optional: true, prompt: '選擇墳墓場中的精靈牌' }],
    }),
  ],
});
cr(S, 'C', 'Lys Alana Informant', '{1}{G}', 'Elf Scout', 3, 1, '當此生物進戰場或死去時，刺探1。', {
  abilities: [etb([{ e: 'surveil', n: 1 }]), trig('dies', [{ e: 'surveil', n: 1 }])],
});
cr(S, 'C', 'Great Forest Druid', '{1}{G}', 'Treefolk Druid', 0, 4, '{T}：加一點任意顏色的法術力。', { produces: ['W', 'U', 'B', 'R', 'G'] });
cr(S, 'C', "Dawn's Light Archer", '{2}{G}', 'Elf Archer', 4, 2, '閃現，延勢', { keywords: ['flash', 'reach'] });
cr(S, 'C', 'Crossroads Watcher', '{2}{G}', 'Kithkin Ranger', 3, 3, '踐踏\n每當另一個生物在你的操控下進戰場時，此生物得+1/+0直到回合結束。', {
  keywords: ['trample'],
  abilities: [trig('allyEtb', [{ e: 'pump', what: 'self', p: 1, t: 0 }])],
});
cr(S, 'C', 'Chitinous Graspling', '{3}{G/U}', 'Shapeshifter', 3, 4, '延勢', { keywords: ['reach'] });
inst(S, 'C', 'Unforgiving Aim', '{2}{G}', '選擇一項：\n• 消滅目標具飛行異能的生物。\n• 消滅目標結界。\n• 派出一個2/2黑綠雙色精靈戰士衍生生物。', {
  modes: [
    { text: '消滅飛行生物', targets: [{ kind: 'creature', filter: { kw: 'flying' } }], effects: [destroyT0] },
    { text: '消滅結界', targets: [{ kind: 'permanent', filter: { type: 'Enchantment' } }], effects: [destroyT0] },
    { text: '派出精靈衍生物', effects: [{ e: 'token', token: 'tok-elf' }] },
  ],
});

// ---------------- 多色／混色 ----------------
const eclipsed = (name: string, cost: string, subs: string, p: number, t: number, tribe: string, lands: [string, string]) =>
  cr(S, 'U', name, cost, subs, p, t, `當此生物進戰場時，檢視你牌庫頂的四張牌。你可以展示其中一張${tribe}、${lands[0] === 'Swamp' ? '沼澤' : lands[0] === 'Forest' ? '樹林' : lands[0] === 'Island' ? '海島' : '平原'}或${lands[1] === 'Mountain' ? '山脈' : lands[1] === 'Forest' ? '樹林' : lands[1] === 'Island' ? '海島' : '平原'}牌並置於你手上。將其餘的牌以任意順序置於你的牌庫底。`, {
    abilities: [
      etb([
        {
          e: 'dig',
          n: 4,
          take: 1,
          rest: 'bottom',
          filter: { or: [{ sub: subs.split(' ')[0] }, { sub: lands }] },
        },
      ]),
    ],
  });
eclipsed('Eclipsed Boggart', '{B/R}{B/R}{B/R}', 'Goblin Scout', 2, 3, '鬼怪', ['Swamp', 'Mountain']);
eclipsed('Eclipsed Elf', '{B/G}{B/G}{B/G}', 'Elf Scout', 3, 2, '精靈', ['Swamp', 'Forest']);
eclipsed('Eclipsed Flamekin', '{1}{U/R}{U/R}', 'Elemental Scout', 1, 4, '元素', ['Island', 'Mountain']);
eclipsed('Eclipsed Kithkin', '{G/W}{G/W}', 'Kithkin Scout', 2, 1, '奇斯金', ['Forest', 'Plains']);
eclipsed('Eclipsed Merrow', '{W/U}{W/U}{W/U}', 'Merfolk Scout', 2, 3, '人魚', ['Plains', 'Island']);

