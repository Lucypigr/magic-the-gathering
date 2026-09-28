// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（MSH）：請勿手動修改
import { add } from '../../dsl';

add({"set": "MSH", "rarity": "C", "name": "Stark Industries Executive", "cost": "{R}", "types": ["Creature"], "subtypes": ["Human", "Advisor"], "power": 1, "toughness": 2, "abilities": [{"kind": "activated", "cost": {"mana": "{2}", "tap": true}, "effects": [{"e": "token", "token": "tok-treasure"}], "label": "派出一個珍寶衍生物"}], "text": "{2}，{T}：派出一個珍寶衍生物。"});
add({"set": "MSH", "rarity": "C", "name": "Surveillance Room", "cost": "", "types": ["Land"], "filterMana": true, "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "surveil", "n": 1}]}], "produces": ["C"], "text": "當此地進戰場時，刺探1。\n{T}：加{C}。\n{1}，{T}：加一點任意顏色的法術力。"});
