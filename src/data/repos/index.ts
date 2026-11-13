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

export const seriesRepo = createRepo<Series>(db.series);
export const experimentsRepo = createRepo<Experiment>(db.experiments);
export const notesRepo = createRepo<Note>(db.notes);

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
