import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { litValuesRepo, materialsRepo, removeMaterialCascade, samplesRepo } from '../../data/repos';
import { MATERIAL_CLASSES, type LitGroesse, type Material, type MaterialClass } from '../../data/types';
import { LIT_GROESSE_LABEL, MATERIAL_CLASS_LABEL, probeLabel } from '../../data/labels';
import { NumberInput } from '../../components/NumberInput';
import { SelectField, TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { formatLitConditions, formatLitValue } from './litFormat';
import { formatSI } from '../../core/physics/units';

function MaterialForm({ material }: { material: Material }) {
  const { draft, change, status, error } = useAutosave(
    material,
    (d) =>
      materialsRepo.update(d.id, {
        name: d.name,
        kurz: d.kurz,
        klasse: d.klasse,
        bandluecke: d.bandluecke,
        brechungsindex: d.brechungsindex,
        dichte: d.dichte,
        waermeleitfaehigkeit: d.waermeleitfaehigkeit,
        schmelzTemp: d.schmelzTemp,
        notizen: d.notizen,
      }),
    (d) =>
      d.name.trim() === ''
        ? 'Name fehlt'
        : /[\s-]/.test(d.kurz)
          ? 'Kürzel ohne Leerzeichen und Bindestrich'
          : undefined,
  );
  const [units, setUnits] = useState<Record<string, string>>({});
  const u = (k: string) => ({ unit: units[k], onUnitChange: (x: string) => setUnits((s) => ({ ...s, [k]: x })) });

  return (
    <section className="card">
      <div className="card-head">
        <h2>Werkstoff</h2>
        <SaveBadge status={status} error={error} />
      </div>
      <TextField label="Name" required value={draft.name} onChange={(v) => change((d) => ({ ...d, name: v ?? '' }))} />
      <div className="two-col">
        <TextField
          label="Kürzel (Proben-ID)"
          value={draft.kurz}
          placeholder="z. B. Si"
          hint="z. B. Si-001; bestehende Proben-IDs bleiben bei Änderung"
          error={/[\s-]/.test(draft.kurz) ? 'Ohne Leerzeichen/Bindestrich' : undefined}
          onChange={(v) => change((d) => ({ ...d, kurz: v ?? '' }))}
        />
        <SelectField<MaterialClass>
          label="Klasse"
          value={draft.klasse}
          options={MATERIAL_CLASSES.map((k) => [k, MATERIAL_CLASS_LABEL[k]] as const)}
          onChange={(v) => v && change((d) => ({ ...d, klasse: v }))}
        />
      </div>
      <p className="muted small">Stoffdaten nur mit Quelle eintragen (Quelle in den Notizen oder als Literaturwert).</p>
      <div className="two-col">
        <NumberInput label="Bandlücke" symbol="E_g" quantity="bandgap" value={draft.bandluecke} onChange={(v) => change((d) => ({ ...d, bandluecke: v }))} />
        <NumberInput label="Brechungsindex" symbol="n" quantity="none" value={draft.brechungsindex} onChange={(v) => change((d) => ({ ...d, brechungsindex: v }))} />
        <NumberInput label="Dichte" symbol="ρ" quantity="density" value={draft.dichte} {...u('dichte')} onChange={(v) => change((d) => ({ ...d, dichte: v }))} />
        <NumberInput
          label="Wärmeleitfähigkeit"
          symbol="λ_th"
          quantity="thermalConductivity"
          value={draft.waermeleitfaehigkeit}
          onChange={(v) => change((d) => ({ ...d, waermeleitfaehigkeit: v }))}
        />
      </div>
      <NumberInput
        label="Schmelz-/Erweichungstemperatur"
        symbol="T_m"
        quantity="temperature"
        value={draft.schmelzTemp}
        {...u('schmelzTemp')}
        onChange={(v) => change((d) => ({ ...d, schmelzTemp: v }))}
      />
      <TextArea label="Notizen (z. B. Absorption bei λ, Quellen)" value={draft.notizen} onChange={(v) => change((d) => ({ ...d, notizen: v }))} />
    </section>
  );
}

export function MaterialDetail() {
  const { materialId = '' } = useParams();
  const navigate = useNavigate();
  const material = useLiveQuery(() => materialsRepo.get(materialId), [materialId]);
  const lit = useLiveQuery(() => litValuesRepo.byMaterial(materialId), [materialId]);
  const samples = useLiveQuery(() => samplesRepo.byMaterial(materialId), [materialId]);
  const [litGroesse, setLitGroesse] = useState<LitGroesse>('Fth');

  if (material === undefined || lit === undefined || samples === undefined) return null;
  if (material.deleted) return <p className="muted">Dieser Werkstoff wurde gelöscht.</p>;

  const addLit = () => navigate(`/material/${materialId}/literatur/neu?groesse=${litGroesse}`);
  const addSample = async () => {
    if (!material.kurz.trim()) {
      window.alert('Der Werkstoff braucht ein Kürzel – daraus entsteht die Proben-ID (z. B. FS-001).');
      return;
    }
    const s = await samplesRepo.createForMaterial(materialId);
    navigate(`/material/${materialId}/proben/${s.id}`);
  };
  const remove = async () => {
    if (!window.confirm(`Werkstoff „${material.name}“ mit Literaturwerten und Proben löschen?`)) return;
    await removeMaterialCascade(materialId);
    navigate('/material');
  };

  const litSorted = [...lit].sort((a, b) => a.groesse.localeCompare(b.groesse) || a.citekey.localeCompare(b.citekey));

  return (
    <div className="stack">
      <BackLink to="/material" label="Werkstoffe" />
      <MaterialForm key={material.id} material={material} />

      <section className="card">
        <h2>Literaturwerte</h2>
        {litSorted.length === 0 ? (
          <p className="muted">Noch keine Literaturwerte. Jeder Wert braucht einen BibLaTeX-Citekey.</p>
        ) : (
          <ul className="list">
            {litSorted.map((l) => (
              <li key={l.id}>
                <Link to={`/material/${materialId}/literatur/${l.id}`} className="list-item list-link">
                  <div className="list-main">
                    <span className="list-title">
                      {LIT_GROESSE_LABEL[l.groesse]} = {formatLitValue(l)}
                    </span>
                    <span className="muted small">
                      [{l.citekey}] {formatLitConditions(l)}
                    </span>
                  </div>
                  <span aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <select aria-label="Größe" value={litGroesse} onChange={(e) => setLitGroesse(e.target.value as LitGroesse)}>
            {(Object.keys(LIT_GROESSE_LABEL) as LitGroesse[]).map((g) => (
              <option key={g} value={g}>
                {LIT_GROESSE_LABEL[g]}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={addLit}>
            + Literaturwert
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Proben / Chargen</h2>
        {samples.length === 0 ? (
          <p className="muted">Noch keine Proben.</p>
        ) : (
          <ul className="list">
            {samples.map((s) => (
              <li key={s.id}>
                <Link to={`/material/${materialId}/proben/${s.id}`} className="list-item list-link">
                  <div className="list-main">
                    <span className="list-title">{probeLabel(s)}</span>
                    <span className="muted small">
                      {[s.lieferant, s.charge && `Charge ${s.charge}`, s.dicke !== undefined && `d = ${formatSI(s.dicke, 'm')}`, s.lagerort]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <span aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-primary" onClick={() => void addSample()}>
          + Probe
        </button>
      </section>

      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Werkstoff löschen
        </button>
      </section>
    </div>
  );
}
