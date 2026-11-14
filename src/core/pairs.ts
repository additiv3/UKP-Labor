/**
 * Wertepaare aus eingefügtem Text (z. B. aus Excel kopiert): eine Zeile pro Paar,
 * getrennt durch Tab, „;“ oder Leerzeichen; Dezimalkomma oder -punkt. Kopfzeilen werden übersprungen.
 */
import { parseNumber } from './physics/units';
import type { LinearFit } from './physics/fit';

export interface PairParse {
  pairs: [number, number][];
  /** 1-basierte Zeilennummern, die nicht gelesen werden konnten (ohne Kopfzeile) */
  invalidLines: number[];
  headerSkipped: boolean;
}

function splitLine(line: string): string[] {
  const l = line.trim();
  if (l.includes('\t')) return l.split('\t').map((s) => s.trim()).filter(Boolean);
  if (l.includes(';')) return l.split(';').map((s) => s.trim()).filter(Boolean);
  return l.split(/\s+/).filter(Boolean);
}

export function parsePairs(text: string): PairParse {
  const pairs: [number, number][] = [];
  const invalidLines: number[] = [];
  let headerSkipped = false;
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .forEach((line, idx) => {
      if (line.trim() === '') return;
      const parts = splitLine(line);
      const a = parseNumber(parts[0]);
      const b = parseNumber(parts[1]);
      if (parts.length >= 2 && a !== undefined && b !== undefined) {
        pairs.push([a, b]);
        return;
      }
      // erste Zeile ohne Zahlen = Kopfzeile
      if (pairs.length === 0 && invalidLines.length === 0 && !headerSkipped && parts.every((p) => parseNumber(p) === undefined)) {
        headerSkipped = true;
        return;
      }
      invalidLines.push(idx + 1);
    });
  return { pairs, invalidLines, headerSkipped };
}

/** Daten für einen Fit-Plot: Messpunkte und Ausgleichsgerade, nach x sortiert (für uPlot). */
export function fitPlotData(
  points: [number, number][],
  fit: LinearFit | undefined,
): { x: number[]; points: (number | null)[]; line: (number | null)[] } {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const x = sorted.map((p) => p[0]);
  const pts: (number | null)[] = sorted.map((p) => p[1]);
  const line: (number | null)[] = x.map((xi) => (fit ? fit.slope * xi + fit.intercept : null));
  // Gerade bis zur Nullstelle verlängern (dort liegt die Schwelle), wenn sie links der Daten liegt
  if (fit && fit.slope !== 0 && x.length > 0) {
    const x0 = -fit.intercept / fit.slope;
    if (Number.isFinite(x0) && x0 < x[0]! && x[0]! - x0 < 3 * (x[x.length - 1]! - x[0]! || 1)) {
      x.unshift(x0);
      pts.unshift(null);
      line.unshift(0);
    }
  }
  return { x, points: pts, line };
}
