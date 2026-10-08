#!/usr/bin/env python3
"""
從 Scryfall 資料自動產生「一般生物與咒語」的卡牌定義。

只收錄規則敘述能完整對應到本遊戲引擎的卡：每一句都必須能翻譯成引擎效果，
只要有一句看不懂就整張略過，避免出現效果跟卡面不符的卡。

用法：python3 scripts/gen_cards.py <scryfall 資料夾> <現有卡牌清單 json>
資料夾中每個系列一個 <set>.json（Scryfall search API 的卡牌陣列）。
輸出：src/data/sets/gen/*.ts
"""
import json
import os
import re
import sys

SETS = ['WOE', 'LCI', 'MKM', 'OTJ', 'BLB', 'DSK', 'FDN', 'DFT', 'TDM', 'FIN', 'EOE', 'SPM', 'TLA', 'ECL', 'TMT', 'SOS', 'MSH', 'HOB']
RARITY = {'common': 'C', 'uncommon': 'U', 'rare': 'R', 'mythic': 'M'}
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'sets', 'gen')


def slug(n):
    n = n.lower()
    n = re.sub(r"['’,]", '', n)
    n = re.sub(r'[^a-z0-9]+', '-', n)
    return n.strip('-')


# ------------------------------------------------------------
# 關鍵字
# ------------------------------------------------------------
KW = {
    'flying': ('flying', '飛行'),
    'reach': ('reach', '延勢'),
    'first strike': ('first_strike', '先攻'),
    'double strike': ('double_strike', '連擊'),
    'deathtouch': ('deathtouch', '死觸'),
    'trample': ('trample', '踐踏'),
    'lifelink': ('lifelink', '繫命'),
    'vigilance': ('vigilance', '警戒'),
    'haste': ('haste', '敏捷'),
    'menace': ('menace', '威懾'),
    'defender': ('defender', '守軍'),
    'indestructible': ('indestructible', '不滅'),
    'hexproof': ('hexproof', '辟邪'),
    'flash': ('flash', '閃現'),
    'prowess': ('prowess', '勇行'),
}
# Scryfall keywords 欄位中可以接受的（其餘機制一律略過整張卡）
OK_KEYWORDS = {k.title() for k in KW} | {'First strike', 'Double strike', 'Ward', 'Scry', 'Surveil', 'Mill', 'Fight', 'Landfall', 'Enchant', 'Equip', 'Treasure', 'Investigate', 'Food', 'Clue', 'Earthbend', 'Flashback', 'Role token'}

NUM = {'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7}
ZHN = {1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十'}


def zhn(n, measure=False):
    if measure and n == 2:
        return '兩'
    return ZHN.get(n, str(n))


def num(s):
    s = s.lower()
    if s in NUM:
        return NUM[s]
    if s.isdigit():
        return int(s)
    raise Unsupported('number ' + s)


class Unsupported(Exception):
    pass


def kw_list(s):
    """'flying and trample' / 'flying, vigilance, and haste' → ([kw], '飛行與踐踏')"""
    parts = re.split(r',\s*(?:and\s+)?|\s+and\s+', s.strip())
    out = []
    for p in parts:
        p = p.strip().lower()
        if p not in KW:
            raise Unsupported('kw ' + p)
        out.append(KW[p])
    zh = '、'.join(z for _, z in out[:-1]) + ('與' if len(out) > 1 else '') + out[-1][1]
    return [k for k, _ in out], zh


# ------------------------------------------------------------
# 目標
# ------------------------------------------------------------
PERM_TYPES = {
    'artifact': (['Artifact'], '神器'),
    'enchantment': (['Enchantment'], '結界'),
    'artifact or enchantment': (['Artifact', 'Enchantment'], '神器或結界'),
    'artifact or creature': (['Artifact', 'Creature'], '神器或生物'),
    'creature or enchantment': (['Creature', 'Enchantment'], '生物或結界'),
    'land': (['Land'], '地'),
}


def target_spec(noun):
    """把英文的目標描述轉成 (TargetSpec, 中文)；noun 不含 'target '"""
    n = noun.strip()
    opt = False
    m = re.match(r'^(creature|nonland permanent|permanent|artifact|enchantment|land)(.*)$', n)
    simple = {
        'any target': ({'kind': 'any'}, '任意一個目標'),
        'player': ({'kind': 'player'}, '目標玩家'),
        'opponent': ({'kind': 'opponent'}, '目標對手'),
        'player or planeswalker': ({'kind': 'player'}, '目標玩家'),
        'opponent or planeswalker': ({'kind': 'opponent'}, '目標對手'),
        'spell': ({'kind': 'spell'}, '目標咒語'),
        'noncreature spell': ({'kind': 'spell', 'filter': {'nonType': 'Creature'}}, '目標非生物咒語'),
        'creature spell': ({'kind': 'spell', 'filter': {'type': 'Creature'}}, '目標生物咒語'),
        'instant or sorcery spell': ({'kind': 'spell', 'filter': {'type': ['Instant', 'Sorcery']}}, '目標瞬間或法術咒語'),
        'artifact or enchantment spell': ({'kind': 'spell', 'filter': {'type': ['Artifact', 'Enchantment']}}, '目標神器或結界咒語'),
    }
    if n in simple:
        return simple[n]
    if n in PERM_TYPES:
        t, z = PERM_TYPES[n]
        return {'kind': 'permanent', 'filter': {'type': t if len(t) > 1 else t[0]}}, '目標' + z
    if n in ('nonland permanent', 'nonland permanent an opponent controls', "nonland permanent you don't control"):
        f = {'nonType': 'Land'}
        z = '目標非地永久物'
        if n != 'nonland permanent':
            f['ctrl'] = 'opp'
            z = '目標由對手操控的非地永久物'
        return {'kind': 'permanent', 'filter': f}, z
    if n in ('artifact or enchantment an opponent controls', "artifact or enchantment you don't control"):
        return {'kind': 'permanent', 'filter': {'type': ['Artifact', 'Enchantment'], 'ctrl': 'opp'}}, '目標由對手操控的神器或結界'
    # 生物
    if n == 'legendary creature':
        return {'kind': 'creature', 'filter': {'legendary': True}}, '目標傳奇生物'
    if n == 'attacking creature' and False:
        pass
    notself = n.startswith('another ') or n.startswith('other ')
    if notself:
        n = n.split(' ', 1)[1]
        spec, z = target_spec(n)
        return dict(spec, notSelf=True), z.replace('目標', '另一個目標', 1)
    m = re.match(r'^(tapped |attacking |blocking |attacking or blocking )?creature( or planeswalker)?(.*)$', n)
    if not m:
        raise Unsupported('target ' + n)
    pre, _pw, rest = m.groups()
    f = {}
    zpre = ''
    if pre == 'tapped ':
        f['tapped'] = True
        zpre = '已橫置的'
    elif pre == 'attacking ':
        f['attacking'] = True
        zpre = '進行攻擊的'
    elif pre in ('blocking ', 'attacking or blocking '):
        f['inCombat'] = True
        zpre = '進行攻擊或阻擋的'
    rest = rest.strip()
    zctrl = ''
    zmid = ''
    parts = [p for p in re.split(r'\s*(?=with |an opponent controls|you control|you don\'t control|without )', rest) if p]
    for p in parts:
        p = p.strip()
        if p in ('an opponent controls', "you don't control"):
            f['ctrl'] = 'opp'
            zctrl = '由對手操控的'
        elif p == 'you control':
            f['ctrl'] = 'you'
            zctrl = '由你操控的'
        elif re.match(r'^with power (\d+) or greater$', p):
            f['powMin'] = int(re.match(r'^with power (\d+)', p).group(1))
            zmid += f"力量為{f['powMin']}或更多的"
        elif re.match(r'^with power (\d+) or less$', p):
            f['powMax'] = int(re.match(r'^with power (\d+)', p).group(1))
            zmid += f"力量為{f['powMax']}或更少的"
        elif re.match(r'^with mana value (\d+) or less$', p):
            f['mvMax'] = int(re.match(r'^with mana value (\d+)', p).group(1))
            zmid += f"法術力值為{f['mvMax']}或更少的"
        elif re.match(r'^with mana value (\d+) or greater$', p):
            f['mvMin'] = int(re.match(r'^with mana value (\d+)', p).group(1))
            zmid += f"法術力值為{f['mvMin']}或更多的"
        elif p == 'with flying':
            f['kw'] = 'flying'
            zmid += '具飛行異能的'
        elif p == 'without flying':
            f['nonKw'] = 'flying'
            zmid += '不具飛行異能的'
        else:
            raise Unsupported('target part ' + p)
    spec = {'kind': 'creature'}
    if f:
        spec['filter'] = f
    return spec, '目標' + zctrl + zpre + zmid + '生物'


# ------------------------------------------------------------
# 效果句
# ------------------------------------------------------------
class Ctx:
    def __init__(self, card_kind, self_zh):
        self.targets = []
        self.card_kind = card_kind  # 'spell' | 'permanent'
        self.self_zh = self_zh
        self.last = None  # 最近一個目標的 Ref
        self.last_zh = ''

    def target(self, noun, optional=False):
        spec, zh = target_spec(noun)
        if optional:
            spec = dict(spec, optional=True)
            zh = '至多一個' + zh
        ref = f'T{len(self.targets)}'
        if len(self.targets) >= 3:
            raise Unsupported('too many targets')
        self.targets.append(spec)
        self.last = ref
        self.last_zh = zh.replace('目標', '該', 1) if zh.startswith('目標') else '該目標'
        return ref, zh


def tgt(ctx, s):
    """解析 'target X' / 'up to one target X' / 'any target'；回傳 (ref, 中文)"""
    s = s.strip()
    if s == 'any target':
        return ctx.target('any target')
    m = re.match(r'^(?:another|up to one other) target (.+)$', s)
    if m:
        return ctx.target('another ' + m.group(1), optional=s.startswith('up to'))
    m = re.match(r'^up to one target (.+)$', s)
    if m:
        return ctx.target(m.group(1), optional=True)
    m = re.match(r'^target (.+)$', s)
    if m:
        return ctx.target(m.group(1))
    if s in ('it', 'that creature', 'that permanent') and ctx.last:
        return ctx.last, ctx.last_zh
    raise Unsupported('ref ' + s)


def who_ref(s, ctx):
    s = s.strip().lower()
    if s == 'each opponent':
        return 'opp', '每位對手'
    if s in ('target opponent', 'target player'):
        return tgt(ctx, s)
    if s == 'you':
        return 'you', '你'
    raise Unsupported('who ' + s)


def pt(s):
    m = re.match(r'^([+-]\d+)/([+-]\d+)$', s)
    if not m:
        raise Unsupported('pt ' + s)
    return int(m.group(1)), int(m.group(2))


def fmt_pt(p, t):
    return f"{'+' if p >= 0 else ''}{p}/{'+' if t >= 0 else ''}{t}"


def sentence(s, ctx):
    """一句英文效果 → ([Effect], 中文)。無法翻譯時丟出 Unsupported。"""
    s = s.strip().rstrip('.').strip()
    s = re.sub(r'^then,? ', '', s, flags=re.I)
    low = s.lower()
    SELF = 'SELF'

    # 抓牌
    m = re.match(r'^(?:you )?draw (a|one|two|three|four) cards?$', low)
    if m:
        n = num(m.group(1))
        return [{'e': 'draw', 'n': n}], f'抓{zhn(n, True)}張牌'
    m = re.match(r'^(?:you )?draw (a|one|two|three) cards?, then discard (a|one|two) cards?$', low)
    if m:
        a, b = num(m.group(1)), num(m.group(2))
        return [{'e': 'draw', 'n': a}, {'e': 'discard', 'n': b, 'who': 'you'}], f'抓{zhn(a, True)}張牌，然後棄{zhn(b, True)}張牌'
    m = re.match(r'^(?:you may )?discard a card\. if you do, draw a card$', low)
    # 生命
    m = re.match(r'^you gain (\d+) life$', low)
    if m:
        n = int(m.group(1))
        return [{'e': 'gain', 'n': n}], f'你獲得{n}點生命'
    m = re.match(r'^(each opponent|target opponent|target player) loses (\d+) life$', low)
    if m:
        ref, z = who_ref(m.group(1), ctx)
        n = int(m.group(2))
        return [{'e': 'lose', 'n': n, 'who': ref}], f'{z}失去{n}點生命'
    m = re.match(r'^defending player loses (\d+) life and you gain (\d+) life$', low)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return [{'e': 'lose', 'n': a, 'who': 'opp'}, {'e': 'gain', 'n': b}], f'防禦玩家失去{a}點生命，且你獲得{b}點生命'
    m = re.match(r'^(each opponent|target opponent|target player) loses (\d+) life and you gain (\d+) life$', low)
    if m:
        ref, z = who_ref(m.group(1), ctx)
        a, b = int(m.group(2)), int(m.group(3))
        return [{'e': 'lose', 'n': a, 'who': ref}, {'e': 'gain', 'n': b}], f'{z}失去{a}點生命，且你獲得{b}點生命'
    # 傷害
    m = re.match(r'^(?:SELF|it) deals (\d+) damage to (.+?)$', s)
    if m:
        n = int(m.group(1))
        dest = m.group(2).lower()
        src = ctx.self_zh if ctx.card_kind == 'permanent' else ''
        if dest == 'each opponent':
            return [{'e': 'damage', 'n': n, 'to': 'opp'}], f'{src}對每位對手各造成{n}點傷害'
        if dest in ('each creature', 'each other creature'):
            f = {'type': 'Creature'}
            if dest == 'each other creature':
                f['other'] = True
            return [{'e': 'damage', 'n': n, 'to': {'all': f}}], f"{src}對每個{'其他' if 'other' in f else ''}生物各造成{n}點傷害"
        if dest in ('each creature your opponents control', "each creature you don't control"):
            return [{'e': 'damage', 'n': n, 'to': {'all': {'type': 'Creature', 'ctrl': 'opp'}}}], f'{src}對每個由對手操控的生物各造成{n}點傷害'
        m2 = re.match(r'^(.+?) and (\d+) damage to (?:that creature\'s|its) controller$', dest)
        if m2:
            ref, z = tgt(ctx, m2.group(1))
            k = int(m2.group(2))
            return [{'e': 'damage', 'n': n, 'to': ref}, {'e': 'damage', 'n': k, 'to': 'T0ctrl'}], f'{src}對{z}造成{n}點傷害，並對其操控者造成{k}點傷害'
        ref, z = tgt(ctx, dest)
        return [{'e': 'damage', 'n': n, 'to': ref}], f'{src}對{z}造成{n}點傷害'
    # 消滅／放逐／移回
    m = re.match(r'^destroy (target .+|up to one target .+)$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        return [{'e': 'destroy', 'what': ref}], f'消滅{z}'
    m = re.match(r'^exile (target .+|up to one target .+)$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        return [{'e': 'exile', 'what': ref}], f'放逐{z}'
    m = re.match(r"^return (target .+|up to one target .+) to (?:its|their) owner's hand$", low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        if ctx.targets[-1]['kind'] == 'spell':
            raise Unsupported('bounce spell')
        return [{'e': 'bounce', 'what': ref}], f'將{z}移回其擁有者手上'
    m = re.match(r'^destroy all creatures$', low)
    if m:
        return [{'e': 'destroy', 'what': {'all': {'type': 'Creature'}}}], '消滅所有生物'
    # 增益
    m = re.match(r'^(target .+?|up to one target .+?|another target .+?|SELF|it|creatures you control|other creatures you control|creatures your opponents control) gets? ([+-]\d+/[+-]\d+)(?: and gains? (.+?))? until end of turn$', s, flags=re.I)
    if m:
        who, ptxt, kws = m.groups()
        p, t = pt(ptxt)
        kw, kzh = kw_list(kws) if kws else ([], '')
        wl = who.lower()
        if who == SELF:
            ref, z = 'self', ctx.self_zh
        elif wl == 'creatures you control':
            ref, z = {'all': {'type': 'Creature', 'ctrl': 'you'}}, '由你操控的生物'
        elif wl == 'creatures your opponents control':
            ref, z = {'all': {'type': 'Creature', 'ctrl': 'opp'}}, '由對手操控的生物'
        elif wl == 'other creatures you control':
            ref, z = {'all': {'type': 'Creature', 'ctrl': 'you', 'other': True}}, '由你操控的其他生物'
        else:
            ref, z = tgt(ctx, wl)
        e = {'e': 'pump', 'what': ref, 'p': p, 't': t}
        if kw:
            e['kw'] = kw
        return [e], f"{z}得{fmt_pt(p, t)}{'並獲得' + kzh + '異能' if kw else ''}直到回合結束"
    m = re.match(r'^(target .+?|up to one target .+?|SELF|it|creatures you control) gains? (.+?) until end of turn$', s, flags=re.I)
    if m:
        who, kws = m.groups()
        kw, kzh = kw_list(kws)
        wl = who.lower()
        if who == SELF:
            ref, z = 'self', ctx.self_zh
        elif wl == 'creatures you control':
            ref, z = {'all': {'type': 'Creature', 'ctrl': 'you'}}, '由你操控的生物'
        else:
            ref, z = tgt(ctx, wl)
        return [{'e': 'pump', 'what': ref, 'p': 0, 't': 0, 'kw': kw}], f'{z}獲得{kzh}異能直到回合結束'
    # 指示物
    m = re.match(r'^put (a|an|one|two|three|four) \+1/\+1 counters? on (.+)$', s, flags=re.I)
    if m:
        n = num(m.group(1))
        dest = m.group(2)
        if dest == SELF:
            ref, z = 'self', ctx.self_zh
        elif dest.lower() == 'each creature you control':
            ref, z = {'all': {'type': 'Creature', 'ctrl': 'you'}}, '每個由你操控的生物'
        elif dest.lower() == 'each other creature you control':
            ref, z = {'all': {'type': 'Creature', 'ctrl': 'you', 'other': True}}, '每個由你操控的其他生物'
        else:
            ref, z = tgt(ctx, dest.lower())
        return [{'e': 'counters', 'what': ref, 'n': n}], f'在{z}上放置{zhn(n, True)}個+1/+1指示物'
    m = re.match(r'^put a stun counter on (.+)$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        return [{'e': 'stun', 'what': ref}], f'在{z}上放置一個暈眩指示物'
    # 橫置／重置
    m = re.match(r'^tap (target .+|up to one target .+)$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        return [{'e': 'tap', 'what': ref}], f'橫置{z}'
    m = re.match(r'^untap (target .+)$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        return [{'e': 'untap', 'what': ref}], f'重置{z}'
    # 反擊
    m = re.match(r'^counter (target .+?) unless its controller pays \{(\d+)\}$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        k = int(m.group(2))
        return [{'e': 'counterUnless', 'what': ref, 'pay': k}], f'反擊{z}，除非其操控者支付{{{k}}}'
    m = re.match(r'^counter (target .+)$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        if ctx.targets[-1]['kind'] != 'spell':
            raise Unsupported('counter non-spell')
        return [{'e': 'counter', 'what': ref}], f'反擊{z}'
    m = re.match(r"^(target .+?|SELF) can't be blocked this turn$", s, flags=re.I)
    if m:
        if m.group(1) == SELF:
            ref, z = 'self', ctx.self_zh
        else:
            ref, z = tgt(ctx, m.group(1).lower())
        return [{'e': 'pump', 'what': ref, 'p': 0, 't': 0, 'kw': ['unblockable']}], f'{z}本回合不能被阻擋'
    m = re.match(r'^earthbend (\d+)$', low)
    if m:
        n = int(m.group(1))
        return [{'e': 'earthbend', 'n': n}], f'大地彎折{n}（簡化：派出一個0/0具敏捷的大地元素，並放上{n}個+1/+1指示物）'
    m = re.match(r'^(target player|target opponent|each opponent) mills (a|one|two|three|four|five) cards?$', low)
    if m:
        ref, z = who_ref(m.group(1), ctx)
        n = num(m.group(2))
        return [{'e': 'mill', 'n': n, 'who': ref}], f'{z}磨{zhn(n, True)}張牌'
    if low == 'untap that creature' and ctx.last:
        return [{'e': 'untap', 'what': ctx.last}], f'重置{ctx.last_zh}'
    # 牌庫操作
    m = re.match(r'^scry (\d+)$', low)
    if m:
        n = int(m.group(1))
        return [{'e': 'scry', 'n': n}], f'占卜{n}'
    m = re.match(r'^surveil (\d+)$', low)
    if m:
        n = int(m.group(1))
        return [{'e': 'surveil', 'n': n}], f'刺探{n}'
    m = re.match(r'^mill (a|one|two|three|four|five) cards?$', low)
    if m:
        n = num(m.group(1))
        return [{'e': 'mill', 'n': n}], f'磨{zhn(n, True)}張牌'
    m = re.match(r'^(you may )?search your library for a basic land card, put it onto the battlefield tapped, then shuffle$', low)
    if m:
        e = {'e': 'searchLand', 'to': 'battlefield', 'tapped': True}
        if m.group(1):
            e['may'] = True
        return [e], f"{'你可以' if m.group(1) else ''}從你的牌庫中搜尋一張基本地牌，將它橫置放進戰場，然後將你的牌庫洗牌"
    m = re.match(r'^(you may )?search your library for a basic land card, reveal it, put it into your hand, then shuffle$', low)
    if m:
        e = {'e': 'searchLand', 'to': 'hand'}
        if m.group(1):
            e['may'] = True
        return [e], f"{'你可以' if m.group(1) else ''}從你的牌庫中搜尋一張基本地牌，展示該牌並置於你手上，然後將你的牌庫洗牌"
    m = re.match(r'^return target creature card from your graveyard to your hand$', low)
    if m:
        ctx.targets.append({'kind': 'gyCard', 'filter': {'ctrl': 'you', 'type': 'Creature'}, 'prompt': '選擇你墳墓場中的生物牌'})
        ref = f'T{len(ctx.targets) - 1}'
        return [{'e': 'toHand', 'what': ref}], '將目標生物牌從你的墳墓場移回你手上'
    m = re.match(r'^return up to one target creature card from your graveyard to your hand$', low)
    if m:
        ctx.targets.append({'kind': 'gyCard', 'filter': {'ctrl': 'you', 'type': 'Creature'}, 'optional': True, 'prompt': '選擇你墳墓場中的生物牌'})
        ref = f'T{len(ctx.targets) - 1}'
        return [{'e': 'toHand', 'what': ref}], '將至多一張目標生物牌從你的墳墓場移回你手上'
    m = re.match(r'^return target creature card from your graveyard to the battlefield$', low)
    if m:
        ctx.targets.append({'kind': 'gyCard', 'filter': {'ctrl': 'you', 'type': 'Creature'}, 'prompt': '選擇你墳墓場中的生物牌'})
        ref = f'T{len(ctx.targets) - 1}'
        return [{'e': 'reanimate', 'what': ref}], '將目標生物牌從你的墳墓場移回戰場'
    m = re.match(r'^look at the top (two|three|four|five) cards of your library\. put one of them into your hand and the rest on the bottom of your library in (?:a|any) random order$', low)
    # 棄牌／犧牲
    m = re.match(r'^(each opponent|target opponent|target player) discards (a|one|two) cards?$', low)
    if m:
        ref, z = who_ref(m.group(1), ctx)
        n = num(m.group(2))
        return [{'e': 'discard', 'n': n, 'who': ref}], f'{z}棄{zhn(n, True)}張牌'
    m = re.match(r'^(each opponent|target opponent|target player) sacrifices a creature(?: of their choice)?$', low)
    if m:
        ref, z = who_ref(m.group(1), ctx)
        return [{'e': 'edict', 'who': ref, 'filter': {'type': 'Creature'}}], f'{z}犧牲一個生物'
    # 打架／咬
    m = re.match(r"^(target creature you control) fights (target creature you don't control|target creature an opponent controls|up to one target creature you don't control)$", low)
    if m:
        a, za = tgt(ctx, m.group(1))
        b, zb = tgt(ctx, m.group(2))
        return [{'e': 'fight', 'a': a, 'b': b}], f'{za}與{zb}互鬥'
    m = re.match(r"^(target creature you control) deals damage equal to its power to (target creature(?: or planeswalker)? (?:you don't control|an opponent controls))$", low)
    if m:
        a, za = tgt(ctx, m.group(1))
        b, zb = tgt(ctx, m.group(2))
        return [{'e': 'bite', 'a': a, 'b': b}], f'{za}對{zb}造成等同於其力量的傷害'
    m = re.match(r"^SELF fights (target creature you don't control|target creature an opponent controls|up to one target creature you don't control)$", s)
    if m:
        b, zb = tgt(ctx, m.group(1).lower())
        return [{'e': 'fight', 'a': 'self', 'b': b}], f'{ctx.self_zh}與{zb}互鬥'
    m = re.match(r'^create a monster role token attached to (.+)$', low)
    if m:
        ref, z = tgt(ctx, m.group(1))
        return [{'e': 'role', 'what': ref, 'token': 'tok-monster-role'}], f'派出一個怪物角色衍生物結附於{z}（得+1/+1且具有踐踏異能）'
    m = re.match(r'^attacking creatures you control get ([+-]\d+/[+-]\d+) until end of turn$|^attacking creatures get ([+-]\d+/[+-]\d+) until end of turn$', low)
    if m:
        p, t = pt(m.group(1) or m.group(2))
        f = {'type': 'Creature', 'attacking': True}
        if m.group(1):
            f['ctrl'] = 'you'
        return [{'e': 'pump', 'what': {'all': f}, 'p': p, 't': t}], f"{'由你操控的' if m.group(1) else ''}進行攻擊的生物得{fmt_pt(p, t)}直到回合結束"
    # 具名衍生物
    NAMED = {'food': ('tok-food', '食物'), 'clue': ('tok-clue', '線索'), 'treasure': ('tok-treasure', '珍寶'), 'lander': ('tok-lander', '登陸器')}
    m = re.match(r'^create (a|an|one|two|three) (food|clue|treasure|lander) tokens?$', low)
    if m:
        n = num(m.group(1))
        tid, tz = NAMED[m.group(2)]
        e = {'e': 'token', 'token': tid}
        if n > 1:
            e['n'] = n
        return [e], f'派出{zhn(n, True)}個{tz}衍生物'
    if low == 'investigate':
        return [{'e': 'token', 'token': 'tok-clue'}], '調查（派出一個線索衍生物）'
    if low == 'investigate twice':
        return [{'e': 'token', 'token': 'tok-clue', 'n': 2}], '調查兩次（派出兩個線索衍生物）'
    m = re.match(r'^discard (a|one|two) cards?$', low)
    if m:
        n = num(m.group(1))
        return [{'e': 'discard', 'n': n, 'who': 'you'}], f'棄{zhn(n, True)}張牌'
    m = re.match(r'^you lose (\d+) life$', low)
    if m:
        n = int(m.group(1))
        return [{'e': 'lose', 'n': n, 'who': 'you'}], f'你失去{n}點生命'
    if low.startswith('@discardchosen '):
        f = {'nonland': {'nonType': 'Land'}, 'creature': {'type': 'Creature'}, 'noncreature, nonland': {'nonType': ['Creature', 'Land']}}[low[len('@discardchosen '):]]
        ref, z = tgt(ctx, 'target opponent')
        kind = {'nonland': '非地', 'creature': '生物', 'noncreature, nonland': '非生物、非地'}[low[len('@discardchosen '):]]
        return [{'e': 'discardChosen', 'who': ref, 'filter': f}], f'{z}展示其手牌。你從中選擇一張{kind}牌，該玩家棄掉那張牌'
    m = re.match(r'^@dig (\d+) (\d+) (bottom|graveyard)(?: (\w+))?$', low)
    if m:
        n, take, rest, ftype = int(m.group(1)), int(m.group(2)), m.group(3), m.group(4)
        e = {'e': 'dig', 'n': n, 'take': take, 'rest': rest}
        tz = {'creature': '生物', 'land': '地', 'artifact': '神器', 'enchantment': '結界'}
        if ftype:
            e['filter'] = {'type': ftype.capitalize()}
            z = f'檢視你牌庫頂的{zhn(n)}張牌。你可以展示其中一張{tz[ftype]}牌並置於你手上'
        else:
            z = f'檢視你牌庫頂的{zhn(n)}張牌。將其中{zhn(take)}張置於你手上'
        z += '，將其餘的牌以隨機順序置於你的牌庫底' if rest == 'bottom' else '，將其餘的牌置入你的墳墓場'
        return [e], z
    # 衍生物
    m = re.match(r'^[Cc]reate (a|an|one|two|three|four) (\d+)/(\d+) ((?:white|blue|black|red|green|colorless)(?:(?:,| and) (?:white|blue|black|red|green))*) ([A-Z][a-z]+(?: [A-Z][a-z]+)*) (?:artifact )?creature tokens?(?: with (.+?))?$', s)
    if m:
        n = num(m.group(1))
        p, t = int(m.group(2)), int(m.group(3))
        cols = [c for c in re.split(r',? and |, ', m.group(4))]
        subs = m.group(5).split(' ')
        kws = []
        kzh = ''
        if m.group(6):
            kx = m.group(6)
            if kx.startswith('"'):
                raise Unsupported('token ability')
            kws, kzh = kw_list(kx)
        tid = token_for(p, t, cols, subs, kws)
        czh = color_zh(cols)
        subzh = ''.join(subs)
        tzh = f"派出{zhn(n, True)}個{p}/{t}{czh}{'，具有' + kzh + '異能' if kws else ''}的{sub_word(subs)}衍生生物"
        e = {'e': 'token', 'token': tid}
        if n > 1:
            e['n'] = n
        return [e], tzh
    # 「A and B」：兩半各自能翻譯就拆開
    for mm in re.finditer(r' and (?=(?:draw|you gain|you lose|put|create|tap|untap|scry|surveil|mill|return|exile|destroy|each opponent|target|it gains|it gets|SELF deals|discard)\b)', s):
        a, b = s[: mm.start()], s[mm.end():]
        saved = (list(ctx.targets), ctx.last, ctx.last_zh)
        try:
            ea, za = sentence(a, ctx)
            eb, zb = sentence(b[0].upper() + b[1:], ctx)
            return ea + eb, za + '，並' + zb
        except Unsupported:
            ctx.targets, ctx.last, ctx.last_zh = saved
    raise Unsupported('sentence: ' + s)


COLOR_EN = {'white': 'W', 'blue': 'U', 'black': 'B', 'red': 'R', 'green': 'G'}
COLOR_ZH = {'white': '白色', 'blue': '藍色', 'black': '黑色', 'red': '紅色', 'green': '綠色', 'colorless': '無色'}


def color_zh(cols):
    return '與'.join(COLOR_ZH[c] for c in cols)


SUBZH = {}
SINGULAR = {'Elves': 'Elf', 'Wolves': 'Wolf', 'Dwarves': 'Dwarf', 'Mice': 'Mouse', 'Faeries': 'Faerie', 'Villains': 'Villain', 'Heroes': 'Hero', 'Allies': 'Ally', 'Zombies': 'Zombie', 'Goblins': 'Goblin', 'Humans': 'Human', 'Knights': 'Knight', 'Vampires': 'Vampire', 'Dragons': 'Dragon', 'Rats': 'Rat', 'Frogs': 'Frog', 'Lizards': 'Lizard', 'Rabbits': 'Rabbit', 'Birds': 'Bird', 'Squirrels': 'Squirrel', 'Otters': 'Otter', 'Bats': 'Bat', 'Raccoons': 'Raccoon', 'Spiders': 'Spider', 'Soldiers': 'Soldier', 'Warriors': 'Warrior', 'Wizards': 'Wizard', 'Pirates': 'Pirate', 'Dinosaurs': 'Dinosaur', 'Merfolk': 'Merfolk', 'Spirits': 'Spirit', 'Robots': 'Robot', 'Ninjas': 'Ninja', 'Mutants': 'Mutant', 'Cats': 'Cat', 'Hobbits': 'Hobbit', 'Halflings': 'Halfling'}


def sub_word(subs):
    return '／'.join(SUBZH.get(s, s) for s in subs)


TOKENS = {}
EXISTING_TOKENS = {}


def token_for(p, t, cols, subs, kws):
    c = [COLOR_EN[x] for x in cols if x in COLOR_EN]
    key = (p, t, tuple(sorted(c)), tuple(subs), tuple(sorted(kws)))
    if key in EXISTING_TOKENS:
        return EXISTING_TOKENS[key]
    if key in TOKENS:
        return TOKENS[key]['id']
    tid = 'tok-g-' + slug(' '.join(subs)) + f'-{p}{t}-' + ''.join(sorted(c)).lower() + ('-' + '-'.join(sorted(kws)) if kws else '')
    kzh = '，'.join(KW[k.replace('_', ' ')][1] for k in kws)
    TOKENS[key] = {
        'id': tid,
        'name': ' '.join(subs),
        'colors': c,
        'types': ['Creature'],
        'subtypes': subs,
        'power': p,
        'toughness': t,
        **({'keywords': kws} if kws else {}),
        'text': kzh,
    }
    return tid


def split_sentences(par):
    # 以句點分句（不切開引號內）
    par = par.strip()
    out = []
    buf = ''
    q = False
    for ch in par:
        buf += ch
        if ch == '"':
            q = not q
        if ch == '.' and not q:
            out.append(buf.strip())
            buf = ''
    if buf.strip():
        out.append(buf.strip())
    # ", then draw a card" 等拆開
    res = []
    for s in out:
        parts = re.split(r', then (?=draw|scry|surveil|discard|you gain|mill)', s)
        for i, p in enumerate(parts):
            res.append(p if i == 0 else '@then ' + p)
    return res


NUMW = r'(two|three|four|five|six|seven)'
MULTI = [
    (r'Target opponent reveals their hand\. You choose an? (nonland|creature|noncreature, nonland) card from it\. That player discards that card\.', lambda m: f'@discardchosen {m.group(1)}.'),
    (r'Look at the top ' + NUMW + r' cards of your library\. Put (one|two) of them into your hand and the rest on the bottom of your library in a random order\.', lambda m: f'@dig {num(m.group(1))} {num(m.group(2))} bottom.'),
    (r'Look at the top ' + NUMW + r' cards of your library\. Put (one|two) of them into your hand and the rest into your graveyard\.', lambda m: f'@dig {num(m.group(1))} {num(m.group(2))} graveyard.'),
    (r'Look at the top ' + NUMW + r' cards of your library\. You may reveal an? (creature|land|artifact|enchantment) card from among them and put it into your hand\. Put the rest on the bottom of your library in a random order\.', lambda m: f'@dig {num(m.group(1))} 1 bottom {m.group(2)}.'),
]


def effects_of(text, ctx):
    for pat, fn in MULTI:
        text = re.sub(pat, fn, text, flags=re.I)
    effs = []
    out = ''
    for s in split_sentences(text):
        then = s.startswith('@then ')
        e, z = sentence(s[6:] if then else s, ctx)
        effs += e
        out += ('，然後' + z) if then and out else (('。' if out else '') + z)
    return effs, out + '。'


# ------------------------------------------------------------
# 觸發與起動
# ------------------------------------------------------------
TRIGGERS = [
    (r'^When SELF enters, (.+)$', 'etb', '當{self}進戰場時，'),
    (r'^When SELF dies, (.+)$', 'dies', '當{self}死去時，'),
    (r'^Whenever SELF attacks, (.+)$', 'attacks', '每當{self}攻擊時，'),
    (r'^Whenever SELF blocks, (.+)$', 'blocks', '每當{self}阻擋時，'),
    (r'^Whenever SELF deals combat damage to a player, (.+)$', 'combatDamagePlayer', '每當{self}對玩家造成戰鬥傷害時，'),
    (r'^Whenever you cast a noncreature spell, (.+)$', 'castNoncreature', '每當你施放非生物咒語時，'),
    (r'^Whenever you cast an instant or sorcery spell, (.+)$', 'castInstSorc', '每當你施放瞬間或法術咒語時，'),
    (r'^At the beginning of your upkeep, (.+)$', 'upkeep', '在你的維持開始時，'),
    (r'^At the beginning of your end step, (.+)$', 'endStep', '在你的結束步驟開始時，'),
    (r'^At the beginning of combat on your turn, (.+)$', 'combatStart', '在你回合的戰鬥開始時，'),
    (r'^Whenever you gain life, (.+)$', 'lifegain', '每當你獲得生命時，'),
    (r'^Landfall — Whenever a land you control enters, (.+)$', 'landfall', '地落—每當一個地在你的操控下進戰場時，'),
    (r'^Whenever another creature you control enters, (.+)$', 'allyEtb', '每當另一個生物在你的操控下進戰場時，'),
    (r'^Whenever another creature you control dies, (.+)$', 'allyDies', '每當另一個由你操控的生物死去時，'),
    (r'^When SELF enters or dies, (.+)$', 'etb+dies', '當{self}進戰場或死去時，'),
    (r'^Whenever you draw your second card each turn, (.+)$', 'drawSecond', '每當你於一回合中抓第二張牌時，'),
    (r'^Whenever you attack, (.+)$', 'youAttack', '每當你攻擊時，'),
    (r'^Whenever a creature you control dies, (.+)$', 'allyDies*', '每當一個由你操控的生物死去時，'),
    (r'^Whenever another creature dies, (.+)$', 'otherDies', '每當另一個生物死去時，'),
    (r'^Whenever an opponent casts a noncreature spell, (.+)$', 'castNoncreature!', '每當對手施放非生物咒語時，'),
    (r'^Whenever SELF enters or attacks, (.+)$', 'etb+attacks', '每當{self}進戰場或攻擊時，'),
]


def parse_trigger(par, self_zh):
    for pat, on, zpre in TRIGGERS:
        m = re.match(pat, par)
        if not m:
            continue
        body = m.group(1)
        may = None
        mm = re.match(r'^you may (.+)$', body)
        if mm:
            body = mm.group(1)
            body = body[0].upper() + body[1:]
            may = True
        ctx = Ctx('permanent', self_zh)
        effs, zh = effects_of(body, ctx)
        prefix = zpre.format(self=self_zh)
        abil = []
        for o in on.split('+'):
            flags = {}
            if o.endswith('*'):
                o = o[:-1]
                flags['includeSelf'] = True
            if o.endswith('!'):
                raise Unsupported('opp cast')
            a = {'kind': 'trigger', 'on': o, 'effects': effs, **flags}
            if ctx.targets:
                a['targets'] = ctx.targets
            if may:
                a['may'] = zh.rstrip('。') + '？'
            abil.append(a)
        return abil, prefix + ('你可以' if may else '') + zh
    return None


SAC_OTHER = {
    'Sacrifice a token': ({'token': True}, '犧牲一個衍生物'),
    'Sacrifice another creature': ({'type': 'Creature', 'other': True}, '犧牲另一個生物'),
    'Sacrifice a creature': ({'type': 'Creature'}, '犧牲一個生物'),
    'Sacrifice an artifact': ({'type': 'Artifact'}, '犧牲一個神器'),
    'Sacrifice a land': ({'type': 'Land'}, '犧牲一個地'),
}


def parse_cost(c, self_zh, is_creature):
    cost = {}
    zparts = []
    for part in [x.strip() for x in c.split(',')]:
        if re.fullmatch(r'(\{[0-9WUBRGC]\})+', part):
            cost['mana'] = part
            zparts.append(part)
        elif part == '{T}':
            cost['tap'] = True
            zparts.append('{T}')
        elif part == 'Sacrifice SELF':
            cost['sacSelf'] = True
            zparts.append('犧牲' + self_zh)
        elif part in SAC_OTHER:
            f, z = SAC_OTHER[part]
            cost['sacOther'] = f
            zparts.append(z)
        elif re.fullmatch(r'Pay (\d+) life', part):
            cost['life'] = int(re.fullmatch(r'Pay (\d+) life', part).group(1))
            zparts.append(f"支付{cost['life']}點生命")
        else:
            raise Unsupported('cost ' + part)
    return cost, '，'.join(zparts)


def parse_activated(par, self_zh, is_creature):
    m = re.match(r'^([^:"]+): (.+)$', par)
    if not m:
        return None
    cost_s, body = m.groups()
    cost, zcost = parse_cost(cost_s, self_zh, is_creature)
    sorcery = False
    once = False
    body = body.strip()
    if body.endswith('Activate only as a sorcery.'):
        body = body[: -len('Activate only as a sorcery.')].strip()
        sorcery = True
    if body.endswith('Activate only once each turn.'):
        body = body[: -len('Activate only once each turn.')].strip()
        once = True
    # 法術力異能
    mm = re.fullmatch(r'Add \{([WUBRGC])\}(?:,? (?:or )?\{([WUBRGC])\})?(?:,? (?:or )?\{([WUBRGC])\})?\.', body)
    if mm and cost == {'tap': True}:
        return ('mana', [x for x in mm.groups() if x]), f"{zcost}：加{'或'.join('{' + x + '}' for x in mm.groups() if x)}。"
    if body == 'Add one mana of any color.' and cost == {'tap': True}:
        return ('mana', ['W', 'U', 'B', 'R', 'G']), f'{zcost}：加一點任意顏色的法術力。'
    ctx = Ctx('permanent', self_zh)
    effs, zh = effects_of(body, ctx)
    a = {'kind': 'activated', 'cost': cost, 'effects': effs, 'label': zh.rstrip('。')[:18]}
    if ctx.targets:
        a['targets'] = ctx.targets
    if sorcery:
        a['sorcery'] = True
    if once:
        a['oncePerTurn'] = True
    tail = ('只能於法術時機起動。' if sorcery else '') + ('此異能每回合只能起動一次。' if once else '')
    return ('ability', a), f'{zcost}：{zh}{tail}'


def parse_static(par, self_zh, d):
    m = re.fullmatch(r'SELF can\'t block\.', par)
    if m:
        d.setdefault('abilities', []).append({'kind': 'static', 'self': {'grant': {'cantBlock': True}}})
        return f'{self_zh}不能阻擋。'
    if re.fullmatch(r"SELF can't be blocked\.", par):
        d.setdefault('keywords', []).append('unblockable')
        return f'{self_zh}不能被阻擋。'
    if re.fullmatch(r'SELF enters tapped\.', par):
        d['etbTapped'] = True
        return f'{self_zh}橫置進戰場。'
    m = re.fullmatch(r'SELF enters with (a|one|two|three|four) ([+-])1/[+-]1 counters? on it\.', par)
    if m:
        n = num(m.group(1))
        sign = m.group(2)
        d['etbCounters'] = n if sign == '+' else -n
        return f'{self_zh}進戰場時上面有{zhn(n, True)}個{sign}1/{sign}1指示物。'
    if par == 'If this card is in your opening hand, you may begin the game with it on the battlefield.':
        d['leyline'] = True
        return '若此牌在你的起手中，你可以在遊戲開始時將它放進戰場。'
    m = re.fullmatch(r'(Other creatures|Creatures) you control have (.+?)\.', par)
    if m:
        kw, kzh = kw_list(m.group(2))
        f = {'type': 'Creature', 'ctrl': 'you'}
        if m.group(1).startswith('Other'):
            f['other'] = True
        d.setdefault('abilities', []).append({'kind': 'static', 'anthem': {'filter': f, 'grant': {'kw': kw}}})
        return f"由你操控的{'其他' if 'other' in f else ''}生物具有{kzh}異能。"
    m = re.fullmatch(r'Other ([A-Z][a-z]+?)(?: creatures|s| creature)? you control get ([+-]\d+/[+-]\d+)(?: and have (.+?))?\.', par)
    if m and m.group(1) not in ('Creature',):
        sub = SINGULAR.get(m.group(1), m.group(1))
        if sub not in SUBZH:
            raise Unsupported('anthem sub ' + sub)
        p, t = pt(m.group(2))
        kw, kzh = kw_list(m.group(3)) if m.group(3) else ([], '')
        grant = {'p': p, 't': t}
        if kw:
            grant['kw'] = kw
        d.setdefault('abilities', []).append({'kind': 'static', 'anthem': {'filter': {'sub': sub, 'ctrl': 'you', 'other': True}, 'grant': grant}})
        return f"由你操控的其他{SUBZH[sub]}得{fmt_pt(p, t)}{'且具有' + kzh + '異能' if kw else ''}。"
    m = re.fullmatch(r'(Other creatures|Creatures) you control get ([+-]\d+/[+-]\d+)(?: and have (.+?))?\.', par)
    if m:
        who, ptxt, kws = m.groups()
        p, t = pt(ptxt)
        kw, kzh = kw_list(kws) if kws else ([], '')
        f = {'type': 'Creature', 'ctrl': 'you'}
        if who.startswith('Other'):
            f['other'] = True
        grant = {'p': p, 't': t}
        if kw:
            grant['kw'] = kw
        d.setdefault('abilities', []).append({'kind': 'static', 'anthem': {'filter': f, 'grant': grant}})
        return f"由你操控的{'其他' if 'other' in f else ''}生物得{fmt_pt(p, t)}{'且具有' + kzh + '異能' if kw else ''}。"
    return None


COLOR_WORD = {'white': 'W', 'blue': 'U', 'black': 'B', 'red': 'R', 'green': 'G'}
BASIC_SUB = {'Plains': '平原', 'Island': '海島', 'Swamp': '沼澤', 'Mountain': '山脈', 'Forest': '樹林'}


def land_par(par, d, produces):
    """地專用的段落；回傳 (中文, 新的 produces 或 None)；不認得時回傳 None"""
    if par == '{T}: Add {C}.':
        if produces:
            raise Unsupported('two mana abilities')
        return '{T}：加{C}。', ['C']
    if par == '{1}, {T}: Add one mana of any color.' and produces == ['C']:
        d['filterMana'] = True
        return '{1}，{T}：加一點任意顏色的法術力。', None
    if par in ('SELF enters tapped. As it enters, choose a color.',):
        d['etbTapped'] = True
        return '此地橫置進戰場。', None
    if par == 'As SELF enters, choose a color.':
        return '', None
    if par == '{T}: Add one mana of the chosen color.':
        if produces:
            raise Unsupported('two mana abilities')
        return '{T}：加一點任意顏色的法術力。（簡化：原本是進場時選定一種顏色）', ['W', 'U', 'B', 'R', 'G']
    m = re.fullmatch(r'SELF enters tapped unless you control two or more other lands\.', par)
    if m:
        d['etbTappedUnless'] = {'c': 'controls', 'filter': {'type': 'Land', 'other': True}, 'n': 2}
        return '除非你操控兩個或更多其他的地，否則此地橫置進戰場。', None
    m = re.fullmatch(r'SELF enters tapped unless a player has 13 or less life\.', par)
    if m:
        d['etbTappedUnless'] = {'c': 'anyLifeLte', 'n': 13}
        return '除非有玩家的生命為13點或更少，否則此地橫置進戰場。', None
    m = re.fullmatch(r'SELF enters tapped unless you control a basic land\.', par)
    if m:
        d['etbTappedUnless'] = {'c': 'controls', 'filter': {'type': 'Land', 'basic': True}}
        return '除非你操控基本地，否則此地橫置進戰場。', None
    m = re.fullmatch(r'SELF enters tapped unless you control an? (Plains|Island|Swamp|Mountain|Forest) or an? (Plains|Island|Swamp|Mountain|Forest)\.', par)
    if m:
        a, b = m.groups()
        d['etbTappedUnless'] = {'c': 'controls', 'filter': {'type': 'Land', 'sub': [a, b]}}
        return f'除非你操控{BASIC_SUB[a]}或{BASIC_SUB[b]}，否則此地橫置進戰場。', None
    # 人地：直到回合結束成為生物
    m = re.fullmatch(r'((?:\{[0-9WUBRGC]\})+): (?:Until end of turn, )?SELF becomes an? (\d+)/(\d+) ((?:(?:white|blue|black|red|green)(?: and )?)*) ?([A-Z][a-z]+(?: [A-Z][a-z]+)*)? ?creature(?: with ([a-z ,]+?))?(?: and all creature types)?(?: until end of turn)?\. It\'s still a land\.', par)
    if m:
        cost, p, t, cols, subs, kws = m.groups()
        p, t = int(p), int(t)
        colors = [COLOR_WORD[c] for c in re.findall(r'white|blue|black|red|green', cols or '')]
        kw, kzh = kw_list(kws) if kws else ([], '')
        e = {'e': 'animate', 'what': 'self', 'p': p, 't': t}
        if kw:
            e['kw'] = kw
        if subs:
            e['subtypes'] = subs.split(' ')
        if colors:
            e['colors'] = colors
        d.setdefault('abilities', []).append({'kind': 'activated', 'cost': {'mana': cost}, 'effects': [e], 'label': f'成為{p}/{t}生物'})
        czh = '與'.join({'W': '白色', 'U': '藍色', 'B': '黑色', 'R': '紅色', 'G': '綠色'}[c] for c in colors)
        sz = sub_word(subs.split(' ')) if subs else ''
        return f"{cost}：直到回合結束，此地成為{p}/{t}{czh}{'，具有' + kzh + '異能' if kw else ''}的{sz}生物。它仍是地。", None
    return None


# ------------------------------------------------------------
# 整張卡
# ------------------------------------------------------------
SKIP_TYPES = ['Planeswalker', 'Battle', 'Vehicle', 'Saga', 'Class', 'Case', 'Room', 'Kindred', 'Spacecraft', 'Siege', 'Background', 'Shrine', 'Planet']


def self_noun(types, subtypes):
    if 'Land' in types:
        return '此地'
    if 'Creature' in types:
        return '此生物'
    if 'Aura' in subtypes:
        return '此靈氣'
    if 'Equipment' in subtypes:
        return '此武具'
    if 'Enchantment' in types:
        return '此結界'
    if 'Artifact' in types:
        return '此神器'
    return '此咒語'


TYPE_ZH = {'Instant': '瞬間', 'Sorcery': '法術'}


def convert(c):
    if c['layout'] == 'adventure':
        return convert_adventure(c)
    return convert_face(c)


def convert_adventure(c):
    main, adv = c['card_faces']
    face = dict(c, layout='normal', name=main['name'], mana_cost=main.get('mana_cost'), type_line=main['type_line'],
                oracle_text=main.get('oracle_text') or '', power=main.get('power'), toughness=main.get('toughness'))
    d = convert_face(face)
    tl = adv['type_line']
    if tl.startswith('Instant'):
        atypes = ['Instant']
    elif tl.startswith('Sorcery'):
        atypes = ['Sorcery']
    else:
        raise Unsupported('adventure type ' + tl)
    acost = adv.get('mana_cost') or ''
    if not acost or re.search(r'\{[^}]*(X|P|S)[^}]*\}', acost):
        raise Unsupported('cost ' + acost)
    text = re.sub(r'\s*\([^)]*\)', '', adv.get('oracle_text') or '')
    for nm in (adv['name'], main['name']):
        text = text.replace(nm, 'SELF')
    text = re.sub(r'\b[Tt]his spell\b', 'SELF', text)
    pars = [x.strip() for x in text.split('\n') if x.strip()]
    if not pars:
        raise Unsupported('empty adventure')
    ctx = Ctx('spell', '此咒語')
    effs, zh = effects_of(' '.join(pars), ctx)
    spell = {'effects': effs}
    if ctx.targets:
        spell['targets'] = ctx.targets
    tz = TYPE_ZH[atypes[0]]
    d['adventure'] = {'name': adv['name'], 'cost': acost, 'types': atypes, 'text': zh, 'spell': spell}
    d['imageName'] = c['name']
    d['text'] = (d['text'] + '\n' if d['text'] else '') + f"冒險—《{adv['name']}》{acost}（{tz}）：{zh}\n（你可以改為施放這個冒險{tz}。結算後此牌會被放逐，之後你可以從放逐區施放本體。）"
    return d


def convert_face(c):
    if c['layout'] != 'normal':
        raise Unsupported('layout ' + c['layout'])
    tl = c['type_line']
    if any(t in tl for t in SKIP_TYPES):
        raise Unsupported('type ' + tl)
    for k in c.get('keywords') or []:
        if k not in OK_KEYWORDS:
            raise Unsupported('keyword ' + k)
    cost = c.get('mana_cost') or ''
    if re.search(r'\{[^}]*(X|P|S)[^}]*\}', cost) or not cost and 'Land' not in tl:
        raise Unsupported('cost ' + cost)
    left, _, right = tl.partition('—')
    words = left.split()
    supertypes = [w for w in words if w in ('Legendary',)]
    types = [w for w in words if w in ('Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land')]
    if 'Land' in types and len(types) > 1 and types != ['Enchantment', 'Land']:
        raise Unsupported('type ' + tl)
    if not types or any(w not in ('Legendary', 'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land') for w in words):
        raise Unsupported('type ' + tl)
    subtypes = right.split() if right else []
    name = c['name']
    text = c.get('oracle_text') or ''
    text = re.sub(r'\s*\([^)]*\)', '', text)  # 提示文字
    short = name.split(',')[0]
    text = text.replace(name, 'SELF')
    if short != name and 'Legendary' in supertypes:
        text = re.sub(r'\b' + re.escape(short) + r'\b', 'SELF', text)
    text = re.sub(r'\bthis (creature|spell|enchantment|artifact|Aura|Equipment|land)\b', 'SELF', text)
    text = re.sub(r'\bThis (creature|spell|enchantment|artifact|Aura|Equipment|land)\b', 'SELF', text)
    self_zh = self_noun(types, subtypes)
    d = {
        'set': c['set'].upper(),
        'rarity': RARITY[c['rarity']],
        'name': name,
        'cost': cost,
        'types': types,
    }
    if supertypes:
        d['supertypes'] = supertypes
    if subtypes:
        d['subtypes'] = subtypes
    if 'Creature' in types:
        if not (c.get('power') or '').isdigit() or not (c.get('toughness') or '').isdigit():
            raise Unsupported('pt')
        d['power'] = int(c['power'])
        d['toughness'] = int(c['toughness'])
    zh_lines = []
    pars = [p.strip() for p in text.split('\n') if p.strip()]
    is_spell = 'Instant' in types or 'Sorcery' in types
    kws = []
    abilities = []
    produces = None
    modes = None
    aura_target = None
    aura_grant = None
    equip_cost = None
    equip_grant = None
    spell_pars = []
    i = 0
    while i < len(pars):
        par = pars[i]
        i += 1
        # 關鍵字行
        try:
            items = [x.strip() for x in re.split(r',\s*', par)]
            got = []
            zk = []
            for it in items:
                il = it.lower()
                mw = re.fullmatch(r'ward \{(\d+)\}', il)
                if mw:
                    d['ward'] = int(mw.group(1))
                    zk.append(f'守護{{{mw.group(1)}}}')
                elif il in KW:
                    got.append(KW[il][0])
                    zk.append(KW[il][1])
                else:
                    raise Unsupported('kw')
            kws += got
            zh_lines.append('，'.join(zk))
            continue
        except Unsupported:
            pass
        if par == 'Enchant creature':
            aura_target = True
            zh_lines.append('結附於生物')
            continue
        if par == 'Enchant creature you control':
            aura_target = 'you'
            zh_lines.append('結附於由你操控的生物')
            continue
        m = re.fullmatch(r'Enchanted creature gets ([+-]\d+/[+-]\d+)(?: and has (.+?))?\.', par)
        if m and aura_target:
            p, t = pt(m.group(1))
            aura_grant = {'p': p, 't': t}
            z = f'所結附的生物得{fmt_pt(p, t)}'
            if m.group(2):
                kw, kzh = kw_list(m.group(2))
                aura_grant['kw'] = kw
                z += f'且具有{kzh}異能'
            zh_lines.append(z + '。')
            continue
        m = re.fullmatch(r'Enchanted creature has (.+?)\.', par)
        if m and aura_target:
            kw, kzh = kw_list(m.group(1))
            aura_grant = {'kw': kw}
            zh_lines.append(f'所結附的生物具有{kzh}異能。')
            continue
        if par in ("Enchanted creature can't attack or block.", "Enchanted creature can't attack or block, and its activated abilities can't be activated.") and aura_target:
            if 'activated' in par:
                raise Unsupported('aura activated')
            aura_grant = {'cantAttack': True, 'cantBlock': True}
            zh_lines.append('所結附的生物不能攻擊或阻擋。')
            continue
        m = re.fullmatch(r'Equipped creature gets ([+-]\d+/[+-]\d+)(?: and has (.+?))?\.', par)
        if m and 'Equipment' in subtypes:
            p, t = pt(m.group(1))
            equip_grant = {'p': p, 't': t}
            z = f'佩帶此武具的生物得{fmt_pt(p, t)}'
            if m.group(2):
                kw, kzh = kw_list(m.group(2))
                equip_grant['kw'] = kw
                z += f'且具有{kzh}異能'
            zh_lines.append(z + '。')
            continue
        m = re.fullmatch(r'Equip (\{\d+\})', par)
        if m and 'Equipment' in subtypes:
            equip_cost = m.group(1)
            zh_lines.append(f'裝備{equip_cost}')
            continue
        if 'Land' in types:
            r = land_par(par, d, produces)
            if r is not None:
                z, prod = r
                if prod is not None:
                    produces = prod
                zh_lines.append(z)
                continue
        m = re.fullmatch(r'Flashback ((?:\{[0-9WUBRGC]\})+)', par)
        if m:
            d['flashback'] = m.group(1)
            zh_lines.append(f'返照{m.group(1)}（你可以支付返照費用，從你的墳墓場施放此牌。之後此牌會被放逐。）')
            continue
        if is_spell:
            if re.fullmatch(r'Choose one —', par):
                modes = []
                zh_lines.append('選擇一項：')
                while i < len(pars) and pars[i].startswith('•'):
                    body = pars[i][1:].strip()
                    i += 1
                    ctx = Ctx('spell', '此咒語')
                    effs, z = effects_of(body, ctx)
                    mo = {'text': z.rstrip('。')[:20], 'effects': effs}
                    if ctx.targets:
                        mo['targets'] = ctx.targets
                    modes.append(mo)
                    zh_lines.append('• ' + z)
                continue
            spell_pars.append(par)
            continue
        r = parse_trigger(par, self_zh)
        if r:
            abilities += r[0]
            zh_lines.append(r[1])
            continue
        r = parse_activated(par, self_zh, 'Creature' in types)
        if r:
            kind, val = r[0]
            if kind == 'mana':
                if produces:
                    raise Unsupported('two mana abilities')
                produces = val
            else:
                abilities.append(val)
            zh_lines.append(r[1])
            continue
        z = parse_static(par, self_zh, d)
        if z:
            zh_lines.append(z)
            continue
        raise Unsupported('paragraph: ' + par)
    if is_spell:
        if spell_pars:
            if modes:
                raise Unsupported('modes + text')
            ctx = Ctx('spell', '此咒語')
            effs, z = effects_of(' '.join(spell_pars), ctx)
            d['spell'] = {'effects': effs}
            if ctx.targets:
                d['spell']['targets'] = ctx.targets
            zh_lines.append(z)
        elif modes:
            d['spell'] = {'modes': modes}
        else:
            raise Unsupported('empty spell')
    if 'Aura' in subtypes:
        if not aura_target or not aura_grant:
            raise Unsupported('aura')
        tspec = {'kind': 'creature', 'prompt': '選擇要結附的生物'}
        if aura_target == 'you':
            tspec['filter'] = {'ctrl': 'you'}
        d['aura'] = {'target': tspec, 'grant': aura_grant}
    if 'Equipment' in subtypes:
        if not equip_cost or not equip_grant:
            raise Unsupported('equipment')
        d['equip'] = {'cost': equip_cost, 'grant': equip_grant}
    if kws:
        d['keywords'] = list(dict.fromkeys(kws + d.get('keywords', [])))
    if abilities:
        d['abilities'] = d.get('abilities', []) + abilities
    if produces:
        d['produces'] = produces
    if 'Land' in types and not produces and not abilities:
        raise Unsupported('land without mana')
    if not is_spell and 'Creature' not in types and 'Land' not in types and not abilities and not d.get('abilities') and 'Aura' not in subtypes and 'Equipment' not in subtypes and not produces:
        raise Unsupported('permanent without effect')
    d['text'] = '\n'.join(z for z in zh_lines if z)
    # 雙面、混色：顏色由費用推得
    return d


def main():
    src, existing_path = sys.argv[1], sys.argv[2]
    ex = json.load(open(existing_path))
    # 先前自動產生的卡不算「已存在」，每次都重新產生
    prev = set()
    if os.path.isdir(OUT):
        for fn in os.listdir(OUT):
            if fn.endswith('.ts') and fn not in ('index.ts', 'tokens.ts', 'reprints.ts'):
                for line in open(os.path.join(OUT, fn), encoding='utf-8'):
                    if line.startswith('add('):
                        prev.add(slug(json.loads(line[4:-3])['name']))
    ex['cards'] = [row for row in ex['cards'] if row[0] not in prev]
    existing = {row[0] for row in ex['cards']}
    home = {row[0]: row[2] for row in ex['cards']}
    for t in ex['tokens']:
        tid, name, p, tt, cols, subs, kws = t
        if p is None or tid.startswith('tok-g-'):
            continue
        EXISTING_TOKENS[(p, tt, tuple(sorted(cols or [])), tuple(subs or []), tuple(sorted(kws or [])))] = tid
    # 生物類別中文（沿用遊戲內的對照）
    i18n = open(os.path.join(os.path.dirname(__file__), '..', 'src', 'ui', 'i18n.ts'), encoding='utf-8').read()
    for m in re.finditer(r"^\s+([A-Z][A-Za-z]+): '([^']+)',$", i18n, flags=re.M):
        SUBZH.setdefault(m.group(1), m.group(2))
    os.makedirs(OUT, exist_ok=True)
    seen = set(existing)
    reprints = {}
    stats = {}
    reasons = {}
    per_set = {}
    for s in SETS:
        cards = json.load(open(os.path.join(src, s.lower() + '.json')))
        ok = 0
        total = 0
        for c in cards:
            if 'Basic Land' in c['type_line']:
                continue
            total += 1
            sid = slug(c['name'])
            if sid in seen:
                # 其他系列已經有這張卡：記為重印，讓它也出現在這個系列的補充包
                if c['rarity'] in RARITY and home.get(sid) not in (None, s):
                    reprints.setdefault(s, []).append([sid, RARITY[c['rarity']]])
                continue
            try:
                d = convert(c)
            except Unsupported as e:
                r = str(e) if str(e).startswith(('keyword', 'type', 'layout')) else str(e).split(' ')[0]
                reasons[r] = reasons.get(r, 0) + 1
                continue
            d['id'] = sid
            seen.add(sid)
            home[sid] = s
            per_set.setdefault(s, []).append(d)
            ok += 1
        stats[s] = (ok, total)
    for s, lst in per_set.items():
        with open(os.path.join(OUT, s.lower() + '.ts'), 'w', encoding='utf-8') as f:
            f.write(f'// 由 scripts/gen_cards.py 從 Scryfall 資料自動產生（{s}）：請勿手動修改\n')
            f.write("import { add } from '../../dsl';\n\n")
            for d in lst:
                dd = {k: v for k, v in d.items() if k != 'id'}
                f.write('add(' + json.dumps(dd, ensure_ascii=False) + ');\n')
    with open(os.path.join(OUT, 'index.ts'), 'w', encoding='utf-8') as f:
        f.write('// 由 scripts/gen_cards.py 自動產生\n')
        for s in per_set:
            f.write(f"import './{s.lower()}';\n")
    with open(os.path.join(OUT, 'tokens.ts'), 'w', encoding='utf-8') as f:
        f.write('// 由 scripts/gen_cards.py 自動產生的衍生物\n')
        f.write("import type { CardDef } from '../../../engine/types';\n\n")
        f.write('export const GEN_TOKENS: CardDef[] = [\n')
        used = {json.dumps(d) for lst in per_set.values() for d in lst}
        blob = '\n'.join(used)
        for t in TOKENS.values():
            if t['id'] not in blob:
                continue
            f.write('  ' + json.dumps({**t, 'set': 'TOK', 'rarity': 'T', 'token': True}, ensure_ascii=False) + ',\n')
        f.write('];\n')
    with open(os.path.join(OUT, 'reprints.ts'), 'w', encoding='utf-8') as f:
        f.write('// 由 scripts/gen_cards.py 自動產生：已收錄的卡在其他系列的重印\n')
        f.write("import type { Rarity, StandardSet } from '../../../engine/types';\n\n")
        f.write('export const GEN_REPRINTS: Partial<Record<StandardSet, [string, Rarity][]>> = ' + json.dumps(reprints, ensure_ascii=False) + ';\n')
    tot_ok = sum(v[0] for v in stats.values())
    for s, (ok, total) in stats.items():
        print(f'{s}: +{ok} / {total}')
    print('total new', tot_ok, 'tokens', len(TOKENS))
    print('skip reasons', sorted(reasons.items(), key=lambda x: -x[1])[:25])


if __name__ == '__main__':
    main()
