// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（TDM）：請勿手動修改
import { add } from '../../dsl';

add({"set": "TDM", "rarity": "C", "name": "Cruel Truths", "cost": "{3}{B}", "types": ["Instant"], "spell": {"effects": [{"e": "surveil", "n": 2}, {"e": "draw", "n": 2}, {"e": "lose", "n": 2, "who": "you"}]}, "text": "刺探2，然後抓兩張牌。你失去2點生命。"});
add({"set": "TDM", "rarity": "C", "name": "Meticulous Artisan", "cost": "{3}{R}", "types": ["Creature"], "subtypes": ["Djinn", "Artificer"], "power": 3, "toughness": 3, "keywords": ["prowess"], "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "token", "token": "tok-treasure"}]}], "text": "勇行\n當此生物進戰場時，派出一個珍寶衍生物。"});
