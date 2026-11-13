/**
 * Einheiten: Eingabe-Parsing, Umrechnung in SI und Anzeige mit SI-Präfixen.
 * Einzige Stelle (neben der UI) für Einheitenumrechnung.
 */

// ---------------------------------------------------------------- Eingabe

/**
 * Zahl aus Nutzereingabe. Akzeptiert Komma und Punkt als Dezimaltrenner, Exponenten (1e-3, 1,5E3),
 * Unicode-Minus und Leerzeichen als Tausendertrenner. Leere oder ungültige Eingabe → `undefined` (nicht 0).
 */
export function parseNumber(input: string | null | undefined): number | undefined {
  if (input == null) return undefined;
  let s = input.trim().replace(/[\s\u00a0\u202f]/g, '').replace(/[\u2212\u2013]/g, '-');
  if (s === '') return undefined;
  const commas = (s.match(/,/g) ?? []).length;
  const dots = (s.match(/\./g) ?? []).length;
  // Beide Trenner oder mehrere gleiche → mehrdeutig, ablehnen.
  if (commas + dots > 1) return undefined;
  s = s.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return undefined;
  const v = Number(s);
  return Number.isFinite(v) ? v : undefined;
}

/** true, wenn die Eingabe leer oder eine gültige Zahl ist. */
export function isValidNumberInput(input: string): boolean {
  return input.trim() === '' || parseNumber(input) !== undefined;
}

// ---------------------------------------------------------------- Einheiten

export interface UnitDef {
  /** Anzeige und Schlüssel, z. B. „µJ“ */
  id: string;
  /** Faktor zur SI-Basiseinheit: SI = Wert · factor + offset */
  factor: number;
  /** Nullpunktverschiebung (nur Temperatur: °C → K) */
  offset?: number;
}

/** Physikalische Größenarten mit wählbaren Einheiten. Erste Einheit = Standard. */
export const QUANTITIES = {
  length: [
    { id: 'µm', factor: 1e-6 },
    { id: 'nm', factor: 1e-9 },
    { id: 'mm', factor: 1e-3 },
    { id: 'm', factor: 1 },
  ],
  wavelength: [
    { id: 'nm', factor: 1e-9 },
    { id: 'µm', factor: 1e-6 },
  ],
  focal: [
    { id: 'mm', factor: 1e-3 },
    { id: 'm', factor: 1 },
  ],
  time: [
    { id: 'fs', factor: 1e-15 },
    { id: 'ps', factor: 1e-12 },
    { id: 'ns', factor: 1e-9 },
  ],
  duration: [
    { id: 's', factor: 1 },
    { id: 'min', factor: 60 },
    { id: 'h', factor: 3600 },
  ],
  energy: [
    { id: 'µJ', factor: 1e-6 },
    { id: 'nJ', factor: 1e-9 },
    { id: 'mJ', factor: 1e-3 },
    { id: 'J', factor: 1 },
  ],
  power: [
    { id: 'W', factor: 1 },
    { id: 'mW', factor: 1e-3 },
    { id: 'kW', factor: 1e3 },
  ],
  frequency: [
    { id: 'kHz', factor: 1e3 },
    { id: 'MHz', factor: 1e6 },
    { id: 'Hz', factor: 1 },
  ],
  velocity: [
    { id: 'mm/s', factor: 1e-3 },
    { id: 'm/s', factor: 1 },
  ],
  fluence: [
    { id: 'J/cm²', factor: 1e4 },
    { id: 'mJ/cm²', factor: 10 },
    { id: 'J/m²', factor: 1 },
  ],
  intensity: [{ id: 'W/cm²', factor: 1e4 }],
  area: [
    { id: 'mm²', factor: 1e-6 },
    { id: 'cm²', factor: 1e-4 },
    { id: 'm²', factor: 1 },
  ],
  volume: [
    { id: 'µm³', factor: 1e-18 },
    { id: 'mm³', factor: 1e-9 },
  ],
  /** spezifische Abtragsrate, SI = m³/J */
  removalRate: [{ id: 'mm³/(min·W)', factor: 1e-9 / 60 }],
  density: [
    { id: 'g/cm³', factor: 1e3 },
    { id: 'kg/m³', factor: 1 },
  ],
  thermalConductivity: [{ id: 'W/(m·K)', factor: 1 }],
  temperature: [
    { id: '°C', factor: 1, offset: 273.15 },
    { id: 'K', factor: 1 },
  ],
  bandgap: [{ id: 'eV', factor: 1 }],
  fraction: [
    { id: '%', factor: 0.01 },
    { id: '–', factor: 1 },
  ],
  none: [{ id: '', factor: 1 }],
} as const satisfies Record<string, readonly UnitDef[]>;

export type Quantity = keyof typeof QUANTITIES;

export function unitsOf(q: Quantity): readonly UnitDef[] {
  return QUANTITIES[q];
}

export function findUnit(q: Quantity, id: string | undefined): UnitDef {
  const list: readonly UnitDef[] = QUANTITIES[q];
  return list.find((u) => u.id === id) ?? list[0]!;
}

export function toSI(value: number | undefined, q: Quantity, unitId?: string): number | undefined {
  if (value === undefined) return undefined;
  const u = findUnit(q, unitId);
  return value * u.factor + (u.offset ?? 0);
}

export function fromSI(value: number | undefined, q: Quantity, unitId?: string): number | undefined {
  if (value === undefined) return undefined;
  const u = findUnit(q, unitId);
  return (value - (u.offset ?? 0)) / u.factor;
}

/** J/m² → J/cm² */
export const J_PER_M2_TO_J_PER_CM2 = 1e-4;
/** m³/J → mm³/(min·W) */
export const M3_PER_J_TO_MM3_PER_MIN_W = 1e9 * 60;

// ---------------------------------------------------------------- Anzeige

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

function superscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join('');
}

/**
 * Zahl auf `digits` signifikante Stellen, deutsches Dezimalkomma, ohne überflüssige Nullen.
 * Sehr große/kleine Beträge in Zehnerpotenz-Schreibweise: 1,932·10¹³.
 */
export function formatNumber(x: number | undefined, digits = 4): string {
  if (x === undefined || !Number.isFinite(x)) return '–';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e6 || abs < 1e-3) {
    const [mant, exp] = x.toExponential(digits - 1).split('e');
    return `${trimZeros(mant!).replace('.', ',')}·10${superscript(Number(exp))}`;
  }
  const s = x.toPrecision(digits);
  // toPrecision kann bei großen Zahlen Exponenten liefern (z. B. 12345 mit 3 Stellen)
  const plain = s.includes('e') ? String(Number(s)) : s;
  return trimZeros(plain).replace('.', ',');
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

const PREFIXES: ReadonlyArray<readonly [number, string]> = [
  [1e12, 'T'],
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
  [1e-12, 'p'],
  [1e-15, 'f'],
];

/** Wert mit SI-Präfix, z. B. formatSI(5e-5, 'J') → „50 µJ“. */
export function formatSI(x: number | undefined, unit: string, digits = 4): string {
  if (x === undefined || !Number.isFinite(x)) return '–';
  if (x === 0) return `0 ${unit}`;
  const abs = Math.abs(x);
  // Rundung berücksichtigen (999,99 µ → 1 m)
  for (const [f, p] of PREFIXES) {
    const scaled = Number((abs / f).toPrecision(digits));
    if (scaled >= 1) return `${formatNumber(Math.sign(x) * scaled, digits)} ${p}${unit}`;
  }
  const [f, p] = PREFIXES[PREFIXES.length - 1]!;
  return `${formatNumber(x / f, digits)} ${p}${unit}`;
}

/** Wert in fester Einheit einer Größenart, z. B. formatIn(1.85e5, 'fluence', 'J/cm²') → „18,51 J/cm²“. */
export function formatIn(x: number | undefined, q: Quantity, unitId?: string, digits = 4): string {
  const u = findUnit(q, unitId);
  const v = fromSI(x, q, u.id);
  if (v === undefined || !Number.isFinite(v)) return '–';
  return u.id ? `${formatNumber(v, digits)} ${u.id}` : formatNumber(v, digits);
}

/** Zahl für ein Eingabefeld (Komma, ohne Tausendertrenner, keine Zehnerpotenz-Hochzahlen). */
export function formatInput(x: number | undefined, digits = 6): string {
  if (x === undefined || !Number.isFinite(x)) return '';
  const s = Number(x.toPrecision(digits)).toString();
  return s.replace('.', ',');
}
