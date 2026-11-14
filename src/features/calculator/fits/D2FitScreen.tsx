import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { d2Fit, linearRegression } from '../../../core/physics/fit';
import { parsePairs, fitPlotData } from '../../../core/pairs';
import { FORMULAS } from '../../../core/physics/formulas';
import { formatIn, formatNumber, formatSI, toSI, unitsOf } from '../../../core/physics/units';
import { ResultTile } from '../../../components/ResultTile';
import { useCalcState } from '../useCalcState';
import { useFitsState, type FitsState } from './useFitsState';
import { FitPlot } from './FitPlot';
import { SaveLitPanel } from './SaveLitPanel';

const D2_TEX = String.raw`D^2 = 2w_0^2\ln E_p - 2w_0^2\ln E_{th},\quad F_{th} = \frac{2E_{th}}{\pi w_0^2}`;

/** Beispiel: synthetische Krater aus w₀ = 13,114 µm, F_th = 0,2 J/cm² (Referenzwerte aus 04_formeln.md). */
const EXAMPLE = 'E_p [µJ]\tD [µm]\n0,5\t0\n1\t14,55\n2\t21,22\n5\t27,66\n10\t31,68\n20\t35,24\n50\t39,46';

export function D2FitScreen() {
  const [fits, setFits] = useFitsState();
  const [calc, updateCalc] = useCalcState();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string>();
  const s = fits.d2;
  const set = (patch: Partial<FitsState['d2']>) => setFits((f) => ({ ...f, d2: { ...f.d2, ...patch } }));

  const parsed = useMemo(() => parsePairs(s.text), [s.text]);
  const points = parsed.pairs.map(([e, d]) => ({ ePuls: toSI(e, 'energy', s.eUnit)!, d: toSI(d, 'length', s.dUnit)! }));
  const excluded = points.filter((p) => !(p.d > 0 && p.ePuls > 0)).length;
  const r = d2Fit(points);

  // Plot in Labor-Einheiten: ln(E_p / µJ) gegen D² in µm²
  const plot = useMemo(() => {
    const valid = points.filter((p) => p.d > 0 && p.ePuls > 0).map((p) => [Math.log(p.ePuls / 1e-6), (p.d * 1e6) ** 2] as [number, number]);
    return fitPlotData(valid, linearRegression(valid.map((v) => v[0]), valid.map((v) => v[1])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.text, s.eUnit, s.dUnit]);

  const weak = r && (r.n < 4 || r.r2 < 0.95);

  return (
    <div className="stack">
      <section className="card">
        <h2>D²-Methode (Liu)</h2>
        <p className="muted small">
          Kraterdurchmesser D bei verschiedenen Pulsenergien E_p (am Werkstück, gleiche Pulszahl). Eine Zeile pro Krater, Werte
          getrennt durch Tab, „;“ oder Leerzeichen – direkt aus Excel einfügbar. Krater mit D = 0 werden ausgeschlossen.
        </p>
        <div className="two-col">
          <div className="field">
            <label htmlFor="d2-e">Einheit E_p</label>
            <select id="d2-e" value={s.eUnit} onChange={(e) => set({ eUnit: e.target.value })}>
              {unitsOf('energy').map((u) => (
                <option key={u.id}>{u.id}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="d2-d">Einheit D</label>
            <select id="d2-d" value={s.dUnit} onChange={(e) => set({ dUnit: e.target.value })}>
              {unitsOf('length').map((u) => (
                <option key={u.id}>{u.id}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="d2-text">Wertepaare (E_p, D)</label>
          <textarea
            id="d2-text"
            className="pairs-text"
            rows={8}
            value={s.text}
            placeholder={'5\t21,5\n10\t26,6\n20\t31,1'}
            onChange={(e) => set({ text: e.target.value })}
          />
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-small" onClick={() => set({ text: EXAMPLE, eUnit: 'µJ', dUnit: 'µm' })}>
            Beispieldaten
          </button>
          <button type="button" className="btn btn-small" disabled={!s.text} onClick={() => set({ text: '' })}>
            Leeren
          </button>
        </div>
        <p className="muted small mt">
          {parsed.pairs.length} Paare gelesen{excluded ? `, ${excluded} mit D = 0 ausgeschlossen` : ''}
          {parsed.headerSkipped ? ', Kopfzeile übersprungen' : ''}.
          {parsed.invalidLines.length > 0 && <span className="field-warn"> Nicht lesbar: Zeile {parsed.invalidLines.join(', ')}.</span>}
        </p>
      </section>

      <section className="card">
        <h2>Ergebnis</h2>
        {!r ? (
          <p className="muted">Mindestens zwei Krater mit D &gt; 0 und steigendem D² nötig.</p>
        ) : (
          <>
            <div className="tiles">
              <ResultTile label="Fokusradius w₀" value={formatSI(r.w0, 'm')} sub={`Ø ${formatSI(2 * r.w0, 'm')}`} tex={D2_TEX} />
              <ResultTile label="Schwellenergie E_th" value={formatSI(r.eth, 'J')} />
              <ResultTile label="Schwellfluenz F_th" value={formatIn(r.fth, 'fluence')} tex={FORMULAS.F0} />
              <ResultTile label="Bestimmtheitsmaß R²" value={formatNumber(r.r2, 4)} sub={`${r.n} Punkte`} warn={weak ? 'Wenige Punkte oder schlechter Fit' : undefined} />
            </div>
            <FitPlot x={plot.x} points={plot.points} line={plot.line} xLabel="ln(E_p / µJ)" yLabel="D² [µm²]" />
            <div className="row wrap mt">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  updateCalc((c) => ({ ...c, w0Mode: 'direkt', w0Quelle: 'd2', v: { ...c.v, w0: r.w0 } }));
                  setMsg(`w₀ = ${formatSI(r.w0, 'm')} in den Rechner übernommen (Quelle: D²-gemessen).`);
                }}
              >
                w₀ in Rechner
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  updateCalc((c) => ({ ...c, v: { ...c.v, fth: r.fth } }));
                  setMsg(`F_th = ${formatIn(r.fth, 'fluence')} in den Rechner übernommen.`);
                }}
              >
                F_th in Rechner
              </button>
              <button type="button" className="btn" onClick={() => navigate('/rechner')}>
                Zum Rechner
              </button>
            </div>
            {msg && <p className="notice notice-ok">{msg}</p>}
            <SaveLitPanel
              values={[{ groesse: 'Fth', wert: r.fth, einheit: 'J/cm²' }]}
              methode="D² (Liu)"
              notiz={`D²-Fit: w₀ = ${formatSI(r.w0, 'm')}, E_th = ${formatSI(r.eth, 'J')}, R² = ${formatNumber(r.r2, 4)}, n = ${r.n}`}
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

