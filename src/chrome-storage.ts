import { configureStorageAdapter, type StorageAdapter, type StorageKey } from './storage';

type StorageAreaItems = Partial<Record<StorageKey, unknown>>;

export interface ChromeStorageArea {
  get: (key: StorageKey) => Promise<StorageAreaItems>;
  set: (items: StorageAreaItems) => Promise<void>;
  remove: (key: StorageKey) => Promise<void>;
}

export type StorageAreaAdapter = ChromeStorageArea;

export function createChromeStorageAdapter(area: ChromeStorageArea): StorageAdapter {
  return {
    get: async <T>(key: StorageKey): Promise<T | undefined> => {
      const result = await area.get(key);
      return result[key] as T | undefined;
    },
    set: async <T>(key: StorageKey, value: T): Promise<void> => {
      await area.set({ [key]: value });
    },
    remove: async (key: StorageKey): Promise<void> => {
      await area.remove(key);
    },
  };
}

function getDefaultChromeStorageArea(): ChromeStorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new Error('Chrome storage is not available on this platform.');
  }

  return chrome.storage.local;
}

export function configureChromeStorageAdapter(area = getDefaultChromeStorageArea()): StorageAdapter {
  const adapter = createChromeStorageAdapter(area);
  configureStorageAdapter(adapter);
  return adapter;
}
