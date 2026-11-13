import type { ExperimentStatus, SeriesStatus, W0Quelle } from '../../data/types';

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
  geschaetzt: 'geschätzt',
};
