import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — MachinistPro" },
      { name: "description", content: "Sign in to MachinistPro to access the calculator dashboard." },
      { property: "og:title", content: "Sign In — MachinistPro" },
      { property: "og:description", content: "Sign in to access MachinistPro calculators." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg grid-pattern px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--dark-600)] bg-[var(--dark-800)]/60 p-8 backdrop-blur">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-blue)] flex items-center justify-center text-[var(--dark-950)] font-bold">
            M
          </div>
          <span className="font-bold tracking-tight text-white">MachinistPro</span>
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-white">Sign in</h1>
        <p className="mb-6 text-sm text-[var(--dark-200)]">
          Authentication is being wired up server-side in the next phase. Real
          email/password and Google sign-in will land shortly.
        </p>

        <div className="rounded-lg border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/10 p-4 text-xs text-[var(--accent-amber)]">
          <strong>Phase 2 in progress.</strong> Server-validated sessions (HttpOnly
          cookies, no localStorage tokens) will replace the original KeyAuth flow.
        </div>

        <Link
          to="/"
          className="mt-6 inline-block text-xs text-[var(--dark-200)] hover:text-white"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
