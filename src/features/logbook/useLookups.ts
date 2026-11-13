import { useLiveQuery } from 'dexie-react-hooks';
import { materialsRepo, seriesRepo, systemsRepo } from '../../data/repos';
import type { Material, Series, System } from '../../data/types';

export interface Lookups {
  materials: Map<string, Material>;
  series: Map<string, Series>;
  systems: Map<string, System>;
}

/** Nachschlagetabellen für Listen (Name statt ID). */
export function useLookups(): Lookups | undefined {
  return useLiveQuery(async () => {
    const [m, s, a] = await Promise.all([materialsRepo.listSorted(), seriesRepo.listSorted(), systemsRepo.listSorted()]);
    return {
      materials: new Map(m.map((x) => [x.id, x])),
      series: new Map(s.map((x) => [x.id, x])),
      systems: new Map(a.map((x) => [x.id, x])),
    };
  }, []);
}
