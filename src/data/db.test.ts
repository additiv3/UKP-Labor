import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { materialsRepo, seriesRepo } from './repos';
import { _resetDeviceIdCache, getDeviceId } from './repos/settings';

beforeEach(async () => {
  db.close();
  await db.delete();
  _resetDeviceIdCache();
  await db.open();
});

describe('Dexie-Schema', () => {
  it('legt alle Tabellen an', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['components', 'experiments', 'litValues', 'materials', 'notes', 'samples', 'series', 'settings', 'systems'].sort(),
    );
  });

  it('füllt die Startbibliothek ohne Zahlenwerte', async () => {
    const mats = await materialsRepo.list();
    expect(mats).toHaveLength(12);
    for (const m of mats) {
      expect(m.seed).toBe(true);
      expect(m.bandluecke).toBeUndefined();
      expect(m.dichte).toBeUndefined();
    }
    expect(mats.map((m) => m.kurz)).toContain('Si');
  });

  it('Geräte-ID ist stabil', async () => {
    const a = await getDeviceId();
    _resetDeviceIdCache();
    expect(await getDeviceId()).toBe(a);
  });

  it('Repository setzt Zeitstempel, aktualisiert und löscht weich', async () => {
    const s = await seriesRepo.create({ code: 'B1', titel: 'Schwelle Si', status: 'geplant' });
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.createdAt).toBe(s.updatedAt);
    expect(s.deviceId).toBe(await getDeviceId());

    await new Promise((r) => setTimeout(r, 5));
    const u = await seriesRepo.update(s.id, { status: 'laufend' });
    expect(u.status).toBe('laufend');
    expect(u.updatedAt > s.updatedAt).toBe(true);
    expect(u.createdAt).toBe(s.createdAt);

    await seriesRepo.remove(s.id);
    expect(await seriesRepo.list()).toHaveLength(0);
    const tomb = await seriesRepo.get(s.id);
    expect(tomb?.deleted).toBe(true);
  });
});

describe('Repository-Abfragen', () => {
  it('Komponenten je Anlage, Kaskadenlöschung', async () => {
    const { systemsRepo, componentsRepo, removeSystemCascade } = await import('./repos');
    const s = await systemsRepo.create({ name: 'Anlage A' });
    await componentsRepo.create({ systemId: s.id, typ: 'optik', name: 'F-Theta', params: { brennweite: 0.1 } });
    await componentsRepo.create({ systemId: s.id, typ: 'laserquelle', name: 'Laser', params: { wellenlaengen: [1030e-9] } });
    expect((await componentsRepo.bySystem(s.id)).map((c) => c.name)).toEqual(['F-Theta', 'Laser']);
    await removeSystemCascade(s.id);
    expect(await componentsRepo.bySystem(s.id)).toHaveLength(0);
    expect(await systemsRepo.listSorted()).toHaveLength(0);
  });
  it('Literaturwerte und Proben je Werkstoff', async () => {
    const { materialsRepo, litValuesRepo, samplesRepo, removeMaterialCascade } = await import('./repos');
    const m = (await materialsRepo.listSorted()).find((x) => x.kurz === 'Si')!;
    await litValuesRepo.create({ materialId: m.id, groesse: 'Fth', wert: 2000, einheit: 'J/cm²', citekey: 'bonse2002' });
    await samplesRepo.create({ materialId: m.id, bezeichnung: 'Wafer 1' });
    expect(await litValuesRepo.byMaterial(m.id)).toHaveLength(1);
    expect(await samplesRepo.byMaterial(m.id)).toHaveLength(1);
    await removeMaterialCascade(m.id);
    expect(await litValuesRepo.byMaterial(m.id)).toHaveLength(0);
    expect((await materialsRepo.listSorted()).some((x) => x.id === m.id)).toBe(false);
  });
});
