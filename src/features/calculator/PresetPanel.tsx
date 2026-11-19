import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { litValuesRepo, materialsRepo, systemsRepo } from '../../data/repos';
import { getSetting } from '../../data/repos/settings';
import type { Component } from '../../data/types';
import { LIT_GROESSE_LABEL } from '../../data/labels';
import { formatIn } from '../../core/physics/units';
import { formatLitConditions, formatLitValue } from '../materials/litFormat';
import { asLaser, asOptik, laserPresetValues, litTarget, optikPresetValues } from './presets';
import { laserLambdas } from '../../data/equipment';
import type { CalcPreset, CalcState } from './state';

interface Props {
  state: CalcState;
  update: (fn: (s: CalcState) => CalcState) => void;
  components: Component[] | undefined;
}

// Standard-Anlage nur einmal pro Sitzung vorwählen (danach respektieren wir eine bewusste Abwahl).
let defaultApplied = false;

/** Vorlagen aus „Anlagen“ und „Material“: Auswahl belegt Rechnerfelder vor. */
export function PresetPanel({ state, update, components }: Props) {
  const systems = useLiveQuery(() => systemsRepo.listSorted(), []);
  const materials = useLiveQuery(() => materialsRepo.listSorted(), []);
  const pr = state.preset;
  const lit = useLiveQuery(() => (pr.materialId ? litValuesRepo.byMaterial(pr.materialId) : Promise.resolve([])), [pr.materialId]);

  const defaultSystemId = useLiveQuery(() => getSetting('defaultSystemId'), []);
  useEffect(() => {
    if (defaultApplied || !defaultSystemId || !systems) return;
    defaultApplied = true;
    if (!pr.systemId && systems.some((x) => x.id === defaultSystemId))
      update((s) => ({ ...s, preset: { ...s.preset, systemId: defaultSystemId } }));
  }, [defaultSystemId, systems, pr.systemId, update]);

  const setPreset = (p: Partial<CalcPreset>, v: CalcState['v'] = {}, extra: Partial<CalcState> = {}) =>
    update((s) => ({ ...s, ...extra, preset: { ...s.preset, ...p }, v: { ...s.v, ...v } }));

  const byType = (t: Component['typ']) => (components ?? []).filter((c) => c.typ === t);
  const lasers = byType('laserquelle');
  const optiken = byType('optik');
  const scanner = byType('scanner');
  const laser = asLaser(lasers.find((c) => c.id === pr.laserId));

  if (systems === undefined || materials === undefined) return null;

  const sel = (
    label: string,
    value: string | undefined,
    items: { id: string; name: string }[],
    onChange: (id: string | undefined) => void,
    empty = '– keine –',
  ) => (
    <div className="field">
      <label htmlFor={`preset-${label}`}>{label}</label>
      <select id={`preset-${label}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{empty}</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section className="card">
      <h2>Vorlagen</h2>
      {systems.length === 0 ? (
        <p className="muted small">
          Noch keine Anlagen. <Link to="/anlagen">Lege unter „Anlagen“ Laser, Optik und Scanner an</Link>, dann lassen sich
          die Felder hier vorbelegen und Grenzwerte prüfen.
        </p>
      ) : (
        <>
          {sel('Anlage', pr.systemId, systems, (id) =>
            setPreset({ systemId: id, laserId: undefined, optikId: undefined, scannerId: undefined }),
          )}
          {pr.systemId && (
            <div className="two-col">
              {sel('Laserquelle', pr.laserId, lasers, (id) => {
                const l = asLaser(lasers.find((c) => c.id === id));
                setPreset({ laserId: id }, l ? laserPresetValues(l) : {});
              })}
              {sel('Optik', pr.optikId, optiken, (id) => {
                const o = asOptik(optiken.find((c) => c.id === id));
                if (!o) return setPreset({ optikId: id });
                const v = optikPresetValues(o);
                // w0 laut Datenblatt nur direkt nutzen, wenn kein Rohstrahlradius bekannt ist
                const direkt = v.w0 !== undefined && state.v.wL === undefined && laser?.rohstrahlRadius === undefined;
                if (!direkt) delete v.w0;
                setPreset({ optikId: id }, v, direkt ? { w0Mode: 'direkt' } : {});
              })}
              {sel('Scanner', pr.scannerId, scanner, (id) => setPreset({ scannerId: id }))}
            </div>
          )}
          {laser && laserLambdas(laser).length > 1 && (
            <div className="chips" role="radiogroup" aria-label="Wellenlänge der Laserquelle">
              {laserLambdas(laser).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={state.v.lambda === l}
                  className={`chip chip-btn${state.v.lambda === l ? ' active' : ''}`}
                  onClick={() => setPreset({}, { lambda: l })}
                >
                  {formatIn(l, 'wavelength', 'nm')}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {sel('Werkstoff', pr.materialId, materials, (id) => setPreset({ materialId: id }))}
      {pr.materialId && lit !== undefined && (
        lit.filter((l) => litTarget(l)).length === 0 ? (
          <p className="muted small">Keine Literaturwerte zu F_th, δ oder S hinterlegt.</p>
        ) : (
          <ul className="list compact">
            {lit
              .filter((l) => litTarget(l))
              .map((l) => {
                const target = litTarget(l)!;
                const active = state.v[target] !== undefined && Math.abs(state.v[target]! - l.wert) <= 1e-9 * Math.abs(l.wert);
                return (
                  <li key={l.id} className="list-item">
                    <div className="list-main">
                      <span>
                        {LIT_GROESSE_LABEL[l.groesse]} = <strong>{formatLitValue(l)}</strong>
                      </span>
                      <span className="muted small">
                        [{l.citekey}] {formatLitConditions(l)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-small"
                      disabled={active}
                      onClick={() => setPreset({}, { [target]: l.wert })}
                    >
                      {active ? '✓' : 'Übernehmen'}
                    </button>
                  </li>
                );
              })}
          </ul>
        )
      )}
    </section>
  );
}
