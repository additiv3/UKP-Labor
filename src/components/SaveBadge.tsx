import type { SaveStatus } from './useAutosave';

export function SaveBadge({ status, error }: { status: SaveStatus; error?: string }) {
  const text =
    status === 'pending'
      ? 'Speichert …'
      : status === 'saved'
        ? 'Gespeichert ✓'
        : status === 'invalid'
          ? (error ?? 'Ungültig – nicht gespeichert')
          : status === 'error'
            ? 'Fehler beim Speichern'
            : '';
  return (
    <span className={`save-badge save-${status}`} role="status" aria-live="polite">
      {text}
    </span>
  );
}
