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
`systemId`, `typ`: `'laserquelle' | 'optik' | 'scanner' | 'achsen' | 'strahlformung' | 'leistungsmesser' | 'messgeraet' | 'sonstiges'`,
`name`, `hersteller?`, `modell?`, `datenblatt?` (Pfad/Text), `notizen?`, `params` (typabhängig):
- laserquelle: `wellenlaengen: number[]`, `pMax?`, `ePulsMax?`, `fRepMin?`, `fRepMax?`, `tauMin?`, `tauMax?`, `m2?`,
  `rohstrahlRadius?` (w_L am Ausgang bzw. an der Optik), `burst?: boolean`, `burstInfo?`
- optik: `brennweite`, `typ?` ('f-theta' | 'linse' | 'objektiv'), `eingangsapertur?`, `w0Datenblatt?`, `feldgroesse?`
- scanner: `vMax?`, `feldgroesse?`, `apertur?`
- achsen: `anzahl?`, `verfahrwege?` (Text), `genauigkeit?`
- sonstige Typen: `freitext`

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
    burst?: { anzahl?: number; freq?: number; info?: string };
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
