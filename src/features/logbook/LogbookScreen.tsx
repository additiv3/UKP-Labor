import { Link, Route, Routes, useMatch, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo, seriesRepo } from '../../data/repos';
import { EmptyState } from '../../components/EmptyState';
import { MasterDetail } from '../../components/MasterDetail';
import { SERIES_STATUS_LABEL } from './labels';
import { nextSeriesCode } from './actions';
import { SeriesDetail } from './SeriesDetail';
import { ExperimentDetail } from './ExperimentDetail';
import { AllExperiments } from './AllExperiments';
import { MatrixScreen } from './MatrixScreen';

function SeriesList() {
  const series = useLiveQuery(() => seriesRepo.listSorted(), []);
  const counts = useLiveQuery(async () => {
    const m = new Map<string, number>();
    for (const e of await experimentsRepo.list()) m.set(e.seriesId, (m.get(e.seriesId) ?? 0) + 1);
    return m;
  }, []);
  const navigate = useNavigate();
  const active = useMatch('/logbuch/r/:seriesId')?.params.seriesId;
  const allActive = useMatch('/logbuch/alle') !== null;

  const add = async () => {
    const s = await seriesRepo.create({ code: await nextSeriesCode(), titel: '', status: 'laufend' });
    navigate(`/logbuch/r/${s.id}`);
  };

  if (!series) return null;
  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn-primary grow" onClick={() => void add()}>
          + Versuchsreihe
        </button>
        <Link to="/logbuch/alle" className={`btn${allActive ? ' btn-active' : ''}`}>
          Alle Versuche
        </Link>
      </div>
      {series.length === 0 ? (
        <EmptyState title="Noch keine Versuchsreihen">
          <p>Lege eine Reihe an, z. B. „B1 Schwelle Si“. Darin entstehen die Versuche mit fortlaufender ID (B1-Si-001 …).</p>
          <p className="muted small">Tipp: Anlagen und Werkstoffe vorher anlegen, dann sind sie im Versuch auswählbar.</p>
        </EmptyState>
      ) : (
        <ul className="list">
          {series.map((s) => (
            <li key={s.id}>
              <Link to={`/logbuch/r/${s.id}`} className={`list-item list-link${active === s.id ? ' selected' : ''}`}>
                <div className="list-main">
                  <span className="list-title">
                    {s.code} {s.titel}
                  </span>
                  <span className="muted small">
                    {SERIES_STATUS_LABEL[s.status]} · {counts?.get(s.id) ?? 0} Versuche
                  </span>
                </div>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LogbookScreen() {
  const showDetail = useMatch('/logbuch/:kind/*') !== null;
  return (
    <MasterDetail
      showDetail={showDetail}
      list={<SeriesList />}
      detail={
        <Routes>
          <Route index element={<p className="muted md-placeholder">Versuchsreihe auswählen oder anlegen.</p>} />
          <Route path="r/:seriesId" element={<SeriesDetail />} />
          <Route path="r/:seriesId/matrix" element={<MatrixScreen />} />
          <Route path="v/:experimentId" element={<ExperimentDetail />} />
          <Route path="alle" element={<AllExperiments />} />
        </Routes>
      }
    />
  );
}
