import type { BetriebsStatus, ComponentType, LitGroesse, MaterialClass, StationArt, SyncTable } from './types';
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
  station: 'Bearbeitungsstation',
  optik: 'Optik',
  scanner: 'Scanner',
  achsen: 'Achsen',
  strahlformung: 'Strahlformung',
  leistungsmesser: 'Leistungsmesskopf',
  messgeraet: 'Messgerät',
  sonstiges: 'Sonstiges',
};

export const STATUS_LABEL: Record<BetriebsStatus, string> = {
  betriebsbereit: 'betriebsbereit',
  'nicht-aufgebaut': 'nicht aufgebaut',
  'justage-noetig': 'Justage nötig',
  unbekannt: 'unbekannt',
};

/** Kurzsymbol je Status (Matrix, Listen); Bedeutung zusätzlich als Text/aria-label. */
export const STATUS_SYMBOL: Record<BetriebsStatus, string> = {
  betriebsbereit: '✓',
  'nicht-aufgebaut': '✕',
  'justage-noetig': '⚙',
  unbekannt: '?',
};

export const STATION_ART_LABEL: Record<StationArt, string> = {
  scanner: 'Scanner',
  schneidkopf: 'Schneidkopf',
  'feste-optik': 'Feste Optik',
};

/** Symbol für unbestätigte Zahlenwerte. */
export const UNBESTAETIGT_SYMBOL = '⚠︎';

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

export const TABLE_LABEL: Record<SyncTable, string> = {
  systems: 'Anlagen',
  components: 'Komponenten',
  materials: 'Werkstoffe',
  litValues: 'Literaturwerte',
  samples: 'Proben',
  versuchsarten: 'Versuchsarten',
  series: 'Versuchsreihen',
  experiments: 'Versuche',
  notes: 'Notizen',
};

/** Anzeige einer Probe: „FS-001 · Wafer 4"“ bzw. nur „FS-001“. */
export function probeLabel(s: { probenId: string; bezeichnung?: string }): string {
  return s.bezeichnung?.trim() ? `${s.probenId} · ${s.bezeichnung.trim()}` : s.probenId;
}
