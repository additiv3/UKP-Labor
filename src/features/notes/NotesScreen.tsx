import { EmptyState } from '../../components/EmptyState';

export function NotesScreen() {
  return (
    <EmptyState title="Noch keine Notizen">
      <p>Tagebuch und freie Notizen mit Markdown, Formeln und Verweisen auf Versuche.</p>
      <p className="muted">Verfügbar ab Version 0.7.</p>
    </EmptyState>
  );
}
