import { describe, expect, it } from 'vitest';
import {
  compareByVersuchsId,
  compareExperiments,
  duplicateExperiment,
  experimentSnapshot,
  formatDateDe,
  matchesFilter,
  parseTags,
  todayIso,
} from './logbook';
import { FORMEL_VERSION } from './physics/version';
import type { Experiment } from '../data/types';

const exp = (o: Partial<Experiment> = {}): Experiment => ({
  id: 'u1',
  createdAt: '',
  updatedAt: '',
  deviceId: 'd',
  versuchsId: 'B1-Si-001',
  seriesId: 's1',
  datum: '2026-11-10',
  materialId: 'm1',
  systemId: 'a1',
  params: { pAvg: 10, fRep: 200e3, w0: 13.114e-6, v: 1, hatch: 10e-6, strategie: 'Linien bidirektional' },
  bemerkung: 'Schwelle getroffen',
  tags: ['schwelle', 'si'],
  status: 'durchgefuehrt',
  ...o,
});

describe('Snapshot', () => {
  it('enthält Formelversion und Referenzwerte', () => {
    const s = experimentSnapshot(exp().params);
    expect(s.formelVersion).toBe(FORMEL_VERSION);
    expect(s.werte.ePuls).toBeCloseTo(50e-6, 12);
    expect(s.werte.F0! / 1e4).toBeCloseTo(18.508, 2);
    expect(s.werte.OL).toBeCloseTo(0.80937, 4);
    expect(s.werte.N2D).toBeCloseTo(10.806, 2);
    // keine Materialwerte
    expect(s.werte.D).toBeUndefined();
  });
  it('Fokuslage geht als Defokus ein', () => {
    const zR = 437.15e-6;
    const s = experimentSnapshot({ ePuls: 50e-6, w0: 13.114e-6, m2: 1.2, lambda: 1030e-9, fokuslage: 2 * zR });
    expect(s.werte.F0z! / s.werte.F0!).toBeCloseTo(0.2, 3);
  });
  it('leere Parameter → leerer Snapshot', () => {
    expect(experimentSnapshot({}).werte).toEqual({});
  });
});

describe('Snapshot mit Burst (Formelversion 1.1)', () => {
  it('E_p gilt pro Burst; Sub-Puls-Werte im Snapshot', () => {
    const s = experimentSnapshot({ ...exp().params, burst: { anzahl: 4, freq: 40e6 } });
    expect(s.werte.ePuls).toBeCloseTo(50e-6, 12);
    expect(s.werte.nBurst).toBe(4);
    expect(s.werte.ePulsSub).toBeCloseTo(12.5e-6, 12);
    expect(s.werte.F0Sub! / 1e4).toBeCloseTo(4.627, 2);
    expect(s.werte.dtSub).toBeCloseTo(25e-9, 15);
    expect(s.werte.tBurst).toBeCloseTo(75e-9, 15);
  });
  it('ohne Burst keine Burst-Werte', () => {
    const s = experimentSnapshot({ ...exp().params, burst: { anzahl: 1 } });
    expect(s.werte.nBurst).toBeUndefined();
    expect(s.werte.ePulsSub).toBeUndefined();
  });
});

describe('Duplizieren', () => {
  it('neue ID, heutiges Datum, Parameter kopiert, Bemerkung leer', () => {
    const src = exp();
    const d = duplicateExperiment(src, {
      existingIds: ['B1-Si-001', 'B1-Si-002'],
      seriesCode: 'B1',
      materialKurz: 'Si',
      datum: '2026-11-13',
    });
    expect(d.versuchsId).toBe('B1-Si-003');
    expect(d.datum).toBe('2026-11-13');
    expect(d.bemerkung).toBeUndefined();
    expect(d.params).toEqual(src.params);
    expect(d.params).not.toBe(src.params);
    expect(d.tags).toEqual(src.tags);
    expect(d.abgeleitet?.werte.ePuls).toBeCloseTo(50e-6, 12);
    expect('id' in d).toBe(false);
  });
});

describe('Filter und Suche', () => {
  const list = [
    exp(),
    exp({ id: 'u2', versuchsId: 'B1-FS-001', materialId: 'm2', datum: '2026-10-01', tags: ['glas'], bemerkung: undefined }),
    exp({ id: 'u3', versuchsId: 'B2-Si-001', seriesId: 's2', systemId: 'a2', status: 'geplant' }),
    exp({ id: 'u4', deleted: true }),
  ];
  const ids = (f: Parameters<typeof matchesFilter>[1]) => list.filter((e) => matchesFilter(e, f)).map((e) => e.id);
  it('nach Reihe, Material, Anlage, Tag, Status', () => {
    expect(ids({})).toEqual(['u1', 'u2', 'u3']);
    expect(ids({ seriesId: 's1' })).toEqual(['u1', 'u2']);
    expect(ids({ materialId: 'm2' })).toEqual(['u2']);
    expect(ids({ systemId: 'a2' })).toEqual(['u3']);
    expect(ids({ tag: 'glas' })).toEqual(['u2']);
    expect(ids({ status: 'geplant' })).toEqual(['u3']);
  });
  it('Zeitraum inklusive', () => {
    expect(ids({ von: '2026-11-10' })).toEqual(['u1', 'u3']);
    expect(ids({ bis: '2026-10-01' })).toEqual(['u2']);
  });
  it('Volltext (alle Wörter, ohne Groß/Klein)', () => {
    expect(ids({ text: 'schwelle' })).toEqual(['u1', 'u3']);
    expect(ids({ text: 'b1 FS' })).toEqual(['u2']);
    expect(ids({ text: 'bidirektional getroffen' })).toEqual(['u1', 'u3']);
    expect(ids({ text: 'nichts' })).toEqual([]);
  });
  it('Sortierung', () => {
    const a = exp({ versuchsId: 'B1-Si-010', datum: '2026-11-10' });
    const b = exp({ versuchsId: 'B1-Si-009', datum: '2026-11-10' });
    expect([b, a].sort(compareByVersuchsId).map((e) => e.versuchsId)).toEqual(['B1-Si-009', 'B1-Si-010']);
    expect([b, a].sort(compareExperiments).map((e) => e.versuchsId)).toEqual(['B1-Si-010', 'B1-Si-009']);
  });
});

describe('Hilfen', () => {
  it('Tags', () => {
    expect(parseTags('#schwelle, si;  glas si')).toEqual(['schwelle', 'si', 'glas']);
    expect(parseTags('  ')).toEqual([]);
  });
  it('Datum', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateDe('2026-11-13')).toBe('13.11.2026');
    expect(formatDateDe(undefined)).toBe('–');
  });
});
