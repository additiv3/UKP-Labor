/**
 * Matrix-Generator: Versuchsreihe aus einem Parametergitter (z. B. Pulsenergie × Pulszahl).
 * Reine Funktionen, Werte in SI.
 */
import { nextLaufnummer, formatVersuchsId } from './ids';
import { experimentSnapshot, todayIso, type ArtRef } from './logbook';
import type { Experiment, ExperimentParams } from '../data/types';
import type { Quantity } from './physics/units';

/** Parameter, die als Matrixachse taugen (Zahlenfelder der Versuchsparameter). */
export const MATRIX_FIELDS = {
  ePuls: { label: 'Pulsenergie', symbol: 'E_p', quantity: 'energy' },
  pAvg: { label: 'Mittlere Leistung', symbol: 'P_avg', quantity: 'power' },
  transmission: { label: 'Abschwächung', symbol: 'T', quantity: 'fraction' },
  fRep: { label: 'Repetitionsrate', symbol: 'f_rep', quantity: 'frequency' },
  nPulse: { label: 'Pulse pro Ort', symbol: 'N', quantity: 'none' },
  ueberfahrten: { label: 'Überfahrten', symbol: 'N_ü', quantity: 'none' },
  v: { label: 'Scangeschwindigkeit', symbol: 'v', quantity: 'velocity' },
  pulsabstand: { label: 'Pulsabstand', symbol: 'Δx', quantity: 'length' },
  hatch: { label: 'Hatch', symbol: 'h', quantity: 'length' },
  fokuslage: { label: 'Fokuslage', symbol: 'z', quantity: 'length' },
  tau: { label: 'Pulsdauer', symbol: 'τ', quantity: 'time' },
} as const satisfies Partial<Record<keyof ExperimentParams, { label: string; symbol: string; quantity: Quantity }>>;

export type MatrixField = keyof typeof MATRIX_FIELDS;

export interface MatrixAxis {
  field: MatrixField;
  /** Werte in SI */
  values: number[];
}

/** Obergrenze, damit ein Tippfehler nicht tausende Versuche erzeugt. */
export const MATRIX_MAX = 500;

/**
 * Werteliste von `start` bis `end` (inklusive) mit `count` Werten, linear oder logarithmisch.
 * Rundet auf 12 signifikante Stellen (vermeidet 0,30000000000000004).
 */
export function rangeValues(start: number, end: number, count: number, mode: 'lin' | 'log' = 'lin'): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isInteger(count) || count < 1) return [];
  if (count === 1) return [start];
  if (mode === 'log' && (start <= 0 || end <= 0)) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const v = mode === 'log' ? start * (end / start) ** t : start + (end - start) * t;
    out.push(Number(v.toPrecision(12)));
  }
  return out;
}

/** Anzahl der Kombinationen (Produkt der Achsenlängen; leere Achsen zählen nicht). */
export function matrixSize(axes: readonly MatrixAxis[]): number {
  const used = axes.filter((a) => a.values.length > 0);
  return used.length === 0 ? 0 : used.reduce((n, a) => n * a.values.length, 1);
}

/** Kreuzprodukt; erste Achse = äußere Schleife. */
export function combinations(axes: readonly MatrixAxis[]): Partial<Record<MatrixField, number>>[] {
  const used = axes.filter((a) => a.values.length > 0);
  if (used.length === 0) return [];
  let out: Partial<Record<MatrixField, number>>[] = [{}];
  for (const a of used) {
    const next: typeof out = [];
    for (const combo of out) for (const v of a.values) next.push({ ...combo, [a.field]: v });
    out = next;
  }
  return out;
}

/** Fehlertext oder undefined. */
export function validateAxes(axes: readonly MatrixAxis[]): string | undefined {
  const used = axes.filter((a) => a.values.length > 0);
  if (used.length === 0) return 'Mindestens eine Achse mit Werten angeben';
  const fields = used.map((a) => a.field);
  if (new Set(fields).size !== fields.length) return 'Jeder Parameter darf nur auf einer Achse vorkommen';
  if (used.some((a) => a.field === 'ePuls') && used.some((a) => a.field === 'pAvg'))
    return 'Pulsenergie und Leistung nicht gleichzeitig variieren (über f_rep gekoppelt)';
  const n = matrixSize(axes);
  if (n > MATRIX_MAX) return `${n} Versuche sind zu viele (max. ${MATRIX_MAX})`;
  return undefined;
}

export interface MatrixContext {
  existingIds: Iterable<string>;
  seriesId: string;
  seriesCode: string;
  /** Art der Vorlage bzw. gewählte Art */
  art: ArtRef;
  datum?: string;
}

type NewExperiment = Omit<Experiment, 'id' | 'createdAt' | 'updatedAt' | 'deviceId' | 'deleted' | 'idFixiert'>;

/** Vorlage (Anlage, Probe, Parameter, Tags) mit Werten aus dem Gitter überschreiben; fortlaufende IDs mit der Art. */
export function buildMatrix(
  template: Pick<Experiment, 'systemId' | 'laserId' | 'optikId' | 'scannerId' | 'stationId' | 'strahlengangId' | 'sampleId' | 'materialId' | 'params' | 'tags'>,
  axes: readonly MatrixAxis[],
  ctx: MatrixContext,
): NewExperiment[] {
  const combos = combinations(axes);
  let nr = nextLaufnummer(ctx.existingIds, ctx.seriesCode, ctx.art.kuerzel);
  const tags = template.tags.includes('matrix') ? [...template.tags] : [...template.tags, 'matrix'];
  return combos.map((c) => {
    const params: ExperimentParams = { ...structuredClone(template.params), ...c };
    // Gekoppelte Größe nicht widersprüchlich stehen lassen
    if (c.ePuls !== undefined) delete params.pAvg;
    if (c.pAvg !== undefined) delete params.ePuls;
    if (c.v !== undefined && c.pulsabstand === undefined) delete params.pulsabstand;
    return {
      versuchsId: formatVersuchsId(ctx.seriesCode, ctx.art.kuerzel, nr++),
      versuchsartId: ctx.art.id,
      seriesId: ctx.seriesId,
      datum: ctx.datum ?? todayIso(),
      systemId: template.systemId,
      laserId: template.laserId,
      optikId: template.optikId,
      scannerId: template.scannerId,
      stationId: template.stationId,
      strahlengangId: template.strahlengangId,
      sampleId: template.sampleId,
      materialId: template.materialId,
      params,
      abgeleitet: experimentSnapshot(params),
      tags,
      status: 'geplant',
    };
  });
}
