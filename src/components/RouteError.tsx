import { useRouteError } from 'react-router-dom';

export function RouteError() {
  const err = useRouteError();
  const msg = err instanceof Error ? err.message : String(err);
  return (
    <div className="empty">
      <h2>Unerwarteter Fehler</h2>
      <p>Deine Daten sind davon nicht betroffen, sie liegen weiter in der lokalen Datenbank.</p>
      <p className="muted small">
        <code>{msg}</code>
      </p>
      <button className="btn btn-primary" onClick={() => window.location.assign(import.meta.env.BASE_URL)}>
        Neu laden
      </button>
    </div>
  );
}
