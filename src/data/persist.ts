export type PersistStatus = 'persistent' | 'nicht-persistent' | 'nicht-unterstuetzt';

/** Beim Start dauerhaften Speicher anfragen (verhindert Löschen durch den Browser bei Speicherknappheit). */
export async function requestPersistence(): Promise<PersistStatus> {
  const s = globalThis.navigator?.storage;
  if (!s?.persist || !s.persisted) return 'nicht-unterstuetzt';
  try {
    if (await s.persisted()) return 'persistent';
    return (await s.persist()) ? 'persistent' : 'nicht-persistent';
  } catch {
    return 'nicht-persistent';
  }
}

export async function persistenceStatus(): Promise<PersistStatus> {
  const s = globalThis.navigator?.storage;
  if (!s?.persisted) return 'nicht-unterstuetzt';
  try {
    return (await s.persisted()) ? 'persistent' : 'nicht-persistent';
  } catch {
    return 'nicht-persistent';
  }
}

export interface StorageEstimate {
  usage?: number;
  quota?: number;
}

export async function storageEstimate(): Promise<StorageEstimate | undefined> {
  const s = globalThis.navigator?.storage;
  if (!s?.estimate) return undefined;
  try {
    const e = await s.estimate();
    return { usage: e.usage, quota: e.quota };
  } catch {
    return undefined;
  }
}
