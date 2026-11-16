/**
 * Formelsammlung (aus docs/04_formeln.md) für das Nachschlagewerk im Reiter „Notizen“.
 * Die LaTeX-Ausdrücke stammen aus FORMULAS, damit Rechner und Sammlung identisch sind.
 */
import { FORMULAS } from './formulas';

export interface CatalogEntry {
  name: string;
  tex: string;
  note?: string;
}
export interface CatalogGroup {
  title: string;
  intro?: string;
  entries: CatalogEntry[];
}

export const FORMULA_CATALOG: CatalogGroup[] = [
  {
    title: 'Annahmen',
    intro:
      'Gauß-Strahl (TEM00, ggf. mit M²), gaußförmiges Zeitprofil, τ = FWHM, Radien bei 1/e². Intern alle Größen in SI; Fluenz in J/cm² (1 J/cm² = 10⁴ J/m²), Intensität in W/cm².',
    entries: [],
  },
  {
    title: 'Puls und Leistung',
    entries: [
      { name: 'Pulsenergie', tex: FORMULAS.ePuls },
      { name: 'Spitzenleistung', tex: FORMULAS.pPk },
      { name: 'Abschwächung für Zielenergie', tex: FORMULAS.Topt },
    ],
  },
  {
    title: 'Strahl und Kaustik',
    entries: [
      { name: 'Fokusradius (1/e²)', tex: FORMULAS.w0, note: 'w_L = Strahlradius an der Linse' },
      { name: 'Rayleighlänge', tex: FORMULAS.zR },
      { name: 'Kaustik', tex: FORMULAS.wz },
      { name: 'Schärfentiefe', tex: FORMULAS.dof },
    ],
  },
  {
    title: 'Fluenz und Intensität',
    entries: [
      { name: 'Spitzenfluenz', tex: FORMULAS.F0 },
      { name: 'Mittlere Fluenz', tex: FORMULAS.Fmean },
      { name: 'Fluenz bei Defokus', tex: FORMULAS.F0z },
      { name: 'Spitzenintensität', tex: FORMULAS.I0 },
    ],
  },
  {
    title: 'Scannen',
    entries: [
      { name: 'Pulsabstand', tex: FORMULAS.dx },
      { name: 'Pulsüberlapp', tex: FORMULAS.OL, note: 'negativ = Lücke' },
      { name: 'Pulse pro Spotdurchmesser (1D)', tex: FORMULAS.N1D },
      { name: 'Pulse pro Fläche πw₀² (2D)', tex: FORMULAS.N2D },
      { name: 'Linienüberlapp', tex: FORMULAS.OLh },
      { name: 'Bearbeitungszeit Fläche', tex: FORMULAS.tFlaeche, note: 'ohne Sprung- und Beschleunigungszeiten' },
    ],
  },
  {
    title: 'Ablation',
    intro: 'Effizienzmodell nach Neuenschwander et al. (LiM 2013, ICALEO 2010). Nur für F₀ > F_th.',
    entries: [
      { name: 'Kraterdurchmesser', tex: FORMULAS.D },
      { name: 'Tiefe pro Puls (Zentrum)', tex: FORMULAS.zAbl },
      { name: 'Volumen pro Puls', tex: FORMULAS.Vp },
      { name: 'Spezifische Abtragsrate', tex: FORMULAS.VdotP },
      { name: 'Optimum (Gauß)', tex: `${FORMULAS.F0opt},\\quad ${FORMULAS.VdotPmax}` },
      { name: 'Inkubation', tex: FORMULAS.fthEff },
    ],
  },
  {
    title: 'Burst',
    intro:
      'n Sub-Pulse im Abstand 1/f_burst, Bursts mit f_rep. E_p und P_avg gelten pro Burst. Annahmen: Energie gleichmäßig verteilt, Sub-Pulse zeitlich getrennt und im Abtrag unabhängig (keine Abschirmung, keine Wärmeakkumulation). Ansatz nach Neuenschwander et al. (Quelle prüfen).',
    entries: [
      { name: 'Energie pro Sub-Puls', tex: FORMULAS.eSub },
      { name: 'Sub-Puls-Abstand', tex: FORMULAS.dtSub },
      { name: 'Burst-Dauer', tex: FORMULAS.tBurst },
      { name: 'Spitzenfluenz pro Sub-Puls', tex: FORMULAS.F0Sub },
      { name: 'Tiefe pro Burst', tex: FORMULAS.zAblBurst },
      { name: 'Volumen pro Burst', tex: FORMULAS.VBurst },
      { name: 'Spezifische Abtragsrate', tex: FORMULAS.VdotPBurst },
      { name: 'Optimale Burst-Energie', tex: FORMULAS.EBurstOpt, note: 'jeder Sub-Puls bei F₀,opt = e² F_th' },
    ],
  },
  {
    title: 'Auswertehilfen',
    entries: [
      {
        name: 'D²-Methode (Liu)',
        tex: String.raw`D^2 = 2w_0^2\ln E_p - 2w_0^2\ln E_{th}`,
        note: 'Regression D² gegen ln E_p: Steigung m = 2w₀² ⇒ w₀ = √(m/2); Nullstelle ⇒ E_th; F_th = 2E_th/(πw₀²). Punkte mit D = 0 ausschließen.',
      },
      {
        name: 'Inkubationsfit',
        tex: String.raw`\ln F_{th}(N) = \ln F_{th}(1) + (S-1)\ln N`,
        note: 'Lineare Regression ln F_th gegen ln N.',
      },
    ],
  },
];
