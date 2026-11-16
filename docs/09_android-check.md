# 09 — Android-Check

Stand 0.9: in Chrome mit Android-Emulation (375 × 812, Android-Kennung, Touch) geprüft. Ein echtes Gerät fehlt noch;
die Liste unten dauert etwa 10 Minuten.

## Bereits geprüft (Emulation bzw. Code)
- Layout ohne horizontales Scrollen (Rechner, Burst, Logbuch, Druckansicht); breite Tabellen scrollen innerhalb ihrer Karte.
- Teilen-Menü: `shareOrDownload` erkennt Android an der Browserkennung und nutzt `navigator.share` mit Datei, sonst Download.
- Manifest unter `/UKP-Labor/`: `start_url`/`scope` korrekt, Icons 192/512 und **eigenes maskable-Icon**
  (`pwa-maskable-512x512.png`, Motiv liegt in der sicheren Zone, r = 0,4 · 512). Vorher war das normale Icon als
  maskable eingetragen; Android hätte die Spitzen der Kaustik abgeschnitten.
- Zurück-Geste: Navigation über HashRouter, jeder Schritt ist ein History-Eintrag.
- Zahlenfelder: `inputMode="decimal"`, Komma und Punkt werden akzeptiert, ±-Taste für negative Werte.

## Checkliste echtes Gerät (Chrome auf Android)
| # | Schritt | Erwartung | ✓ |
|---|---|---|---|
| 1 | https://additiv3.github.io/UKP-Labor/ öffnen | App lädt, dunkles Theme | ☐ |
| 2 | ⋮ → „App installieren“ bzw. „Zum Startbildschirm“ | Icon rund/abgerundet, Kaustik vollständig sichtbar | ☐ |
| 3 | App vom Startbildschirm öffnen | Vollbild ohne Adressleiste | ☐ |
| 4 | Rechner: λ = 1030, P = 10, f_rep = 200 kHz eingeben | Tastatur mit Komma; E_p = 50 µJ | ☐ |
| 5 | Fokuslage ±-Taste | negatives Vorzeichen setzbar | ☐ |
| 6 | Zurück-Geste mehrmals | geht seitenweise zurück, schließt die App erst am Anfang | ☐ |
| 7 | Einstellungen → Export JSON | Teilen-Menü erscheint („In Drive speichern“ / „Dateien“) | ☐ |
| 8 | Einstellungen → Import der eben exportierten Datei | Vorschau ohne Änderungen | ☐ |
| 9 | Versuch → Drucken → „Drucken / PDF“ | Druckdialog, PDF hell, ohne Navigation | ☐ |
| 10 | Flugmodus an, App neu öffnen | App startet offline, Daten da | ☐ |
| 11 | Einstellungen → Speicher | „dauerhaft“ nach Installation | ☐ |

Abweichungen bitte als Notiz mit Gerät/Android-Version festhalten.
