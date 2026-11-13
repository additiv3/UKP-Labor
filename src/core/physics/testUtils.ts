import { expect } from 'vitest';

/** Relativer Vergleich mit Toleranz (Standard 1e-3 gemäß docs/04_formeln.md). */
export function expectRel(actual: number | undefined, expected: number, tol = 1e-3): void {
  expect(actual, `erwartet ≈ ${expected}`).toBeDefined();
  const rel = Math.abs((actual! - expected) / expected);
  expect(rel, `ist ${actual}, erwartet ${expected} (rel. Abweichung ${rel.toExponential(2)})`).toBeLessThanOrEqual(tol);
}
