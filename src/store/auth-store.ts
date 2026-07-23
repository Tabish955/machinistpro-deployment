
import { create } from "zustand";

export interface UserInfo {
  username: string;
  subscription: string;
  expiry: string;
  sessionToken: string;
}

export interface AuthState {
  status: "idle" | "loading" | "authenticated" | "error";
  user: UserInfo | null;
  errorMessage: string;
  setStatus: (status: AuthState["status"]) => void;
  setUser: (user: UserInfo) => void;
  setError: (message: string) => void;
  clearError: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "idle",
  user: null,
  errorMessage: "",
  setStatus: (status) => set({ status }),
  setUser: (user) =>
    set({ user, status: "authenticated", errorMessage: "" }),
  setError: (message) => set({ errorMessage: message, status: "error" }),
  clearError: () => set({ errorMessage: "" }),
  logout: () =>
    set({
      status: "idle",
      user: null,
      errorMessage: "",
    }),
}));
