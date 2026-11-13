import { useState, type ReactNode } from 'react';
import { Formula } from './Formula';

interface Props {
  label: string;
  value: string;
  /** LaTeX für „ⓘ Formel“ */
  tex?: string;
  warn?: string;
  sub?: ReactNode;
}

/** Kompakte Ergebniskachel; Formel per ⓘ einblendbar. */
export function ResultTile({ label, value, tex, warn, sub }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`tile${warn ? ' is-warn' : ''}`}>
      <div className="tile-head">
        <span className="tile-label">{label}</span>
        {tex && (
          <button
            type="button"
            className="info-btn"
            aria-expanded={open}
            aria-label={`Formel ${label}`}
            onClick={() => setOpen((o) => !o)}
          >
            ⓘ
          </button>
        )}
      </div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
      {warn && <div className="tile-warn">{warn}</div>}
      {open && tex && (
        <div className="tile-formula">
          <Formula tex={tex} display />
        </div>
      )}
    </div>
  );
}
