import { useId } from 'react';
import type { Quantity } from '../../core/physics/units';
import { NumberInput } from '../../components/NumberInput';
import { STATUS_LABEL, STATUS_SYMBOL, UNBESTAETIGT_SYMBOL } from '../../data/labels';
import { BETRIEBS_STATUS, type Beleg, type BetriebsStatus } from '../../data/types';
import { belegHint } from '../../data/equipment';

/** Eingabe für Beleg (unbestätigt + Quelle), wird im Bearbeitungsmodus „Belege“ unter dem Wert gezeigt. */
export function BelegEditor({ beleg, onChange }: { beleg: Beleg | undefined; onChange: (b: Beleg) => void }) {
  const id = useId();
  return (
    <div className="beleg-row">
      <label className="beleg-check">
        <input
          type="checkbox"
          checked={beleg?.unbestaetigt === true}
          onChange={(e) => onChange({ ...beleg, unbestaetigt: e.target.checked || undefined })}
        />
        <span>unbestätigt</span>
      </label>
      <label htmlFor={id} className="visually-hidden">
        Quelle
      </label>
      <input
        id={id}
        className="beleg-quelle"
        value={beleg?.quelle ?? ''}
        placeholder="Quelle, z. B. Datenblatt.pdf, S. 3"
        onChange={(e) => onChange({ ...beleg, quelle: e.target.value === '' ? undefined : e.target.value })}
      />
    </div>
  );
}

export interface BelegNumberProps {
  label: string;
  symbol?: string;
  quantity: Quantity;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit?: string;
  onUnitChange?: (u: string) => void;
  beleg: Beleg | undefined;
  onBeleg: (b: Beleg) => void;
  /** Belege bearbeiten (sonst nur Anzeige als Hinweis) */
  edit: boolean;
}

/** Zahlenfeld mit Herkunftsangabe. Unbestätigte Werte tragen das Symbol ⚠︎ im Label. */
export function BelegNumber(p: BelegNumberProps) {
  const unsure = p.beleg?.unbestaetigt === true;
  return (
    <div className={`beleg-field${unsure ? ' is-unsure' : ''}`}>
      <NumberInput
        label={unsure ? `${p.label} ${UNBESTAETIGT_SYMBOL}` : p.label}
        symbol={p.symbol}
        quantity={p.quantity}
        value={p.value}
        unit={p.unit}
        onUnitChange={p.onUnitChange}
        onChange={p.onChange}
        hint={p.edit ? undefined : belegHint(p.beleg)}
      />
      {p.edit && <BelegEditor beleg={p.beleg} onChange={p.onBeleg} />}
    </div>
  );
}

/** Kleine Statusplakette mit Symbol und Text. */
export function StatusBadge({ status, compact = false }: { status: BetriebsStatus; compact?: boolean }) {
  return (
    <span className={`status-badge status-${status}`} title={STATUS_LABEL[status]} aria-label={`Status: ${STATUS_LABEL[status]}`}>
      <span aria-hidden="true">{STATUS_SYMBOL[status]}</span>
      {!compact && <span aria-hidden="true"> {STATUS_LABEL[status]}</span>}
    </span>
  );
}

/** Auswahl des Betriebszustands. „unbekannt“ wird nicht gespeichert (fehlender Status = unbekannt). */
export function StatusSelect({
  label = 'Status',
  value,
  onChange,
}: {
  label?: string;
  value: BetriebsStatus | undefined;
  onChange: (s: BetriebsStatus | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ?? 'unbekannt'}
        onChange={(e) => {
          const s = e.target.value as BetriebsStatus;
          onChange(s === 'unbekannt' ? undefined : s);
        }}
      >
        {BETRIEBS_STATUS.map((s) => (
          <option key={s} value={s}>
            {STATUS_SYMBOL[s]} {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
