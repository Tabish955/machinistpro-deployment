/**
 * Central State Store for Graphing Calculator
 * Manages expressions, sliders, viewport, trace, 2D/3D mode, undo/redo history, and session persistence.
 */

import { create } from "zustand";
import type { GraphItem, Viewport, GraphSettings, SessionData, TracePoint } from "../types";

export const DEFAULT_COLORS = [
  "#00d4ff", // Cyan
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#84cc16", // Lime
];

interface GraphStateSnapshot {
  items: GraphItem[];
  viewport: Viewport;
}

interface GraphStoreState {
  items: GraphItem[];
  viewport: Viewport;
  settings: GraphSettings;
  is3DMode: boolean;
  activeTrace: TracePoint | null;
  selectedItemId: string | null;

  undoStack: GraphStateSnapshot[];
  redoStack: GraphStateSnapshot[];

  // Actions
  addItem: (item: Partial<GraphItem> & { type: GraphItem["type"] }) => string;
  updateItem: (id: string, updates: Partial<GraphItem>) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  toggleItemVisibility: (id: string) => void;
  setItemColor: (id: string, color: string) => void;
  setSelectedItemId: (id: string | null) => void;

  setViewport: (vp: Partial<Viewport>) => void;
  zoomViewport: (factor: number) => void;
  panViewport: (dxFactor: number, dyFactor: number) => void;
  resetViewport: () => void;
  zoomToFit: (xMin: number, xMax: number, yMin: number, yMax: number) => void;

  setSettings: (updates: Partial<GraphSettings>) => void;
  setIs3DMode: (enabled: boolean) => void;
  setActiveTrace: (trace: TracePoint | null) => void;

  updateSliderValue: (id: string, value: number) => void;
  toggleSliderPlay: (id: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  loadSession: (session: SessionData) => void;
  resetSession: () => void;
}

const DEFAULT_VIEWPORT: Viewport = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
  aspectLocked: false,
};

const DEFAULT_SETTINGS: GraphSettings = {
  angleMode: "rad",
  gridStyle: "cartesian",
  showMajorGrid: true,
  showMinorGrid: true,
  showAxes: true,
  showAxisLabels: true,
  showNumbers: true,
  highPrecision: false,
};

const INITIAL_ITEMS: GraphItem[] = [
  {
    id: "fn-1",
    type: "function",
    rawExpression: "y = x^2 - 4",
    color: "#00d4ff",
    visible: true,
  },
  {
    id: "fn-2",
    type: "function",
    rawExpression: "y = sin(x)",
    color: "#a855f7",
    visible: true,
  },
];

export const useGraphStore = create<GraphStoreState>((set, get) => {
  const pushUndo = () => {
    const current: GraphStateSnapshot = {
      items: JSON.parse(JSON.stringify(get().items)),
      viewport: { ...get().viewport },
    };
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), current],
      redoStack: [],
    }));
  };

  return {
    items: INITIAL_ITEMS,
    viewport: DEFAULT_VIEWPORT,
    settings: DEFAULT_SETTINGS,
    is3DMode: false,
    activeTrace: null,
    selectedItemId: null,
    undoStack: [],
    redoStack: [],

    addItem: (partial) => {
      pushUndo();
      const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const color = partial.color || DEFAULT_COLORS[get().items.length % DEFAULT_COLORS.length];
      const newItem = {
        id,
        visible: true,
        color,
        ...partial,
      } as GraphItem;

      set((state) => ({
        items: [...state.items, newItem],
        selectedItemId: id,
      }));
      return id;
    },

    updateItem: (id, updates) => {
      set((state) => ({
        items: state.items.map((it) => (it.id === id ? ({ ...it, ...updates } as GraphItem) : it)),
      }));
    },

    removeItem: (id) => {
      pushUndo();
      set((state) => ({
        items: state.items.filter((it) => it.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      }));
    },

    duplicateItem: (id) => {
      pushUndo();
      const item = get().items.find((it) => it.id === id);
      if (!item) return;
      const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const clone = {
        ...JSON.parse(JSON.stringify(item)),
        id: newId,
      };
      set((state) => ({
        items: [...state.items, clone],
        selectedItemId: newId,
      }));
    },

    reorderItems: (startIndex, endIndex) => {
      pushUndo();
      set((state) => {
        const next = [...state.items];
        const [removed] = next.splice(startIndex, 1);
        next.splice(endIndex, 0, removed);
        return { items: next };
      });
    },

    toggleItemVisibility: (id) => {
      set((state) => ({
        items: state.items.map((it) => (it.id === id ? { ...it, visible: !it.visible } : it)),
      }));
    },

    setItemColor: (id, color) => {
      set((state) => ({
        items: state.items.map((it) => (it.id === id ? { ...it, color } : it)),
      }));
    },

    setSelectedItemId: (selectedItemId) => set({ selectedItemId }),

    setViewport: (vp) => {
      set((state) => ({
        viewport: { ...state.viewport, ...vp },
      }));
    },

    zoomViewport: (factor) => {
      set((state) => {
        const { xMin, xMax, yMin, yMax } = state.viewport;
        const cx = (xMin + xMax) / 2;
        const cy = (yMin + yMax) / 2;
        const hx = ((xMax - xMin) * factor) / 2;
        const hy = ((yMax - yMin) * factor) / 2;
        return {
          viewport: {
            ...state.viewport,
            xMin: cx - hx,
            xMax: cx + hx,
            yMin: cy - hy,
            yMax: cy + hy,
          },
        };
      });
    },

    panViewport: (dxFactor, dyFactor) => {
      set((state) => {
        const { xMin, xMax, yMin, yMax } = state.viewport;
        const dx = (xMax - xMin) * dxFactor;
        const dy = (yMax - yMin) * dyFactor;
        return {
          viewport: {
            ...state.viewport,
            xMin: xMin + dx,
            xMax: xMax + dx,
            yMin: yMin + dy,
            yMax: yMax + dy,
          },
        };
      });
    },

    resetViewport: () => {
      set({ viewport: DEFAULT_VIEWPORT });
    },

    zoomToFit: (xMin, xMax, yMin, yMax) => {
      const padX = (xMax - xMin) * 0.1 || 1;
      const padY = (yMax - yMin) * 0.1 || 1;
      set((state) => ({
        viewport: {
          ...state.viewport,
          xMin: xMin - padX,
          xMax: xMax + padX,
          yMin: yMin - padY,
          yMax: yMax + padY,
        },
      }));
    },

    setSettings: (updates) => {
      set((state) => ({
        settings: { ...state.settings, ...updates },
      }));
    },

    setIs3DMode: (is3DMode) => set({ is3DMode }),
    setActiveTrace: (activeTrace) => set({ activeTrace }),

    updateSliderValue: (id, value) => {
      set((state) => ({
        items: state.items.map((it) =>
          it.id === id && it.type === "slider" ? { ...it, value } : it,
        ),
      }));
    },

    toggleSliderPlay: (id) => {
      set((state) => ({
        items: state.items.map((it) =>
          it.id === id && it.type === "slider" ? { ...it, isPlaying: !it.isPlaying } : it,
        ),
      }));
    },

    undo: () => {
      const { undoStack, redoStack, items, viewport } = get();
      if (undoStack.length === 0) return;
      const previous = undoStack[undoStack.length - 1];
      const current: GraphStateSnapshot = { items, viewport };

      set({
        items: previous.items,
        viewport: previous.viewport,
        undoStack: undoStack.slice(0, -1),
        redoStack: [current, ...redoStack],
      });
    },

    redo: () => {
      const { undoStack, redoStack, items, viewport } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[0];
      const current: GraphStateSnapshot = { items, viewport };

      set({
        items: next.items,
        viewport: next.viewport,
        undoStack: [...undoStack, current],
        redoStack: redoStack.slice(1),
      });
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    loadSession: (session) => {
      pushUndo();
      set({
        items: session.items,
        viewport: session.viewport,
        settings: session.settings,
      });
    },

    resetSession: () => {
      pushUndo();
      set({
        items: INITIAL_ITEMS,
        viewport: DEFAULT_VIEWPORT,
        settings: DEFAULT_SETTINGS,
        is3DMode: false,
        activeTrace: null,
      });
    },
  };
});
