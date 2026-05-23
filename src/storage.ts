export const storage = {
  get: async <T>(key: string): Promise<T | undefined> => {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },
  set: async <T>(key: string, value: T): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },
  remove: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
};
