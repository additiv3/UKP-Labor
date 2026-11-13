import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { componentsRepo, systemsRepo } from '../../data/repos';
import type { Component, OptikTyp } from '../../data/types';
import { COMPONENT_TYPE_LABEL } from '../../data/labels';
import type { Quantity } from '../../core/physics/units';
import { NumberInput } from '../../components/NumberInput';
import { CheckField, FieldGroup, NumberListField, SelectField, TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';

type Params = Record<string, unknown>;

function ComponentForm({ component }: { component: Component }) {
  const { draft, change, status, error } = useAutosave<Component>(
    component,
    (d) =>
      componentsRepo.update(d.id, {
        name: d.name,
        hersteller: d.hersteller,
        modell: d.modell,
        datenblatt: d.datenblatt,
        notizen: d.notizen,
        params: d.params,
      } as Partial<Component>),
    (d) => (d.name.trim() === '' ? 'Name fehlt' : undefined),
  );
  const [units, setUnits] = useState<Record<string, string>>({});
  const p = draft.params as Params;

  const setParam = (k: string, v: unknown) => change((d) => ({ ...d, params: { ...(d.params as Params), [k]: v } }) as Component);
  const num = (k: string, label: string, quantity: Quantity, symbol?: string, defUnit?: string) => (
    <NumberInput
      key={k}
      label={label}
      symbol={symbol}
      quantity={quantity}
      value={p[k] as number | undefined}
      unit={units[k] ?? defUnit}
      onUnitChange={(u) => setUnits((s) => ({ ...s, [k]: u }))}
      onChange={(v) => setParam(k, v)}
    />
  );

  let typed: ReactNode;
  switch (draft.typ) {
    case 'laserquelle':
      typed = (
        <>
          <NumberListField
            label="Wellenlängen"
            quantity="wavelength"
            value={(p.wellenlaengen as number[] | undefined) ?? []}
            onChange={(v) => setParam('wellenlaengen', v)}
          />
          {num('pMax', 'Max. mittlere Leistung', 'power', 'P_max')}
          {num('ePulsMax', 'Max. Pulsenergie', 'energy', 'E_max')}
          <div className="two-col">
            {num('fRepMin', 'Repetitionsrate min.', 'frequency', 'f_min')}
            {num('fRepMax', 'Repetitionsrate max.', 'frequency', 'f_max')}
          </div>
          <div className="two-col">
            {num('tauMin', 'Pulsdauer min.', 'time', 'τ_min')}
            {num('tauMax', 'Pulsdauer max.', 'time', 'τ_max')}
          </div>
          {num('m2', 'Strahlqualität', 'none', 'M²')}
          {num('rohstrahlRadius', 'Rohstrahlradius (1/e²) an der Optik', 'length', 'w_L', 'mm')}
          <CheckField label="Burst-Modus verfügbar" checked={p.burst === true} onChange={(v) => setParam('burst', v || undefined)} />
          {p.burst === true && (
            <TextField label="Burst-Info" value={p.burstInfo as string | undefined} onChange={(v) => setParam('burstInfo', v)} />
          )}
        </>
      );
      break;
    case 'optik':
      typed = (
        <>
          <SelectField<OptikTyp>
            label="Art"
            empty="–"
            value={p.typ as OptikTyp | undefined}
            options={[
              ['f-theta', 'F-Theta-Objektiv'],
              ['linse', 'Linse'],
              ['objektiv', 'Objektiv'],
            ]}
            onChange={(v) => setParam('typ', v)}
          />
          {num('brennweite', 'Brennweite', 'focal', 'f')}
          {num('eingangsapertur', 'Eingangsapertur', 'length', 'Ø', 'mm')}
          {num('w0Datenblatt', 'Fokusradius laut Datenblatt (1/e²)', 'length', 'w₀')}
          {num('feldgroesse', 'Feldgröße (Kantenlänge)', 'length', undefined, 'mm')}
        </>
      );
      break;
    case 'scanner':
      typed = (
        <>
          {num('vMax', 'Max. Scangeschwindigkeit', 'velocity', 'v_max', 'm/s')}
          {num('feldgroesse', 'Feldgröße (Kantenlänge)', 'length', undefined, 'mm')}
          {num('apertur', 'Apertur', 'length', 'Ø', 'mm')}
        </>
      );
      break;
    case 'achsen':
      typed = (
        <>
          {num('anzahl', 'Anzahl Achsen', 'none')}
          <TextField
            label="Verfahrwege"
            value={p.verfahrwege as string | undefined}
            placeholder="z. B. X 300 mm, Y 300 mm, Z 100 mm"
            onChange={(v) => setParam('verfahrwege', v)}
          />
          {num('genauigkeit', 'Genauigkeit', 'length')}
        </>
      );
      break;
    default:
      typed = (
        <TextArea label="Beschreibung / Kennwerte" rows={5} value={p.freitext as string | undefined} onChange={(v) => setParam('freitext', v)} />
      );
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>{COMPONENT_TYPE_LABEL[draft.typ]}</h2>
          <SaveBadge status={status} error={error} />
        </div>
        <TextField label="Name" required value={draft.name} error={error} onChange={(v) => change((d) => ({ ...d, name: v ?? '' }))} />
        <div className="two-col">
          <TextField label="Hersteller" value={draft.hersteller} onChange={(v) => change((d) => ({ ...d, hersteller: v }))} />
          <TextField label="Modell" value={draft.modell} onChange={(v) => change((d) => ({ ...d, modell: v }))} />
        </div>
        <TextField
          label="Datenblatt"
          value={draft.datenblatt}
          hint="Pfad oder Dateiname, z. B. 02_Labor/Datenblaetter/…pdf (keine Dateien in der App)"
          onChange={(v) => change((d) => ({ ...d, datenblatt: v }))}
        />
      </section>
      <section className="card">
        <FieldGroup title="Kennwerte">{typed}</FieldGroup>
        <TextArea label="Notizen" value={draft.notizen} onChange={(v) => change((d) => ({ ...d, notizen: v }))} />
      </section>
    </>
  );
}

export function ComponentDetail() {
  const { systemId = '', componentId = '' } = useParams();
  const navigate = useNavigate();
  const component = useLiveQuery(() => componentsRepo.get(componentId), [componentId]);
  const system = useLiveQuery(() => systemsRepo.get(systemId), [systemId]);
  if (component === undefined) return null;
  if (component.deleted) return <p className="muted">Diese Komponente wurde gelöscht.</p>;

  const remove = async () => {
    if (!window.confirm(`Komponente „${component.name}“ löschen?`)) return;
    await componentsRepo.remove(component.id);
    navigate(`/anlagen/${systemId}`);
  };

  return (
    <div className="stack">
      <BackLink to={`/anlagen/${systemId}`} label={system?.name ?? 'Anlage'} />
      <ComponentForm key={component.id} component={component} />
      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Komponente löschen
        </button>
      </section>
    </div>
  );
}
