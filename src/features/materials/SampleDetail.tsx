import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { materialsRepo, samplesRepo } from '../../data/repos';
import type { Material, Sample } from '../../data/types';
import { sanitizeIdPart } from '../../core/ids';
import { probeLabel } from '../../data/labels';
import { NumberInput } from '../../components/NumberInput';
import { TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';

function SampleForm({ sample, material }: { sample: Sample; material: Material | undefined }) {
  const { draft, change, status, error } = useAutosave(
    sample,
    (d) =>
      samplesRepo.update(d.id, {
        bezeichnung: d.bezeichnung,
        lieferant: d.lieferant,
        charge: d.charge,
        dicke: d.dicke,
        oberflaeche: d.oberflaeche,
        orientierung: d.orientierung,
        lagerort: d.lagerort,
        notiz: d.notiz,
      }),
  );
  const [unit, setUnit] = useState<string>();
  const kurz = sanitizeIdPart(material?.kurz ?? '');
  const mismatch = kurz !== '' && !draft.probenId.startsWith(`${kurz}-`);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Probe {draft.probenId}</h2>
        <SaveBadge status={status} error={error} />
      </div>
      <div className="field">
        <span>Proben-ID</span>
        <strong>{draft.probenId}</strong>
        <div className="field-hint">
          {mismatch
            ? `ID passt nicht zum Werkstoffkürzel (${kurz}-…) – bleibt bestehen.`
            : 'Beim Anlegen vergeben, wird nie geändert. Verweis in Versuchen und Dateinamen.'}
        </div>
      </div>
      <TextField
        label="Bezeichnung"
        value={draft.bezeichnung}
        placeholder={'z. B. Wafer 4" DSP'}
        hint="Freitext, optional"
        onChange={(v) => change((d) => ({ ...d, bezeichnung: v }))}
      />
      <div className="two-col">
        <TextField label="Lieferant" value={draft.lieferant} onChange={(v) => change((d) => ({ ...d, lieferant: v }))} />
        <TextField label="Charge" value={draft.charge} onChange={(v) => change((d) => ({ ...d, charge: v }))} />
        <NumberInput
          label="Dicke"
          symbol="d"
          quantity="length"
          value={draft.dicke}
          unit={unit}
          onUnitChange={setUnit}
          onChange={(v) => change((d) => ({ ...d, dicke: v }))}
        />
        <TextField label="Oberfläche" value={draft.oberflaeche} placeholder="z. B. poliert, DSP" onChange={(v) => change((d) => ({ ...d, oberflaeche: v }))} />
        <TextField label="Orientierung" value={draft.orientierung} placeholder="z. B. (100)" onChange={(v) => change((d) => ({ ...d, orientierung: v }))} />
        <TextField label="Lagerort" value={draft.lagerort} onChange={(v) => change((d) => ({ ...d, lagerort: v }))} />
      </div>
      <TextArea label="Notiz" value={draft.notiz} onChange={(v) => change((d) => ({ ...d, notiz: v }))} />
    </section>
  );
}

export function SampleDetail() {
  const { materialId = '', sampleId = '' } = useParams();
  const navigate = useNavigate();
  const material = useLiveQuery(() => materialsRepo.get(materialId), [materialId]);
  const sample = useLiveQuery(() => samplesRepo.get(sampleId), [sampleId]);
  if (sample === undefined) return null;
  if (sample.deleted) return <p className="muted">Diese Probe wurde gelöscht.</p>;
  const remove = async () => {
    if (!window.confirm(`Probe „${probeLabel(sample)}“ löschen? Die Proben-ID wird nicht neu vergeben.`)) return;
    await samplesRepo.remove(sample.id);
    navigate(`/material/${materialId}`);
  };
  return (
    <div className="stack">
      <BackLink to={`/material/${materialId}`} label={material?.name ?? 'Werkstoff'} />
      <SampleForm key={sample.id} sample={sample} material={material} />
      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Probe löschen
        </button>
      </section>
    </div>
  );
}
