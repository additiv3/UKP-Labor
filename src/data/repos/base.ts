import type { Table } from 'dexie';
import { uuid } from '../../core/ids';
import type { Base } from '../types';
import { getDeviceId } from './settings';

/** Felder, die das Repository setzt. */
export type BaseFields = keyof Base;
/** Verteilendes Omit, damit Unions (z. B. `Component`) erhalten bleiben. */
export type NewEntity<T extends Base> = T extends unknown ? Omit<T, BaseFields> : never;

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Generisches Repository mit Zeitstempeln, Geräte-ID und Tombstones.
 * Einzige Stelle (zusammen mit den spezifischen Repos), die Dexie direkt anspricht.
 */
export function createRepo<T extends Base>(table: Table<T, string>) {
  return {
    table,

    async get(id: string): Promise<T | undefined> {
      return table.get(id);
    },

    /** Alle nicht gelöschten Datensätze. */
    async list(): Promise<T[]> {
      return table.filter((r) => !r.deleted).toArray();
    },

    async create(data: NewEntity<T>): Promise<T> {
      const ts = nowIso();
      const rec = {
        ...data,
        id: uuid(),
        createdAt: ts,
        updatedAt: ts,
        deviceId: await getDeviceId(),
      } as unknown as T;
      await table.add(rec);
      return rec;
    },

    /** Mehrere Datensätze in einer Transaktion anlegen. */
    async createMany(items: NewEntity<T>[]): Promise<T[]> {
      const ts = nowIso();
      const deviceId = await getDeviceId();
      const recs = items.map((data) => ({ ...data, id: uuid(), createdAt: ts, updatedAt: ts, deviceId }) as unknown as T);
      await table.bulkAdd(recs);
      return recs;
    },

    async update(id: string, changes: Partial<Omit<T, BaseFields>>): Promise<T> {
      const deviceId = await getDeviceId();
      return table.db.transaction('rw', table, async () => {
        const cur = await table.get(id);
        if (!cur) throw new Error(`Datensatz ${id} nicht gefunden`);
        const next = { ...cur, ...changes, id, updatedAt: nowIso(), deviceId } as T;
        await table.put(next);
        return next;
      });
    },

    /** Weiches Löschen (Tombstone). Hartes Löschen erst nach Export-Merge. */
    async remove(id: string): Promise<void> {
      const deviceId = await getDeviceId();
      await table.db.transaction('rw', table, async () => {
        const cur = await table.get(id);
        if (!cur) return;
        await table.put({ ...cur, deleted: true, updatedAt: nowIso(), deviceId });
      });
    },
  };
}
