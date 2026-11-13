/**
 * zod-Schemas für das Exportformat (docs/05_export-sync.md). Validierung beim Import.
 * Unbekannte Zusatzfelder bleiben erhalten (looseObject), damit nichts verloren geht.
 */
import { z } from 'zod';
import { COMPONENT_TYPES, MATERIAL_CLASSES, SYNC_TABLES, type SyncEntityMap, type SyncTable } from '../../data/types';

export const APP_ID = 'ukp-labor';

const uuidish = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'kein gültiger Zeitstempel');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'kein gültiges Datum');
const num = z.number().refine(Number.isFinite, 'keine endliche Zahl');
const optNum = num.optional();
const optStr = z.string().optional();

const base = {
  id: z.string().regex(uuidish, 'keine UUID'),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deleted: z.boolean().optional(),
  deviceId: z.string(),
};

export const systemSchema = z.looseObject({ ...base, name: z.string(), standort: optStr, beschreibung: optStr, notizen: optStr });

const componentBase = {
  ...base,
  systemId: z.string(),
  name: z.string(),
  hersteller: optStr,
  modell: optStr,
  datenblatt: optStr,
  notizen: optStr,
};

export const componentSchema = z.discriminatedUnion('typ', [
  z.looseObject({
    ...componentBase,
    typ: z.literal('laserquelle'),
    params: z.looseObject({
      wellenlaengen: z.array(num),
      pMax: optNum,
      ePulsMax: optNum,
      fRepMin: optNum,
      fRepMax: optNum,
      tauMin: optNum,
      tauMax: optNum,
      m2: optNum,
      rohstrahlRadius: optNum,
      burst: z.boolean().optional(),
      burstInfo: optStr,
    }),
  }),
  z.looseObject({
    ...componentBase,
    typ: z.literal('optik'),
    params: z.looseObject({
      brennweite: optNum,
      typ: z.enum(['f-theta', 'linse', 'objektiv']).optional(),
      eingangsapertur: optNum,
      w0Datenblatt: optNum,
      feldgroesse: optNum,
    }),
  }),
  z.looseObject({
    ...componentBase,
    typ: z.literal('scanner'),
    params: z.looseObject({ vMax: optNum, feldgroesse: optNum, apertur: optNum }),
  }),
  z.looseObject({
    ...componentBase,
    typ: z.literal('achsen'),
    params: z.looseObject({ anzahl: optNum, verfahrwege: optStr, genauigkeit: optNum }),
  }),
  z.looseObject({
    ...componentBase,
    typ: z.enum(COMPONENT_TYPES.filter((t) => !['laserquelle', 'optik', 'scanner', 'achsen'].includes(t)) as [
      'strahlformung',
      'leistungsmesser',
      'messgeraet',
      'sonstiges',
    ]),
    params: z.looseObject({ freitext: optStr }),
  }),
]);

export const materialSchema = z.looseObject({
  ...base,
  name: z.string(),
  kurz: z.string(),
  klasse: z.enum(MATERIAL_CLASSES),
  bandluecke: optNum,
  brechungsindex: optNum,
  dichte: optNum,
  waermeleitfaehigkeit: optNum,
  schmelzTemp: optNum,
  notizen: optStr,
  seed: z.boolean().optional(),
});

export const litValueSchema = z.looseObject({
  ...base,
  materialId: z.string(),
  groesse: z.enum(['Fth', 'delta', 'S', 'sonstig']),
  wert: num,
  einheit: z.string(),
  lambda: optNum,
  tau: optNum,
  nPulse: optNum,
  methode: optStr,
  citekey: z.string().min(1, 'Citekey fehlt'),
  notiz: optStr,
});

export const sampleSchema = z.looseObject({
  ...base,
  materialId: z.string(),
  bezeichnung: z.string(),
  lieferant: optStr,
  charge: optStr,
  dicke: optNum,
  oberflaeche: optStr,
  orientierung: optStr,
  lagerort: optStr,
  notiz: optStr,
});

export const seriesSchema = z.looseObject({
  ...base,
  code: z.string(),
  titel: z.string(),
  ziel: optStr,
  status: z.enum(['geplant', 'laufend', 'abgeschlossen']),
  notizen: optStr,
});

export const experimentSchema = z.looseObject({
  ...base,
  versuchsId: z.string().min(1),
  seriesId: z.string(),
  datum: isoDate,
  systemId: optStr,
  laserId: optStr,
  optikId: optStr,
  scannerId: optStr,
  sampleId: optStr,
  materialId: optStr,
  params: z.looseObject({
    lambda: optNum,
    tau: optNum,
    pAvg: optNum,
    ePuls: optNum,
    fRep: optNum,
    burst: z.looseObject({ anzahl: optNum, freq: optNum, info: optStr }).optional(),
    transmission: optNum,
    w0: optNum,
    w0Quelle: z.enum(['datenblatt', 'berechnet', 'd2', 'geschaetzt']).optional(),
    m2: optNum,
    fokuslage: optNum,
    v: optNum,
    pulsabstand: optNum,
    hatch: optNum,
    nPulse: optNum,
    ueberfahrten: optNum,
    strategie: optStr,
    atmosphaere: optStr,
    absaugung: optStr,
  }),
  abgeleitet: z.looseObject({ formelVersion: z.string(), werte: z.record(z.string(), num) }).optional(),
  bemerkung: optStr,
  tags: z.array(z.string()),
  status: z.enum(['geplant', 'durchgefuehrt', 'verworfen']),
});

export const noteSchema = z.looseObject({
  ...base,
  titel: z.string(),
  inhalt: z.string(),
  datum: isoDate,
  typ: z.enum(['tagebuch', 'notiz']),
  tags: z.array(z.string()),
  links: z.array(z.string()),
});

export const ENTITY_SCHEMAS: Record<SyncTable, z.ZodType> = {
  systems: systemSchema,
  components: componentSchema,
  materials: materialSchema,
  litValues: litValueSchema,
  samples: sampleSchema,
  series: seriesSchema,
  experiments: experimentSchema,
  notes: noteSchema,
};

export const exportHeaderSchema = z.looseObject({
  app: z.literal(APP_ID, { error: 'Keine UKP-Labor-Datei' }),
  schemaVersion: z.number().int().positive(),
  formelVersion: z.string(),
  exportedAt: isoDateTime,
  deviceId: z.string(),
  deviceName: z.string().optional(),
  data: z.looseObject(Object.fromEntries(SYNC_TABLES.map((t) => [t, z.array(z.unknown()).optional()]))),
});

export type ExportData = { [K in SyncTable]: SyncEntityMap[K][] };

export interface ExportFile {
  app: typeof APP_ID;
  schemaVersion: number;
  formelVersion: string;
  exportedAt: string;
  deviceId: string;
  deviceName?: string;
  data: ExportData;
}

export function emptyData(): ExportData {
  return { systems: [], components: [], materials: [], litValues: [], samples: [], series: [], experiments: [], notes: [] };
}

export interface ValidationIssue {
  table: SyncTable | 'datei';
  index?: number;
  id?: string;
  message: string;
}

export interface ParseResult {
  file?: ExportFile;
  /** ungültige Datensätze werden übersprungen und hier gemeldet */
  issues: ValidationIssue[];
  /** fataler Fehler (Datei unbrauchbar) */
  fatal?: string;
}

/** JSON-Text prüfen. Ungültige Einzeldatensätze werden übersprungen, die Datei bleibt nutzbar. */
export function parseExport(text: string, currentSchemaVersion: number): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { issues: [], fatal: 'Die Datei ist kein gültiges JSON.' };
  }
  const head = exportHeaderSchema.safeParse(raw);
  if (!head.success) {
    const msg = head.error.issues[0]?.message ?? 'unbekannter Fehler';
    return { issues: [], fatal: `Keine gültige UKP-Labor-Exportdatei (${msg}).` };
  }
  if (head.data.schemaVersion > currentSchemaVersion) {
    return {
      issues: [],
      fatal: `Die Datei stammt aus einer neueren App-Version (Schema ${head.data.schemaVersion}, diese App: ${currentSchemaVersion}). Bitte die App aktualisieren.`,
    };
  }
  const issues: ValidationIssue[] = [];
  const data = emptyData();
  for (const t of SYNC_TABLES) {
    const arr = (head.data.data[t] as unknown[] | undefined) ?? [];
    arr.forEach((rec, index) => {
      const r = ENTITY_SCHEMAS[t].safeParse(rec);
      if (r.success) (data[t] as unknown[]).push(r.data);
      else {
        const id = typeof rec === 'object' && rec && 'id' in rec ? String((rec as { id: unknown }).id) : undefined;
        const first = r.error.issues[0];
        issues.push({ table: t, index, id, message: `${first?.path.join('.') || '(Datensatz)'}: ${first?.message ?? 'ungültig'}` });
      }
    });
  }
  const h = head.data;
  return {
    file: {
      app: APP_ID,
      schemaVersion: h.schemaVersion,
      formelVersion: h.formelVersion,
      exportedAt: h.exportedAt,
      deviceId: h.deviceId,
      deviceName: h.deviceName,
      data,
    },
    issues,
  };
}
