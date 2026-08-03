/**
 * Unified history & favorites service.
 * Works across ALL calculator modules.
 */

export interface HistoryEntry {
  id: string;
  module: string; // e.g. "scientific", "converter", "machining"
  moduleLabel: string; // e.g. "Scientific Calculator"
  title: string; // e.g. "sin(45°) = 0.7071"
  details: string; // additional context
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  timestamp: number;
  isFavorite: boolean;
}

const MAX_HISTORY = 200;

/**
 * Create a history entry.
 */
export function createHistoryEntry(
  module: string,
  moduleLabel: string,
  title: string,
  details: string,
  inputs: Record<string, string>,
  outputs: Record<string, string>,
): HistoryEntry {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    module,
    moduleLabel,
    title,
    details,
    inputs,
    outputs,
    timestamp: Date.now(),
    isFavorite: false,
  };
}

/**
 * Add entry to history array (immutable, returns new array).
 */
export function addToHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, MAX_HISTORY);
}

/**
 * Toggle favorite status.
 */
export function toggleFavoriteInHistory(history: HistoryEntry[], id: string): HistoryEntry[] {
  return history.map((h) => (h.id === id ? { ...h, isFavorite: !h.isFavorite } : h));
}

/**
 * Get favorites from history.
 */
export function getFavorites(history: HistoryEntry[]): HistoryEntry[] {
  return history.filter((h) => h.isFavorite);
}

/**
 * Search history.
 */
export function searchHistory(history: HistoryEntry[], query: string): HistoryEntry[] {
  if (!query.trim()) return history;
  const q = query.toLowerCase();
  return history.filter(
    (h) =>
      h.title.toLowerCase().includes(q) ||
      h.details.toLowerCase().includes(q) ||
      h.moduleLabel.toLowerCase().includes(q),
  );
}

/**
 * Group history by date.
 */
export function groupByDate(history: HistoryEntry[]): { label: string; entries: HistoryEntry[] }[] {
  const groups = new Map<string, HistoryEntry[]>();
  const today = new Date();

  for (const entry of history) {
    const date = new Date(entry.timestamp);
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000);

    let label: string;
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else if (diffDays < 7) label = "This Week";
    else label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    const arr = groups.get(label) ?? [];
    arr.push(entry);
    groups.set(label, arr);
  }

  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
}

/**
 * Format relative time.
 */
export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
