import { useState } from 'react';
import { Link, Route, Routes, useMatch, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { materialsRepo } from '../../data/repos';
import { MATERIAL_CLASSES, type MaterialClass } from '../../data/types';
import { MATERIAL_CLASS_LABEL } from '../../data/labels';
import { MasterDetail } from '../../components/MasterDetail';
import { MaterialDetail } from './MaterialDetail';
import { LitValueDetail } from './LitValueDetail';
import { SampleDetail } from './SampleDetail';

function MaterialList() {
  const materials = useLiveQuery(() => materialsRepo.listSorted(), []);
  const [q, setQ] = useState('');
  const [klasse, setKlasse] = useState<MaterialClass | ''>('');
  const navigate = useNavigate();
  const active = useMatch('/material/:materialId/*')?.params.materialId;

  const add = async () => {
    const m = await materialsRepo.create({ name: q.trim() || 'Neuer Werkstoff', kurz: '', klasse: klasse || 'halbleiter' });
    navigate(`/material/${m.id}`);
  };

  if (!materials) return null;
  const needle = q.trim().toLowerCase();
  const shown = materials.filter(
    (m) =>
      (klasse === '' || m.klasse === klasse) &&
      (needle === '' || m.name.toLowerCase().includes(needle) || m.kurz.toLowerCase().includes(needle)),
  );

  return (
    <div className="stack">
      <div className="row">
        <input
          type="search"
          className="grow"
          placeholder="Suchen …"
          aria-label="Werkstoffe durchsuchen"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={() => void add()}>
          + Werkstoff
        </button>
      </div>
      <div className="chips" role="radiogroup" aria-label="Klasse">
        {(['', ...MATERIAL_CLASSES] as const).map((k) => (
          <button
            key={k || 'alle'}
            type="button"
            role="radio"
            aria-checked={klasse === k}
            className={`chip chip-btn${klasse === k ? ' active' : ''}`}
            onClick={() => setKlasse(k)}
          >
            {k === '' ? 'Alle' : MATERIAL_CLASS_LABEL[k]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="muted">Kein Werkstoff gefunden.</p>
      ) : (
        <ul className="list">
          {shown.map((m) => (
            <li key={m.id}>
              <Link to={`/material/${m.id}`} className={`list-item list-link${active === m.id ? ' selected' : ''}`}>
                <div className="list-main">
                  <span className="list-title">{m.name}</span>
                  <span className="muted small">{MATERIAL_CLASS_LABEL[m.klasse]}</span>
                </div>
                {m.kurz && <span className="chip">{m.kurz}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MaterialsScreen() {
  const showDetail = useMatch('/material/:materialId/*') !== null;
  return (
    <MasterDetail
      showDetail={showDetail}
      list={<MaterialList />}
      detail={
        <Routes>
          <Route index element={<p className="muted md-placeholder">Werkstoff auswählen oder anlegen.</p>} />
          <Route path=":materialId" element={<MaterialDetail />} />
          <Route path=":materialId/literatur/:litId" element={<LitValueDetail />} />
          <Route path=":materialId/proben/:sampleId" element={<SampleDetail />} />
        </Routes>
      }
    />
  );
}
