import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { componentsRepo, removeSystemCascade, systemsRepo } from '../../data/repos';
import { getSetting, setSetting } from '../../data/repos/settings';
import { COMPONENT_TYPES, type ComponentType, type System } from '../../data/types';
import { COMPONENT_TYPE_LABEL } from '../../data/labels';
import { TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { componentSummary, newComponent } from './componentMeta';
import { StationMatrixView } from './StationMatrixView';
import { StatusBadge } from './BelegField';

function SystemForm({ system }: { system: System }) {
  const { draft, change, status, error } = useAutosave(
    system,
    (d) => systemsRepo.update(d.id, { name: d.name, standort: d.standort, beschreibung: d.beschreibung, notizen: d.notizen }),
    (d) => (d.name.trim() === '' ? 'Name fehlt' : undefined),
  );
  return (
    <section className="card">
      <div className="card-head">
        <h2>Anlage</h2>
        <SaveBadge status={status} error={error} />
      </div>
      <TextField label="Name" required value={draft.name} error={error} onChange={(v) => change((d) => ({ ...d, name: v ?? '' }))} />
      <TextField label="Standort" value={draft.standort} onChange={(v) => change((d) => ({ ...d, standort: v }))} />
      <TextArea label="Beschreibung" value={draft.beschreibung} onChange={(v) => change((d) => ({ ...d, beschreibung: v }))} />
      <TextArea label="Notizen" value={draft.notizen} onChange={(v) => change((d) => ({ ...d, notizen: v }))} />
    </section>
  );
}

export function SystemDetail() {
  const { systemId = '' } = useParams();
  const navigate = useNavigate();
  const system = useLiveQuery(() => systemsRepo.get(systemId), [systemId]);
  const components = useLiveQuery(() => componentsRepo.bySystem(systemId), [systemId]);
  const defaultSystemId = useLiveQuery(() => getSetting('defaultSystemId'), []);
  const [newType, setNewType] = useState<ComponentType>('laserquelle');

  if (system === undefined || components === undefined) return null;
  if (system.deleted) return <p className="muted">Diese Anlage wurde gelöscht.</p>;

  const add = async () => {
    const c = await componentsRepo.create(newComponent(systemId, newType));
    navigate(`/anlagen/${systemId}/k/${c.id}`);
  };

  const remove = async () => {
    if (!window.confirm(`Anlage „${system.name}“ mit allen Komponenten löschen?`)) return;
    await removeSystemCascade(systemId);
    if (defaultSystemId === systemId) await setSetting('defaultSystemId', undefined);
    navigate('/anlagen');
  };

  const grouped = COMPONENT_TYPES.map((t) => [t, components.filter((c) => c.typ === t)] as const).filter(([, cs]) => cs.length > 0);

  return (
    <div className="stack">
      <BackLink to="/anlagen" label="Anlagen" />
      <SystemForm key={system.id} system={system} />

      <section className="card">
        <h2>Übersicht Stationen × Wellenlängen</h2>
        <StationMatrixView systemId={systemId} components={components} />
      </section>

      <section className="card">
        <h2>Komponenten</h2>
        {grouped.length === 0 && <p className="muted">Noch keine Komponenten. Beginne mit der Laserquelle.</p>}
        {grouped.map(([typ, cs]) => (
          <div key={typ} className="group">
            <h3 className="group-title">{COMPONENT_TYPE_LABEL[typ]}</h3>
            <ul className="list">
              {cs.map((c) => (
                <li key={c.id}>
                  <Link to={`/anlagen/${systemId}/k/${c.id}`} className="list-item list-link">
                    <div className="list-main">
                      <span className="list-title">
                        {c.name} <StatusBadge status={c.status ?? 'unbekannt'} compact />
                      </span>
                      <span className="muted small">{componentSummary(c) || [c.hersteller, c.modell].filter(Boolean).join(' ')}</span>
                    </div>
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="row">
          <select aria-label="Komponententyp" value={newType} onChange={(e) => setNewType(e.target.value as ComponentType)}>
            {COMPONENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {COMPONENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => void add()}>
            + Komponente
          </button>
        </div>
      </section>

      <section className="card row wrap">
        <button
          type="button"
          className="btn"
          disabled={defaultSystemId === systemId}
          onClick={() => void setSetting('defaultSystemId', systemId)}
        >
          {defaultSystemId === systemId ? 'Standard-Anlage ✓' : 'Als Standard-Anlage setzen'}
        </button>
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Anlage löschen
        </button>
      </section>
    </div>
  );
}
