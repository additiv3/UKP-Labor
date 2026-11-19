/**
 * Schema-Migrationen als reine Funktionen. Genutzt von der Dexie-Migration (src/data/db.ts) und beim Import
 * älterer Exportdateien (schema.ts → parseExport), damit beide Wege denselben Stand erzeugen.
 *
 * Migrationen ändern `updatedAt` nicht: Derselbe alte Datensatz wird auf jedem Gerät identisch umgeschrieben,
 * der Abgleich (last-writer-wins) bleibt unberührt.
 */
import type { SyncTable } from '../../data/types';

type Rec = Record<string, unknown>;

const isRec = (x: unknown): x is Rec => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Schema 1 → 2, Komponenten: `laserquelle.params.wellenlaengen` war `number[]` (m), ist jetzt eine Liste von
 * Objekten `{ id, lambda }`. IDs deterministisch (`w1`, `w2` …), damit alle Geräte dasselbe Ergebnis erzeugen.
 * Bereits migrierte Einträge (Objekte) bleiben unverändert. Gibt `true` zurück, wenn etwas geändert wurde.
 */
export function migrateComponentV1toV2(c: Rec): boolean {
  if (c.typ !== 'laserquelle' || !isRec(c.params)) return false;
  const wl = c.params.wellenlaengen;
  if (!Array.isArray(wl)) {
    c.params.wellenlaengen = [];
    return true;
  }
  if (!wl.some((x) => typeof x === 'number')) return false;
  c.params.wellenlaengen = wl.map((x, i) => (typeof x === 'number' ? { id: `w${i + 1}`, lambda: x } : x));
  return true;
}

/** Einen Datensatz einer Tabelle von `fromVersion` auf den aktuellen Stand bringen (verändert `rec`). */
export function upgradeRecord(table: SyncTable, rec: unknown, fromVersion: number): unknown {
  if (!isRec(rec)) return rec;
  if (fromVersion < 2 && table === 'components') migrateComponentV1toV2(rec);
  return rec;
}
