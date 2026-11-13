import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo, removeSeriesCascade, seriesRepo } from '../../data/repos';
import type { Series, SeriesStatus } from '../../data/types';
import { compareByVersuchsId } from '../../core/logbook';
import { TextArea, TextField } from '../../components/fields';
import { Segmented } from '../../components/Segmented';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { ExperimentList } from './ExperimentList';
import { SERIES_STATUS_LABEL } from './labels';
import { createEmptyExperiment, duplicate } from './actions';
import { useLookups } from './useLookups';

function SeriesForm({ series, codeTaken }: { series: Series; codeTaken: (code: string) => boolean }) {
  const { draft, change, status, error } = useAutosave(
    series,
    (d) => seriesRepo.update(d.id, { code: d.code, titel: d.titel, ziel: d.ziel, status: d.status, notizen: d.notizen }),
    (d) =>
      d.code.trim() === ''
        ? 'Code fehlt'
        : /[\s-]/.test(d.code)
          ? 'Code ohne Leerzeichen und Bindestrich'
          : codeTaken(d.code)
            ? `Code „${d.code}“ ist schon vergeben`
            : undefined,
  );
  return (
    <section className="card">
      <div className="card-head">
        <h2>Versuchsreihe</h2>
        <SaveBadge status={status} error={error} />
      </div>
      <div className="two-col">
        <TextField
          label="Code (Teil der Versuchs-ID)"
          required
          value={draft.code}
          error={error?.startsWith('Code') ? error : undefined}
          onChange={(v) => change((d) => ({ ...d, code: (v ?? '').trim() }))}
        />
        <TextField label="Titel" value={draft.titel} placeholder="z. B. Schwelle Si" onChange={(v) => change((d) => ({ ...d, titel: v ?? '' }))} />
      </div>
      <div className="field">
        <span>Status</span>
        <Segmented<SeriesStatus>
          label="Status der Reihe"
          value={draft.status}
          options={(Object.keys(SERIES_STATUS_LABEL) as SeriesStatus[]).map((k) => [k, SERIES_STATUS_LABEL[k]] as const)}
          onChange={(v) => change((d) => ({ ...d, status: v }))}
        />
      </div>
      <TextArea label="Ziel" value={draft.ziel} onChange={(v) => change((d) => ({ ...d, ziel: v }))} />
      <TextArea label="Notizen" value={draft.notizen} onChange={(v) => change((d) => ({ ...d, notizen: v }))} />
      <p className="muted small">Ein geänderter Code gilt für neue Versuche; bestehende Versuchs-IDs bleiben unverändert.</p>
    </section>
  );
}

export function SeriesDetail() {
  const { seriesId = '' } = useParams();
  const navigate = useNavigate();
  const series = useLiveQuery(() => seriesRepo.get(seriesId), [seriesId]);
  const others = useLiveQuery(async () => (await seriesRepo.listSorted()).filter((s) => s.id !== seriesId), [seriesId]);
  const experiments = useLiveQuery(() => experimentsRepo.bySeries(seriesId), [seriesId]);
  const lookups = useLookups();

  if (series === undefined || experiments === undefined || others === undefined || !lookups) return null;
  if (series.deleted) return <p className="muted">Diese Reihe wurde gelöscht.</p>;

  const sorted = [...experiments].sort(compareByVersuchsId);
  const last = [...experiments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const addEmpty = async () => navigate(`/logbuch/v/${(await createEmptyExperiment(seriesId)).id}`);
  const addDup = async () => last && navigate(`/logbuch/v/${(await duplicate(last)).id}`);
  const remove = async () => {
    if (!window.confirm(`Reihe „${series.code}“ mit ${experiments.length} Versuchen löschen?`)) return;
    await removeSeriesCascade(seriesId);
    navigate('/logbuch');
  };

  return (
    <div className="stack">
      <BackLink to="/logbuch" label="Versuchsreihen" />

      <section className="card">
        <div className="card-head">
          <h2>
            {series.code} {series.titel} · {experiments.length} Versuche
          </h2>
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-primary" onClick={() => void addEmpty()}>
            + Versuch
          </button>
          <button type="button" className="btn" disabled={!last} onClick={() => void addDup()}>
            {last ? `Duplizieren aus ${last.versuchsId}` : 'Duplizieren (noch kein Versuch)'}
          </button>
        </div>
        {sorted.length > 0 ? (
          <div className="mt">
            <ExperimentList experiments={sorted} materials={lookups.materials} />
          </div>
        ) : (
          <p className="muted mt">Noch keine Versuche in dieser Reihe.</p>
        )}
      </section>

      <SeriesForm key={series.id} series={series} codeTaken={(c) => others.some((o) => o.code === c)} />

      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Reihe löschen
        </button>
      </section>
    </div>
  );
}
