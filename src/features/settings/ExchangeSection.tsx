import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SCHEMA_VERSION } from '../../data/db';
import { applyMergePlan, currentExport, fixExportedIds, markExported, readAllData } from '../../data/exchange';
import { getDeviceId, getSetting, setSetting } from '../../data/repos/settings';
import { buildCsv } from '../../core/exchange/exportCsv';
import { exportFileName, MASTER_CSV, MASTER_JSON, serializeExport } from '../../core/exchange/exportJson';
import { planMerge, totalCounts, type MergePlan } from '../../core/exchange/importMerge';
import { parseExport, type ExportFile, type ValidationIssue } from '../../core/exchange/schema';
import { ensurePermission, pickMasterFolder, shareOrDownload, supportsMasterFolder } from './fileio';
import { readMaster, writeMaster } from '../../data/master';
import { ImportPreview } from './ImportPreview';

interface Pending {
  source: string;
  file: ExportFile;
  plan: MergePlan;
  issues: ValidationIssue[];
  /** nach dem Übernehmen das Hauptlogbuch schreiben */
  thenWriteMaster?: boolean;
}

type Msg = { kind: 'ok' | 'warn'; text: string };

function since(iso: string | undefined): string {
  if (!iso) return 'noch nie';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const when = d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  return days >= 1 ? `${when} (vor ${days} ${days === 1 ? 'Tag' : 'Tagen'})` : when;
}

export function ExchangeSection() {
  const lastExportAt = useLiveQuery(() => getSetting('lastExportAt'), []);
  const lastMasterSyncAt = useLiveQuery(() => getSetting('lastMasterSyncAt'), []);
  const masterDir = useLiveQuery(() => getSetting('masterDir'), []) as FileSystemDirectoryHandle | undefined;
  const [pending, setPending] = useState<Pending>();
  const [msg, setMsg] = useState<Msg>();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const masterSupported = supportsMasterFolder();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(undefined);
    try {
      await fn();
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      setMsg({ kind: 'warn', text: `Fehler: ${text}` });
    } finally {
      setBusy(false);
    }
  };

  const exportJson = () =>
    run(async () => {
      const f = await currentExport();
      const r = await shareOrDownload(serializeExport(f), exportFileName(f.deviceName), 'application/json');
      if (r === 'abgebrochen') return setMsg({ kind: 'warn', text: 'Export abgebrochen.' });
      await markExported();
      setMsg({ kind: 'ok', text: r === 'geteilt' ? 'Export geteilt. Im Sync-Ordner ablegen (z. B. „In Dateien sichern“).' : 'Export heruntergeladen.' });
    });

  const exportCsv = () =>
    run(async () => {
      const f = await currentExport();
      const r = await shareOrDownload(buildCsv(f.data), exportFileName(f.deviceName, new Date(), 'csv'), 'text/csv');
      if (r === 'abgebrochen') return;
      await fixExportedIds();
      setMsg({ kind: 'ok', text: 'CSV der Versuche erstellt.' });
    });

  /** Datei prüfen und Vorschau zeigen. */
  const preview = async (text: string, source: string, thenWriteMaster = false) => {
    const parsed = parseExport(text, SCHEMA_VERSION);
    if (parsed.fatal || !parsed.file) {
      setMsg({ kind: 'warn', text: parsed.fatal ?? 'Datei unbrauchbar.' });
      return;
    }
    const plan = planMerge(await readAllData(), parsed.file.data, { deviceId: await getDeviceId() });
    setPending({ source, file: parsed.file, plan, issues: parsed.issues, thenWriteMaster });
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    void run(async () => preview(await file.text(), file.name));
    if (fileInput.current) fileInput.current.value = '';
  };

  const apply = () =>
    run(async () => {
      if (!pending) return;
      const { plan, thenWriteMaster } = pending;
      await applyMergePlan(plan);
      const s = totalCounts(plan);
      const nK = plan.conflicts.length + plan.probenConflicts.length + plan.artConflicts.length;
      let text = plan.empty
        ? 'Keine Änderungen nötig.'
        : `Übernommen: ${s.neu} neu, ${s.aktualisiert} aktualisiert, ${s.geloescht} gelöscht${nK ? `, ${nK} Konflikte umbenannt` : ''}.`;
      if (thenWriteMaster && masterDir) {
        await writeMaster(masterDir);
        text += ` ${MASTER_JSON} und ${MASTER_CSV} gespeichert.`;
      }
      setPending(undefined);
      setMsg({ kind: 'ok', text });
    });

  const chooseFolder = () =>
    run(async () => {
      try {
        const dir = await pickMasterFolder();
        await setSetting('masterDir', dir);
        setMsg({ kind: 'ok', text: `Ordner „${dir.name}“ gewählt. Jetzt „Abgleichen & speichern“.` });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        throw e;
      }
    });

  const syncMaster = () =>
    run(async () => {
      if (!masterDir) return;
      if (!(await ensurePermission(masterDir))) {
        setMsg({ kind: 'warn', text: 'Kein Schreibzugriff auf den Ordner erteilt.' });
        return;
      }
      const text = await readMaster(masterDir);
      if (text === undefined) {
        await writeMaster(masterDir);
        setMsg({ kind: 'ok', text: `Hauptlogbuch neu angelegt: ${MASTER_JSON} und ${MASTER_CSV} in „${masterDir.name}“.` });
        return;
      }
      await preview(text, `${masterDir.name}/${MASTER_JSON}`, true);
    });

  return (
    <section className="card">
      <h2>Export / Import</h2>
      <p className="muted small">Letzter Export: {since(lastExportAt)}</p>

      {pending ? (
        <ImportPreview
          source={pending.source}
          file={pending.file}
          plan={pending.plan}
          issues={pending.issues}
          busy={busy}
          applyLabel={pending.thenWriteMaster ? 'Übernehmen & speichern' : 'Übernehmen'}
          onApply={() => void apply()}
          onCancel={() => setPending(undefined)}
        />
      ) : (
        <>
          <div className="row wrap">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void exportJson()}>
              Export (JSON)
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => void exportCsv()}>
              Versuche als CSV
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => fileInput.current?.click()}>
              Import (JSON) …
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              aria-label="Exportdatei importieren"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          <p className="muted small mt">
            JSON = vollständige Sicherung aller Daten (inkl. gelöschter Einträge für den Abgleich). Import führt zusammen:
            neuere Änderung gewinnt, nichts wird überschrieben, was hier neuer ist. Vor dem Übernehmen gibt es eine Vorschau.
          </p>

          {masterSupported && (
            <div className="subsection">
              <h3>Hauptlogbuch (Laptop)</h3>
              <p className="muted small">
                Ordner im Sync-Ordner wählen (z. B. 02_Labor/Logbuch). „Abgleichen & speichern“ führt {MASTER_JSON} mit diesem
                Gerät zusammen und schreibt {MASTER_JSON} + {MASTER_CSV} zurück.
              </p>
              <p className="small">
                Ordner: <strong>{masterDir ? masterDir.name : 'keiner gewählt'}</strong> · letzter Abgleich: {since(lastMasterSyncAt)}
              </p>
              <div className="row wrap">
                <button type="button" className="btn" disabled={busy} onClick={() => void chooseFolder()}>
                  {masterDir ? 'Anderen Ordner wählen' : 'Ordner wählen …'}
                </button>
                <button type="button" className="btn btn-primary" disabled={busy || !masterDir} onClick={() => void syncMaster()}>
                  Abgleichen & speichern
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {msg && (
        <p className={`notice ${msg.kind === 'ok' ? 'notice-ok' : 'notice-warn'}`} role="status">
          {msg.text}
        </p>
      )}
    </section>
  );
}
