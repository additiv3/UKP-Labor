import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { litValuesRepo, materialsRepo } from '../../../data/repos';
import type { LitGroesse } from '../../../data/types';
import { validateLit } from '../../materials/litFormat';
import { formatNumber } from '../../../core/physics/units';

export interface LitToSave {
  groesse: LitGroesse;
  /** SI */
  wert: number;
  einheit: string;
  nPulse?: number;
}

/** Fit-Ergebnis als Literaturwert(e) beim Werkstoff speichern (Citekey Pflicht). */
export function SaveLitPanel({
  values,
  methode,
  notiz,
  lambda,
  tau,
  defaultMaterialId,
}: {
  values: LitToSave[];
  methode: string;
  notiz: string;
  lambda?: number;
  tau?: number;
  defaultMaterialId?: string;
}) {
  const materials = useLiveQuery(() => materialsRepo.listSorted(), []);
  const [materialId, setMaterialId] = useState(defaultMaterialId);
  const [citekey, setCitekey] = useState('');
  const [done, setDone] = useState<string>();
  const [err, setErr] = useState<string>();
  if (!materials) return null;
  const mid = materialId ?? defaultMaterialId;

  const save = async () => {
    setDone(undefined);
    if (!mid) return setErr('Werkstoff wählen');
    const drafts = values.map((v) => ({ materialId: mid, ...v, citekey: citekey.trim(), methode, notiz, lambda, tau }));
    const e = drafts.map(validateLit).find(Boolean);
    if (e) return setErr(e);
    setErr(undefined);
    for (const d of drafts) await litValuesRepo.create({ ...d, wert: d.wert });
    setDone(mid);
  };

  return (
    <div className="subsection">
      <h3>Als Literaturwert speichern</h3>
      <p className="muted small">
        Speichert {values.map((v) => (v.groesse === 'S' ? `S = ${formatNumber(v.wert)}` : v.groesse === 'Fth' ? 'F_th' : v.groesse)).join(' und ')} beim
        Werkstoff, mit Methode „{methode}“ und Fit-Güte als Notiz. Citekey ist Pflicht (für eigene Messungen z. B. „eigen-B1“).
      </p>
      <div className="two-col">
        <div className="field">
          <label htmlFor="lit-mat">Werkstoff</label>
          <select id="lit-mat" value={mid ?? ''} onChange={(e) => setMaterialId(e.target.value || undefined)}>
            <option value="">– wählen –</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lit-cite">Citekey</label>
          <input id="lit-cite" value={citekey} placeholder="z. B. eigen-B1" onChange={(e) => setCitekey(e.target.value)} />
        </div>
      </div>
      <button type="button" className="btn" onClick={() => void save()}>
        Speichern
      </button>
      {err && <p className="field-warn">{err}</p>}
      {done && (
        <p className="notice notice-ok">
          Gespeichert. <Link to={`/material/${done}`}>Zum Werkstoff</Link>
        </p>
      )}
    </div>
  );
}
