import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { litValuesRepo, materialsRepo } from '../../data/repos';
import type { LitGroesse, LitValue } from '../../data/types';
import { LIT_GROESSE_LABEL, LIT_QUANTITY } from '../../data/labels';
import { findUnit } from '../../core/physics/units';
import { NumberInput } from '../../components/NumberInput';
import { SelectField, TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { validateLit, type LitDraft } from './litFormat';


const GROESSEN = Object.keys(LIT_GROESSE_LABEL) as LitGroesse[];

function defaultUnit(g: LitGroesse): string {
  if (g === 'sonstig') return '';
  if (g === 'delta') return 'nm';
  return findUnit(LIT_QUANTITY[g], undefined).id;
}

function LitFields({ draft, change }: { draft: LitDraft; change: (fn: (d: LitDraft) => LitDraft) => void }) {
  const [units, setUnits] = useState<Record<string, string>>({});
  const g = draft.groesse;
  return (
    <>
      <SelectField<LitGroesse>
        label="Größe"
        value={g}
        options={GROESSEN.map((x) => [x, LIT_GROESSE_LABEL[x]] as const)}
        onChange={(v) => v && change((d) => ({ ...d, groesse: v, einheit: defaultUnit(v), wert: v === d.groesse ? d.wert : undefined }))}
      />
      {g === 'sonstig' ? (
        <div className="two-col">
          <NumberInput label="Wert" quantity="none" value={draft.wert} onChange={(v) => change((d) => ({ ...d, wert: v }))} />
          <TextField label="Einheit" value={draft.einheit} onChange={(v) => change((d) => ({ ...d, einheit: v ?? '' }))} />
        </div>
      ) : (
        <NumberInput
          key={g}
          label="Wert"
          quantity={LIT_QUANTITY[g]}
          value={draft.wert}
          unit={draft.einheit || undefined}
          onUnitChange={(u) => change((d) => ({ ...d, einheit: u }))}
          onChange={(v) => change((d) => ({ ...d, wert: v }))}
        />
      )}
      <TextField
        label="Citekey (BibLaTeX)"
        required
        value={draft.citekey}
        placeholder="z. B. bonse2002"
        onChange={(v) => change((d) => ({ ...d, citekey: (v ?? '').trim() }))}
      />
      <h3 className="group-title">Bedingungen</h3>
      <div className="two-col">
        <NumberInput
          label="Wellenlänge"
          symbol="λ"
          quantity="wavelength"
          value={draft.lambda}
          unit={units.lambda}
          onUnitChange={(u) => setUnits((s) => ({ ...s, lambda: u }))}
          onChange={(v) => change((d) => ({ ...d, lambda: v }))}
        />
        <NumberInput
          label="Pulsdauer"
          symbol="τ"
          quantity="time"
          value={draft.tau}
          unit={units.tau}
          onUnitChange={(u) => setUnits((s) => ({ ...s, tau: u }))}
          onChange={(v) => change((d) => ({ ...d, tau: v }))}
        />
        <NumberInput label="Pulszahl" symbol="N" quantity="none" value={draft.nPulse} onChange={(v) => change((d) => ({ ...d, nPulse: v }))} />
        <TextField label="Methode" value={draft.methode} placeholder="z. B. D² (Liu)" onChange={(v) => change((d) => ({ ...d, methode: v }))} />
      </div>
      <TextArea label="Notiz" value={draft.notiz} onChange={(v) => change((d) => ({ ...d, notiz: v }))} />
    </>
  );
}

function NewLitForm({ materialId, groesse }: { materialId: string; groesse: LitGroesse }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<LitDraft>({ materialId, groesse, wert: undefined, einheit: defaultUnit(groesse), citekey: '' });
  const [tried, setTried] = useState(false);
  const error = validateLit(draft);
  const save = async () => {
    setTried(true);
    if (error) return;
    await litValuesRepo.create({ ...draft, wert: draft.wert! });
    navigate(`/material/${materialId}`);
  };
  return (
    <section className="card">
      <h2>Neuer Literaturwert</h2>
      <LitFields draft={draft} change={(fn) => setDraft(fn)} />
      {tried && error && <p className="field-warn">{error}</p>}
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => void save()}>
          Speichern
        </button>
        <button type="button" className="btn" onClick={() => navigate(`/material/${materialId}`)}>
          Abbrechen
        </button>
      </div>
    </section>
  );
}

function EditLitForm({ lit }: { lit: LitValue }) {
  const { draft, change, status, error } = useAutosave<LitDraft>(
    lit,
    (d) =>
      litValuesRepo.update(lit.id, {
        groesse: d.groesse,
        wert: d.wert!,
        einheit: d.einheit,
        lambda: d.lambda,
        tau: d.tau,
        nPulse: d.nPulse,
        methode: d.methode,
        citekey: d.citekey,
        notiz: d.notiz,
      }),
    validateLit,
  );
  return (
    <section className="card">
      <div className="card-head">
        <h2>Literaturwert</h2>
        <SaveBadge status={status} error={error} />
      </div>
      <LitFields draft={draft} change={change} />
    </section>
  );
}

export function LitValueDetail() {
  const { materialId = '', litId = '' } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const material = useLiveQuery(() => materialsRepo.get(materialId), [materialId]);
  const lit = useLiveQuery(() => (litId === 'neu' ? Promise.resolve(null) : litValuesRepo.get(litId)), [litId]);
  if (material === undefined || lit === undefined) return null;
  const back = <BackLink to={`/material/${materialId}`} label={material.name} />;

  if (litId === 'neu') {
    const g = search.get('groesse');
    const groesse: LitGroesse = GROESSEN.includes(g as LitGroesse) ? (g as LitGroesse) : 'Fth';
    return (
      <div className="stack">
        {back}
        <NewLitForm materialId={materialId} groesse={groesse} />
      </div>
    );
  }
  if (!lit || lit.deleted) return <p className="muted">Dieser Literaturwert wurde gelöscht.</p>;

  const remove = async () => {
    if (!window.confirm('Literaturwert löschen?')) return;
    await litValuesRepo.remove(lit.id);
    navigate(`/material/${materialId}`);
  };
  return (
    <div className="stack">
      {back}
      <EditLitForm key={lit.id} lit={lit} />
      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Literaturwert löschen
        </button>
      </section>
    </div>
  );
}
