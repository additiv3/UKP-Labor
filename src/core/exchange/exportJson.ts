import { SYNC_TABLES } from '../../data/types';
import { FORMEL_VERSION } from '../physics/version';
import { APP_ID, type ExportData, type ExportFile } from './schema';

/** Vollständiger Export inkl. Tombstones. */
export function buildExport(
  data: ExportData,
  meta: { schemaVersion: number; deviceId: string; deviceName?: string; now?: Date },
): ExportFile {
  const sorted = Object.fromEntries(
    SYNC_TABLES.map((t) => [t, [...data[t]].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))]),
  ) as ExportData;
  return {
    app: APP_ID,
    schemaVersion: meta.schemaVersion,
    formelVersion: FORMEL_VERSION,
    exportedAt: (meta.now ?? new Date()).toISOString(),
    deviceId: meta.deviceId,
    deviceName: meta.deviceName || undefined,
    data: sorted,
  };
}

export function serializeExport(f: ExportFile): string {
  return `${JSON.stringify(f, null, 1)}\n`;
}

/** Gerätename für Dateinamen: Kleinbuchstaben, Ziffern, Bindestrich. */
export function fileSafe(s: string | undefined): string {
  const t = (s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return t || 'geraet';
}

/** `JJJJMMTT` in lokaler Zeit. */
export function yyyymmdd(d = new Date()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** `JJJJMMTT_ukp-labor_<geraet>.json` */
export function exportFileName(deviceName: string | undefined, d = new Date(), ext: 'json' | 'csv' = 'json'): string {
  return `${yyyymmdd(d)}_ukp-labor_${fileSafe(deviceName)}.${ext}`;
}

export const MASTER_JSON = 'logbuch.json';
export const MASTER_CSV = 'logbuch.csv';
