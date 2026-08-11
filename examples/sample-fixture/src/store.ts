// Minimal in-memory key-value store with a flush hook.

export interface StoreEntry {
  key: string;
  value: string;
  updatedAt: number;
}

const storage = new Map<string, StoreEntry>();

export function setEntry(key: string, value: string): StoreEntry {
  const entry: StoreEntry = { key, value, updatedAt: Date.now() };
  storage.set(key, entry);
  return entry;
}

export function getEntry(key: string): StoreEntry | undefined {
  return storage.get(key);
}

export function flushStore(): number {
  const count = storage.size;
  storage.clear();
  return count;
}
