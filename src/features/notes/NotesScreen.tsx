import { useState } from 'react';
import { Link, Route, Routes, useMatch, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { notesRepo } from '../../data/repos';
import type { NoteType } from '../../data/types';
import { formatDateDe, todayIso } from '../../core/logbook';
import { plainText } from '../../core/markdown';
import { EmptyState } from '../../components/EmptyState';
import { MasterDetail } from '../../components/MasterDetail';
import { Segmented } from '../../components/Segmented';
import { NoteDetail } from './NoteDetail';
import { FormulaCollection } from './FormulaCollection';

type Tab = NoteType | 'alle';
let lastTab: Tab = 'alle';
let lastQuery = '';

function weekday(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('de-DE', { weekday: 'short' });
}

function NoteList() {
  const notes = useLiveQuery(() => notesRepo.listSorted(), []);
  const navigate = useNavigate();
  const active = useMatch('/notizen/:noteId')?.params.noteId;
  const formelnActive = useMatch('/notizen/formeln') !== null;
  const [tab, setTab] = useState<Tab>(lastTab);
  const [q, setQ] = useState(lastQuery);
  const [tag, setTag] = useState<string>();

  const add = async (typ: NoteType) => {
    const n = await notesRepo.create({
      titel: typ === 'tagebuch' ? '' : 'Neue Notiz',
      inhalt: '',
      datum: todayIso(),
      typ,
      tags: [],
      links: [],
    });
    navigate(`/notizen/${n.id}`);
  };

  if (!notes) return null;
  const tags = [...new Set(notes.flatMap((n) => n.tags))].sort((a, b) => a.localeCompare(b, 'de'));
  const needle = q.trim().toLowerCase();
  const shown = notes.filter(
    (n) =>
      (tab === 'alle' || n.typ === tab) &&
      (!tag || n.tags.includes(tag)) &&
      (!needle || `${n.titel} ${n.inhalt} ${n.tags.join(' ')}`.toLowerCase().includes(needle)),
  );

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn-primary grow" onClick={() => void add('tagebuch')}>
          + Tagebuch
        </button>
        <button type="button" className="btn grow" onClick={() => void add('notiz')}>
          + Notiz
        </button>
      </div>
      <Link to="/notizen/formeln" className={`btn${formelnActive ? ' btn-active' : ''}`}>
        Formelsammlung
      </Link>
      <div className="field-switch">
        <Segmented<Tab>
          label="Ansicht"
          value={tab}
          options={[
            ['alle', 'Alle'],
            ['tagebuch', 'Tagebuch'],
            ['notiz', 'Notizen'],
          ]}
          onChange={(t) => {
            lastTab = t;
            setTab(t);
          }}
        />
      </div>
      <input
        type="search"
        placeholder="Suchen …"
        aria-label="Notizen durchsuchen"
        value={q}
        onChange={(e) => {
          lastQuery = e.target.value;
          setQ(e.target.value);
        }}
      />
      {tags.length > 0 && (
        <div className="chips" role="radiogroup" aria-label="Tag">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tag === t}
              className={`chip chip-btn${tag === t ? ' active' : ''}`}
              onClick={() => setTag(tag === t ? undefined : t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
      {notes.length === 0 ? (
        <EmptyState title="Noch keine Notizen">
          <p>Tagebuch für den Labortag, Notizen für Wissen. Markdown, Formeln mit $…$ und Verweise wie [[B1-ABL-001]].</p>
        </EmptyState>
      ) : shown.length === 0 ? (
        <p className="muted">Nichts gefunden.</p>
      ) : (
        <ul className="list">
          {shown.map((n) => (
            <li key={n.id}>
              <Link to={`/notizen/${n.id}`} className={`list-item list-link${active === n.id ? ' selected' : ''}`}>
                <div className="list-main">
                  <span className="list-title">
                    {n.typ === 'tagebuch' ? `${weekday(n.datum)} ${formatDateDe(n.datum)}${n.titel ? ` · ${n.titel}` : ''}` : n.titel || 'Ohne Titel'}
                  </span>
                  <span className="muted small note-snippet">{plainText(n.inhalt, 110) || (n.typ === 'notiz' ? formatDateDe(n.datum) : 'leer')}</span>
                </div>
                {n.typ === 'tagebuch' && <span className="chip">Tagebuch</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NotesScreen() {
  const showDetail = useMatch('/notizen/:noteId') !== null;
  return (
    <MasterDetail
      showDetail={showDetail}
      list={<NoteList />}
      detail={
        <Routes>
          <Route index element={<p className="muted md-placeholder">Notiz auswählen oder anlegen.</p>} />
          <Route path="formeln" element={<FormulaCollection />} />
          <Route path=":noteId" element={<NoteDetail />} />
        </Routes>
      }
    />
  );
}
