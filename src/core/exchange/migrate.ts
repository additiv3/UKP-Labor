/**
 * Schema-Migrationen als reine Funktionen. Genutzt von der Dexie-Migration (src/data/db.ts) und beim Import
 * älterer Exportdateien (schema.ts → parseExport), damit beide Wege denselben Stand erzeugen.
 *
 * Migrationen ändern `updatedAt` nicht: Derselbe alte Datensatz wird auf jedem Gerät identisch umgeschrieben,
 * der Abgleich (last-writer-wins) bleibt unberührt.
 */
import type { SyncTable } from '../../data/types';
import { nextProbenId, sanitizeIdPart } from '../ids';

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

/** Kürzel für Proben-IDs aus einem Werkstoff (fehlt es, „P“). */
function probenKurz(material: Rec | undefined): string {
  const k = typeof material?.kurz === 'string' ? sanitizeIdPart(material.kurz) : '';
  return k || 'P';
}

/**
 * Schema 2 → 3, Proben: Jede Probe ohne `probenId` bekommt `<Werkstoffkürzel>-<NNN>`, vergeben in `createdAt`-Reihenfolge
 * (bei Gleichstand nach `id`) je Kürzel, nach den schon vorhandenen Proben-IDs. Gelöschte Proben zählen mit.
 * Versuche behalten ihre `versuchsId`; `versuchsartId` bleibt leer. Gibt die geänderten Proben zurück.
 */
export function assignProbenIds(materials: readonly unknown[], samples: readonly unknown[]): Rec[] {
  const mats = new Map<string, Rec>();
  for (const m of materials) if (isRec(m) && typeof m.id === 'string') mats.set(m.id, m);
  const recs = samples.filter(isRec);
  const used: string[] = recs.map((s) => s.probenId).filter((x): x is string => typeof x === 'string' && x !== '');
  const open = recs
    .filter((s) => typeof s.probenId !== 'string' || s.probenId === '')
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
  for (const s of open) {
    const id = nextProbenId(used, probenKurz(mats.get(String(s.materialId))));
    s.probenId = id;
    used.push(id);
  }
  return open;
}

/** Einen Datensatz einer Tabelle von `fromVersion` auf den aktuellen Stand bringen (verändert `rec`). */
export function upgradeRecord(table: SyncTable, rec: unknown, fromVersion: number): unknown {
  if (!isRec(rec)) return rec;
  if (fromVersion < 2 && table === 'components') migrateComponentV1toV2(rec);
  return rec;
}

/**
 * Alle Tabellen einer Exportdatei von `fromVersion` auf den aktuellen Stand bringen (verändert die Datensätze).
 * Erst je Datensatz, dann tabellenübergreifend (Proben-IDs brauchen die Werkstoffe).
 */
export function upgradeData(data: Partial<Record<SyncTable, unknown[]>>, fromVersion: number): void {
  for (const [t, arr] of Object.entries(data) as [SyncTable, unknown[] | undefined][]) {
    arr?.forEach((rec) => upgradeRecord(t, rec, fromVersion));
  }
  if (fromVersion < 3) assignProbenIds(data.materials ?? [], data.samples ?? []);
}
