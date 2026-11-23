import { describe, expect, it } from 'vitest';
import {
  formatProbenId,
  formatVersuchsId,
  nextLaufnummer,
  nextProbenId,
  nextVersuchsId,
  uuid,
  validateArtKuerzel,
  versuchsIdPrefix,
} from './ids';

describe('uuid', () => {
  it('liefert UUID v4', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (let i = 0; i < 20; i++) expect(uuid()).toMatch(re);
  });
});

describe('Versuchs-ID', () => {
  it('formatiert <Reihe>-<Art>-<NNN>', () => {
    expect(formatVersuchsId('K', 'SPOT', 1)).toBe('K-SPOT-001');
    expect(formatVersuchsId(' V 0 ', 'A-BL', 42)).toBe('V0-ABL-042');
    expect(formatVersuchsId('B1', 'THR', 1234)).toBe('B1-THR-1234');
    expect(versuchsIdPrefix('B1', 'THR')).toBe('B1-THR-');
  });
  it('zählt fortlaufend je Reihe + Art', () => {
    const ids = ['K-SPOT-001', 'K-SPOT-007', 'V0-ABL-003', 'K1-SPOT-020', 'K-SPOT-008-K1'];
    expect(nextLaufnummer(ids, 'K', 'SPOT')).toBe(9);
    expect(nextVersuchsId(ids, 'V0', 'ABL')).toBe('V0-ABL-004');
    expect(nextVersuchsId(ids, 'V0', 'THR')).toBe('V0-THR-001');
    expect(nextVersuchsId(ids, 'B2', 'SPOT')).toBe('B2-SPOT-001');
  });
  it('Präfix muss exakt passen (K-SPOT ≠ K-SPOTX)', () => {
    expect(nextVersuchsId(['K-SPOTX-005', 'XK-SPOT-009'], 'K', 'SPOT')).toBe('K-SPOT-001');
  });
  it('Konflikt-Suffix zählt mit der Nummer davor', () => {
    expect(nextVersuchsId(['V0-ABL-002-K1'], 'V0', 'ABL')).toBe('V0-ABL-003');
  });
  it('alte IDs <Reihe>-<Werkstoff>-<NNN> stören nicht', () => {
    expect(nextVersuchsId(['B1-Si-001', 'B1-Si-002'], 'B1', 'ABL')).toBe('B1-ABL-001');
  });
});

describe('Proben-ID', () => {
  it('formatiert <Kürzel>-<NNN>', () => {
    expect(formatProbenId('FS', 1)).toBe('FS-001');
    expect(formatProbenId('Al2O3', 12)).toBe('Al2O3-012');
  });
  it('zählt fortlaufend je Kürzel, Konflikt-Suffix ignoriert', () => {
    const ids = ['FS-001', 'FS-004', 'Si-002', 'FS-005-K1', 'FSX-009'];
    expect(nextProbenId(ids, 'FS')).toBe('FS-006');
    expect(nextProbenId(ids, 'Si')).toBe('Si-003');
    expect(nextProbenId([], 'Cu')).toBe('Cu-001');
  });
});

describe('Kürzel Versuchsart', () => {
  it('prüft Länge und Zeichen', () => {
    expect(validateArtKuerzel('SPOT')).toBeUndefined();
    expect(validateArtKuerzel('A1')).toBeUndefined();
    expect(validateArtKuerzel('')).toBeDefined();
    expect(validateArtKuerzel('A')).toBeDefined();
    expect(validateArtKuerzel('ABCDEFG')).toBeDefined();
    expect(validateArtKuerzel('AB-C')).toBeDefined();
    expect(validateArtKuerzel('abl')).toBeDefined();
  });
});
