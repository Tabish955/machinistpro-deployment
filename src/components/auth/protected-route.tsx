import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { Logo } from "@/components/ui/logo";

interface ProtectedRouteProps {
  children: ReactNode;
}

interface SessionValidateResponse {
  valid: boolean;
  user?: {
    username: string;
    subscription: string;
    expiry: string;
    isTrial?: boolean;
  };
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { status, user, setUser } = useAuthStore();
  const checkedRef = useRef(false);
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    // Already authenticated for this app lifetime
    if (status === "authenticated" && user) {
      checkedRef.current = true;
      return;
    }
    if (checkedRef.current) return;
    checkedRef.current = true;

    let cancelled = false;
    (async () => {
      const token = localStorage.getItem("mp_session");
      if (!token) {
        setCheckFailed(true);
        router.replace("/login");
        return;
      }
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: token }),
        });
        if (cancelled) return;
        if (res.status !== 200) {
          localStorage.removeItem("mp_session");
          localStorage.removeItem("mp_user");
          localStorage.removeItem("mp_trial");
          setCheckFailed(true);
          router.replace("/login");
          return;
        }
        const body = (await res.json()) as SessionValidateResponse;
        if (!body.valid || !body.user) {
          localStorage.removeItem("mp_session");
          localStorage.removeItem("mp_user");
          localStorage.removeItem("mp_trial");
          setCheckFailed(true);
          router.replace("/login");
          return;
        }
        setUser({
          username: body.user.username,
          subscription: body.user.subscription,
          expiry: body.user.expiry,
          sessionToken: token,
        });
      } catch {
        if (cancelled) return;
        // Network should not silently log the user out, but it cannot grant access either.
        setCheckFailed(true);
        router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, setUser, status, user]);

  if (status === "loading" || (status === "idle" && !user && !checkFailed)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 gradient-bg grid-pattern">
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="flex items-center gap-3 mt-6">
            <svg className="h-5 w-5 animate-spin text-accent-cyan" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm text-gray-400">Verifying session…</span>
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
