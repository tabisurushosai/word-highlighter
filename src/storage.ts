export interface StorageAdapter {
  get: <T>(key: string) => Promise<T | undefined>;
  set: <T>(key: string, value: T) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export const STORAGE_KEYS = {
  wordList: 'word_list',
  premiumStatus: 'premium_status',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const WORD_LIST_STORAGE_KEY: StorageKey = STORAGE_KEYS.wordList;
export const PREMIUM_STATUS_STORAGE_KEY: StorageKey = STORAGE_KEYS.premiumStatus;

export interface StorageAreaAdapter {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export function createStorageAdapter(area: StorageAreaAdapter): StorageAdapter {
  return {
    get: async <T>(key: string): Promise<T | undefined> => {
      const result = await area.get(key);
      return result[key] as T | undefined;
    },
    set: async <T>(key: string, value: T): Promise<void> => {
      await area.set({ [key]: value });
    },
    remove: async (key: string): Promise<void> => {
      await area.remove(key);
    },
  };
}

export function createChromeStorageAdapter(area: StorageAreaAdapter): StorageAdapter {
  return createStorageAdapter(area);
}

let configuredStorage: StorageAdapter | undefined;

export function configureStorageAdapter(adapter: StorageAdapter): void {
  configuredStorage = adapter;
}

function createDefaultChromeStorageAdapter(): StorageAdapter {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new Error('Storage adapter is not configured for this platform.');
  }

  return createChromeStorageAdapter(chrome.storage.local);
}

function getStorageAdapter(): StorageAdapter {
  configuredStorage ??= createDefaultChromeStorageAdapter();
  return configuredStorage;
}

export const storage: StorageAdapter = {
  get: <T>(key: string): Promise<T | undefined> => getStorageAdapter().get<T>(key),
  set: <T>(key: string, value: T): Promise<void> => getStorageAdapter().set(key, value),
  remove: (key: string): Promise<void> => getStorageAdapter().remove(key),
};
