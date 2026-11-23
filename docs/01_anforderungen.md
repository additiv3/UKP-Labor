# 01 — Anforderungen

## Kontext
- Nutzer: Doktorand, UKP-Laserablation harter/spröder Werkstoffe (Halbleiter, Glas, Keramik), Fokus Semiconductor Packaging.
- Anlage: Optec WS Multihead (WSMH) mit UKP-Quelle (Amphos 200, IR/VIS, 900 fs – 10 ps) und KrF-Excimer (Mlase, 248 nm),
  5-Achs, Galvo-Scanner und feste Optiken. **Diese Daten gehören NICHT in den Code**, der Nutzer legt sie in der App an.
- Messtechnik (nur als Geräte-Stammdaten): REM, Laser-Scanning-Mikroskop, Lichtmikroskope.
- Geräte: iPhone (Safari, Home-Bildschirm), zwei Windows-Laptops (Chrome/Edge), später evtl. Android.

## Module (Reiter)

### 1. Logbuch
- Versuchsreihen (z. B. „B1 Schwelle Si“) → Versuche (Einträge).
- Versuch erfassen: Versuchs-ID, Datum, Anlage, Laserquelle, Optik/Scanner, Probe, eingestellte Parameter
  (Wellenlänge, Pulsdauer, Leistung bzw. Pulsenergie, Repetitionsrate, Burst, Abschwächung, Fokuslage,
  Scangeschwindigkeit, Pulsabstand, Hatch, Pulszahl/Überfahrten, Scanstrategie, Atmosphäre/Absaugung),
  Strahlradius w0 **mit Quelle** (Datenblatt / berechnet / D²-gemessen), Bemerkung (Freitext), Tags, Status.
- Abgeleitete Werte (Fluenz, Überlapp, Pulse pro Spot …) werden automatisch berechnet und angezeigt;
  zusätzlich als Snapshot gespeichert (mit Formelversion), damit spätere Korrekturen nachvollziehbar sind.
- **Matrix-Generator:** Reihe aus Parametergitter erzeugen (z. B. Pulsenergie × Pulszahl), vergibt fortlaufende IDs.
- **Duplizieren** eines Versuchs als Vorlage (häufigster Arbeitsablauf im Labor).
- Versuchs-ID-Schema: `<Reihe>-<Art>-<lfd. Nr. 3-stellig>`, z. B. `K-SPOT-001`, `B1-ABL-004`. Lfd. Nr. automatisch je Reihe + Art;
  IDs werden nie geändert und nie wiederverwendet (ab 0.11). Proben-ID `<Werkstoffkürzel>-<NNN>`, z. B. `FS-001`.
- Liste mit Filter (Reihe, Material, Anlage, Tag, Zeitraum) und Volltextsuche.

### 2. Rechner
- Live-Berechnung aller Formeln aus `04_formeln.md`, Eingaben mit Einheitenwahl.
- Presets: Laserquelle + Optik aus „Anlagen“ wählen → Felder vorbelegt, Grenzwerte als Warnung (z. B. E_p > E_max).
- Kaustik-Plot w(z) mit markierter Rayleighlänge und Fluenz F(z) (zweite Achse oder Umschalter).
- Unterrechner: Fluenz ↔ Pulsenergie, Abschwächung für Zielfluenz, Pulsüberlapp/Hatch, Effizienzoptimum,
  Bearbeitungszeit Fläche.
- Auswertehilfe: D²-Fit (Liu) aus eingegebenen Wertepaaren (E_p, D) → w0, F_th; Inkubationsfit F_th(N) → S.
- Button „In Versuch übernehmen“ (neuer oder bestehender Versuch).
- Formeln in KaTeX einblendbar („ⓘ Formel“).

### 3. Anlagen
- Anlage → Komponenten. Komponententypen mit typisierten Feldern:
  Laserquelle, Optik (Objektiv/Linse), Scanner, Achsen, Strahlformung, Leistungsmesskopf, Messgerät, Sonstiges.
- Datenblatt-Verweis als Text (Pfad/Dateiname, keine Dateien in der App).
- Anlagen und Komponenten sind Presets für Rechner und Logbuch.

### 4. Material
- **Werkstoff** (Stoffdaten): Name, Klasse (Halbleiter/Glas/Keramik/Metall/Polymer/Verbund), Bandlücke, Brechungsindex,
  Dichte, Wärmeleitfähigkeit, Schmelz-/Erweichungstemperatur, Absorption bei λ, Notizen.
- **Literaturwerte** je Werkstoff: F_th, δ, S mit Bedingungen (λ, τ, N, Methode) und **Citekey (BibLaTeX) Pflicht**.
- **Probe/Charge**: Werkstoff, Lieferant, Charge, Dicke, Oberfläche/Orientierung, Lagerort, Notiz.
- Mitgelieferte Startbibliothek: nur Werkstoffnamen + Klasse (Si, Quarzglas, Borosilikatglas, Saphir, Cu, Al2O3-Keramik,
  AlN, SiC, GaN, Polyimid, Epoxid-Moldmasse (EMC), Glas-Substrat). **Keine Zahlenwerte ohne Quelle erfinden.**

### 5. Notizen
- Datierte Einträge (Tagebuch) und freie Notizen, Markdown + KaTeX, Tags, Verlinkung auf Versuche/Reihen
  (`[[B1-ABL-001]]`).
- Formelsammlung (statisch, aus `04_formeln.md` generiert) als Nachschlagewerk.

## Querschnitt
- Export/Import JSON (vollständig) + CSV (Versuche flach) — siehe `05_export-sync.md`.
- `navigator.storage.persist()` beim Start anfragen; Status in Einstellungen anzeigen.
- Backup-Erinnerung: Hinweis, wenn letzter Export > 7 Tage.
- Einstellungen: Gerätename, Standard-Anlage, Einheiten-Präferenzen, Dark/Light, Export/Import, Daten zurücksetzen.
- Dark Mode als Standard (Labor), große Touch-Ziele.

## Nicht-Ziele
Keine Messdatenablage, keine Bildergalerie, kein Login, keine Cloud-Synchronisation, keine Mehrbenutzerfähigkeit.
