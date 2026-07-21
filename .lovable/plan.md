# MachinistPro Port + Hardening Plan

You picked Option 1: rebuild MachinistPro on Lovable's stack (TanStack Start + Lovable Cloud) using the GitHub repo as the reference, then apply the P0–P2 fixes from your review. This is a large multi-turn effort. Below is the staged plan I'll follow. I will pause between phases so you can verify before I continue.

## Scope decisions (please confirm)

1. **Auth backend**: Use **Lovable Cloud** (Supabase-backed) for real server-validated sessions instead of KeyAuth. This directly fixes P0 #1, #2, #3. If you must keep KeyAuth, I'll wrap it in a server function (POST, credentials in body, never URL) — but Lovable Cloud is the recommended path.
2. **Initial verified scope** (per your P1 #13): RPM, Surface Speed, Feed Rate, Milling, Turning, Drilling, Threads, Machining Time, Material Weight, Unit Converter. Everything else (beams, springs, fluids, thermal, welding, hydraulics, pneumatics, gears, belts, sheet metal, GD&T) ships as **"Coming Soon"** cards until audited. Confirm or trim.
3. **Design/UI**: Preserve the existing MachinistPro visual style as closely as the new stack allows (Tailwind v4 + shadcn tokens). Pixel-identical is not guaranteed because Next-specific components (next/image, next/font, app-router layouts) don't exist here.

## Phases

### Phase 1 — Port shell (no feature freeze exceptions)
- Recreate route tree under `src/routes/` matching the Next.js pages: home, calculators index, each calculator route, auth pages, dashboard.
- Port shared UI (layout, header, footer, calculator card components) to TanStack + Tailwind v4 tokens defined in `src/styles.css`.
- Copy static assets from `public/` in the repo into this project's `public/`.
- Remove Next.js/Drizzle/pg residue. Rename package to `machinist-pro` (P2 #16).
- No calculations wired yet — routes render placeholder shells.

### Phase 2 — Security (P0 #1, #2, #3, P2 #14, #15)
- Enable Lovable Cloud.
- Email/password + Google sign-in via Supabase Auth. Sessions are server-validated (httpOnly cookie via the integration's auth flow; no `mp_session` in localStorage).
- Protected dashboard lives under `src/routes/_authenticated/` — server-gated by the integration-managed layout, not a client `ProtectedRoute`.
- Server functions with `requireSupabaseAuth` for any protected data.
- Add real CSP + modern security headers on responses; drop `X-XSS-Protection`. Update README to match.
- If KeyAuth is still required: wrap in a server function using POST with credentials in the JSON body; never in the URL. Confirm which path you want.

### Phase 3 — Calculation engine + tests (P0 #4, P1 #6, #7, #9, #10, #11)
- Pure TypeScript calculation modules in `src/lib/calc/` — one file per domain (rpm, surfaceSpeed, feed, milling, turning, drilling, threads, machiningTime, materialWeight, units).
- Each function returns a discriminated result: `{ valid: true, value, unit } | { valid: false, error }`. No more silent `0`.
- Domain-specific input validation (integer flutes/teeth/passes, bounded RPM, positive dimensions, bounded percentages, valid thread pitch).
- **Drilling**: separate `drillFeedPerRev` dataset (HSS vs Carbide, diameter bands). Cutting-time result labeled "Ideal Cutting Time" with optional approach + drill-point allowance; advanced mode adds peck cycle + retract.
- **Vitest** configured. Known-answer tests for every function above, covering metric ↔ imperial, zero/negative/decimal/extreme inputs. `bun test` runs in CI-like flow.
- Every formula/data row carries `{ source, standard, edition, page, conditions, limitations, verifiedOn }` metadata surfaced in the UI as a "Source" tooltip/expander.

### Phase 4 — Material data (P1 #8)
- Replace broad presets with specific grades: AISI 1018, 1045, 4140; SS 304, 316; Al 6061, 7075; Grey Cast Iron; Tool Steel D2.
- Each entry keyed by `{grade, toolMaterial (HSS|Carbide), operation (mill|turn|drill), regime (rough|finish)}` with recommended range + citation.
- Values sourced from Machinery's Handbook / manufacturer data; each entry cites its source. I'll flag any values I can't cite and mark those Beta.

### Phase 5 — Credibility pass (P1 #12, #13, P2 #18)
- Remove "Always accurate", soften marketing copy to the wording you provided.
- Module badges: Verified / Beta / Experimental / Coming Soon.
- Global assumptions + safety disclaimer visible on every calculator page.
- Dynamic `© {currentYear}`; version read from `package.json` at build time. Distinguish RC / Beta / Production in the footer.

### Phase 6 — Deploy + report
- Publish via Lovable hosting.
- Report: build status, list of compatibility fixes applied, env vars required (Supabase URL/keys are auto-injected by Lovable Cloud; KeyAuth key if kept), any deps that couldn't be installed, live URL.

## What I am NOT doing in this plan
- No pilot-testing coordination (P5) — that's a human process on your side; I'll ship the app in a state ready for it.
- No new calculators beyond the "Verified" list above until you approve.
- No commit-message policy enforcement (P2 #17) — commits here are managed by Lovable's system.

## Technical notes (skim if non-technical)
- Stack: TanStack Start v1 (React 19 + Vite 7) on Cloudflare Workers. No Node `pg`, no `next/*`, no Drizzle migrations — Lovable Cloud (Supabase) replaces Postgres/Drizzle.
- Auth: integration-managed `_authenticated` layout, `requireSupabaseAuth` middleware, bearer attacher already wired in `src/start.ts`.
- CSP: applied via `Response` headers from a request middleware in `src/start.ts`.
- Tests: `vitest` run with `bunx vitest run`. Pure calc modules — no DOM/network needed.

## Ask before I start
1. Confirm **Lovable Cloud** for auth (recommended) or insist on KeyAuth-in-POST.
2. Confirm the initial "Verified" calculator list above, or edit it.
3. Any calculators from the original site you want removed entirely (vs marked Coming Soon)?

Reply with answers (or "go with your defaults") and I'll start Phase 1.
