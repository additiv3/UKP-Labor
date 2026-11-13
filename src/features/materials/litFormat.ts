import type { LitValue } from '../../data/types';
import type { NewEntity } from '../../data/repos/base';
import { LIT_QUANTITY } from '../../data/labels';
import { formatIn, formatNumber, formatSI } from '../../core/physics/units';

/** Literaturwert in seiner Anzeigeeinheit. */
export function formatLitValue(l: LitValue): string {
  if (l.groesse === 'sonstig') return `${formatNumber(l.wert)} ${l.einheit}`.trim();
  if (l.groesse === 'S') return formatNumber(l.wert);
  return formatIn(l.wert, LIT_QUANTITY[l.groesse], l.einheit);
}

/** Bedingungen kurz: „1030 nm · 900 fs · N = 100 · D²“ */
export function formatLitConditions(l: LitValue): string {
  return [
    l.lambda !== undefined ? formatIn(l.lambda, 'wavelength', 'nm') : undefined,
    l.tau !== undefined ? formatSI(l.tau, 's') : undefined,
    l.nPulse !== undefined ? `N = ${formatNumber(l.nPulse)}` : undefined,
    l.methode,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Entwurf eines Literaturwerts (Wert darf beim Anlegen noch fehlen). */
export type LitDraft = Omit<NewEntity<LitValue>, 'wert'> & { wert?: number };

/** Pflichtfelder: Wert und Citekey (BibLaTeX, ohne Leerzeichen/Komma/Klammern). */
export function validateLit(d: LitDraft): string | undefined {
  if (d.wert === undefined) return 'Wert fehlt';
  if (d.citekey.trim() === '') return 'Citekey fehlt (Pflicht)';
  if (!/^[^\s,{}%#]+$/.test(d.citekey.trim())) return 'Citekey ohne Leerzeichen, Komma oder Klammern';
  if (d.groesse === 'sonstig' && d.einheit.trim() === '') return 'Einheit fehlt';
  return undefined;
}
