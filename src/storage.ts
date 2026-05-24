export const STORAGE_KEYS = {
  wordList: 'word_list',
  premiumStatus: 'premium_status',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const WORD_LIST_STORAGE_KEY: StorageKey = STORAGE_KEYS.wordList;
export const PREMIUM_STATUS_STORAGE_KEY: StorageKey = STORAGE_KEYS.premiumStatus;

export interface StorageAdapter {
  get: <T>(key: StorageKey) => Promise<T | undefined>;
  set: <T>(key: StorageKey, value: T) => Promise<void>;
  remove: (key: StorageKey) => Promise<void>;
}

export type StoreAdapter = StorageAdapter;

let configuredStorage: StorageAdapter | undefined;

export function configureStorageAdapter(adapter: StorageAdapter): void {
  configuredStorage = adapter;
}

function getStorageAdapter(): StorageAdapter {
  if (!configuredStorage) {
    throw new Error('Storage adapter is not configured for this platform.');
  }

  return configuredStorage;
}

export const storage: StorageAdapter = {
  get: <T>(key: StorageKey): Promise<T | undefined> => getStorageAdapter().get<T>(key),
  set: <T>(key: StorageKey, value: T): Promise<void> => getStorageAdapter().set(key, value),
  remove: (key: StorageKey): Promise<void> => getStorageAdapter().remove(key),
};
