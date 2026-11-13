import { describe, expect, it } from 'vitest';
import { findUnit, formatIn, formatInput, formatNumber, formatSI, fromSI, isValidNumberInput, parseNumber, toSI } from './units';

describe('parseNumber', () => {
  it('akzeptiert Komma und Punkt', () => {
    expect(parseNumber('1,5')).toBe(1.5);
    expect(parseNumber('1.5')).toBe(1.5);
    expect(parseNumber(' 42 ')).toBe(42);
    expect(parseNumber(',5')).toBe(0.5);
    expect(parseNumber('3.')).toBe(3);
  });
  it('leere Eingabe = undefined, nicht 0', () => {
    expect(parseNumber('')).toBeUndefined();
    expect(parseNumber('   ')).toBeUndefined();
    expect(parseNumber(undefined)).toBeUndefined();
  });
  it('Vorzeichen, Unicode-Minus, Exponent, Leerzeichen', () => {
    expect(parseNumber('-2,5')).toBe(-2.5);
    expect(parseNumber('−2,5')).toBe(-2.5);
    expect(parseNumber('1e-3')).toBe(1e-3);
    expect(parseNumber('1,5E3')).toBe(1500);
    expect(parseNumber('1 000')).toBe(1000);
  });
  it('ungültig → undefined', () => {
    expect(parseNumber('abc')).toBeUndefined();
    expect(parseNumber('1,000.5')).toBeUndefined();
    expect(parseNumber('1.2.3')).toBeUndefined();
    expect(parseNumber('-')).toBeUndefined();
    expect(parseNumber('1e')).toBeUndefined();
    expect(isValidNumberInput('')).toBe(true);
    expect(isValidNumberInput('x')).toBe(false);
  });
});

describe('Einheiten', () => {
  it('Umrechnung in SI und zurück', () => {
    expect(toSI(50, 'energy', 'µJ')).toBeCloseTo(50e-6, 18);
    expect(toSI(200, 'frequency', 'kHz')).toBe(200e3);
    expect(toSI(900, 'time', 'fs')).toBeCloseTo(900e-15, 27);
    expect(toSI(18.5, 'fluence', 'J/cm²')).toBe(18.5e4);
    expect(fromSI(1.85e5, 'fluence', 'J/cm²')).toBeCloseTo(18.5, 12);
    expect(toSI(undefined, 'energy', 'µJ')).toBeUndefined();
  });
  it('Temperatur mit Offset', () => {
    expect(toSI(1414, 'temperature', '°C')).toBeCloseTo(1687.15, 9);
    expect(fromSI(1687.15, 'temperature', '°C')).toBeCloseTo(1414, 9);
    expect(toSI(300, 'temperature', 'K')).toBe(300);
    expect(toSI(2.33, 'density', 'g/cm³')).toBeCloseTo(2330, 9);
  });
  it('unbekannte Einheit → Standardeinheit', () => {
    expect(findUnit('energy', 'foo').id).toBe('µJ');
  });
});

describe('Anzeige', () => {
  it('formatNumber mit Dezimalkomma', () => {
    expect(formatNumber(18.50812)).toBe('18,51');
    expect(formatNumber(0.80937, 5)).toBe('0,80937');
    expect(formatNumber(5)).toBe('5');
    expect(formatNumber(undefined)).toBe('–');
    expect(formatNumber(1.9319e13)).toBe('1,932·10¹³');
    expect(formatNumber(5.538e-17)).toBe('5,538·10⁻¹⁷');
    expect(formatNumber(123456)).toBe('123500');
  });
  it('formatSI mit Präfixen', () => {
    expect(formatSI(50e-6, 'J')).toBe('50 µJ');
    expect(formatSI(13.114e-6, 'm')).toBe('13,11 µm');
    expect(formatSI(52.19e6, 'W')).toBe('52,19 MW');
    expect(formatSI(900e-15, 's')).toBe('900 fs');
    expect(formatSI(200e3, 'Hz')).toBe('200 kHz');
    expect(formatSI(0.9999999, 'J')).toBe('1 J');
    expect(formatSI(999.99999e-6, 'J')).toBe('1 mJ');
    expect(formatSI(-5e-3, 'm')).toBe('-5 mm');
    expect(formatSI(0, 'W')).toBe('0 W');
  });
  it('formatIn mit fester Einheit', () => {
    expect(formatIn(1.8508e5, 'fluence', 'J/cm²')).toBe('18,51 J/cm²');
  });
  it('formatInput für Eingabefelder', () => {
    expect(formatInput(13.1140001)).toBe('13,114');
    expect(formatInput(undefined)).toBe('');
  });
});
