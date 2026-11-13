import { ok, div, finite, type Num } from './util';

/** Zeitprofil des Pulses (τ = FWHM). */
export type PulseProfile = 'gauss' | 'sech2';

/** Spitzenleistungsfaktor: P_pk = k · E_p/τ. Gauß: 2√(ln2/π) ≈ 0,9394; sech²: ln(1+√2) ≈ 0,8814. */
export const PEAK_FACTOR: Record<PulseProfile, number> = {
  gauss: 2 * Math.sqrt(Math.LN2 / Math.PI),
  sech2: Math.log(1 + Math.SQRT2),
};

/** E_p = P_avg / f_rep  [J] */
export function pulseEnergy(pAvg: Num, fRep: Num): Num {
  return div(pAvg, fRep);
}

/** P_avg = E_p · f_rep  [W] */
export function averagePower(ePuls: Num, fRep: Num): Num {
  if (!(ok(ePuls) && ok(fRep))) return undefined;
  return finite(ePuls * fRep);
}

/** Spitzenleistung P_pk = k · E_p/τ  [W] */
export function peakPower(ePuls: Num, tau: Num, profile: PulseProfile = 'gauss'): Num {
  const r = div(ePuls, tau);
  return r === undefined ? undefined : PEAK_FACTOR[profile] * r;
}

/** Spitzenfluenz F_0 = 2E_p/(π w_0²)  [J/m²] */
export function peakFluence(ePuls: Num, w0: Num): Num {
  if (!(ok(ePuls) && ok(w0))) return undefined;
  return div(2 * ePuls, Math.PI * w0 * w0);
}

/** Mittlere Fluenz F̄ = E_p/(π w_0²) = F_0/2  [J/m²] */
export function meanFluence(ePuls: Num, w0: Num): Num {
  if (!(ok(ePuls) && ok(w0))) return undefined;
  return div(ePuls, Math.PI * w0 * w0);
}

/** Spitzenintensität I_0 = 2P_pk/(π w_0²)  [W/m²] */
export function peakIntensity(pPk: Num, w0: Num): Num {
  return peakFluence(pPk, w0);
}

/** Pulsenergie für gegebene Spitzenfluenz: E_p = F_0 π w_0²/2  [J] */
export function pulseEnergyForFluence(f0: Num, w0: Num): Num {
  if (!(ok(f0) && ok(w0))) return undefined;
  return finite((f0 * Math.PI * w0 * w0) / 2);
}

/** Abschwächung für Zielenergie: T = E_ziel/E_max (ohne Begrenzung; T > 1 heißt: Ziel nicht erreichbar). */
export function transmissionForTarget(eZiel: Num, eMax: Num): Num {
  return div(eZiel, eMax);
}
