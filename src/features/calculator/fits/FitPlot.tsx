import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { formatNumber } from '../../../core/physics/units';
import { useThemeVersion } from '../../../components/useThemeVersion';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

/** Streudiagramm Messpunkte + Ausgleichsgerade. */
export function FitPlot({ x, points, line, xLabel, yLabel }: { x: number[]; points: (number | null)[]; line: (number | null)[]; xLabel: string; yLabel: string }) {
  const host = useRef<HTMLDivElement>(null);
  const theme = useThemeVersion();
  useEffect(() => {
    const el = host.current;
    if (!el || x.length === 0) return;
    const accent = cssVar('--accent');
    const warn = cssVar('--warn');
    const muted = cssVar('--text-muted');
    const border = cssVar('--border');
    const axis = (label: string): uPlot.Axis => ({
      label,
      stroke: muted,
      grid: { stroke: border, width: 1 },
      ticks: { stroke: border, width: 1 },
      values: (_u, vals) => vals.map((v) => formatNumber(v, 3)),
      labelFont: '12px system-ui, sans-serif',
      font: '11px system-ui, sans-serif',
    });
    const h = (w: number) => Math.max(200, Math.min(300, w * 0.6));
    const plot = new uPlot(
      {
        width: el.clientWidth,
        height: h(el.clientWidth),
        legend: { show: false },
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false } },
        axes: [axis(xLabel), axis(yLabel)],
        series: [
          {},
          { stroke: accent, width: 0, paths: () => null, points: { show: true, size: 9, fill: accent, stroke: accent } },
          { stroke: warn, width: 2, dash: [6, 4], points: { show: false }, spanGaps: true },
        ],
      },
      [x, points, line],
      el,
    );
    const ro = new ResizeObserver(() => el.clientWidth > 0 && plot.setSize({ width: el.clientWidth, height: h(el.clientWidth) }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      plot.destroy();
    };
  }, [x, points, line, xLabel, yLabel, theme]);
  return <div ref={host} className="plot" role="img" aria-label={`${yLabel} über ${xLabel}`} />;
}
