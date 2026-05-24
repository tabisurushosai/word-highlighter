export const STORAGE_KEYS = {
  wordList: 'word_list',
  premiumStatus: 'premium_status',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const WORD_LIST_STORAGE_KEY: StorageKey = STORAGE_KEYS.wordList;
export const PREMIUM_STATUS_STORAGE_KEY: StorageKey = STORAGE_KEYS.premiumStatus;

export interface StoreAdapter {
  get: <TValue = unknown>(key: StorageKey) => Promise<TValue | undefined>;
  set: <TValue = unknown>(key: StorageKey, value: TValue) => Promise<void>;
  remove: (key: StorageKey) => Promise<void>;
}

export type StorageAdapter = StoreAdapter;

let configuredStore: StoreAdapter | undefined;

export function configureStoreAdapter(adapter: StoreAdapter): void {
  configuredStore = adapter;
}

export const configureStorageAdapter = configureStoreAdapter;

function getStoreAdapter(): StoreAdapter {
  if (!configuredStore) {
    throw new Error('Storage adapter is not configured for this platform.');
  }

  return configuredStore;
}

export const store: StoreAdapter = {
  get: <TValue = unknown>(key: StorageKey): Promise<TValue | undefined> =>
    getStoreAdapter().get<TValue>(key),
  set: <TValue = unknown>(key: StorageKey, value: TValue): Promise<void> =>
    getStoreAdapter().set(key, value),
  remove: (key: StorageKey): Promise<void> => getStoreAdapter().remove(key),
};

export const storage = store;
