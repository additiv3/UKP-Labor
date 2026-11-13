export interface LinearFit {
  slope: number;
  intercept: number;
  /** Bestimmtheitsmaß */
  r2: number;
  /** Anzahl verwendeter Punkte */
  n: number;
}

/** Lineare Regression (kleinste Quadrate) y = slope·x + intercept. `undefined` bei < 2 Punkten oder konstantem x. */
export function linearRegression(xs: readonly number[], ys: readonly number[]): LinearFit | undefined {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return undefined;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]!;
    sy += ys[i]!;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return undefined;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  // Bei konstantem y passt die (horizontale) Gerade exakt.
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2, n };
}

export interface D2Point {
  /** Pulsenergie [J] */
  ePuls: number;
  /** Kraterdurchmesser [m] */
  d: number;
}

export interface D2Result {
  /** Strahlradius [m] */
  w0: number;
  /** Schwellenergie [J] */
  eth: number;
  /** Schwellfluenz (Spitze) [J/m²] */
  fth: number;
  r2: number;
  n: number;
  fit: LinearFit;
}

/**
 * D²-Methode nach Liu: D² = 2w_0² ln(E_p) − 2w_0² ln(E_th).
 * Regression D² gegen ln E_p → w_0 = √(m/2), E_th = exp(−b/m), F_th = 2E_th/(π w_0²).
 * Punkte mit D ≤ 0 oder E_p ≤ 0 werden ausgeschlossen.
 */
export function d2Fit(points: readonly D2Point[]): D2Result | undefined {
  const valid = points.filter((p) => Number.isFinite(p.ePuls) && Number.isFinite(p.d) && p.ePuls > 0 && p.d > 0);
  const fit = linearRegression(
    valid.map((p) => Math.log(p.ePuls)),
    valid.map((p) => p.d * p.d),
  );
  if (!fit || !(fit.slope > 0)) return undefined;
  const w0 = Math.sqrt(fit.slope / 2);
  const eth = Math.exp(-fit.intercept / fit.slope);
  const fth = (2 * eth) / (Math.PI * w0 * w0);
  if (![w0, eth, fth].every(Number.isFinite)) return undefined;
  return { w0, eth, fth, r2: fit.r2, n: fit.n, fit };
}

export interface IncubationPoint {
  /** Pulszahl */
  n: number;
  /** Schwellfluenz F_th(N) [J/m²] */
  fth: number;
}

export interface IncubationResult {
  /** F_th(1) [J/m²] */
  fth1: number;
  /** Inkubationskoeffizient */
  s: number;
  r2: number;
  n: number;
  fit: LinearFit;
}

/** Inkubation: ln F_th(N) = ln F_th(1) + (S−1) ln N → lineare Regression. */
export function incubationFit(points: readonly IncubationPoint[]): IncubationResult | undefined {
  const valid = points.filter((p) => Number.isFinite(p.n) && Number.isFinite(p.fth) && p.n > 0 && p.fth > 0);
  const fit = linearRegression(
    valid.map((p) => Math.log(p.n)),
    valid.map((p) => Math.log(p.fth)),
  );
  if (!fit) return undefined;
  return { fth1: Math.exp(fit.intercept), s: fit.slope + 1, r2: fit.r2, n: fit.n, fit };
}
