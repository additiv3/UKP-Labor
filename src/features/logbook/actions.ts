import { experimentsRepo, materialsRepo, seriesRepo } from '../../data/repos';
import { getSetting } from '../../data/repos/settings';
import { duplicateExperiment, experimentSnapshot, todayIso } from '../../core/logbook';
import { nextVersuchsId } from '../../core/ids';
import type { Experiment } from '../../data/types';

async function materialKurz(materialId: string | undefined): Promise<string> {
  if (!materialId) return 'X';
  return (await materialsRepo.get(materialId))?.kurz || 'X';
}

/** Neuer leerer Versuch in einer Reihe (Werkstoff und Anlage vom letzten Versuch bzw. Standard-Anlage). */
export async function createEmptyExperiment(seriesId: string): Promise<Experiment> {
  const series = await seriesRepo.get(seriesId);
  if (!series) throw new Error('Reihe nicht gefunden');
  const last = await experimentsRepo.latest(seriesId);
  const materialId = last?.materialId;
  const systemId = last?.systemId ?? (await getSetting('defaultSystemId'));
  const ids = await experimentsRepo.allVersuchsIds();
  return experimentsRepo.create({
    versuchsId: nextVersuchsId(ids, series.code, await materialKurz(materialId)),
    seriesId,
    datum: todayIso(),
    systemId,
    materialId,
    sampleId: last?.sampleId,
    params: {},
    abgeleitet: experimentSnapshot({}),
    tags: [],
    status: 'durchgefuehrt',
  });
}

/** Versuch als Vorlage duplizieren (neue laufende Nummer in derselben Reihe). */
export async function duplicate(src: Experiment): Promise<Experiment> {
  const series = await seriesRepo.get(src.seriesId);
  const ids = await experimentsRepo.allVersuchsIds();
  return experimentsRepo.create(
    duplicateExperiment(src, {
      existingIds: ids,
      seriesCode: series?.code ?? src.versuchsId.split('-')[0] ?? 'X',
      materialKurz: await materialKurz(src.materialId),
    }),
  );
}

/** Vorschlag für den nächsten Reihen-Code: B1, B2, … */
export async function nextSeriesCode(): Promise<string> {
  const all = await seriesRepo.listSorted();
  let max = 0;
  for (const s of all) {
    const m = /^B(\d+)$/.exec(s.code);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `B${max + 1}`;
}
