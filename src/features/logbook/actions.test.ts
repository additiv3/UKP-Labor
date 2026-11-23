import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { experimentsRepo, materialsRepo, samplesRepo, seriesRepo, versuchsartenRepo } from '../../data/repos';
import { _resetDeviceIdCache } from '../../data/repos/settings';
import { fixExportedIds, resetAllData } from '../../data/exchange';
import { createEmptyExperiment, defaultArtId, duplicate } from './actions';

beforeEach(async () => {
  db.close();
  await db.delete();
  _resetDeviceIdCache();
  await db.open();
});

const artId = async (k: string) => (await versuchsartenRepo.listSorted()).find((a) => a.kuerzel === k)!.id;

describe('Versuchs-IDs mit Versuchsart', () => {
  it('Standard-Art der Reihe → K-SPOT-001; ohne Standard-Art muss gefragt werden', async () => {
    const spot = await artId('SPOT');
    const k = await seriesRepo.create({ code: 'K', titel: 'Charakterisierung', status: 'laufend', standardVersuchsartId: spot });
    const v0 = await seriesRepo.create({ code: 'V0', titel: 'Vorversuche', status: 'laufend' });
    expect(await defaultArtId(k.id)).toBe(spot);
    expect(await defaultArtId(v0.id)).toBeUndefined();
    const e = await createEmptyExperiment(k.id, spot);
    expect(e.versuchsId).toBe('K-SPOT-001');
    expect(e.versuchsartId).toBe(spot);
  });

  it('Duplizieren zählt weiter, gelöschte Nummern werden nie neu vergeben (Abnahme 4)', async () => {
    const abl = await artId('ABL');
    const v0 = await seriesRepo.create({ code: 'V0', titel: 'Vorversuche', status: 'laufend' });
    const e1 = await createEmptyExperiment(v0.id, abl);
    expect(e1.versuchsId).toBe('V0-ABL-001');
    const e2 = await duplicate(e1);
    expect(e2.versuchsId).toBe('V0-ABL-002');
    await experimentsRepo.remove(e2.id);
    expect((await createEmptyExperiment(v0.id, abl)).versuchsId).toBe('V0-ABL-003');
    // verworfene zählen ebenfalls
    const e4 = await createEmptyExperiment(v0.id, await artId('THR'));
    await experimentsRepo.update(e4.id, { status: 'verworfen' });
    expect((await createEmptyExperiment(v0.id, await artId('THR'))).versuchsId).toBe('V0-THR-002');
  });

  it('Duplikat eines alten Versuchs ohne Art braucht eine Art', async () => {
    const s = await seriesRepo.create({ code: 'B1', titel: '', status: 'laufend' });
    const alt = await experimentsRepo.create({ versuchsId: 'B1-Si-001', seriesId: s.id, datum: '2026-11-01', params: {}, tags: [], status: 'durchgefuehrt' });
    await expect(duplicate(alt)).rejects.toThrow(/Versuchsart/);
    expect((await duplicate(alt, await artId('ABL'))).versuchsId).toBe('B1-ABL-001');
  });

  it('Kürzel-Sperre: Verwendung zählt auch gelöschte Versuche', async () => {
    const abl = await artId('ABL');
    const s = await seriesRepo.create({ code: 'B1', titel: '', status: 'laufend' });
    expect(await versuchsartenRepo.usage(abl)).toEqual({ alle: 0, aktiv: 0 });
    const e = await createEmptyExperiment(s.id, abl);
    await experimentsRepo.remove(e.id);
    expect(await versuchsartenRepo.usage(abl)).toEqual({ alle: 1, aktiv: 0 });
  });
});

describe('Proben-IDs', () => {
  it('FS-001, FS-002 …; gelöschte zählen mit; Werkstoff ohne Kürzel → Fehler', async () => {
    const fs = (await materialsRepo.listSorted()).find((m) => m.kurz === 'FS')!;
    const p1 = await samplesRepo.createForMaterial(fs.id);
    expect(p1.probenId).toBe('FS-001');
    expect(p1.bezeichnung).toBeUndefined();
    const p2 = await samplesRepo.createForMaterial(fs.id, { bezeichnung: 'Wafer' });
    await samplesRepo.remove(p2.id);
    expect((await samplesRepo.createForMaterial(fs.id)).probenId).toBe('FS-003');
    const leer = await materialsRepo.create({ name: 'Neu', kurz: '', klasse: 'glas' });
    await expect(samplesRepo.createForMaterial(leer.id)).rejects.toThrow(/Kürzel/);
  });
});

describe('ID-Fixierung beim Export', () => {
  it('setzt idFixiert ohne neuen updatedAt; Reset legt die Seed-Arten neu an', async () => {
    const s = await seriesRepo.create({ code: 'K', titel: '', status: 'laufend' });
    const e = await createEmptyExperiment(s.id, await artId('SPOT'));
    expect(e.idFixiert).toBeUndefined();
    expect(await fixExportedIds()).toBe(1);
    const after = await experimentsRepo.get(e.id);
    expect(after?.idFixiert).toBe(true);
    expect(after?.updatedAt).toBe(e.updatedAt);
    expect(await fixExportedIds()).toBe(0);
    await resetAllData();
    expect(await versuchsartenRepo.listSorted()).toHaveLength(5);
  });
});
