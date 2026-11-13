import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { applyMergePlan, countRecords, currentExport, hasUserData, readAllData, resetAllData } from './exchange';
import { experimentsRepo, materialsRepo, seriesRepo } from './repos';
import { _resetDeviceIdCache, getSetting, setSetting } from './repos/settings';
import { planMerge } from '../core/exchange/importMerge';
import { parseExport } from '../core/exchange/schema';
import { serializeExport } from '../core/exchange/exportJson';

beforeEach(async () => {
  db.close();
  await db.delete();
  _resetDeviceIdCache();
  await db.open();
});

describe('Export/Import mit Datenbank', () => {
  it('Export → frisches Gerät → Import ergibt denselben Stand', async () => {
    expect(await hasUserData()).toBe(false);
    const s = await seriesRepo.create({ code: 'B1', titel: 'Schwelle', status: 'laufend' });
    await experimentsRepo.create({ versuchsId: 'B1-Si-001', seriesId: s.id, datum: '2026-11-13', params: { pAvg: 10 }, tags: ['a'], status: 'durchgefuehrt' });
    const gone = await experimentsRepo.create({ versuchsId: 'B1-Si-002', seriesId: s.id, datum: '2026-11-13', params: {}, tags: [], status: 'geplant' });
    await experimentsRepo.remove(gone.id);
    expect(await hasUserData()).toBe(true);
    const text = serializeExport(await currentExport());
    const before = await readAllData();

    await resetAllData();
    expect(await hasUserData()).toBe(false);
    expect((await countRecords()).materials).toBe(12);

    const parsed = parseExport(text, 1);
    expect(parsed.issues).toEqual([]);
    const plan = planMerge(await readAllData(), parsed.file!.data);
    expect(plan.counts.experiments.neu).toBe(2);
    expect(plan.counts.materials.unveraendert).toBe(12);
    await applyMergePlan(plan);
    expect(await readAllData()).toEqual(before);
    // Tombstone bleibt erhalten
    expect((await experimentsRepo.get(gone.id))?.deleted).toBe(true);
    expect((await countRecords()).experiments).toBe(1);
  });

  it('geänderter Seed-Werkstoff gilt als Nutzerdaten; Reset behält Geräte-ID', async () => {
    const si = (await materialsRepo.listSorted()).find((m) => m.kurz === 'Si')!;
    await new Promise((r) => setTimeout(r, 2));
    await materialsRepo.update(si.id, { notizen: 'x' });
    expect(await hasUserData()).toBe(true);
    await setSetting('deviceName', 'Laptop');
    const id = await getSetting('deviceId');
    await resetAllData();
    expect(await getSetting('deviceId')).toBe(id);
    expect(await getSetting('deviceName')).toBe('Laptop');
  });
});
