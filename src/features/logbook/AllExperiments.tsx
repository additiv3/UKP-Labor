import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo } from '../../data/repos';
import type { ExperimentStatus } from '../../data/types';
import { compareExperiments, matchesFilter, type ExperimentFilter } from '../../core/logbook';
import { BackLink } from '../../components/MasterDetail';
import { ExperimentList } from './ExperimentList';
import { STATUS_LABEL } from './labels';
import { useLookups } from './useLookups';

// Filter bleibt beim Tab-Wechsel innerhalb der Sitzung erhalten
let lastFilter: ExperimentFilter = {};

export function AllExperiments() {
  const all = useLiveQuery(() => experimentsRepo.list(), []);
  const lookups = useLookups();
  const [f, setF] = useState<ExperimentFilter>(lastFilter);
  const [open, setOpen] = useState(Object.keys(lastFilter).some((k) => k !== 'text' && lastFilter[k as keyof ExperimentFilter]));
  const set = (patch: Partial<ExperimentFilter>) =>
    setF((cur) => {
      const next = { ...cur, ...patch };
      lastFilter = next;
      return next;
    });

  if (!all || !lookups) return null;
  const tags = [...new Set(all.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b, 'de'));
  const shown = all.filter((e) => matchesFilter(e, f)).sort(compareExperiments);
  const active = Object.values(f).filter(Boolean).length;

  const sel = (label: string, key: keyof ExperimentFilter, options: [string, string][]) => (
    <div className="field">
      <label htmlFor={`f-${key}`}>{label}</label>
      <select id={`f-${key}`} value={f[key] ?? ''} onChange={(e) => set({ [key]: e.target.value || undefined })}>
        <option value="">alle</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="stack">
      <BackLink to="/logbuch" label="Versuchsreihen" />
      <section className="card">
        <div className="row">
          <input
            type="search"
            className="grow"
            placeholder="Suche: ID, Bemerkung, Tags, Strategie …"
            aria-label="Versuche durchsuchen"
            value={f.text ?? ''}
            onChange={(e) => set({ text: e.target.value || undefined })}
          />
          <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            Filter{active > (f.text ? 1 : 0) ? ` (${active - (f.text ? 1 : 0)})` : ''}
          </button>
        </div>
        {open && (
          <div className="mt">
            <div className="two-col">
              {sel('Reihe', 'seriesId', [...lookups.series.values()].map((s) => [s.id, `${s.code} ${s.titel}`.trim()]))}
              {sel('Werkstoff', 'materialId', [...lookups.materials.values()].map((m) => [m.id, m.name]))}
              {sel('Anlage', 'systemId', [...lookups.systems.values()].map((s) => [s.id, s.name]))}
              {sel('Tag', 'tag', tags.map((t) => [t, t]))}
              {sel('Status', 'status', (Object.keys(STATUS_LABEL) as ExperimentStatus[]).map((k) => [k, STATUS_LABEL[k]]))}
              <div className="field">
                <label htmlFor="f-von">Von</label>
                <input id="f-von" type="date" value={f.von ?? ''} onChange={(e) => set({ von: e.target.value || undefined })} />
              </div>
              <div className="field">
                <label htmlFor="f-bis">Bis</label>
                <input id="f-bis" type="date" value={f.bis ?? ''} onChange={(e) => set({ bis: e.target.value || undefined })} />
              </div>
            </div>
            <button type="button" className="btn btn-small" onClick={() => set({ seriesId: undefined, materialId: undefined, systemId: undefined, tag: undefined, status: undefined, von: undefined, bis: undefined, text: undefined })}>
              Filter zurücksetzen
            </button>
          </div>
        )}
      </section>
      <p className="muted small">
        {shown.length} von {all.length} Versuchen
      </p>
      {shown.length > 0 && <ExperimentList experiments={shown} materials={lookups.materials} />}
    </div>
  );
}
