# 02 — Architektur

## Schichten
```
UI (React-Komponenten, Screens)
  └─ Hooks (useLiveQuery von Dexie, Formular-Logik)
       └─ Repositories (src/data/repos/*)  ← einzige Stelle, die Dexie direkt anspricht
            └─ Dexie-DB (src/data/db.ts)
Rechenkern (src/core/physics/*)  ← reine Funktionen, keine Imports aus UI/Daten
Export/Import (src/core/exchange/*) ← Serialisierung, zod-Schemas, Merge
```
Repositories kapseln die Datenhaltung, damit später ein anderer Sync-Weg ergänzt werden kann, ohne die UI anzufassen.

## Ordnerstruktur
```
src/
├─ main.tsx, App.tsx, router.tsx
├─ core/
│  ├─ physics/      beam.ts, fluence.ts, scan.ts, ablation.ts, fit.ts, units.ts  (+ *.test.ts)
│  ├─ exchange/     schema.ts (zod), exportJson.ts, exportCsv.ts, importMerge.ts (+ Tests)
│  └─ ids.ts        Versuchs-ID-Generator, UUID
├─ data/
│  ├─ db.ts         Dexie-Schema + Migrationen
│  ├─ types.ts      Entitätstypen (aus 03_datenmodell.md)
│  ├─ seed.ts       Startbibliothek Werkstoffe (nur Namen/Klassen)
│  └─ repos/        experiments.ts, series.ts, systems.ts, components.ts, materials.ts, samples.ts, notes.ts
├─ features/
│  ├─ logbook/  calculator/  equipment/  materials/  notes/  settings/
├─ components/      Formularfelder (NumberInput mit Einheit), Listen, Dialoge, TabBar
└─ styles/
```

## Konventionen
- TypeScript strict, keine `any`.
- Physikalische Größen intern in SI (m, s, J, W, Hz, J/m²). Umrechnung nur in `units.ts` und in der UI.
- Zahleneingabe: `parseNumber("1,5") === 1.5`; leere Eingabe = `undefined`, nicht 0.
- Datumsfelder als ISO-String; Anzeige `TT.MM.JJJJ`; Dateinamen `JJJJMMTT`.
- Keine externen Requests zur Laufzeit (Schriften, CDNs lokal bündeln) → echtes Offline.
- Service Worker: `registerType: 'prompt'` mit Hinweis „Neue Version verfügbar“.
- PWA-Manifest: `display: standalone`, Icons 192/512 + apple-touch-icon.

## Deployment
- GitHub Actions Workflow: install → test → build → deploy to Pages.
- `vite.config.ts`: `base: '/<REPO-NAME>/'`.
- Pages-Quelle im Repo: Settings → Pages → Source: GitHub Actions.
