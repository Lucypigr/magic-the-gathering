// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（DSK）：請勿手動修改
import { add } from '../../dsl';

add({"set": "DSK", "rarity": "U", "name": "Lionheart Glimmer", "cost": "{3}{W}{W}", "types": ["Enchantment", "Creature"], "subtypes": ["Cat", "Glimmer"], "power": 2, "toughness": 5, "ward": 2, "abilities": [{"kind": "trigger", "on": "youAttack", "effects": [{"e": "pump", "what": {"all": {"type": "Creature", "ctrl": "you"}}, "p": 1, "t": 1}]}], "text": "守護{2}\n每當你攻擊時，由你操控的生物得+1/+1直到回合結束。"});
add({"set": "DSK", "rarity": "U", "name": "Piggy Bank", "cost": "{1}{R}", "types": ["Artifact", "Creature"], "subtypes": ["Boar", "Toy"], "power": 3, "toughness": 2, "abilities": [{"kind": "trigger", "on": "dies", "effects": [{"e": "token", "token": "tok-treasure"}]}], "text": "當此生物死去時，派出一個珍寶衍生物。"});
