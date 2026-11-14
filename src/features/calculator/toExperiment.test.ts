import { describe, expect, it } from 'vitest';
import { derive } from '../../core/physics/derive';
import { calcToExperiment, mergeIntoParams } from './toExperiment';
import { INITIAL_CALC_STATE, type CalcState } from './state';

const state = (o: Partial<CalcState> = {}): CalcState => ({
  ...INITIAL_CALC_STATE,
  v: { lambda: 1030e-9, tau: 900e-15, pAvg: 10, ePuls: 99e-6, fRep: 200e3, m2: 1.2, f: 0.1, wL: 3e-3, v: 1, hatch: 10e-6, fth: 2000, delta: 20e-9 },
  preset: { systemId: 'a', laserId: 'l', optikId: 'o', materialId: 'm' },
  ...o,
});

describe('Rechner → Versuch', () => {
  it('Leistung wie eingegeben, w0 berechnet, Vorlagen übernommen, keine Materialwerte', () => {
    const s = state();
    const t = calcToExperiment(s, derive({ ...s.v, ePuls: undefined }));
    expect(t.params).toMatchObject({ lambda: 1030e-9, tau: 900e-15, pAvg: 10, fRep: 200e3, m2: 1.2, v: 1, hatch: 10e-6, w0Quelle: 'berechnet' });
    expect(t.params.w0).toBeCloseTo(13.114e-6, 9);
    expect(t.params.ePuls).toBeUndefined();
    expect('fth' in t.params).toBe(false);
    expect(Object.values(t.params).every((x) => x !== undefined)).toBe(true);
    expect(t).toMatchObject({ systemId: 'a', laserId: 'l', optikId: 'o', materialId: 'm' });
  });
  it('Pulsenergie-Modus und w0 direkt (Datenblatt erkannt)', () => {
    const s = state({ energyMode: 'ePuls', w0Mode: 'direkt', v: { ePuls: 50e-6, w0: 15e-6, z: -100e-6 } });
    const t = calcToExperiment(s, derive({}), 15e-6);
    expect(t.params).toEqual({ ePuls: 50e-6, w0: 15e-6, w0Quelle: 'datenblatt', fokuslage: -100e-6 });
    expect(calcToExperiment(s, derive({}), 20e-6).params.w0Quelle).toBeUndefined();
  });
  it('w0 aus D²-Fit behält Quelle d2', () => {
    const s = state({ w0Mode: 'direkt', w0Quelle: 'd2', v: { w0: 14e-6 } });
    expect(calcToExperiment(s, derive({}), 14e-6).params).toEqual({ w0: 14e-6, w0Quelle: 'd2' });
  });
  it('ohne Anlage keine Komponenten', () => {
    const t = calcToExperiment(state({ preset: { laserId: 'l' } }), derive({}));
    expect(t.laserId).toBeUndefined();
  });
  it('Übernahme in bestehenden Versuch', () => {
    const merged = mergeIntoParams(
      { ePuls: 1e-6, fRep: 100e3, strategie: 'Linien', pulsabstand: 3e-6, w0: 1e-5, w0Quelle: 'd2' },
      { pAvg: 5, v: 2, w0: 2e-5 },
    );
    expect(merged).toEqual({ pAvg: 5, fRep: 100e3, strategie: 'Linien', v: 2, w0: 2e-5 });
  });
});
