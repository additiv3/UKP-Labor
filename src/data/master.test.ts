import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { readMaster, writeMaster, type DirHandle } from './master';
import { applyMergePlan, readAllData } from './exchange';
import { experimentsRepo, seriesRepo } from './repos';
import { _resetDeviceIdCache, getSetting } from './repos/settings';
import { parseExport } from '../core/exchange/schema';
import { planMerge } from '../core/exchange/importMerge';

/** Nachgebauter Ordner (Map Dateiname → Inhalt) mit der Schnittstelle der File System Access API. */
function fakeDir(files = new Map<string, string>()): DirHandle & { files: Map<string, string> } {
  return {
    name: 'Logbuch',
    files,
    async getFileHandle(name: string, opts?: { create?: boolean }) {
      if (!files.has(name)) {
        if (!opts?.create) throw new DOMException('nicht gefunden', 'NotFoundError');
        files.set(name, '');
      }
      return {
        getFile: async () => new File([files.get(name)!], name),
        createWritable: async () => {
          let buf = '';
          return { write: async (t: string) => void (buf += t), close: async () => void files.set(name, buf) };
        },
      } as unknown as FileSystemFileHandle;
    },
  };
}

beforeEach(async () => {
  db.close();
  await db.delete();
  _resetDeviceIdCache();
  await db.open();
});

describe('Hauptlogbuch', () => {
  it('legt logbuch.json + logbuch.csv an und gleicht beim nächsten Mal ab', async () => {
    const dir = fakeDir();
    expect(await readMaster(dir)).toBeUndefined();
    const s = await seriesRepo.create({ code: 'B1', titel: 'x', status: 'laufend' });
    await experimentsRepo.create({ versuchsId: 'B1-Si-001', seriesId: s.id, datum: '2026-11-13', params: {}, tags: [], status: 'durchgefuehrt' });
    await writeMaster(dir);
    expect(dir.files.get('logbuch.csv')!.split('\r\n')[1]).toMatch(/^B1-Si-001;/);
    expect(await getSetting('lastMasterSyncAt')).toBeDefined();
    expect(await getSetting('lastExportAt')).toBeDefined();

    // Anderes Gerät ergänzt einen Versuch in der Datei
    const j = JSON.parse((await readMaster(dir))!);
    j.data.experiments.push({ ...j.data.experiments[0], id: '11111111-1111-4111-8111-111111111111', versuchsId: 'B1-Si-002' });
    dir.files.set('logbuch.json', JSON.stringify(j));

    const parsed = parseExport((await readMaster(dir))!, 1);
    const plan = planMerge(await readAllData(), parsed.file!.data);
    expect(plan.counts.experiments.neu).toBe(1);
    await applyMergePlan(plan);
    await writeMaster(dir);
    const after = JSON.parse(dir.files.get('logbuch.json')!);
    expect(after.data.experiments.map((e: { versuchsId: string }) => e.versuchsId).sort()).toEqual(['B1-Si-001', 'B1-Si-002']);
    expect(dir.files.get('logbuch.csv')!.trim().split('\r\n')).toHaveLength(3);
  });
});
