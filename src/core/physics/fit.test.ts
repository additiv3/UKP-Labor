import { describe, expect, it } from 'vitest';
import { d2Fit, incubationFit, linearRegression } from './fit';
import { craterDiameter, incubationThreshold } from './ablation';
import { peakFluence } from './fluence';
import { expectRel } from './testUtils';

const W0 = 13.114e-6;
const FTH = 0.2e4; // J/m²

describe('lineare Regression', () => {
  it('exakte Gerade → R² = 1', () => {
    const f = linearRegression([1, 2, 3, 4], [3, 5, 7, 9])!;
    expect(f.slope).toBeCloseTo(2, 12);
    expect(f.intercept).toBeCloseTo(1, 12);
    expect(f.r2).toBeCloseTo(1, 12);
    expect(f.n).toBe(4);
  });
  it('zu wenige Punkte oder konstantes x → undefined', () => {
    expect(linearRegression([1], [1])).toBeUndefined();
    expect(linearRegression([2, 2, 2], [1, 2, 3])).toBeUndefined();
  });
  it('verrauschte Daten → R² < 1', () => {
    const f = linearRegression([1, 2, 3, 4, 5], [1.1, 1.9, 3.2, 3.8, 5.1])!;
    expect(f.r2).toBeGreaterThan(0.95);
    expect(f.r2).toBeLessThan(1);
  });
});

describe('D²-Fit (Liu)', () => {
  // Synthetische Daten aus w_0 und F_th der Referenz
  const energies = [5e-6, 10e-6, 20e-6, 50e-6, 100e-6];
  const points = energies.map((ePuls) => ({ ePuls, d: craterDiameter(W0, peakFluence(ePuls, W0), FTH)! }));

  it('reproduziert w_0 und F_th', () => {
    const r = d2Fit(points)!;
    expectRel(r.w0, W0, 1e-9);
    expectRel(r.fth, FTH, 1e-9);
    expectRel(r.eth, (FTH * Math.PI * W0 * W0) / 2, 1e-9);
    expect(r.r2).toBeCloseTo(1, 12);
    expect(r.n).toBe(5);
  });

  it('schließt Punkte mit D = 0 aus', () => {
    const r = d2Fit([...points, { ePuls: 1e-7, d: 0 }, { ePuls: 2e-7, d: 0 }])!;
    expect(r.n).toBe(5);
    expectRel(r.w0, W0, 1e-9);
  });

  it('zu wenige gültige Punkte → undefined', () => {
    expect(d2Fit([{ ePuls: 1e-5, d: 2e-5 }, { ePuls: 2e-5, d: 0 }])).toBeUndefined();
    expect(d2Fit([])).toBeUndefined();
  });

  it('fallende Steigung (physikalisch unsinnig) → undefined', () => {
    expect(d2Fit([{ ePuls: 1e-5, d: 3e-5 }, { ePuls: 2e-5, d: 2e-5 }])).toBeUndefined();
  });
});

describe('Inkubationsfit', () => {
  it('reproduziert F_th(1) und S', () => {
    const pts = [1, 10, 100, 1000].map((n) => ({ n, fth: incubationThreshold(FTH, n, 0.8)! }));
    const r = incubationFit(pts)!;
    expectRel(r.fth1, FTH, 1e-9);
    expect(r.s).toBeCloseTo(0.8, 10);
    expect(r.r2).toBeCloseTo(1, 12);
  });
  it('ungültige Punkte werden ignoriert', () => {
    expect(incubationFit([{ n: 0, fth: 1 }, { n: 10, fth: 1 }])).toBeUndefined();
  });
});
