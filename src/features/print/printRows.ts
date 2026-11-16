/**
 * Druckansicht: Versuchsparameter und Snapshot als beschriftete Zeilen (nur vorhandene Werte).
 */
import type { Experiment, ExperimentParams } from '../../data/types';
import { experimentSnapshot } from '../../core/logbook';
import { formatIn, formatNumber, formatSI } from '../../core/physics/units';
import { W0_QUELLE_LABEL } from '../logbook/labels';

export type Row = [label: string, value: string];

const pct = (x: number) => `${formatNumber(x * 100, 4)} %`;

/** Eingestellte Parameter in fester Reihenfolge. */
export function paramRows(p: ExperimentParams): Row[] {
  const burst = p.burst?.anzahl !== undefined && Math.round(p.burst.anzahl) >= 2;
  const rows: [string, number | string | undefined, (x: never) => string][] = [
    ['Wellenlänge λ', p.lambda, (x: number) => formatIn(x, 'wavelength')],
    ['Pulsdauer τ (FWHM)', p.tau, (x: number) => formatSI(x, 's')],
    ['Mittlere Leistung P_avg', p.pAvg, (x: number) => formatSI(x, 'W')],
    [burst ? 'Burst-Energie E_burst' : 'Pulsenergie E_p', p.ePuls, (x: number) => formatSI(x, 'J')],
    ['Repetitionsrate f_rep', p.fRep, (x: number) => formatSI(x, 'Hz')],
    ['Sub-Pulse pro Burst n', p.burst?.anzahl, (x: number) => formatNumber(x)],
    ['Intra-Burst-Frequenz', p.burst?.freq, (x: number) => formatSI(x, 'Hz')],
    ['Burst-Info', p.burst?.info, (x: string) => x],
    ['Abschwächung T', p.transmission, pct],
    ['Fokusradius w₀', p.w0, (x: number) => `${formatSI(x, 'm')}${p.w0Quelle ? ` (${W0_QUELLE_LABEL[p.w0Quelle]})` : ''}`],
    ['Strahlqualität M²', p.m2, (x: number) => formatNumber(x)],
    ['Fokuslage z', p.fokuslage, (x: number) => formatSI(x, 'm')],
    ['Scangeschwindigkeit v', p.v, (x: number) => formatIn(x, 'velocity')],
    ['Pulsabstand Δx', p.pulsabstand, (x: number) => formatSI(x, 'm')],
    ['Hatch h', p.hatch, (x: number) => formatSI(x, 'm')],
    ['Pulse pro Ort N', p.nPulse, (x: number) => formatNumber(x)],
    ['Überfahrten', p.ueberfahrten, (x: number) => formatNumber(x)],
    ['Scanstrategie', p.strategie, (x: string) => x],
    ['Atmosphäre', p.atmosphaere, (x: string) => x],
    ['Absaugung', p.absaugung, (x: string) => x],
  ];
  return rows
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([label, v, f]) => [label, (f as (x: number | string) => string)(v as number | string)]);
}

const DERIVED: [key: string, label: string, f: (x: number) => string][] = [
  ['ePuls', 'E_p am Werkstück', (x) => formatSI(x, 'J')],
  ['pAvg', 'P_avg am Werkstück', (x) => formatSI(x, 'W')],
  ['ePulsSub', 'E_sub am Werkstück (Sub-Puls)', (x) => formatSI(x, 'J')],
  ['dtSub', 'Sub-Puls-Abstand Δt', (x) => formatSI(x, 's')],
  ['tBurst', 'Burst-Dauer', (x) => formatSI(x, 's')],
  ['pPk', 'Spitzenleistung P_pk', (x) => formatSI(x, 'W')],
  ['w0', 'Fokusradius w₀', (x) => formatSI(x, 'm')],
  ['zR', 'Rayleighlänge z_R', (x) => formatSI(x, 'm')],
  ['wz', 'Strahlradius w(z) Oberfläche', (x) => formatSI(x, 'm')],
  ['F0', 'Spitzenfluenz F₀ (Fokus)', (x) => formatIn(x, 'fluence')],
  ['F0z', 'F₀(z) Oberfläche', (x) => formatIn(x, 'fluence')],
  ['F0Sub', 'F₀,sub (Fokus)', (x) => formatIn(x, 'fluence')],
  ['F0zSub', 'F₀,sub(z) Oberfläche', (x) => formatIn(x, 'fluence')],
  ['Fmean', 'Mittlere Fluenz F̄', (x) => formatIn(x, 'fluence')],
  ['I0', 'Spitzenintensität I₀', (x) => formatIn(x, 'intensity')],
  ['dx', 'Pulsabstand Δx', (x) => formatSI(x, 'm')],
  ['OL', 'Pulsüberlapp OL', pct],
  ['N1D', 'Pulse pro Spot N_1D', (x) => formatNumber(x)],
  ['N2D', 'Pulse pro Fläche N_2D', (x) => formatNumber(x)],
  ['OLh', 'Linienüberlapp OL_h', pct],
];

/** Abgeleitete Werte aus dem gespeicherten Snapshot (sonst neu berechnet), mit Formelversion. */
export function derivedRows(e: Pick<Experiment, 'params' | 'abgeleitet'>): { formelVersion: string; gespeichert: boolean; rows: Row[] } {
  const snap = e.abgeleitet ?? experimentSnapshot(e.params);
  const w = snap.werte;
  const burst = w.nBurst !== undefined;
  const rows: Row[] = [];
  for (const [k, label, f] of DERIVED) {
    const x = w[k];
    if (x === undefined) continue;
    // Bei Defokus = 0 sind w(z)/F₀(z) identisch zu w₀/F₀ → nicht doppelt drucken
    if ((k === 'wz' && x === w.w0) || (k === 'F0z' && x === w.F0) || (k === 'F0zSub' && x === w.F0Sub)) continue;
    const l = burst && k === 'ePuls' ? 'E_burst am Werkstück' : burst && k === 'F0' ? 'F₀ Burst (Fokus)' : burst && (k === 'pPk' || k === 'I0') ? `${label} (Sub-Puls)` : label;
    rows.push([l, f(x)]);
  }
  return { formelVersion: snap.formelVersion, gespeichert: e.abgeleitet !== undefined, rows };
}
