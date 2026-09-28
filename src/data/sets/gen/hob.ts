// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（HOB）：請勿手動修改
import { add } from '../../dsl';

add({"set": "HOB", "rarity": "C", "name": "Dori, Bearer of Friends", "cost": "{2}{R}", "types": ["Creature"], "supertypes": ["Legendary"], "subtypes": ["Dwarf", "Warrior"], "power": 3, "toughness": 2, "keywords": ["trample"], "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "token", "token": "tok-treasure"}]}], "text": "踐踏\n當此生物進戰場時，派出一個珍寶衍生物。"});
