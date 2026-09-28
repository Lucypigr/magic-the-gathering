// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（SOS）：請勿手動修改
import { add } from '../../dsl';

add({"set": "SOS", "rarity": "U", "name": "Proctor's Gaze", "cost": "{2}{G}{U}", "types": ["Instant"], "spell": {"effects": [{"e": "bounce", "what": "T0"}, {"e": "searchLand", "to": "battlefield", "tapped": true}], "targets": [{"kind": "permanent", "filter": {"nonType": "Land"}, "optional": true}]}, "text": "將至多一個目標非地永久物移回其擁有者手上。從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場，然後將你的牌庫洗牌。"});
add({"set": "SOS", "rarity": "C", "name": "Render Speechless", "cost": "{2}{W}{B}", "types": ["Sorcery"], "spell": {"effects": [{"e": "discardChosen", "who": "T0", "filter": {"nonType": "Land"}}, {"e": "counters", "what": "T1", "n": 2}], "targets": [{"kind": "opponent"}, {"kind": "creature", "optional": true}]}, "text": "目標對手展示其手牌。你從中選擇一張非地牌，該玩家棄掉那張牌。在至多一個目標生物上放置兩個+1/+1指示物。"});
