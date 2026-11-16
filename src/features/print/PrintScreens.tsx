import { useEffect, type ReactNode } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { componentsRepo, experimentsRepo, materialsRepo, samplesRepo, seriesRepo, systemsRepo } from '../../data/repos';
import type { Experiment } from '../../data/types';
import { compareByVersuchsId, formatDateDe } from '../../core/logbook';
import { formatIn, formatNumber, formatSI } from '../../core/physics/units';
import { SERIES_STATUS_LABEL, STATUS_LABEL } from '../logbook/labels';
import { derivedRows, paramRows, type Row } from './printRows';

/** Druckseite: helles Papierlayout, Werkzeugleiste nur am Bildschirm. */
function PrintPage({ title, back, className, children }: { title: string; back: string; className?: string; children: ReactNode }) {
  const navigate = useNavigate();
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
  return (
    <div className="print-page">
      <div className="print-toolbar">
        <button type="button" className="btn" onClick={() => navigate(back)}>
          ← Zurück
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Drucken / PDF
        </button>
      </div>
      <article className={`paper${className ? ` ${className}` : ''}`}>
        {children}
        <footer className="paper-foot">
          UKP-Labor {__APP_VERSION__} · gedruckt am {formatDateDe(new Date().toISOString())}
        </footer>
      </article>
    </div>
  );
}

function RowTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="paper-muted">–</p>;
  return (
    <table className="paper-kv">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th>{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NotFound({ what }: { what: string }) {
  return (
    <div className="print-page">
      <p>
        {what} nicht gefunden. <Link to="/logbuch">Zum Logbuch</Link>
      </p>
    </div>
  );
}

function PrintExperiment() {
  const { experimentId = '' } = useParams();
  const data = useLiveQuery(async () => {
    const e = await experimentsRepo.get(experimentId);
    if (!e) return { e };
    const [series, system, laser, optik, scanner, material, sample] = await Promise.all([
      seriesRepo.get(e.seriesId),
      e.systemId ? systemsRepo.get(e.systemId) : undefined,
      e.laserId ? componentsRepo.get(e.laserId) : undefined,
      e.optikId ? componentsRepo.get(e.optikId) : undefined,
      e.scannerId ? componentsRepo.get(e.scannerId) : undefined,
      e.materialId ? materialsRepo.get(e.materialId) : undefined,
      e.sampleId ? samplesRepo.get(e.sampleId) : undefined,
    ]);
    return { e, series, system, laser, optik, scanner, material, sample };
  }, [experimentId]);
  if (!data) return null;
  const { e } = data;
  if (!e || e.deleted) return <NotFound what="Versuch" />;

  const head: Row[] = (
    [
      ['Reihe', data.series ? `${data.series.code} ${data.series.titel}`.trim() : undefined],
      ['Datum', formatDateDe(e.datum)],
      ['Status', STATUS_LABEL[e.status]],
      ['Anlage', data.system?.name],
      ['Laser', data.laser?.name],
      ['Optik', data.optik?.name],
      ['Scanner', data.scanner?.name],
      ['Werkstoff', data.material ? `${data.material.name} (${data.material.kurz})` : undefined],
      ['Probe', data.sample?.bezeichnung],
      ['Tags', e.tags.length ? e.tags.join(', ') : undefined],
    ] as [string, string | undefined][]
  ).filter((r): r is Row => r[1] !== undefined && r[1] !== '');
  const der = derivedRows(e);

  return (
    <PrintPage title={`Versuch ${e.versuchsId}`} back={`/logbuch/v/${e.id}`}>
      <header className="paper-head">
        <span className="paper-muted">UKP-Labor · Versuch</span>
        <h1>{e.versuchsId}</h1>
      </header>
      <RowTable rows={head} />
      <h2>Eingestellte Parameter</h2>
      <RowTable rows={paramRows(e.params)} />
      <h2>Abgeleitete Werte</h2>
      <RowTable rows={der.rows} />
      <p className="paper-muted">
        Formelversion {der.formelVersion}
        {der.gespeichert ? ' (Snapshot beim Speichern)' : ' (neu berechnet)'}
      </p>
      <h2>Bemerkung</h2>
      <p className="paper-text">{e.bemerkung?.trim() || '–'}</p>
    </PrintPage>
  );
}

/** Kernparameter einer Zeile der Reihentabelle. */
function seriesCells(e: Experiment): string[] {
  const p = e.params;
  const w = e.abgeleitet?.werte;
  const f0 = w?.F0z ?? w?.F0;
  return [
    p.lambda !== undefined ? formatIn(p.lambda, 'wavelength', undefined, 4) : '',
    p.tau !== undefined ? formatSI(p.tau, 's', 3) : '',
    p.ePuls !== undefined ? formatSI(p.ePuls, 'J', 3) : p.pAvg !== undefined ? formatSI(p.pAvg, 'W', 3) : '',
    p.fRep !== undefined ? formatSI(p.fRep, 'Hz', 3) : '',
    p.burst?.anzahl !== undefined && p.burst.anzahl >= 2 ? formatNumber(p.burst.anzahl) : '',
    p.v !== undefined ? formatIn(p.v, 'velocity', undefined, 3) : '',
    p.hatch !== undefined ? formatSI(p.hatch, 'm', 3) : '',
    p.nPulse !== undefined ? formatNumber(p.nPulse) : '',
    f0 !== undefined ? formatIn(f0, 'fluence', 'J/cm²', 3) : '',
  ];
}

const SERIES_COLS = ['λ', 'τ', 'E_p / P', 'f_rep', 'n Burst', 'v', 'h', 'N', 'F₀'];

function PrintSeries() {
  const { seriesId = '' } = useParams();
  const data = useLiveQuery(async () => {
    const s = await seriesRepo.get(seriesId);
    const exps = s ? (await experimentsRepo.bySeries(seriesId)).sort(compareByVersuchsId) : [];
    const mats = new Map((await materialsRepo.list()).map((m) => [m.id, m]));
    return { s, exps, mats };
  }, [seriesId]);
  if (!data) return null;
  const { s, exps, mats } = data;
  if (!s || s.deleted) return <NotFound what="Versuchsreihe" />;

  return (
    <PrintPage title={`Reihe ${s.code}`} back={`/logbuch/r/${s.id}`} className="paper-series">
      <header className="paper-head">
        <span className="paper-muted">UKP-Labor · Versuchsreihe</span>
        <h1>
          {s.code} {s.titel}
        </h1>
      </header>
      <RowTable
        rows={(
          [
            ['Status', SERIES_STATUS_LABEL[s.status]],
            ['Versuche', String(exps.length)],
            ['Ziel', s.ziel],
            ['Notizen', s.notizen],
          ] as [string, string | undefined][]
        ).filter((r): r is Row => r[1] !== undefined && r[1].trim() !== '')}
      />
      {exps.length === 0 ? (
        <p className="paper-muted">Noch keine Versuche.</p>
      ) : (
        <table className="paper-table">
          <thead>
            <tr>
              <th>Versuchs-ID</th>
              <th>Datum</th>
              <th>Status</th>
              <th>Werkstoff</th>
              {SERIES_COLS.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th>Bemerkung</th>
            </tr>
          </thead>
          <tbody>
            {exps.map((e) => (
              <tr key={e.id}>
                <th>{e.versuchsId}</th>
                <td>{formatDateDe(e.datum)}</td>
                <td>{STATUS_LABEL[e.status]}</td>
                <td>{e.materialId ? (mats.get(e.materialId)?.kurz ?? '') : ''}</td>
                {seriesCells(e).map((c, i) => (
                  <td key={i} className="num">
                    {c}
                  </td>
                ))}
                <td className="paper-note">{e.bemerkung ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="paper-muted">F₀ = Spitzenfluenz auf der Oberfläche aus dem gespeicherten Snapshot. E_p bzw. P wie eingegeben (bei Burst pro Burst).</p>
    </PrintPage>
  );
}

export function PrintRoot() {
  return (
    <Routes>
      <Route path="v/:experimentId" element={<PrintExperiment />} />
      <Route path="r/:seriesId" element={<PrintSeries />} />
      <Route path="*" element={<NotFound what="Seite" />} />
    </Routes>
  );
}
