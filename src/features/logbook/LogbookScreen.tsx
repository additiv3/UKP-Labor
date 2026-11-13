import { EmptyState } from '../../components/EmptyState';

export function LogbookScreen() {
  return (
    <EmptyState title="Noch keine Versuchsreihen">
      <p>Hier entstehen Versuchsreihen und Versuche mit allen eingestellten Parametern.</p>
      <p className="muted">Verfügbar ab Version 0.4.</p>
    </EmptyState>
  );
}
