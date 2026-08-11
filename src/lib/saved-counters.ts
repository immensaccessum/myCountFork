export interface SavedCounter {
  id: string;
  url: string;
  title: string;
  savedAt: number;
}

const KEY = 'mc_saved_counters';
const MAX = 20;

export function loadSavedCounters(): SavedCounter[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as SavedCounter[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveCounter(entry: Omit<SavedCounter, 'id' | 'savedAt'>): SavedCounter[] {
  const list = loadSavedCounters().filter((c) => c.url !== entry.url);
  const item: SavedCounter = {
    ...entry,
    id: `${Date.now()}`,
    savedAt: Date.now(),
  };
  list.unshift(item);
  const trimmed = list.slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function deleteSavedCounter(id: string): SavedCounter[] {
  const list = loadSavedCounters().filter((c) => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}
