/**
 * Prüft die private Importdatei `daten/anlagen-import.json` (nur im privaten Repo). Fehlt sie (öffentliches Repo),
 * werden die Tests übersprungen.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, SCHEMA_VERSION } from './db';
import { applyMergePlan, readAllData } from './exchange';
import { _resetDeviceIdCache } from './repos/settings';
import { planMerge } from '../core/exchange/importMerge';
import { parseExport } from '../core/exchange/schema';
import { stationMatrix } from './equipment';
import type { Belege, Component } from './types';

const files = import.meta.glob<string>('../../daten/anlagen-import.json', { query: '?raw', import: 'default', eager: true });
const text = Object.values(files)[0];

beforeEach(async () => {
  db.close();
  await db.delete();
  _resetDeviceIdCache();
  await db.open();
});

/** Alle Zahlenfelder eines Objekts (ohne verschachtelte Objekte). */
const numberKeys = (o: object) => Object.entries(o).filter(([, v]) => typeof v === 'number').map(([k]) => k);

describe.skipIf(text === undefined)('Importdatei daten/anlagen-import.json', () => {
  const parsed = () => parseExport(text!, SCHEMA_VERSION);

  it('ist eine gültige Exportdatei im aktuellen Schema ohne verworfene Datensätze', () => {
    const r = parsed();
    expect(r.fatal).toBeUndefined();
    expect(r.issues).toEqual([]);
    expect(r.file!.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.file!.data.systems.map((s) => s.name)).toEqual([
      'OPTEC WSMH',
      'MicroMaster 200 (MM200)',
      'GFH Evo',
      'GFH GL.compact II',
      'ACSYS Multishift',
    ]);
  });

  it('jeder Zahlenwert hat eine Quelle', () => {
    const missing: string[] = [];
    const check = (owner: string, o: object & { belege?: Belege }) => {
      for (const k of numberKeys(o)) if (!o.belege?.[k]?.quelle) missing.push(`${owner}.${k}`);
    };
    for (const c of parsed().file!.data.components) {
      check(c.name, c.params);
      if (c.typ === 'laserquelle') for (const w of c.params.wellenlaengen) check(`${c.name}/${w.id}`, w);
      if (c.typ === 'station') for (const s of c.params.strahlengaenge) check(`${c.name}/${s.id}`, s);
    }
    expect(missing).toEqual([]);
  });

  it('Strahlengänge verweisen auf Laser und Wellenlängen derselben Anlage', () => {
    const comps = parsed().file!.data.components;
    const byId = new Map(comps.map((c) => [c.id, c]));
    for (const c of comps) {
      if (c.typ !== 'station') continue;
      for (const id of c.params.laserIds) expect(byId.get(id)?.systemId, `${c.name}: Laser ${id}`).toBe(c.systemId);
      for (const s of c.params.strahlengaenge) {
        if (!s.laserId) continue;
        const l = byId.get(s.laserId) as Extract<Component, { typ: 'laserquelle' }> | undefined;
        expect(l?.systemId, `${c.name}/${s.id}`).toBe(c.systemId);
        if (s.wellenlaengeId) expect(l?.params.wellenlaengen.some((w) => w.id === s.wellenlaengeId), `${c.name}/${s.id}`).toBe(true);
      }
    }
  });

  it('lässt sich über Import/Merge übernehmen; erneuter Import ändert nichts', async () => {
    const r = parsed();
    const plan = planMerge(await readAllData(), r.file!.data);
    expect(plan.counts.systems.neu).toBe(5);
    expect(plan.counts.components.neu).toBe(r.file!.data.components.length);
    expect(plan.conflicts).toEqual([]);
    await applyMergePlan(plan);

    const again = planMerge(await readAllData(), parsed().file!.data);
    expect(again.empty).toBe(true);
    expect(again.counts.components.unveraendert).toBe(r.file!.data.components.length);
  });

  it('Übersicht: WSMH mit 7 Stationen, MM200-UV nicht aufgebaut', () => {
    const { systems, components } = parsed().file!.data;
    const sys = (name: string) => systems.find((s) => s.name === name)!.id;
    const wsmh = stationMatrix(components.filter((c) => c.systemId === sys('OPTEC WSMH')));
    expect(wsmh.rows).toHaveLength(7);
    expect(wsmh.columns).toEqual(['IR', 'VIS', 'UV']);
    const mm = stationMatrix(components.filter((c) => c.systemId === sys('MicroMaster 200 (MM200)')));
    const uv = mm.rows.find((r) => r.station.name === 'UV-Galvo')!;
    expect(uv.status).toBe('nicht-aufgebaut');
    expect(uv.cells.UV[0]!.status).toBe('nicht-aufgebaut');
    expect(uv.cells.UV[0]!.lambda).toBeCloseTo(343e-9, 15);
  });
});
