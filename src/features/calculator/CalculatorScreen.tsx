import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { componentsRepo } from '../../data/repos';
import { checkLimits, type LimitField } from '../../core/limits';
import { PresetPanel } from './PresetPanel';
import { asLaser, asScanner } from './presets';
import { derive } from '../../core/physics/derive';
import { pulseEnergyForFluence, transmissionForTarget } from '../../core/physics/fluence';
import { FORMULAS } from '../../core/physics/formulas';
import { formatIn, formatNumber, formatSI } from '../../core/physics/units';
import { NumberInput } from '../../components/NumberInput';
import { ResultTile } from '../../components/ResultTile';
import { Segmented } from '../../components/Segmented';
import { useThemeVersion } from '../../components/useThemeVersion';
import { CausticPlot } from './CausticPlot';
import { CALC_FIELDS, DEFAULT_UNITS, type CalcField, type CalcState } from './state';
import { useCalcState } from './useCalcState';

const pct = (x: number | undefined) => (x === undefined ? '–' : `${formatNumber(x * 100, 4)} %`);

export function CalculatorScreen() {
  const [s, update, reset] = useCalcState();
  const [plotOpen, setPlotOpen] = useState(true);
  const themeVersion = useThemeVersion();

  const set = (k: CalcField) => (x: number | undefined) =>
    update((st) => ({ ...st, v: { ...st.v, [k]: x } }));
  const setUnit = (k: CalcField) => (u: string) => update((st) => ({ ...st, u: { ...st.u, [k]: u } }));

  const components = useLiveQuery(
    () => (s.preset.systemId ? componentsRepo.bySystem(s.preset.systemId) : Promise.resolve([])),
    [s.preset.systemId],
  );
  const laser = asLaser(components?.find((c) => c.id === s.preset.laserId));
  const scanner = asScanner(components?.find((c) => c.id === s.preset.scannerId));

  const field = (k: CalcField, extra: { warn?: string; hint?: string; allowNegative?: boolean; placeholder?: string } = {}) => {
    const def = CALC_FIELDS[k];
    const limitWarn = k in limits ? limits[k as LimitField] : undefined;
    return (
      <NumberInput
        key={k}
        label={def.label}
        symbol={def.symbol}
        quantity={def.quantity}
        value={s.v[k]}
        unit={s.u[k] ?? DEFAULT_UNITS[k]}
        onChange={set(k)}
        onUnitChange={setUnit(k)}
        {...extra}
        warn={extra.warn ?? limitWarn}
      />
    );
  };

  const v = s.v;
  const d = useMemo(
    () =>
      derive({
        lambda: v.lambda,
        tau: v.tau,
        profile: s.profile,
        pAvg: s.energyMode === 'pAvg' ? v.pAvg : undefined,
        ePuls: s.energyMode === 'ePuls' ? v.ePuls : undefined,
        fRep: v.fRep,
        transmission: v.transmission,
        m2: v.m2,
        f: v.f,
        wL: v.wL,
        w0: s.w0Mode === 'direkt' ? v.w0 : undefined,
        z: v.z,
        v: v.v,
        hatch: v.hatch,
        fth: v.fth,
        delta: v.delta,
        s: v.s,
        nPulse: v.nPulse,
        area: v.area,
        nLayer: v.nLayer,
      }),
    [v, s.profile, s.energyMode, s.w0Mode],
  );

  // Grenzwerte gegen Datenblatt (an der Quelle). Die Energie-Warnung erscheint am gerade sichtbaren Eingabefeld.
  const lim = checkLimits(
    { lambda: v.lambda, tau: v.tau, pAvg: d.pAvgQuelle, ePuls: d.ePulsQuelle, fRep: v.fRep, v: v.v },
    laser,
    scanner,
  );
  const energyWarn = [lim.pAvg, lim.ePuls].filter(Boolean).join(' · ') || undefined;
  const limits: Partial<Record<LimitField, string>> = { ...lim, pAvg: energyWarn, ePuls: energyWarn };

  // Unterrechner: Abschwächung für Zielfluenz (auf der Oberfläche, also mit w(z))
  const eZiel = pulseEnergyForFluence(v.zielF, d.wz);
  const tZiel = transmissionForTarget(eZiel, d.ePulsQuelle);

  const tWarn = v.transmission !== undefined && (v.transmission < 0 || v.transmission > 1) ? 'T muss zwischen 0 und 100 % liegen' : undefined;
  const belowThreshold = d.F0z !== undefined && d.fthEff !== undefined && d.F0z <= d.fthEff;
  const hasDefocus = v.z !== undefined && v.z !== 0;

  return (
    <div className="calc">
      <div className="calc-toolbar">
        <p className="muted small">
          Gauß-Strahl (TEM00 mit M²), τ = FWHM, Werte live. Gelb = Grenzwert der gewählten Komponente überschritten.
        </p>
        <button type="button" className="btn" onClick={reset}>
          Zurücksetzen
        </button>
      </div>

      <div className="calc-grid">
        <div className="calc-inputs">
          <PresetPanel state={s} update={update} components={components} />
          <section className="card">
            <h2>Puls</h2>
            {field('lambda')}
            {field('tau')}
            <div className="field-switch">
              <Segmented
                label="Eingabe Energie"
                value={s.energyMode}
                options={[
                  ['pAvg', 'Leistung'],
                  ['ePuls', 'Pulsenergie'],
                ]}
                onChange={(m) => update((st): CalcState => ({ ...st, energyMode: m }))}
              />
            </div>
            {s.energyMode === 'pAvg'
              ? field('pAvg', { hint: d.ePulsQuelle !== undefined ? `→ E_p = ${formatSI(d.ePulsQuelle, 'J')}` : undefined })
              : field('ePuls', { hint: d.pAvgQuelle !== undefined ? `→ P_avg = ${formatSI(d.pAvgQuelle, 'W')}` : undefined })}
            {field('fRep')}
            {field('transmission', {
              placeholder: '100',
              warn: tWarn,
              hint: 'Quelle → Werkstück; leer = 100 %',
            })}
            <label className="field">
              <span>Zeitprofil</span>
              <select
                value={s.profile}
                onChange={(e) => update((st) => ({ ...st, profile: e.target.value === 'sech2' ? 'sech2' : 'gauss' }))}
              >
                <option value="gauss">Gauß</option>
                <option value="sech2">sech²</option>
              </select>
            </label>
          </section>

          <section className="card">
            <h2>Strahl</h2>
            <div className="field-switch">
              <Segmented
                label="Fokusradius"
                value={s.w0Mode}
                options={[
                  ['optik', 'aus Optik'],
                  ['direkt', 'w₀ direkt'],
                ]}
                onChange={(m) => update((st): CalcState => ({ ...st, w0Mode: m }))}
              />
            </div>
            {field('m2', { placeholder: '1' })}
            {s.w0Mode === 'optik' ? (
              <>
                {field('f')}
                {field('wL')}
              </>
            ) : (
              field('w0')
            )}
            {field('z', { allowNegative: true, placeholder: '0' })}
          </section>

          <section className="card">
            <h2>Scan</h2>
            {field('v')}
            {field('hatch')}
            {field('area')}
            {field('nLayer')}
          </section>

          <section className="card">
            <h2>Material</h2>
            {field('fth')}
            {field('delta')}
            {field('s', { hint: 'Optional, für F_th(N) mit Inkubation' })}
            {field('nPulse')}
          </section>
        </div>

        <div className="calc-results">
          <section>
            <h2>Puls &amp; Leistung</h2>
            <div className="tiles">
              <ResultTile
                label="E_p am Werkstück"
                value={formatSI(d.ePuls, 'J')}
                tex={`\\begin{gathered}${FORMULAS.ePuls}\\\\ ${FORMULAS.transmission}\\end{gathered}`}
              />
              <ResultTile label="P_avg am Werkstück" value={formatSI(d.pAvg, 'W')} tex={FORMULAS.pAvg} />
              <ResultTile label="Spitzenleistung P_pk" value={formatSI(d.pPk, 'W')} tex={FORMULAS.pPk} />
              <ResultTile label="Spitzenintensität I₀" value={formatIn(d.I0, 'intensity')} tex={FORMULAS.I0} />
            </div>
          </section>

          <section>
            <h2>Strahl &amp; Fluenz</h2>
            <div className="tiles">
              <ResultTile
                label={d.w0Berechnet ? 'Fokusradius w₀ (berechnet)' : 'Fokusradius w₀'}
                value={formatSI(d.w0, 'm')}
                tex={d.w0Berechnet ? FORMULAS.w0 : undefined}
                sub={d.w0 !== undefined ? `Ø ${formatSI(2 * d.w0, 'm')}` : undefined}
              />
              <ResultTile
                label="Rayleighlänge z_R"
                value={formatSI(d.zR, 'm')}
                tex={FORMULAS.zR}
                sub={d.dof !== undefined ? `Schärfentiefe 2z_R = ${formatSI(d.dof, 'm')}` : undefined}
              />
              <ResultTile label="Spitzenfluenz F₀ (Fokus)" value={formatIn(d.F0, 'fluence')} tex={FORMULAS.F0} />
              <ResultTile label="Mittlere Fluenz F̄" value={formatIn(d.Fmean, 'fluence')} tex={FORMULAS.Fmean} />
              {hasDefocus && (
                <>
                  <ResultTile label="Strahlradius w(z) Oberfläche" value={formatSI(d.wz, 'm')} tex={FORMULAS.wz} />
                  <ResultTile label="F₀(z) Oberfläche" value={formatIn(d.F0z, 'fluence')} tex={FORMULAS.F0z} />
                </>
              )}
            </div>
          </section>

          <section>
            <h2>Scan</h2>
            <div className="tiles">
              <ResultTile label="Pulsabstand Δx" value={formatSI(d.dx, 'm')} tex={FORMULAS.dx} />
              <ResultTile
                label="Pulsüberlapp OL"
                value={pct(d.OL)}
                tex={FORMULAS.OL}
                warn={d.OL !== undefined && d.OL < 0 ? 'Lücke zwischen Pulsen' : undefined}
              />
              <ResultTile label="Pulse pro Spot N_1D" value={formatNumber(d.N1D)} tex={FORMULAS.N1D} />
              <ResultTile label="Pulse pro Fläche N_2D" value={formatNumber(d.N2D)} tex={FORMULAS.N2D} />
              <ResultTile
                label="Linienüberlapp OL_h"
                value={pct(d.OLh)}
                tex={FORMULAS.OLh}
                warn={d.OLh !== undefined && d.OLh < 0 ? 'Lücke zwischen Linien' : undefined}
              />
              <ResultTile
                label="Bearbeitungszeit Fläche"
                value={formatIn(d.tFlaeche, 'duration', d.tFlaeche !== undefined && d.tFlaeche >= 120 ? 'min' : 's')}
                tex={FORMULAS.tFlaeche}
                sub="ohne Sprung-/Beschleunigungszeiten"
              />
            </div>
            {hasDefocus && <p className="muted small">Bei Defokus wird w(z) auf der Oberfläche statt w₀ eingesetzt.</p>}
          </section>

          <section>
            <h2>Ablation</h2>
            <div className="tiles">
              {v.s !== undefined && v.nPulse !== undefined && (
                <ResultTile label="Schwelle F_th(N)" value={formatIn(d.fthEff, 'fluence')} tex={FORMULAS.fthEff} />
              )}
              <ResultTile
                label="Kraterdurchmesser D"
                value={formatSI(d.D, 'm')}
                tex={FORMULAS.D}
                warn={belowThreshold ? 'F₀ ≤ F_th: kein Abtrag' : undefined}
              />
              <ResultTile label="Tiefe pro Puls z_abl" value={formatSI(d.zAbl, 'm')} tex={FORMULAS.zAbl} />
              <ResultTile label="Volumen pro Puls V_p" value={formatIn(d.Vp, 'volume')} tex={FORMULAS.Vp} />
              <ResultTile label="Spez. Abtragsrate V̇/P" value={formatIn(d.VdotP, 'removalRate')} tex={FORMULAS.VdotP} />
              <ResultTile label="Optimale Fluenz F₀,opt" value={formatIn(d.F0opt, 'fluence')} tex={FORMULAS.F0opt} />
              <ResultTile label="(V̇/P)_max" value={formatIn(d.VdotPmax, 'removalRate')} tex={FORMULAS.VdotPmax} />
              <ResultTile
                label="E_p,opt am Werkstück"
                value={formatSI(d.EpOpt, 'J')}
                tex={FORMULAS.EpOpt}
                sub={d.Topt !== undefined ? `→ Abschwächung T = ${pct(d.Topt)}` : undefined}
                warn={d.Topt !== undefined && d.Topt > 1 ? 'Mehr Energie nötig als verfügbar' : undefined}
              />
            </div>
          </section>

          <section className="card">
            <h2>Abschwächung für Zielfluenz</h2>
            {field('zielF')}
            <div className="tiles">
              <ResultTile label="Benötigte E_p am Werkstück" value={formatSI(eZiel, 'J')} tex={FORMULAS.EpZiel} />
              <ResultTile
                label="Abschwächung T"
                value={pct(tZiel)}
                tex={FORMULAS.Topt}
                warn={tZiel !== undefined && tZiel > 1 ? 'Ziel mit der Quelle nicht erreichbar' : undefined}
              />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Kaustik</h2>
              <button type="button" className="btn btn-small" aria-expanded={plotOpen} onClick={() => setPlotOpen((o) => !o)}>
                {plotOpen ? 'Einklappen' : 'Aufklappen'}
              </button>
            </div>
            {plotOpen &&
              (d.w0 !== undefined && d.zR !== undefined ? (
                <>
                  <Segmented
                    label="Darstellung"
                    value={s.showFluence ? 'F' : 'w'}
                    options={[
                      ['w', 'Strahlradius w(z)'],
                      ['F', 'Fluenz F₀(z)'],
                    ]}
                    onChange={(x) => update((st) => ({ ...st, showFluence: x === 'F' }))}
                  />
                  {s.showFluence && d.ePuls === undefined ? (
                    <p className="muted">Für die Fluenz Pulsenergie oder Leistung und Repetitionsrate eingeben.</p>
                  ) : (
                    <CausticPlot
                      key={themeVersion}
                      w0={d.w0}
                      zR={d.zR}
                      fokuslage={v.z}
                      ePuls={d.ePuls}
                      fth={d.fthEff}
                      showFluence={s.showFluence}
                    />
                  )}
                </>
              ) : (
                <p className="muted">Für die Kaustik Wellenlänge und Fokusradius (bzw. Brennweite und w_L) eingeben.</p>
              ))}
          </section>
        </div>
      </div>
    </div>
  );
}
