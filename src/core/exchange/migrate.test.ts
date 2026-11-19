import { describe, expect, it } from 'vitest';
import { migrateComponentV1toV2, upgradeRecord } from './migrate';
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
