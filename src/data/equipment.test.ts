import { describe, expect, it } from 'vitest';
import { bandOf, belegHint, laserLimits, laserM2, stationMatrix, withBeleg } from './equipment';
import type { Component, LaserParams } from './types';

const laserParams: LaserParams = {
  wellenlaengen: [
    { id: 'a', lambda: 1030e-9 },
    { id: 'b', lambda: 515e-9, pMax: 3, ePulsMax: 50e-6, m2: 1.3 },
    { id: 'c', lambda: 343e-9 },
  ],
  pMax: 6,
  ePulsMax: 100e-6,
  m2: 1.1,
};

const base = { createdAt: '', updatedAt: '', deviceId: '', systemId: 's' };
const laser = { ...base, id: 'L', typ: 'laserquelle', name: 'Carbide', params: laserParams } as Component;
const station = (id: string, name: string, strahlengaenge: object[], status?: string) =>
  ({ ...base, id, typ: 'station', name, status, params: { art: 'scanner', laserIds: ['L'], strahlengaenge } }) as Component;

describe('Anlagen-Hilfsfunktionen', () => {
  it('Spektralbereich', () => {
    expect([343e-9, 399e-9, 400e-9, 515e-9, 779e-9, 780e-9, 1030e-9].map(bandOf)).toEqual(['UV', 'UV', 'VIS', 'VIS', 'VIS', 'IR', 'IR']);
  });

  it('Grenzwerte und M² je Wellenlänge, sonst die der Laserquelle', () => {
    expect(laserLimits(laserParams, 515e-9)).toMatchObject({ pMax: 3, ePulsMax: 50e-6, wellenlaengen: [1030e-9, 515e-9, 343e-9] });
    expect(laserLimits(laserParams, 1030e-9)).toMatchObject({ pMax: 6, ePulsMax: 100e-6 });
    expect(laserLimits(laserParams)).toMatchObject({ pMax: 6 });
    expect(laserLimits(undefined, 515e-9)).toBeUndefined();
    expect(laserM2(laserParams, 515.0000001e-9)).toBe(1.3);
    expect(laserM2(laserParams, 1030e-9)).toBe(1.1);
  });

  it('Belege: setzen, leeren, Hinweistext', () => {
    const b1 = withBeleg(undefined, 'pMax', { unbestaetigt: true, quelle: 'DB S. 3' });
    expect(b1).toEqual({ pMax: { unbestaetigt: true, quelle: 'DB S. 3' } });
    const b2 = withBeleg(b1, 'm2', { quelle: '  ' });
    expect(b2).toEqual(b1);
    expect(withBeleg(b1, 'pMax', { unbestaetigt: false })).toBeUndefined();
    expect(belegHint(b1!.pMax)).toBe('⚠︎ unbestätigt · Quelle: DB S. 3');
    expect(belegHint(undefined)).toBeUndefined();
  });

  it('Übersicht Stationen × Spektralbereich mit Status', () => {
    const m = stationMatrix([
      laser,
      station('S1', 'Scanner VIS', [{ id: 'p1', laserId: 'L', wellenlaengeId: 'b', status: 'betriebsbereit' }]),
      station(
        'S2',
        'UV-Galvo',
        [
          { id: 'p1', laserId: 'L', wellenlaengeId: 'c', status: 'justage-noetig' },
          { id: 'p2', band: 'IR' },
          { id: 'p3', laserId: 'X' },
        ],
        'nicht-aufgebaut',
      ),
    ]);
    expect(m.columns).toEqual(['IR', 'VIS', 'UV', '?']);
    const [r1, r2] = m.rows;
    expect(r1!.status).toBe('unbekannt');
    expect(r1!.cells.VIS.map((r) => [r.lambda, r.status, r.laser?.name])).toEqual([[515e-9, 'betriebsbereit', 'Carbide']]);
    expect(r2!.status).toBe('nicht-aufgebaut');
    expect(r2!.cells.UV[0]!.status).toBe('justage-noetig');
    expect(r2!.cells.IR[0]!.lambda).toBeUndefined();
    expect(r2!.cells['?'][0]!.status).toBe('unbekannt');
  });

  it('ohne Strahlengänge zeigt die Übersicht IR/VIS/UV', () => {
    expect(stationMatrix([station('S', 'leer', [])]).columns).toEqual(['IR', 'VIS', 'UV']);
    expect(stationMatrix([]).rows).toEqual([]);
  });
});
