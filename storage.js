const STORAGE_KEY = 'mba-events-saved';

export function createStore(storage = localStorage) {
  function load() {
    try {
      return new Set(JSON.parse(storage.getItem(STORAGE_KEY)) ?? []);
    } catch {
      return new Set();
    }
  }

  function persist(set) {
    storage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  }

  return {
    isSaved(key) { return load().has(key); },
    save(key)    { const s = load(); s.add(key);    persist(s); },
    unsave(key)  { const s = load(); s.delete(key); persist(s); },
    getSavedKeys() { return [...load()]; },
  };
}
