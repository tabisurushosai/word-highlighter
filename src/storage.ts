export const STORAGE_KEYS = {
  wordList: 'word_list',
  premiumStatus: 'premium_status',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const WORD_LIST_STORAGE_KEY: StorageKey = STORAGE_KEYS.wordList;
export const PREMIUM_STATUS_STORAGE_KEY: StorageKey = STORAGE_KEYS.premiumStatus;

export interface StoreAdapter {
  get: <T>(key: StorageKey) => Promise<T | undefined>;
  set: <T>(key: StorageKey, value: T) => Promise<void>;
  remove: (key: StorageKey) => Promise<void>;
}

export type StorageAdapter = StoreAdapter;

type StorageAreaItems = Record<string, unknown>;

export interface ChromeStorageArea {
  get: (key: StorageKey) => Promise<StorageAreaItems>;
  set: (items: StorageAreaItems) => Promise<void>;
  remove: (key: StorageKey) => Promise<void>;
}

export type StorageAreaAdapter = ChromeStorageArea;

export function createChromeStorageAdapter(area: ChromeStorageArea): StoreAdapter {
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

export function createStorageAdapter(area: ChromeStorageArea): StoreAdapter {
  return createChromeStorageAdapter(area);
}

let configuredStorage: StoreAdapter | undefined;

export function configureStorageAdapter(adapter: StoreAdapter): void {
  configuredStorage = adapter;
}

function createDefaultChromeStorageAdapter(): StoreAdapter {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new Error('Storage adapter is not configured for this platform.');
  }

  return createChromeStorageAdapter(chrome.storage.local);
}

function getStorageAdapter(): StoreAdapter {
  configuredStorage ??= createDefaultChromeStorageAdapter();
  return configuredStorage;
}

export const storage: StoreAdapter = {
  get: <T>(key: StorageKey): Promise<T | undefined> => getStorageAdapter().get<T>(key),
  set: <T>(key: StorageKey, value: T): Promise<void> => getStorageAdapter().set(key, value),
  remove: (key: StorageKey): Promise<void> => getStorageAdapter().remove(key),
};
