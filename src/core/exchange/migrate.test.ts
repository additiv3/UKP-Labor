import { describe, expect, it } from 'vitest';
import { assignProbenIds, migrateComponentV1toV2, upgradeRecord } from './migrate';
import { parseExport } from './schema';

const ts = '2026-11-10T10:00:00.000Z';
const v1Laser = () => ({
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: ts,
  updatedAt: ts,
  deviceId: 'd',
  systemId: 's',
  typ: 'laserquelle',
  name: 'Laser',
  params: { wellenlaengen: [1030e-9, 515e-9], pMax: 10 },
});

describe('Migration Schema 1 → 2', () => {
  it('wandelt Wellenlängen-Zahlen in Objekte mit stabilen IDs, ohne Zeitstempel zu ändern', () => {
    const c: Record<string, unknown> = v1Laser();
    expect(migrateComponentV1toV2(c)).toBe(true);
    expect(c.params).toEqual({
      wellenlaengen: [
        { id: 'w1', lambda: 1030e-9 },
        { id: 'w2', lambda: 515e-9 },
      ],
      pMax: 10,
    });
    expect(c.updatedAt).toBe(ts);
  });

  it('ist idempotent und lässt andere Typen unverändert', () => {
    const c: Record<string, unknown> = v1Laser();
    migrateComponentV1toV2(c);
    const once = structuredClone(c);
    expect(migrateComponentV1toV2(c)).toBe(false);
    expect(c).toEqual(once);
    const optik = { typ: 'optik', params: { brennweite: 0.1 } };
    expect(migrateComponentV1toV2(optik)).toBe(false);
    expect(optik).toEqual({ typ: 'optik', params: { brennweite: 0.1 } });
  });

  it('fehlende Wellenlängenliste wird zur leeren Liste', () => {
    const c: Record<string, unknown> = { typ: 'laserquelle', params: {} };
    expect(migrateComponentV1toV2(c)).toBe(true);
    expect(c.params).toEqual({ wellenlaengen: [] });
  });

  it('upgradeRecord wirkt nur auf Komponenten und nur aus Schema < 2', () => {
    const c = v1Laser();
    expect((upgradeRecord('components', structuredClone(c), 2) as typeof c).params.wellenlaengen).toEqual([1030e-9, 515e-9]);
    expect((upgradeRecord('systems', structuredClone(c), 1) as typeof c).params.wellenlaengen).toEqual([1030e-9, 515e-9]);
    expect(upgradeRecord('components', null, 1)).toBeNull();
  });
});

describe('Import älterer Exportdateien', () => {
  const file = (schemaVersion: number, components: unknown[]) =>
    JSON.stringify({ app: 'ukp-labor', schemaVersion, formelVersion: '1.0', exportedAt: ts, deviceId: 'd', data: { components } });

  it('Datei mit Schema 1 wird beim Einlesen migriert und ist gültig', () => {
    const r = parseExport(file(1, [v1Laser()]), 2);
    expect(r.fatal).toBeUndefined();
    expect(r.issues).toEqual([]);
    const c = r.file!.data.components[0]!;
    expect(c.typ === 'laserquelle' && c.params.wellenlaengen).toEqual([
      { id: 'w1', lambda: 1030e-9 },
      { id: 'w2', lambda: 515e-9 },
    ]);
    expect(c.updatedAt).toBe(ts);
  });

  it('Schema-2-Datei mit Zahlenliste ist ungültig (keine stille Migration ohne Versionsangabe)', () => {
    const r = parseExport(file(2, [v1Laser()]), 2);
    expect(r.file!.data.components).toHaveLength(0);
    expect(r.issues[0]?.message).toMatch(/wellenlaengen/);
  });

  it('Station mit Strahlengängen, Status und Belegen wird akzeptiert; unbekannter Status nicht', () => {
    const station = {
      ...v1Laser(),
      id: '22222222-2222-4222-8222-222222222222',
      typ: 'station',
      status: 'justage-noetig',
      params: {
        art: 'scanner',
        laserIds: ['11111111-1111-4111-8111-111111111111'],
        strahlengaenge: [{ id: 'a', laserId: '11111111-1111-4111-8111-111111111111', wellenlaengeId: 'w1', status: 'nicht-aufgebaut' }],
        brennweite: 0.1,
        belege: { brennweite: { unbestaetigt: true, quelle: 'Datenblatt S. 2' } },
      },
    };
    expect(parseExport(file(2, [station]), 2).issues).toEqual([]);
    const bad = { ...station, status: 'kaputt' };
    expect(parseExport(file(2, [bad]), 2).issues).toHaveLength(1);
  });
});

describe('Migration Schema 2 → 3', () => {
  const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const at = (d: number) => `2026-11-${String(d).padStart(2, '0')}T10:00:00.000Z`;
  const rec = (n: number, o: object) => ({ id: u(n), createdAt: at(10), updatedAt: at(10), deviceId: 'd', ...o });
  const materials = [rec(1, { name: 'Quarzglas', kurz: 'FS', klasse: 'glas' }), rec(2, { name: 'Silizium', kurz: 'Si', klasse: 'halbleiter' })];
  const v2Samples = () => [
    rec(12, { materialId: u(1), bezeichnung: 'zweite', createdAt: at(12) }),
    rec(11, { materialId: u(1), bezeichnung: 'erste', createdAt: at(11), deleted: true }),
    rec(13, { materialId: u(2), bezeichnung: 'Wafer', createdAt: at(5) }),
    rec(14, { materialId: u(99), bezeichnung: 'ohne Werkstoff', createdAt: at(6) }),
  ];

  it('Proben bekommen IDs je Kürzel in createdAt-Reihenfolge (gelöschte zählen mit), Zeitstempel bleiben', () => {
    const samples: Record<string, unknown>[] = v2Samples();
    const changed = assignProbenIds(materials, samples);
    expect(changed).toHaveLength(4);
    const byId = Object.fromEntries(samples.map((s) => [s.id, s.probenId]));
    expect(byId).toEqual({ [u(11)]: 'FS-001', [u(12)]: 'FS-002', [u(13)]: 'Si-001', [u(14)]: 'P-001' });
    expect(samples.every((s) => s.updatedAt === at(10))).toBe(true);
    // idempotent: vorhandene IDs bleiben, neue Proben bekommen die nächste Nummer
    samples.push(rec(15, { materialId: u(1), createdAt: at(1) }));
    expect(assignProbenIds(materials, samples).map((s) => s.probenId)).toEqual(['FS-003']);
  });

  it('Datei mit Schema 2 wird beim Einlesen migriert: Proben-IDs, Versuche behalten ihre ID ohne Art', () => {
    const exp = rec(20, { versuchsId: 'B1-Si-001', seriesId: u(30), datum: '2026-11-10', params: { w0: 1e-5 }, tags: [], status: 'durchgefuehrt' });
    const text = JSON.stringify({
      app: 'ukp-labor', schemaVersion: 2, formelVersion: '1.1', exportedAt: ts, deviceId: 'd',
      data: { materials, samples: v2Samples(), experiments: [exp] },
    });
    const r = parseExport(text, 3);
    expect(r.issues).toEqual([]);
    expect(r.file!.data.samples.map((s) => s.probenId).sort()).toEqual(['FS-001', 'FS-002', 'P-001', 'Si-001']);
    expect(r.file!.data.samples.find((s) => s.id === u(12))?.bezeichnung).toBe('zweite');
    const e = r.file!.data.experiments[0]!;
    expect(e.versuchsId).toBe('B1-Si-001');
    expect(e.versuchsartId).toBeUndefined();
    expect(e.updatedAt).toBe(at(10));
  });

  it('Schema-3-Datei: Probe ohne probenId ist ungültig; neuere Schemas werden abgelehnt', () => {
    const text = (v: number) =>
      JSON.stringify({ app: 'ukp-labor', schemaVersion: v, formelVersion: '1.1', exportedAt: ts, deviceId: 'd', data: { materials, samples: v2Samples() } });
    expect(parseExport(text(3), 3).issues).toHaveLength(4);
    expect(parseExport(text(4), 3).fatal).toMatch(/neueren App-Version/);
  });
});
