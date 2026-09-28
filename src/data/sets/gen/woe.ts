// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（WOE）：請勿手動修改
import { add } from '../../dsl';

add({"set": "WOE", "rarity": "C", "name": "Mintstrosity", "cost": "{1}{B}", "types": ["Creature"], "subtypes": ["Horror"], "power": 3, "toughness": 1, "abilities": [{"kind": "trigger", "on": "dies", "effects": [{"e": "token", "token": "tok-food"}]}], "text": "當此生物死去時，派出一個食物衍生物。"});
add({"set": "WOE", "rarity": "C", "name": "Scream Puff", "cost": "{4}{B}", "types": ["Creature"], "subtypes": ["Horror"], "power": 4, "toughness": 5, "keywords": ["deathtouch"], "abilities": [{"kind": "trigger", "on": "combatDamagePlayer", "effects": [{"e": "token", "token": "tok-food"}]}], "text": "死觸\n每當此生物對玩家造成戰鬥傷害時，派出一個食物衍生物。"});
add({"set": "WOE", "rarity": "C", "name": "Redcap Thief", "cost": "{2}{R}", "types": ["Creature"], "subtypes": ["Goblin", "Rogue"], "power": 2, "toughness": 3, "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "token", "token": "tok-treasure"}]}], "text": "當此生物進戰場時，派出一個珍寶衍生物。"});
add({"set": "WOE", "rarity": "U", "name": "Collector's Vault", "cost": "{2}", "types": ["Artifact"], "abilities": [{"kind": "activated", "cost": {"mana": "{2}", "tap": true}, "effects": [{"e": "draw", "n": 1}, {"e": "discard", "n": 1, "who": "you"}, {"e": "token", "token": "tok-treasure"}], "label": "抓一張牌，然後棄一張牌。派出一個珍寶"}], "text": "{2}，{T}：抓一張牌，然後棄一張牌。派出一個珍寶衍生物。"});
