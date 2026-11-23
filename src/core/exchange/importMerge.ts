/**
 * Import-Merge gemäß docs/05_export-sync.md:
 * 1. Abgleich über `id` (UUID), nicht über Namen.
 * 2. Unbekannte `id` → einfügen.
 * 3. Bekannte `id` → neuerer `updatedAt` gewinnt (last-writer-wins); Gleichstand → nichts tun.
 * 4. Tombstones wie normale Änderungen (neuerer Tombstone löscht).
 * 5. Gleiche `versuchsId` bzw. `probenId` bei verschiedener UUID → beide behalten, importierte bekommt Suffix `-K1`
 *    (…`-K2`). Gleiches Versuchsart-Kürzel → importierte Art bekommt `K1` ohne Bindestrich (Bindestrich ist ID-Trenner).
 * 6. Bericht: neu / aktualisiert / gelöscht / unverändert / lokal neuer / Konflikte.
 * 7. Alle Versuche aus der Datei gelten als exportiert → `idFixiert` (ohne neuen `updatedAt`).
 */
import { SYNC_TABLES, type Base, type SyncTable } from '../../data/types';
import { emptyData, type ExportData } from './schema';

export interface TableCounts {
  neu: number;
  aktualisiert: number;
  geloescht: number;
  unveraendert: number;
  /** lokal neuer als in der Datei → lokaler Stand bleibt */
  lokalNeuer: number;
}

/** Doppelter Schlüssel (Proben-ID, Kürzel) bei verschiedenen UUIDs. */
export interface KeyConflict {
  wert: string;
  umbenanntIn: string;
  /** UUID des importierten (umbenannten) Datensatzes */
  id: string;
  /** UUID des lokalen Datensatzes mit demselben Schlüssel */
  lokalId: string;
}

export interface IdConflict extends Omit<KeyConflict, 'wert'> {
  versuchsId: string;
}

export interface MergePlan {
  /** zu schreibende Datensätze (put) */
  puts: ExportData;
  counts: Record<SyncTable, TableCounts>;
  conflicts: IdConflict[];
  /** Konflikte bei Proben-IDs (importierte Probe umbenannt) */
  probenConflicts: KeyConflict[];
  /** Konflikte bei Versuchsart-Kürzeln (importierte Art umbenannt) */
  artConflicts: KeyConflict[];
  /** lokale Versuche, die in der Datei vorkommen und noch nicht `idFixiert` sind (ohne neuen Zeitstempel markieren) */
  fixieren: string[];
  /** Reihen-Codes, die nach dem Import mehrfach vorkommen (nicht automatisch umbenannt) */
  seriesCodeConflicts: string[];
  /** true, wenn keine Datensätze zu schreiben sind (`fixieren` wird trotzdem angewendet) */
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

  // Was aus einer Datei kommt, hat ein Gerät per Export verlassen: Versuchs-ID ab jetzt fest.
  puts.experiments = puts.experiments.map((e) => (e.idFixiert ? e : { ...e, idFixiert: true }));
  const localExp = new Map(local.experiments.map((e) => [e.id, e]));
  const putExpIds = new Set(puts.experiments.map((e) => e.id));
  const fixieren = [...new Set(incoming.experiments.map((e) => e.id))].filter((id) => {
    const l = localExp.get(id);
    return l !== undefined && !l.idFixiert && !putExpIds.has(id);
  });

  const conflicts = resolveKeyConflicts(local.experiments, puts.experiments, (e) => e.versuchsId, (e, v) => ({ ...e, versuchsId: v }), (v, k) => `${v}-K${k}`, opts).map(
    ({ wert, ...c }) => ({ versuchsId: wert, ...c }),
  );
  const probenConflicts = resolveKeyConflicts(local.samples, puts.samples, (s) => s.probenId, (s, v) => ({ ...s, probenId: v }), (v, k) => `${v}-K${k}`, opts);
  const artConflicts = resolveKeyConflicts(local.versuchsarten, puts.versuchsarten, (a) => a.kuerzel, (a, v) => ({ ...a, kuerzel: v }), (v, k) => `${v}K${k}`, opts);
  // `fixieren` ändert keine Daten (nur den Exportzustand) und zählt deshalb nicht als Änderung
  const empty = SYNC_TABLES.every((t) => puts[t].length === 0);
  return {
    puts,
    counts,
    conflicts,
    probenConflicts,
    artConflicts,
    fixieren,
    seriesCodeConflicts: duplicateSeriesCodes(local, puts),
    empty,
  };
}

/**
 * Prüft den Endstand (lokal + Änderungen) auf doppelte Schlüssel (Versuchs-ID, Proben-ID, Kürzel) nicht gelöschter
 * Datensätze. Der importierte Datensatz wird umbenannt (`rename(wert, 1)`, `rename(wert, 2)` …) und bekommt einen neuen
 * Zeitstempel, damit die Umbenennung beim nächsten Abgleich auch auf die anderen Geräte gelangt.
 */
function resolveKeyConflicts<T extends Base>(
  localRecs: T[],
  putRecs: T[],
  key: (r: T) => string,
  withKey: (r: T, v: string) => T,
  rename: (v: string, k: number) => string,
  opts: { now?: Date; deviceId?: string },
): KeyConflict[] {
  const final = new Map<string, T>(localRecs.map((e) => [e.id, e]));
  const putIds = new Set(putRecs.map((e) => e.id));
  for (const e of putRecs) final.set(e.id, e);

  // Belegte Schlüssel (lokal unveränderte zuerst, damit lokale Namen Vorrang haben)
  const owner = new Map<string, string>();
  const used = new Set<string>();
  for (const e of final.values()) {
    used.add(key(e));
    if (!e.deleted && !putIds.has(e.id)) owner.set(key(e), e.id);
  }

  const conflicts: KeyConflict[] = [];
  const stamp = (opts.now ?? new Date()).toISOString();
  putRecs.forEach((e, i) => {
    if (e.deleted) return;
    const v = key(e);
    const other = owner.get(v);
    if (other === undefined || other === e.id) {
      owner.set(v, e.id);
      return;
    }
    let k = 1;
    while (used.has(rename(v, k))) k++;
    const neu = rename(v, k);
    used.add(neu);
    owner.set(neu, e.id);
    conflicts.push({ wert: v, umbenanntIn: neu, id: e.id, lokalId: other });
    putRecs[i] = { ...withKey(e, neu), updatedAt: stamp, deviceId: opts.deviceId ?? e.deviceId };
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
