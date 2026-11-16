/**
 * Burst-Modus: n Sub-Pulse im Abstand 1/f_burst bilden einen Burst; Bursts folgen mit f_rep.
 * Annahmen: Energie gleichmäßig auf die Sub-Pulse verteilt, Sub-Pulse zeitlich getrennt (Δt ≫ τ) und
 * im Abtrag unabhängig (keine Abschirmung, keine Wärmeakkumulation).
 */
import { ok, div, finite, type Num } from './util';

/** Gültige Sub-Puls-Zahl (ganzzahlig ≥ 2) oder `undefined` (= kein Burst). */
export function burstCount(n: Num): number | undefined {
  if (!ok(n)) return undefined;
  const r = Math.round(n);
  return r >= 2 ? r : undefined;
}

/** Energie pro Sub-Puls E_sub = E_burst / n  [J] */
export function subPulseEnergy(eBurst: Num, n: Num): Num {
  return div(eBurst, n);
}

/** Zeitlicher Abstand der Sub-Pulse Δt = 1/f_burst  [s] */
export function subPulseSpacing(fBurst: Num): Num {
  return div(1, fBurst);
}

/** Burst-Dauer (erster bis letzter Sub-Puls) t_burst = (n − 1)/f_burst  [s] */
export function burstDuration(n: Num, fBurst: Num): Num {
  if (!ok(n) || n < 1) return undefined;
  return div(n - 1, fBurst);
}

/** Burst-Energie, bei der jeder Sub-Puls die Spitzenfluenz F_sub hat: E_burst = n · F_sub π w²/2  [J] */
export function burstEnergyForSubFluence(fSub: Num, w: Num, n: Num): Num {
  if (!(ok(fSub) && ok(w) && ok(n))) return undefined;
  return finite((n * fSub * Math.PI * w * w) / 2);
}
