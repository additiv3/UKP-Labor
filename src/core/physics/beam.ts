import { ok, div, finite, type Num } from './util';
import { peakFluence } from './fluence';

/** Fokusradius (1/e²): w_0 = M² λ f/(π w_L)  [m]; w_L = Strahlradius an der Linse. */
export function focusRadius(m2: Num, lambda: Num, f: Num, wL: Num): Num {
  if (!(ok(m2) && ok(lambda) && ok(f) && ok(wL))) return undefined;
  return div(m2 * lambda * f, Math.PI * wL);
}

/** Rayleighlänge z_R = π w_0²/(M² λ)  [m] */
export function rayleighLength(w0: Num, m2: Num, lambda: Num): Num {
  if (!(ok(w0) && ok(m2) && ok(lambda))) return undefined;
  return div(Math.PI * w0 * w0, m2 * lambda);
}

/** Kaustik w(z) = w_0 √(1 + (z/z_R)²)  [m] */
export function beamRadiusAt(w0: Num, zR: Num, z: Num): Num {
  if (!(ok(w0) && ok(zR) && ok(z)) || zR === 0) return undefined;
  return finite(w0 * Math.sqrt(1 + (z / zR) ** 2));
}

/** Schärfentiefe 2 z_R  [m] */
export function depthOfFocus(zR: Num): Num {
  return zR === undefined ? undefined : 2 * zR;
}

/** Spitzenfluenz bei Defokus F_0(z) = 2E_p/(π w(z)²)  [J/m²] */
export function fluenceAtZ(ePuls: Num, w0: Num, zR: Num, z: Num): Num {
  return peakFluence(ePuls, beamRadiusAt(w0, zR, z));
}

/** Kaustik als Punktreihe für den Plot: z ∈ [−zMax, zMax], n Punkte. */
export function caustic(w0: number, zR: number, zMax: number, n = 201): { z: number[]; w: number[] } {
  const z: number[] = [];
  const w: number[] = [];
  if (!(w0 > 0 && zR > 0 && zMax > 0 && n >= 2)) return { z, w };
  for (let i = 0; i < n; i++) {
    const zi = -zMax + (2 * zMax * i) / (n - 1);
    z.push(zi);
    w.push(w0 * Math.sqrt(1 + (zi / zR) ** 2));
  }
  return { z, w };
}
