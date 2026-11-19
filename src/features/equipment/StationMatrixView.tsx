import { Link } from 'react-router-dom';
import type { Component } from '../../data/types';
import { STATION_ART_LABEL, STATUS_LABEL } from '../../data/labels';
import { stationMatrix, type ResolvedPath } from '../../data/equipment';
import { formatIn } from '../../core/physics/units';
import { StatusBadge } from './BelegField';

const COLUMN_LABEL: Record<string, string> = { IR: 'IR', VIS: 'VIS', UV: 'UV', '?': 'λ ?' };

function PathEntry({ r }: { r: ResolvedPath }) {
  const lambda = r.lambda !== undefined ? formatIn(r.lambda, 'wavelength', 'nm') : undefined;
  const text = [lambda, r.laser?.name].filter(Boolean).join(' · ') || 'ohne Zuordnung';
  return (
    <li className={`matrix-path status-${r.status}`} title={`${text}: ${STATUS_LABEL[r.status]}${r.path.notiz ? ` – ${r.path.notiz}` : ''}`}>
      <StatusBadge status={r.status} compact />
      <span className="matrix-path-text">
        <span className="matrix-lambda">{lambda ?? 'λ ?'}</span>
        {r.laser && <span className="muted small matrix-laser">{r.laser.name}</span>}
      </span>
    </li>
  );
}

/** Übersicht je Anlage: Stationen (Zeilen) × Spektralbereich (Spalten), Zelle = Strahlengänge mit Status. */
export function StationMatrixView({ systemId, components }: { systemId: string; components: Component[] }) {
  const m = stationMatrix(components);
  if (m.rows.length === 0)
    return <p className="muted small">Noch keine Bearbeitungsstation. Lege Stationen an (Typ „Bearbeitungsstation“), um die Übersicht zu füllen.</p>;
  return (
    <>
      <div className="table-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col">Station</th>
              {m.columns.map((c) => (
                <th key={c} scope="col">
                  {COLUMN_LABEL[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rows.map((row) => (
              <tr key={row.station.id}>
                <th scope="row">
                  <Link to={`/anlagen/${systemId}/k/${row.station.id}`} className="matrix-station">
                    <StatusBadge status={row.status} compact />
                    <span className="matrix-station-name">
                      {row.station.name}
                      {row.station.params.art && <span className="muted small">{STATION_ART_LABEL[row.station.params.art]}</span>}
                    </span>
                  </Link>
                </th>
                {m.columns.map((c) => (
                  <td key={c}>
                    {row.cells[c].length === 0 ? (
                      <span className="muted" aria-label="kein Strahlengang">
                        –
                      </span>
                    ) : (
                      <ul className="matrix-cell">
                        {row.cells[c].map((r) => (
                          <PathEntry key={r.path.id} r={r} />
                        ))}
                      </ul>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small matrix-legend">
        ✓ betriebsbereit · ⚙ Justage nötig · ✕ nicht aufgebaut · ? unbekannt. Spalten nach Wellenlänge: UV &lt; 400 nm ≤ VIS &lt;
        780 nm ≤ IR.
      </p>
    </>
  );
}
