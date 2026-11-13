import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { FORMULAS } from './formulas';
import { FORMULA_CATALOG } from './formulaCatalog';

describe('Formeln (LaTeX)', () => {
  it.each(Object.entries(FORMULAS))('%s ist gültiges KaTeX', (_k, tex) => {
    expect(() => katex.renderToString(tex, { throwOnError: true, displayMode: true })).not.toThrow();
  });
  it('Formelsammlung: alle Einträge gültig', () => {
    const all = FORMULA_CATALOG.flatMap((g) => g.entries);
    expect(all.length).toBeGreaterThan(20);
    for (const e of all) expect(() => katex.renderToString(e.tex, { throwOnError: true })).not.toThrow();
  });
});
