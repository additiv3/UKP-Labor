import { SYNC_TABLES } from '../../data/types';
import { TABLE_LABEL } from '../../data/labels';
import type { MergePlan } from '../../core/exchange/importMerge';
import { totalCounts } from '../../core/exchange/importMerge';
import type { ExportFile, ValidationIssue } from '../../core/exchange/schema';

function dt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

interface Props {
  source: string;
  file: ExportFile;
  plan: MergePlan;
  issues: ValidationIssue[];
  busy?: boolean;
  applyLabel?: string;
  onApply: () => void;
  onCancel: () => void;
}

/** Importbericht als Vorschau vor dem Übernehmen (neu / aktualisiert / gelöscht / unverändert / Konflikte). */
export function ImportPreview({ source, file, plan, issues, busy, applyLabel = 'Übernehmen', onApply, onCancel }: Props) {
  const sum = totalCounts(plan);
  const COLS = [
    ['neu', 'neu'],
    ['aktualisiert', 'aktualisiert'],
    ['geloescht', 'gelöscht'],
    ['lokalNeuer', 'hier neuer'],
  ] as const;
  const cols = COLS.filter(([k]) => sum[k] > 0);
  const rows = SYNC_TABLES.filter((t) => {
    const c = plan.counts[t];
    return c.neu + c.aktualisiert + c.geloescht + c.lokalNeuer > 0;
  });
  return (
    <div className="import-preview" role="region" aria-label="Importvorschau">
      <h3>Vorschau: {source}</h3>
      <p className="muted small">
        Exportiert {dt(file.exportedAt)}
        {file.deviceName ? ` auf „${file.deviceName}“` : ''} · Schema {file.schemaVersion} · Formelversion {file.formelVersion}
      </p>
      {plan.empty ? (
        <p>
          <strong>Keine Änderungen.</strong> Dieses Gerät ist bereits auf dem Stand der Datei
          {sum.lokalNeuer > 0 ? ` (${sum.lokalNeuer} Datensätze sind hier neuer)` : ''}.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="report">
            <thead>
              <tr>
                <th></th>
                {cols.map(([k, l]) => (
                  <th key={k}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const c = plan.counts[t];
                return (
                  <tr key={t}>
                    <th>{TABLE_LABEL[t]}</th>
                    {cols.map(([k]) => (
                      <td key={k}>{c[k] || ''}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted small">{sum.unveraendert} Datensätze unverändert.</p>
        </div>
      )}
      {plan.conflicts.length > 0 && (
        <div className="notice notice-warn">
          <strong>Konflikte bei Versuchs-IDs ({plan.conflicts.length}):</strong> gleiche ID, aber verschiedene Versuche. Beide
          werden behalten, der importierte bekommt ein Suffix:
          <ul>
            {plan.conflicts.map((c) => (
              <li key={c.id}>
                {c.versuchsId} → <strong>{c.umbenanntIn}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {plan.probenConflicts.length > 0 && (
        <div className="notice notice-warn">
          <strong>Konflikte bei Proben-IDs ({plan.probenConflicts.length}):</strong> gleiche ID, aber verschiedene Proben. Beide
          werden behalten, die importierte bekommt ein Suffix:
          <ul>
            {plan.probenConflicts.map((c) => (
              <li key={c.id}>
                {c.wert} → <strong>{c.umbenanntIn}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {plan.artConflicts.length > 0 && (
        <div className="notice notice-warn">
          <strong>Versuchsart-Kürzel doppelt ({plan.artConflicts.length}):</strong> auf zwei Geräten unabhängig angelegt. Die
          importierte Art wird umbenannt; Versuchs-IDs bleiben unverändert:
          <ul>
            {plan.artConflicts.map((c) => (
              <li key={c.id}>
                {c.wert} → <strong>{c.umbenanntIn}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {plan.seriesCodeConflicts.length > 0 && (
        <div className="notice notice-warn">
          <strong>Reihen-Code doppelt:</strong> {plan.seriesCodeConflicts.join(', ')} gibt es danach mehrfach (auf zwei Geräten
          unabhängig angelegt). Bitte eine der Reihen im Logbuch umbenennen; die Versuchs-IDs bleiben unverändert.
        </div>
      )}
      {issues.length > 0 && (
        <div className="notice notice-warn">
          <strong>{issues.length} ungültige Datensätze werden übersprungen:</strong>
          <ul>
            {issues.slice(0, 20).map((i, n) => (
              <li key={n}>
                {i.table === 'datei' ? 'Datei' : TABLE_LABEL[i.table]} {i.id ?? `#${(i.index ?? 0) + 1}`}: {i.message}
              </li>
            ))}
            {issues.length > 20 && <li>… und {issues.length - 20} weitere</li>}
          </ul>
        </div>
      )}
      <div className="row wrap mt">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onApply}>
          {plan.empty ? 'OK' : applyLabel}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
