# 05 — Export, Import, Synchronisation

## Prinzip
Kein Server. Jedes Gerät hat eine vollständige lokale Datenbank. Abgleich erfolgt über **Dateien**, die der Nutzer
in einen synchronisierten Ordner legt (aktuell FAUBox, evtl. später externe Festplatte):

```
iPhone ─Export(JSON)→ Teilen-Menü → Datei → Sync-Ordner/02_Labor/Logbuch/
Laptop-App ─Import & Zusammenführen→ ─Export→ logbuch.json + logbuch.csv (Hauptlogbuch)
anderer Laptop ─Import logbuch.json→ gleicher Stand
```

## JSON-Export (vollständig)
```json
{
  "app": "ukp-labor",
  "schemaVersion": 1,
  "formelVersion": "1.0",
  "exportedAt": "2026-11-13T10:00:00Z",
  "deviceId": "…", "deviceName": "iPhone",
  "data": { "systems": [], "components": [], "materials": [], "litValues": [],
            "samples": [], "series": [], "experiments": [], "notes": [] }
}
```
Inklusive Tombstones (`deleted: true`). Validierung beim Import mit zod; bei Fehlern Bericht statt Absturz.

## Merge-Regeln (Import)
1. Abgleich über `id` (UUID), nicht über Namen.
2. Unbekannte `id` → einfügen.
3. Bekannte `id` → neuerer `updatedAt` gewinnt (last-writer-wins); bei Gleichstand nichts tun.
4. Tombstones werden wie normale Änderungen behandelt (neuerer Tombstone löscht).
5. Konflikt bei `versuchsId` (gleiche ID, verschiedene UUID) → beide behalten, zweite mit Suffix `-K1` markieren
   und im Importbericht melden.
6. Importbericht: neu / aktualisiert / unverändert / Konflikte, vor dem Übernehmen als Vorschau anzeigen.

## CSV-Export (Versuche, flach)
- Eine Zeile pro Versuch, Trennzeichen `;`, UTF-8 mit BOM (Excel-kompatibel), Dezimalpunkt.
- Spalten mit Einheit im Kopf, angezeigt in Labor-Einheiten:
  `versuchsId;datum;reihe;material;probe;anlage;laser;optik;lambda_nm;tau_fs;pAvg_W;ePuls_uJ;fRep_kHz;transmission;w0_um;w0Quelle;fokuslage_um;v_mm_s;pulsabstand_um;hatch_um;nPulse;ueberfahrten;F0_J_cm2;OL;N2D;burstN;fBurst_MHz;F0Sub_J_cm2;strategie;atmosphaere;tags;status;bemerkung;id;updatedAt`
- Burst-Spalten (ab 0.9): `burstN` = Sub-Pulse pro Burst (nur bei n ≥ 2), `fBurst_MHz` = Intra-Burst-Frequenz,
  `F0Sub_J_cm2` = Spitzenfluenz pro Sub-Puls im Fokus (Snapshot). Bei Burst gelten `pAvg_W`/`ePuls_uJ` pro Burst.
- Gedacht für Python (pandas) und Excel. Nur lesen, kein CSV-Import.

## Dateinamen
- `JJJJMMTT_ukp-labor_<geraet>.json` (Geräte-Export)
- Hauptlogbuch: `logbuch.json`, `logbuch.csv` (werden überschrieben, Versionierung über Sync-Ordner)

## Technik
- iPhone: Web Share API (`navigator.share({ files })`), Fallback Download-Link.
- Laptop (Chrome/Edge): File System Access API — „Hauptlogbuch öffnen“ merkt sich das Datei-Handle,
  „Speichern“ schreibt `logbuch.json` + `logbuch.csv` direkt in den Sync-Ordner. Fallback: Download.
- Import: Dateiauswahl (`<input type=file accept=.json>`).
