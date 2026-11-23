/**
 * Hauptlogbuch im Sync-Ordner (Laptop, File System Access API): logbuch.json + logbuch.csv.
 */
import { buildCsv } from '../core/exchange/exportCsv';
import { MASTER_CSV, MASTER_JSON, serializeExport } from '../core/exchange/exportJson';
import { currentExport, fixExportedIds } from './exchange';
import { setSetting } from './repos/settings';

/** Minimal benötigte Teile eines Ordner-Handles (erleichtert Tests). */
export type DirHandle = Pick<FileSystemDirectoryHandle, 'name' | 'getFileHandle'>;

export async function readTextIfExists(dir: DirHandle, name: string): Promise<string | undefined> {
  try {
    const fh = await dir.getFileHandle(name);
    return await (await fh.getFile()).text();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return undefined;
    throw e;
  }
}

export async function writeText(dir: DirHandle, name: string, text: string): Promise<void> {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

export async function readMaster(dir: DirHandle): Promise<string | undefined> {
  return readTextIfExists(dir, MASTER_JSON);
}

/** Aktuellen Gesamtstand als logbuch.json + logbuch.csv schreiben (überschreibt). */
export async function writeMaster(dir: DirHandle): Promise<void> {
  // Vor dem Serialisieren, damit logbuch.json die festgeschriebenen IDs schon enthält
  await fixExportedIds();
  const f = await currentExport();
  await writeText(dir, MASTER_JSON, serializeExport(f));
  await writeText(dir, MASTER_CSV, buildCsv(f.data));
  const now = new Date().toISOString();
  await setSetting('lastMasterSyncAt', now);
  await setSetting('lastExportAt', now);
}
