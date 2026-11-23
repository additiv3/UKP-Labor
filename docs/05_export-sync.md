# 05 — Export, Import, Synchronisation

## Prinzip
Kein Server. Jedes Gerät hat eine vollständige lokale Datenbank. Abgleich erfolgt über **Dateien**, die der Nutzer
in einen synchronisierten Ordner legt (aktuell FAUBox, evtl. später externe Festplatte):

```
iPhone ─Export(JSON)→ Teilen-Menü → Datei → 04_Versuche/logbuch/_eingang/
Laptop-App ─Import & Zusammenführen→ ─Speichern→ 04_Versuche/logbuch/logbuch.json + logbuch.csv (Hauptlogbuch)
anderer Laptop ─Import logbuch.json→ gleicher Stand
```

**Ablageort** (Wissensordner der Promotion): `Desktop/Promotion/Claude Promotion/04_Versuche/logbuch/`
- Hauptlogbuch: `logbuch.json` + `logbuch.csv` direkt in diesem Ordner (am Laptop als Hauptlogbuch-Ordner wählen).
- Geräte-Exporte (iPhone, `JJJJMMTT_ukp-labor_<geraet>.json`): `04_Versuche/logbuch/_eingang/`; nach dem Zusammenführen
  am Laptop können sie dort bleiben oder gelöscht werden.
- `logbuch.csv` ist die Versuchsliste der Promotion; die App ist die einzige Quelle für Versuchs- und Proben-IDs.

## JSON-Export (vollständig)
```json
{
  "app": "ukp-labor",
  "schemaVersion": 3,
  "formelVersion": "1.0",
  "exportedAt": "2026-11-13T10:00:00Z",
  "deviceId": "…", "deviceName": "iPhone",
  "data": { "systems": [], "components": [], "materials": [], "litValues": [],
            "samples": [], "versuchsarten": [], "series": [], "experiments": [], "notes": [] }
}
```
Inklusive Tombstones (`deleted: true`). Validierung beim Import mit zod; bei Fehlern Bericht statt Absturz.

**Schemaversionen:** Dateien mit älterer `schemaVersion` werden beim Einlesen mit derselben Migration wie die Datenbank
angehoben (`src/core/exchange/migrate.ts`), Dateien aus neueren App-Versionen abgelehnt.
- 1 → 2 (App 0.10): Laser-Wellenlängen von `number[]` zu `[{ id, lambda, … }]`; neu: Komponententyp `station`,
  `status`, `belege`. Zeitstempel bleiben unverändert.
- 2 → 3 (App 0.11): neue Tabelle `versuchsarten` (Seed in jeder Datenbank, auch bestehenden); Proben ohne `probenId`
  bekommen `<Werkstoffkürzel>-<NNN>` in `createdAt`-Reihenfolge je Kürzel (gelöschte zählen mit; Werkstoff fehlt/ohne
  Kürzel → `P-<NNN>`). Versuche behalten ihre `versuchsId`, `versuchsartId` bleibt leer (die App fordert die Auswahl).
  Zeitstempel bleiben unverändert. Die Datei-Migration läuft über alle Tabellen gemeinsam (`upgradeData`), weil die
  Proben-IDs die Werkstoffe brauchen.

**Anlagen-Importdatei** (`daten/anlagen-import.json`, nur privates Repo) hat genau dieses Format und wird über
„Import & Zusammenführen“ übernommen.

## Merge-Regeln (Import)
1. Abgleich über `id` (UUID), nicht über Namen.
2. Unbekannte `id` → einfügen.
3. Bekannte `id` → neuerer `updatedAt` gewinnt (last-writer-wins); bei Gleichstand nichts tun.
4. Tombstones werden wie normale Änderungen behandelt (neuerer Tombstone löscht).
5. Konflikt bei `versuchsId` oder `probenId` (gleiche ID, verschiedene UUID) → beide behalten, die importierte mit Suffix
   `-K1` (`-K2` …) markieren und im Importbericht melden. Doppeltes Versuchsart-Kürzel (verschiedene UUID) → importierte Art
   bekommt `K1` ohne Bindestrich angehängt (z. B. `DRLK1`, der Bindestrich ist ID-Trenner); Versuchs-IDs bleiben unverändert.
   Umbenannte Datensätze bekommen einen neuen `updatedAt`, damit die Umbenennung auf die anderen Geräte gelangt.
6. Importbericht: neu / aktualisiert / unverändert / Konflikte, vor dem Übernehmen als Vorschau anzeigen.
7. Alle Versuche aus der Datei werden `idFixiert` (ohne neuen `updatedAt`; zählt nicht als Änderung).

## CSV-Export (Versuche, flach)
- Eine Zeile pro Versuch, Trennzeichen `;`, UTF-8 mit BOM (Excel-kompatibel), Dezimalpunkt.
- Spalten mit Einheit im Kopf, angezeigt in Labor-Einheiten:
  `versuchsId;art;datum;reihe;material;probe;probenFeld;anlage;station;laser;optik;lambda_nm;tau_fs;pAvg_W;ePuls_uJ;fRep_kHz;transmission;w0_um;w0Quelle;w0Beleg;fokuslage_um;v_mm_s;pulsabstand_um;hatch_um;nPulse;ueberfahrten;F0_J_cm2;OL;N2D;burstN;fBurst_MHz;F0Sub_J_cm2;strategie;atmosphaere;tags;status;bemerkung;id;updatedAt`
- Ab 0.11: `art` = Kürzel der Versuchsart (leer bei Versuchen ohne Art), `probe` = Proben-ID (`FS-001`), `probenFeld` = Feld
  auf der Probe (`F03`), `station` = Name der Bearbeitungsstation, `w0Beleg` = Versuchs-ID der Spotmessung oder Freitext.
- Burst-Spalten (ab 0.9): `burstN` = Sub-Pulse pro Burst (nur bei n ≥ 2), `fBurst_MHz` = Intra-Burst-Frequenz,
  `F0Sub_J_cm2` = Spitzenfluenz pro Sub-Puls im Fokus (Snapshot). Bei Burst gelten `pAvg_W`/`ePuls_uJ` pro Burst.
- Gedacht für Python (pandas) und Excel. Nur lesen, kein CSV-Import.

## Dateinamen
- `JJJJMMTT_ukp-labor_<geraet>.json` (Geräte-Export)
- Hauptlogbuch: `logbuch.json`, `logbuch.csv` in `04_Versuche/logbuch/` (werden überschrieben, Versionierung über den
  synchronisierten Ordner)

## Technik
- iPhone: Web Share API (`navigator.share({ files })`), Fallback Download-Link.
- Laptop (Chrome/Edge): File System Access API — „Hauptlogbuch öffnen“ merkt sich das Datei-Handle,
  „Speichern“ schreibt `logbuch.json` + `logbuch.csv` direkt in `04_Versuche/logbuch/`. Fallback: Download.
- Import: Dateiauswahl (`<input type=file accept=.json>`).
