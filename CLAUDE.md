# CLAUDE.md — UKP-Labor

Persönliche Labor-App (PWA) für eine Promotion zur UKP-Laserablation (AG alp, TH Aschaffenburg).
Ein Nutzer, mehrere Geräte (iPhone, zwei Windows-Laptops, später evtl. Android). Offline-first, kein Server.

## Zweck in einem Satz
Schnell erfassen, **welche Parameter bei welchem Versuch eingestellt waren** (Logbuch), Laserparameter
berechnen (Rechner inkl. Kaustik), Anlagen und Materialien nachschlagen, Notizen führen — und alles
als Datei exportieren, um es mit dem Hauptlogbuch am Laptop zusammenzuführen.

## Harte Regeln
1. **Keine Nutzerdaten im Repo, kein Backend, keine Cloud, keine Telemetrie.** Daten liegen nur in IndexedDB
   des jeweiligen Geräts und verlassen es nur per Export durch den Nutzer. Das Repo ist öffentlich.
2. **Keine Messergebnisse/Rohdaten in der App.** Nur eingestellte Parameter, abgeleitete Werte, kurze Bemerkungen
   und die Versuchs-ID als Verweis auf externe Dateien.
3. **Rechenkern = reine Funktionen in `src/core/physics/`, intern SI-Einheiten, vollständig getestet** (Vitest)
   gegen die Referenzwerte in `docs/04_formeln.md`. Keine Formel ohne Test.
4. **Jeder Datensatz:** `id` (UUID v4), `createdAt`, `updatedAt` (ISO 8601), `deleted` (Tombstone, nie hart löschen
   bis zum Export-Merge). Siehe `docs/03_datenmodell.md` und `docs/05_export-sync.md`.
5. **UI-Sprache Deutsch.** Zahleneingabe akzeptiert Komma und Punkt. Anzeige mit SI-Präfixen.
6. **Mobile-first**, aber am Laptop voll nutzbar. Funktioniert vollständig offline.
7. Bei Schemaänderungen: Dexie-Version hochzählen + Migration + `schemaVersion` im Export anpassen.
8. Kleine, überprüfbare Schritte. Vor größeren Änderungen kurz den Plan nennen.

## Stack
Vite · React · TypeScript (strict) · Dexie.js (IndexedDB) · React Router (HashRouter, wegen GitHub Pages) ·
zod (Validierung Import) · KaTeX (Formeln) · uPlot (Kaustik-Plot) · vite-plugin-pwa · Vitest.
Deployment: GitHub Actions → GitHub Pages (`base` in `vite.config.ts` = Repo-Name).

## Repos
- `additiv3/UKP-Labor-privat` (privat): Entwicklung, Quelle der Wahrheit. Hier wird gearbeitet.
- `additiv3/UKP-Labor` (öffentlich): Auslieferung über GitHub Pages. Wird nur bei einem Release aktualisiert:
  Code-Stand aus dem privaten Repo übernehmen, Version taggen, Pages-Workflow läuft dort.
- Beide Repos bei jedem Release auf denselben Stand bringen, damit das private Repo nicht veraltet.

## Dokumentation (vor der Arbeit lesen)
- `docs/01_anforderungen.md` — was die App können soll
- `docs/02_architektur.md` — Ordnerstruktur, Schichten, Konventionen
- `docs/03_datenmodell.md` — Entitäten und Felder
- `docs/04_formeln.md` — Formeln, Einheiten, Test-Referenzwerte
- `docs/05_export-sync.md` — Exportformat, Merge-Regeln, Dateinamen
- `docs/06_ui.md` — Navigation, Screens, Bedienung
- `docs/07_roadmap.md` — Versionen und aktueller Stand (nach jedem Meilenstein aktualisieren)
- `docs/08_release.md` — Release-Ablauf privat → öffentlich, Release-Historie
- `docs/09_android-check.md` — Android-Prüfung und Checkliste fürs echte Gerät

## Befehle (nach dem Setup)
- `npm run dev` · `npm run build` · `npm test` · `npm run lint`

## Definition of Done pro Schritt
Build grün, Tests grün, keine TS-Fehler, `docs/07_roadmap.md` aktualisiert, Version in `package.json` erhöht.
