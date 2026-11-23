import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo, notesRepo, seriesRepo } from '../../data/repos';
import type { Note, NoteType } from '../../data/types';
import { compareExperiments, parseTags } from '../../core/logbook';
import { extractLinks } from '../../core/markdown';
import { TextField } from '../../components/fields';
import { Markdown } from '../../components/Markdown';
import { Segmented } from '../../components/Segmented';
import { useAutosave } from '../../components/useAutosave';
import { SaveBadge } from '../../components/SaveBadge';
import { BackLink } from '../../components/MasterDetail';
import { useWikiResolver } from '../../components/useWikiResolver';

let lastMode: 'edit' | 'view' = 'edit';

function NoteForm({ note }: { note: Note }) {
  const { draft, change, status, error } = useAutosave(
    note,
    (d) =>
      notesRepo.update(d.id, {
        titel: d.titel,
        inhalt: d.inhalt,
        datum: d.datum,
        typ: d.typ,
        tags: d.tags,
        links: extractLinks(d.inhalt),
      }),
    (d) => (!/^\d{4}-\d{2}-\d{2}$/.test(d.datum) ? 'Datum fehlt' : undefined),
  );
  const [mode, setMode] = useState<'edit' | 'view'>(note.inhalt ? lastMode : 'edit');
  const [tagText, setTagText] = useState(note.tags.join(', '));
  const area = useRef<HTMLTextAreaElement>(null);
  const wiki = useWikiResolver();
  const targets = useLiveQuery(async () => {
    const exps = (await experimentsRepo.list()).sort(compareExperiments).slice(0, 200);
    const series = await seriesRepo.listSorted();
    return { exps, series };
  }, []);

  const insert = (text: string) => {
    const el = area.current;
    const at = el?.selectionStart ?? draft.inhalt.length;
    const end = el?.selectionEnd ?? at;
    const next = draft.inhalt.slice(0, at) + text + draft.inhalt.slice(end);
    change((d) => ({ ...d, inhalt: next }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + text.length, at + text.length);
    });
  };

  const links = extractLinks(draft.inhalt);

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div className="field-switch grow">
            <Segmented<NoteType>
              label="Art"
              value={draft.typ}
              options={[
                ['tagebuch', 'Tagebuch'],
                ['notiz', 'Notiz'],
              ]}
              onChange={(t) => change((d) => ({ ...d, typ: t }))}
            />
          </div>
          <SaveBadge status={status} error={error} />
        </div>
        <div className="two-col">
          <TextField
            label="Titel"
            value={draft.titel}
            placeholder={draft.typ === 'tagebuch' ? 'optional, z. B. Justage Scanner' : 'Titel'}
            onChange={(v) => change((d) => ({ ...d, titel: v ?? '' }))}
          />
          <div className="field">
            <label htmlFor="note-datum">Datum</label>
            <input id="note-datum" type="date" value={draft.datum} onChange={(e) => change((d) => ({ ...d, datum: e.target.value }))} />
          </div>
        </div>
        <TextField
          label="Tags"
          value={tagText}
          placeholder="z. B. justage, si"
          onChange={(v) => {
            setTagText(v ?? '');
            change((d) => ({ ...d, tags: parseTags(v ?? '') }));
          }}
        />
      </section>

      <section className="card">
        <div className="card-head note-toolbar">
          <div className="note-mode">
            <Segmented
              label="Modus"
              value={mode}
              options={[
                ['edit', 'Bearbeiten'],
                ['view', 'Vorschau'],
              ]}
              onChange={(m) => {
                lastMode = m;
                setMode(m);
              }}
            />
          </div>
          {mode === 'edit' && targets && (
            <select
              aria-label="Verweis einfügen"
              value=""
              onChange={(e) => {
                if (e.target.value) insert(`[[${e.target.value}]]`);
              }}
            >
              <option value="">[[ Verweis einfügen …</option>
              <optgroup label="Reihen">
                {targets.series.map((s) => (
                  <option key={s.id} value={s.code}>
                    {`${s.code} ${s.titel}`.trim()}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Versuche">
                {targets.exps.map((e) => (
                  <option key={e.id} value={e.versuchsId}>
                    {e.versuchsId}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </div>
        <div className={`note-editor note-${mode}`}>
          <textarea
            ref={area}
            className="note-text"
            aria-label="Inhalt (Markdown)"
            value={draft.inhalt}
            placeholder={'Markdown: # Überschrift, **fett**, - Liste, - [ ] Aufgabe\nFormel: $F_0 = 2E_p/(\\pi w_0^2)$\nVerweis: [[B1-ABL-001]]'}
            onChange={(e) => change((d) => ({ ...d, inhalt: e.target.value }))}
          />
          <div className="note-preview" aria-label="Vorschau">
            <Markdown src={draft.inhalt} wiki={wiki} />
          </div>
        </div>
      </section>

      {links.length > 0 && (
        <section className="card">
          <h2>Verweise</h2>
          <div className="chips">
            {links.map((l) => {
              const t = wiki?.get(l);
              return t ? (
                <Link key={l} to={t.to} className="chip chip-btn">
                  {t.label}
                </Link>
              ) : (
                <span key={l} className="chip wiki-missing" title="nicht gefunden">
                  {l}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export function NoteDetail() {
  const { noteId = '' } = useParams();
  const navigate = useNavigate();
  const note = useLiveQuery(() => notesRepo.get(noteId), [noteId]);
  if (note === undefined) return null;
  if (note.deleted) return <p className="muted">Diese Notiz wurde gelöscht.</p>;
  const remove = async () => {
    if (!window.confirm('Notiz löschen?')) return;
    await notesRepo.remove(note.id);
    navigate('/notizen');
  };
  return (
    <div className="stack">
      <BackLink to="/notizen" label="Notizen" />
      <NoteForm key={note.id} note={note} />
      <section className="card row wrap">
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Notiz löschen
        </button>
      </section>
    </div>
  );
}
