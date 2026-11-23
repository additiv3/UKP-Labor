# 07 — Roadmap

Status: ☐ offen · ◐ in Arbeit · ☑ fertig. Nach jedem Meilenstein aktualisieren.

| Version | Inhalt | Status |
|---|---|---|
| 0.1 | Projekt-Setup (Vite/React/TS, Lint, Vitest), PWA-Manifest + Service Worker, GitHub-Actions-Deployment, Navigation mit 5 leeren Reitern + Einstellungen, Dexie-Schema aller Entitäten, `persist()` | ☑ |
| 0.2 | Rechenkern komplett mit Tests (`04_formeln.md`), Rechner-UI ohne Presets, Kaustik-Plot | ☑ |
| 0.3 | Anlagen & Komponenten, Werkstoffe (Seed), Literaturwerte, Proben; Presets im Rechner + Grenzwertwarnungen | ☑ |
| 0.4 | Logbuch: Reihen, Versuche, Duplizieren, ID-Generator, abgeleitete Werte + Snapshot, Filter/Suche | ☑ |
| 0.5 | Export JSON/CSV, Import mit Merge-Vorschau, Backup-Erinnerung, Hauptlogbuch (File System Access) | ☑ |
| 0.6 | Matrix-Generator, „Aus Rechner übernehmen“ | ☑ |
| 0.7 | Notizen/Tagebuch mit Markdown/KaTeX, Verlinkung, Formelsammlung | ☑ |
| 0.8 | D²-Fit und Inkubationsfit im Rechner | ☑ |
| 0.9 | Druckansicht Versuch + Reihe, Burst-Rechner, Burst im Snapshot (Formelversion 1.1), Android-Check | ☑ |
| 0.10 | Anlagenmodul: mehrere Laser und Bearbeitungsstationen je Anlage, Wellenlängen mit eigenen Grenzwerten, Strahlengänge, Status, Belege (unbestätigt/Quelle), Übersicht Stationen × Wellenlängen; Datenschema 2; private Importdatei der Laboranlagen | ☑ |
| 0.11 | Versuchsart in der Versuchs-ID (`<Reihe>-<Art>-<NNN>`), Versuchsarten als synchronisierte Entität, Proben-IDs (`FS-001`), ID-Schutz (`idFixiert`), Probenfeld, w₀ „gemessen“ mit Beleg, Station/Strahlengang im Versuch; Datenschema 3; Ablageort `04_Versuche/logbuch/` | ☑ |
| 0.12 | Wärmeakkumulation: modellfreie Kenngrößen, Werkstofffeld c_p, optional Akkumulationsmodell nach bestätigter Quelle | ☐ |

Hinweis: Export/Import (0.5) kommt bewusst früh, bevor echte Labordaten entstehen.

## Stand 0.1 (umgesetzt)
- Vite 8 · React 19 · TypeScript 6 (strict, `noUncheckedIndexedAccess`) · ESLint 10 (typescript-eslint strict) · Vitest 5.
- PWA über vite-plugin-pwa (`registerType: 'prompt'`, Hinweis „Neue Version verfügbar“), Manifest `standalone`,
  Icons 192/512 (+ maskable) und apple-touch-icon (aus `public/favicon.svg` gerendert).
- HashRouter mit 5 Reitern (Tab-Leiste mobil, Seitenleiste ab 900 px) und Einstellungen (Zahnrad).
- Dexie-Schema v1 aller Entitäten (`src/data/db.ts`), generisches Repository mit Zeitstempeln, Geräte-ID und Tombstones,
  Versuchs-ID-Generator (`src/core/ids.ts`), Startbibliothek Werkstoffe.
- `navigator.storage.persist()` beim Start, Status und Speicherbelegung in den Einstellungen.
- Workflows: `.github/workflows/ci.yml` (lint, test, build bei jedem Push), `.github/workflows/pages.yml` (Deployment).

## Stand 0.2 (umgesetzt)
- Rechenkern `src/core/physics/`: `fluence.ts`, `beam.ts`, `scan.ts`, `ablation.ts`, `fit.ts` (lineare Regression, D²-Fit nach Liu,
  Inkubationsfit), `units.ts` (Eingabe-Parsing, Einheiten, Anzeige mit SI-Präfixen), `derive.ts` (alle abgeleiteten Werte +
  Snapshot mit `formelVersion`), `formulas.ts` (LaTeX), `version.ts` (`FORMEL_VERSION = "1.0"`).
- Tests: alle 20 Referenzwerte aus `04_formeln.md` (rel. 1e-3) einzeln und über `derive()`, D²-/Inkubationsfit mit
  synthetischen Daten, Kantenfälle (F₀ ≤ F_th → 0; Division durch 0 → `undefined`, nie NaN), Parsing/Formatierung, NumberInput.
- Rechner-UI: Eingabeblöcke Puls/Strahl/Scan/Material mit Einheitenwahl, Ergebniskacheln mit „ⓘ Formel“ (KaTeX),
  Unterrechner Abschwächung für Zielfluenz, Optimum und Bearbeitungszeit direkt in der Seite, Kaustik-Plot (uPlot)
  mit Umschalter w(z) / F₀(z), ±z_R, Lage der Oberfläche und F_th-Linie. Warnungen: Lücke (OL < 0), unter Schwelle,
  Ziel nicht erreichbar (T > 1), T außerhalb 0–100 %.
- Rechner-Eingaben bleiben beim Tab-Wechsel und über Neustarts erhalten (IndexedDB, Einstellung `calculator`).
- Rechner wird per Code-Splitting nachgeladen; Offline-Cache enthält trotzdem alles.

## Stand 0.3 (umgesetzt)
- **Anlagen:** Liste → Anlage (Name, Standort, Beschreibung, Notizen) → Komponenten nach Typ gruppiert → Detail mit
  typisierten Feldern (Laserquelle: Wellenlängenliste, P_max, E_max, f_rep- und τ-Bereich, M², Rohstrahlradius, Burst;
  Optik: Art, Brennweite, Apertur, w₀ laut Datenblatt, Feld; Scanner: v_max, Feld, Apertur; Achsen; sonst Freitext).
  Datenblatt nur als Pfad/Text. „Als Standard-Anlage setzen“ (auch in den Einstellungen).
- **Material:** Suche + Klassenfilter → Werkstoff mit Kürzel (für Versuchs-ID), Klasse, Stoffdaten (Bandlücke, n, Dichte,
  Wärmeleitfähigkeit, Schmelz-/Erweichungstemperatur in °C oder K) → Literaturwerte (F_th, δ, S, sonstige; Citekey Pflicht;
  Bedingungen λ, τ, N, Methode) und Proben/Chargen.
- **Autosave** mit Anzeige „Speichert … / Gespeichert ✓“; ungültige Eingaben (z. B. leerer Name) werden nicht gespeichert.
  Beim Verlassen wird sofort gespeichert. Löschen ist weich (Tombstones), bei Anlage/Werkstoff mit allen Unterobjekten.
- **Laptop:** Liste und Detail nebeneinander (ab 900 px), am Handy nacheinander mit Zurück-Link.
- **Rechner-Vorlagen:** Anlage (Standard-Anlage vorgewählt) → Laser belegt λ, τ_min, M², w_L vor (bei mehreren Wellenlängen
  Auswahl als Chips); Optik belegt f vor (w₀ laut Datenblatt, wenn kein Rohstrahlradius bekannt); Scanner für v_max.
  Werkstoff: Literaturwerte mit Citekey per „Übernehmen“.
- **Grenzwertwarnungen** (gelb, `src/core/limits.ts`, getestet): P_avg > P_max, E_p > E_max, f_rep außerhalb des Bereichs,
  τ außerhalb des Bereichs, λ nicht im Datenblatt, v > v_max.

## Stand 0.4 (umgesetzt)
- **Versuchsreihen:** Liste mit Anzahl Versuche; Reihe mit Code (B1, B2 … vorgeschlagen, eindeutig), Titel, Ziel, Status, Notizen.
- **Versuche:** Versuchs-ID automatisch `<Reihe>-<Kürzel>-<Nr>`, Datum, Status (geplant/durchgeführt/verworfen), Anlage →
  Laser/Optik/Scanner, Werkstoff → Probe, alle Parameter aus dem Datenmodell mit Einheitenwahl, Burst, w₀ mit Quelle
  („w₀ berechnen“ aus Optik + Rohstrahl, „w₀ laut Datenblatt“), Bemerkung, Tags.
- **Abgeleitete Werte** live (E_p/P_avg am Werkstück, F₀, F₀(z), I₀, z_R, Δx, OL, N_1D, N_2D, OL_h) und bei jedem Speichern
  als Snapshot mit `formelVersion` (`src/core/logbook.ts`, getestet).
- **Duplizieren** (im Versuch und „Duplizieren aus <letzter Versuch>“ in der Reihe): gleiche Parameter, Anlage, Probe, Tags;
  neue laufende Nummer, heutiges Datum, leere Bemerkung.
- **Grenzwertwarnungen** wie im Rechner; Warnung, wenn P_avg und E_p beide eingetragen sind und nicht zu f_rep passen.
- **Alle Versuche:** Volltextsuche (ID, Bemerkung, Tags, Strategie, Atmosphäre, Absaugung) und Filter (Reihe, Werkstoff,
  Anlage, Tag, Status, Zeitraum); Liste mit ID, Datum, Werkstoff, Kernparametern und F₀.

## Stand 0.5 (umgesetzt)
- **Kern** `src/core/exchange/` (getestet): zod-Schemas aller Entitäten (`schema.ts`), JSON-Export mit Kopf
  (`app`, `schemaVersion`, `formelVersion`, `exportedAt`, Gerät) inkl. Tombstones (`exportJson.ts`), CSV der Versuche mit den
  Spalten aus `05_export-sync.md` (`exportCsv.ts`), Merge-Planung nach den Regeln 1–6 (`importMerge.ts`).
- **Import:** Datei wählen → Vorschau (neu / aktualisiert / gelöscht / hier neuer, Konflikte, ungültige Datensätze) →
  „Übernehmen“ schreibt alles in einer Transaktion. Fehlerhafte Dateien ergeben eine Meldung, keinen Absturz; ungültige
  Einzeldatensätze werden übersprungen und aufgelistet. Dateien aus neuerer Schema-Version werden abgelehnt.
- **Export:** iPhone/Android über das Teilen-Menü („In Dateien sichern“ → Sync-Ordner), am Laptop als Download.
  Dateiname `JJJJMMTT_ukp-labor_<gerät>.json` bzw. `.csv`.
- **Hauptlogbuch (Chrome/Edge am Laptop):** Ordner im Sync-Ordner wählen (wird gemerkt); „Abgleichen & speichern“ liest
  `logbuch.json`, zeigt die Vorschau, übernimmt und schreibt `logbuch.json` + `logbuch.csv` zurück. Gibt es noch keine
  Datei, wird sie angelegt.
- **Backup-Erinnerung:** Hinweis oben auf jeder Seite, wenn eigene Daten existieren und der letzte Export > 7 Tage her ist.
- **Daten zurücksetzen** in den Einstellungen (doppelte Bestätigung, Startbibliothek wird neu angelegt).
- Getestet: Rundreise Export → Reset → Import ergibt identische Daten; zwei Geräte konvergieren; Hauptlogbuch mit
  nachgebautem Ordner; im Browser zwei getrennte Profile (Laptop/iPhone) mit Konflikt.

## Stand 0.6 (umgesetzt)
- **Matrix-Generator** (Reihe → „Matrix erzeugen …“, `src/core/matrix.ts`, getestet): Vorlage aus der Reihe (oder leer),
  1–3 Achsen aus E_p, P_avg, T, f_rep, N, Überfahrten, v, Δx, h, Fokuslage, τ. Werte als Liste oder per Bereich
  (von/bis/Anzahl, linear oder logarithmisch). Vorschau mit IDs, Achsenwerten und F₀; „N Versuche anlegen“ schreibt alle
  in einer Transaktion. Erste Achse = äußere Schleife (B1-Si-002: E_p₁/N₁, -003: E_p₁/N₂ …).
- **„In Versuch übernehmen“** im Rechner: Reihe wählen, Ziel „Neuer Versuch (geplant)“ oder bestehender Versuch.
  Übernimmt λ, τ, Leistung bzw. E_p (wie eingegeben), f_rep, T, M², w₀ mit Quelle, Fokuslage, v, h, N sowie Anlage,
  Komponenten und Werkstoff der Vorlagen.
- **„Aus Rechner“** in der Reihe: neuer Versuch aus dem zuletzt im Rechner eingestellten Stand.

## Stand 0.7 (umgesetzt)
- **Notizen-Reiter:** „+ Tagebuch“ (Datum heute, Titel optional) und „+ Notiz“; Liste mit Ansicht Alle/Tagebuch/Notizen,
  Volltextsuche und Tag-Filter, neueste zuerst (Tagebuch mit Wochentag).
- **Editor** mit Autosave: Art, Titel, Datum, Tags, Inhalt in Markdown; Umschalter Bearbeiten/Vorschau am Handy,
  ab 1200 px Editor und Vorschau nebeneinander. „Verweis einfügen“ setzt `[[ID]]` an der Cursorposition.
- **Markdown** (`src/core/markdown.ts`, eigener Parser, getestet): Überschriften, Absätze, Listen, Aufgaben `- [ ]`,
  Zitat, Code, Linie, fett/kursiv, Links (nur http/https/mailto), Formeln `$…$` und `$$…$$` (KaTeX),
  Verweise `[[B1-Si-001]]` (Versuch) bzw. `[[B1]]` (Reihe); unbekannte Verweise gelb markiert.
- **Verlinkung:** Verweise werden beim Speichern in `links` abgelegt. Versuch und Reihe zeigen „Notizen“ mit allen
  Notizen, die auf sie verweisen, und „+ Notiz zu …“ (legt Tagebucheintrag mit Verweis an).
- **Formelsammlung** (Notizen → Formelsammlung) aus `formulaCatalog.ts`, dieselben LaTeX-Ausdrücke wie im Rechner;
  Test prüft, dass jede Formel fehlerfrei mit KaTeX gerendert wird.

## Stand 0.8 (umgesetzt)
- **Rechner mit Unterseiten:** Parameter · D²-Fit · Inkubation (`/rechner`, `/rechner/d2`, `/rechner/inkubation`).
- **D²-Fit (Liu):** Wertepaare (E_p, D) als Text, eine Zeile pro Krater, getrennt durch Tab, „;“ oder Leerzeichen (direkt
  aus Excel einfügbar, Kopfzeile wird übersprungen, Einheiten wählbar). Ergebnis w₀, E_th, F_th, R², Anzahl Punkte;
  Plot D² gegen ln E_p mit Ausgleichsgerade bis zur Schwelle. Punkte mit D = 0 werden ausgeschlossen und gezählt.
  „w₀ in Rechner“ (Quelle „D²-gemessen“, gelangt so auch in Versuche), „F_th in Rechner“, „Als Literaturwert speichern“.
- **Inkubationsfit:** Paare (N, F_th) → F_th(1), S, R²; Plot ln F_th gegen ln N; Übernahme in den Rechner und Speichern
  von F_th(1) (N = 1) und S als Literaturwerte.
- Eingaben der Fits bleiben beim Tab-Wechsel und über Neustarts erhalten; „Beispieldaten“ erzeugt Krater aus den
  Referenzwerten (w₀ = 13,114 µm, F_th = 0,2 J/cm² bzw. S = 0,8) zum Ausprobieren.
- Einlesen der Wertepaare und Plotdaten in `src/core/pairs.ts` (getestet).

**Alle geplanten Versionen 0.1–0.8 sind umgesetzt.** Offen sind die Punkte unter „später“.

## Abschluss Cloud-Entwicklung (2026-11-16)
- Cloud-Branch `claude/inspiring-heisenberg-kahtk9` in `main` des privaten Repos übernommen; lokal geprüft
  (Lint sauber, 165 Tests grün, Build ok).
- Tag `v0.8.0` in beiden Repos nachgetragen; README beider Repos auf Stand 0.8 gebracht.
- Release-Ablauf dokumentiert in `docs/08_release.md`.

## Stand 0.9 (umgesetzt)
- **Burst im Rechenkern** (`src/core/physics/burst.ts`, `derive.ts`): ab n ≥ 2 gelten E_p/P_avg pro Burst; neue Werte
  `nBurst`, `ePulsSub`, `dtSub`, `tBurst`, `F0Sub`, `F0zSub`. P_pk und I₀ beziehen sich auf den Sub-Puls, Abtrag pro Burst
  (D, z, V, V̇/P mit F₀,sub), E_p,opt wird zur optimalen Burst-Energie. `FORMEL_VERSION` = 1.1; ohne Burst identisch zu 1.0
  (Test). Referenzwerte in `04_formeln.md`, Tests in `burst.test.ts`.
- **Rechner → Burst** (`/rechner/burst`): n und f_burst, Übersicht der übernommenen Werte, Kacheln Zeit/Energie, Fluenz,
  Abtrag pro Burst; Vergleichstabelle n = 1 … 10 bei gleicher Burst-Energie (★ = höchstes V̇/P). Warnungen: n nicht
  ganzzahlig, Δt < 10 τ, Burst länger als 1/f_rep. Die Parameter-Seite zeigt bei aktivem Burst einen Hinweis und
  beschriftet Kacheln entsprechend.
- **Logbuch:** Burst fließt in abgeleitete Werte und Snapshot ein (E_sub, F₀,sub, Δt, t_burst); „In Versuch übernehmen“
  überträgt n und f_burst (Burst-Info des Versuchs bleibt). CSV mit `burstN`, `fBurst_MHz`, `F0Sub_J_cm2`.
- **Druckansicht** (`src/features/print/`): „Drucken“ im Versuch und in der Reihe → `#/druck/v/<id>` bzw. `#/druck/r/<id>`,
  eigene Route ohne Navigation, Papier immer hell. Versuch: Kopfdaten, Parameter, Snapshot mit Formelversion, Bemerkung.
  Reihe: Tabelle (ID, Datum, Status, Werkstoff, λ, τ, E_p/P, f_rep, n, v, h, N, F₀, Bemerkung), im Druck 7 pt und
  A4 quer (named page, Chrome/Edge). Zeilenlogik getestet (`printRows.test.ts`).
- **Android:** eigenes maskable-Icon (Motiv in der sicheren Zone), Checkliste in `docs/09_android-check.md`.
- „Aus Rechner“ in der Reihe nutzt jetzt dieselbe Eingabefunktion wie der Rechner (`calcDeriveInput`).

## Stand 0.10 (umgesetzt 2026-11-19)
- **Datenschema 2** (Dexie-Version 2, Export `schemaVersion: 2`). Migration als reine Funktion
  (`src/core/exchange/migrate.ts`), genutzt von der Datenbank-Migration **und** beim Import älterer Dateien: Laser-Wellenlängen
  `number[]` → `[{ id: 'w1', lambda }, …]`. IDs deterministisch, `updatedAt` bleibt unverändert, damit alle Geräte denselben
  Stand erzeugen und der Abgleich nicht anschlägt. Tests: `migrate.test.ts`, `migration.test.ts` (echte v1-Datenbank).
- **Laserquelle:** Wellenlängen als Liste (Grundwelle, Harmonische) mit eigener max. Leistung, Pulsenergie und M²; Werte der
  Laserquelle gelten, wo die Wellenlänge keinen eigenen hat (Grenzwertwarnung und Vorbelegung im Rechner/Logbuch je λ).
- **Neuer Komponententyp „Bearbeitungsstation“** (Scanner | Schneidkopf | feste Optik): zugeordnete Laserquellen,
  Brennweite, Objektiv (Text), Feldgröße, Strahlengänge (Laser + Wellenlänge bzw. Spektralbereich, Status, w₀, Notiz).
- **Status** für jede Komponente und jeden Strahlengang: betriebsbereit · nicht aufgebaut · Justage nötig · unbekannt
  (fehlend = unbekannt). Anzeige als Plakette mit Symbol (✓ ✕ ⚙ ?) und Text.
- **Belege:** Jeder Zahlenwert kann als „unbestätigt“ markiert werden (⚠︎ im Feldnamen) und hat eine optionale Quelle;
  bearbeitbar über „Belege bearbeiten“, sonst als Hinweis unter dem Feld.
- **Anlagenansicht:** Übersicht Stationen × Spektralbereich (IR/VIS/UV, „λ ?“ für offene Zuordnung) mit Status je Strahlengang;
  passt ohne seitliches Scrollen auf 375 px.
- **Importdatei `daten/anlagen-import.json`** (nur privates Repo): WSMH, MM200, GFH Evo, GFH GL.compact II, ACSYS Multishift;
  Werte aus `daten/datenblaetter/` mit Quelle (Datei, Seite). Test `anlagenImport.test.ts` prüft Gültigkeit, Quelle je
  Zahlenwert, Verweise und idempotenten Import (wird übersprungen, wenn die Datei fehlt).

## Stand 0.11 (umgesetzt 2026-11-23, abgenommen und veröffentlicht 2026-11-23)
- **Namenskonvention der Promotion:** Die App ist die einzige Quelle für Versuchs- und Proben-IDs; IDs werden nie geändert und
  nie wiederverwendet. `logbuch.csv` ist die Versuchsliste.
- **Versuchs-ID `<Reihe>-<Art>-<NNN>`** (z. B. `K-SPOT-001`, `V0-ABL-001`) statt `<Reihe>-<Werkstoff>-<NNN>`; fortlaufend je
  Präfix, gelöschte und verworfene Versuche zählen mit, Fallback `X` entfernt. Bestehende IDs bleiben.
- **Versuchsarten** (`versuchsarten`, synchronisiert): Seed SPOT, PWR, THR, ABL, CUT mit festen UUIDs (`5e3d0002-…`), auch in
  bestehenden Datenbanken angelegt. Verwaltung unter Logbuch → „Arten“. Reihe mit `standardVersuchsartId`; ohne sie fragt die
  App vor dem Anlegen. Duplizieren und Matrix übernehmen die Art der Vorlage.
- **ID-Schutz:** Versuchs-ID nur lesbar, ändert sich nie automatisch; Hinweis bei Abweichung von Reihe/Art. „ID neu vergeben“
  nur per Knopf mit Bestätigung, solange `idFixiert` nicht gesetzt ist.
- **Proben-ID `<Kürzel>-<NNN>`** beim Anlegen, danach nie geändert; `bezeichnung` optional; Anzeige `FS-001 · …`.
  Versuch mit `probenFeld`.
- **w₀-Herkunft:** Quelle „gemessen“ und `params.w0Beleg` (Versuchs-ID der Spotmessung, Vorschläge aus SPOT-Versuchen).
- **Station und Strahlengang im Versuch** (`stationId`, `strahlengangId`): Auswahl nach Anlage, belegt Laser, λ, τ, M², w₀ vor,
  wenn leer.
- **Datenschema 3:** Dexie-Version 3 (Tabelle `versuchsarten`, Indizes `experiments.versuchsartId`, `samples.probenId`),
  Migration 2 → 3 in Datenbank und Datei (`upgradeData`), Merge-Konflikte bei `probenId` (`-K1`) und Kürzel (`K1`).
- **CSV:** neue Spalten `art`, `probenFeld`, `station`, `w0Beleg`; `probe` = Proben-ID. Druckansicht mit Art, Station, Probe.
- **Ablageort:** `Claude Promotion/04_Versuche/logbuch/` (Hauptlogbuch), Geräte-Exporte in `_eingang/`.
- Tests: `ids.test.ts`, `migrate.test.ts` (Datei 2 → 3), `migration.test.ts` (Datenbank 2 → 3), `exchange.test.ts`
  (Konflikte, `idFixiert`, CSV), `actions.test.ts` (Nummerierung mit Tombstones, Proben-IDs, Fixierung).

## Plan 0.9 (festgelegt 2026-11-16)
- **Druckansicht:** „Drucken“ im Versuch (Kopfdaten, alle Parameter, abgeleitete Werte aus dem Snapshot mit Formelversion,
  Bemerkung, Tags) und in der Reihe (kompakte Tabelle: ID, Datum, Kernparameter, F₀, Status). Helles Layout per
  `@media print`, Navigation ausgeblendet; iPhone über Teilen → Drucken/PDF.
- **Burst-Rechner** (`/rechner/burst`): E_sub = E_burst/n (gleichmäßige Aufteilung als gekennzeichnete Annahme),
  Δt = 1/f_burst, Burst-Dauer (n−1)·Δt, F₀ pro Sub-Puls und pro Burst, Optimum je Sub-Puls F₀,sub = e²F_th → optimale
  Burst-Energie. Formeln + Referenzwerte in `04_formeln.md`, Tests.
- **Bedeutung von E_p/P_avg bei Burst:** Energie **pro Burst** (E_p = P_avg/f_rep); Sub-Puls = E_p/n.
- **Snapshot:** Burst fließt in die abgeleiteten Werte ein → `FORMEL_VERSION` 1.0 → 1.1. Alte Snapshots bleiben unverändert.
- **Android-Check:** Emulation in Chrome (Installieren, Zahlenfelder, Export/Teilen, Layout) + Checkliste fürs echte Gerät.

## Plan 0.12
- Kenngrößen ohne Modellannahme: Pulsperiode, thermische Diffusionslänge während τ und zwischen Pulsen, Vergleich mit w₀/Δx.
- Werkstofffeld c_p (mit Quelle), κ = λ/(ρ·c_p) berechnet.
- Akkumulationsmodell (z. B. Weber et al. 2014, Bauer et al. 2015) nur nach Bestätigung der Formel aus der Primärquelle;
  Konvention der Diffusionslänge (√(κτ) vs. 2√(κτ)) dabei festlegen.

## Entscheidungen
- **`idFixiert` statt `createdAt > lastExportAt`** (0.11): `lastExportAt` gilt nur für ein Gerät, und die Uhren der Geräte gehen
  verschieden. Das Feld wird beim Export/Hauptlogbuch-Speichern und beim Import gesetzt, ohne `updatedAt` zu ändern (kein
  Merge-Effekt). Nach einem abgebrochenen Teilen-Dialog wird nicht fixiert.
- **Versuchs-ID nicht mehr frei editierbar** (0.11): nur „ID neu vergeben“ (nächste freie Nummer, Bestätigung). Die alte Nummer
  wird nicht wieder vergeben, weil die Nummerierung auch gelöschte und nicht mehr vorhandene IDs berücksichtigt.
- **Kürzel-Konflikt beim Import → `K1` ohne Bindestrich** (0.11): Der Bindestrich trennt die Teile der Versuchs-ID. Kommt nur
  vor, wenn dasselbe eigene Kürzel offline auf zwei Geräten angelegt wird (Seed-Arten haben feste UUIDs).
- **Gleichzeitiges Anlegen auf zwei Geräten** (bekannte Grenze): Ohne Server können zwei Geräte offline dieselbe nächste
  Nummer vergeben; beim Import wird die zweite zu `…-K1` und im Bericht gemeldet.
- **Duplizieren übernimmt das Probenfeld nicht** (0.11): Jeder Versuch liegt auf einem eigenen Feld.
- **Belege als Feldmap statt Wert-Objekte** (`belege: { pMax: { unbestaetigt, quelle } }` neben den Zahlen): Rechenkern,
  Rechner und Grenzwerte lesen weiter einfache Zahlen; nur die Anlagen-UI kennt die Belege.
- **Spektralbereich aus λ:** UV < 400 nm ≤ VIS < 780 nm ≤ IR. Strahlengänge ohne bekannte Wellenlänge können einen Bereich
  direkt tragen; ganz ohne Angabe erscheinen sie in der Spalte „λ ?“.
- **Strahlengang verweist auf die Wellenlänge per ID** (stabil innerhalb der Laserquelle), nicht per Zahlenwert, damit eine
  Korrektur von λ (z. B. 342 → 343 nm) die Zuordnung nicht bricht.
- **Grenzangaben aus Datenblättern** („≥ 6 W“, „< 290 fs“, „M² ≤ 1,2“) werden als Zahl gespeichert, die Art der Angabe und
  ggf. Messwerte stehen in der Quelle.
- **Importdatei mit Zeitstempel 00:00 UTC des Erstellungstags:** Änderungen in der App sind danach immer neuer und werden
  bei erneutem Import nicht überschrieben (last-writer-wins). UUIDs der Importdatei sind deterministisch (aus festen
  Schlüsseln), ein Neuerzeugen ändert sie nicht.
- **Paketversionen:** TypeScript bleibt auf 6.0.x, weil typescript-eslint TypeScript 7 noch nicht unterstützt.
- **Pages-Workflow nur im öffentlichen Repo:** `pages.yml` liegt auch im privaten Repo (damit der Code-Stand identisch ist),
  der Job läuft aber nur, wenn `github.repository == 'additiv3/UKP-Labor'`. Auslöser: Push auf `main` oder manuell (Tags nicht: die Umgebung `github-pages` erlaubt nur `main`).
  `base` in `vite.config.ts` ist `/UKP-Labor/`.
- **Seed-Werkstoffe mit festen UUIDs** (`5e3d0001-…`) und `updatedAt = 2026-01-01`: So entstehen beim Import-Merge
  zwischen Geräten keine Duplikate, und jede Nutzeränderung gewinnt per last-writer-wins. Kürzel: Si, FS, BSG, Sap, Cu,
  Al2O3, AlN, SiC, GaN, PI, EMC, GlasSub (in der App änderbar). Saphir ist der Klasse „Keramik“ zugeordnet (einkristallines Oxid).
- **Seed nur beim Anlegen der Datenbank** (`db.on('populate')`). Gelöschte Seed-Werkstoffe kommen nicht wieder.
- **`versuchsId` ohne Unique-Index:** Die Eindeutigkeit prüft das Repository bzw. der Import (Konflikt-Suffix `-K1`),
  damit ein Merge nicht mitten in der Transaktion abbricht.
- **Geräte-ID** wird beim ersten Start in `settings` angelegt (UUID); der Gerätename ist in den Einstellungen frei wählbar.
- **Einstellungen-Tabelle** `settings` (Key-Value, Primärschlüssel `key`), nicht Teil des Exports.
- **npm audit:** Die gemeldeten Lücken (deepmerge/glob) stecken nur in `workbox-build` (Build-Zeit, über vite-plugin-pwa),
  nicht im ausgelieferten Code. Kein Downgrade.
- **Abschwächung T bezieht sich auf Quelle → Werkstück:** Eingegebene Leistung bzw. Pulsenergie gelten an der Quelle,
  alle Fluenz-/Abtragswerte rechnen mit E_p · T (leer = 100 %). Wird E_p eingegeben, hat sie Vorrang vor P_avg.
- **Defokus:** Liegt die Fokuslage z ≠ 0, rechnen Scan- und Abtragswerte (OL, N, D, z_abl, V_p, V̇/P, E_p,opt) mit dem
  Strahlradius w(z) und der Fluenz F₀(z) auf der Oberfläche; F₀ und w₀ werden zusätzlich für den Fokus angezeigt.
  Bei z = 0 entspricht das exakt den Formeln aus `04_formeln.md`.
- **Inkubation im Rechner:** Sind S und N angegeben, wird F_th(N) als effektive Schwelle für Abtrag und Optimum genutzt.
- **Kaustik-Plot:** Umschalter statt zweiter Achse (lesbarer auf dem Handy). x-Achse = z relativ zum Fokus;
  bei Fokuslage +a (Fokus über der Oberfläche) liegt die Oberfläche bei −a.
- **Rechner-Unterseiten:** Abschwächung, Optimum und Bearbeitungszeit sind Abschnitte der Rechnerseite statt eigener
  Seiten (weniger Navigation am Handy). D²-Fit und Inkubationsfit bekommen in 0.8 eigene Abschnitte.
- **Zahlenfelder:** `type="text"` mit `inputMode="decimal"`, damit Komma und Punkt funktionieren. Felder mit negativen Werten
  haben eine ±-Taste, weil die iOS-Zifferntastatur kein Minus hat.
- **Offline-Cache:** Nur `woff2`-Schriften (KaTeX) werden vorab gecacht, das reicht für alle Zielbrowser.
- **Literaturwerte in SI:** `wert` wird für F_th, δ und S in SI gespeichert, `einheit` ist nur die Anzeigeeinheit
  (z. B. „J/cm²“, „nm“). Bei „sonstig“ gilt der Wert unverändert in der frei eingegebenen Einheit.
- **Citekey-Prüfung:** Pflicht, ohne Leerzeichen, Komma, geschweifte Klammern, `%`, `#`. Neue Literaturwerte werden erst mit
  „Speichern“ angelegt (nicht per Autosave), damit keine Datensätze ohne Citekey entstehen.
- **Optik-Brennweite optional:** Im Datenmodell ist `brennweite` jetzt optional, weil eine neue Optik zunächst leer angelegt
  wird. Keine Schemaänderung der Datenbank nötig (kein Index betroffen), daher kein Versionssprung.
- **Grenzwerte gelten an der Quelle**, also vor der Abschwächung T. Ohne gewählte Komponente gibt es keine Warnungen.
- **Temperatur intern in K**, Eingabe wahlweise in °C (Einheiten mit Nullpunktverschiebung in `units.ts`).
- **Kürzel** dürfen keine Leerzeichen und keinen Bindestrich enthalten (Bindestrich trennt die Teile der Versuchs-ID).
- **Neuer Versuch:** Status „durchgeführt“ (Logbuch hält fest, was eingestellt war); Werkstoff, Probe und Anlage vom zuletzt
  bearbeiteten Versuch der Reihe, sonst Standard-Anlage. Ohne Werkstoff lautet das Kürzel „X“ (B1-X-001); nach Wahl des
  Werkstoffs bietet die App „ID neu vergeben“ an. IDs werden nie automatisch umbenannt.
- **Eindeutige Versuchs-ID:** Eine doppelte ID wird nicht gespeichert (Hinweis am Feld). Laufende Nummern gelöschter Versuche
  werden nicht neu vergeben.
- **Snapshot** enthält nur Werte aus den Versuchsparametern (keine Materialwerte wie Kraterdurchmesser), damit er nicht von
  später geänderten Literaturwerten abhängt.
- **Reihen-Code** ohne Leerzeichen und Bindestrich, eindeutig; eine Änderung betrifft nur neue Versuchs-IDs.
- **Reihenansicht:** Versuche stehen oben, die Stammdaten der Reihe darunter (am Handy ist die Versuchsliste das Ziel).
- **Release-Tags** können aus der Cloud-Sitzung nicht gepusht werden (Git-Proxy lehnt Tags ab); Tags bei Bedarf auf GitHub anlegen.
- **Konflikt-Umbenennung bekommt einen neuen Zeitstempel:** Der importierte Versuch mit `-K1` erhält `updatedAt = jetzt`,
  damit die Umbenennung beim nächsten Abgleich auf alle Geräte gelangt und die Geräte denselben Stand haben.
- **Doppelte Reihen-Codes** (z. B. „B1“ auf zwei Geräten unabhängig angelegt) werden in der Vorschau gemeldet, aber nicht
  automatisch umbenannt; die Reihe wird im Logbuch umbenannt, Versuchs-IDs bleiben.
- **Ungültige Datensätze** werden einzeln übersprungen statt die ganze Datei abzulehnen (Bericht in der Vorschau).
  Unbekannte Zusatzfelder bleiben erhalten (vorwärtskompatibel innerhalb einer Schema-Version).
- **CSV:** `pAvg_W`/`ePuls_uJ` = eingegebener Wert, sonst aus dem Snapshot abgeleitet; `pulsabstand_um` ebenso;
  `F0_J_cm2` = Spitzenfluenz im Fokus (Snapshot). Zeilenende CRLF für Excel, Felder mit `;`, `"` oder Zeilenumbruch in Anführungszeichen.
- **Tombstones werden nicht hart gelöscht** (Platzbedarf gering); so bleiben Löschungen über beliebig viele Geräte konsistent.
- **Hauptlogbuch nur per Abgleich:** Es gibt bewusst kein „nur speichern“, damit die Datei nie Änderungen anderer Geräte
  überschreibt.
- **Einstellungen werden nicht exportiert** (gerätespezifisch).
- **Matrix-Versuche** haben Status „geplant“, das gewählte Datum und den Tag „matrix“; Obergrenze 500 Versuche.
  E_p und P_avg dürfen nicht gleichzeitig variiert werden (über f_rep gekoppelt). Variiert E_p, entfällt die eingegebene
  Leistung der Vorlage (und umgekehrt); variiert v, entfällt ein fester Pulsabstand der Vorlage.
- **Übernahme in bestehenden Versuch** überschreibt nur Felder, die im Rechner angegeben sind (Bemerkung, Tags, Strategie
  bleiben). Die gekoppelte Größe (E_p bzw. P_avg) und ein fester Pulsabstand werden entfernt, damit nichts widersprüchlich
  bleibt. Vorher gibt es eine Rückfrage.
- **Materialwerte (F_th, δ, S)** gehen nicht in den Versuch (gehören zum Werkstoff, nicht zu den eingestellten Parametern).
- **w₀ aus dem Rechner:** „aus Optik“ → Quelle „berechnet“; „w₀ direkt“ → Quelle „Datenblatt“, wenn der Wert dem
  Datenblatt der gewählten Optik entspricht, sonst ohne Quelle.
- **Eigener Markdown-Parser statt Bibliothek:** kleiner Funktionsumfang für Labornotizen, keine zusätzliche Abhängigkeit,
  und es wird nie HTML aus dem Text übernommen (kein XSS möglich; `<script>` erscheint als Text, `javascript:`-Links
  bleiben Text). Einfacher Zeilenumbruch = Umbruch (praktisch für Notizen am Handy).
- **`$` als Formelzeichen** nur, wenn direkt danach kein Leerzeichen und nach dem schließenden `$` keine Ziffer steht
  (Geldbeträge wie „$5 und $10“ bleiben Text).
- **Verweise über die Versuchs-ID bzw. den Reihen-Code** (nicht die UUID), damit sie lesbar und tippbar sind. Wird eine
  Versuchs-ID später geändert, zeigt der alte Verweis „nicht gefunden“.
- **Wochentag/Datum** im Tagebuch statt Pflicht-Titel: Ein Tagebucheintrag braucht keinen Titel.
- **Fit-Eingabe als Text statt Tabelle:** Am Laptop direkt aus Excel einfügbar, am Handy schnell zeilenweise tippbar.
- **Literaturwert aus eigener Messung:** Citekey bleibt Pflicht (Vorschlag „eigen-<Reihe>“); Methode („D² (Liu)“ bzw.
  „Inkubationsfit“), w₀/E_th bzw. S, R² und n stehen in der Notiz; λ und τ werden aus dem Rechner übernommen.
- **Herkunft von w₀ im Rechner:** Nach „w₀ in Rechner“ merkt sich der Rechner die Quelle „d2“; eine manuelle Änderung von
  w₀ löscht sie wieder.
- **Warnungen:** D²-Fit mit weniger als 4 Punkten oder R² < 0,95; Inkubation mit S > 1,05 (Schwelle steigt mit N).
- **Burst-Zählung:** n wird gerundet; n < 2 bedeutet „kein Burst“, damit „1“ im Formular keine Burst-Werte erzeugt.
- **Inkubation bei Burst:** N bleibt die eingegebene Pulszahl; ob Sub-Pulse als Pulse zählen, entscheidet die Eingabe.
- **Druckansicht als eigene Route** statt nur `@media print`: auf dem iPhone druckt Safari die sichtbare Seite, so sieht
  man vorher genau, was aufs Papier kommt. Die Reihe druckt den gespeicherten Snapshot (Stand beim Speichern).
- **Snapshot-Werte bei Burst:** Alte Versuche mit Burst behalten ihren Snapshot 1.0, bis sie erneut gespeichert werden.
