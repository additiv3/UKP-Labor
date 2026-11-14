import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { incubationFit, linearRegression } from '../../../core/physics/fit';
import { fitPlotData, parsePairs } from '../../../core/pairs';
import { FORMULAS } from '../../../core/physics/formulas';
import { formatIn, formatNumber, toSI, unitsOf } from '../../../core/physics/units';
import { ResultTile } from '../../../components/ResultTile';
import { useCalcState } from '../useCalcState';
import { useFitsState, type FitsState } from './useFitsState';
import { FitPlot } from './FitPlot';
import { SaveLitPanel } from './SaveLitPanel';

const INK_TEX = String.raw`\ln F_{th}(N) = \ln F_{th}(1) + (S-1)\ln N`;
/** Beispiel: F_th(1) = 0,2 J/cm², S = 0,8 */
const EXAMPLE = 'N\tF_th [J/cm²]\n1\t0,2\n10\t0,1262\n100\t0,0796\n1000\t0,0502';

export function IncubationScreen() {
  const [fits, setFits] = useFitsState();
  const [calc, updateCalc] = useCalcState();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string>();
  const s = fits.ink;
  const set = (patch: Partial<FitsState['ink']>) => setFits((f) => ({ ...f, ink: { ...f.ink, ...patch } }));

  const parsed = useMemo(() => parsePairs(s.text), [s.text]);
  const points = parsed.pairs.map(([n, f]) => ({ n, fth: toSI(f, 'fluence', s.fUnit)! }));
  const r = incubationFit(points);
  const plot = useMemo(() => {
    const valid = points.filter((p) => p.n > 0 && p.fth > 0).map((p) => [Math.log(p.n), Math.log(p.fth * 1e-4)] as [number, number]);
    const pd = fitPlotData(valid, linearRegression(valid.map((v) => v[0]), valid.map((v) => v[1])));
    // Gerade nicht bis zur Nullstelle verlängern (hier ohne Bedeutung)
    if (pd.points[0] === null) {
      pd.x.shift();
      pd.points.shift();
      pd.line.shift();
    }
    return pd;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.text, s.fUnit]);

  return (
    <div className="stack">
      <section className="card">
        <h2>Inkubation</h2>
        <p className="muted small">
          Schwellfluenz F_th(N) für verschiedene Pulszahlen N (z. B. je ein D²-Fit pro N). Eine Zeile pro Pulszahl: N und F_th.
        </p>
        <div className="field">
          <label htmlFor="ink-f">Einheit F_th</label>
          <select id="ink-f" value={s.fUnit} onChange={(e) => set({ fUnit: e.target.value })}>
            {unitsOf('fluence').map((u) => (
              <option key={u.id}>{u.id}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ink-text">Wertepaare (N, F_th)</label>
          <textarea id="ink-text" className="pairs-text" rows={6} value={s.text} placeholder={'1\t0,2\n10\t0,13\n100\t0,08'} onChange={(e) => set({ text: e.target.value })} />
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-small" onClick={() => set({ text: EXAMPLE, fUnit: 'J/cm²' })}>
            Beispieldaten
          </button>
          <button type="button" className="btn btn-small" disabled={!s.text} onClick={() => set({ text: '' })}>
            Leeren
          </button>
        </div>
        <p className="muted small mt">
          {parsed.pairs.length} Paare gelesen{parsed.headerSkipped ? ', Kopfzeile übersprungen' : ''}.
          {parsed.invalidLines.length > 0 && <span className="field-warn"> Nicht lesbar: Zeile {parsed.invalidLines.join(', ')}.</span>}
        </p>
      </section>

      <section className="card">
        <h2>Ergebnis</h2>
        {!r ? (
          <p className="muted">Mindestens zwei verschiedene Pulszahlen mit F_th &gt; 0 nötig.</p>
        ) : (
          <>
            <div className="tiles">
              <ResultTile label="Einzelpuls-Schwelle F_th(1)" value={formatIn(r.fth1, 'fluence')} tex={INK_TEX} />
              <ResultTile
                label="Inkubationskoeffizient S"
                value={formatNumber(r.s, 4)}
                tex={FORMULAS.fthEff}
                warn={r.s > 1.05 ? 'S > 1: Schwelle steigt mit N – Daten prüfen' : undefined}
              />
              <ResultTile label="Bestimmtheitsmaß R²" value={formatNumber(r.r2, 4)} sub={`${r.n} Punkte`} warn={r.n < 3 ? 'Wenige Punkte' : undefined} />
            </div>
            <FitPlot x={plot.x} points={plot.points} line={plot.line} xLabel="ln N" yLabel="ln(F_th / J/cm²)" />
            <div className="row wrap mt">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  updateCalc((c) => ({ ...c, v: { ...c.v, fth: r.fth1, s: r.s } }));
                  setMsg(`F_th(1) = ${formatIn(r.fth1, 'fluence')} und S = ${formatNumber(r.s, 4)} in den Rechner übernommen.`);
                }}
              >
                F_th(1) und S in Rechner
              </button>
              <button type="button" className="btn" onClick={() => navigate('/rechner')}>
                Zum Rechner
              </button>
            </div>
            {msg && <p className="notice notice-ok">{msg}</p>}
            <SaveLitPanel
              values={[
                { groesse: 'Fth', wert: r.fth1, einheit: 'J/cm²', nPulse: 1 },
                { groesse: 'S', wert: r.s, einheit: '' },
              ]}
              methode="Inkubationsfit"
              notiz={`Inkubationsfit: F_th(1) = ${formatIn(r.fth1, 'fluence')}, S = ${formatNumber(r.s, 4)}, R² = ${formatNumber(r.r2, 4)}, n = ${r.n}`}
              lambda={calc.v.lambda}
              tau={calc.v.tau}
              defaultMaterialId={calc.preset.materialId}
            />
          </>
        )}
      </section>
    </div>
  );
}
