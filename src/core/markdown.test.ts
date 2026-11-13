import { describe, expect, it } from 'vitest';
import { extractLinks, parseInline, parseMarkdown, plainText } from './markdown';

describe('Inline', () => {
  it('fett, kursiv, Code, Formel, Verweis, Link', () => {
    expect(parseInline('a **fett** und *kursiv* `x*y` $F_0=2E_p$ [[B1-Si-001]] [Doku](https://example.org)')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'strong', c: [{ t: 'text', v: 'fett' }] },
      { t: 'text', v: ' und ' },
      { t: 'em', c: [{ t: 'text', v: 'kursiv' }] },
      { t: 'text', v: ' ' },
      { t: 'code', v: 'x*y' },
      { t: 'text', v: ' ' },
      { t: 'math', tex: 'F_0=2E_p' },
      { t: 'text', v: ' ' },
      { t: 'wiki', ref: 'B1-Si-001' },
      { t: 'text', v: ' ' },
      { t: 'link', href: 'https://example.org', c: [{ t: 'text', v: 'Doku' }] },
    ]);
  });
  it('unsichere Links bleiben Text; kein HTML', () => {
    expect(parseInline('[x](javascript:alert(1))')).toEqual([{ t: 'text', v: '[x](javascript:alert(1))' }]);
    expect(parseInline('<script>alert(1)</script>')).toEqual([{ t: 'text', v: '<script>alert(1)</script>' }]);
  });
  it('Geldbeträge und Rechenzeichen sind keine Formel/Kursivschrift', () => {
    expect(parseInline('kostet $5 und $10')).toEqual([{ t: 'text', v: 'kostet $5 und $10' }]);
    expect(parseInline('2 * 3 * 4')).toEqual([{ t: 'text', v: '2 * 3 * 4' }]);
    expect(parseInline('snake_case_name')).toEqual([{ t: 'text', v: 'snake_case_name' }]);
  });
  it('Zeilenumbruch', () => {
    expect(parseInline('a\nb')).toEqual([{ t: 'text', v: 'a' }, { t: 'br' }, { t: 'text', v: 'b' }]);
  });
});

describe('Blöcke', () => {
  it('Überschrift, Absatz, Listen, Aufgaben, Zitat, Code, Formel, Linie', () => {
    const md = [
      '# Tag 1',
      'Laser warm, **alles ok**.',
      'zweite Zeile',
      '',
      '- Punkt [[B1]]',
      '- [x] erledigt',
      '- [ ] offen',
      '1. eins',
      '2. zwei',
      '> Zitat',
      '```',
      '# kein Titel [[X]]',
      '```',
      '$$',
      'F_0 = \\frac{2E_p}{\\pi w_0^2}',
      '$$',
      '$$ e^2 $$',
      '---',
    ].join('\n');
    const b = parseMarkdown(md);
    expect(b.map((x) => x.t)).toEqual(['h', 'p', 'ul', 'ol', 'quote', 'code', 'math', 'math', 'hr']);
    expect(b[1]).toMatchObject({ t: 'p', c: [{ t: 'text', v: 'Laser warm, ' }, { t: 'strong' }, { t: 'text', v: '.' }, { t: 'br' }, { t: 'text', v: 'zweite Zeile' }] });
    expect(b[2]).toMatchObject({ items: [{ c: [{ v: 'Punkt ' }, { t: 'wiki', ref: 'B1' }] }, { checked: true }, { checked: false }] });
    expect(b[5]).toEqual({ t: 'code', text: '# kein Titel [[X]]' });
    expect(b[6]).toEqual({ t: 'math', tex: 'F_0 = \\frac{2E_p}{\\pi w_0^2}' });
    expect(b[7]).toEqual({ t: 'math', tex: 'e^2' });
  });
  it('leer und Windows-Zeilenenden', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('a\r\n\r\nb').map((x) => x.t)).toEqual(['p', 'p']);
  });
});

describe('Verweise und Klartext', () => {
  it('extractLinks: eindeutig, ohne Code', () => {
    expect(extractLinks('[[B1-Si-001]] und [[B1]]\n- **[[B1-Si-002]]**\n`[[nein]]`\n```\n[[auch nicht]]\n```\n[[B1]]')).toEqual([
      'B1-Si-001',
      'B1',
      'B1-Si-002',
    ]);
  });
  it('plainText', () => {
    expect(plainText('# Titel\n**fett** [[B1-Si-001]] $F_0 = \\frac{2}{3}$')).toBe('Titel fett B1-Si-001 (Formel)');
    expect(plainText('a\n$$\nz_R\n$$\nb')).toBe('a (Formel) b');
    expect(plainText('a'.repeat(200), 10)).toHaveLength(10);
  });
});
