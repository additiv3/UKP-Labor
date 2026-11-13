import { describe, expect, it } from 'vitest';
import { beamRadiusAt, caustic, focusRadius, rayleighLength } from './beam';
import { PEAK_FACTOR, peakFluence, peakPower, pulseEnergy, transmissionForTarget } from './fluence';
import { lineOverlap, processingTime, pulseOverlap, pulsesPerArea2D, pulsesPerSpot1D, pulseSpacing } from './scan';
import {
  ablationDepth,
  craterDiameter,
  incubationThreshold,
  optimumFluence,
  specificRemovalRate,
  volumePerPulse,
} from './ablation';
import { derive, snapshot } from './derive';
import { FORMEL_VERSION } from './version';

describe('Kantenfälle: F_0 ≤ F_th → kein Abtrag, keine NaN', () => {
  it.each([
    [1000, 2000],
    [2000, 2000],
  ])('F_0=%d, F_th=%d', (f0, fth) => {
    expect(craterDiameter(10e-6, f0, fth)).toBe(0);
    expect(ablationDepth(20e-9, f0, fth)).toBe(0);
    expect(volumePerPulse(10e-6, 20e-9, f0, fth)).toBe(0);
    expect(specificRemovalRate(20e-9, f0, fth)).toBe(0);
  });
  it('F ≤ 0 oder fehlend → undefined', () => {
    expect(craterDiameter(10e-6, 0, 2000)).toBeUndefined();
    expect(craterDiameter(10e-6, 1000, 0)).toBeUndefined();
    expect(ablationDepth(undefined, 1000, 100)).toBeUndefined();
    expect(optimumFluence(0)).toBeUndefined();
    expect(incubationThreshold(2000, 0, 0.8)).toBeUndefined();
  });
});

describe('Kantenfälle: Division durch 0 → undefined', () => {
  it('Puls und Fluenz', () => {
    expect(pulseEnergy(10, 0)).toBeUndefined();
    expect(peakPower(1e-6, 0)).toBeUndefined();
    expect(peakFluence(1e-6, 0)).toBeUndefined();
    expect(transmissionForTarget(1e-6, 0)).toBeUndefined();
  });
  it('Strahl', () => {
    expect(focusRadius(1, 1e-6, 0.1, 0)).toBeUndefined();
    expect(rayleighLength(10e-6, 1, 0)).toBeUndefined();
    expect(beamRadiusAt(10e-6, 0, 1e-3)).toBeUndefined();
  });
  it('Scan', () => {
    expect(pulseSpacing(1, 0)).toBeUndefined();
    expect(pulseOverlap(5e-6, 0)).toBeUndefined();
    expect(pulsesPerSpot1D(10e-6, 0)).toBeUndefined();
    expect(pulsesPerArea2D(10e-6, 5e-6, 0)).toBeUndefined();
    expect(lineOverlap(10e-6, 0)).toBeUndefined();
    expect(processingTime(1, 1e-4, 0, 10e-6)).toBeUndefined();
  });
  it('fehlende Eingaben → undefined', () => {
    expect(pulseEnergy(undefined, 1e5)).toBeUndefined();
    expect(peakFluence(1e-6, undefined)).toBeUndefined();
  });
  it('derive() mit leerer Eingabe liefert nur undefined, keine NaN', () => {
    const d = derive({});
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'number') expect(Number.isNaN(v), k).toBe(false);
    }
    expect(d.ePuls).toBeUndefined();
    expect(d.F0).toBeUndefined();
    expect(snapshot(d).werte).toEqual({ transmission: 1 });
  });
});

describe('weitere Formeln', () => {
  it('sech²-Spitzenleistungsfaktor ≈ 0,8814, Gauß ≈ 0,9394', () => {
    expect(PEAK_FACTOR.sech2).toBeCloseTo(0.8814, 4);
    expect(PEAK_FACTOR.gauss).toBeCloseTo(0.9394, 4);
  });
  it('Pulsüberlapp negativ bei Lücke', () => {
    expect(pulseOverlap(30e-6, 10e-6)).toBeCloseTo(-0.5, 12);
  });
  it('Bearbeitungszeit Fläche', () => {
    // 10 Lagen, 1 cm², v = 1 m/s, h = 10 µm → 10 · 1e-4 / 1e-5 = 100 s
    expect(processingTime(10, 1e-4, 1, 10e-6)).toBeCloseTo(100, 9);
  });
  it('Kaustik symmetrisch, Minimum w_0 in der Mitte', () => {
    const c = caustic(10e-6, 300e-6, 1e-3, 101);
    expect(c.z).toHaveLength(101);
    expect(c.w[50]).toBeCloseTo(10e-6, 15);
    expect(c.w[0]).toBeCloseTo(c.w[100]!, 15);
    expect(caustic(0, 1, 1).z).toHaveLength(0);
  });
  it('Snapshot enthält Formelversion und nur endliche Werte', () => {
    const s = snapshot(derive({ ePuls: 1e-6, w0: 10e-6 }));
    expect(s.formelVersion).toBe(FORMEL_VERSION);
    expect(s.werte.F0).toBeCloseTo((2 * 1e-6) / (Math.PI * 1e-10), 6);
    expect(Object.values(s.werte).every(Number.isFinite)).toBe(true);
  });
});
