import { db } from '../db';
import { uuid } from '../../core/ids';
import type { SettingKey, SettingsMap } from '../types';

export const SETTING_DEFAULTS: Omit<SettingsMap, 'deviceId'> = {
  deviceName: '',
  defaultSystemId: undefined,
  theme: 'dark',
  lastExportAt: undefined,
  units: {},
  calculator: undefined,
  masterDir: undefined,
  fits: undefined,
  lastMasterSyncAt: undefined,
};

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K] | undefined> {
  const row = await db.settings.get(key);
  return row?.value as SettingsMap[K] | undefined;
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingsMap[K]): Promise<void> {
  await db.settings.put({ key, value });
}

let cachedDeviceId: string | undefined;

/** Geräte-ID: beim ersten Start erzeugt, danach stabil. */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const id = await db.transaction('rw', db.settings, async () => {
    const existing = await getSetting('deviceId');
    if (existing) return existing;
    const created = uuid();
    await setSetting('deviceId', created);
    return created;
  });
  cachedDeviceId = id;
  return id;
}

/** Nur für Tests. */
export function _resetDeviceIdCache(): void {
  cachedDeviceId = undefined;
}
