import { create } from "zustand";

export interface UserInfo {
  username: string;
  subscription: string;
  expiry: string;
  sessionToken: string;
  isAdmin?: boolean;
}

export interface AuthState {
  status: "idle" | "loading" | "authenticated" | "error";
  user: UserInfo | null;
  errorMessage: string;
  setStatus: (status: AuthState["status"]) => void;
  setUser: (user: UserInfo) => void;
  setError: (message: string) => void;
  clearError: () => void;
  logout: (opts?: { skipServerCall?: boolean }) => Promise<void> | void;
}

const STORAGE_KEYS = ["mp_session", "mp_user", "mp_trial"] as const;

function clearLocalSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    for (const k of STORAGE_KEYS) window.localStorage.removeItem(k);
  } catch {
    // localStorage may be unavailable (private mode, tests). Continue regardless.
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  user: null,
  errorMessage: "",
  setStatus: (status) => set({ status }),
  setUser: (user) => set({ user, status: "authenticated", errorMessage: "" }),
  setError: (message) => set({ errorMessage: message, status: "error" }),
  clearError: () => set({ errorMessage: "" }),
  logout: async (opts) => {
    // Best-effort server-side revocation. `/api/auth/logout` deletes the row
    // associated with this token; failure here must not block the local logout.
    const token = get().user?.sessionToken;
    if (!opts?.skipServerCall && token && typeof fetch !== "undefined") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: token }),
        });
      } catch {
        // Ignore transport errors — local cleanup is what matters to the user.
      }
    }
    clearLocalSessionStorage();
    set({ status: "idle", user: null, errorMessage: "" });
  },
}));
