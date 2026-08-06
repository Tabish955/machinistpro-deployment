import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type HistoryEntry,
  createHistoryEntry,
  addToHistory,
  toggleFavoriteInHistory,
  getFavorites,
  searchHistory,
} from "@/lib/core/history";

interface HistoryStore {
  entries: HistoryEntry[];

  // Actions
  add: (
    module: string,
    moduleLabel: string,
    title: string,
    details: string,
    inputs: Record<string, string>,
    outputs: Record<string, string>,
  ) => void;

  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearAll: () => void;
  clearModule: (module: string) => void;

  // Queries
  getByModule: (module: string) => HistoryEntry[];
  getFavorites: () => HistoryEntry[];
  search: (query: string) => HistoryEntry[];
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],

      add: (module, moduleLabel, title, details, inputs, outputs) => {
        const entry = createHistoryEntry(module, moduleLabel, title, details, inputs, outputs);
        set({ entries: addToHistory(get().entries, entry) });
      },

      remove: (id) => {
        set({ entries: get().entries.filter((e) => e.id !== id) });
      },

      toggleFavorite: (id) => {
        set({ entries: toggleFavoriteInHistory(get().entries, id) });
      },

      clearAll: () => set({ entries: [] }),

      clearModule: (module) => {
        set({ entries: get().entries.filter((e) => e.module !== module) });
      },

      getByModule: (module) => {
        return get().entries.filter((e) => e.module === module);
      },

      getFavorites: () => getFavorites(get().entries),

      search: (query) => searchHistory(get().entries, query),
    }),
    {
      name: "machinist-pro-history",
      partialize: (state) => ({
        entries: state.entries.slice(0, 100), // persist last 100
      }),
    },
  ),
);
