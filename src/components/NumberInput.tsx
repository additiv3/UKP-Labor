import { useEffect, useId, useRef, useState } from 'react';
import { findUnit, formatInput, fromSI, parseNumber, toSI, unitsOf, type Quantity } from '../core/physics/units';

export interface NumberInputProps {
  label: string;
  /** Kurzsymbol, z. B. „E_p“ */
  symbol?: string;
  quantity: Quantity;
  /** Wert in SI */
  value: number | undefined;
  onChange: (si: number | undefined) => void;
  unit?: string;
  onUnitChange?: (unit: string) => void;
  /** Negative Werte erlaubt (zeigt ±-Taste, da iOS-Zifferntastatur kein Minus hat) */
  allowNegative?: boolean;
  placeholder?: string;
  /** Gelbe Warnung unter dem Feld */
  warn?: string;
  hint?: string;
  disabled?: boolean;
}

function close(a: number | undefined, b: number | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (a === b) return true;
  return Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
}

/** Zahlenfeld mit Einheitenwahl. Intern SI; Eingabe mit Komma oder Punkt; leer = undefined. */
export function NumberInput(p: NumberInputProps) {
  const id = useId();
  const unit = findUnit(p.quantity, p.unit);
  const [text, setText] = useState(() => formatInput(fromSI(p.value, p.quantity, unit.id)));
  const lastEmitted = useRef(p.value);

  // Externe Änderungen übernehmen, ohne laufende Eingaben (z. B. „1,“) zu überschreiben.
  useEffect(() => {
    if (close(p.value, lastEmitted.current)) return;
    lastEmitted.current = p.value;
    setText(formatInput(fromSI(p.value, p.quantity, unit.id)));
  }, [p.value, p.quantity, unit.id]);

  const parsed = parseNumber(text);
  const invalid = text.trim() !== '' && parsed === undefined;

  const emit = (t: string, unitId = unit.id) => {
    const si = toSI(parseNumber(t), p.quantity, unitId);
    lastEmitted.current = si;
    p.onChange(si);
  };

  const units = unitsOf(p.quantity);
  const describedBy = p.warn || invalid || p.hint ? `${id}-msg` : undefined;

  return (
    <div className={`num-field${p.warn ? ' is-warn' : ''}${invalid ? ' is-invalid' : ''}`}>
      <label htmlFor={id}>
        {p.label}
        {p.symbol && <span className="sym"> {p.symbol}</span>}
      </label>
      <div className="num-row">
        {p.allowNegative && (
          <button
            type="button"
            className="pm-btn"
            aria-label="Vorzeichen wechseln"
            disabled={p.disabled}
            onClick={() => {
              const t = text.trim();
              const next = t.startsWith('-') ? t.slice(1) : t === '' ? '-' : `-${t}`;
              setText(next);
              emit(next);
            }}
          >
            ±
          </button>
        )}
        <input
          id={id}
          type="text"
          inputMode={p.allowNegative ? 'text' : 'decimal'}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          value={text}
          placeholder={p.placeholder}
          disabled={p.disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setText(e.target.value);
            emit(e.target.value);
          }}
        />
        {units.length > 1 ? (
          <select
            aria-label={`Einheit ${p.label}`}
            value={unit.id}
            disabled={p.disabled}
            onChange={(e) => {
              const nu = e.target.value;
              // SI-Wert bleibt erhalten, Anzeige wird umgerechnet.
              setText(formatInput(fromSI(p.value, p.quantity, nu)));
              p.onUnitChange?.(nu);
            }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id}
              </option>
            ))}
          </select>
        ) : (
          unit.id && <span className="unit-static">{unit.id}</span>
        )}
      </div>
      {describedBy && (
        <div id={`${id}-msg`} className={invalid || p.warn ? 'field-warn' : 'field-hint'}>
          {invalid ? 'Keine gültige Zahl' : (p.warn ?? p.hint)}
        </div>
      )}
    </div>
  );
}
