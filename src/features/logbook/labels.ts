import type { ExperimentStatus, SeriesStatus, Versuchsart, W0Quelle } from '../../data/types';

/** Anzeige einer Versuchsart in Auswahllisten: „ABL · Linien-/Flächenabtrag“. */
export const artLabel = (a: Pick<Versuchsart, 'kuerzel' | 'name'>) => (a.name ? `${a.kuerzel} · ${a.name}` : a.kuerzel);

export const STATUS_LABEL: Record<ExperimentStatus, string> = {
  geplant: 'geplant',
  durchgefuehrt: 'durchgeführt',
  verworfen: 'verworfen',
};

export const SERIES_STATUS_LABEL: Record<SeriesStatus, string> = {
  geplant: 'geplant',
  laufend: 'laufend',
  abgeschlossen: 'abgeschlossen',
};

export const W0_QUELLE_LABEL: Record<W0Quelle, string> = {
  datenblatt: 'Datenblatt',
  berechnet: 'berechnet',
  d2: 'D²-gemessen',
  gemessen: 'gemessen (Spotmessung)',
  geschaetzt: 'geschätzt',
};
