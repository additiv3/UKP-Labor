import type { Component, LaserParams, LitValue, OptikParams } from '../../data/types';
import type { CalcField, CalcState } from './state';

type V = CalcState['v'];

/** Werte, die eine Laserquelle vorbelegt (nur vorhandene Datenblattwerte). */
export function laserPresetValues(p: LaserParams, lambda?: number): V {
  const v: V = {};
  const l = lambda ?? p.wellenlaengen[0];
  if (l !== undefined) v.lambda = l;
  if (p.tauMin !== undefined) v.tau = p.tauMin;
  if (p.m2 !== undefined) v.m2 = p.m2;
  if (p.rohstrahlRadius !== undefined) v.wL = p.rohstrahlRadius;
  return v;
}

/** Werte, die eine Optik vorbelegt. */
export function optikPresetValues(p: OptikParams): V {
  const v: V = {};
  if (p.brennweite !== undefined) v.f = p.brennweite;
  if (p.w0Datenblatt !== undefined) v.w0 = p.w0Datenblatt;
  return v;
}

/** Literaturwert → Rechnerfeld (F_th, δ, S); „sonstig“ wird nicht übernommen. */
export function litTarget(l: LitValue): CalcField | undefined {
  switch (l.groesse) {
    case 'Fth':
      return 'fth';
    case 'delta':
      return 'delta';
    case 'S':
      return 's';
    default:
      return undefined;
  }
}

export function asLaser(c: Component | undefined): LaserParams | undefined {
  return c?.typ === 'laserquelle' ? c.params : undefined;
}
export function asOptik(c: Component | undefined): OptikParams | undefined {
  return c?.typ === 'optik' ? c.params : undefined;
}
export function asScanner(c: Component | undefined) {
  return c?.typ === 'scanner' ? c.params : undefined;
}
