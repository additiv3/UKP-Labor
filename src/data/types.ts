/**
 * Entitätstypen gemäß docs/03_datenmodell.md.
 * Alle Zahlenwerte in SI-Einheiten. Optionale Felder sind `undefined`, wenn nicht angegeben.
 */

export interface Base {
  /** UUID v4 */
  id: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601, bei jeder Änderung setzen */
  updatedAt: string;
  /** Tombstone statt Löschen */
  deleted?: boolean;
  /** Gerät der letzten Änderung */
  deviceId: string;
}

// ---------------------------------------------------------------- Anlagen

export interface System extends Base {
  name: string;
  standort?: string;
  beschreibung?: string;
  notizen?: string;
}

export const COMPONENT_TYPES = [
  'laserquelle',
  'station',
  'optik',
  'scanner',
  'achsen',
  'strahlformung',
  'leistungsmesser',
  'messgeraet',
  'sonstiges',
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

/** Betriebszustand einer Komponente oder eines Strahlengangs. Fehlt er, gilt „unbekannt“. */
export const BETRIEBS_STATUS = ['betriebsbereit', 'nicht-aufgebaut', 'justage-noetig', 'unbekannt'] as const;
export type BetriebsStatus = (typeof BETRIEBS_STATUS)[number];

/** Herkunft eines Zahlenwerts. */
export interface Beleg {
  /** true = Wert ist nicht durch Datenblatt/Messung bestätigt (Anzeige mit Symbol) */
  unbestaetigt?: boolean;
  /** z. B. „Carbide_….pdf, S. 3“ */
  quelle?: string;
}
/** Belege je Feldname des umgebenden Objekts (z. B. `pMax`). */
export type Belege = Record<string, Beleg>;

/** Spektralbereich, wenn keine genaue Wellenlänge bekannt ist bzw. als Gruppierung. */
export const BANDS = ['IR', 'VIS', 'UV'] as const;
export type Band = (typeof BANDS)[number];

/** Eine Wellenlänge einer Laserquelle (Grundwelle oder Harmonische) mit eigenen Grenzwerten. */
export interface Wellenlaenge {
  /** innerhalb der Laserquelle eindeutig, stabil (Verweis aus Strahlengängen) */
  id: string;
  /** m */
  lambda?: number;
  /** z. B. „Grundwelle“, „2. Harmonische (SHG)“ */
  bezeichnung?: string;
  /** W */
  pMax?: number;
  /** J */
  ePulsMax?: number;
  m2?: number;
  notiz?: string;
  belege?: Belege;
}

export interface LaserParams {
  wellenlaengen: Wellenlaenge[];
  /** W — gesamt bzw. Grundwelle; gilt, wenn die Wellenlänge keinen eigenen Wert hat */
  pMax?: number;
  /** J — gesamt bzw. Grundwelle */
  ePulsMax?: number;
  /** Hz */
  fRepMin?: number;
  fRepMax?: number;
  /** s (FWHM) */
  tauMin?: number;
  tauMax?: number;
  m2?: number;
  /** m — Strahlradius w_L am Ausgang bzw. an der Optik (1/e²) */
  rohstrahlRadius?: number;
  burst?: boolean;
  burstInfo?: string;
  belege?: Belege;
}

export const STATION_ARTEN = ['scanner', 'schneidkopf', 'feste-optik'] as const;
export type StationArt = (typeof STATION_ARTEN)[number];

/** Weg einer Wellenlänge einer Laserquelle zu einer Bearbeitungsstation. */
export interface Strahlengang {
  /** innerhalb der Station eindeutig */
  id: string;
  /** Komponenten-ID der Laserquelle */
  laserId?: string;
  /** `Wellenlaenge.id` der Laserquelle */
  wellenlaengeId?: string;
  /** Spektralbereich, falls die Wellenlänge nicht zugeordnet ist */
  band?: Band;
  status?: BetriebsStatus;
  /** m — Fokusradius (1/e²) an dieser Station */
  w0?: number;
  notiz?: string;
  belege?: Belege;
}

/** Bearbeitungsstation (Scanner, Schneidkopf, feste Optik) mit ihren Strahlengängen. */
export interface StationParams {
  art?: StationArt;
  /** zugeordnete Laserquellen (Komponenten-IDs derselben Anlage) */
  laserIds: string[];
  strahlengaenge: Strahlengang[];
  /** m */
  brennweite?: number;
  /** Objektiv bzw. Fokussieroptik als Text (Hersteller, Typ) */
  objektiv?: string;
  /** m (Kantenlänge) */
  feldgroesse?: number;
  belege?: Belege;
}

export type OptikTyp = 'f-theta' | 'linse' | 'objektiv';

export interface OptikParams {
  /** m — beim Anlegen noch leer */
  brennweite?: number;
  typ?: OptikTyp;
  /** m */
  eingangsapertur?: number;
  /** m */
  w0Datenblatt?: number;
  /** m (Kantenlänge) */
  feldgroesse?: number;
  belege?: Belege;
}

export interface ScannerParams {
  /** m/s */
  vMax?: number;
  /** m */
  feldgroesse?: number;
  /** m */
  apertur?: number;
  belege?: Belege;
}

export interface AchsenParams {
  anzahl?: number;
  verfahrwege?: string;
  /** m */
  genauigkeit?: number;
  belege?: Belege;
}

export interface FreitextParams {
  freitext?: string;
}

interface ComponentBase extends Base {
  systemId: string;
  name: string;
  hersteller?: string;
  modell?: string;
  /** Pfad/Text, keine Dateien */
  datenblatt?: string;
  notizen?: string;
  /** fehlt → „unbekannt“ */
  status?: BetriebsStatus;
}

export type Component =
  | (ComponentBase & { typ: 'laserquelle'; params: LaserParams })
  | (ComponentBase & { typ: 'station'; params: StationParams })
  | (ComponentBase & { typ: 'optik'; params: OptikParams })
  | (ComponentBase & { typ: 'scanner'; params: ScannerParams })
  | (ComponentBase & { typ: 'achsen'; params: AchsenParams })
  | (ComponentBase & {
      typ: 'strahlformung' | 'leistungsmesser' | 'messgeraet' | 'sonstiges';
      params: FreitextParams;
    });

// ---------------------------------------------------------------- Material

export const MATERIAL_CLASSES = [
  'halbleiter',
  'glas',
  'keramik',
  'metall',
  'polymer',
  'verbund',
] as const;
export type MaterialClass = (typeof MATERIAL_CLASSES)[number];

export interface Material extends Base {
  name: string;
  /** Kürzel für Versuchs-ID, z. B. „Si“, „FS“ */
  kurz: string;
  klasse: MaterialClass;
  /** eV */
  bandluecke?: number;
  brechungsindex?: number;
  /** kg/m³ */
  dichte?: number;
  /** W/(m·K) */
  waermeleitfaehigkeit?: number;
  /** K */
  schmelzTemp?: number;
  notizen?: string;
  /** Teil der mitgelieferten Startbibliothek */
  seed?: boolean;
}

export type LitGroesse = 'Fth' | 'delta' | 'S' | 'sonstig';

export interface LitValue extends Base {
  materialId: string;
  groesse: LitGroesse;
  /** In SI (F_th: J/m², δ: m, S: dimensionslos); bei „sonstig“ unverändert in `einheit` */
  wert: number;
  /** Anzeigeeinheit (bei „sonstig“: freie Einheit) */
  einheit: string;
  /** m */
  lambda?: number;
  /** s */
  tau?: number;
  nPulse?: number;
  methode?: string;
  /** BibLaTeX-Citekey, Pflicht */
  citekey: string;
  notiz?: string;
}

export interface Sample extends Base {
  materialId: string;
  bezeichnung: string;
  lieferant?: string;
  charge?: string;
  /** m */
  dicke?: number;
  oberflaeche?: string;
  orientierung?: string;
  lagerort?: string;
  notiz?: string;
}

// ---------------------------------------------------------------- Logbuch

export type SeriesStatus = 'geplant' | 'laufend' | 'abgeschlossen';

export interface Series extends Base {
  /** z. B. „B1“ */
  code: string;
  titel: string;
  ziel?: string;
  status: SeriesStatus;
  notizen?: string;
}

export type W0Quelle = 'datenblatt' | 'berechnet' | 'd2' | 'geschaetzt';

export interface ExperimentParams {
  /** m */
  lambda?: number;
  /** s (FWHM) */
  tau?: number;
  /** W */
  pAvg?: number;
  /** J */
  ePuls?: number;
  /** Hz */
  fRep?: number;
  burst?: { anzahl?: number; freq?: number; info?: string };
  /** Abschwächung 0..1 */
  transmission?: number;
  /** m */
  w0?: number;
  w0Quelle?: W0Quelle;
  m2?: number;
  /** m, z relativ zur Oberfläche, + = über der Oberfläche */
  fokuslage?: number;
  /** m/s */
  v?: number;
  /** m */
  pulsabstand?: number;
  /** m */
  hatch?: number;
  nPulse?: number;
  ueberfahrten?: number;
  strategie?: string;
  atmosphaere?: string;
  absaugung?: string;
}

export type ExperimentStatus = 'geplant' | 'durchgefuehrt' | 'verworfen';

export interface Experiment extends Base {
  /** „B1-Si-001“, eindeutig */
  versuchsId: string;
  seriesId: string;
  /** ISO-Datum */
  datum: string;
  systemId?: string;
  laserId?: string;
  optikId?: string;
  scannerId?: string;
  sampleId?: string;
  materialId?: string;
  params: ExperimentParams;
  /** Snapshot der abgeleiteten Werte */
  abgeleitet?: { formelVersion: string; werte: Record<string, number> };
  bemerkung?: string;
  tags: string[];
  status: ExperimentStatus;
}

// ---------------------------------------------------------------- Notizen

export type NoteType = 'tagebuch' | 'notiz';

export interface Note extends Base {
  titel: string;
  /** Markdown */
  inhalt: string;
  /** ISO-Datum */
  datum: string;
  typ: NoteType;
  tags: string[];
  /** versuchsIds / seriesIds */
  links: string[];
}

// ---------------------------------------------------------------- Einstellungen

export type Theme = 'dark' | 'light' | 'system';

/** Key-Value-Einstellungen (Tabelle `settings`), nicht Teil des Exports. */
export interface SettingsMap {
  deviceId: string;
  deviceName: string;
  defaultSystemId: string | undefined;
  theme: Theme;
  lastExportAt: string | undefined;
  units: Record<string, string>;
  /** Zuletzt verwendete Rechner-Eingaben (Struktur siehe features/calculator/state.ts) */
  calculator: unknown;
  /** Ordner des Hauptlogbuchs (FileSystemDirectoryHandle, nur Chrome/Edge am Laptop) */
  masterDir: unknown;
  /** Eingaben der Auswertehilfen (D²-Fit, Inkubation), siehe features/calculator/fits */
  fits: unknown;
  /** Letzter Abgleich mit dem Hauptlogbuch (ISO) */
  lastMasterSyncAt: string | undefined;
}
export type SettingKey = keyof SettingsMap;
export interface SettingRow<K extends SettingKey = SettingKey> {
  key: K;
  value: SettingsMap[K];
}

/** Synchronisierte Tabellen (Reihenfolge = Exportreihenfolge). */
export const SYNC_TABLES = [
  'systems',
  'components',
  'materials',
  'litValues',
  'samples',
  'series',
  'experiments',
  'notes',
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface SyncEntityMap {
  systems: System;
  components: Component;
  materials: Material;
  litValues: LitValue;
  samples: Sample;
  series: Series;
  experiments: Experiment;
  notes: Note;
}
