import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'invalid' | 'error';

/**
 * Entwurf mit verzögertem automatischem Speichern (Standard 400 ms).
 * Ungültige Entwürfe (validate → Fehlertext) werden nicht gespeichert.
 * Beim Verlassen wird ein ausstehender Entwurf sofort gespeichert (kein Datenverlust beim Tab-Wechsel).
 */
export function useAutosave<T>(
  initial: T,
  save: (draft: T) => Promise<unknown>,
  validate: (draft: T) => string | undefined = () => undefined,
  delay = 400,
) {
  const [draft, setDraft] = useState<T>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const draftRef = useRef(initial);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fns = useRef({ save, validate });
  useEffect(() => {
    fns.current = { save, validate };
  });

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    const d = draftRef.current;
    if (fns.current.validate(d) !== undefined) {
      setStatus('invalid');
      return;
    }
    dirty.current = false;
    fns.current.save(d).then(
      () => setStatus((s) => (s === 'pending' ? 'saved' : s)),
      () => setStatus('error'),
    );
  }, []);

  const change = useCallback(
    (fn: (d: T) => T) => {
      const next = fn(draftRef.current);
      draftRef.current = next;
      dirty.current = true;
      setDraft(next);
      setStatus(fns.current.validate(next) !== undefined ? 'invalid' : 'pending');
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(() => () => flush(), [flush]);

  return { draft, change, status, error: validate(draft), flush };
}
