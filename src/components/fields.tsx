import { useId, useState, type ReactNode } from 'react';
import { findUnit, formatInput, fromSI, parseNumber, toSI, type Quantity } from '../core/physics/units';

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
}

function Msg({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (!hint && !error) return null;
  return (
    <div id={id} className={error ? 'field-warn' : 'field-hint'}>
      {error ?? hint}
    </div>
  );
}

export function TextField(
  p: BaseProps & {
    value: string | undefined;
    onChange: (v: string | undefined) => void;
    placeholder?: string;
    required?: boolean;
    autoFocus?: boolean;
  },
) {
  const id = useId();
  return (
    <div className={`field${p.error ? ' is-warn' : ''}`}>
      <label htmlFor={id}>
        {p.label}
        {p.required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        value={p.value ?? ''}
        placeholder={p.placeholder}
        required={p.required}
        autoFocus={p.autoFocus}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={p.hint || p.error ? `${id}-m` : undefined}
        onChange={(e) => p.onChange(e.target.value === '' ? undefined : e.target.value)}
      />
      <Msg id={`${id}-m`} hint={p.hint} error={p.error} />
    </div>
  );
}

export function TextArea(
  p: BaseProps & { value: string | undefined; onChange: (v: string | undefined) => void; rows?: number; placeholder?: string },
) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{p.label}</label>
      <textarea
        id={id}
        rows={p.rows ?? 3}
        value={p.value ?? ''}
        placeholder={p.placeholder}
        onChange={(e) => p.onChange(e.target.value === '' ? undefined : e.target.value)}
      />
      <Msg id={`${id}-m`} hint={p.hint} error={p.error} />
    </div>
  );
}

export function SelectField<T extends string>(
  p: BaseProps & {
    value: T | undefined;
    options: ReadonlyArray<readonly [T, string]>;
    onChange: (v: T | undefined) => void;
    /** Text für „keine Auswahl“; ohne → Pflichtauswahl */
    empty?: string;
  },
) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{p.label}</label>
      <select
        id={id}
        value={p.value ?? ''}
        onChange={(e) => p.onChange(e.target.value === '' ? undefined : (e.target.value as T))}
      >
        {p.empty !== undefined && <option value="">{p.empty}</option>}
        {p.options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <Msg id={`${id}-m`} hint={p.hint} error={p.error} />
    </div>
  );
}

export function CheckField(p: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check-field">
      <input type="checkbox" checked={p.checked} onChange={(e) => p.onChange(e.target.checked)} />
      <span>{p.label}</span>
    </label>
  );
}

/** Liste von Zahlen (z. B. Wellenlängen), getrennt durch „;“ oder Leerzeichen. Werte in SI. Startwert nur beim Mount (Editor mit `key`). */
export function NumberListField(
  p: BaseProps & { quantity: Quantity; unit?: string; value: number[]; onChange: (v: number[]) => void },
) {
  const id = useId();
  const unit = findUnit(p.quantity, p.unit);
  const fmt = (xs: number[]) => xs.map((x) => formatInput(fromSI(x, p.quantity, unit.id))).join('; ');
  const [text, setText] = useState(() => fmt(p.value));
  const parts = text.split(/[;\s]+/).filter((t) => t !== '');
  const nums = parts.map(parseNumber);
  const invalid = nums.some((n) => n === undefined);
  return (
    <div className={`field${invalid ? ' is-warn' : ''}`}>
      <label htmlFor={id}>
        {p.label} <span className="muted">[{unit.id}]</span>
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        placeholder="z. B. 1030; 515; 343"
        onChange={(e) => {
          setText(e.target.value);
          const ps = e.target.value.split(/[;\s]+/).filter((t) => t !== '').map(parseNumber);
          if (ps.every((n) => n !== undefined)) p.onChange(ps.map((n) => toSI(n, p.quantity, unit.id)!));
        }}
      />
      <Msg id={`${id}-m`} hint={p.hint ?? 'Mehrere Werte mit „;“ trennen'} error={invalid ? 'Keine gültige Zahlenliste' : p.error} />
    </div>
  );
}

export function FieldGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <fieldset className="field-group">
      {title && <legend>{title}</legend>}
      {children}
    </fieldset>
  );
}
