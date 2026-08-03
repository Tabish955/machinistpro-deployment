import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  activeModule: string;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setActiveModule: (module: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  activeModule: "dashboard",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  setActiveModule: (module) => set({ activeModule: module }),
}));
