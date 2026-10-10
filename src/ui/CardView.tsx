import { createContext, useContext, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { displayName, zhName } from '../data/names';
import { SET_INFO, isStandardBanned, isStandardLegal } from '../data';
import { colorsOf } from '../engine/mana';
import type { CardDef, Keyword } from '../engine/types';
import { KW_DESC, KW_ZH, RARITY_ZH, typeLine } from './i18n';
import { imageFor, useImageVersion } from './images';
import { ManaCost, ManaSymbol, RulesText } from './Mana';
import { LINE_KIND_ZH, lineNotes, symbolNotes, termNotes, typeNote } from './explain';

export const ImagesEnabled = createContext(true);

export function frameClass(def: CardDef): string {
  if (def.types.includes('Land')) return 'fr-land';
  const cols = colorsOf(def);
  if (cols.length > 1) return 'fr-multi';
  if (cols.length === 1) return `fr-${cols[0]}`;
  return 'fr-art';
}

const TYPE_GLYPH: Record<string, string> = {
  Creature: '⚔',
  Instant: 'ϟ',
  Sorcery: '✦',
  Enchantment: '❖',
  Artifact: '⚙',
  Land: '⛰',
};

export function glyphFor(def: CardDef): string {
  const t = def.types.includes('Creature') ? 'Creature' : def.types[def.types.length - 1];
  return TYPE_GLYPH[t] ?? '✦';
}

export function useCardImage(def: CardDef) {
  useImageVersion();
  const enabled = useContext(ImagesEnabled);
  if (!enabled || def.token) return null;
  return imageFor(def.imageName ?? def.name);
}

export function Art({ def, children }: { def: CardDef; children?: ReactNode }) {
  const img = useCardImage(def);
  return (
    <div className={`art ${img?.art ? '' : 'art-fallback'}`}>
      {img?.art ? <img src={img.art} alt="" loading="lazy" draggable={false} /> : <span className="art-glyph">{glyphFor(def)}</span>}
      {children}
    </div>
  );
}

export interface CardFaceProps {
  def: CardDef;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  pt?: { p: number; t: number };
  showText?: boolean;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  onDoubleClick?: (e: MouseEvent) => void;
  onMouseEnter?: () => void;
  children?: ReactNode;
  title?: string;
  style?: CSSProperties;
}

export function CardFace({ def, size = 'md', pt, showText, className = '', onClick, onDoubleClick, onMouseEnter, children, title, style }: CardFaceProps) {
  const isCr = def.types.includes('Creature');
  const p = pt?.p ?? def.power ?? 0;
  const t = pt?.t ?? def.toughness ?? 0;
  const ptCls = pt ? (pt.p > (def.power ?? 0) || pt.t > (def.toughness ?? 0) ? 'up' : pt.p < (def.power ?? 0) || pt.t < (def.toughness ?? 0) ? 'down' : '') : '';
  return (
    <div
      className={`card card-${size} ${frameClass(def)} ${className}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      title={title}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e as unknown as MouseEvent) : undefined}
    >
      <div className="card-inner">
        <div className="card-title">
          <span className="card-name">{displayName(def)}</span>
          <ManaCost cost={def.cost} />
        </div>
        <Art def={def} />
        <div className="card-type">
          <span className="card-type-text">{typeLine(def)}</span>
          <span className={`gem gem-${def.rarity}`} title={RARITY_ZH[def.rarity]} />
        </div>
        {showText && (
          <div className="card-text">
            <RulesText text={def.text} />
          </div>
        )}
        {isCr && <div className={`card-pt ${ptCls}`}>{`${p}/${t}`}</div>}
      </div>
      {children}
    </div>
  );
}

export function CardBack({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  return (
    <div className={`card card-${size} card-back`}>
      <div className="back-emblem">萬</div>
    </div>
  );
}

/** 放大的卡圖（對戰中的預覽），沒有圖時用文字版卡面 */
export function CardZoom({ def }: { def: CardDef }) {
  const img = useCardImage(def);
  const [broken, setBroken] = useState<string | null>(null);
  if (img?.full && broken !== img.full)
    return <img className="card-zoom" src={img.full} alt={displayName(def)} draggable={false} onError={() => setBroken(img.full!)} />;
  return <CardFace def={def} size="lg" showText className="card-zoom" />;
}

/** 卡牌詳細資訊（效果解說 / 收藏） */
export function CardDetail({ def, extra }: { def: CardDef; extra?: ReactNode }) {
  const img = useCardImage(def);
  const [broken, setBroken] = useState<string | null>(null);
  const name = displayName(def);
  // 中文模式顯示英文原名、英文模式顯示中文名，方便對照
  const alt = name === def.name ? zhName(def) : def.name;
  const kws = new Set<Keyword>(def.keywords ?? []);
  for (const k of Object.keys(KW_ZH) as Keyword[]) if (def.text.includes(KW_ZH[k])) kws.add(k);
  return (
    <div className="card-detail">
      {img?.full && broken !== img.full ? (
        <img className="card-detail-img" src={img.full} alt={name} draggable={false} onError={() => setBroken(img.full!)} />
      ) : (
        <CardFace def={def} size="lg" showText />
      )}
      <div className="card-detail-info">
        <div className="cd-head">
          <h3 className="cd-name">{name}</h3>
          <ManaCost cost={def.cost} size={18} />
        </div>
        {alt && <div className="cd-zh">{alt}</div>}
        <div className="cd-type">
          {typeLine(def)}
          <span className={`rarity-tag r-${def.rarity}`}>{RARITY_ZH[def.rarity]}</span>
        </div>
        {!def.token && def.set !== 'BAS' && (
          <div className="cd-set">
            {SET_INFO[def.set as 'FDN'].name}
            {SET_INFO[def.set as 'FDN'].released ? `（${SET_INFO[def.set as 'FDN'].released}）` : ''}
            <span className={`std-tag ${isStandardLegal(def) ? 'ok' : isStandardBanned(def) ? 'ban' : ''}`}>
              {isStandardLegal(def) ? '標準賽合法' : isStandardBanned(def) ? '標準賽禁卡' : '非標準賽'}
            </span>
          </div>
        )}
        {def.text && (
          <div className="cd-text">
            <RulesText text={def.text} size={16} />
          </div>
        )}
        {def.types.includes('Creature') && (
          <div className="cd-pt">
            力量／防禦力 <b>{`${def.power}/${def.toughness}`}</b>
          </div>
        )}
        {extra}
      </div>
      {def.back && <BackFace def={def.back} />}
      <Explain def={def} kws={[...kws]} />
    </div>
  );
}

/** 白話解說：卡牌類別、每一行異能、符號、關鍵字與術語 */
function Explain({ def, kws }: { def: CardDef; kws: Keyword[] }) {
  const lines = lineNotes(def);
  const syms = symbolNotes(def);
  const terms = termNotes(def);
  const tn = typeNote(def);
  if (!tn && !lines.length && !kws.length) return null;
  return (
    <details className="cd-explain" open>
      <summary>效果解說</summary>
      {tn && <p className="ex-type">{tn}</p>}
      {lines.filter((l) => l.kind !== 'keyword').length > 0 && (
        <ul className="ex-lines">
          {lines
            .filter((l) => l.kind !== 'keyword')
            .map((l, i) => (
              <li key={i} className={`ex-line ex-${l.kind}`}>
                <span className="ex-kind">{LINE_KIND_ZH[l.kind]}</span>
                {l.cost != null ? (
                  <span className="ex-ce">
                    <span className="ex-cost">
                      代價 <RulesText text={l.cost} size={14} />
                    </span>
                    <span className="ex-arrow">→</span>
                    <span className="ex-effect">
                      效果 <RulesText text={l.effect ?? ''} size={14} />
                    </span>
                  </span>
                ) : (
                  <span className="ex-quote">
                    <RulesText text={l.text} size={14} />
                  </span>
                )}
                <span className="ex-desc">{l.desc}</span>
              </li>
            ))}
        </ul>
      )}
      {(kws.length > 0 || syms.length > 0 || terms.length > 0) && (
        <dl className="cd-kw">
          {kws.map((k) => (
            <div key={k}>
              <dt>{KW_ZH[k]}</dt>
              <dd>{KW_DESC[k]}</dd>
            </div>
          ))}
          {syms.map((n) => (
            <div key={n.sym}>
              <dt>
                <ManaSymbol sym={n.sym} size={16} />
              </dt>
              <dd>{n.desc}</dd>
            </div>
          ))}
          {terms.map((t) => (
            <div key={t.term}>
              <dt>{t.term}</dt>
              <dd>{t.desc}</dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}

/** 雙面牌的背面 */
function BackFace({ def }: { def: CardDef }) {
  const img = useCardImage(def);
  return (
    <div className="cd-back">
      <div className="cd-back-head">背面</div>
      <div className="cd-back-body">
        {img?.full ? <img className="cd-back-img" src={img.full} alt={displayName(def)} draggable={false} /> : null}
        <div>
          <div className="cd-head">
            <h4 className="cd-name">{displayName(def)}</h4>
            <ManaCost cost={def.cost} size={16} />
          </div>
          <div className="cd-type">{typeLine(def)}</div>
          {def.text && (
            <div className="cd-text">
              <RulesText text={def.text} size={15} />
            </div>
          )}
          {def.types.includes('Creature') && (
            <div className="cd-pt">
              力量／防禦力 <b>{`${def.power}/${def.toughness}`}</b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
