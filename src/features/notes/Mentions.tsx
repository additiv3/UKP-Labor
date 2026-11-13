import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { notesRepo } from '../../data/repos';
import { formatDateDe, todayIso } from '../../core/logbook';
import { plainText } from '../../core/markdown';

/** „Erwähnt in Notizen“ + „Notiz dazu“ für Versuch (Versuchs-ID) oder Reihe (Code). */
export function Mentions({ refId }: { refId: string }) {
  const navigate = useNavigate();
  const notes = useLiveQuery(() => notesRepo.mentioning([refId]), [refId]);
  if (!notes) return null;
  const add = async () => {
    const n = await notesRepo.create({ titel: '', inhalt: `[[${refId}]] `, datum: todayIso(), typ: 'tagebuch', tags: [], links: [refId] });
    navigate(`/notizen/${n.id}`);
  };
  return (
    <section className="card">
      <div className="card-head">
        <h2>Notizen</h2>
        <button type="button" className="btn btn-small" onClick={() => void add()}>
          + Notiz zu {refId}
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="muted small">Keine Notiz verweist auf {refId}. Verweis in einer Notiz: [[{refId}]]</p>
      ) : (
        <ul className="list compact">
          {notes.map((n) => (
            <li key={n.id}>
              <Link to={`/notizen/${n.id}`} className="list-item list-link">
                <div className="list-main">
                  <span className="list-title">
                    {formatDateDe(n.datum)}
                    {n.titel ? ` · ${n.titel}` : ''}
                  </span>
                  <span className="muted small note-snippet">{plainText(n.inhalt, 90)}</span>
                </div>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
