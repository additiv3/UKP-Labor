import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo, seriesRepo } from '../../data/repos';
import type { Experiment } from '../../data/types';
import { buildMatrix, MATRIX_FIELDS, matrixSize, rangeValues, validateAxes, type MatrixAxis, type MatrixField } from '../../core/matrix';
import { compareByVersuchsId, todayIso } from '../../core/logbook';
import { findUnit, formatIn, formatNumber, parseNumber, toSI, unitsOf } from '../../core/physics/units';
import { NumberListField } from '../../components/fields';
import { BackLink } from '../../components/MasterDetail';
import { Segmented } from '../../components/Segmented';
import { materialKurz } from './actions';

interface AxisState extends MatrixAxis {
  unit?: string;
  /** erhöht sich, wenn die Werteliste per Bereich ersetzt wird (Feld neu aufbauen) */
  rev: number;
}

const FIELDS = Object.keys(MATRIX_FIELDS) as MatrixField[];

function fmt(field: MatrixField, x: number | undefined, unit?: string): string {
  const q = MATRIX_FIELDS[field].quantity;
  return q === 'none' ? formatNumber(x) : formatIn(x, q, unit);
}

function AxisEditor({ i, axis, onChange, onRemove }: { i: number; axis: AxisState; onChange: (a: AxisState) => void; onRemove?: () => void }) {
  const def = MATRIX_FIELDS[axis.field];
  const [range, setRange] = useState({ start: '', end: '', count: '5', mode: 'lin' as 'lin' | 'log' });
  const unit = findUnit(def.quantity, axis.unit).id;
  const apply = () => {
    const a = toSI(parseNumber(range.start), def.quantity, unit);
    const b = toSI(parseNumber(range.end), def.quantity, unit);
    const n = parseNumber(range.count);
    if (a === undefined || b === undefined || n === undefined) return;
    onChange({ ...axis, values: rangeValues(a, b, Math.round(n), range.mode), rev: axis.rev + 1 });
  };
  return (
    <div className="axis">
      <div className="card-head">
        <h3>Achse {i + 1}</h3>
        {onRemove && (
          <button type="button" className="btn btn-small" onClick={onRemove}>
            Entfernen
          </button>
        )}
      </div>
      <div className="two-col">
        <div className="field">
          <label htmlFor={`ax-${i}`}>Parameter</label>
          <select
            id={`ax-${i}`}
            value={axis.field}
            onChange={(e) => onChange({ field: e.target.value as MatrixField, values: [], unit: undefined, rev: axis.rev + 1 })}
          >
            {FIELDS.map((f) => (
              <option key={f} value={f}>
                {MATRIX_FIELDS[f].label} ({MATRIX_FIELDS[f].symbol})
              </option>
            ))}
          </select>
        </div>
        {unitsOf(def.quantity).length > 1 && (
          <div className="field">
            <label htmlFor={`axu-${i}`}>Einheit</label>
            <select id={`axu-${i}`} value={unit} onChange={(e) => onChange({ ...axis, unit: e.target.value, rev: axis.rev + 1 })}>
              {unitsOf(def.quantity).map((u) => (
                <option key={u.id}>{u.id}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <NumberListField
        key={`${axis.field}-${unit}-${axis.rev}`}
        label="Werte"
        quantity={def.quantity}
        unit={unit}
        value={axis.values}
        onChange={(values) => onChange({ ...axis, values })}
      />
      <div className="range-row">
        <input aria-label={`Achse ${i + 1} von`} inputMode="decimal" placeholder="von" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} />
        <input aria-label={`Achse ${i + 1} bis`} inputMode="decimal" placeholder="bis" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} />
        <input aria-label={`Achse ${i + 1} Anzahl`} inputMode="numeric" placeholder="Anzahl" value={range.count} onChange={(e) => setRange({ ...range, count: e.target.value })} />
        <div className="range-actions">
        <Segmented
          label="Verteilung"
          value={range.mode}
          options={[
            ['lin', 'lin'],
            ['log', 'log'],
          ]}
          onChange={(m) => setRange({ ...range, mode: m })}
        />
        <button type="button" className="btn btn-small" onClick={apply}>
          Bereich
        </button>
        </div>
      </div>
    </div>
  );
}

export function MatrixScreen() {
  const { seriesId = '' } = useParams();
  const navigate = useNavigate();
  const series = useLiveQuery(() => seriesRepo.get(seriesId), [seriesId]);
  const experiments = useLiveQuery(() => experimentsRepo.bySeries(seriesId), [seriesId]);
  const allIds = useLiveQuery(() => experimentsRepo.allVersuchsIds(), []);
  const [templateId, setTemplateId] = useState<string>();
  const [axes, setAxes] = useState<AxisState[]>([
    { field: 'ePuls', values: [], rev: 0 },
    { field: 'nPulse', values: [], rev: 0 },
  ]);
  const [datum, setDatum] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const tpl = useLiveQuery(async () => {
    const sorted = [...(experiments ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const t: Experiment | undefined = templateId === '' ? undefined : (sorted.find((e) => e.id === templateId) ?? sorted[0]);
    return { t, kurz: await materialKurz(t?.materialId) };
  }, [experiments, templateId]);

  if (!series || !experiments || !allIds || !tpl) return null;

  const template = tpl.t ?? { params: {}, tags: [] };
  const error = validateAxes(axes);
  const list = error
    ? []
    : buildMatrix(template, axes, { existingIds: allIds, seriesId, seriesCode: series.code, materialKurz: tpl.kurz, datum });
  const used = axes.filter((a) => a.values.length > 0);

  const create = async () => {
    setBusy(true);
    try {
      await experimentsRepo.createMany(list);
      navigate(`/logbuch/r/${seriesId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <BackLink to={`/logbuch/r/${seriesId}`} label={`${series.code} ${series.titel}`.trim()} />
      <section className="card">
        <h2>Matrix erzeugen</h2>
        <p className="muted small">
          Legt für jede Kombination der Achsenwerte einen geplanten Versuch an (fortlaufende IDs, Tag „matrix“). Alle übrigen
          Parameter, Anlage und Probe kommen aus der Vorlage.
        </p>
        <div className="two-col">
          <div className="field">
            <label htmlFor="mx-tpl">Vorlage</label>
            <select id="mx-tpl" value={templateId ?? tpl.t?.id ?? ''} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">– leer (keine Vorlage) –</option>
              {[...experiments].sort(compareByVersuchsId).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.versuchsId}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mx-datum">Datum</label>
            <input id="mx-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card">
        {axes.map((a, i) => (
          <AxisEditor
            key={i}
            i={i}
            axis={a}
            onChange={(na) => setAxes((xs) => xs.map((x, j) => (j === i ? na : x)))}
            onRemove={axes.length > 1 ? () => setAxes((xs) => xs.filter((_, j) => j !== i)) : undefined}
          />
        ))}
        {axes.length < 3 && (
          <button
            type="button"
            className="btn"
            onClick={() => setAxes((xs) => [...xs, { field: FIELDS.find((f) => !xs.some((x) => x.field === f))!, values: [], rev: 0 }])}
          >
            + Achse
          </button>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Vorschau</h2>
          <span className="muted small">{error ? '' : `${matrixSize(axes)} Versuche`}</span>
        </div>
        {error ? (
          <p className="field-warn">{error}</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="report">
                <thead>
                  <tr>
                    <th>Versuchs-ID</th>
                    {used.map((a) => (
                      <th key={a.field}>{MATRIX_FIELDS[a.field].symbol}</th>
                    ))}
                    <th>F₀</th>
                  </tr>
                </thead>
                <tbody>
                  {list.slice(0, 50).map((e) => (
                    <tr key={e.versuchsId}>
                      <th>{e.versuchsId}</th>
                      {used.map((a) => (
                        <td key={a.field}>{fmt(a.field, e.params[a.field], a.unit)}</td>
                      ))}
                      <td>{formatIn(e.abgeleitet?.werte.F0, 'fluence', undefined, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.length > 50 && <p className="muted small">… und {list.length - 50} weitere</p>}
            <button type="button" className="btn btn-primary mt" disabled={busy || list.length === 0} onClick={() => void create()}>
              {list.length} Versuche anlegen
            </button>
          </>
        )}
      </section>
    </div>
  );
}
