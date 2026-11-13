import { Link } from 'react-router-dom';
import type { Experiment, Material } from '../../data/types';
import { formatDateDe } from '../../core/logbook';
import { formatIn, formatNumber, formatSI } from '../../core/physics/units';
import { STATUS_LABEL } from './labels';

/** Kernparameter kurz: „50 µJ · 200 kHz · 1 m/s · N 100“ */
function keyParams(e: Experiment): string {
  const p = e.params;
  return [
    p.ePuls !== undefined ? formatSI(p.ePuls, 'J', 3) : p.pAvg !== undefined ? formatSI(p.pAvg, 'W', 3) : undefined,
    p.fRep !== undefined ? formatSI(p.fRep, 'Hz', 3) : undefined,
    p.v !== undefined ? formatSI(p.v, 'm/s', 3) : undefined,
    p.nPulse !== undefined ? `N ${formatNumber(p.nPulse)}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function ExperimentList({ experiments, materials }: { experiments: Experiment[]; materials: Map<string, Material> }) {
  return (
    <ul className="list">
      {experiments.map((e) => {
        const f0 = e.abgeleitet?.werte.F0z ?? e.abgeleitet?.werte.F0;
        const mat = e.materialId ? materials.get(e.materialId) : undefined;
        return (
          <li key={e.id}>
            <Link to={`/logbuch/v/${e.id}`} className={`list-item list-link exp-row status-${e.status}`}>
              <div className="list-main">
                <span className="list-title">
                  {e.versuchsId}
                  {e.status !== 'durchgefuehrt' && <span className="chip chip-status">{STATUS_LABEL[e.status]}</span>}
                </span>
                <span className="muted small">
                  {formatDateDe(e.datum)}
                  {mat ? ` · ${mat.name}` : ''}
                  {keyParams(e) ? ` · ${keyParams(e)}` : ''}
                </span>
              </div>
              {f0 !== undefined && <span className="exp-f0">{formatIn(f0, 'fluence', 'J/cm²', 3)}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
