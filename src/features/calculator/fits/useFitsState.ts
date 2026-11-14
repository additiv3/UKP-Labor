import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, setSetting } from '../../../data/repos/settings';

export interface FitsState {
  d2: { text: string; eUnit: string; dUnit: string };
  ink: { text: string; fUnit: string };
}

const INITIAL: FitsState = { d2: { text: '', eUnit: 'µJ', dUnit: 'µm' }, ink: { text: '', fUnit: 'J/cm²' } };

function normalize(raw: unknown): FitsState {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<FitsState>;
  const str = (x: unknown, d: string) => (typeof x === 'string' ? x : d);
  return {
    d2: { text: str(r.d2?.text, ''), eUnit: str(r.d2?.eUnit, 'µJ'), dUnit: str(r.d2?.dUnit, 'µm') },
    ink: { text: str(r.ink?.text, ''), fUnit: str(r.ink?.fUnit, 'J/cm²') },
  };
}

let memory: FitsState | undefined;

/** Eingaben der Auswertehilfen; bleiben beim Tab-Wechsel und über Neustarts erhalten. */
export function useFitsState(): [FitsState, (fn: (s: FitsState) => FitsState) => void] {
  const [state, setState] = useState<FitsState>(memory ?? INITIAL);
  const loaded = useRef(memory !== undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (loaded.current) return;
    let alive = true;
    void getSetting('fits').then((raw) => {
      if (!alive) return;
      loaded.current = true;
      if (raw !== undefined) {
        memory = normalize(raw);
        setState(memory);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const update = useCallback((fn: (s: FitsState) => FitsState) => {
    setState((prev) => {
      const next = fn(prev);
      memory = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void setSetting('fits', next), 300);
      return next;
    });
  }, []);
  return [state, update];
}
