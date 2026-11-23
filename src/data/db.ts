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
  Versuchsart,
} from './types';
import { seedMaterials, seedVersuchsarten } from './seed';
import { assignProbenIds, migrateComponentV1toV2 } from '../core/exchange/migrate';

/**
 * Schemaversion der Datenbank und des Exportformats.
 * Bei jeder Schemaänderung: Dexie-Version hochzählen + Migration (`.upgrade`) + diese Konstante anpassen.
 */
export const SCHEMA_VERSION = 3;

export const DB_NAME = 'ukp-labor';

export class UkpDb extends Dexie {
  systems!: Table<System, string>;
  components!: Table<Component, string>;
  materials!: Table<Material, string>;
  litValues!: Table<LitValue, string>;
  samples!: Table<Sample, string>;
  versuchsarten!: Table<Versuchsart, string>;
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
    // 3: Versuchsarten (Teil der Versuchs-ID), Proben-IDs, Versuch mit Art/Station/Strahlengang/Probenfeld.
    // Proben bekommen ihre ID je Werkstoff in createdAt-Reihenfolge; Versuchs-IDs bleiben, versuchsartId bleibt leer.
    this.version(3)
      .stores({
        versuchsarten: 'id, kuerzel, updatedAt',
        experiments: 'id, versuchsId, versuchsartId, seriesId, datum, materialId, updatedAt, *tags',
        samples: 'id, probenId, materialId, updatedAt',
      })
      .upgrade(async (tx) => {
        const materials = await tx.table('materials').toArray();
        const samples = await tx.table('samples').toArray();
        const changed = assignProbenIds(materials, samples);
        if (changed.length) await tx.table('samples').bulkPut(changed);
        await addMissingSeedArten(tx.table('versuchsarten'));
      });
    // Läuft nur einmal beim Anlegen der Datenbank (Upgrades laufen dann nicht).
    this.on('populate', (tx) => {
      void tx.table('materials').bulkAdd(seedMaterials());
      void tx.table('versuchsarten').bulkAdd(seedVersuchsarten());
    });
  }
}

/** Seed-Versuchsarten anlegen, deren ID es noch nicht gibt (auch gelöschte zählen als vorhanden). */
export async function addMissingSeedArten(table: Table<Versuchsart, string>): Promise<void> {
  const seed = seedVersuchsarten();
  const have = new Set((await table.bulkGet(seed.map((a) => a.id))).flatMap((a) => (a ? [a.id] : [])));
  const missing = seed.filter((a) => !have.has(a.id));
  if (missing.length) await table.bulkAdd(missing);
}

export const db = new UkpDb();
