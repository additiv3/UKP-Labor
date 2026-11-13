import { db } from '../db';
import type {
  Component,
  Experiment,
  LitValue,
  Material,
  Note,
  Sample,
  Series,
  System,
} from '../types';
import { createRepo } from './base';

const alive = <T extends { deleted?: boolean }>(r: T) => !r.deleted;
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'de');

export const systemsRepo = {
  ...createRepo<System>(db.systems),
  async listSorted(): Promise<System[]> {
    return (await db.systems.filter(alive).toArray()).sort(byName);
  },
};

export const componentsRepo = {
  ...createRepo<Component>(db.components),
  async bySystem(systemId: string): Promise<Component[]> {
    return (await db.components.where('systemId').equals(systemId).filter(alive).toArray()).sort(byName);
  },
};

export const materialsRepo = {
  ...createRepo<Material>(db.materials),
  async listSorted(): Promise<Material[]> {
    return (await db.materials.filter(alive).toArray()).sort(byName);
  },
};

export const litValuesRepo = {
  ...createRepo<LitValue>(db.litValues),
  async byMaterial(materialId: string): Promise<LitValue[]> {
    return db.litValues.where('materialId').equals(materialId).filter(alive).toArray();
  },
};

export const samplesRepo = {
  ...createRepo<Sample>(db.samples),
  async byMaterial(materialId: string): Promise<Sample[]> {
    return (await db.samples.where('materialId').equals(materialId).filter(alive).toArray()).sort((a, b) =>
      a.bezeichnung.localeCompare(b.bezeichnung, 'de'),
    );
  },
};

export const seriesRepo = {
  ...createRepo<Series>(db.series),
  async listSorted(): Promise<Series[]> {
    return (await db.series.filter(alive).toArray()).sort((a, b) => a.code.localeCompare(b.code, 'de', { numeric: true }));
  },
};

export const experimentsRepo = {
  ...createRepo<Experiment>(db.experiments),
  async bySeries(seriesId: string): Promise<Experiment[]> {
    return db.experiments.where('seriesId').equals(seriesId).filter(alive).toArray();
  },
  /** Alle Versuchs-IDs inkl. gelöschter (damit keine Nummer doppelt vergeben wird). */
  async allVersuchsIds(): Promise<string[]> {
    return (await db.experiments.toArray()).map((e) => e.versuchsId);
  },
  /** true, wenn ein anderer (nicht gelöschter) Versuch diese Versuchs-ID trägt. */
  async isVersuchsIdTaken(versuchsId: string, exceptId?: string): Promise<boolean> {
    const hits = await db.experiments.where('versuchsId').equals(versuchsId).filter(alive).toArray();
    return hits.some((e) => e.id !== exceptId);
  },
  /** Zuletzt bearbeiteter Versuch (Vorlage für „aus letztem Versuch duplizieren“). */
  async latest(seriesId?: string): Promise<Experiment | undefined> {
    const all = await db.experiments.filter((e) => alive(e) && (!seriesId || e.seriesId === seriesId)).toArray();
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  },
};
export const notesRepo = {
  ...createRepo<Note>(db.notes),
  /** Neueste zuerst (Datum, dann letzte Änderung). */
  async listSorted(): Promise<Note[]> {
    return (await db.notes.filter(alive).toArray()).sort(
      (a, b) => b.datum.localeCompare(a.datum) || b.updatedAt.localeCompare(a.updatedAt),
    );
  },
  /** Notizen, die per [[…]] auf eine der Referenzen verweisen. */
  async mentioning(refs: string[]): Promise<Note[]> {
    const set = new Set(refs.filter(Boolean));
    return (await notesRepo.listSorted()).filter((n) => n.links.some((l) => set.has(l)));
  },
};

/** Anlage samt Komponenten weich löschen. */
export async function removeSystemCascade(systemId: string): Promise<void> {
  for (const c of await componentsRepo.bySystem(systemId)) await componentsRepo.remove(c.id);
  await systemsRepo.remove(systemId);
}

/** Werkstoff samt Literaturwerten und Proben weich löschen. */
export async function removeMaterialCascade(materialId: string): Promise<void> {
  for (const l of await litValuesRepo.byMaterial(materialId)) await litValuesRepo.remove(l.id);
  for (const s of await samplesRepo.byMaterial(materialId)) await samplesRepo.remove(s.id);
  await materialsRepo.remove(materialId);
}

/** Versuchsreihe samt Versuchen weich löschen. */
export async function removeSeriesCascade(seriesId: string): Promise<void> {
  for (const e of await experimentsRepo.bySeries(seriesId)) await experimentsRepo.remove(e.id);
  await seriesRepo.remove(seriesId);
}
