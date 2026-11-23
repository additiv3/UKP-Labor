import { FORMEL_VERSION } from '../physics/version';
import { describe, expect, it } from 'vitest';
import type { Component, Experiment, Material, Sample, Series, Versuchsart } from '../../data/types';
import { buildExport, exportFileName, fileSafe, serializeExport } from './exportJson';
import { buildCsv, csvField, csvNumber, CSV_COLUMNS } from './exportCsv';
import { planMerge, totalCounts } from './importMerge';
import { emptyData, parseExport, type ExportData } from './schema';

const T0 = '2026-11-01T10:00:00.000Z';
const T1 = '2026-11-02T10:00:00.000Z';
const T2 = '2026-11-03T10:00:00.000Z';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const series = (o: Partial<Series> = {}): Series => ({
  id: uid(1), createdAt: T0, updatedAt: T0, deviceId: 'a', code: 'B1', titel: 'Schwelle Si', status: 'laufend', ...o,
});
const mat = (o: Partial<Material> = {}): Material => ({
  id: uid(2), createdAt: T0, updatedAt: T0, deviceId: 'a', name: 'Silizium', kurz: 'Si', klasse: 'halbleiter', ...o,
});
const exp = (o: Partial<Experiment> = {}): Experiment => ({
  id: uid(10), createdAt: T0, updatedAt: T0, deviceId: 'a', versuchsId: 'B1-Si-001', seriesId: uid(1), datum: '2026-11-01',
  materialId: uid(2), params: { pAvg: 10, fRep: 200e3, w0: 13.114e-6, v: 1, hatch: 10e-6, lambda: 1030e-9, tau: 900e-15 },
  tags: ['schwelle', 'si'], status: 'durchgefuehrt', ...o,
});
const sample = (o: Partial<Sample> = {}): Sample => ({
  id: uid(40), createdAt: T0, updatedAt: T0, deviceId: 'a', probenId: 'FS-001', materialId: uid(2), ...o,
});
const art = (o: Partial<Versuchsart> = {}): Versuchsart => ({
  id: uid(50), createdAt: T0, updatedAt: T0, deviceId: 'a', kuerzel: 'DRL', name: 'Bohren', ...o,
});
const data = (o: Partial<ExportData>): ExportData => ({ ...emptyData(), ...o });

describe('JSON-Export', () => {
  it('Kopf, Tombstones, Dateiname', () => {
    const f = buildExport(data({ series: [series()], experiments: [exp(), exp({ id: uid(11), deleted: true })] }), {
      schemaVersion: 1, deviceId: 'dev', deviceName: 'iPhone', now: new Date(T1),
    });
    expect(f.app).toBe('ukp-labor');
    expect(f.schemaVersion).toBe(1);
    expect(f.formelVersion).toBe(FORMEL_VERSION);
    expect(f.exportedAt).toBe(T1);
    expect(f.data.experiments).toHaveLength(2);
    expect(Object.keys(f.data)).toEqual(['systems', 'components', 'materials', 'litValues', 'samples', 'versuchsarten', 'series', 'experiments', 'notes']);
    expect(exportFileName('iPhone 15', new Date(2026, 10, 13))).toBe('20261113_ukp-labor_iphone-15.json');
    expect(exportFileName('', new Date(2026, 0, 2), 'csv')).toBe('20260102_ukp-labor_geraet.csv');
    expect(fileSafe('Laptop Büro/Groß')).toBe('laptop-buro-gross');
  });

  it('Rundreise: Export → Parse ergibt dieselben Daten', () => {
    const d = data({ series: [series()], materials: [mat()], experiments: [exp({ abgeleitet: { formelVersion: '1.0', werte: { F0: 1.85e5 } } })] });
    const text = serializeExport(buildExport(d, { schemaVersion: 1, deviceId: 'dev' }));
    const r = parseExport(text, 1);
    expect(r.fatal).toBeUndefined();
    expect(r.issues).toEqual([]);
    expect(r.file!.data).toEqual(d);
  });
});

describe('Import-Validierung: Bericht statt Absturz', () => {
  it('kein JSON / fremde Datei / neueres Schema', () => {
    expect(parseExport('{kaputt', 1).fatal).toMatch(/kein gültiges JSON/);
    expect(parseExport('{"app":"anders"}', 1).fatal).toMatch(/Keine gültige UKP-Labor/);
    const f = buildExport(emptyData(), { schemaVersion: 2, deviceId: 'd' });
    expect(parseExport(JSON.stringify(f), 1).fatal).toMatch(/neueren App-Version/);
  });
  it('ungültige Einzeldatensätze werden übersprungen und gemeldet', () => {
    const f = buildExport(data({ experiments: [exp(), exp({ id: 'keine-uuid' }), exp({ id: uid(12), tags: 'x' as unknown as string[] })] }), {
      schemaVersion: 1, deviceId: 'd',
    });
    const r = parseExport(JSON.stringify(f), 1);
    expect(r.file!.data.experiments).toHaveLength(1);
    expect(r.issues).toHaveLength(2);
    expect(r.issues.find((i) => i.id === 'keine-uuid')).toMatchObject({ table: 'experiments', message: expect.stringMatching(/id/) });
    expect(r.issues.find((i) => i.id === uid(12))!.message).toMatch(/tags/);
  });
  it('Literaturwert ohne Citekey ist ungültig', () => {
    const lit = { id: uid(30), createdAt: T0, updatedAt: T0, deviceId: 'a', materialId: uid(2), groesse: 'Fth', wert: 2000, einheit: 'J/cm²', citekey: '' };
    const r = parseExport(JSON.stringify({ ...buildExport(emptyData(), { schemaVersion: 1, deviceId: 'd' }), data: { litValues: [lit] } }), 1);
    expect(r.file!.data.litValues).toHaveLength(0);
    expect(r.issues[0]!.message).toMatch(/Citekey/);
  });
  it('BOM am Anfang wird toleriert', () => {
    const f = serializeExport(buildExport(emptyData(), { schemaVersion: 1, deviceId: 'd' }));
    expect(parseExport(`\uFEFF${f}`, 1).fatal).toBeUndefined();
  });
});

describe('Merge-Regeln', () => {
  it('unbekannte id → neu; neuer gewinnt; Gleichstand nichts; lokal neuer bleibt', () => {
    const local = data({ series: [series({ updatedAt: T1, titel: 'lokal' })], materials: [mat({ updatedAt: T1 })], experiments: [exp({ updatedAt: T2 })] });
    const incoming = data({
      series: [series({ updatedAt: T2, titel: 'neuer' })],
      materials: [mat({ updatedAt: T1 })],
      experiments: [exp({ updatedAt: T1, bemerkung: 'alt' }), exp({ id: uid(11), versuchsId: 'B1-Si-002' })],
    });
    const p = planMerge(local, incoming);
    expect(p.counts.series).toMatchObject({ aktualisiert: 1 });
    expect(p.puts.series[0]!.titel).toBe('neuer');
    expect(p.counts.materials).toMatchObject({ unveraendert: 1 });
    expect(p.counts.experiments).toMatchObject({ neu: 1, lokalNeuer: 1 });
    expect(p.puts.experiments.map((e) => e.id)).toEqual([uid(11)]);
    expect(p.conflicts).toEqual([]);
    expect(totalCounts(p)).toMatchObject({ neu: 1, aktualisiert: 1, unveraendert: 1, lokalNeuer: 1 });
  });

  it('neuerer Tombstone löscht, älterer nicht', () => {
    const local = data({ experiments: [exp({ updatedAt: T1 })] });
    const p1 = planMerge(local, data({ experiments: [exp({ updatedAt: T2, deleted: true })] }));
    expect(p1.counts.experiments.geloescht).toBe(1);
    expect(p1.puts.experiments[0]!.deleted).toBe(true);
    const p2 = planMerge(local, data({ experiments: [exp({ updatedAt: T0, deleted: true })] }));
    expect(p2.empty).toBe(true);
  });

  it('lokaler Tombstone wird durch neuere Änderung wiederbelebt', () => {
    const p = planMerge(data({ experiments: [exp({ updatedAt: T1, deleted: true })] }), data({ experiments: [exp({ updatedAt: T2 })] }));
    expect(p.counts.experiments.aktualisiert).toBe(1);
    expect(p.puts.experiments[0]!.deleted).toBeUndefined();
  });

  it('gleiche versuchsId, andere UUID → beide behalten, importierte bekommt -K1', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    const local = data({ experiments: [exp(), exp({ id: uid(12), versuchsId: 'B1-Si-001-K1' })] });
    const incoming = data({ experiments: [exp({ id: uid(20) }), exp({ id: uid(21) })] });
    const p = planMerge(local, incoming, { now, deviceId: 'hier' });
    expect(p.counts.experiments.neu).toBe(2);
    expect(p.conflicts.map((c) => c.umbenanntIn)).toEqual(['B1-Si-001-K2', 'B1-Si-001-K3']);
    expect(p.conflicts[0]).toMatchObject({ versuchsId: 'B1-Si-001', id: uid(20), lokalId: uid(10) });
    expect(p.puts.experiments[0]).toMatchObject({ versuchsId: 'B1-Si-001-K2', updatedAt: now.toISOString(), deviceId: 'hier' });
  });

  it('doppelte Reihen-Codes werden gemeldet, nicht umbenannt', () => {
    const p = planMerge(data({ series: [series()] }), data({ series: [series({ id: uid(99) }), series({ id: uid(98), code: 'B2' })] }));
    expect(p.seriesCodeConflicts).toEqual(['B1']);
    expect(p.puts.series.map((s) => s.code)).toEqual(['B1', 'B2']);
    expect(planMerge(data({ series: [series()] }), data({ series: [series({ updatedAt: T1 })] })).seriesCodeConflicts).toEqual([]);
  });

  it('kein Konflikt mit gelöschtem lokalen Versuch', () => {
    const p = planMerge(data({ experiments: [exp({ deleted: true })] }), data({ experiments: [exp({ id: uid(20) })] }));
    expect(p.conflicts).toEqual([]);
  });

  it('Import der eigenen Datei ändert nichts (idempotent)', () => {
    const d = data({ series: [series()], materials: [mat()], experiments: [exp()] });
    const p = planMerge(d, d);
    expect(p.empty).toBe(true);
    expect(totalCounts(p).unveraendert).toBe(3);
  });

  it('zwei Geräte konvergieren (A→B, B→A)', () => {
    const A = data({ series: [series()], experiments: [exp()] });
    const B = data({ series: [series({ updatedAt: T1, titel: 'auf B geändert' })], experiments: [exp({ id: uid(30), versuchsId: 'B1-Si-001' })] });
    const apply = (base: ExportData, plan: ReturnType<typeof planMerge>): ExportData => {
      const out = structuredClone(base);
      for (const t of Object.keys(plan.puts) as (keyof ExportData)[]) {
        for (const r of plan.puts[t]) {
          const arr = out[t] as { id: string }[];
          const i = arr.findIndex((x) => x.id === r.id);
          if (i >= 0) arr[i] = r;
          else arr.push(r);
        }
      }
      return out;
    };
    const B2 = apply(B, planMerge(B, A, { now: new Date(T2) }));
    const A2 = apply(A, planMerge(A, B2, { now: new Date(T2) }));
    const key = (d: ExportData) => JSON.stringify(d.experiments.map((e) => [e.id, e.versuchsId]).sort());
    expect(key(A2)).toBe(key(B2));
    expect(A2.series[0]!.titel).toBe('auf B geändert');
    expect(planMerge(A2, B2).empty).toBe(true);
  });
});

describe('Merge Schema 3', () => {
  const now = new Date('2026-11-20T08:00:00.000Z');
  it('gleiche probenId, andere UUID → importierte Probe bekommt -K1', () => {
    const local = data({ samples: [sample()] });
    const p = planMerge(local, data({ samples: [sample({ id: uid(41) }), sample({ id: uid(42), probenId: 'FS-002' })] }), { now, deviceId: 'hier' });
    expect(p.probenConflicts).toEqual([{ wert: 'FS-001', umbenanntIn: 'FS-001-K1', id: uid(41), lokalId: uid(40) }]);
    expect(p.puts.samples.find((s) => s.id === uid(41))).toMatchObject({ probenId: 'FS-001-K1', updatedAt: now.toISOString(), deviceId: 'hier' });
    expect(p.puts.samples.find((s) => s.id === uid(42))!.probenId).toBe('FS-002');
  });
  it('gleiches Versuchsart-Kürzel, andere UUID → importierte Art bekommt K1 ohne Bindestrich', () => {
    const p = planMerge(data({ versuchsarten: [art()] }), data({ versuchsarten: [art({ id: uid(51), name: 'Bohren (Laptop)' })] }), { now });
    expect(p.artConflicts).toEqual([{ wert: 'DRL', umbenanntIn: 'DRLK1', id: uid(51), lokalId: uid(50) }]);
    expect(p.puts.versuchsarten[0]!.kuerzel).toBe('DRLK1');
    // gleiche UUID (z. B. Seed-Art) ist kein Konflikt
    expect(planMerge(data({ versuchsarten: [art()] }), data({ versuchsarten: [art({ updatedAt: T1, name: 'neu' })] })).artConflicts).toEqual([]);
  });
  it('importierte Versuche werden idFixiert, ohne neuen Zeitstempel', () => {
    const local = data({ experiments: [exp(), exp({ id: uid(12), versuchsId: 'B1-Si-002' })] });
    const incoming = data({ experiments: [exp(), exp({ id: uid(12), versuchsId: 'B1-Si-002', updatedAt: T1 }), exp({ id: uid(13), versuchsId: 'B1-Si-003' })] });
    const p = planMerge(local, incoming);
    expect(p.puts.experiments.map((e) => [e.id, e.idFixiert, e.updatedAt])).toEqual([
      [uid(12), true, T1],
      [uid(13), true, T0],
    ]);
    // unverändert, aber in der Datei → lokal festschreiben; zählt nicht als Änderung
    expect(p.fixieren).toEqual([uid(10)]);
    expect(planMerge(data({ experiments: [exp()] }), data({ experiments: [exp()] }))).toMatchObject({ empty: true, fixieren: [uid(10)] });
    expect(planMerge(data({ experiments: [exp({ idFixiert: true })] }), data({ experiments: [exp()] })).fixieren).toEqual([]);
  });
});

describe('CSV-Export', () => {
  it('Kopf, BOM, Trennzeichen, Einheiten, Dezimalpunkt', () => {
    const csv = buildCsv(data({ series: [series()], materials: [mat()], experiments: [exp({ bemerkung: 'Rand; "ausgefranst"\nzweite Zeile' }), exp({ id: uid(11), deleted: true })] }));
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(CSV_COLUMNS.join(';'));
    expect(lines[0]).toBe(
      'versuchsId;art;datum;reihe;material;probe;probenFeld;anlage;station;laser;optik;lambda_nm;tau_fs;pAvg_W;ePuls_uJ;fRep_kHz;transmission;w0_um;w0Quelle;w0Beleg;fokuslage_um;v_mm_s;pulsabstand_um;hatch_um;nPulse;ueberfahrten;F0_J_cm2;OL;N2D;burstN;fBurst_MHz;F0Sub_J_cm2;strategie;atmosphaere;tags;status;bemerkung;id;updatedAt',
    );
    const body = csv.slice(1 + lines[0]!.length + 2);
    expect(body.startsWith('B1-Si-001;;2026-11-01;B1;Silizium;;;;;;;1030;900;10;50;200;;13.114;;;;1000;5;10;;;18.50')).toBe(true);
    expect(body).toContain('"Rand; ""ausgefranst""\nzweite Zeile"');
    expect(body).toContain(';schwelle,si;durchgefuehrt;');
    expect(body).not.toContain(uid(11));
  });
  it('Art, Proben-ID, Probenfeld, Station, w₀-Beleg', () => {
    const station = { id: uid(60), createdAt: T0, updatedAt: T0, deviceId: 'a', systemId: uid(61), typ: 'station', name: 'Scanner 1', params: { laserIds: [], strahlengaenge: [] } } as Component;
    const e = exp({
      versuchsId: 'V0-ABL-001', versuchsartId: uid(50), sampleId: uid(40), probenFeld: 'F01', stationId: uid(60),
      params: { ...exp().params, w0Quelle: 'gemessen', w0Beleg: 'K-SPOT-001' },
    });
    const csv = buildCsv(data({ versuchsarten: [art({ kuerzel: 'ABL' })], samples: [sample({ bezeichnung: 'Wafer 4"' })], components: [station], experiments: [e] }));
    const [head, row] = csv.slice(1).split('\r\n');
    const cols = head!.split(';');
    const cells = row!.split(';');
    const cell = (c: string) => cells[cols.indexOf(c)];
    expect(cols.indexOf('art')).toBe(cols.indexOf('versuchsId') + 1);
    expect(cell('art')).toBe('ABL');
    expect(cell('probe')).toBe('FS-001');
    expect(cell('probenFeld')).toBe('F01');
    expect(cell('station')).toBe('Scanner 1');
    expect(cell('w0Quelle')).toBe('gemessen');
    expect(cell('w0Beleg')).toBe('K-SPOT-001');
  });
  it('Burst-Spalten', () => {
    const e = exp();
    const csv = buildCsv(data({ series: [series()], materials: [mat()], experiments: [{ ...e, abgeleitet: undefined, params: { ...e.params, burst: { anzahl: 4, freq: 40e6 } } }] }));
    const [head, row] = csv.slice(1).split('\r\n');
    const cols = head!.split(';');
    const cells = row!.split(';');
    expect(cells[cols.indexOf('burstN')]).toBe('4');
    expect(cells[cols.indexOf('fBurst_MHz')]).toBe('40');
    expect(Number(cells[cols.indexOf('F0Sub_J_cm2')])).toBeCloseTo(4.627, 2);
  });
  it('Zahlen und Felder', () => {
    expect(csvNumber(0.1 + 0.2)).toBe('0.3');
    expect(csvNumber(1.5e-6, 1e6)).toBe('1.5');
    expect(csvNumber(undefined)).toBe('');
    expect(csvNumber(5.538e-17)).not.toMatch(/e/);
    expect(csvField('a;b')).toBe('"a;b"');
    expect(csvField('ok')).toBe('ok');
  });
});
