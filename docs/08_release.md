# 08 — Release-Ablauf

Zwei Repos (siehe `CLAUDE.md`):
- `additiv3/UKP-Labor-privat` — Entwicklung, Quelle der Wahrheit. Gearbeitet wird auf `main` (oder Feature-Branch → Merge in `main`).
- `additiv3/UKP-Labor` — öffentliche Auslieferung. Ein Push auf `main` (oder manuell) startet `pages.yml`; Tags lösen kein Deployment aus, weil die Pages-Umgebung nur `main` zulässt → GitHub Pages.

## Schritte pro Release
1. Im privaten Repo: `npm run lint`, `npm test`, `npm run build` grün.
2. `package.json` → `version` erhöhen, `docs/07_roadmap.md` aktualisieren, committen.
3. `main` pushen und taggen: `git tag v0.X.0 && git push origin main v0.X.0`.
4. Öffentliches Repo auf denselben Code-Stand bringen (alle Dateien außer `README.md`, das dort einen eigenen Text hat,
   und **außer dem Ordner `daten/`** – Anlagen-Importdatei und Datenblätter bleiben privat),
   Commit „Release v0.X.0“ mit Verweis auf den privaten Commit, Tag `v0.X.0` setzen und pushen.
5. Prüfen: Actions-Lauf „Deploy GitHub Pages“ grün, https://additiv3.github.io/UKP-Labor/ lädt, in den Einstellungen
   steht die neue Version.
6. iPhone: App öffnen → Hinweis „Neue Version verfügbar“ → Aktualisieren. Der Service Worker (vite-plugin-pwa,
   `registerType: 'prompt'`) versioniert den Cache automatisch über Datei-Hashes; ein manuelles Hochzählen ist nicht nötig.

## Hinweise
- `daten/` (Anlagen-Importdatei, Datenblätter) gehört nur ins private Repo. Vor dem Push ins öffentliche Repo prüfen:
  `git ls-files daten` muss dort leer sein. Der Build nutzt `daten/` nicht (nur `src/` und `public/`).
- Aus Claude-Code-Cloud-Sitzungen lassen sich keine Tags pushen (Git-Proxy). Tags lokal oder auf GitHub setzen.
- Cloud-Sitzungen arbeiten auf einem Branch `claude/…`; nach Abschluss in `main` des privaten Repos übernehmen.

## Release-Historie
| Version | Datum | Privat (Commit) | Öffentlich |
|---|---|---|---|
| v0.8.0 | 2026-11-14 | `0a1d76a` | `f5ee8f1` (Tag nachgetragen 2026-11-16) |
| v0.9.0 | 2026-11-16 | siehe Tag | siehe Tag |
| v0.10.0 | 2026-11-19 | siehe Tag | siehe Tag |
| v0.11.0 | 2026-11-23 | siehe Tag | siehe Tag |
