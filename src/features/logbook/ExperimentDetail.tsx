import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  componentsRepo,
  experimentsRepo,
  materialsRepo,
  samplesRepo,
  seriesRepo,
  systemsRepo,
} from '../../data/repos';
import type { Experiment, ExperimentParams, ExperimentStatus, W0Quelle } from '../../data/types';
import { deriveExperiment, experimentSnapshot, formatDateDe, parseTags } from '../../core/logbook';
import { nextVersuchsId, sanitizeIdPart } from '../../core/ids';
import { checkLimits } from '../../core/limits';
import { laserLambdas, laserLimits, laserM2 } from '../../data/equipment';
import { focusRadius } from '../../core/physics/beam';
import { FORMULAS } from '../../core/physics/formulas';
import { formatIn, formatNumber, formatSI, type Quantity } from '../../core/physics/units';
import { NumberInput } from '../../components/NumberInput';
import { ResultTile } from '../../components/ResultTile';
import { Segmented } from '../../components/Segmented';
import { SelectField, TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { asLaser, asOptik, asScanner } from '../calculator/presets';
import { STATUS_LABEL, W0_QUELLE_LABEL } from './labels';
import { duplicate } from './actions';
import { Mentions } from '../notes/Mentions';

type P = ExperimentParams;
const pct = (x: number | undefined) => (x === undefined ? '–' : `${formatNumber(x * 100, 4)} %`);

function TagInput({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const [text, setText] = useState(value.join(', '));
  return (
    <TextField
      label="Tags"
      value={text}
      placeholder="z. B. schwelle, si, linien"
      hint="Mit Komma oder Leerzeichen trennen"
      onChange={(v) => {
        setText(v ?? '');
        onChange(parseTags(v ?? ''));
      }}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ExperimentForm({ exp }: { exp: Experiment }) {
  const navigate = useNavigate();
  const [units, setUnits] = useState<Record<string, string>>({});

  const series = useLiveQuery(() => seriesRepo.listSorted(), []);
  const systems = useLiveQuery(() => systemsRepo.listSorted(), []);
  const materials = useLiveQuery(() => materialsRepo.listSorted(), []);

  // Versuchs-IDs der anderen (nicht gelöschten) Versuche für die Eindeutigkeitsprüfung
  const taken = useLiveQuery(
    async () => new Set((await experimentsRepo.list()).filter((e) => e.id !== exp.id).map((e) => e.versuchsId)),
    [exp.id],
  ) ?? new Set<string>();

  const { draft, change, status, error } = useAutosave<Experiment>(
    exp,
    (d) =>
      experimentsRepo.update(d.id, {
        versuchsId: d.versuchsId,
        seriesId: d.seriesId,
        datum: d.datum,
        systemId: d.systemId,
        laserId: d.laserId,
        optikId: d.optikId,
        scannerId: d.scannerId,
        sampleId: d.sampleId,
        materialId: d.materialId,
        params: d.params,
        abgeleitet: experimentSnapshot(d.params),
        bemerkung: d.bemerkung,
        tags: d.tags,
        status: d.status,
      }),
    (d) =>
      d.versuchsId.trim() === ''
        ? 'Versuchs-ID fehlt'
        : taken.has(d.versuchsId)
          ? `Versuchs-ID ${d.versuchsId} ist schon vergeben`
          : !/^\d{4}-\d{2}-\d{2}$/.test(d.datum)
            ? 'Datum fehlt'
            : undefined,
  );

  const components = useLiveQuery(
    () => (draft.systemId ? componentsRepo.bySystem(draft.systemId) : Promise.resolve([])),
    [draft.systemId],
  );
  const samples = useLiveQuery(
    () => (draft.materialId ? samplesRepo.byMaterial(draft.materialId) : Promise.resolve([])),
    [draft.materialId],
  );

  if (!series || !systems || !materials || !components || !samples) return null;

  const p = draft.params;
  const setP = (patch: Partial<P>) => change((d) => ({ ...d, params: { ...d.params, ...patch } }));
  const num = (k: keyof P, label: string, quantity: Quantity, symbol?: string, extra: { warn?: string; hint?: string; allowNegative?: boolean; defUnit?: string } = {}) => (
    <NumberInput
      label={label}
      symbol={symbol}
      quantity={quantity}
      value={p[k] as number | undefined}
      unit={units[k] ?? extra.defUnit}
      onUnitChange={(u) => setUnits((s) => ({ ...s, [k]: u }))}
      onChange={(v) => setP({ [k]: v } as Partial<P>)}
      warn={extra.warn}
      hint={extra.hint}
      allowNegative={extra.allowNegative}
    />
  );

  const byType = (t: string) => components.filter((c) => c.typ === t).map((c) => [c.id, c.name] as const);
  const laser = asLaser(components.find((c) => c.id === draft.laserId));
  const optik = asOptik(components.find((c) => c.id === draft.optikId));
  const scanner = asScanner(components.find((c) => c.id === draft.scannerId));
  const material = materials.find((m) => m.id === draft.materialId);
  const seriesCode = series.find((s) => s.id === draft.seriesId)?.code ?? '';

  const d = deriveExperiment(p);
  const lim = checkLimits({ lambda: p.lambda, tau: p.tau, pAvg: d.pAvgQuelle, ePuls: d.ePulsQuelle, fRep: p.fRep, v: p.v }, laserLimits(laser, p.lambda), scanner);

  // Erwartetes ID-Präfix aus Reihe + Werkstoff
  const prefix = `${sanitizeIdPart(seriesCode)}-${sanitizeIdPart(material?.kurz || 'X')}-`;
  const idMismatch = seriesCode !== '' && !draft.versuchsId.startsWith(prefix);
  const reassignId = () =>
    change((x) => ({
      ...x,
      versuchsId: nextVersuchsId([...taken, draft.versuchsId], seriesCode, material?.kurz || 'X'),
    }));

  // Kopplung E_p ↔ P_avg über f_rep: Hinweis auf den jeweils anderen Wert, Warnung bei Widerspruch
  const both = p.ePuls !== undefined && p.pAvg !== undefined && p.fRep !== undefined;
  const mismatch = both && Math.abs(p.ePuls! * p.fRep! - p.pAvg!) > 0.02 * p.pAvg!;

  // w0 aus Optik + Rohstrahl berechnen
  const w0Calc = focusRadius(p.m2 ?? laser?.m2 ?? 1, p.lambda, optik?.brennweite, laser?.rohstrahlRadius);

  const onLaser = (id: string | undefined) => {
    const l = asLaser(components.find((c) => c.id === id));
    change((x) => ({
      ...x,
      laserId: id,
      params: {
        ...x.params,
        lambda: x.params.lambda ?? laserLambdas(l)[0],
        tau: x.params.tau ?? l?.tauMin,
        m2: x.params.m2 ?? laserM2(l, x.params.lambda ?? laserLambdas(l)[0]),
      },
    }));
  };

  const remove = async () => {
    if (!window.confirm(`Versuch ${draft.versuchsId} löschen?`)) return;
    await experimentsRepo.remove(exp.id);
    navigate(`/logbuch/r/${draft.seriesId}`);
  };

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2 className="exp-title">{draft.versuchsId || 'Versuch'}</h2>
          <SaveBadge status={status} error={error} />
        </div>
        <div className="field">
          <span>Status</span>
          <Segmented<ExperimentStatus>
            label="Status"
            value={draft.status}
            options={(Object.keys(STATUS_LABEL) as ExperimentStatus[]).map((k) => [k, STATUS_LABEL[k]] as const)}
            onChange={(v) => change((x) => ({ ...x, status: v }))}
          />
        </div>
        <div className="two-col">
          <TextField
            label="Versuchs-ID"
            required
            value={draft.versuchsId}
            error={error?.startsWith('Versuchs-ID') ? error : undefined}
            onChange={(v) => change((x) => ({ ...x, versuchsId: (v ?? '').trim() }))}
          />
          <div className="field">
            <label htmlFor="exp-datum">Datum</label>
            <input
              id="exp-datum"
              type="date"
              value={draft.datum}
              onChange={(e) => change((x) => ({ ...x, datum: e.target.value }))}
            />
          </div>
        </div>
        {idMismatch && (
          <p className="field-hint">
            ID passt nicht zu Reihe/Werkstoff ({prefix}…).{' '}
            <button type="button" className="link-btn" onClick={reassignId}>
              ID neu vergeben
            </button>
          </p>
        )}
        <SelectField
          label="Versuchsreihe"
          value={draft.seriesId}
          options={series.map((s) => [s.id, `${s.code} ${s.titel}`.trim()] as const)}
          onChange={(v) => v && change((x) => ({ ...x, seriesId: v }))}
        />
      </section>

      <Section title="Anlage und Probe">
        <SelectField
          label="Anlage"
          empty="– keine –"
          value={draft.systemId}
          options={systems.map((s) => [s.id, s.name] as const)}
          onChange={(v) => change((x) => ({ ...x, systemId: v, laserId: undefined, optikId: undefined, scannerId: undefined }))}
        />
        {draft.systemId && (
          <div className="two-col">
            <SelectField label="Laserquelle" empty="–" value={draft.laserId} options={byType('laserquelle')} onChange={onLaser} />
            <SelectField label="Optik" empty="–" value={draft.optikId} options={byType('optik')} onChange={(v) => change((x) => ({ ...x, optikId: v }))} />
            <SelectField label="Scanner" empty="–" value={draft.scannerId} options={byType('scanner')} onChange={(v) => change((x) => ({ ...x, scannerId: v }))} />
          </div>
        )}
        <div className="two-col">
          <SelectField
            label="Werkstoff"
            empty="– keiner –"
            value={draft.materialId}
            options={materials.map((m) => [m.id, m.kurz ? `${m.name} (${m.kurz})` : m.name] as const)}
            onChange={(v) => change((x) => ({ ...x, materialId: v, sampleId: undefined }))}
          />
          <SelectField
            label="Probe"
            empty={draft.materialId ? (samples.length ? '– keine –' : '– keine Proben angelegt –') : '– erst Werkstoff wählen –'}
            value={draft.sampleId}
            options={samples.map((s) => [s.id, s.bezeichnung] as const)}
            onChange={(v) => change((x) => ({ ...x, sampleId: v }))}
          />
        </div>
      </Section>

      <Section title="Laser">
        {laser && laserLambdas(laser).length > 1 && (
          <div className="chips" role="radiogroup" aria-label="Wellenlänge der Laserquelle">
            {laserLambdas(laser).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={p.lambda === l}
                className={`chip chip-btn${p.lambda === l ? ' active' : ''}`}
                onClick={() => setP({ lambda: l })}
              >
                {formatIn(l, 'wavelength', 'nm')}
              </button>
            ))}
          </div>
        )}
        <div className="two-col">
          {num('lambda', 'Wellenlänge', 'wavelength', 'λ', { warn: lim.lambda })}
          {num('tau', 'Pulsdauer (FWHM)', 'time', 'τ', { warn: lim.tau })}
          {num('pAvg', 'Mittlere Leistung', 'power', 'P_avg', {
            warn: lim.pAvg ?? (mismatch ? 'Passt nicht zu E_p · f_rep' : undefined),
            hint: p.pAvg === undefined && d.pAvgQuelle !== undefined ? `= ${formatSI(d.pAvgQuelle, 'W')} aus E_p · f_rep` : undefined,
          })}
          {num('ePuls', 'Pulsenergie', 'energy', 'E_p', {
            warn: lim.ePuls,
            hint: p.ePuls === undefined && d.ePulsQuelle !== undefined ? `= ${formatSI(d.ePulsQuelle, 'J')} aus P_avg / f_rep` : undefined,
          })}
          {num('fRep', 'Repetitionsrate', 'frequency', 'f_rep', { warn: lim.fRep })}
          {num('transmission', 'Abschwächung (Transmission)', 'fraction', 'T', { hint: 'leer = 100 %' })}
        </div>
        <h3 className="group-title">Burst</h3>
        <div className="two-col">
          <NumberInput
            label="Pulse pro Burst"
            quantity="none"
            value={p.burst?.anzahl}
            onChange={(v) => setP({ burst: { ...p.burst, anzahl: v } })}
          />
          <NumberInput
            label="Intra-Burst-Frequenz"
            quantity="frequency"
            unit={units.burstFreq ?? 'MHz'}
            onUnitChange={(u) => setUnits((s) => ({ ...s, burstFreq: u }))}
            value={p.burst?.freq}
            onChange={(v) => setP({ burst: { ...p.burst, freq: v } })}
          />
        </div>
        <TextField label="Burst-Info" value={p.burst?.info} onChange={(v) => setP({ burst: { ...p.burst, info: v } })} />
        <p className="muted small">Ab 2 Pulsen pro Burst gelten Leistung und Pulsenergie pro Burst; abgeleitete Werte pro Sub-Puls.</p>
      </Section>

      <Section title="Strahl">
        <div className="two-col">
          {num('w0', 'Fokusradius (1/e²)', 'length', 'w₀')}
          <SelectField<W0Quelle>
            label="Quelle w₀"
            empty="–"
            value={p.w0Quelle}
            options={(Object.keys(W0_QUELLE_LABEL) as W0Quelle[]).map((k) => [k, W0_QUELLE_LABEL[k]] as const)}
            onChange={(v) => setP({ w0Quelle: v })}
          />
        </div>
        <div className="row wrap">
          <button
            type="button"
            className="btn btn-small"
            disabled={w0Calc === undefined}
            title={w0Calc === undefined ? 'Braucht λ, Optik mit Brennweite und Laser mit Rohstrahlradius' : undefined}
            onClick={() => setP({ w0: w0Calc, w0Quelle: 'berechnet' })}
          >
            w₀ berechnen{w0Calc !== undefined ? ` (${formatSI(w0Calc, 'm')})` : ''}
          </button>
          <button
            type="button"
            className="btn btn-small"
            disabled={optik?.w0Datenblatt === undefined}
            onClick={() => setP({ w0: optik?.w0Datenblatt, w0Quelle: 'datenblatt' })}
          >
            w₀ laut Datenblatt{optik?.w0Datenblatt !== undefined ? ` (${formatSI(optik.w0Datenblatt, 'm')})` : ''}
          </button>
        </div>
        <div className="two-col mt">
          {num('m2', 'Strahlqualität', 'none', 'M²')}
          {num('fokuslage', 'Fokuslage (+ = über Oberfläche)', 'length', 'z', { allowNegative: true })}
        </div>
      </Section>

      <Section title="Scan">
        <div className="two-col">
          {num('v', 'Scangeschwindigkeit', 'velocity', 'v', { warn: lim.v })}
          {num('pulsabstand', 'Pulsabstand', 'length', 'Δx', {
            hint: p.pulsabstand === undefined && d.dx !== undefined ? `= ${formatSI(d.dx, 'm')} aus v / f_rep` : undefined,
          })}
          {num('hatch', 'Hatch', 'length', 'h')}
          {num('nPulse', 'Pulse pro Ort', 'none', 'N')}
          {num('ueberfahrten', 'Überfahrten', 'none')}
        </div>
        <TextField label="Scanstrategie" value={p.strategie} placeholder="z. B. Linien bidirektional, 90° Kreuz" onChange={(v) => setP({ strategie: v })} />
        <div className="two-col">
          <TextField label="Atmosphäre" value={p.atmosphaere} placeholder="z. B. Luft, N₂" onChange={(v) => setP({ atmosphaere: v })} />
          <TextField label="Absaugung" value={p.absaugung} onChange={(v) => setP({ absaugung: v })} />
        </div>
      </Section>

      <section className="card">
        <h2>Abgeleitete Werte</h2>
        <div className="tiles">
          <ResultTile label={d.nBurst !== undefined ? 'E_burst am Werkstück' : 'E_p am Werkstück'} value={formatSI(d.ePuls, 'J')} tex={FORMULAS.ePuls} />
          <ResultTile label="P_avg am Werkstück" value={formatSI(d.pAvg, 'W')} tex={FORMULAS.pAvg} />
          <ResultTile label={d.nBurst !== undefined ? 'F₀ Burst' : 'Spitzenfluenz F₀'} value={formatIn(d.F0, 'fluence')} tex={FORMULAS.F0} />
          {p.fokuslage ? <ResultTile label="F₀(z) Oberfläche" value={formatIn(d.F0z, 'fluence')} tex={FORMULAS.F0z} /> : null}
          {d.nBurst !== undefined && (
            <>
              <ResultTile label={`E_sub (n = ${d.nBurst})`} value={formatSI(d.ePulsSub, 'J')} tex={FORMULAS.eSub} />
              <ResultTile label="F₀,sub" value={formatIn(d.F0Sub, 'fluence')} tex={FORMULAS.F0Sub} />
              {d.dtSub !== undefined && <ResultTile label="Sub-Puls-Abstand Δt" value={formatSI(d.dtSub, 's')} tex={FORMULAS.dtSub} />}
            </>
          )}
          <ResultTile label={d.nBurst !== undefined ? 'I₀ (Sub-Puls)' : 'Spitzenintensität I₀'} value={formatIn(d.I0, 'intensity')} tex={FORMULAS.I0} />
          <ResultTile label="Rayleighlänge z_R" value={formatSI(d.zR, 'm')} tex={FORMULAS.zR} />
          <ResultTile label="Pulsabstand Δx" value={formatSI(d.dx, 'm')} tex={FORMULAS.dx} />
          <ResultTile label="Pulsüberlapp OL" value={pct(d.OL)} tex={FORMULAS.OL} warn={d.OL !== undefined && d.OL < 0 ? 'Lücke' : undefined} />
          <ResultTile label="N_1D" value={formatNumber(d.N1D)} tex={FORMULAS.N1D} />
          <ResultTile label="N_2D" value={formatNumber(d.N2D)} tex={FORMULAS.N2D} />
          <ResultTile label="Linienüberlapp OL_h" value={pct(d.OLh)} tex={FORMULAS.OLh} />
        </div>
        <p className="muted small mt">
          Wird beim Speichern als Snapshot abgelegt (Formelversion {experimentSnapshot(p).formelVersion}
          {exp.abgeleitet && exp.abgeleitet.formelVersion !== experimentSnapshot(p).formelVersion
            ? `, gespeichert mit ${exp.abgeleitet.formelVersion}`
            : ''}
          ).
        </p>
      </section>

      <section className="card">
        <TextArea label="Bemerkung" rows={4} value={draft.bemerkung} placeholder="Kurz: was beobachtet, Verweis auf Messdateien …" onChange={(v) => change((x) => ({ ...x, bemerkung: v }))} />
        <TagInput value={draft.tags} onChange={(t) => change((x) => ({ ...x, tags: t }))} />
        <p className="muted small">
          Messergebnisse und Rohdaten bleiben außerhalb der App; die Versuchs-ID {draft.versuchsId} dient als Verweis auf
          die Dateien.
        </p>
      </section>

      <section className="card row wrap">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            void experimentsRepo.get(exp.id).then(async (cur) => {
              if (!cur) return;
              const copy = await duplicate({ ...cur, ...draft });
              navigate(`/logbuch/v/${copy.id}`);
            })
          }
        >
          Duplizieren
        </button>
        <button type="button" className="btn" onClick={() => navigate(`/druck/v/${exp.id}`)}>
          Drucken
        </button>
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Versuch löschen
        </button>
        <span className="muted small">
          Angelegt {formatDateDe(exp.createdAt)} · zuletzt geändert {formatDateDe(exp.updatedAt)}
        </span>
      </section>
    </>
  );
}

export function ExperimentDetail() {
  const { experimentId = '' } = useParams();
  const exp = useLiveQuery(() => experimentsRepo.get(experimentId), [experimentId]);
  const series = useLiveQuery(() => (exp ? seriesRepo.get(exp.seriesId) : Promise.resolve(undefined)), [exp?.seriesId]);
  if (exp === undefined) return null;
  if (exp.deleted) return <p className="muted">Dieser Versuch wurde gelöscht.</p>;
  return (
    <div className="stack">
      <BackLink to={`/logbuch/r/${exp.seriesId}`} label={series ? `${series.code} ${series.titel}`.trim() : 'Reihe'} />
      <ExperimentForm key={exp.id} exp={exp} />
      <Mentions refId={exp.versuchsId} />
    </div>
  );
}

