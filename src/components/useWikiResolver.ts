import { useLiveQuery } from 'dexie-react-hooks';
import { experimentsRepo, seriesRepo } from '../data/repos';

export interface WikiTarget {
  to: string;
  label: string;
}

/** [[Versuchs-ID]] → Versuch, [[Reihen-Code]] → Reihe. Ergebnis: Map Referenz → Ziel. */
export function useWikiResolver(): Map<string, WikiTarget> | undefined {
  return useLiveQuery(async () => {
    const m = new Map<string, WikiTarget>();
    for (const s of await seriesRepo.listSorted()) m.set(s.code, { to: `/logbuch/r/${s.id}`, label: `${s.code} ${s.titel}`.trim() });
    for (const e of await experimentsRepo.list()) m.set(e.versuchsId, { to: `/logbuch/v/${e.id}`, label: e.versuchsId });
    return m;
  }, []);
}
