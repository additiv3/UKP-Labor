# 07 — Roadmap

Status: ☐ offen · ◐ in Arbeit · ☑ fertig. Nach jedem Meilenstein aktualisieren.

| Version | Inhalt | Status |
|---|---|---|
| 0.1 | Projekt-Setup (Vite/React/TS, Lint, Vitest), PWA-Manifest + Service Worker, GitHub-Actions-Deployment, Navigation mit 5 leeren Reitern + Einstellungen, Dexie-Schema aller Entitäten, `persist()` | ☑ |
| 0.2 | Rechenkern komplett mit Tests (`04_formeln.md`), Rechner-UI ohne Presets, Kaustik-Plot | ☑ |
| 0.3 | Anlagen & Komponenten, Werkstoffe (Seed), Literaturwerte, Proben; Presets im Rechner + Grenzwertwarnungen | ☑ |
| 0.4 | Logbuch: Reihen, Versuche, Duplizieren, ID-Generator, abgeleitete Werte + Snapshot, Filter/Suche | ☑ |
| 0.5 | Export JSON/CSV, Import mit Merge-Vorschau, Backup-Erinnerung, Hauptlogbuch (File System Access) | ☑ |
| 0.6 | Matrix-Generator, „Aus Rechner übernehmen“ | ☐ |
| 0.7 | Notizen/Tagebuch mit Markdown/KaTeX, Verlinkung, Formelsammlung | ☐ |
| 0.8 | D²-Fit und Inkubationsfit im Rechner (Rechenkern + Tests bereits in 0.2) | ◐ |
| später | Android-Test, weitere Rechner (Wärmeakkumulation, Burst), Druckansicht Versuch | ☐ |

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

## Entscheidungen
- **Paketversionen:** TypeScript bleibt auf 6.0.x, weil typescript-eslint TypeScript 7 noch nicht unterstützt.
- **Pages-Workflow nur im öffentlichen Repo:** `pages.yml` liegt auch im privaten Repo (damit der Code-Stand identisch ist),
  der Job läuft aber nur, wenn `github.repository == 'additiv3/UKP-Labor'`. Auslöser: Push auf `main`, Tag `v*` oder manuell.
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
