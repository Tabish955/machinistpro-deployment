import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — MachinistPro" },
      { name: "description", content: "Sign in or start your 14-day trial of MachinistPro." },
      { property: "og:title", content: "Sign In — MachinistPro" },
      { property: "og:description", content: "Access MachinistPro engineering calculators." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn.call(supabase.auth, {
        email, password,
        ...(mode === "signup" ? { options: { emailRedirectTo: window.location.origin + "/dashboard" } } : {}),
      });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally { setBusy(false); }
  }

  async function google() {
    setError(null); setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
      if (r.error) throw r.error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed"); setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg grid-pattern px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--dark-600)] bg-[var(--dark-800)]/60 p-6 sm:p-8 backdrop-blur">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-blue)] flex items-center justify-center text-[var(--dark-950)] font-bold">M</div>
          <span className="font-bold tracking-tight text-white">MachinistPro</span>
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-white">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="mb-6 text-sm text-[var(--dark-200)]">
          {mode === "signup" ? "Start your 14-day trial after signing up." : "Welcome back."}
        </p>

        <button
          type="button" onClick={google} disabled={busy}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--dark-500)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--dark-300)]">
          <span className="h-px flex-1 bg-[var(--dark-600)]" /> or <span className="h-px flex-1 bg-[var(--dark-600)]" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full rounded-md border border-[var(--dark-600)] bg-[var(--dark-900)] px-3 py-2.5 text-sm text-white placeholder:text-[var(--dark-400)] focus:border-[var(--accent-cyan)] focus:outline-none" />
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)"
            className="w-full rounded-md border border-[var(--dark-600)] bg-[var(--dark-900)] px-3 py-2.5 text-sm text-white placeholder:text-[var(--dark-400)] focus:border-[var(--accent-cyan)] focus:outline-none" />
          {error && <p className="text-xs text-[var(--accent-amber)]">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-md bg-[var(--accent-cyan)] px-4 py-2.5 text-sm font-semibold text-[var(--dark-950)] transition hover:opacity-90 disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          className="mt-4 w-full text-center text-xs text-[var(--dark-200)] hover:text-white">
          {mode === "signin" ? "No account? Create one →" : "Already have an account? Sign in →"}
        </button>

        <Link to="/" className="mt-6 block text-center text-xs text-[var(--dark-300)] hover:text-white">← Back to home</Link>
      </div>
    </div>
  );
}
