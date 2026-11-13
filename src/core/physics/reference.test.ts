/**
 * Test-Referenzwerte aus docs/04_formeln.md (rel. Toleranz 1e-3).
 * Eingabe: P=10 W, f_rep=200 kHz, τ=900 fs, λ=1030 nm, M²=1,2, f=100 mm, w_L=3 mm,
 * v=1 m/s, h=10 µm, F_th=0,2 J/cm², δ=20 nm.
 */
import { describe, expect, it } from 'vitest';
import { beamRadiusAt, depthOfFocus, fluenceAtZ, focusRadius, rayleighLength } from './beam';
import { peakFluence, peakIntensity, peakPower, pulseEnergy, pulseEnergyForFluence, transmissionForTarget } from './fluence';
import { pulseOverlap, pulsesPerArea2D, pulsesPerSpot1D, pulseSpacing } from './scan';
import {
  ablationDepth,
  craterDiameter,
  incubationThreshold,
  maxSpecificRemovalRate,
  optimumFluence,
  specificRemovalRate,
  volumePerPulse,
} from './ablation';
import { derive } from './derive';
import { M3_PER_J_TO_MM3_PER_MIN_W } from './units';
import { expectRel } from './testUtils';

const REF = {
  P: 10,
  fRep: 200e3,
  tau: 900e-15,
  lambda: 1030e-9,
  m2: 1.2,
  f: 100e-3,
  wL: 3e-3,
  v: 1,
  h: 10e-6,
  fth: 0.2e4, // J/m²
  delta: 20e-9,
};

const J_CM2 = 1e4; // 1 J/cm² in J/m²
const W_CM2 = 1e4;

describe('Referenzwerte 04_formeln.md – Einzelformeln', () => {
  const Ep = pulseEnergy(REF.P, REF.fRep)!;
  const w0 = focusRadius(REF.m2, REF.lambda, REF.f, REF.wL)!;
  const zR = rayleighLength(w0, REF.m2, REF.lambda)!;
  const F0 = peakFluence(Ep, w0)!;
  const Ppk = peakPower(Ep, REF.tau)!;
  const dx = pulseSpacing(REF.v, REF.fRep)!;

  it('E_p = 50 µJ', () => expectRel(Ep, 50e-6));
  it('w_0 = 13,114 µm', () => expectRel(w0, 13.114e-6));
  it('z_R = 437,15 µm', () => expectRel(zR, 437.15e-6));
  it('Schärfentiefe = 2 z_R', () => expectRel(depthOfFocus(zR), 2 * 437.15e-6));
  it('F_0 = 18,508 J/cm²', () => expectRel(F0, 18.508 * J_CM2));
  it('P_pk = 52,19 MW', () => expectRel(Ppk, 52.19e6));
  it('I_0 = 1,9319·10¹³ W/cm²', () => expectRel(peakIntensity(Ppk, w0), 1.9319e13 * W_CM2));
  it('w(2z_R) = 29,325 µm', () => expectRel(beamRadiusAt(w0, zR, 2 * zR), 29.325e-6));
  it('F_0(2z_R) = 3,7016 J/cm² (= F_0/5)', () => {
    expectRel(fluenceAtZ(Ep, w0, zR, 2 * zR), 3.7016 * J_CM2);
    expectRel(fluenceAtZ(Ep, w0, zR, 2 * zR), F0 / 5, 1e-12);
  });
  it('Δx = 5,0 µm', () => expectRel(dx, 5.0e-6));
  it('OL = 0,80937', () => expectRel(pulseOverlap(dx, w0), 0.80937));
  it('N_1D = 5,2457', () => expectRel(pulsesPerSpot1D(w0, dx), 5.2457));
  it('N_2D = 10,806', () => expectRel(pulsesPerArea2D(w0, dx, REF.h), 10.806));
  it('D (Krater) = 39,464 µm', () => expectRel(craterDiameter(w0, F0, REF.fth), 39.464e-6));
  it('z_abl = 90,553 nm', () => expectRel(ablationDepth(REF.delta, F0, REF.fth), 90.553e-9));
  it('V_p = 5,5380·10⁻¹⁷ m³', () => expectRel(volumePerPulse(w0, REF.delta, F0, REF.fth), 5.538e-17));
  it('V̇/P = 0,066457 mm³/(min·W)', () =>
    expectRel(specificRemovalRate(REF.delta, F0, REF.fth)! * M3_PER_J_TO_MM3_PER_MIN_W, 0.066457));
  it('F_0,opt = 1,4778 J/cm²', () => expectRel(optimumFluence(REF.fth), 1.4778 * J_CM2));
  it('(V̇/P)_max = 0,16240 mm³/(min·W)', () =>
    expectRel(maxSpecificRemovalRate(REF.delta, REF.fth)! * M3_PER_J_TO_MM3_PER_MIN_W, 0.1624));
  it('E_p,opt = 3,9924 µJ → T = 0,079848', () => {
    const EpOpt = pulseEnergyForFluence(optimumFluence(REF.fth), w0)!;
    expectRel(EpOpt, 3.9924e-6);
    expectRel(transmissionForTarget(EpOpt, Ep), 0.079848);
  });
  it('F_th(N=100) bei S=0,8 = 0,079621 J/cm²', () =>
    expectRel(incubationThreshold(REF.fth, 100, 0.8), 0.079621 * J_CM2));
  it('Optimum ist tatsächlich das Maximum von V̇/P', () => {
    const opt = specificRemovalRate(REF.delta, optimumFluence(REF.fth), REF.fth)!;
    expectRel(opt, maxSpecificRemovalRate(REF.delta, REF.fth)!, 1e-12);
    for (const k of [0.8, 0.95, 1.05, 1.3]) {
      expect(specificRemovalRate(REF.delta, k * optimumFluence(REF.fth)!, REF.fth)!).toBeLessThan(opt);
    }
  });
});

describe('Referenzwerte 04_formeln.md – derive()', () => {
  const d = derive({
    pAvg: REF.P,
    fRep: REF.fRep,
    tau: REF.tau,
    lambda: REF.lambda,
    m2: REF.m2,
    f: REF.f,
    wL: REF.wL,
    v: REF.v,
    hatch: REF.h,
    fth: REF.fth,
    delta: REF.delta,
  });

  it('liefert dieselben Werte wie die Einzelformeln', () => {
    expectRel(d.ePuls, 50e-6);
    expectRel(d.w0, 13.114e-6);
    expect(d.w0Berechnet).toBe(true);
    expectRel(d.zR, 437.15e-6);
    expectRel(d.F0, 18.508 * J_CM2);
    expectRel(d.F0z, 18.508 * J_CM2);
    expectRel(d.Fmean, 18.508 * J_CM2 / 2);
    expectRel(d.pPk, 52.19e6);
    expectRel(d.I0, 1.9319e13 * W_CM2);
    expectRel(d.dx, 5e-6);
    expectRel(d.OL, 0.80937);
    expectRel(d.N1D, 5.2457);
    expectRel(d.N2D, 10.806);
    expectRel(d.D, 39.464e-6);
    expectRel(d.zAbl, 90.553e-9);
    expectRel(d.Vp, 5.538e-17);
    expectRel(d.VdotP! * M3_PER_J_TO_MM3_PER_MIN_W, 0.066457);
    expectRel(d.F0opt, 1.4778 * J_CM2);
    expectRel(d.VdotPmax! * M3_PER_J_TO_MM3_PER_MIN_W, 0.1624);
    expectRel(d.EpOpt, 3.9924e-6);
    expectRel(d.Topt, 0.079848);
  });

  it('Defokus 2 z_R: Oberflächenfluenz = F_0/5, Spot w(2z_R)', () => {
    const dz = derive({ ePuls: 50e-6, lambda: REF.lambda, m2: REF.m2, f: REF.f, wL: REF.wL, z: 2 * 437.15e-6 });
    expectRel(dz.wz, 29.325e-6);
    expectRel(dz.F0z, 3.7016 * J_CM2);
    expectRel(dz.F0, 18.508 * J_CM2);
  });

  it('Pulsenergie hat Vorrang vor Leistung; Abschwächung wirkt am Werkstück', () => {
    const t = derive({ ePuls: 50e-6, pAvg: 999, fRep: REF.fRep, transmission: 0.5, w0: 13.114e-6 });
    expectRel(t.ePulsQuelle, 50e-6);
    expectRel(t.pAvgQuelle, 10);
    expectRel(t.ePuls, 25e-6);
    expectRel(t.pAvg, 5);
    expectRel(t.F0, 18.508 * J_CM2 / 2);
    expect(t.w0Berechnet).toBe(false);
  });

  it('Inkubation: effektive Schwelle für N Pulse', () => {
    const t = derive({ fth: REF.fth, s: 0.8, nPulse: 100 });
    expectRel(t.fthEff, 0.079621 * J_CM2);
  });
});
