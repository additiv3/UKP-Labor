import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo, seriesRepo, versuchsartenRepo } from '../../data/repos';
import type { Derived } from '../../core/physics/derive';
import { compareByVersuchsId } from '../../core/logbook';
import { applyTransfer, createFromTransfer } from '../logbook/actions';
import { calcToExperiment, mergeIntoParams } from './toExperiment';
import { artLabel } from '../logbook/labels';
import type { CalcState } from './state';

// Zuletzt gewählte Reihe innerhalb der Sitzung merken
let lastSeriesId: string | undefined;

/** „In Versuch übernehmen“: Rechnerwerte als neuer Versuch oder in einen bestehenden Versuch. */
export function TransferPanel({ state, derived, optikW0Datenblatt }: { state: CalcState; derived: Derived; optikW0Datenblatt?: number }) {
  const navigate = useNavigate();
  const series = useLiveQuery(() => seriesRepo.listSorted(), []);
  const [seriesId, setSeriesId] = useState(lastSeriesId);
  const sid = seriesId ?? series?.[series.length - 1]?.id;
  const experiments = useLiveQuery(() => (sid ? experimentsRepo.bySeries(sid) : Promise.resolve([])), [sid]);
  const [target, setTarget] = useState('neu');
  const [artChoice, setArtChoice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const arten = useLiveQuery(() => versuchsartenRepo.listSorted(), []);

  if (!series || !arten) return null;
  if (series.length === 0)
    return (
      <section className="card">
        <h2>In Versuch übernehmen</h2>
        <p className="muted small">
          Noch keine Versuchsreihe. <Link to="/logbuch">Im Logbuch eine Reihe anlegen</Link>, dann lassen sich die Werte hier
          übernehmen.
        </p>
      </section>
    );

  const transfer = calcToExperiment(state, derived, optikW0Datenblatt);
  const n = Object.keys(transfer.params).length;
  // Art für einen neuen Versuch: Auswahl, sonst Standard-Art der Reihe
  const artId = artChoice ?? series.find((s) => s.id === sid)?.standardVersuchsartId;
  const art = arten.find((a) => a.id === artId);

  const go = async () => {
    if (!sid) return;
    setBusy(true);
    try {
      if (target === 'neu') {
        if (!art) return;
        const e = await createFromTransfer(sid, transfer, art.id);
        navigate(`/logbuch/v/${e.id}`);
      } else {
        const e = experiments?.find((x) => x.id === target);
        if (!e || !window.confirm(`${n} Werte in ${e.versuchsId} übernehmen? Bestehende Werte dieser Felder werden überschrieben.`)) return;
        await applyTransfer(target, transfer, mergeIntoParams);
        navigate(`/logbuch/v/${target}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>In Versuch übernehmen</h2>
      <div className="two-col">
        <div className="field">
          <label htmlFor="tr-series">Versuchsreihe</label>
          <select
            id="tr-series"
            value={sid ?? ''}
            onChange={(e) => {
              lastSeriesId = e.target.value;
              setSeriesId(e.target.value);
              setTarget('neu');
              setArtChoice(undefined);
            }}
          >
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.code} ${s.titel}`.trim()}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tr-target">Ziel</label>
          <select id="tr-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="neu">Neuer Versuch (geplant)</option>
            {[...(experiments ?? [])].sort(compareByVersuchsId).map((e) => (
              <option key={e.id} value={e.id}>
                {e.versuchsId}
              </option>
            ))}
          </select>
        </div>
        {target === 'neu' && (
          <div className="field">
            <label htmlFor="tr-art">Versuchsart</label>
            <select id="tr-art" value={art?.id ?? ''} onChange={(e) => setArtChoice(e.target.value || undefined)}>
              <option value="">– wählen –</option>
              {arten.map((a) => (
                <option key={a.id} value={a.id}>
                  {artLabel(a)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p className="muted small">
        Übernimmt {n} eingestellte Werte (λ, τ, Leistung bzw. E_p, f_rep, T, M², w₀ mit Quelle, Fokuslage, v, h, N) sowie
        Anlage, Komponenten und Werkstoff aus den Vorlagen. Materialwerte (F_th, δ, S) bleiben im Rechner.
      </p>
      <button type="button" className="btn btn-primary" disabled={busy || n === 0 || (target === 'neu' && !art)} onClick={() => void go()}>
        {target === 'neu' ? 'Als neuen Versuch anlegen' : 'In Versuch übernehmen'}
      </button>
    </section>
  );
}
