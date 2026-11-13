/**
 * Bündelt alle Formeln: aus eingestellten Parametern (SI) werden alle ableitbaren Größen berechnet.
 * Wird vom Rechner und (ab 0.4) für den Versuchs-Snapshot verwendet.
 */
import { beamRadiusAt, depthOfFocus, focusRadius, rayleighLength } from './beam';
import {
  averagePower,
  meanFluence,
  peakFluence,
  peakIntensity,
  peakPower,
  pulseEnergy,
  pulseEnergyForFluence,
  transmissionForTarget,
  type PulseProfile,
} from './fluence';
import {
  ablationDepth,
  craterDiameter,
  incubationThreshold,
  maxSpecificRemovalRate,
  optimumFluence,
  specificRemovalRate,
  volumePerPulse,
} from './ablation';
import { lineOverlap, processingTime, pulseOverlap, pulsesPerArea2D, pulsesPerSpot1D, pulseSpacing } from './scan';
import { FORMEL_VERSION } from './version';
import type { Num } from './util';

export interface DeriveInput {
  /** m */
  lambda?: number;
  /** s, FWHM */
  tau?: number;
  profile?: PulseProfile;
  /** W — an der Quelle (vor der Abschwächung) */
  pAvg?: number;
  /** J — an der Quelle; hat Vorrang vor pAvg, wenn beide angegeben */
  ePuls?: number;
  /** Hz */
  fRep?: number;
  /** Abschwächung 0..1 (Quelle → Werkstück); leer = 1 */
  transmission?: number;
  m2?: number;
  /** m — Brennweite */
  f?: number;
  /** m — Strahlradius an der Linse */
  wL?: number;
  /** m — direkt angegebener Fokusradius; hat Vorrang vor der Berechnung aus f/w_L */
  w0?: number;
  /** m — Fokuslage relativ zur Oberfläche */
  z?: number;
  /** m/s */
  v?: number;
  /** m — direkt angegebener Pulsabstand; sonst aus v/f_rep */
  pulsabstand?: number;
  /** m */
  hatch?: number;
  /** J/m² — Einzelpuls-Schwelle F_th(1) */
  fth?: number;
  /** m — effektive Eindringtiefe */
  delta?: number;
  /** Inkubationskoeffizient */
  s?: number;
  /** Pulszahl für F_th(N) */
  nPulse?: number;
  /** m² */
  area?: number;
  nLayer?: number;
}

export interface Derived {
  /** J — an der Quelle */
  ePulsQuelle: Num;
  /** W — an der Quelle */
  pAvgQuelle: Num;
  transmission: number;
  /** J — am Werkstück */
  ePuls: Num;
  /** W — am Werkstück */
  pAvg: Num;
  /** W */
  pPk: Num;
  /** m */
  w0: Num;
  w0Berechnet: boolean;
  /** m */
  zR: Num;
  /** m */
  dof: Num;
  /** m — Strahlradius an der Fokuslage z */
  wz: Num;
  /** J/m² */
  F0: Num;
  Fmean: Num;
  /** J/m² — Spitzenfluenz an der Fokuslage z (= Wirkfluenz auf der Oberfläche) */
  F0z: Num;
  /** W/m² */
  I0: Num;
  /** m */
  dx: Num;
  OL: Num;
  N1D: Num;
  N2D: Num;
  OLh: Num;
  /** J/m² — Schwelle für N Pulse (mit Inkubation), sonst F_th */
  fthEff: Num;
  /** m */
  D: Num;
  /** m */
  zAbl: Num;
  /** m³ */
  Vp: Num;
  /** m³/J */
  VdotP: Num;
  /** J/m² */
  F0opt: Num;
  /** m³/J */
  VdotPmax: Num;
  /** J — Pulsenergie am Werkstück fürs Optimum */
  EpOpt: Num;
  /** Abschwächung fürs Optimum (bezogen auf E_p an der Quelle) */
  Topt: Num;
  /** s */
  tFlaeche: Num;
}

export function derive(i: DeriveInput): Derived {
  const ePulsQuelle = i.ePuls ?? pulseEnergy(i.pAvg, i.fRep);
  const pAvgQuelle = i.ePuls !== undefined ? averagePower(i.ePuls, i.fRep) : i.pAvg;
  const transmission = i.transmission ?? 1;
  const ePuls = ePulsQuelle === undefined ? undefined : ePulsQuelle * transmission;
  const pAvg = pAvgQuelle === undefined ? undefined : pAvgQuelle * transmission;
  const pPk = peakPower(ePuls, i.tau, i.profile);

  const w0Berechnet = i.w0 === undefined;
  const w0 = i.w0 ?? focusRadius(i.m2 ?? 1, i.lambda, i.f, i.wL);
  const zR = rayleighLength(w0, i.m2 ?? 1, i.lambda);
  const z = i.z ?? 0;
  const wz = z === 0 ? w0 : beamRadiusAt(w0, zR, z);

  const F0 = peakFluence(ePuls, w0);
  const F0z = peakFluence(ePuls, wz);
  const dx = i.pulsabstand ?? pulseSpacing(i.v, i.fRep);

  // Für Abtrag zählt die Fluenz auf der Oberfläche (Defokus) und die effektive Schwelle (Inkubation).
  const fthEff = i.s !== undefined && i.nPulse !== undefined ? incubationThreshold(i.fth, i.nPulse, i.s) : i.fth;
  const F0opt = optimumFluence(fthEff);
  const EpOpt = pulseEnergyForFluence(F0opt, wz);

  return {
    ePulsQuelle,
    pAvgQuelle,
    transmission,
    ePuls,
    pAvg,
    pPk,
    w0,
    w0Berechnet,
    zR,
    dof: depthOfFocus(zR),
    wz,
    F0,
    Fmean: meanFluence(ePuls, w0),
    F0z,
    I0: peakIntensity(pPk, w0),
    dx,
    OL: pulseOverlap(dx, wz),
    N1D: pulsesPerSpot1D(wz, dx),
    N2D: pulsesPerArea2D(wz, dx, i.hatch),
    OLh: lineOverlap(i.hatch, wz),
    fthEff,
    D: craterDiameter(wz, F0z, fthEff),
    zAbl: ablationDepth(i.delta, F0z, fthEff),
    Vp: volumePerPulse(wz, i.delta, F0z, fthEff),
    VdotP: specificRemovalRate(i.delta, F0z, fthEff),
    F0opt,
    VdotPmax: maxSpecificRemovalRate(i.delta, fthEff),
    EpOpt,
    Topt: transmissionForTarget(EpOpt, ePulsQuelle),
    tFlaeche: processingTime(i.nLayer, i.area, i.v, i.hatch),
  };
}

/** Snapshot für Versuche: nur definierte Zahlenwerte, mit Formelversion. */
export function snapshot(d: Derived): { formelVersion: string; werte: Record<string, number> } {
  const werte: Record<string, number> = {};
  for (const [k, v] of Object.entries(d)) {
    if (typeof v === 'number' && Number.isFinite(v)) werte[k] = v;
  }
  return { formelVersion: FORMEL_VERSION, werte };
}
