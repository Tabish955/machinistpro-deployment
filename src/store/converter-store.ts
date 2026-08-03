import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConversionResult } from "@/lib/converter/types";

const MAX_RECENT = 50;

interface ConverterStore {
  recentConversions: ConversionResult[];
  favoriteConversions: ConversionResult[];
  favoriteCategories: string[];

  addRecent: (item: ConversionResult) => void;
  clearRecent: () => void;
  toggleFavoriteConversion: (id: string) => void;
  toggleFavoriteCategory: (catId: string) => void;
  isFavoriteCategory: (catId: string) => boolean;
}

export const useConverterStore = create<ConverterStore>()(
  persist(
    (set, get) => ({
      recentConversions: [],
      favoriteConversions: [],
      favoriteCategories: [],

      addRecent: (item) => {
        const { recentConversions } = get();
        // Dedupe by checking from/to/category (ignore value)
        const filtered = recentConversions.filter(
          (r) =>
            !(
              r.fromUnit.id === item.fromUnit.id &&
              r.toUnit.id === item.toUnit.id &&
              r.category === item.category
            ),
        );
        set({
          recentConversions: [item, ...filtered].slice(0, MAX_RECENT),
        });
      },

      clearRecent: () => set({ recentConversions: [] }),

      toggleFavoriteConversion: (id) => {
        const { recentConversions, favoriteConversions } = get();
        const isFav = favoriteConversions.some((f) => f.id === id);
        if (isFav) {
          set({
            favoriteConversions: favoriteConversions.filter((f) => f.id !== id),
            recentConversions: recentConversions.map((r) =>
              r.id === id ? { ...r, isFavorite: false } : r,
            ),
          });
        } else {
          const item = recentConversions.find((r) => r.id === id);
          if (item) {
            set({
              favoriteConversions: [...favoriteConversions, { ...item, isFavorite: true }],
              recentConversions: recentConversions.map((r) =>
                r.id === id ? { ...r, isFavorite: true } : r,
              ),
            });
          }
        }
      },

      toggleFavoriteCategory: (catId) => {
        const { favoriteCategories } = get();
        if (favoriteCategories.includes(catId)) {
          set({
            favoriteCategories: favoriteCategories.filter((c) => c !== catId),
          });
        } else {
          set({ favoriteCategories: [...favoriteCategories, catId] });
        }
      },

      isFavoriteCategory: (catId) => {
        return get().favoriteCategories.includes(catId);
      },
    }),
    {
      name: "machinist-pro-converter",
      partialize: (state) => ({
        recentConversions: state.recentConversions.slice(0, 20),
        favoriteConversions: state.favoriteConversions,
        favoriteCategories: state.favoriteCategories,
      }),
    },
  ),
);
