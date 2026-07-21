import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  ArrowRightLeft,
  Weight,
  Hexagon,
  Wrench,
  Ruler,
  LogIn,
  ArrowRight,
} from "lucide-react";

const APP_VERSION = "v1.0.0-rc1";
const CURRENT_YEAR = new Date().getFullYear();

const verifiedTools = [
  { icon: Calculator, title: "RPM & Surface Speed", desc: "Cutting speed conversions" },
  { icon: Wrench, title: "Milling / Turning", desc: "Feed rate, chip load, MRR" },
  { icon: Ruler, title: "Drilling", desc: "Feed per rev, ideal cutting time" },
  { icon: Hexagon, title: "Threads", desc: "Tap drill, thread dimensions" },
  { icon: Weight, title: "Material Weight", desc: "Weight by shape & alloy" },
  { icon: ArrowRightLeft, title: "Unit Converter", desc: "Metric ↔ imperial" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MachinistPro — Engineering calculators for machinists" },
      {
        name: "description",
        content:
          "Machining calculators for RPM, feed rate, drilling, threads, material weight, and unit conversion. Formula-based results intended to be independently verified.",
      },
      { property: "og:title", content: "MachinistPro — Engineering calculators" },
      {
        property: "og:description",
        content:
          "RPM, feed rate, drilling, threads, weight, and unit conversion tools for machinists and engineers.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen gradient-bg grid-pattern">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-blue)] flex items-center justify-center text-[var(--dark-950)] font-bold">
            M
          </div>
          <span className="font-bold tracking-tight text-white">MachinistPro</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-cyan)] px-4 py-2 text-sm font-semibold text-[var(--dark-950)] transition-opacity hover:opacity-90"
          >
            <LogIn size={14} /> Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 text-center lg:pt-28 lg:pb-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-amber)]">
            {APP_VERSION} · Release Candidate — Beta
          </span>
        </div>

        <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Engineering calculators
          <br />
          <span className="bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
            for modern machinists
          </span>
        </h1>

        <p className="mx-auto mb-4 max-w-2xl text-base leading-relaxed text-[var(--dark-200)] lg:text-lg">
          Machining, unit conversion, and material reference tools for CNC operators,
          fabrication shops, and mechanical engineers.
        </p>
        <p className="mx-auto mb-10 max-w-2xl text-xs leading-relaxed text-[var(--dark-300)]">
          Calculations are based on commonly used engineering formulas and reference
          data. Results should be independently verified before use in safety-critical,
          manufacturing, structural, or financial decisions.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-cyan)] px-6 py-3 text-sm font-semibold text-[var(--dark-950)] transition-opacity hover:opacity-90"
          >
            <LogIn size={16} /> Sign In to Start
          </Link>
          <a
            href="#tools"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--dark-500)] bg-[var(--dark-800)]/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-[var(--dark-400)]"
          >
            View Tools <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Verified tools */}
      <section id="tools" className="mx-auto max-w-5xl px-6 pb-20">
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-green)]">
            Verified scope
          </span>
          <h2 className="mt-3 text-2xl font-bold text-white">Initial calculator set</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--dark-200)]">
            These tools ship first. Beams, springs, fluids, thermal, welding, hydraulics,
            gears, sheet metal, and GD&amp;T are marked <em>Coming Soon</em> until audited.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verifiedTools.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="rounded-xl border border-[var(--dark-600)] bg-[var(--dark-800)]/40 p-5 transition-colors hover:border-[var(--dark-400)]"
              >
                <div className="mb-3 w-fit rounded-lg bg-[var(--accent-cyan)]/10 p-2.5">
                  <Icon size={20} className="text-[var(--accent-cyan)]" />
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{t.title}</h3>
                  <span className="rounded-full bg-[var(--accent-green)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--accent-green)]">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-[var(--dark-200)]">{t.desc}</p>
              </div>
            );
          })}

          <div className="rounded-xl border border-dashed border-[var(--dark-500)] bg-[var(--dark-800)]/20 p-5">
            <div className="mb-2 inline-block rounded-full bg-[var(--dark-500)]/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--dark-200)]">
              Coming soon
            </div>
            <p className="text-xs text-[var(--dark-200)]">
              Beams, springs, fluids, thermal, welding, hydraulics, gears, belts,
              sheet metal, tolerances, GD&amp;T.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--dark-700)] px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-[var(--dark-300)] sm:flex-row">
          <p>© {CURRENT_YEAR} MachinistPro. All rights reserved.</p>
          <p>
            {APP_VERSION} · Release Candidate. Independently verify all results
            before production use.
          </p>
        </div>
      </footer>
    </div>
  );
}
