
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { Logo } from "@/components/ui/logo";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { status, user, setUser, setStatus, logout } = useAuthStore();
  const checkedRef = useRef(false);

  useEffect(() => {
    // Already authenticated
    if (status === "authenticated" && user) {
      checkedRef.current = true;
      return;
    }

    // Already checked
    if (checkedRef.current) return;
    checkedRef.current = true;

    // Try to restore session from localStorage
    const token = localStorage.getItem("mp_session");
    const storedUser = localStorage.getItem("mp_user");

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    // Restore user from local storage — no server call needed
    try {
      const userData = JSON.parse(storedUser) as {
        username: string;
        subscription: string;
        expiry: string;
      };

      setUser({
        username: userData.username || "User",
        subscription: userData.subscription || "Standard",
        expiry: userData.expiry || "",
        sessionToken: token,
      });
    } catch {
      localStorage.removeItem("mp_session");
      localStorage.removeItem("mp_user");
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading state
  if (status === "loading" || (status === "idle" && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 gradient-bg grid-pattern">
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="flex items-center gap-3 mt-6">
            <svg className="h-5 w-5 animate-spin text-accent-cyan" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-400">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return null;
  }

  return <>{children}</>;
}
