import { describe, expect, it } from 'vitest';
import { formatVersuchsId, nextLaufnummer, nextVersuchsId, uuid } from './ids';

describe('uuid', () => {
  it('liefert UUID v4', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (let i = 0; i < 20; i++) expect(uuid()).toMatch(re);
  });
});

describe('Versuchs-ID', () => {
  it('formatiert 3-stellig', () => {
    expect(formatVersuchsId('B1', 'Si', 1)).toBe('B1-Si-001');
    expect(formatVersuchsId(' B 1 ', 'S-i', 42)).toBe('B1-Si-042');
    expect(formatVersuchsId('B1', 'Si', 1234)).toBe('B1-Si-1234');
  });
  it('zählt fortlaufend je Reihe/Material', () => {
    const ids = ['B1-Si-001', 'B1-Si-007', 'B1-FS-003', 'B10-Si-020', 'B1-Si-008-K1'];
    expect(nextLaufnummer(ids, 'B1', 'Si')).toBe(9);
    expect(nextVersuchsId(ids, 'B1', 'FS')).toBe('B1-FS-004');
    expect(nextVersuchsId(ids, 'B2', 'Si')).toBe('B2-Si-001');
  });
});
