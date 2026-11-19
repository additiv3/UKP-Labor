/**
 * Reine Hilfsfunktionen für Anlagen: Wellenlängen, Spektralbereiche, Strahlengänge, Übersichtsmatrix.
 * Keine Datenbankzugriffe.
 */
import type { LaserLimits } from '../core/limits';
import { UNBESTAETIGT_SYMBOL } from './labels';
import {
  BANDS,
  type Band,
  type Beleg,
  type Belege,
  type BetriebsStatus,
  type Component,
  type LaserParams,
  type StationParams,
  type Strahlengang,
  type Wellenlaenge,
} from './types';

export type LaserComponent = Extract<Component, { typ: 'laserquelle' }>;
export type StationComponent = Extract<Component, { typ: 'station' }>;

/** Relative Toleranz beim Vergleich von Wellenlängen (Einheitenumrechnung). */
const SAME = 1e-6;
export const sameLambda = (a: number, b: number) => Math.abs(a - b) <= SAME * Math.max(a, b);

/** Spektralbereich einer Wellenlänge (m): UV < 400 nm ≤ VIS < 780 nm ≤ IR. */
export function bandOf(lambda: number): Band {
  if (lambda < 400e-9) return 'UV';
  if (lambda < 780e-9) return 'VIS';
  return 'IR';
}

/** Alle bekannten Wellenlängen einer Laserquelle (m), in Listenreihenfolge. */
export function laserLambdas(p: Pick<LaserParams, 'wellenlaengen'> | undefined): number[] {
  return (p?.wellenlaengen ?? []).flatMap((w) => (w.lambda !== undefined ? [w.lambda] : []));
}

export function findWellenlaenge(p: LaserParams | undefined, lambda: number | undefined): Wellenlaenge | undefined {
  if (!p || lambda === undefined) return undefined;
  return p.wellenlaengen.find((w) => w.lambda !== undefined && sameLambda(w.lambda, lambda));
}

/**
 * Grenzwerte einer Laserquelle für eine gewählte Wellenlänge: Leistung/Pulsenergie der Wellenlänge, sonst die
 * Werte der Laserquelle (gesamt/Grundwelle).
 */
export function laserLimits(p: LaserParams | undefined, lambda?: number): LaserLimits | undefined {
  if (!p) return undefined;
  const w = findWellenlaenge(p, lambda);
  return {
    wellenlaengen: laserLambdas(p),
    pMax: w?.pMax ?? p.pMax,
    ePulsMax: w?.ePulsMax ?? p.ePulsMax,
    fRepMin: p.fRepMin,
    fRepMax: p.fRepMax,
    tauMin: p.tauMin,
    tauMax: p.tauMax,
  };
}

/** M² für eine Wellenlänge (eigener Wert, sonst der der Laserquelle). */
export function laserM2(p: LaserParams | undefined, lambda?: number): number | undefined {
  return findWellenlaenge(p, lambda)?.m2 ?? p?.m2;
}

export const statusOf = (s: { status?: BetriebsStatus } | undefined): BetriebsStatus => s?.status ?? 'unbekannt';

export function beleg(belege: Belege | undefined, key: string): Beleg | undefined {
  return belege?.[key];
}

/** Beleg setzen; leere Belege werden entfernt, damit die Daten schlank bleiben. */
export function withBeleg(belege: Belege | undefined, key: string, b: Beleg | undefined): Belege | undefined {
  const clean: Beleg = {};
  if (b?.unbestaetigt) clean.unbestaetigt = true;
  if (b?.quelle?.trim()) clean.quelle = b.quelle;
  const next: Belege = Object.fromEntries(Object.entries(belege ?? {}).filter(([k]) => k !== key));
  if (Object.keys(clean).length) next[key] = clean;
  return Object.keys(next).length ? next : undefined;
}

/** Hinweistext unter einem Wert: „⚠︎ unbestätigt · Quelle: …“. */
export function belegHint(b: Beleg | undefined): string | undefined {
  const parts: string[] = [];
  if (b?.unbestaetigt) parts.push(`${UNBESTAETIGT_SYMBOL} unbestätigt`);
  if (b?.quelle) parts.push(`Quelle: ${b.quelle}`);
  return parts.length ? parts.join(' · ') : undefined;
}

// ---------------------------------------------------------------- Strahlengänge

export interface ResolvedPath {
  path: Strahlengang;
  laser?: LaserComponent;
  wellenlaenge?: Wellenlaenge;
  lambda?: number;
  /** aus der Wellenlänge, sonst aus `path.band`; undefined = unbekannt */
  band?: Band;
  status: BetriebsStatus;
}

export function resolvePath(path: Strahlengang, lasers: LaserComponent[]): ResolvedPath {
  const laser = lasers.find((l) => l.id === path.laserId);
  const wellenlaenge = laser?.params.wellenlaengen.find((w) => w.id === path.wellenlaengeId);
  const lambda = wellenlaenge?.lambda;
  return {
    path,
    laser,
    wellenlaenge,
    lambda,
    band: lambda !== undefined ? bandOf(lambda) : path.band,
    status: statusOf(path),
  };
}

// ---------------------------------------------------------------- Übersicht Stationen × Wellenlängen

export type MatrixColumn = Band | '?';

export interface MatrixRow {
  station: StationComponent;
  status: BetriebsStatus;
  cells: Record<MatrixColumn, ResolvedPath[]>;
}

export interface StationMatrix {
  /** nur Spalten, in denen etwas steht; IR, VIS, UV, dann „?“ */
  columns: MatrixColumn[];
  rows: MatrixRow[];
}

const COLUMN_ORDER: MatrixColumn[] = [...BANDS, '?'];

/** Stationen × Spektralbereich, je Zelle die Strahlengänge mit Status. Gelöschte Komponenten vorher filtern. */
export function stationMatrix(components: Component[]): StationMatrix {
  const lasers = components.filter((c): c is LaserComponent => c.typ === 'laserquelle');
  const stations = components.filter((c): c is StationComponent => c.typ === 'station');
  const used = new Set<MatrixColumn>();
  const rows = stations.map((station) => {
    const cells = Object.fromEntries(COLUMN_ORDER.map((c) => [c, [] as ResolvedPath[]])) as Record<MatrixColumn, ResolvedPath[]>;
    for (const p of station.params.strahlengaenge) {
      const r = resolvePath(p, lasers);
      const col: MatrixColumn = r.band ?? '?';
      cells[col].push(r);
      used.add(col);
    }
    for (const col of COLUMN_ORDER) cells[col].sort((a, b) => (b.lambda ?? 0) - (a.lambda ?? 0));
    return { station, status: statusOf(station), cells };
  });
  const columns = COLUMN_ORDER.filter((c) => used.has(c));
  return { columns: columns.length ? columns : [...BANDS], rows };
}

/** Neue, leere Station. */
export function emptyStationParams(): StationParams {
  return { laserIds: [], strahlengaenge: [] };
}
