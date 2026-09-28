import { useEffect, type ReactNode } from 'react';

export function Modal({
  title,
  children,
  onClose,
  wide,
  footer,
}: {
  title?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="modal-head">
            <h2>{title}</h2>
            {onClose && (
              <button className="icon-btn" onClick={onClose} aria-label="關閉">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Gold({ n }: { n: number }) {
  return (
    <span className="gold">
      <span className="coin" aria-hidden="true" />
      {n.toLocaleString()}
    </span>
  );
}

export function ColorPips({ colors }: { colors: string[] }) {
  return (
    <span className="pips">
      {colors.map((c) => (
        <span key={c} className={`pip pip-${c}`} />
      ))}
    </span>
  );
}
