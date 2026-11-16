import { describe, expect, it } from 'vitest';
import { derivedRows, paramRows } from './printRows';
import { experimentSnapshot } from '../../core/logbook';
import { FORMEL_VERSION } from '../../core/physics/version';

const params = { pAvg: 10, fRep: 200e3, w0: 13.114e-6, w0Quelle: 'd2' as const, v: 1, hatch: 10e-6, strategie: 'Linien' };

describe('Druckansicht – Parameter', () => {
  it('nur vorhandene Werte, in fester Reihenfolge, mit Einheit', () => {
    const r = paramRows(params);
    expect(r.map((x) => x[0])).toEqual([
      'Mittlere Leistung P_avg',
      'Repetitionsrate f_rep',
      'Fokusradius w₀',
      'Scangeschwindigkeit v',
      'Hatch h',
      'Scanstrategie',
    ]);
    expect(r[0]![1]).toMatch(/10\s*W/);
    expect(r[2]![1]).toContain('(D²-gemessen)');
  });
  it('Burst: Energie als Burst-Energie beschriftet', () => {
    const r = paramRows({ ePuls: 50e-6, burst: { anzahl: 4, freq: 40e6, info: 'gleich verteilt' } });
    expect(r.map((x) => x[0])).toEqual(['Burst-Energie E_burst', 'Sub-Pulse pro Burst n', 'Intra-Burst-Frequenz', 'Burst-Info']);
  });
});

describe('Druckansicht – abgeleitete Werte', () => {
  it('nutzt den gespeicherten Snapshot und dessen Formelversion', () => {
    const r = derivedRows({ params, abgeleitet: { formelVersion: '1.0', werte: { F0: 18.508e4 } } });
    expect(r.formelVersion).toBe('1.0');
    expect(r.gespeichert).toBe(true);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]![1]).toContain('18,5');
  });
  it('ohne Snapshot neu berechnet; w(z)/F₀(z) ohne Defokus nicht doppelt', () => {
    const r = derivedRows({ params });
    expect(r.formelVersion).toBe(FORMEL_VERSION);
    expect(r.gespeichert).toBe(false);
    const labels = r.rows.map((x) => x[0]);
    expect(labels).toContain('Spitzenfluenz F₀ (Fokus)');
    expect(labels).not.toContain('F₀(z) Oberfläche');
    expect(labels).not.toContain('Strahlradius w(z) Oberfläche');
  });
  it('Burst-Werte und Beschriftung', () => {
    const p = { ...params, burst: { anzahl: 4, freq: 40e6 } };
    const r = derivedRows({ params: p, abgeleitet: experimentSnapshot(p) });
    const labels = r.rows.map((x) => x[0]);
    expect(labels).toContain('E_burst am Werkstück');
    expect(labels).toContain('E_sub am Werkstück (Sub-Puls)');
    expect(labels).toContain('F₀,sub (Fokus)');
    expect(labels).not.toContain('F₀,sub(z) Oberfläche');
  });
});
