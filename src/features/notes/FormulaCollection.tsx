import { FORMULA_CATALOG } from '../../core/physics/formulaCatalog';
import { FORMEL_VERSION } from '../../core/physics/version';
import { Formula } from '../../components/Formula';
import { BackLink } from '../../components/MasterDetail';

export function FormulaCollection() {
  return (
    <div className="stack">
      <BackLink to="/notizen" label="Notizen" />
      <section className="card">
        <h2>Formelsammlung</h2>
        <p className="muted small">Dieselben Formeln wie im Rechner (Formelversion {FORMEL_VERSION}).</p>
      </section>
      {FORMULA_CATALOG.map((g) => (
        <section key={g.title} className="card">
          <h2>{g.title}</h2>
          {g.intro && <p className="small">{g.intro}</p>}
          {g.entries.map((e) => (
            <div key={e.name} className="formula-entry">
              <div className="formula-name">{e.name}</div>
              <div className="formula-tex">
                <Formula tex={e.tex} display />
              </div>
              {e.note && <p className="muted small">{e.note}</p>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
