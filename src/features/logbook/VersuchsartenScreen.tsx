import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { versuchsartenRepo } from '../../data/repos';
import type { Versuchsart } from '../../data/types';
import { validateArtKuerzel } from '../../core/ids';
import { TextArea, TextField } from '../../components/fields';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';

const norm = (s: string | undefined) => (s ?? '').trim().toUpperCase();

function kuerzelFehler(k: string, arten: Versuchsart[], exceptId?: string): string | undefined {
  return validateArtKuerzel(k) ?? (arten.some((a) => a.kuerzel === k && a.id !== exceptId) ? `Kürzel ${k} gibt es schon` : undefined);
}

/** Liste der Versuchsarten mit „Neu“-Formular. */
export function VersuchsartenScreen() {
  const arten = useLiveQuery(() => versuchsartenRepo.listSorted(), []);
  const [kuerzel, setKuerzel] = useState('');
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  if (!arten) return null;
  const fehler = kuerzelFehler(kuerzel, arten) ?? (name.trim() === '' ? 'Name fehlt' : undefined);

  const add = async () => {
    setTried(true);
    if (fehler) return;
    await versuchsartenRepo.create({ kuerzel, name: name.trim() });
    setKuerzel('');
    setName('');
    setTried(false);
  };

  return (
    <div className="stack">
      <BackLink to="/logbuch" label="Versuchsreihen" />
      <section className="card">
        <h2>Versuchsarten</h2>
        <p className="muted small">
          Das Kürzel ist Teil der Versuchs-ID (z. B. K-<strong>SPOT</strong>-001). Es lässt sich nur ändern, solange kein Versuch
          die Art verwendet; löschen nur, wenn sie unbenutzt ist. Die Liste wird mit exportiert und auf allen Geräten gleich.
        </p>
        <ul className="list">
          {arten.map((a) => (
            <li key={a.id}>
              <Link to={`/logbuch/arten/${a.id}`} className="list-item list-link">
                <div className="list-main">
                  <span className="list-title">
                    <strong>{a.kuerzel}</strong> {a.name}
                  </span>
                  {a.beschreibung && <span className="muted small">{a.beschreibung}</span>}
                </div>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2>Neue Versuchsart</h2>
        <div className="two-col">
          <TextField
            label="Kürzel"
            required
            value={kuerzel}
            placeholder="z. B. DRL"
            hint="2–6 Zeichen, A–Z und 0–9"
            error={tried && fehler?.startsWith('Kürzel') ? fehler : undefined}
            onChange={(v) => setKuerzel(norm(v))}
          />
          <TextField
            label="Name"
            required
            value={name}
            placeholder="z. B. Bohren"
            error={tried && fehler === 'Name fehlt' ? fehler : undefined}
            onChange={(v) => setName(v ?? '')}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void add()}>
          + Versuchsart anlegen
        </button>
      </section>
    </div>
  );
}

function ArtForm({ art, arten, locked }: { art: Versuchsart; arten: Versuchsart[]; locked: boolean }) {
  const { draft, change, status, error } = useAutosave(
    art,
    (d) => versuchsartenRepo.update(d.id, { kuerzel: d.kuerzel, name: d.name, beschreibung: d.beschreibung }),
    (d) => (locked ? undefined : kuerzelFehler(d.kuerzel, arten, d.id)) ?? (d.name.trim() === '' ? 'Name fehlt' : undefined),
  );
  return (
    <section className="card">
      <div className="card-head">
        <h2>Versuchsart {draft.kuerzel}</h2>
        <SaveBadge status={status} error={error} />
      </div>
      {locked ? (
        <div className="field">
          <span>Kürzel</span>
          <strong>{draft.kuerzel}</strong>
          <div className="field-hint">Gesperrt: wird von Versuchen verwendet (Teil ihrer IDs).</div>
        </div>
      ) : (
        <TextField
          label="Kürzel"
          required
          value={draft.kuerzel}
          hint="2–6 Zeichen, A–Z und 0–9"
          error={error?.startsWith('Kürzel') ? error : undefined}
          onChange={(v) => change((d) => ({ ...d, kuerzel: norm(v) }))}
        />
      )}
      <TextField label="Name" required value={draft.name} onChange={(v) => change((d) => ({ ...d, name: v ?? '' }))} />
      <TextArea label="Beschreibung" value={draft.beschreibung} onChange={(v) => change((d) => ({ ...d, beschreibung: v }))} />
    </section>
  );
}

/** Eine Versuchsart bearbeiten bzw. löschen. */
export function VersuchsartDetail() {
  const { artId = '' } = useParams();
  const navigate = useNavigate();
  const art = useLiveQuery(() => versuchsartenRepo.get(artId), [artId]);
  const arten = useLiveQuery(() => versuchsartenRepo.listSorted(), []);
  const usage = useLiveQuery(() => versuchsartenRepo.usage(artId), [artId]);
  if (art === undefined || !arten || !usage) return null;
  if (art.deleted) return <p className="muted">Diese Versuchsart wurde gelöscht.</p>;
  const remove = async () => {
    if (!window.confirm(`Versuchsart ${art.kuerzel} löschen?`)) return;
    await versuchsartenRepo.remove(art.id);
    navigate('/logbuch/arten');
  };
  return (
    <div className="stack">
      <BackLink to="/logbuch/arten" label="Versuchsarten" />
      <ArtForm key={art.id} art={art} arten={arten} locked={usage.alle > 0} />
      <section className="card row wrap">
        <button type="button" className="btn btn-danger" disabled={usage.aktiv > 0} onClick={() => void remove()}>
          Versuchsart löschen
        </button>
        <span className="muted small">
          {usage.aktiv > 0 ? `Verwendet von ${usage.aktiv} Versuch${usage.aktiv === 1 ? '' : 'en'}.` : 'Unbenutzt.'}
        </span>
      </section>
    </div>
  );
}
