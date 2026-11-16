# 04 — Formeln und Test-Referenzwerte

Annahmen: Gauß-Strahl (TEM00, ggf. mit M²), Gauß-förmiges Zeitprofil, τ = FWHM. Alle Größen in SI.
`formelVersion = "1.1"` (bei Änderung hochzählen, wird im Versuchs-Snapshot gespeichert).
1.0 → 1.1 (v0.9): Burst-Modus. Ohne Burst (n < 2) sind alle Werte identisch zu 1.0.

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

## Burst (ab Formelversion 1.1)
n Sub-Pulse im Abstand $\Delta t = 1/f_{burst}$ bilden einen Burst; Bursts folgen mit $f_{rep}$.
**$E_p = P_{avg}/f_{rep}$ ist die Burst-Energie** $E_{burst}$ (so misst ein Leistungsmesskopf). Burst aktiv ab n ≥ 2 (gerundet).

Annahmen: Energie gleichmäßig auf die Sub-Pulse verteilt; Sub-Pulse zeitlich getrennt ($\Delta t \gg 	au$) und im
Abtrag unabhängig (keine Abschirmung durch Plasma/Partikel, keine Wärmeakkumulation). Ansatz: Abtragsmodell pro Sub-Puls,
wie im Burst-Modell nach Neuenschwander et al. — **Quelle prüfen und Citekey ergänzen (TODO: verifizieren).**

| Größe | Formel |
|---|---|
| Energie pro Sub-Puls | $E_{sub} = E_{burst}/n$ |
| Sub-Puls-Abstand | $\Delta t = 1/f_{burst}$ |
| Burst-Dauer | $t_{burst} = (n-1)/f_{burst}$ |
| Spitzenfluenz pro Sub-Puls | $F_{0,sub} = 2E_{sub}/(\pi w_0^2) = F_{0,burst}/n$ |
| Spitzenleistung, Intensität | mit $E_{sub}$ statt $E_p$ |
| Kraterdurchmesser | wie oben mit $F_{0,sub}$ |
| Tiefe pro Burst | $z_{burst} = n\,\delta\ln(F_{0,sub}/F_{th})$ |
| Volumen pro Burst | $V_{burst} = n\,	frac{\pi w_0^2\delta}{4}\ln^2(F_{0,sub}/F_{th})$ |
| Spezifische Abtragsrate | $\dot V/P = 	frac{\delta}{2F_{0,sub}}\ln^2(F_{0,sub}/F_{th})$ |
| Optimale Burst-Energie | $E_{burst,opt} = n\,e^2F_{th}\,\pi w_0^2/2$ (jeder Sub-Puls bei $F_{0,opt}$) |

Scan-Größen ($\Delta x$, $OL$, $N_{1D}$, $N_{2D}$) beziehen sich auf Bursts (Folgefrequenz $f_{rep}$). Bei Defokus gilt
wie oben $w(z)$ statt $w_0$.

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

### Burst-Referenzwerte (obige Eingabe + n = 4, $f_{burst}$ = 40 MHz)
| Ergebnis | Wert |
|---|---|
| $E_{sub}$ | 12,5 µJ |
| $\Delta t$ / $t_{burst}$ | 25 ns / 75 ns |
| $F_{0,sub}$ | 4,627 J/cm² (= $F_0$/4) |
| $P_{pk}$ (Sub-Puls) | 13,048 MW |
| $I_0$ (Sub-Puls) | 4,8297·10¹² W/cm² |
| $D$ | 32,872 µm |
| $z_{burst}$ | 251,31 nm |
| $V_{burst}$ | 106,64 µm³ |
| $\dot V/P$ | 0,12796 mm³/(min·W) |
| $E_{burst,opt}$ | 15,970 µJ → $T$ = 0,31939 |

Zusätzliche Tests: D²-Fit mit synthetischen Daten aus obigem $w_0$/$F_{th}$ muss beide Werte reproduzieren;
Kantenfälle ($F_0 \le F_{th}$ → Krater = 0, keine NaN; Division durch 0 → `undefined` + UI-Hinweis).
