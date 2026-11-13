import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSetting, setSetting, SETTING_DEFAULTS } from '../../data/repos/settings';
import {
  persistenceStatus,
  requestPersistence,
  storageEstimate,
  type PersistStatus,
  type StorageEstimate,
} from '../../data/persist';
import type { Theme } from '../../data/types';
import { SCHEMA_VERSION } from '../../data/db';
import { FORMEL_VERSION } from '../../core/physics/version';
import { systemsRepo } from '../../data/repos';
import { resetAllData } from '../../data/exchange';
import { ExchangeSection } from './ExchangeSection';

const PERSIST_LABEL: Record<PersistStatus, string> = {
  persistent: 'Dauerhaft gespeichert',
  'nicht-persistent': 'Nicht dauerhaft – der Browser darf Daten bei Speicherknappheit löschen',
  'nicht-unterstuetzt': 'Vom Browser nicht unterstützt',
};

function formatBytes(n: number | undefined): string {
  if (n === undefined) return '–';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1).replace('.', ',')} kB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${(n / 1024 ** 3).toFixed(1).replace('.', ',')} GB`;
}

export function SettingsScreen() {
  const deviceId = useLiveQuery(() => getSetting('deviceId'), []);
  const deviceName = useLiveQuery(() => getSetting('deviceName'), []);
  const theme = useLiveQuery(() => getSetting('theme'), []) ?? SETTING_DEFAULTS.theme;
  const systems = useLiveQuery(() => systemsRepo.listSorted(), []);
  const defaultSystemId = useLiveQuery(() => getSetting('defaultSystemId'), []);
  const [persist, setPersist] = useState<PersistStatus>();
  const [estimate, setEstimate] = useState<StorageEstimate>();
  const [nameDraft, setNameDraft] = useState<string>();

  useEffect(() => {
    void persistenceStatus().then(setPersist);
    void storageEstimate().then(setEstimate);
  }, []);

  const name = nameDraft ?? deviceName ?? '';

  const reset = async () => {
    if (!window.confirm('Wirklich ALLE Daten auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.')) return;
    if (window.prompt('Zur Bestätigung „LÖSCHEN“ eingeben:')?.trim().toUpperCase() !== 'LÖSCHEN') return;
    await resetAllData();
    window.alert('Alle Daten wurden gelöscht.');
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Gerät</h2>
        <label className="field">
          <span>Gerätename</span>
          <input
            value={name}
            placeholder="z. B. iPhone, Laptop Büro"
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              if (nameDraft !== undefined) void setSetting('deviceName', nameDraft.trim());
              setNameDraft(undefined);
            }}
          />
        </label>
        <p className="muted small">Erscheint im Dateinamen von Exporten. Geräte-ID: <code>{deviceId ?? '…'}</code></p>
      </section>

      <ExchangeSection />

      <section className="card">
        <h2>Standard-Anlage</h2>
        <label className="field">
          <span>Wird im Rechner vorausgewählt</span>
          <select
            value={defaultSystemId ?? ''}
            onChange={(e) => void setSetting('defaultSystemId', e.target.value || undefined)}
          >
            <option value="">– keine –</option>
            {(systems ?? []).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h2>Darstellung</h2>
        <div className="segmented" role="radiogroup" aria-label="Farbschema">
          {(
            [
              ['dark', 'Dunkel'],
              ['light', 'Hell'],
              ['system', 'System'],
            ] as [Theme, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              role="radio"
              aria-checked={theme === v}
              className={theme === v ? 'active' : ''}
              onClick={() => void setSetting('theme', v)}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Speicher</h2>
        <p>
          Status: <strong>{persist ? PERSIST_LABEL[persist] : '…'}</strong>
        </p>
        {persist === 'nicht-persistent' && (
          <button
            className="btn"
            onClick={() => void requestPersistence().then(setPersist)}
          >
            Dauerhaften Speicher anfragen
          </button>
        )}
        <p className="muted small">
          Belegt: {formatBytes(estimate?.usage)} von {formatBytes(estimate?.quota)}. Alle Daten liegen nur auf diesem
          Gerät. Auf dem iPhone gilt dauerhafter Speicher nur, wenn die App vom Home-Bildschirm gestartet wird.
        </p>
      </section>

      <section className="card">
        <h2>Daten zurücksetzen</h2>
        <p className="muted small">
          Löscht alle Anlagen, Werkstoffe, Versuche und Notizen auf diesem Gerät endgültig (die Startbibliothek wird neu angelegt).
          Vorher exportieren!
        </p>
        <button type="button" className="btn btn-danger" onClick={() => void reset()}>
          Alle Daten auf diesem Gerät löschen …
        </button>
      </section>

      <section className="card">
        <h2>Über</h2>
        <p>
          UKP-Labor {__APP_VERSION__} · Datenschema {SCHEMA_VERSION} · Formelversion {FORMEL_VERSION}
        </p>
        <p className="muted small">Offline-App ohne Server, ohne Cloud, ohne Telemetrie.</p>
      </section>
    </div>
  );
}
