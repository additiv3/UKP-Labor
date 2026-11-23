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

describe('Dexie-Migration 1 → 3', () => {
  it('schreibt Laser-Wellenlängen um, lässt andere Datensätze und Zeitstempel unverändert', async () => {
    await createV1([
      rec('a', 'laserquelle', { wellenlaengen: [1030e-9, 343e-9], pMax: 6, m2: 1.2 }),
      rec('b', 'optik', { brennweite: 0.1 }),
      rec('c', 'laserquelle', { wellenlaengen: [] }),
    ]);
    const db = new UkpDb(NAME);
    await db.open();
    expect(db.verno).toBe(3);

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

  it('neue Datenbank startet direkt in Version 3 mit Startbibliothek und Versuchsarten', async () => {
    const db = new UkpDb(NAME);
    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.materials.count()).toBe(12);
    db.close();
  });
});

/** Datenbank im Stand von Schema 2 anlegen (wie App-Version 0.10). */
async function createV2() {
  const old = new Dexie(NAME);
  const stores = {
    systems: 'id, name, updatedAt',
    components: 'id, systemId, typ, updatedAt',
    materials: 'id, name, updatedAt',
    litValues: 'id, materialId, updatedAt',
    samples: 'id, materialId, updatedAt',
    series: 'id, code, updatedAt',
    experiments: 'id, versuchsId, seriesId, datum, materialId, updatedAt, *tags',
    notes: 'id, datum, updatedAt, *tags',
    settings: 'key',
  };
  old.version(1).stores(stores);
  old.version(2).stores({ components: stores.components });
  await old.open();
  const r = (id: string, createdAt: string, o: object) => ({ id, createdAt, updatedAt: ts, deviceId: 'altgeraet', ...o });
  await old.table('materials').bulkAdd([
    r('m1', ts, { name: 'Quarzglas', kurz: 'FS', klasse: 'glas' }),
    r('m2', ts, { name: 'Silizium', kurz: 'Si', klasse: 'halbleiter' }),
  ]);
  await old.table('samples').bulkAdd([
    r('s2', '2026-11-09T00:00:00.000Z', { materialId: 'm1', bezeichnung: 'B' }),
    r('s1', '2026-11-08T00:00:00.000Z', { materialId: 'm1', bezeichnung: 'A' }),
    r('s3', '2026-11-07T00:00:00.000Z', { materialId: 'm2', bezeichnung: 'C', deleted: true }),
  ]);
  await old.table('experiments').add(
    r('e1', ts, { versuchsId: 'B1-Si-001', seriesId: 'r1', datum: '2026-11-10', materialId: 'm2', params: {}, tags: [], status: 'durchgefuehrt' }),
  );
  old.close();
}

describe('Dexie-Migration 2 → 3', () => {
  it('vergibt Proben-IDs, Versuche behalten ihre ID, Seed-Versuchsarten werden ergänzt', async () => {
    await createV2();
    const db = new UkpDb(NAME);
    await db.open();
    expect(db.verno).toBe(3);
    expect((await db.samples.toArray()).map((s) => [s.id, s.probenId, s.updatedAt])).toEqual([
      ['s1', 'FS-001', ts],
      ['s2', 'FS-002', ts],
      ['s3', 'Si-001', ts],
    ]);
    expect(await db.samples.where('probenId').equals('FS-002').count()).toBe(1);
    const e = await db.experiments.get('e1');
    expect(e?.versuchsId).toBe('B1-Si-001');
    expect(e?.versuchsartId).toBeUndefined();
    expect((await db.versuchsarten.toArray()).map((a) => a.kuerzel).sort()).toEqual(['ABL', 'CUT', 'PWR', 'SPOT', 'THR']);
    // Startbibliothek der Werkstoffe kommt nicht neu dazu
    expect(await db.materials.count()).toBe(2);
    db.close();
  });

  it('neue Datenbank hat die Seed-Versuchsarten mit festen UUIDs', async () => {
    const db = new UkpDb(NAME);
    await db.open();
    const arten = await db.versuchsarten.toArray();
    expect(arten).toHaveLength(5);
    expect(arten.every((a) => a.seed && a.id.startsWith('5e3d0002-'))).toBe(true);
    db.close();
  });
});
