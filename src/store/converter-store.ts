import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConversionResult } from "@/lib/converter/types";
import { useHistoryStore } from "./history-store";
import { CATEGORY_MAP, formatValue } from "@/lib/converter";

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
        // The shared history feeds the History and Favourites pages, and is the
        // only way a result can be put on a project report. Only the calculator
        // was writing to it, so nothing converted here could be written up.
        useHistoryStore
          .getState()
          .add(
            "converter",
            CATEGORY_MAP.get(item.category)?.name ?? "Converter",
            `${formatValue(item.fromValue)} ${item.fromUnit.symbol} = ${formatValue(item.toValue)} ${item.toUnit.symbol}`,
            CATEGORY_MAP.get(item.category)?.name ?? "",
            { [item.fromUnit.symbol]: formatValue(item.fromValue) },
            { [item.toUnit.symbol]: formatValue(item.toValue) },
          );

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
      version: 1,
      // "stress" was folded into "pressure". Anything already saved against the
      // old id would otherwise show a bare "stress" badge and do nothing when
      // clicked, because the category it points at no longer exists.
      migrate: (persisted, version) => {
        const state = persisted as {
          recentConversions?: ConversionResult[];
          favoriteCategories?: string[];
        };
        if (!state || version >= 1) return state as unknown as ConverterStore;
        return {
          ...state,
          recentConversions: (state.recentConversions ?? []).map((r) =>
            r.category === "stress" ? { ...r, category: "pressure" } : r,
          ),
          favoriteCategories: Array.from(
            new Set((state.favoriteCategories ?? []).map((c) => (c === "stress" ? "pressure" : c))),
          ),
        } as unknown as ConverterStore;
      },
      partialize: (state) => ({
        recentConversions: state.recentConversions.slice(0, 20),
        favoriteConversions: state.favoriteConversions,
        favoriteCategories: state.favoriteCategories,
      }),
    },
  ),
);
