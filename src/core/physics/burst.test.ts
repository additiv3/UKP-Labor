/**
 * Burst-Referenzwerte aus docs/04_formeln.md (rel. Toleranz 1e-3):
 * Referenzeingabe plus n = 4 Sub-Pulse, f_burst = 40 MHz; E_p = 50 µJ gilt pro Burst.
 */
import { describe, expect, it } from 'vitest';
import { burstCount, burstDuration, burstEnergyForSubFluence, subPulseEnergy, subPulseSpacing } from './burst';
import { derive, type DeriveInput } from './derive';
import { M3_PER_J_TO_MM3_PER_MIN_W } from './units';
import { expectRel } from './testUtils';

const J_CM2 = 1e4;
const W_CM2 = 1e4;

const BASE: DeriveInput = {
  pAvg: 10,
  fRep: 200e3,
  tau: 900e-15,
  lambda: 1030e-9,
  m2: 1.2,
  f: 100e-3,
  wL: 3e-3,
  v: 1,
  hatch: 10e-6,
  fth: 0.2e4,
  delta: 20e-9,
};
const BURST: DeriveInput = { ...BASE, burstN: 4, fBurst: 40e6 };

describe('Burst – Einzelformeln', () => {
  it('Sub-Puls-Zahl: ganzzahlig ≥ 2, sonst kein Burst', () => {
    expect(burstCount(4)).toBe(4);
    expect(burstCount(3.6)).toBe(4);
    expect(burstCount(1)).toBeUndefined();
    expect(burstCount(0)).toBeUndefined();
    expect(burstCount(undefined)).toBeUndefined();
  });
  it('E_sub = 12,5 µJ', () => expectRel(subPulseEnergy(50e-6, 4), 12.5e-6));
  it('Δt = 25 ns', () => expectRel(subPulseSpacing(40e6), 25e-9));
  it('t_burst = 75 ns', () => expectRel(burstDuration(4, 40e6), 75e-9));
  it('f_burst = 0 → undefined', () => {
    expect(subPulseSpacing(0)).toBeUndefined();
    expect(burstDuration(4, 0)).toBeUndefined();
  });
  it('E_burst für Sub-Puls-Fluenz', () => expectRel(burstEnergyForSubFluence(1e4, 10e-6, 3), (3 * 1e4 * Math.PI * 1e-10) / 2, 1e-12));
});

describe('Burst – Referenzwerte über derive()', () => {
  const d = derive(BURST);
  it('E_p pro Burst bleibt 50 µJ, F_0 des Bursts 18,508 J/cm²', () => {
    expectRel(d.ePuls, 50e-6);
    expectRel(d.F0, 18.508 * J_CM2);
  });
  it('E_sub = 12,5 µJ', () => expectRel(d.ePulsSub, 12.5e-6));
  it('Δt = 25 ns, t_burst = 75 ns', () => {
    expectRel(d.dtSub, 25e-9);
    expectRel(d.tBurst, 75e-9);
  });
  it('F_0,sub = 4,627 J/cm² (= F_0/4)', () => {
    expectRel(d.F0Sub, 4.627 * J_CM2);
    expectRel(d.F0Sub, d.F0! / 4, 1e-12);
    expectRel(d.F0zSub, d.F0Sub!, 1e-12);
  });
  it('P_pk (Sub-Puls) = 13,048 MW', () => expectRel(d.pPk, 13.048e6));
  it('I_0 (Sub-Puls) = 4,8297·10¹² W/cm²', () => expectRel(d.I0, 4.8297e12 * W_CM2));
  it('D = 32,872 µm', () => expectRel(d.D, 32.872e-6));
  it('z_abl pro Burst = 251,31 nm', () => expectRel(d.zAbl, 251.31e-9));
  it('V pro Burst = 106,64 µm³', () => expectRel(d.Vp, 106.64e-18));
  it('V̇/P = 0,12796 mm³/(min·W)', () => expectRel(d.VdotP! * M3_PER_J_TO_MM3_PER_MIN_W, 0.12796));
  it('E_burst,opt = 15,970 µJ → T = 0,31939', () => {
    expectRel(d.EpOpt, 15.97e-6);
    expectRel(d.Topt, 0.31939);
  });
  it('Scan-Größen unverändert (Bursts folgen mit f_rep)', () => {
    const e = derive(BASE);
    expect(d.dx).toBe(e.dx);
    expect(d.OL).toBe(e.OL);
    expect(d.N2D).toBe(e.N2D);
  });
});

describe('Burst – ohne Burst identisch zu Formelversion 1.0', () => {
  for (const burstN of [undefined, 0, 1]) {
    it(`burstN = ${String(burstN)}`, () => {
      const a = derive(BASE);
      const b = derive({ ...BASE, burstN, fBurst: 40e6 });
      expect(b).toEqual(a);
      expect(b.ePulsSub).toBeUndefined();
      expect(b.F0Sub).toBeUndefined();
    });
  }
});

describe('Burst – Kantenfälle', () => {
  it('Sub-Puls unter der Schwelle → kein Abtrag, keine NaN', () => {
    const d = derive({ ...BURST, burstN: 200 });
    expect(d.D).toBe(0);
    expect(d.zAbl).toBe(0);
    expect(d.Vp).toBe(0);
    expect(d.VdotP).toBe(0);
  });
  it('ohne f_burst: Energiegrößen da, Zeiten undefined', () => {
    const d = derive({ ...BURST, fBurst: undefined });
    expectRel(d.ePulsSub, 12.5e-6);
    expect(d.dtSub).toBeUndefined();
    expect(d.tBurst).toBeUndefined();
  });
});
