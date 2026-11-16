import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { derive } from '../../core/physics/derive';
import { FORMULAS } from '../../core/physics/formulas';
import { formatIn, formatNumber, formatSI } from '../../core/physics/units';
import { NumberInput } from '../../components/NumberInput';
import { ResultTile } from '../../components/ResultTile';
import { CALC_FIELDS, DEFAULT_UNITS, calcDeriveInput, type CalcField } from './state';
import { useCalcState } from './useCalcState';

const pct = (x: number | undefined) => (x === undefined ? '–' : `${formatNumber(x * 100, 4)} %`);
/** Sub-Puls-Zahlen für den Vergleich */
const COMPARE_N = [1, 2, 3, 4, 5, 6, 8, 10];

/**
 * Burst-Rechner: nutzt alle Eingaben der Parameter-Seite (Energie pro Burst, Strahl, Material) und ergänzt
 * Sub-Puls-Zahl und Intra-Burst-Frequenz.
 */
export function BurstScreen() {
  const [s, update] = useCalcState();
  const input = useMemo(() => calcDeriveInput(s), [s]);
  const d = useMemo(() => derive(input), [input]);
  const burst = d.nBurst !== undefined;

  const field = (k: CalcField, extra: { hint?: string; warn?: string; placeholder?: string } = {}) => {
    const def = CALC_FIELDS[k];
    return (
      <NumberInput
        label={def.label}
        symbol={def.symbol}
        quantity={def.quantity}
        value={s.v[k]}
        unit={s.u[k] ?? DEFAULT_UNITS[k]}
        onChange={(x) => update((st) => ({ ...st, v: { ...st.v, [k]: x } }))}
        onUnitChange={(u) => update((st) => ({ ...st, u: { ...st.u, [k]: u } }))}
        {...extra}
      />
    );
  };

  // Vergleich: gleiche Burst-Energie, verschiedene Sub-Puls-Zahlen
  const rows = useMemo(
    () => COMPARE_N.map((n) => ({ n, d: derive({ ...input, burstN: n }) })),
    [input],
  );
  const best = rows.reduce<number | undefined>((b, r) => (r.d.VdotP !== undefined && (b === undefined || r.d.VdotP > b) ? r.d.VdotP : b), undefined);

  const nWarn = s.v.burstN !== undefined && Math.round(s.v.burstN) !== s.v.burstN ? `Wird auf n = ${Math.round(s.v.burstN)} gerundet` : undefined;
  const overlapWarn =
    d.dtSub !== undefined && s.v.tau !== undefined && d.dtSub < 10 * s.v.tau ? 'Sub-Pulse fast überlappend (Δt < 10 τ): Modell nicht gültig' : undefined;
  const period = s.v.fRep ? 1 / s.v.fRep : undefined;
  const lengthWarn = d.tBurst !== undefined && period !== undefined && d.tBurst >= period ? 'Burst länger als die Burst-Periode 1/f_rep' : undefined;
  const missingBase = d.ePuls === undefined || d.w0 === undefined;

  return (
    <div className="calc">
      <div className="calc-grid">
        <div className="calc-inputs">
          <section className="card">
            <h2>Burst</h2>
            {field('burstN', { placeholder: '1', hint: 'n ≥ 2 aktiviert den Burst; leer oder 1 = Einzelpulse', warn: nWarn })}
            {field('fBurst', { hint: 'Abstand der Sub-Pulse Δt = 1/f_burst' })}
            <p className="muted small">
              Energie bzw. Leistung auf der <Link to="/rechner">Parameter-Seite</Link> gelten <strong>pro Burst</strong>{' '}
              (E_burst = P_avg/f_rep). Annahmen: Energie gleichmäßig auf die Sub-Pulse verteilt, Sub-Pulse zeitlich
              getrennt und im Abtrag unabhängig (ohne Abschirmung und Wärmeakkumulation).
            </p>
          </section>
          <section className="card">
            <h2>Übernommen aus „Parameter“</h2>
            <dl className="kv">
              <dt>E_burst am Werkstück</dt>
              <dd>{formatSI(d.ePuls, 'J')}</dd>
              <dt>f_rep (Bursts)</dt>
              <dd>{s.v.fRep !== undefined ? formatSI(s.v.fRep, 'Hz') : '–'}</dd>
              <dt>τ</dt>
              <dd>{s.v.tau !== undefined ? formatSI(s.v.tau, 's') : '–'}</dd>
              <dt>{s.v.z ? 'w(z) Oberfläche' : 'w₀'}</dt>
              <dd>{formatSI(d.wz, 'm')}</dd>
              <dt>F_th{s.v.s !== undefined && s.v.nPulse !== undefined ? '(N)' : ''}</dt>
              <dd>{formatIn(d.fthEff, 'fluence')}</dd>
              <dt>δ</dt>
              <dd>{s.v.delta !== undefined ? formatSI(s.v.delta, 'm') : '–'}</dd>
            </dl>
            {missingBase && (
              <p className="notice notice-warn">
                Für Burst-Werte auf der <Link to="/rechner">Parameter-Seite</Link> Energie (bzw. Leistung und f_rep) und
                Fokusradius eingeben.
              </p>
            )}
          </section>
        </div>

        <div className="calc-results">
          {!burst ? (
            <p className="muted">Sub-Pulse pro Burst (n ≥ 2) eingeben.</p>
          ) : (
            <>
              <section>
                <h2>Zeit &amp; Energie</h2>
                <div className="tiles">
                  <ResultTile label="E_sub am Werkstück" value={formatSI(d.ePulsSub, 'J')} tex={FORMULAS.eSub} />
                  <ResultTile label="Sub-Puls-Abstand Δt" value={formatSI(d.dtSub, 's')} tex={FORMULAS.dtSub} warn={overlapWarn} />
                  <ResultTile label="Burst-Dauer" value={formatSI(d.tBurst, 's')} tex={FORMULAS.tBurst} warn={lengthWarn} />
                  <ResultTile label="P_pk (Sub-Puls)" value={formatSI(d.pPk, 'W')} tex={FORMULAS.pPk} />
                </div>
              </section>
              <section>
                <h2>Fluenz</h2>
                <div className="tiles">
                  <ResultTile label="F₀ Burst (Fokus)" value={formatIn(d.F0, 'fluence')} tex={FORMULAS.F0} />
                  <ResultTile label="F₀,sub (Fokus)" value={formatIn(d.F0Sub, 'fluence')} tex={FORMULAS.F0Sub} />
                  {s.v.z ? <ResultTile label="F₀,sub(z) Oberfläche" value={formatIn(d.F0zSub, 'fluence')} tex={FORMULAS.F0z} /> : null}
                  <ResultTile label="I₀ (Sub-Puls)" value={formatIn(d.I0, 'intensity')} tex={FORMULAS.I0} />
                </div>
              </section>
              <section>
                <h2>Abtrag pro Burst</h2>
                <div className="tiles">
                  <ResultTile
                    label="Kraterdurchmesser D"
                    value={formatSI(d.D, 'm')}
                    tex={FORMULAS.D}
                    warn={d.D === 0 ? 'F₀,sub ≤ F_th: kein Abtrag' : undefined}
                  />
                  <ResultTile label="Tiefe pro Burst" value={formatSI(d.zAbl, 'm')} tex={FORMULAS.zAblBurst} />
                  <ResultTile label="Volumen pro Burst" value={formatIn(d.Vp, 'volume')} tex={FORMULAS.VBurst} />
                  <ResultTile label="Spez. Abtragsrate V̇/P" value={formatIn(d.VdotP, 'removalRate')} tex={FORMULAS.VdotPBurst} />
                  <ResultTile
                    label="E_burst,opt am Werkstück"
                    value={formatSI(d.EpOpt, 'J')}
                    tex={FORMULAS.EBurstOpt}
                    sub={d.Topt !== undefined ? `→ Abschwächung T = ${pct(d.Topt)}` : undefined}
                    warn={d.Topt !== undefined && d.Topt > 1 ? 'Mehr Energie nötig als verfügbar' : undefined}
                  />
                </div>
              </section>
            </>
          )}

          {!missingBase && (
            <section className="card">
              <h2>Vergleich Sub-Puls-Zahl</h2>
              <p className="muted small">Gleiche Burst-Energie {formatSI(d.ePuls, 'J')}, nur n variiert.</p>
              <div className="table-wrap">
                <table className="report">
                  <thead>
                    <tr>
                      <th>n</th>
                      <th>F₀,sub</th>
                      <th>Tiefe/Burst</th>
                      <th>V̇/P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ n, d: r }) => (
                      <tr key={n} className={n === (d.nBurst ?? 1) ? 'row-current' : undefined}>
                        <th>{n}</th>
                        <td>{formatIn(n === 1 ? r.F0z : r.F0zSub, 'fluence', undefined, 3)}</td>
                        <td>{formatSI(r.zAbl, 'm', 3)}</td>
                        <td>
                          {formatIn(r.VdotP, 'removalRate', undefined, 3)}
                          {best !== undefined && r.VdotP === best && best > 0 ? ' ★' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small">★ = höchste spezifische Abtragsrate in der Tabelle. Hervorgehoben: aktuelle Einstellung.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
