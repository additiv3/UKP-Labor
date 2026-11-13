import { describe, expect, it } from 'vitest';
import { checkLimits } from './limits';

const laser = {
  wellenlaengen: [1030e-9, 515e-9],
  pMax: 20,
  ePulsMax: 200e-6,
  fRepMin: 50e3,
  fRepMax: 1e6,
  tauMin: 900e-15,
  tauMax: 10e-12,
};

describe('checkLimits', () => {
  it('innerhalb der Grenzen → keine Warnung', () => {
    expect(checkLimits({ lambda: 1030e-9, tau: 900e-15, pAvg: 10, ePuls: 50e-6, fRep: 200e3, v: 1 }, laser, { vMax: 5 })).toEqual({});
  });
  it('Grenzwert exakt getroffen (mit Rundungsfehler) → keine Warnung', () => {
    expect(checkLimits({ ePuls: 200e-6 * (1 + 1e-12), pAvg: 20 }, laser)).toEqual({});
  });
  it('meldet Überschreitungen', () => {
    const w = checkLimits({ lambda: 343e-9, tau: 500e-15, pAvg: 25, ePuls: 300e-6, fRep: 20e3, v: 8 }, laser, { vMax: 5 });
    expect(Object.keys(w).sort()).toEqual(['ePuls', 'fRep', 'lambda', 'pAvg', 'tau', 'v']);
    expect(w.ePuls).toMatch(/E_max/);
    expect(w.fRep).toMatch(/min/);
  });
  it('fehlende Datenblattwerte oder Eingaben → keine Warnung', () => {
    expect(checkLimits({ pAvg: 1000 }, {})).toEqual({});
    expect(checkLimits({}, laser, { vMax: 1 })).toEqual({});
    expect(checkLimits({ v: 10 })).toEqual({});
  });
});
