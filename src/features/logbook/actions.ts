import { experimentsRepo, seriesRepo, versuchsartenRepo } from '../../data/repos';
import { getSetting } from '../../data/repos/settings';
import { duplicateExperiment, experimentSnapshot, todayIso, type ArtRef } from '../../core/logbook';
import { nextVersuchsId } from '../../core/ids';
import type { Experiment } from '../../data/types';

/** Versuchsart laden (auch gelöschte: ihr Kürzel bleibt Teil bestehender IDs). */
export async function artRef(versuchsartId: string): Promise<ArtRef> {
  const a = await versuchsartenRepo.get(versuchsartId);
  if (!a) throw new Error('Versuchsart nicht gefunden');
  return { id: a.id, kuerzel: a.kuerzel };
}

/**
 * Art für einen neuen Versuch: zuerst die vorgegebene (Vorlage bzw. Auswahl), sonst die Standard-Art der Reihe.
 * `undefined` → die UI muss nach der Art fragen.
 */
export async function defaultArtId(seriesId: string, preferred?: string): Promise<string | undefined> {
  const pick = async (id: string | undefined) => (id && !(await versuchsartenRepo.get(id))?.deleted ? id : undefined);
  return (await pick(preferred)) ?? (await pick((await seriesRepo.get(seriesId))?.standardVersuchsartId));
}

/** Neuer leerer Versuch in einer Reihe (Werkstoff und Anlage vom letzten Versuch bzw. Standard-Anlage). */
export async function createEmptyExperiment(seriesId: string, versuchsartId: string): Promise<Experiment> {
  const series = await seriesRepo.get(seriesId);
  if (!series) throw new Error('Reihe nicht gefunden');
  const art = await artRef(versuchsartId);
  const last = await experimentsRepo.latest(seriesId);
  const systemId = last?.systemId ?? (await getSetting('defaultSystemId'));
  const ids = await experimentsRepo.allVersuchsIds();
  return experimentsRepo.create({
    versuchsId: nextVersuchsId(ids, series.code, art.kuerzel),
    versuchsartId: art.id,
    seriesId,
    datum: todayIso(),
    systemId,
    materialId: last?.materialId,
    sampleId: last?.sampleId,
    params: {},
    abgeleitet: experimentSnapshot({}),
    tags: [],
    status: 'durchgefuehrt',
  });
}

/**
 * Versuch als Vorlage duplizieren (neue laufende Nummer in derselben Reihe und mit derselben Art).
 * Hat die Vorlage (aus Schema ≤ 2) keine Art, muss `versuchsartId` angegeben werden.
 */
export async function duplicate(src: Experiment, versuchsartId?: string): Promise<Experiment> {
  const series = await seriesRepo.get(src.seriesId);
  if (!series) throw new Error('Reihe nicht gefunden');
  const artId = src.versuchsartId ?? versuchsartId;
  if (!artId) throw new Error('Versuchsart fehlt');
  const ids = await experimentsRepo.allVersuchsIds();
  return experimentsRepo.create(
    duplicateExperiment(src, { existingIds: ids, seriesCode: series.code, art: await artRef(artId) }),
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

/** Neuer Versuch aus Rechnerwerten (Status „geplant“). */
export async function createFromTransfer(
  seriesId: string,
  t: Pick<Experiment, 'systemId' | 'laserId' | 'optikId' | 'scannerId' | 'materialId' | 'params'>,
  versuchsartId: string,
): Promise<Experiment> {
  const series = await seriesRepo.get(seriesId);
  if (!series) throw new Error('Reihe nicht gefunden');
  const art = await artRef(versuchsartId);
  const ids = await experimentsRepo.allVersuchsIds();
  return experimentsRepo.create({
    versuchsId: nextVersuchsId(ids, series.code, art.kuerzel),
    versuchsartId: art.id,
    seriesId,
    datum: todayIso(),
    systemId: t.systemId,
    laserId: t.laserId,
    optikId: t.optikId,
    scannerId: t.scannerId,
    materialId: t.materialId,
    params: t.params,
    abgeleitet: experimentSnapshot(t.params),
    tags: [],
    status: 'geplant',
  });
}

/** Rechnerwerte in einen bestehenden Versuch übernehmen (nur angegebene Werte überschreiben). */
export async function applyTransfer(
  experimentId: string,
  t: Pick<Experiment, 'systemId' | 'laserId' | 'optikId' | 'scannerId' | 'materialId' | 'params'>,
  merge: (a: Experiment['params'], b: Experiment['params']) => Experiment['params'],
): Promise<Experiment> {
  const cur = await experimentsRepo.get(experimentId);
  if (!cur) throw new Error('Versuch nicht gefunden');
  const params = merge(cur.params, t.params);
  return experimentsRepo.update(experimentId, {
    params,
    abgeleitet: experimentSnapshot(params),
    systemId: t.systemId ?? cur.systemId,
    laserId: t.systemId ? t.laserId : cur.laserId,
    optikId: t.systemId ? t.optikId : cur.optikId,
    scannerId: t.systemId ? t.scannerId : cur.scannerId,
    materialId: t.materialId ?? cur.materialId,
  });
}
