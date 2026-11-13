/**
 * Datenzugriff für Export/Import. Einzige Stelle, die für den Austausch direkt auf Dexie zugreift.
 */
import { db, SCHEMA_VERSION } from './db';
import { SYNC_TABLES, type SyncTable } from './types';
import { seedMaterials } from './seed';
import { getDeviceId, getSetting, setSetting } from './repos/settings';
import { emptyData, type ExportData, type ExportFile } from '../core/exchange/schema';
import { buildExport } from '../core/exchange/exportJson';
import type { MergePlan } from '../core/exchange/importMerge';

function table(t: SyncTable) {
  return db.table(t);
}

/** Alle synchronisierten Datensätze inkl. Tombstones. */
export async function readAllData(): Promise<ExportData> {
  const out = emptyData();
  await db.transaction('r', SYNC_TABLES.map(table), async () => {
    for (const t of SYNC_TABLES) (out[t] as unknown[]) = await table(t).toArray();
  });
  return out;
}

/** Aktueller Gesamtstand als Exportdatei. */
export async function currentExport(): Promise<ExportFile> {
  return buildExport(await readAllData(), {
    schemaVersion: SCHEMA_VERSION,
    deviceId: await getDeviceId(),
    deviceName: await getSetting('deviceName'),
  });
}

/** Merge-Plan in einer Transaktion anwenden (alles oder nichts). */
export async function applyMergePlan(plan: MergePlan): Promise<void> {
  await db.transaction('rw', SYNC_TABLES.map(table), async () => {
    for (const t of SYNC_TABLES) {
      if (plan.puts[t].length) await table(t).bulkPut(plan.puts[t]);
    }
  });
}

export async function markExported(): Promise<void> {
  await setSetting('lastExportAt', new Date().toISOString());
}

/** true, wenn es Daten außer der Startbibliothek gibt (für die Backup-Erinnerung). */
export async function hasUserData(): Promise<boolean> {
  for (const t of SYNC_TABLES) {
    const n = await table(t)
      .filter((r: { seed?: boolean; createdAt: string; updatedAt: string }) => !(r.seed && r.createdAt === r.updatedAt))
      .count();
    if (n > 0) return true;
  }
  return false;
}

/** Anzahl nicht gelöschter Datensätze je Tabelle. */
export async function countRecords(): Promise<Record<SyncTable, number>> {
  const out = {} as Record<SyncTable, number>;
  for (const t of SYNC_TABLES) out[t] = await table(t).filter((r: { deleted?: boolean }) => !r.deleted).count();
  return out;
}

/** Alle Daten auf diesem Gerät löschen (hart) und die Startbibliothek neu anlegen. Geräte-ID und -name bleiben. */
export async function resetAllData(): Promise<void> {
  await db.transaction('rw', [...SYNC_TABLES.map(table), db.settings], async () => {
    for (const t of SYNC_TABLES) await table(t).clear();
    await db.materials.bulkAdd(seedMaterials());
    for (const k of ['calculator', 'defaultSystemId', 'lastExportAt', 'masterDir', 'lastMasterSyncAt']) await db.settings.delete(k);
  });
}
