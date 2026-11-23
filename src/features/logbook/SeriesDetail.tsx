import { Link, useNavigate, useParams } from 'react-router-dom';
import { getSetting } from '../../data/repos/settings';
import { derive } from '../../core/physics/derive';
import { calcDeriveInput, normalizeCalcState } from '../calculator/state';
import { calcToExperiment } from '../calculator/toExperiment';
import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo, removeSeriesCascade, seriesRepo, versuchsartenRepo } from '../../data/repos';
import type { Series, SeriesStatus, Versuchsart } from '../../data/types';
import { compareByVersuchsId } from '../../core/logbook';
import { SelectField, TextArea, TextField } from '../../components/fields';
import { Segmented } from '../../components/Segmented';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { ExperimentList } from './ExperimentList';
import { SERIES_STATUS_LABEL, artLabel } from './labels';
import { createEmptyExperiment, createFromTransfer, defaultArtId, duplicate } from './actions';
import { useArtAbfrage } from './useArtAbfrage';
import { useLookups } from './useLookups';
import { Mentions } from '../notes/Mentions';

function SeriesForm({ series, arten, codeTaken }: { series: Series; arten: Versuchsart[]; codeTaken: (code: string) => boolean }) {
  const { draft, change, status, error } = useAutosave(
    series,
    (d) =>
      seriesRepo.update(d.id, {
        code: d.code,
        titel: d.titel,
        ziel: d.ziel,
        status: d.status,
        notizen: d.notizen,
        standardVersuchsartId: d.standardVersuchsartId,
      }),
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
      <SelectField
        label="Standard-Versuchsart"
        empty="– keine (bei jedem neuen Versuch fragen) –"
        value={draft.standardVersuchsartId}
        options={arten.map((a) => [a.id, artLabel(a)] as const)}
        hint="Gilt für neue Versuche dieser Reihe (Teil der Versuchs-ID)."
        onChange={(v) => change((d) => ({ ...d, standardVersuchsartId: v }))}
      />
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
  const arten = useLiveQuery(() => versuchsartenRepo.listSorted(), []);
  const lookups = useLookups();
  const abfrage = useArtAbfrage();

  if (series === undefined || experiments === undefined || others === undefined || !arten || !lookups) return null;
  if (series.deleted) return <p className="muted">Diese Reihe wurde gelöscht.</p>;

  const sorted = [...experiments].sort(compareByVersuchsId);
  const last = [...experiments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  /** Mit der Standard-Art der Reihe anlegen, sonst vorher nach der Art fragen. */
  const withArt = async (title: string, run: (artId: string) => Promise<void>, preferred?: string) => {
    const art = await defaultArtId(seriesId, preferred);
    if (art) await run(art);
    else abfrage.ask(title, run);
  };
  const addEmpty = () =>
    withArt('Versuchsart für den neuen Versuch', async (art) => navigate(`/logbuch/v/${(await createEmptyExperiment(seriesId, art)).id}`));
  const addDup = async () => {
    if (!last) return;
    if (last.versuchsartId) navigate(`/logbuch/v/${(await duplicate(last)).id}`);
    else abfrage.ask(`${last.versuchsId} hat keine Versuchsart – Art für die Kopie`, async (art) => navigate(`/logbuch/v/${(await duplicate(last, art)).id}`));
  };
  const addFromCalc = () =>
    withArt('Versuchsart für den Versuch aus dem Rechner', async (art) => {
      const st = normalizeCalcState(await getSetting('calculator'));
      const d = derive(calcDeriveInput(st));
      const e = await createFromTransfer(seriesId, calcToExperiment(st, d), art);
      navigate(`/logbuch/v/${e.id}`);
    });
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
          <button type="button" className="btn" onClick={() => void addFromCalc()}>
            Aus Rechner
          </button>
          <Link to={`/logbuch/r/${seriesId}/matrix`} className="btn">
            Matrix erzeugen …
          </Link>
          <Link to={`/druck/r/${seriesId}`} className="btn">
            Drucken
          </Link>
        </div>
        {abfrage.element && <div className="mt">{abfrage.element}</div>}
        {sorted.length > 0 ? (
          <div className="mt">
            <ExperimentList experiments={sorted} materials={lookups.materials} />
          </div>
        ) : (
          <p className="muted mt">Noch keine Versuche in dieser Reihe.</p>
        )}
      </section>

      <Mentions refId={series.code} />
      <SeriesForm key={series.id} series={series} arten={arten} codeTaken={(c) => others.some((o) => o.code === c)} />

      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Reihe löschen
        </button>
      </section>
    </div>
  );
}
