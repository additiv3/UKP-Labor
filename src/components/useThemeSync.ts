import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSetting, SETTING_DEFAULTS } from '../data/repos/settings';
import type { Theme } from '../data/types';

function resolve(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Setzt `data-theme` am <html> gemäß Einstellung (Standard: dunkel). */
export function useThemeSync(): void {
  const theme = useLiveQuery(() => getSetting('theme'), []) ?? SETTING_DEFAULTS.theme;
  useEffect(() => {
    const apply = () => {
      const t = resolve(theme);
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#11151a' : '#f6f7f9');
    };
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
