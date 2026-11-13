import { useEffect, useState } from 'react';

/** Zählt bei jedem Theme-Wechsel hoch (für Canvas-Grafiken, die Farben aus CSS-Variablen lesen). */
export function useThemeVersion(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setN((x) => x + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return n;
}
