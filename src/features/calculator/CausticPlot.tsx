import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { caustic } from '../../core/physics/beam';
import { formatNumber } from '../../core/physics/units';

interface Props {
  /** m */
  w0: number;
  /** m */
  zR: number;
  /** m — Fokuslage relativ zur Oberfläche (+ = Fokus über der Oberfläche) */
  fokuslage?: number;
  /** J — Pulsenergie am Werkstück; für Fluenzdarstellung */
  ePuls?: number;
  /** J/m² — Schwelle als Referenzlinie */
  fth?: number;
  showFluence: boolean;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

/**
 * Kaustik w(z) (Hüllkurve ±w) bzw. Spitzenfluenz F_0(z), z relativ zum Fokus in µm.
 * Markiert ±z_R und – falls angegeben – die Lage der Werkstückoberfläche.
 */
export function CausticPlot({ w0, zR, fokuslage, ePuls, fth, showFluence }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    // Oberfläche relativ zum Fokus: Fokus a über der Oberfläche → Oberfläche bei −a.
    const zSurf = fokuslage !== undefined && fokuslage !== 0 ? -fokuslage : undefined;
    const zMax = Math.max(3 * zR, zSurf !== undefined ? 1.25 * Math.abs(zSurf) : 0);
    const c = caustic(w0, zR, zMax, 241);
    const xs = c.z.map((z) => z * 1e6);
    const fluence = showFluence && ePuls !== undefined;

    const data: uPlot.AlignedData = fluence
      ? [xs, c.w.map((w) => ((2 * ePuls) / (Math.PI * w * w)) * 1e-4)]
      : [xs, c.w.map((w) => w * 1e6), c.w.map((w) => -w * 1e6)];

    const accent = cssVar('--accent');
    const warn = cssVar('--warn');
    const muted = cssVar('--text-muted');
    const border = cssVar('--border');
    const text = cssVar('--text');
    const bg = cssVar('--surface');

    const vline = (u: uPlot, x: number, color: string, label: string, dash: number[], row = 0) => {
      const cx = u.valToPos(x, 'x', true);
      if (cx < u.bbox.left || cx > u.bbox.left + u.bbox.width) return;
      const ctx = u.ctx;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.5 * devicePixelRatio;
      ctx.setLineDash(dash.map((d) => d * devicePixelRatio));
      ctx.beginPath();
      ctx.moveTo(cx, u.bbox.top);
      ctx.lineTo(cx, u.bbox.top + u.bbox.height);
      ctx.stroke();
      ctx.font = `${11 * devicePixelRatio}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      // Beschriftung mit Hintergrund, Zeile `row` (vermeidet Überlappung auf schmalen Displays)
      const ty = u.bbox.top + (12 + row * 16) * devicePixelRatio;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = bg;
      ctx.fillRect(cx - tw / 2 - 3 * devicePixelRatio, ty - 10 * devicePixelRatio, tw + 6 * devicePixelRatio, 13 * devicePixelRatio);
      ctx.fillStyle = color;
      ctx.fillText(label, cx, ty);
      ctx.restore();
    };

    const hline = (u: uPlot, y: number, color: string, label: string) => {
      const cy = u.valToPos(y, 'y', true);
      if (cy < u.bbox.top || cy > u.bbox.top + u.bbox.height) return;
      const ctx = u.ctx;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.5 * devicePixelRatio;
      ctx.setLineDash([6 * devicePixelRatio, 4 * devicePixelRatio]);
      ctx.beginPath();
      ctx.moveTo(u.bbox.left, cy);
      ctx.lineTo(u.bbox.left + u.bbox.width, cy);
      ctx.stroke();
      ctx.font = `${11 * devicePixelRatio}px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(label, u.bbox.left + u.bbox.width - 4 * devicePixelRatio, cy - 4 * devicePixelRatio);
      ctx.restore();
    };

    const axis = (label: string): uPlot.Axis => ({
      label,
      stroke: muted,
      grid: { stroke: border, width: 1 },
      ticks: { stroke: border, width: 1 },
      values: (_u, vals) => vals.map((v) => formatNumber(v, 3)),
      labelFont: '12px system-ui, sans-serif',
      font: '11px system-ui, sans-serif',
    });

    const opts: uPlot.Options = {
      width: el.clientWidth,
      height: Math.max(200, Math.min(320, el.clientWidth * 0.55)),
      legend: { show: false },
      cursor: { drag: { x: false, y: false }, points: { show: false } },
      scales: { x: { time: false } },
      axes: [axis('z relativ zum Fokus [µm]'), axis(fluence ? 'F₀(z) [J/cm²]' : 'w(z) [µm]')],
      series: fluence
        ? [{}, { stroke: accent, width: 2 }]
        : [{}, { stroke: accent, width: 2 }, { stroke: accent, width: 2 }],
      hooks: {
        draw: [
          (u) => {
            vline(u, -zR * 1e6, muted, '−z_R', [4, 4]);
            vline(u, zR * 1e6, muted, '+z_R', [4, 4]);
            if (zSurf !== undefined) vline(u, zSurf * 1e6, warn, 'Oberfläche', [], 1);
            else vline(u, 0, warn, 'Oberfläche', [], 1);
            if (fluence && fth !== undefined) hline(u, fth * 1e-4, text, 'F_th');
          },
        ],
      },
    };

    const plot = new uPlot(opts, data, el);
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) plot.setSize({ width: w, height: Math.max(200, Math.min(320, w * 0.55)) });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      plot.destroy();
    };
  }, [w0, zR, fokuslage, ePuls, fth, showFluence]);

  return <div ref={host} className="plot" role="img" aria-label={showFluence ? 'Fluenz entlang z' : 'Kaustik w(z)'} />;
}
