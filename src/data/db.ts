import Dexie, { type Table } from 'dexie';
import type {
  Component,
  Experiment,
  LitValue,
  Material,
  Note,
  Sample,
  Series,
  SettingRow,
  System,
} from './types';
import { seedMaterials } from './seed';

/**
 * Schemaversion der Datenbank und des Exportformats.
 * Bei jeder Schemaänderung: Dexie-Version hochzählen + Migration (`.upgrade`) + diese Konstante anpassen.
 */
export const SCHEMA_VERSION = 1;

export const DB_NAME = 'ukp-labor';

export class UkpDb extends Dexie {
  systems!: Table<System, string>;
  components!: Table<Component, string>;
  materials!: Table<Material, string>;
  litValues!: Table<LitValue, string>;
  samples!: Table<Sample, string>;
  series!: Table<Series, string>;
  experiments!: Table<Experiment, string>;
  notes!: Table<Note, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      systems: 'id, name, updatedAt',
      components: 'id, systemId, typ, updatedAt',
      materials: 'id, name, updatedAt',
      litValues: 'id, materialId, updatedAt',
      samples: 'id, materialId, updatedAt',
      series: 'id, code, updatedAt',
      experiments: 'id, versuchsId, seriesId, datum, materialId, updatedAt, *tags',
      notes: 'id, datum, updatedAt, *tags',
      settings: 'key',
    });
    // Läuft nur einmal beim Anlegen der Datenbank.
    this.on('populate', (tx) => {
      void tx.table('materials').bulkAdd(seedMaterials());
    });
  }
}

export const db = new UkpDb();
