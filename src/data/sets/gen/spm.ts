// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（SPM）：請勿手動修改
import { add } from '../../dsl';

add({"set": "SPM", "rarity": "C", "name": "Mysterio's Phantasm", "cost": "{1}{U}", "types": ["Creature"], "subtypes": ["Illusion", "Villain"], "power": 1, "toughness": 3, "keywords": ["flying", "vigilance"], "abilities": [{"kind": "trigger", "on": "attacks", "effects": [{"e": "mill", "n": 1}]}], "text": "飛行，警戒\n每當此生物攻擊時，磨一張牌。"});
add({"set": "SPM", "rarity": "C", "name": "Common Crook", "cost": "{1}{B}", "types": ["Creature"], "subtypes": ["Human", "Rogue", "Villain"], "power": 2, "toughness": 2, "abilities": [{"kind": "trigger", "on": "dies", "effects": [{"e": "token", "token": "tok-treasure"}]}], "text": "當此生物死去時，派出一個珍寶衍生物。"});
add({"set": "SPM", "rarity": "C", "name": "Risky Research", "cost": "{2}{B}", "types": ["Sorcery"], "spell": {"effects": [{"e": "surveil", "n": 2}, {"e": "draw", "n": 2}, {"e": "lose", "n": 2, "who": "you"}]}, "text": "刺探2，然後抓兩張牌。你失去2點生命。"});
add({"set": "SPM", "rarity": "C", "name": "Venomized Cat", "cost": "{2}{B}", "types": ["Creature"], "subtypes": ["Symbiote", "Cat", "Villain"], "power": 2, "toughness": 3, "keywords": ["deathtouch"], "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "mill", "n": 2}]}], "text": "死觸\n當此生物進戰場時，磨兩張牌。"});
add({"set": "SPM", "rarity": "C", "name": "Hot Dog Cart", "cost": "{3}", "types": ["Artifact"], "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "token", "token": "tok-food"}]}], "produces": ["W", "U", "B", "R", "G"], "text": "當此神器進戰場時，派出一個食物衍生物。\n{T}：加一點任意顏色的法術力。"});
