// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（TMT）：請勿手動修改
import { add } from '../../dsl';

add({"set": "TMT", "rarity": "U", "name": "Casey Jones, Jury-Rig Justiciar", "cost": "{1}{R}", "types": ["Creature"], "supertypes": ["Legendary"], "subtypes": ["Human", "Berserker"], "power": 2, "toughness": 1, "keywords": ["haste"], "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "dig", "n": 4, "take": 1, "rest": "bottom", "filter": {"type": "Artifact"}}]}], "text": "敏捷\n當此生物進戰場時，檢視你牌庫頂的四張牌。你可以展示其中一張神器牌並置於你手上，將其餘的牌以隨機順序置於你的牌庫底。"});
