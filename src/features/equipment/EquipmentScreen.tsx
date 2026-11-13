import { Link, Route, Routes, useMatch, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { systemsRepo } from '../../data/repos';
import { EmptyState } from '../../components/EmptyState';
import { MasterDetail } from '../../components/MasterDetail';
import { SystemDetail } from './SystemDetail';
import { ComponentDetail } from './ComponentDetail';

function SystemList() {
  const systems = useLiveQuery(() => systemsRepo.listSorted(), []);
  const navigate = useNavigate();
  const active = useMatch('/anlagen/:systemId/*')?.params.systemId;

  const add = async () => {
    const s = await systemsRepo.create({ name: 'Neue Anlage' });
    navigate(`/anlagen/${s.id}`);
  };

  if (!systems) return null;
  return (
    <div className="stack">
      <button type="button" className="btn btn-primary" onClick={() => void add()}>
        + Anlage
      </button>
      {systems.length === 0 ? (
        <EmptyState title="Noch keine Anlagen">
          <p>Lege zuerst eine Anlage an und ergänze dann Laserquelle, Optik und Scanner.</p>
          <p className="muted small">Sie dienen als Vorlagen für Rechner und Logbuch.</p>
        </EmptyState>
      ) : (
        <ul className="list">
          {systems.map((s) => (
            <li key={s.id}>
              <Link to={`/anlagen/${s.id}`} className={`list-item list-link${active === s.id ? ' selected' : ''}`}>
                <div className="list-main">
                  <span className="list-title">{s.name}</span>
                  {s.standort && <span className="muted small">{s.standort}</span>}
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

export function EquipmentScreen() {
  const showDetail = useMatch('/anlagen/:systemId/*') !== null;
  return (
    <MasterDetail
      showDetail={showDetail}
      list={<SystemList />}
      detail={
        <Routes>
          <Route index element={<p className="muted md-placeholder">Anlage auswählen oder anlegen.</p>} />
          <Route path=":systemId" element={<SystemDetail />} />
          <Route path=":systemId/k/:componentId" element={<ComponentDetail />} />
        </Routes>
      }
    />
  );
}
