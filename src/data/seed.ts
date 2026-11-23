import type { Material, MaterialClass, Versuchsart } from './types';

/**
 * Startbibliothek: nur Werkstoffnamen, Kürzel und Klasse — bewusst KEINE Zahlenwerte (keine Werte ohne Quelle).
 *
 * Die UUIDs sind fest vergeben, damit die Seed-Werkstoffe auf allen Geräten dieselbe `id` haben und beim
 * Import-Merge nicht doppelt entstehen. `updatedAt` liegt in der Vergangenheit, damit jede Nutzeränderung gewinnt.
 */
export const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';
export const SEED_DEVICE_ID = 'seed';

const SEED: ReadonlyArray<readonly [id: string, name: string, kurz: string, klasse: MaterialClass]> = [
  ['5e3d0001-0000-4000-8000-000000000001', 'Silizium', 'Si', 'halbleiter'],
  ['5e3d0001-0000-4000-8000-000000000002', 'Quarzglas', 'FS', 'glas'],
  ['5e3d0001-0000-4000-8000-000000000003', 'Borosilikatglas', 'BSG', 'glas'],
  ['5e3d0001-0000-4000-8000-000000000004', 'Saphir', 'Sap', 'keramik'],
  ['5e3d0001-0000-4000-8000-000000000005', 'Kupfer', 'Cu', 'metall'],
  ['5e3d0001-0000-4000-8000-000000000006', 'Al2O3-Keramik', 'Al2O3', 'keramik'],
  ['5e3d0001-0000-4000-8000-000000000007', 'Aluminiumnitrid', 'AlN', 'keramik'],
  ['5e3d0001-0000-4000-8000-000000000008', 'Siliziumkarbid', 'SiC', 'halbleiter'],
  ['5e3d0001-0000-4000-8000-000000000009', 'Galliumnitrid', 'GaN', 'halbleiter'],
  ['5e3d0001-0000-4000-8000-00000000000a', 'Polyimid', 'PI', 'polymer'],
  ['5e3d0001-0000-4000-8000-00000000000b', 'Epoxid-Moldmasse (EMC)', 'EMC', 'verbund'],
  ['5e3d0001-0000-4000-8000-00000000000c', 'Glas-Substrat', 'GlasSub', 'glas'],
];

export function seedMaterials(): Material[] {
  return SEED.map(([id, name, kurz, klasse]) => ({
    id,
    name,
    kurz,
    klasse,
    seed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    deviceId: SEED_DEVICE_ID,
  }));
}

/**
 * Startliste der Versuchsarten (Teil der Versuchs-ID). Feste UUIDs wie bei den Werkstoffen, damit alle Geräte dieselben
 * Datensätze haben. Wird beim Anlegen der Datenbank und beim Upgrade auf Schema 3 angelegt (nur fehlende IDs).
 */
const SEED_ARTEN: ReadonlyArray<readonly [id: string, kuerzel: string, name: string]> = [
  ['5e3d0002-0000-4000-8000-000000000001', 'SPOT', 'Strahl-/Spotcharakterisierung'],
  ['5e3d0002-0000-4000-8000-000000000002', 'PWR', 'Leistungs-/Pulsenergiemessung'],
  ['5e3d0002-0000-4000-8000-000000000003', 'THR', 'Einzelkrater/Schwelle/Inkubation'],
  ['5e3d0002-0000-4000-8000-000000000004', 'ABL', 'Linien-/Flächenabtrag'],
  ['5e3d0002-0000-4000-8000-000000000005', 'CUT', 'Trennen/Schneiden'],
];

export function seedVersuchsarten(): Versuchsart[] {
  return SEED_ARTEN.map(([id, kuerzel, name]) => ({
    id,
    kuerzel,
    name,
    seed: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    deviceId: SEED_DEVICE_ID,
  }));
}
