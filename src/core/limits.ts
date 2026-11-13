/**
 * Grenzwertprüfung: eingestellte Parameter gegen Datenblattwerte der gewählten Komponenten.
 * Reine Funktion, alle Werte in SI.
 */

export interface LaserLimits {
  wellenlaengen?: number[];
  pMax?: number;
  ePulsMax?: number;
  fRepMin?: number;
  fRepMax?: number;
  tauMin?: number;
  tauMax?: number;
}

export interface ScannerLimits {
  vMax?: number;
}

export interface LimitInput {
  lambda?: number;
  tau?: number;
  /** an der Quelle */
  pAvg?: number;
  /** an der Quelle */
  ePuls?: number;
  fRep?: number;
  v?: number;
}

export type LimitField = 'lambda' | 'tau' | 'pAvg' | 'ePuls' | 'fRep' | 'v';

/** Relative Toleranz gegen Rundungsfehler aus Einheitenumrechnung. */
const EPS = 1e-9;
const above = (x: number, max: number) => x > max * (1 + EPS);
const below = (x: number, min: number) => x < min * (1 - EPS);

/** Liefert je Feld eine Warnung (deutsch), wenn ein Grenzwert verletzt ist. */
export function checkLimits(
  i: LimitInput,
  laser?: LaserLimits,
  scanner?: ScannerLimits,
): Partial<Record<LimitField, string>> {
  const w: Partial<Record<LimitField, string>> = {};
  if (laser) {
    if (i.pAvg !== undefined && laser.pMax !== undefined && above(i.pAvg, laser.pMax)) w.pAvg = 'Über P_max der Laserquelle';
    if (i.ePuls !== undefined && laser.ePulsMax !== undefined && above(i.ePuls, laser.ePulsMax))
      w.ePuls = 'Über E_max der Laserquelle';
    if (i.fRep !== undefined) {
      if (laser.fRepMin !== undefined && below(i.fRep, laser.fRepMin)) w.fRep = 'Unter f_rep,min der Laserquelle';
      else if (laser.fRepMax !== undefined && above(i.fRep, laser.fRepMax)) w.fRep = 'Über f_rep,max der Laserquelle';
    }
    if (i.tau !== undefined) {
      if (laser.tauMin !== undefined && below(i.tau, laser.tauMin)) w.tau = 'Kürzer als τ_min der Laserquelle';
      else if (laser.tauMax !== undefined && above(i.tau, laser.tauMax)) w.tau = 'Länger als τ_max der Laserquelle';
    }
    const wl = laser.wellenlaengen ?? [];
    if (i.lambda !== undefined && wl.length > 0 && !wl.some((l) => Math.abs(l - i.lambda!) <= 1e-6 * l))
      w.lambda = 'Wellenlänge nicht im Datenblatt der Laserquelle';
  }
  if (scanner && i.v !== undefined && scanner.vMax !== undefined && above(i.v, scanner.vMax))
    w.v = 'Über v_max des Scanners';
  return w;
}
