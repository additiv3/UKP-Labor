import { describe, expect, it } from 'vitest';
import { formatLitConditions, formatLitValue, validateLit, type LitDraft } from './litFormat';
import type { LitValue } from '../../data/types';

const base: LitDraft = { materialId: 'm', groesse: 'Fth', wert: 2000, einheit: 'J/cm²', citekey: 'bonse2002' };

describe('Literaturwerte', () => {
  it('Citekey ist Pflicht', () => {
    expect(validateLit(base)).toBeUndefined();
    expect(validateLit({ ...base, citekey: '' })).toMatch(/Citekey fehlt/);
    expect(validateLit({ ...base, citekey: 'a b' })).toMatch(/ohne Leerzeichen/);
    expect(validateLit({ ...base, wert: undefined })).toMatch(/Wert fehlt/);
    expect(validateLit({ ...base, groesse: 'sonstig', einheit: '' })).toMatch(/Einheit/);
  });
  it('Anzeige in gewählter Einheit', () => {
    const l = { ...base, id: '1', createdAt: '', updatedAt: '', deviceId: '' } as LitValue;
    expect(formatLitValue(l)).toBe('0,2 J/cm²');
    expect(formatLitValue({ ...l, groesse: 'delta', wert: 20e-9, einheit: 'nm' })).toBe('20 nm');
    expect(formatLitValue({ ...l, groesse: 'S', wert: 0.8 })).toBe('0,8');
    expect(formatLitConditions({ ...l, lambda: 1030e-9, tau: 900e-15, nPulse: 100, methode: 'D²' })).toBe('1030 nm · 900 fs · N = 100 · D²');
  });
});
