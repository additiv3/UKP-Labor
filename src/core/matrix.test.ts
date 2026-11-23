import { describe, expect, it } from 'vitest';
import { buildMatrix, combinations, matrixSize, MATRIX_MAX, rangeValues, validateAxes } from './matrix';

describe('Wertelisten', () => {
  it('linear inklusive Endpunkte, ohne Rundungsartefakte', () => {
    expect(rangeValues(0.1, 0.5, 5)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(rangeValues(10e-6, 50e-6, 3)).toEqual([10e-6, 30e-6, 50e-6]);
    expect(rangeValues(5, 1, 3)).toEqual([5, 3, 1]);
  });
  it('logarithmisch', () => {
    expect(rangeValues(1, 1000, 4, 'log')).toEqual([1, 10, 100, 1000]);
    expect(rangeValues(0, 10, 3, 'log')).toEqual([]);
  });
  it('Kantenfälle', () => {
    expect(rangeValues(7, 9, 1)).toEqual([7]);
    expect(rangeValues(1, 2, 0)).toEqual([]);
    expect(rangeValues(1, 2, 2.5)).toEqual([]);
    expect(rangeValues(Number.NaN, 2, 3)).toEqual([]);
  });
});

describe('Gitter', () => {
  const axes = [
    { field: 'ePuls' as const, values: [10e-6, 20e-6] },
    { field: 'nPulse' as const, values: [1, 10, 100] },
  ];
  it('Kreuzprodukt, erste Achse außen', () => {
    expect(matrixSize(axes)).toBe(6);
    expect(combinations(axes)).toEqual([
      { ePuls: 10e-6, nPulse: 1 }, { ePuls: 10e-6, nPulse: 10 }, { ePuls: 10e-6, nPulse: 100 },
      { ePuls: 20e-6, nPulse: 1 }, { ePuls: 20e-6, nPulse: 10 }, { ePuls: 20e-6, nPulse: 100 },
    ]);
    expect(matrixSize([{ field: 'v', values: [] }])).toBe(0);
  });
  it('Validierung', () => {
    expect(validateAxes(axes)).toBeUndefined();
    expect(validateAxes([])).toMatch(/Mindestens/);
    expect(validateAxes([{ field: 'v', values: [1] }, { field: 'v', values: [2] }])).toMatch(/nur auf einer Achse/);
    expect(validateAxes([{ field: 'ePuls', values: [1] }, { field: 'pAvg', values: [2] }])).toMatch(/gekoppelt/);
    const big = Array.from({ length: 30 }, (_, i) => i + 1);
    expect(validateAxes([{ field: 'nPulse', values: big }, { field: 'v', values: big }])).toMatch(String(MATRIX_MAX));
  });
});

describe('buildMatrix', () => {
  const template = {
    systemId: 'a', laserId: 'l', materialId: 'm', sampleId: 's',
    params: { pAvg: 10, fRep: 200e3, w0: 13.114e-6, v: 1, pulsabstand: 5e-6, strategie: 'Punkte' },
    tags: ['schwelle'],
  };
  it('fortlaufende IDs, Status geplant, Tag matrix, Snapshot', () => {
    const list = buildMatrix(template, [{ field: 'ePuls', values: [10e-6, 50e-6] }, { field: 'nPulse', values: [1, 10] }], {
      existingIds: ['B1-THR-001', 'B1-THR-007', 'B1-ABL-020'], seriesId: 'r', seriesCode: 'B1', art: { id: 'thr', kuerzel: 'THR' }, datum: '2026-11-13',
    });
    expect(list.map((e) => e.versuchsId)).toEqual(['B1-THR-008', 'B1-THR-009', 'B1-THR-010', 'B1-THR-011']);
    expect(list.every((e) => e.versuchsartId === 'thr')).toBe(true);
    expect(list.every((e) => e.status === 'geplant' && e.datum === '2026-11-13' && e.seriesId === 'r')).toBe(true);
    expect(list[0]!.tags).toEqual(['schwelle', 'matrix']);
    expect(list[3]!.params).toMatchObject({ ePuls: 50e-6, nPulse: 10, fRep: 200e3, strategie: 'Punkte', pulsabstand: 5e-6 });
    // E_p variiert → eingegebene Leistung entfällt (sonst Widerspruch)
    expect(list[0]!.params.pAvg).toBeUndefined();
    expect(list[1]!.abgeleitet!.werte.F0! / 1e4).toBeCloseTo(3.7016, 3);
    expect(list[0]!.materialId).toBe('m');
    // Vorlage bleibt unverändert
    expect(template.params.pAvg).toBe(10);
  });
  it('v variiert → fester Pulsabstand der Vorlage entfällt', () => {
    const [e] = buildMatrix(template, [{ field: 'v', values: [2] }], { existingIds: [], seriesId: 'r', seriesCode: 'B2', art: { id: 'abl', kuerzel: 'ABL' } });
    expect(e!.versuchsId).toBe('B2-ABL-001');
    expect(e!.params.pulsabstand).toBeUndefined();
    expect(e!.abgeleitet!.werte.dx).toBeCloseTo(10e-6, 12);
  });
});
