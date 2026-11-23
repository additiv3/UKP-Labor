/**
 * CSV-Export der Versuche (flach, eine Zeile pro Versuch) gemäß docs/05_export-sync.md:
 * Trennzeichen „;“, UTF-8 mit BOM, Dezimalpunkt, Labor-Einheiten im Spaltenkopf.
 */
import type { Experiment } from '../../data/types';
import { experimentSnapshot } from '../logbook';
import type { ExportData } from './schema';

export const CSV_COLUMNS = [
  'versuchsId', 'art', 'datum', 'reihe', 'material', 'probe', 'probenFeld', 'anlage', 'station', 'laser', 'optik',
  'lambda_nm', 'tau_fs', 'pAvg_W', 'ePuls_uJ', 'fRep_kHz', 'transmission', 'w0_um', 'w0Quelle', 'w0Beleg', 'fokuslage_um',
  'v_mm_s', 'pulsabstand_um', 'hatch_um', 'nPulse', 'ueberfahrten', 'F0_J_cm2', 'OL', 'N2D', 'burstN', 'fBurst_MHz', 'F0Sub_J_cm2',
  'strategie', 'atmosphaere', 'tags', 'status', 'bemerkung', 'id', 'updatedAt',
] as const;

/** Zahl mit Dezimalpunkt, max. 10 signifikante Stellen, ohne Exponent bei üblichen Größen. */
export function csvNumber(x: number | undefined, scale = 1): string {
  if (x === undefined || !Number.isFinite(x)) return '';
  const v = Number((x * scale).toPrecision(10));
  const s = String(v);
  if (!/e/i.test(s)) return s;
  // sehr kleine/große Werte: ausgeschrieben, damit Excel/pandas es sicher lesen
  return v.toFixed(Math.min(20, Math.max(0, -Math.floor(Math.log10(Math.abs(v))) + 9))).replace(/\.?0+$/, '');
}

/** Feld quoten, wenn nötig (Trennzeichen, Anführungszeichen, Zeilenumbruch). */
export function csvField(s: string | undefined): string {
  const t = s ?? '';
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function row(e: Experiment, d: ExportData): string[] {
  const p = e.params;
  const name = <T extends { id: string }>(arr: T[], id: string | undefined, f: (x: T) => string) => {
    const x = id ? arr.find((r) => r.id === id) : undefined;
    return x ? f(x) : '';
  };
  // Snapshot bevorzugen (Stand beim Speichern); fehlt er, neu berechnen.
  const w = e.abgeleitet?.werte ?? experimentSnapshot(p).werte;
  return [
    e.versuchsId,
    name(d.versuchsarten, e.versuchsartId, (a) => a.kuerzel),
    e.datum,
    name(d.series, e.seriesId, (s) => s.code),
    name(d.materials, e.materialId, (m) => m.name),
    name(d.samples, e.sampleId, (s) => s.probenId),
    e.probenFeld ?? '',
    name(d.systems, e.systemId, (s) => s.name),
    name(d.components, e.stationId, (c) => c.name),
    name(d.components, e.laserId, (c) => c.name),
    name(d.components, e.optikId, (c) => c.name),
    csvNumber(p.lambda, 1e9),
    csvNumber(p.tau, 1e15),
    csvNumber(p.pAvg ?? w.pAvgQuelle),
    csvNumber(p.ePuls ?? w.ePulsQuelle, 1e6),
    csvNumber(p.fRep, 1e-3),
    csvNumber(p.transmission),
    csvNumber(p.w0, 1e6),
    p.w0Quelle ?? '',
    p.w0Beleg ?? '',
    csvNumber(p.fokuslage, 1e6),
    csvNumber(p.v, 1e3),
    csvNumber(p.pulsabstand ?? w.dx, 1e6),
    csvNumber(p.hatch, 1e6),
    csvNumber(p.nPulse),
    csvNumber(p.ueberfahrten),
    csvNumber(w.F0, 1e-4),
    csvNumber(w.OL),
    csvNumber(w.N2D),
    csvNumber(w.nBurst),
    csvNumber(p.burst?.freq, 1e-6),
    csvNumber(w.F0Sub, 1e-4),
    p.strategie ?? '',
    p.atmosphaere ?? '',
    e.tags.join(','),
    e.status,
    e.bemerkung ?? '',
    e.id,
    e.updatedAt,
  ].map(csvField);
}

/** CSV-Text inkl. BOM; nur nicht gelöschte Versuche, sortiert nach Versuchs-ID. */
export function buildCsv(d: ExportData): string {
  const lines = [CSV_COLUMNS.join(';')];
  const exps = d.experiments
    .filter((e) => !e.deleted)
    .sort((a, b) => a.versuchsId.localeCompare(b.versuchsId, 'de', { numeric: true }));
  for (const e of exps) lines.push(row(e, d).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
