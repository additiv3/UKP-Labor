import { ok, div, finite, type Num } from './util';

/** Pulsabstand Δx = v/f_rep  [m] */
export function pulseSpacing(v: Num, fRep: Num): Num {
  return div(v, fRep);
}

/** Scangeschwindigkeit für gewünschten Pulsabstand: v = Δx · f_rep  [m/s] */
export function speedForSpacing(dx: Num, fRep: Num): Num {
  if (!(ok(dx) && ok(fRep))) return undefined;
  return finite(dx * fRep);
}

/** Pulsüberlapp OL = 1 − Δx/(2w_0)  (negativ = Lücke) */
export function pulseOverlap(dx: Num, w0: Num): Num {
  if (!ok(w0)) return undefined;
  const r = div(dx, 2 * w0);
  return r === undefined ? undefined : 1 - r;
}

/** Pulse pro Spotdurchmesser (1D): N_1D = 2w_0/Δx */
export function pulsesPerSpot1D(w0: Num, dx: Num): Num {
  if (!ok(w0)) return undefined;
  return div(2 * w0, dx);
}

/** Pulse pro Fläche π w_0² (2D): N_2D = π w_0²/(Δx h) */
export function pulsesPerArea2D(w0: Num, dx: Num, h: Num): Num {
  if (!(ok(w0) && ok(dx) && ok(h))) return undefined;
  return div(Math.PI * w0 * w0, dx * h);
}

/** Linienüberlapp OL_h = 1 − h/(2w_0) */
export function lineOverlap(h: Num, w0: Num): Num {
  return pulseOverlap(h, w0);
}

/** Bearbeitungszeit Fläche t = N_layer · A/(v h)  [s] (ohne Sprung-/Beschleunigungszeiten) */
export function processingTime(nLayer: Num, area: Num, v: Num, h: Num): Num {
  if (!(ok(nLayer) && ok(area) && ok(v) && ok(h))) return undefined;
  return div(nLayer * area, v * h);
}
