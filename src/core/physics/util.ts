/** Optionale Zahl: `undefined` = nicht angegeben bzw. nicht berechenbar. */
export type Num = number | undefined;

/** Gibt `undefined` zurück, wenn das Ergebnis nicht endlich ist (NaN, ±∞). */
export function finite(x: number): Num {
  return Number.isFinite(x) ? x : undefined;
}

/** Typwächter: definierte, endliche Zahl. */
export function ok(x: Num): x is number {
  return x !== undefined && Number.isFinite(x);
}

/** Division mit `undefined` bei Nenner 0 oder fehlenden Werten. */
export function div(a: Num, b: Num): Num {
  if (!(ok(a) && ok(b)) || b === 0) return undefined;
  return finite(a / b);
}
