import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSetting } from '../data/repos/settings';
import { hasUserData } from '../data/exchange';

const BACKUP_DAYS = 7;
let dismissed = false;

/** Hinweis, wenn der letzte Export länger als 7 Tage her ist (und es eigene Daten gibt). */
export function BackupReminder() {
  const state = useLiveQuery(async () => {
    const last = await getSetting('lastExportAt');
    return {
      last,
      hasData: await hasUserData(),
      age: last ? (Date.now() - Date.parse(last)) / 86_400_000 : Infinity,
    };
  }, []);
  const [hidden, setHidden] = useState(dismissed);
  const { pathname } = useLocation();

  if (!state || hidden || !state.hasData || pathname.startsWith('/einstellungen')) return null;
  const { last: lastExportAt, age } = state;
  if (age <= BACKUP_DAYS) return null;

  return (
    <div className="backup-banner" role="status">
      <span>
        {lastExportAt ? `Letzter Export vor ${Math.floor(age)} Tagen.` : 'Noch kein Export.'} Daten liegen nur auf diesem
        Gerät –{' '}
        <Link to="/einstellungen">jetzt sichern</Link>.
      </span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Hinweis ausblenden"
        onClick={() => {
          dismissed = true;
          setHidden(true);
        }}
      >
        ✕
      </button>
    </div>
  );
}
