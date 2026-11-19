# 03 — Datenmodell

Alle Entitäten erben:
```ts
interface Base {
  id: string;          // UUID v4
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601, bei jeder Änderung setzen
  deleted?: boolean;   // Tombstone statt Löschen
  deviceId: string;    // Gerät der letzten Änderung
}
```
Zahlenwerte in SI. Optionale Felder sind `undefined`, wenn nicht angegeben.

## Anlage (`systems`)
`name`, `standort?`, `beschreibung?`, `notizen?`

## Komponente (`components`)
`systemId`, `typ`: `'laserquelle' | 'station' | 'optik' | 'scanner' | 'achsen' | 'strahlformung' | 'leistungsmesser' | 'messgeraet' | 'sonstiges'`,
`name`, `hersteller?`, `modell?`, `datenblatt?` (Pfad/Text), `notizen?`,
`status?`: `'betriebsbereit' | 'nicht-aufgebaut' | 'justage-noetig' | 'unbekannt'` (fehlt → unbekannt),
`params` (typabhängig):
- laserquelle: `wellenlaengen: Wellenlaenge[]`, `pMax?`, `ePulsMax?` (gesamt bzw. Grundwelle; gelten, wenn die
  Wellenlänge keinen eigenen Wert hat), `fRepMin?`, `fRepMax?`, `tauMin?`, `tauMax?`, `m2?`,
  `rohstrahlRadius?` (w_L am Ausgang bzw. an der Optik), `burst?: boolean`, `burstInfo?`, `belege?`
  - `Wellenlaenge`: `id` (innerhalb der Laserquelle stabil), `lambda?`, `bezeichnung?` (z. B. „Grundwelle“, „SHG“),
    `pMax?`, `ePulsMax?`, `m2?`, `notiz?`, `belege?`
- station (Bearbeitungsstation): `art?` (`'scanner' | 'schneidkopf' | 'feste-optik'`), `laserIds: string[]` (Laserquellen
  derselben Anlage), `strahlengaenge: Strahlengang[]`, `brennweite?`, `objektiv?` (Text), `feldgroesse?`, `belege?`
  - `Strahlengang`: `id`, `laserId?`, `wellenlaengeId?` (→ `Wellenlaenge.id`), `band?` (`'IR' | 'VIS' | 'UV'`, nur wenn λ
    nicht zugeordnet), `status?`, `w0?` (Fokusradius 1/e²), `notiz?`, `belege?`
- optik: `brennweite`, `typ?` ('f-theta' | 'linse' | 'objektiv'), `eingangsapertur?`, `w0Datenblatt?`, `feldgroesse?`, `belege?`
- scanner: `vMax?`, `feldgroesse?`, `apertur?`, `belege?`
- achsen: `anzahl?`, `verfahrwege?` (Text), `genauigkeit?`, `belege?`
- sonstige Typen: `freitext`

**Belege** (`belege?: Record<Feldname, { unbestaetigt?: boolean; quelle?: string }>`): Herkunft der Zahlenwerte des
umgebenden Objekts, z. B. `params.belege.pMax = { quelle: "Carbide_….pdf, S. 3" }`. `unbestaetigt: true` → Anzeige mit ⚠︎.
Leere Belege werden nicht gespeichert.

**Spektralbereich** (Übersicht, Spalten): aus λ abgeleitet, UV < 400 nm ≤ VIS < 780 nm ≤ IR; sonst `band` des Strahlengangs.

Seit Schema 2 (App 0.10). Schema 1 hatte `wellenlaengen: number[]`; Migration siehe `05_export-sync.md`.

## Werkstoff (`materials`)
`name`, `kurz` (für Versuchs-ID, z. B. „Si“, „FS“), `klasse`, `bandluecke?` (eV), `brechungsindex?`, `dichte?`,
`waermeleitfaehigkeit?`, `schmelzTemp?`, `notizen?`, `seed?: boolean`

## Literaturwert (`litValues`)
`materialId`, `groesse`: `'Fth' | 'delta' | 'S' | 'sonstig'`, `wert`, `einheit`, `lambda?`, `tau?`, `nPulse?`,
`methode?`, `citekey` (Pflicht), `notiz?`

## Probe (`samples`)
`materialId`, `bezeichnung`, `lieferant?`, `charge?`, `dicke?`, `oberflaeche?`, `orientierung?`, `lagerort?`, `notiz?`

## Versuchsreihe (`series`)
`code` (z. B. „B1“), `titel`, `ziel?`, `status`: `'geplant' | 'laufend' | 'abgeschlossen'`, `notizen?`

## Versuch (`experiments`) — Kern des Logbuchs
```ts
{
  versuchsId: string;          // "B1-Si-001", eindeutig
  seriesId: string;
  datum: string;               // ISO-Datum
  systemId?: string; laserId?: string; optikId?: string; scannerId?: string;
  sampleId?: string; materialId?: string;
  params: {
    lambda?: number; tau?: number;
    pAvg?: number; ePuls?: number; fRep?: number;
    burst?: { anzahl?: number; freq?: number; info?: string };  // ab anzahl ≥ 2: pAvg/ePuls gelten pro Burst
    transmission?: number;     // Abschwächung 0..1
    w0?: number; w0Quelle?: 'datenblatt' | 'berechnet' | 'd2' | 'geschaetzt';
    m2?: number; fokuslage?: number;  // z relativ zur Oberfläche, + = über der Oberfläche
    v?: number; pulsabstand?: number; hatch?: number;
    nPulse?: number; ueberfahrten?: number;
    strategie?: string; atmosphaere?: string; absaugung?: string;
  };
  abgeleitet?: { formelVersion: string; werte: Record<string, number> };  // Snapshot
  bemerkung?: string;
  tags: string[];
  status: 'geplant' | 'durchgefuehrt' | 'verworfen';
}
```
Regel: `ePuls` und `pAvg` sind über `fRep` gekoppelt; die UI zeigt den jeweils anderen Wert berechnet an,
gespeichert wird, was der Nutzer eingegeben hat.

## Notiz (`notes`)
`titel`, `inhalt` (Markdown), `datum`, `typ`: `'tagebuch' | 'notiz'`, `tags`, `links`: string[] (versuchsIds/seriesIds)

## Einstellungen (`settings`, Key-Value, nicht exportiert außer auf Wunsch)
`deviceId`, `deviceName`, `defaultSystemId`, `theme`, `lastExportAt`, `units`

## Dexie-Indizes (Vorschlag)
- experiments: `id, versuchsId, seriesId, datum, materialId, updatedAt, *tags`
- series: `id, code, updatedAt` · notes: `id, datum, updatedAt, *tags`
- components: `id, systemId, typ, updatedAt` · materials: `id, name, updatedAt` · samples: `id, materialId, updatedAt`
- litValues: `id, materialId, updatedAt`
