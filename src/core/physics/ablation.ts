import { ok, finite, type Num } from './util';

/** ln(F_0/F_th) oder `undefined` bei ungültigen Werten (F ≤ 0). */
function logRatio(f0: Num, fth: Num): Num {
  if (!(ok(f0) && ok(fth)) || f0 <= 0 || fth <= 0) return undefined;
  return Math.log(f0 / fth);
}

/** Kraterdurchmesser D = 2 w_0 √(½ ln(F_0/F_th))  [m]; 0 für F_0 ≤ F_th. */
export function craterDiameter(w0: Num, f0: Num, fth: Num): Num {
  const l = logRatio(f0, fth);
  if (l === undefined || !ok(w0)) return undefined;
  if (l <= 0) return 0;
  return finite(2 * w0 * Math.sqrt(0.5 * l));
}

/** Ablationstiefe pro Puls (Zentrum) z_abl = δ ln(F_0/F_th)  [m]; 0 für F_0 ≤ F_th. */
export function ablationDepth(delta: Num, f0: Num, fth: Num): Num {
  const l = logRatio(f0, fth);
  if (l === undefined || !ok(delta)) return undefined;
  return l <= 0 ? 0 : finite(delta * l);
}

/** Volumen pro Puls V_p = (π w_0² δ/4) ln²(F_0/F_th)  [m³]; 0 für F_0 ≤ F_th. */
export function volumePerPulse(w0: Num, delta: Num, f0: Num, fth: Num): Num {
  const l = logRatio(f0, fth);
  if (l === undefined || !(ok(w0) && ok(delta))) return undefined;
  return l <= 0 ? 0 : finite(((Math.PI * w0 * w0 * delta) / 4) * l * l);
}

/** Spezifische Abtragsrate V̇/P = δ/(2F_0) ln²(F_0/F_th)  [m³/J]; 0 für F_0 ≤ F_th. */
export function specificRemovalRate(delta: Num, f0: Num, fth: Num): Num {
  const l = logRatio(f0, fth);
  if (l === undefined || !(ok(delta) && ok(f0))) return undefined;
  return l <= 0 ? 0 : finite((delta / (2 * f0)) * l * l);
}

/** Optimale Spitzenfluenz (Gauß) F_0,opt = e² F_th  [J/m²] */
export function optimumFluence(fth: Num): Num {
  if (!ok(fth) || fth <= 0) return undefined;
  return Math.exp(2) * fth;
}

/** Maximale spezifische Abtragsrate (V̇/P)_max = 2δ/(e² F_th)  [m³/J] */
export function maxSpecificRemovalRate(delta: Num, fth: Num): Num {
  if (!(ok(delta) && ok(fth)) || fth <= 0) return undefined;
  return (2 * delta) / (Math.exp(2) * fth);
}

/** Inkubation F_th(N) = F_th(1) · N^(S−1)  [J/m²] */
export function incubationThreshold(fth1: Num, n: Num, s: Num): Num {
  if (!(ok(fth1) && ok(n) && ok(s)) || n <= 0) return undefined;
  return finite(fth1 * n ** (s - 1));
}
