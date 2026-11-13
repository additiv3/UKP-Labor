import type { Experiment, ExperimentParams } from '../../data/types';
import type { Derived } from '../../core/physics/derive';
import type { CalcState } from './state';

export type CalcTransfer = Pick<Experiment, 'systemId' | 'laserId' | 'optikId' | 'scannerId' | 'materialId'> & {
  params: ExperimentParams;
};

/**
 * Rechnerzustand → Versuchsparameter (nur angegebene Werte).
 * Energie wie eingegeben (Leistung oder Pulsenergie); w₀ mit Quelle („berechnet“ bzw. „Datenblatt“, wenn er dem
 * Datenblattwert der gewählten Optik entspricht).
 */
export function calcToExperiment(s: CalcState, d: Derived, optikW0Datenblatt?: number): CalcTransfer {
  const v = s.v;
  const p: ExperimentParams = {
    lambda: v.lambda,
    tau: v.tau,
    fRep: v.fRep,
    transmission: v.transmission,
    m2: v.m2,
    fokuslage: v.z,
    v: v.v,
    hatch: v.hatch,
    nPulse: v.nPulse,
  };
  if (s.energyMode === 'pAvg') p.pAvg = v.pAvg;
  else p.ePuls = v.ePuls;
  if (s.w0Mode === 'direkt') {
    p.w0 = v.w0;
    if (v.w0 !== undefined && optikW0Datenblatt !== undefined && Math.abs(v.w0 - optikW0Datenblatt) <= 1e-9 * optikW0Datenblatt)
      p.w0Quelle = 'datenblatt';
  } else if (d.w0 !== undefined) {
    p.w0 = d.w0;
    p.w0Quelle = 'berechnet';
  }
  const params = Object.fromEntries(Object.entries(p).filter(([, x]) => x !== undefined)) as ExperimentParams;
  const pr = s.preset;
  return {
    params,
    systemId: pr.systemId,
    laserId: pr.systemId ? pr.laserId : undefined,
    optikId: pr.systemId ? pr.optikId : undefined,
    scannerId: pr.systemId ? pr.scannerId : undefined,
    materialId: pr.materialId,
  };
}

/** Rechnerwerte in bestehende Versuchsparameter übernehmen (überschreibt nur angegebene Werte). */
export function mergeIntoParams(existing: ExperimentParams, incoming: ExperimentParams): ExperimentParams {
  const out: ExperimentParams = { ...existing, ...incoming };
  // E_p und P_avg sind über f_rep gekoppelt: die nicht übernommene Größe entfernen, sonst Widerspruch
  if (incoming.pAvg !== undefined) delete out.ePuls;
  if (incoming.ePuls !== undefined) delete out.pAvg;
  if (incoming.v !== undefined) delete out.pulsabstand;
  if (incoming.w0 !== undefined && incoming.w0Quelle === undefined) delete out.w0Quelle;
  return out;
}
