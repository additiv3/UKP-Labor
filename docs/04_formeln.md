# 04 — Formeln und Test-Referenzwerte

Annahmen: Gauß-Strahl (TEM00, ggf. mit M²), Gauß-förmiges Zeitprofil, τ = FWHM. Alle Größen in SI.
`formelVersion = "1.0"` (bei Änderung hochzählen, wird im Versuchs-Snapshot gespeichert).

## Puls und Leistung
| Größe | Formel |
|---|---|
| Pulsenergie | $E_p = P_{avg} / f_{rep}$ |
| Spitzenleistung (Gauß) | $P_{pk} = 2\sqrt{\ln 2/\pi}\; E_p/\tau \approx 0{,}9394\,E_p/\tau$ |
| Spitzenleistung (sech², optional) | $P_{pk} \approx 0{,}8814\,E_p/\tau$ |
| Abschwächung für Zielenergie | $T = E_{ziel}/E_{max}$ |

## Strahl und Kaustik
| Größe | Formel |
|---|---|
| Fokusradius (1/e²) | $w_0 = M^2 \lambda f / (\pi w_L)$, $w_L$ = Strahlradius an der Linse |
| Rayleighlänge | $z_R = \pi w_0^2 / (M^2 \lambda)$ |
| Kaustik | $w(z) = w_0\sqrt{1+(z/z_R)^2}$ |
| Schärfentiefe | $2 z_R$ |

## Fluenz und Intensität
| Größe | Formel |
|---|---|
| Spitzenfluenz | $F_0 = 2E_p/(\pi w_0^2)$ |
| Mittlere Fluenz | $\bar F = E_p/(\pi w_0^2) = F_0/2$ |
| Fluenz bei Defokus | $F_0(z) = 2E_p/(\pi w(z)^2)$ |
| Spitzenintensität | $I_0 = 2P_{pk}/(\pi w_0^2)$ |

UI-Anzeige von Fluenz in J/cm², Intensität in W/cm² (1 J/cm² = 10⁴ J/m²).

## Scannen
| Größe | Formel |
|---|---|
| Pulsabstand | $\Delta x = v/f_{rep}$ |
| Pulsüberlapp | $OL = 1 - \Delta x/(2w_0)$ (negativ = Lücke) |
| Pulse pro Spotdurchmesser (1D) | $N_{1D} = 2w_0/\Delta x$ |
| Pulse pro Fläche πw0² (2D) | $N_{2D} = \pi w_0^2/(\Delta x\, h)$ |
| Linienüberlapp | $OL_h = 1 - h/(2w_0)$ |
| Bearbeitungszeit Fläche | $t = N_{layer}\, A/(v\,h)$ (ohne Sprung-/Beschleunigungszeiten) |

## Ablation
| Größe | Formel |
|---|---|
| Kraterradius | $r_{abl} = w_0\sqrt{\tfrac12\ln(F_0/F_{th})}$, $D = 2r_{abl}$ (nur für $F_0 > F_{th}$) |
| Tiefe pro Puls (Zentrum) | $z_{abl} = \delta\ln(F_0/F_{th})$ |
| Volumen pro Puls | $V_p = \tfrac{\pi w_0^2\delta}{4}\ln^2(F_0/F_{th})$ |
| Spezifische Abtragsrate | $\dot V/P = \tfrac{\delta}{2F_0}\ln^2(F_0/F_{th})$ |
| Optimum (Gauß) | $F_{0,opt} = e^2 F_{th}$, $(\dot V/P)_{max} = 2\delta/(e^2 F_{th})$ |
| Inkubation | $F_{th}(N) = F_{th}(1)\,N^{S-1}$ |

Quelle Effizienzmodell: Neuenschwander et al., LiM 2013 / ICALEO 2010. Anzeige in mm³/(min·W).

## Auswertehilfen (Fit)
- **D²-Methode (Liu):** $D^2 = 2w_0^2\ln(E_p) - 2w_0^2\ln(E_{th})$. Lineare Regression $D^2$ gegen $\ln E_p$:
  Steigung $m = 2w_0^2 \Rightarrow w_0 = \sqrt{m/2}$; Nullstelle $\Rightarrow E_{th}$; $F_{th} = 2E_{th}/(\pi w_0^2)$.
  Ausgabe mit R² und Anzahl Punkte. Punkte mit D = 0 ausschließen.
- **Inkubation:** $\ln F_{th}(N) = \ln F_{th}(1) + (S-1)\ln N$ → lineare Regression.

## Test-Referenzwerte (Vitest, rel. Toleranz 1e-3)
Eingabe: $P=10$ W, $f_{rep}=200$ kHz, $\tau=900$ fs, $\lambda=1030$ nm, $M^2=1{,}2$, $f=100$ mm, $w_L=3$ mm,
$v=1$ m/s, $h=10$ µm, $F_{th}=0{,}2$ J/cm², $\delta=20$ nm.

| Ergebnis | Wert |
|---|---|
| $E_p$ | 50 µJ |
| $w_0$ | 13,114 µm |
| $z_R$ | 437,15 µm |
| $F_0$ | 18,508 J/cm² |
| $P_{pk}$ | 52,19 MW |
| $I_0$ | 1,9319·10¹³ W/cm² |
| $w(2z_R)$ | 29,325 µm |
| $F_0(2z_R)$ | 3,7016 J/cm² (= F_0/5) |
| $\Delta x$ | 5,0 µm |
| $OL$ | 0,80937 |
| $N_{1D}$ | 5,2457 |
| $N_{2D}$ | 10,806 |
| $D$ (Krater) | 39,464 µm |
| $z_{abl}$ | 90,553 nm |
| $V_p$ | 5,5380·10⁻¹⁷ m³ (55,38 µm³) |
| $\dot V/P$ | 0,066457 mm³/(min·W) |
| $F_{0,opt}$ | 1,4778 J/cm² |
| $(\dot V/P)_{max}$ | 0,16240 mm³/(min·W) |
| $E_{p,opt}$ | 3,9924 µJ → $T$ = 0,079848 |
| $F_{th}(N=100)$ bei $S=0{,}8$ | 0,079621 J/cm² |

Zusätzliche Tests: D²-Fit mit synthetischen Daten aus obigem $w_0$/$F_{th}$ muss beide Werte reproduzieren;
Kantenfälle ($F_0 \le F_{th}$ → Krater = 0, keine NaN; Division durch 0 → `undefined` + UI-Hinweis).
