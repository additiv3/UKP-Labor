import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, setSetting } from '../../data/repos/settings';
import { INITIAL_CALC_STATE, normalizeCalcState, type CalcState } from './state';

// Modulweiter Zwischenspeicher: Zustand überlebt Tab-Wechsel sofort, IndexedDB sichert über Neustarts.
let memory: CalcState | undefined;

/** Rechnerzustand, verzögert (300 ms) in IndexedDB gesichert. */
export function useCalcState(): [CalcState, (fn: (s: CalcState) => CalcState) => void, () => void] {
  const [state, setState] = useState<CalcState>(memory ?? INITIAL_CALC_STATE);
  const loaded = useRef(memory !== undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (loaded.current) return;
    let alive = true;
    void getSetting('calculator').then((raw) => {
      if (!alive) return;
      loaded.current = true;
      if (raw !== undefined) {
        const s = normalizeCalcState(raw);
        memory = s;
        setState(s);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const update = useCallback((fn: (s: CalcState) => CalcState) => {
    setState((prev) => {
      const next = fn(prev);
      memory = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void setSetting('calculator', next), 300);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    memory = INITIAL_CALC_STATE;
    setState(INITIAL_CALC_STATE);
    void setSetting('calculator', INITIAL_CALC_STATE);
  }, []);

  return [state, update, reset];
}
