export interface StorageAdapter {
  get: <T>(key: string) => Promise<T | undefined>;
  set: <T>(key: string, value: T) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

interface ChromeStorageArea {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export function createChromeStorageAdapter(area: ChromeStorageArea): StorageAdapter {
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

export const storage: StorageAdapter = createChromeStorageAdapter(chrome.storage.local);
