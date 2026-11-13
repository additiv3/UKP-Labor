# 07 — Roadmap

Status: ☐ offen · ◐ in Arbeit · ☑ fertig. Nach jedem Meilenstein aktualisieren.

| Version | Inhalt | Status |
|---|---|---|
| 0.1 | Projekt-Setup (Vite/React/TS, Lint, Vitest), PWA-Manifest + Service Worker, GitHub-Actions-Deployment, Navigation mit 5 leeren Reitern + Einstellungen, Dexie-Schema aller Entitäten, `persist()` | ☑ |
| 0.2 | Rechenkern komplett mit Tests (`04_formeln.md`), Rechner-UI ohne Presets, Kaustik-Plot | ☑ |
| 0.3 | Anlagen & Komponenten, Werkstoffe (Seed), Literaturwerte, Proben; Presets im Rechner + Grenzwertwarnungen | ☑ |
| 0.4 | Logbuch: Reihen, Versuche, Duplizieren, ID-Generator, abgeleitete Werte + Snapshot, Filter/Suche | ☐ |
| 0.5 | Export JSON/CSV, Import mit Merge-Vorschau, Backup-Erinnerung, Hauptlogbuch (File System Access) | ☐ |
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
