import { Fragment, type ReactNode } from 'react';

const GLYPH: Record<string, string> = { W: '白', U: '藍', B: '黑', R: '紅', G: '綠', C: '◇' };
const MANA_BG: Record<string, string> = { W: '#f4ecc8', U: '#8fc3ea', B: '#b7aab9', R: '#f0a283', G: '#97d3a4' };

export function ManaSymbol({ sym, size }: { sym: string; size?: number }) {
  const style = size ? { width: size, height: size, fontSize: size * 0.62 } : undefined;
  if (sym === 'T') {
    return (
      <span className="mana mana-T" style={style} title="橫置">
        ↷
      </span>
    );
  }
  if (/^2\/[WUBRG]$/.test(sym)) return <ManaSymbol sym={sym[2]} size={size} />;
  if (/^[WUBRG]\/[WUBRG]$/.test(sym)) {
    const [a, b] = [sym[0], sym[2]];
    return (
      <span
        className="mana mana-hyb"
        style={{ ...style, background: `linear-gradient(135deg, ${MANA_BG[a]} 50%, ${MANA_BG[b]} 50%)` }}
        title={`${GLYPH[a]}或${GLYPH[b]}色法術力`}
      >
        <span className="hyb-a">{GLYPH[a]}</span>
        <span className="hyb-b">{GLYPH[b]}</span>
      </span>
    );
  }
  if (/^\d+$/.test(sym) || sym === 'X') {
    return (
      <span className="mana mana-N" style={style}>
        {sym}
      </span>
    );
  }
  return (
    <span className={`mana mana-${sym}`} style={style} title={`${GLYPH[sym] ?? sym}色法術力`}>
      {GLYPH[sym] ?? sym}
    </span>
  );
}

export function ManaCost({ cost, size }: { cost?: string; size?: number }) {
  if (!cost) return null;
  const syms = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  return (
    <span className="mana-cost">
      {syms.map((s, i) => (
        <ManaSymbol key={i} sym={s} size={size} />
      ))}
    </span>
  );
}

/** 把規則敘述中的 {R}、{T} 等符號換成圖示 */
export function RulesText({ text, size }: { text: string; size?: number }) {
  if (!text) return null;
  return (
    <>
      {text.split('\n').map((line, i) => {
        const parts: ReactNode[] = [];
        let last = 0;
        for (const m of line.matchAll(/\{([^}]+)\}/g)) {
          if (m.index! > last) parts.push(line.slice(last, m.index));
          parts.push(<ManaSymbol key={m.index} sym={m[1]} size={size} />);
          last = m.index! + m[0].length;
        }
        if (last < line.length) parts.push(line.slice(last));
        return (
          <p key={i} className="rules-line">
            {parts.map((p, j) => (
              <Fragment key={j}>{p}</Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
