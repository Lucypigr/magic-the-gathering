// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（DFT）：請勿手動修改
import { add } from '../../dsl';

add({"set": "DFT", "rarity": "C", "name": "Grim Bauble", "cost": "{B}", "types": ["Artifact"], "abilities": [{"kind": "trigger", "on": "etb", "effects": [{"e": "pump", "what": "T0", "p": -2, "t": -2}], "targets": [{"kind": "creature", "filter": {"ctrl": "opp"}}]}, {"kind": "activated", "cost": {"mana": "{2}{B}", "tap": true, "sacSelf": true}, "effects": [{"e": "surveil", "n": 2}], "label": "刺探2"}], "text": "當此神器進戰場時，目標由對手操控的生物得-2/-2直到回合結束。\n{2}{B}，{T}，犧牲此神器：刺探2。"});
