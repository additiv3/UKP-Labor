import type { ComponentType, LitGroesse, MaterialClass } from './types';
import type { Quantity } from '../core/physics/units';

export const MATERIAL_CLASS_LABEL: Record<MaterialClass, string> = {
  halbleiter: 'Halbleiter',
  glas: 'Glas',
  keramik: 'Keramik',
  metall: 'Metall',
  polymer: 'Polymer',
  verbund: 'Verbund',
};

export const COMPONENT_TYPE_LABEL: Record<ComponentType, string> = {
  laserquelle: 'Laserquelle',
  optik: 'Optik',
  scanner: 'Scanner',
  achsen: 'Achsen',
  strahlformung: 'Strahlformung',
  leistungsmesser: 'Leistungsmesskopf',
  messgeraet: 'Messgerät',
  sonstiges: 'Sonstiges',
};

export const LIT_GROESSE_LABEL: Record<LitGroesse, string> = {
  Fth: 'Schwellfluenz F_th',
  delta: 'Eindringtiefe δ',
  S: 'Inkubationskoeffizient S',
  sonstig: 'Sonstige Größe',
};

/** Größenart je Literaturgröße (für Einheitenumrechnung); „sonstig“ = freie Einheit. */
export const LIT_QUANTITY: Record<Exclude<LitGroesse, 'sonstig'>, Quantity> = {
  Fth: 'fluence',
  delta: 'length',
  S: 'none',
};
