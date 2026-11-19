import { describe, expect, it } from 'vitest';
import { laserPresetValues, litTarget, optikPresetValues } from './presets';
import type { LitValue } from '../../data/types';

describe('Rechner-Presets', () => {
  it('Laser belegt nur vorhandene Werte vor', () => {
    expect(laserPresetValues({ wellenlaengen: [{ id: 'a', lambda: 1030e-9 }, { id: 'b', lambda: 515e-9 }], tauMin: 900e-15, m2: 1.2 })).toEqual({
      lambda: 1030e-9,
      tau: 900e-15,
      m2: 1.2,
    });
    expect(laserPresetValues({ wellenlaengen: [{ id: 'a', lambda: 1030e-9 }, { id: 'b', lambda: 515e-9 }] }, 515e-9)).toEqual({ lambda: 515e-9 });
    // M² der Wellenlänge hat Vorrang vor dem der Laserquelle; Einträge ohne λ werden übersprungen
    expect(
      laserPresetValues({ wellenlaengen: [{ id: 'x' }, { id: 'b', lambda: 515e-9, m2: 1.3 }], m2: 1.1 }),
    ).toEqual({ lambda: 515e-9, m2: 1.3 });
    expect(laserPresetValues({ wellenlaengen: [] })).toEqual({});
  });
  it('Optik belegt Brennweite und w0 laut Datenblatt vor', () => {
    expect(optikPresetValues({ brennweite: 0.1, w0Datenblatt: 15e-6 })).toEqual({ f: 0.1, w0: 15e-6 });
    expect(optikPresetValues({})).toEqual({});
  });
  it('Literaturwerte → Rechnerfelder', () => {
    const l = (groesse: LitValue['groesse']) => ({ groesse }) as LitValue;
    expect(litTarget(l('Fth'))).toBe('fth');
    expect(litTarget(l('delta'))).toBe('delta');
    expect(litTarget(l('S'))).toBe('s');
    expect(litTarget(l('sonstig'))).toBeUndefined();
  });
});
