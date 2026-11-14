import type { PulseProfile } from '../../core/physics/fluence';
import type { Quantity } from '../../core/physics/units';
import type { W0Quelle } from '../../data/types';

/** Eingabefelder des Rechners (Werte in SI). */
export const CALC_FIELDS = {
  lambda: { quantity: 'wavelength', label: 'Wellenlänge', symbol: 'λ' },
  tau: { quantity: 'time', label: 'Pulsdauer (FWHM)', symbol: 'τ' },
  pAvg: { quantity: 'power', label: 'Mittlere Leistung', symbol: 'P_avg' },
  ePuls: { quantity: 'energy', label: 'Pulsenergie', symbol: 'E_p' },
  fRep: { quantity: 'frequency', label: 'Repetitionsrate', symbol: 'f_rep' },
  transmission: { quantity: 'fraction', label: 'Abschwächung (Transmission)', symbol: 'T' },
  m2: { quantity: 'none', label: 'Strahlqualität', symbol: 'M²' },
  f: { quantity: 'focal', label: 'Brennweite', symbol: 'f' },
  wL: { quantity: 'length', label: 'Strahlradius an der Linse', symbol: 'w_L' },
  w0: { quantity: 'length', label: 'Fokusradius (1/e²)', symbol: 'w₀' },
  z: { quantity: 'length', label: 'Fokuslage (+ = über Oberfläche)', symbol: 'z' },
  v: { quantity: 'velocity', label: 'Scangeschwindigkeit', symbol: 'v' },
  hatch: { quantity: 'length', label: 'Hatch (Linienabstand)', symbol: 'h' },
  area: { quantity: 'area', label: 'Fläche', symbol: 'A' },
  nLayer: { quantity: 'none', label: 'Lagen / Überfahrten', symbol: 'N_layer' },
  fth: { quantity: 'fluence', label: 'Schwellfluenz F_th(1)', symbol: 'F_th' },
  delta: { quantity: 'length', label: 'Eindringtiefe', symbol: 'δ' },
  s: { quantity: 'none', label: 'Inkubationskoeffizient', symbol: 'S' },
  nPulse: { quantity: 'none', label: 'Pulszahl pro Ort', symbol: 'N' },
  zielF: { quantity: 'fluence', label: 'Zielfluenz (Spitze, Oberfläche)', symbol: 'F_ziel' },
} as const satisfies Record<string, { quantity: Quantity; label: string; symbol: string }>;

export type CalcField = keyof typeof CALC_FIELDS;

export interface CalcState {
  v: Partial<Record<CalcField, number>>;
  u: Partial<Record<CalcField, string>>;
  /** Welche Größe eingegeben wird: mittlere Leistung oder Pulsenergie */
  energyMode: 'pAvg' | 'ePuls';
  /** Fokusradius aus Optik berechnen oder direkt eingeben */
  w0Mode: 'optik' | 'direkt';
  /** Herkunft des direkt eingegebenen w₀ (z. B. „d2“ nach Übernahme aus dem D²-Fit); manuelle Änderung löscht sie */
  w0Quelle?: W0Quelle;
  profile: PulseProfile;
  showFluence: boolean;
  /** Gewählte Vorlagen (IDs aus Anlagen/Material) */
  preset: CalcPreset;
}

export interface CalcPreset {
  systemId?: string;
  laserId?: string;
  optikId?: string;
  scannerId?: string;
  materialId?: string;
}

/** Abweichende Standard-Einheiten je Feld (sonst erste Einheit der Größenart). */
export const DEFAULT_UNITS: Partial<Record<CalcField, string>> = {
  delta: 'nm',
  wL: 'mm',
  hatch: 'µm',
  area: 'mm²',
};

export const INITIAL_CALC_STATE: CalcState = {
  v: { m2: 1 },
  u: {},
  energyMode: 'pAvg',
  w0Mode: 'optik',
  profile: 'gauss',
  showFluence: false,
  preset: {},
};

/** Robust gegen veraltete/fremde gespeicherte Zustände. */
export function normalizeCalcState(raw: unknown): CalcState {
  if (typeof raw !== 'object' || raw === null) return INITIAL_CALC_STATE;
  const r = raw as Partial<CalcState>;
  const v: CalcState['v'] = {};
  const u: CalcState['u'] = {};
  for (const k of Object.keys(CALC_FIELDS) as CalcField[]) {
    const x = r.v?.[k];
    if (typeof x === 'number' && Number.isFinite(x)) v[k] = x;
    const y = r.u?.[k];
    if (typeof y === 'string') u[k] = y;
  }
  return {
    v,
    u,
    energyMode: r.energyMode === 'ePuls' ? 'ePuls' : 'pAvg',
    w0Mode: r.w0Mode === 'direkt' ? 'direkt' : 'optik',
    w0Quelle: (['datenblatt', 'berechnet', 'd2', 'geschaetzt'] as const).find((q) => q === r.w0Quelle),
    profile: r.profile === 'sech2' ? 'sech2' : 'gauss',
    showFluence: r.showFluence === true,
    preset: normalizePreset(r.preset),
  };
}

function normalizePreset(raw: unknown): CalcPreset {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: CalcPreset = {};
  for (const k of ['systemId', 'laserId', 'optikId', 'scannerId', 'materialId'] as const) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}
