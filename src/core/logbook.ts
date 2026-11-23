/**
 * Logbuch-Logik als reine Funktionen: abgeleitete Werte, Duplizieren, Filter, Tags, Datum.
 */
import { derive, snapshot, type Derived, type DeriveInput } from './physics/derive';
import { nextVersuchsId } from './ids';
import type { Experiment, ExperimentParams, ExperimentStatus } from '../data/types';

/** Versuchsparameter → Rechenkern-Eingabe (Fokuslage = z, Pulsabstand direkt oder aus v/f_rep). */
export function toDeriveInput(p: ExperimentParams): DeriveInput {
  return {
    lambda: p.lambda,
    tau: p.tau,
    pAvg: p.pAvg,
    ePuls: p.ePuls,
    fRep: p.fRep,
    burstN: p.burst?.anzahl,
    fBurst: p.burst?.freq,
    transmission: p.transmission,
    w0: p.w0,
    m2: p.m2,
    z: p.fokuslage,
    v: p.v,
    pulsabstand: p.pulsabstand,
    hatch: p.hatch,
    nPulse: p.nPulse,
  };
}

export function deriveExperiment(p: ExperimentParams): Derived {
  return derive(toDeriveInput(p));
}

/**
 * Snapshot der abgeleiteten Werte zum Speichern (mit Formelversion).
 * Nur Werte, die sich aus den Versuchsparametern ergeben (keine Materialwerte).
 */
export function experimentSnapshot(p: ExperimentParams): NonNullable<Experiment['abgeleitet']> {
  const d = deriveExperiment(p);
  const keep: (keyof Derived)[] = ['ePulsQuelle', 'pAvgQuelle', 'ePuls', 'pAvg', 'pPk', 'w0', 'zR', 'wz', 'F0', 'Fmean', 'F0z', 'I0', 'dx', 'OL', 'N1D', 'N2D', 'OLh', 'nBurst', 'ePulsSub', 'dtSub', 'tBurst', 'F0Sub', 'F0zSub'];
  const s = snapshot(d);
  const werte: Record<string, number> = {};
  for (const k of keep) if (s.werte[k] !== undefined) werte[k] = s.werte[k];
  return { formelVersion: s.formelVersion, werte };
}

/** Heutiges Datum als ISO-Datum (lokale Zeit), z. B. „2026-11-13“. */
export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO-Datum → „TT.MM.JJJJ“. */
export function formatDateDe(iso: string | undefined): string {
  if (!iso) return '–';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Tags aus Freitext: Trennung durch Komma, Semikolon oder Leerzeichen; ohne „#“, ohne Duplikate. */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,;\s]+/)) {
    const t = raw.replace(/^#/, '').trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Versuchsart für eine neue Versuchs-ID (UUID + Kürzel). */
export interface ArtRef {
  id: string;
  kuerzel: string;
}

export interface DuplicateContext {
  /** alle vorhandenen Versuchs-IDs inkl. gelöschter (für die laufende Nummer) */
  existingIds: Iterable<string>;
  seriesCode: string;
  /** Art der Vorlage bzw. abgefragte Art, falls die Vorlage (alt) keine hat */
  art: ArtRef;
  datum?: string;
  status?: ExperimentStatus;
}

type NewExperiment = Omit<Experiment, 'id' | 'createdAt' | 'updatedAt' | 'deviceId' | 'deleted' | 'idFixiert'>;

/**
 * Kopie als Vorlage: gleiche Art, Parameter, Anlage, Probe und Tags; neue ID, heutiges Datum, ohne Bemerkung und
 * ohne Probenfeld (jeder Versuch liegt auf einem eigenen Feld).
 */
export function duplicateExperiment(src: Experiment, ctx: DuplicateContext): NewExperiment {
  const params = structuredClone(src.params);
  return {
    versuchsId: nextVersuchsId(ctx.existingIds, ctx.seriesCode, ctx.art.kuerzel),
    versuchsartId: ctx.art.id,
    seriesId: src.seriesId,
    datum: ctx.datum ?? todayIso(),
    systemId: src.systemId,
    laserId: src.laserId,
    optikId: src.optikId,
    scannerId: src.scannerId,
    stationId: src.stationId,
    strahlengangId: src.strahlengangId,
    sampleId: src.sampleId,
    materialId: src.materialId,
    params,
    abgeleitet: experimentSnapshot(params),
    tags: [...src.tags],
    status: ctx.status ?? 'durchgefuehrt',
  };
}

export interface ExperimentFilter {
  seriesId?: string;
  materialId?: string;
  systemId?: string;
  tag?: string;
  /** ISO-Datum, inklusive */
  von?: string;
  /** ISO-Datum, inklusive */
  bis?: string;
  status?: ExperimentStatus;
  /** Volltext über ID, Bemerkung, Tags, Strategie, Atmosphäre, Absaugung */
  text?: string;
}

export function matchesFilter(e: Experiment, f: ExperimentFilter): boolean {
  if (e.deleted) return false;
  if (f.seriesId && e.seriesId !== f.seriesId) return false;
  if (f.materialId && e.materialId !== f.materialId) return false;
  if (f.systemId && e.systemId !== f.systemId) return false;
  if (f.status && e.status !== f.status) return false;
  if (f.tag && !e.tags.includes(f.tag)) return false;
  const d = e.datum.slice(0, 10);
  if (f.von && d < f.von) return false;
  if (f.bis && d > f.bis) return false;
  const q = f.text?.trim().toLowerCase();
  if (q) {
    const hay = [e.versuchsId, e.bemerkung, e.params.strategie, e.params.atmosphaere, e.params.absaugung, ...e.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Sortierung: neuestes Datum zuerst, dann Versuchs-ID absteigend. */
export function compareExperiments(a: Experiment, b: Experiment): number {
  return b.datum.localeCompare(a.datum) || b.versuchsId.localeCompare(a.versuchsId, 'de', { numeric: true });
}

/** Sortierung innerhalb einer Reihe: Versuchs-ID aufsteigend (B1-ABL-001, -002 …). */
export function compareByVersuchsId(a: Experiment, b: Experiment): number {
  return a.versuchsId.localeCompare(b.versuchsId, 'de', { numeric: true });
}
