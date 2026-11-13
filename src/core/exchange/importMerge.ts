/**
 * Import-Merge gemäß docs/05_export-sync.md:
 * 1. Abgleich über `id` (UUID), nicht über Namen.
 * 2. Unbekannte `id` → einfügen.
 * 3. Bekannte `id` → neuerer `updatedAt` gewinnt (last-writer-wins); Gleichstand → nichts tun.
 * 4. Tombstones wie normale Änderungen (neuerer Tombstone löscht).
 * 5. Gleiche `versuchsId` bei verschiedener UUID → beide behalten, importierte bekommt Suffix `-K1` (…`-K2`).
 * 6. Bericht: neu / aktualisiert / gelöscht / unverändert / lokal neuer / Konflikte.
 */
import { SYNC_TABLES, type Experiment, type SyncTable } from '../../data/types';
import { emptyData, type ExportData } from './schema';

export interface TableCounts {
  neu: number;
  aktualisiert: number;
  geloescht: number;
  unveraendert: number;
  /** lokal neuer als in der Datei → lokaler Stand bleibt */
  lokalNeuer: number;
}

export interface IdConflict {
  versuchsId: string;
  umbenanntIn: string;
  /** UUID des importierten (umbenannten) Versuchs */
  id: string;
  /** UUID des lokalen Versuchs mit derselben Versuchs-ID */
  lokalId: string;
}

export interface MergePlan {
  /** zu schreibende Datensätze (put) */
  puts: ExportData;
  counts: Record<SyncTable, TableCounts>;
  conflicts: IdConflict[];
  /** Reihen-Codes, die nach dem Import mehrfach vorkommen (nicht automatisch umbenannt) */
  seriesCodeConflicts: string[];
  /** true, wenn nichts zu schreiben ist */
  empty: boolean;
}

const zero = (): TableCounts => ({ neu: 0, aktualisiert: 0, geloescht: 0, unveraendert: 0, lokalNeuer: 0 });

function time(s: string): number {
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

export function planMerge(
  local: ExportData,
  incoming: ExportData,
  opts: { now?: Date; deviceId?: string } = {},
): MergePlan {
  const puts = emptyData();
  const counts = Object.fromEntries(SYNC_TABLES.map((t) => [t, zero()])) as Record<SyncTable, TableCounts>;

  for (const t of SYNC_TABLES) {
    const localById = new Map<string, { updatedAt: string; deleted?: boolean }>(local[t].map((r) => [r.id, r]));
    // Doppelte IDs in der Datei: der neueste Stand zählt
    const inc = new Map<string, (typeof incoming)[typeof t][number]>();
    for (const r of incoming[t]) {
      const prev = inc.get(r.id);
      if (!prev || time(r.updatedAt) > time(prev.updatedAt)) inc.set(r.id, r);
    }
    for (const r of inc.values()) {
      const l = localById.get(r.id);
      const c = counts[t];
      if (!l) {
        (puts[t] as unknown[]).push(r);
        c.neu++;
        continue;
      }
      const dt = time(r.updatedAt) - time(l.updatedAt);
      if (dt > 0) {
        (puts[t] as unknown[]).push(r);
        if (r.deleted && !l.deleted) c.geloescht++;
        else c.aktualisiert++;
      } else if (dt === 0) c.unveraendert++;
      else c.lokalNeuer++;
    }
  }

  const conflicts = resolveVersuchsIdConflicts(local.experiments, puts.experiments, opts);
  const empty = SYNC_TABLES.every((t) => puts[t].length === 0);
  return { puts, counts, conflicts, seriesCodeConflicts: duplicateSeriesCodes(local, puts), empty };
}

/**
 * Prüft den Endstand (lokal + Änderungen) auf doppelte Versuchs-IDs nicht gelöschter Versuche.
 * Der importierte Versuch wird umbenannt (`-K1`, `-K2` …) und bekommt einen neuen Zeitstempel,
 * damit die Umbenennung beim nächsten Abgleich auch auf die anderen Geräte gelangt.
 */
function resolveVersuchsIdConflicts(
  localExps: Experiment[],
  putExps: Experiment[],
  opts: { now?: Date; deviceId?: string },
): IdConflict[] {
  const final = new Map<string, Experiment>(localExps.map((e) => [e.id, e]));
  const putIds = new Set(putExps.map((e) => e.id));
  for (const e of putExps) final.set(e.id, e);

  // Belegte Versuchs-IDs (lokal unveränderte zuerst, damit lokale Namen Vorrang haben)
  const owner = new Map<string, string>();
  const used = new Set<string>();
  for (const e of final.values()) {
    used.add(e.versuchsId);
    if (!e.deleted && !putIds.has(e.id)) owner.set(e.versuchsId, e.id);
  }

  const conflicts: IdConflict[] = [];
  const stamp = (opts.now ?? new Date()).toISOString();
  putExps.forEach((e, i) => {
    if (e.deleted) return;
    const other = owner.get(e.versuchsId);
    if (other === undefined || other === e.id) {
      owner.set(e.versuchsId, e.id);
      return;
    }
    let k = 1;
    while (used.has(`${e.versuchsId}-K${k}`)) k++;
    const neu = `${e.versuchsId}-K${k}`;
    used.add(neu);
    owner.set(neu, e.id);
    conflicts.push({ versuchsId: e.versuchsId, umbenanntIn: neu, id: e.id, lokalId: other });
    putExps[i] = { ...e, versuchsId: neu, updatedAt: stamp, deviceId: opts.deviceId ?? e.deviceId };
  });
  return conflicts;
}

/** Reihen-Codes, die im Endstand von mehreren nicht gelöschten Reihen verwendet werden und durch den Import entstehen. */
function duplicateSeriesCodes(local: ExportData, puts: ExportData): string[] {
  if (puts.series.length === 0) return [];
  const final = new Map(local.series.map((s) => [s.id, s]));
  for (const s of puts.series) final.set(s.id, s);
  const byCode = new Map<string, number>();
  for (const s of final.values()) if (!s.deleted) byCode.set(s.code, (byCode.get(s.code) ?? 0) + 1);
  const touched = new Set(puts.series.filter((s) => !s.deleted).map((s) => s.code));
  return [...byCode].filter(([c, n]) => n > 1 && touched.has(c)).map(([c]) => c).sort();
}

/** Summe über alle Tabellen (für Kurzbericht). */
export function totalCounts(plan: MergePlan): TableCounts {
  const s = zero();
  for (const t of SYNC_TABLES) {
    const c = plan.counts[t];
    s.neu += c.neu;
    s.aktualisiert += c.aktualisiert;
    s.geloescht += c.geloescht;
    s.unveraendert += c.unveraendert;
    s.lokalNeuer += c.lokalNeuer;
  }
  return s;
}
