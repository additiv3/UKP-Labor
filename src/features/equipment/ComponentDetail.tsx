import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { componentsRepo, systemsRepo } from '../../data/repos';
import {
  BANDS,
  STATION_ARTEN,
  type Band,
  type Beleg,
  type Belege,
  type Component,
  type OptikTyp,
  type StationArt,
  type Strahlengang,
  type Wellenlaenge,
} from '../../data/types';
import { COMPONENT_TYPE_LABEL, STATION_ART_LABEL } from '../../data/labels';
import { bandOf, withBeleg, type LaserComponent } from '../../data/equipment';
import { uuid } from '../../core/ids';
import { formatIn, type Quantity } from '../../core/physics/units';
import { CheckField, FieldGroup, SelectField, TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { BelegNumber, StatusBadge, StatusSelect } from './BelegField';

type Params = Record<string, unknown>;

/** Kurze, innerhalb der Komponente eindeutige ID für Listeneinträge. */
const shortId = () => uuid().slice(0, 8);

/** Gemeinsame Bausteine für Zahlenfelder mit Beleg innerhalb eines Objekts (params, Wellenlänge, Strahlengang). */
function useNumberFields(edit: boolean) {
  const [units, setUnits] = useState<Record<string, string>>({});
  return (
    key: string,
    obj: Params & { belege?: Belege },
    patch: (p: Params) => void,
    k: string,
    label: string,
    quantity: Quantity,
    symbol?: string,
    defUnit?: string,
  ) => (
    <BelegNumber
      key={key}
      label={label}
      symbol={symbol}
      quantity={quantity}
      value={obj[k] as number | undefined}
      unit={units[k] ?? defUnit}
      onUnitChange={(u) => setUnits((s) => ({ ...s, [k]: u }))}
      onChange={(v) => patch({ [k]: v })}
      beleg={obj.belege?.[k]}
      onBeleg={(b: Beleg) => patch({ belege: withBeleg(obj.belege, k, b) })}
      edit={edit}
    />
  );
}

function WellenlaengenEditor({
  items,
  onChange,
  edit,
}: {
  items: Wellenlaenge[];
  onChange: (w: Wellenlaenge[]) => void;
  edit: boolean;
}) {
  const field = useNumberFields(edit);
  const patch = (id: string) => (p: Params) => onChange(items.map((w) => (w.id === id ? ({ ...w, ...p } as Wellenlaenge) : w)));
  const remove = (w: Wellenlaenge) => {
    const name = w.lambda !== undefined ? formatIn(w.lambda, 'wavelength', 'nm') : 'ohne λ';
    if (window.confirm(`Wellenlänge ${name} entfernen? Strahlengänge, die darauf verweisen, verlieren die Zuordnung.`))
      onChange(items.filter((x) => x.id !== w.id));
  };
  return (
    <div className="stack-sm">
      <h3 className="group-title">Wellenlängen</h3>
      {items.length === 0 && <p className="muted small">Noch keine Wellenlänge. Grundwelle und ggf. Harmonische einzeln anlegen.</p>}
      {items.map((w) => (
        <div key={w.id} className="sub-card">
          <div className="sub-card-head">
            <strong>
              {w.lambda !== undefined ? `${formatIn(w.lambda, 'wavelength', 'nm')} · ${bandOf(w.lambda)}` : 'Neue Wellenlänge'}
            </strong>
            <button type="button" className="btn btn-small btn-danger" onClick={() => remove(w)}>
              Entfernen
            </button>
          </div>
          <div className="two-col">
            {field(`${w.id}-l`, w as unknown as Params, patch(w.id), 'lambda', 'Wellenlänge', 'wavelength', 'λ')}
            <TextField
              label="Bezeichnung"
              value={w.bezeichnung}
              placeholder="z. B. Grundwelle, SHG, THG"
              onChange={(v) => patch(w.id)({ bezeichnung: v })}
            />
          </div>
          <div className="two-col">
            {field(`${w.id}-p`, w as unknown as Params, patch(w.id), 'pMax', 'Max. mittlere Leistung', 'power', 'P_max')}
            {field(`${w.id}-e`, w as unknown as Params, patch(w.id), 'ePulsMax', 'Max. Pulsenergie', 'energy', 'E_max')}
          </div>
          {field(`${w.id}-m`, w as unknown as Params, patch(w.id), 'm2', 'Strahlqualität', 'none', 'M²')}
          <TextField label="Notiz" value={w.notiz} onChange={(v) => patch(w.id)({ notiz: v })} />
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => onChange([...items, { id: shortId(), bezeichnung: items.length === 0 ? 'Grundwelle' : undefined }])}
      >
        + Wellenlänge
      </button>
    </div>
  );
}

function StrahlengaengeEditor({
  items,
  lasers,
  onChange,
  edit,
}: {
  items: Strahlengang[];
  lasers: LaserComponent[];
  onChange: (s: Strahlengang[]) => void;
  edit: boolean;
}) {
  const field = useNumberFields(edit);
  const patch = (id: string) => (p: Params) => onChange(items.map((s) => (s.id === id ? ({ ...s, ...p } as Strahlengang) : s)));
  return (
    <div className="stack-sm">
      <h3 className="group-title">Strahlengänge</h3>
      {items.length === 0 && <p className="muted small">Je Wellenlänge, die diese Station erreicht, einen Strahlengang anlegen.</p>}
      {items.map((s) => {
        const laser = lasers.find((l) => l.id === s.laserId);
        const wl = laser?.params.wellenlaengen.find((w) => w.id === s.wellenlaengeId);
        const title = [
          wl?.lambda !== undefined ? formatIn(wl.lambda, 'wavelength', 'nm') : (s.band ?? 'λ offen'),
          laser?.name,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <div key={s.id} className="sub-card">
            <div className="sub-card-head">
              <strong>{title}</strong>
              <StatusBadge status={s.status ?? 'unbekannt'} compact />
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={() => window.confirm('Strahlengang entfernen?') && onChange(items.filter((x) => x.id !== s.id))}
              >
                Entfernen
              </button>
            </div>
            <div className="two-col">
              <SelectField
                label="Laserquelle"
                empty="– unbekannt –"
                value={s.laserId}
                options={lasers.map((l) => [l.id, l.name] as const)}
                onChange={(v) => patch(s.id)({ laserId: v, wellenlaengeId: undefined })}
              />
              {laser && laser.params.wellenlaengen.length > 0 ? (
                <SelectField
                  label="Wellenlänge"
                  empty="– offen –"
                  value={s.wellenlaengeId}
                  options={laser.params.wellenlaengen.map(
                    (w) =>
                      [w.id, [w.lambda !== undefined ? formatIn(w.lambda, 'wavelength', 'nm') : '?', w.bezeichnung].filter(Boolean).join(' · ')] as const,
                  )}
                  onChange={(v) => patch(s.id)({ wellenlaengeId: v })}
                />
              ) : (
                <SelectField<Band>
                  label="Spektralbereich"
                  empty="– unbekannt –"
                  value={s.band}
                  options={BANDS.map((b) => [b, b] as const)}
                  onChange={(v) => patch(s.id)({ band: v })}
                />
              )}
            </div>
            {laser && laser.params.wellenlaengen.length > 0 && !s.wellenlaengeId && (
              <SelectField<Band>
                label="Spektralbereich (solange λ offen)"
                empty="– unbekannt –"
                value={s.band}
                options={BANDS.map((b) => [b, b] as const)}
                onChange={(v) => patch(s.id)({ band: v })}
              />
            )}
            <StatusSelect value={s.status} onChange={(v) => patch(s.id)({ status: v })} />
            {field(`${s.id}-w0`, s as unknown as Params, patch(s.id), 'w0', 'Fokusradius (1/e²)', 'length', 'w₀')}
            <TextField label="Notiz" value={s.notiz} onChange={(v) => patch(s.id)({ notiz: v })} />
          </div>
        );
      })}
      <button type="button" className="btn" onClick={() => onChange([...items, { id: shortId() }])}>
        + Strahlengang
      </button>
    </div>
  );
}

function ComponentForm({ component, lasers }: { component: Component; lasers: LaserComponent[] }) {
  const { draft, change, status, error } = useAutosave<Component>(
    component,
    (d) =>
      componentsRepo.update(d.id, {
        name: d.name,
        hersteller: d.hersteller,
        modell: d.modell,
        datenblatt: d.datenblatt,
        notizen: d.notizen,
        status: d.status,
        params: d.params,
      } as Partial<Component>),
    (d) => (d.name.trim() === '' ? 'Name fehlt' : undefined),
  );
  const [editBelege, setEditBelege] = useState(false);
  const field = useNumberFields(editBelege);
  const p = draft.params as Params & { belege?: Belege };

  const patchParams = (x: Params) => change((d) => ({ ...d, params: { ...(d.params as Params), ...x } }) as Component);
  const num = (k: string, label: string, quantity: Quantity, symbol?: string, defUnit?: string) =>
    field(k, p, patchParams, k, label, quantity, symbol, defUnit);

  let typed: ReactNode;
  switch (draft.typ) {
    case 'laserquelle':
      typed = (
        <>
          <WellenlaengenEditor
            items={(p.wellenlaengen as Wellenlaenge[] | undefined) ?? []}
            onChange={(v) => patchParams({ wellenlaengen: v })}
            edit={editBelege}
          />
          <h3 className="group-title">Laserquelle gesamt</h3>
          <p className="muted small">Gilt für Wellenlängen ohne eigene Angabe (meist die Grundwelle).</p>
          <div className="two-col">
            {num('pMax', 'Max. mittlere Leistung', 'power', 'P_max')}
            {num('ePulsMax', 'Max. Pulsenergie', 'energy', 'E_max')}
          </div>
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
          <CheckField label="Burst-Modus verfügbar" checked={p.burst === true} onChange={(v) => patchParams({ burst: v || undefined })} />
          {p.burst === true && (
            <TextField label="Burst-Info" value={p.burstInfo as string | undefined} onChange={(v) => patchParams({ burstInfo: v })} />
          )}
        </>
      );
      break;
    case 'station': {
      const laserIds = (p.laserIds as string[] | undefined) ?? [];
      const toggleLaser = (id: string, on: boolean) =>
        patchParams({ laserIds: on ? [...laserIds.filter((x) => x !== id), id] : laserIds.filter((x) => x !== id) });
      // Strahlengänge wählen bevorzugt aus den zugeordneten Lasern, sonst aus allen der Anlage
      const assigned = lasers.filter((l) => laserIds.includes(l.id));
      typed = (
        <>
          <SelectField<StationArt>
            label="Art"
            empty="– unbekannt –"
            value={p.art as StationArt | undefined}
            options={STATION_ARTEN.map((a) => [a, STATION_ART_LABEL[a]] as const)}
            onChange={(v) => patchParams({ art: v })}
          />
          <h3 className="group-title">Zugeordnete Laserquellen</h3>
          {lasers.length === 0 ? (
            <p className="muted small">In dieser Anlage gibt es noch keine Laserquelle.</p>
          ) : (
            lasers.map((l) => (
              <CheckField key={l.id} label={l.name} checked={laserIds.includes(l.id)} onChange={(v) => toggleLaser(l.id, v)} />
            ))
          )}
          <h3 className="group-title">Optik</h3>
          {num('brennweite', 'Brennweite', 'focal', 'f')}
          <TextField
            label="Objektiv / Fokussieroptik"
            value={p.objektiv as string | undefined}
            placeholder="Hersteller, Typ, Artikelnummer"
            onChange={(v) => patchParams({ objektiv: v })}
          />
          {num('feldgroesse', 'Feldgröße (Kantenlänge)', 'length', undefined, 'mm')}
          <StrahlengaengeEditor
            items={(p.strahlengaenge as Strahlengang[] | undefined) ?? []}
            lasers={assigned.length ? assigned : lasers}
            onChange={(v) => patchParams({ strahlengaenge: v })}
            edit={editBelege}
          />
        </>
      );
      break;
    }
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
            onChange={(v) => patchParams({ typ: v })}
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
            onChange={(v) => patchParams({ verfahrwege: v })}
          />
          {num('genauigkeit', 'Genauigkeit', 'length')}
        </>
      );
      break;
    default:
      typed = (
        <TextArea
          label="Beschreibung / Kennwerte"
          rows={5}
          value={p.freitext as string | undefined}
          onChange={(v) => patchParams({ freitext: v })}
        />
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
        <StatusSelect value={draft.status} onChange={(v) => change((d) => ({ ...d, status: v }))} />
        <TextField
          label="Datenblatt"
          value={draft.datenblatt}
          hint="Pfad oder Dateiname, z. B. 02_Labor/Datenblaetter/…pdf (keine Dateien in der App)"
          onChange={(v) => change((d) => ({ ...d, datenblatt: v }))}
        />
      </section>
      <section className="card">
        <FieldGroup title="Kennwerte">
          <CheckField label="Belege bearbeiten (unbestätigt, Quelle)" checked={editBelege} onChange={setEditBelege} />
          {typed}
        </FieldGroup>
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
  const siblings = useLiveQuery(() => componentsRepo.bySystem(systemId), [systemId]);
  if (component === undefined || siblings === undefined) return null;
  if (component.deleted) return <p className="muted">Diese Komponente wurde gelöscht.</p>;
  const lasers = siblings.filter((c): c is LaserComponent => c.typ === 'laserquelle');

  const remove = async () => {
    if (!window.confirm(`Komponente „${component.name}“ löschen?`)) return;
    await componentsRepo.remove(component.id);
    navigate(`/anlagen/${systemId}`);
  };

  return (
    <div className="stack">
      <BackLink to={`/anlagen/${systemId}`} label={system?.name ?? 'Anlage'} />
      <ComponentForm key={component.id} component={component} lasers={lasers} />
      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Komponente löschen
        </button>
      </section>
    </div>
  );
}
