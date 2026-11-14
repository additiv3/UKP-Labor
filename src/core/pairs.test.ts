import { describe, expect, it } from 'vitest';
import { fitPlotData, parsePairs } from './pairs';
import { linearRegression } from './physics/fit';

describe('parsePairs', () => {
  it('Excel (Tab), Semikolon, Leerzeichen, Dezimalkomma, Kopfzeile', () => {
    const r = parsePairs('E_p [µJ]\tD [µm]\n5\t21,3\r\n10;30.5\n20  38,9\n\n');
    expect(r.headerSkipped).toBe(true);
    expect(r.pairs).toEqual([[5, 21.3], [10, 30.5], [20, 38.9]]);
    expect(r.invalidLines).toEqual([]);
  });
  it('ungültige Zeilen werden gemeldet', () => {
    const r = parsePairs('1 2\nx y\n3\n4 5');
    expect(r.pairs).toEqual([[1, 2], [4, 5]]);
    expect(r.invalidLines).toEqual([2, 3]);
  });
  it('leer', () => {
    expect(parsePairs('')).toEqual({ pairs: [], invalidLines: [], headerSkipped: false });
  });
});

describe('fitPlotData', () => {
  it('sortiert, Gerade bis zur Nullstelle', () => {
    const pts: [number, number][] = [[3, 4], [1, 0.5], [2, 2]];
    const fit = linearRegression([1, 2, 3], [0.5, 2, 4]);
    const d = fitPlotData(pts, fit);
    expect(d.x[0]).toBeCloseTo(-fit!.intercept / fit!.slope, 12);
    expect(d.points).toEqual([null, 0.5, 2, 4]);
    expect(d.line[0]).toBe(0);
    expect(d.line[3]).toBeCloseTo(fit!.slope * 3 + fit!.intercept, 12);
  });
  it('ohne Fit', () => {
    expect(fitPlotData([[1, 2]], undefined)).toEqual({ x: [1], points: [2], line: [null] });
  });
});
