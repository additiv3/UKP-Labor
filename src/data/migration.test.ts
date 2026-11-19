import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { UkpDb } from './db';
import type { Component } from './types';

const NAME = 'ukp-labor-migration-test';
const ts = '2026-11-10T10:00:00.000Z';
const rec = (id: string, typ: string, params: object) => ({
  id,
  createdAt: ts,
  updatedAt: ts,
  deviceId: 'altgeraet',
  systemId: 'sys',
  typ,
  name: typ,
  params,
});

/** Datenbank im Stand von Schema 1 anlegen (wie App-Version ≤ 0.9). */
async function createV1(components: object[]) {
  const old = new Dexie(NAME);
  old.version(1).stores({
    systems: 'id, name, updatedAt',
    components: 'id, systemId, typ, updatedAt',
    materials: 'id, name, updatedAt',
    litValues: 'id, materialId, updatedAt',
    samples: 'id, materialId, updatedAt',
    series: 'id, code, updatedAt',
    experiments: 'id, versuchsId, seriesId, datum, materialId, updatedAt, *tags',
    notes: 'id, datum, updatedAt, *tags',
    settings: 'key',
  });
  await old.open();
  await old.table('components').bulkAdd(components);
  await old.table('materials').add({ id: 'm1', name: 'Si', kurz: 'Si', klasse: 'halbleiter', createdAt: ts, updatedAt: ts, deviceId: 'x' });
  old.close();
}

afterEach(async () => {
  await Dexie.delete(NAME);
});

describe('Dexie-Migration 1 → 2', () => {
  it('schreibt Laser-Wellenlängen um, lässt andere Datensätze und Zeitstempel unverändert', async () => {
    await createV1([
      rec('a', 'laserquelle', { wellenlaengen: [1030e-9, 343e-9], pMax: 6, m2: 1.2 }),
      rec('b', 'optik', { brennweite: 0.1 }),
      rec('c', 'laserquelle', { wellenlaengen: [] }),
    ]);
    const db = new UkpDb(NAME);
    await db.open();
    expect(db.verno).toBe(2);

    const a = (await db.components.get('a')) as Extract<Component, { typ: 'laserquelle' }>;
    expect(a.params).toEqual({
      wellenlaengen: [
        { id: 'w1', lambda: 1030e-9 },
        { id: 'w2', lambda: 343e-9 },
      ],
      pMax: 6,
      m2: 1.2,
    });
    expect(a.updatedAt).toBe(ts);
    expect(a.deviceId).toBe('altgeraet');
    expect((await db.components.get('b'))?.params).toEqual({ brennweite: 0.1 });
    expect((await db.components.get('c'))?.params).toEqual({ wellenlaengen: [] });
    // keine Neubefüllung der Startbibliothek bei bestehender Datenbank
    expect(await db.materials.count()).toBe(1);
    // Indizes funktionieren weiter
    expect(await db.components.where('typ').equals('laserquelle').count()).toBe(2);
    db.close();
  });

  it('neue Datenbank startet direkt in Version 2 mit Startbibliothek', async () => {
    const db = new UkpDb(NAME);
    await db.open();
    expect(db.verno).toBe(2);
    expect(await db.materials.count()).toBe(12);
    db.close();
  });
});
