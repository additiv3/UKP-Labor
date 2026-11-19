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
import { migrateComponentV1toV2 } from '../core/exchange/migrate';

/**
 * Schemaversion der Datenbank und des Exportformats.
 * Bei jeder Schemaänderung: Dexie-Version hochzählen + Migration (`.upgrade`) + diese Konstante anpassen.
 */
export const SCHEMA_VERSION = 2;

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
    // 2: Laser-Wellenlängen als Objekte (eigene Grenzwerte), Komponententyp „station“, Status, Belege.
    // Indizes unverändert; nur Laserquellen werden umgeschrieben.
    this.version(2)
      .stores({ components: 'id, systemId, typ, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('components')
          .toCollection()
          .modify((c: Record<string, unknown>) => {
            migrateComponentV1toV2(c);
          }),
      );
    // Läuft nur einmal beim Anlegen der Datenbank.
    this.on('populate', (tx) => {
      void tx.table('materials').bulkAdd(seedMaterials());
    });
  }
}

export const db = new UkpDb();
