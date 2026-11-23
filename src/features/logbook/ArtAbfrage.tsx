import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { versuchsartenRepo } from '../../data/repos';
import { artLabel } from './labels';

/** Abfrage der Versuchsart vor dem Anlegen (die Versuchs-ID entsteht beim Anlegen). */
export function ArtAbfrage({ title, onPick, onCancel }: { title: string; onPick: (artId: string) => void; onCancel: () => void }) {
  const arten = useLiveQuery(() => versuchsartenRepo.listSorted(), []);
  const [artId, setArtId] = useState<string>();
  if (!arten) return null;
  const id = artId ?? arten[0]?.id;
  return (
    <div className="notice" role="dialog" aria-label={title}>
      <strong>{title}</strong>
      <p className="muted small">Die Art ist Teil der Versuchs-ID (Reihe-Art-Nummer). Die ID bleibt danach bestehen, auch wenn die Art später geändert wird.</p>
      {arten.length === 0 ? (
        <p>
          Keine Versuchsarten vorhanden. <Link to="/logbuch/arten">Versuchsart anlegen</Link>
        </p>
      ) : (
        <div className="field">
          <label htmlFor="art-abfrage">Versuchsart</label>
          <select id="art-abfrage" value={id} autoFocus onChange={(e) => setArtId(e.target.value)}>
            {arten.map((a) => (
              <option key={a.id} value={a.id}>
                {artLabel(a)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="row wrap">
        <button type="button" className="btn btn-primary" disabled={!id} onClick={() => id && onPick(id)}>
          Anlegen
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
