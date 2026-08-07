import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/ui/toast";
import Link from "@/lib/next-compat";
import { useDeviceTrial } from "@/hooks/use-device-trial";
import { whatsappLink, SUPPORT_WHATSAPP_NUMBER } from "@/lib/support";
import {
  Calculator,
  ArrowRightLeft,
  Weight,
  Hexagon,
  DollarSign,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  LogIn,
  MessageCircle,
  Clock,
} from "lucide-react";


const features = [
  {
    icon: Calculator,
    title: "Scientific Calculator",
    desc: "Advanced engineering math",
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/10",
  },
  {
    icon: ArrowRightLeft,
    title: "Unit Converter",
    desc: "Instant unit conversion",
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
  },
  {
    icon: Weight,
    title: "Material Weight",
    desc: "Weight by shape & alloy",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
  {
    icon: Hexagon,
    title: "Geometry Tools",
    desc: "Area & volume solvers",
    color: "text-accent-amber",
    bg: "bg-accent-amber/10",
  },
  {
    icon: DollarSign,
    title: "Price Estimator",
    desc: "Cost & pricing engine",
    color: "text-accent-green",
    bg: "bg-accent-green/10",
  },
];

const stats = [
  { icon: Sparkles, label: "Precision Tools", value: "15+" },
  { icon: Shield, label: "Secure Access", value: "100%" },
  { icon: Zap, label: "Instant Results", value: "<50ms" },
];

export default function LandingPage() {
  const { status, user, setUser } = useAuthStore();

  // Restore session from local storage — no server call
  useEffect(() => {
    if (status === "authenticated" && user) return;

    const token = localStorage.getItem("mp_session");
    const storedUser = localStorage.getItem("mp_user");
    if (!token || !storedUser) return;

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthenticated = status === "authenticated" && user;
  const { status: trial, starting, start } = useDeviceTrial();
  const trialLabel =
    trial.state === "active"
      ? `Continue Trial · ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left`
      : "Start 14-Day Free Trial";
  const canStartTrial = trial.state === "none" || trial.state === "active";

  return (
    <div className="min-h-screen bg-dark-950 gradient-bg grid-pattern">
      <ToastContainer />
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-700/40 bg-dark-950/80 px-4 sm:px-6 lg:px-12 py-4 backdrop-blur-xl">
        <Logo size="md" />
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-accent-green/40 px-3 py-1.5 text-xs font-semibold text-accent-green transition-colors hover:bg-accent-green/10"
          >
            <MessageCircle size={13} /> Buy Subscription
          </a>
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button variant="primary" size="sm" icon={<ArrowRight size={14} />}>
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm" icon={<LogIn size={14} />}>
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </nav>


      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 lg:pt-28 lg:pb-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 px-4 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse-glow" />
          <span className="text-[11px] font-semibold text-accent-cyan uppercase tracking-wider">
            v1.0.0-rc1 — Now Available
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-5">
          Precision tools for
          <br />
          <span className="bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple bg-clip-text text-transparent">
            modern machinists
          </span>
        </h1>

        <p className="text-base lg:text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          A premium engineering calculator suite built for fabrication shops, CNC operators,
          mechanical engineers, and technical students. Every tool you need, in one place.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button size="lg" icon={<Zap size={18} />}>
                  Open Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="secondary" size="lg">
                  View Account
                </Button>
              </Link>
            </>
          ) : (
            <>
              {canStartTrial && (
                <Button
                  size="lg"
                  icon={<Sparkles size={18} />}
                  loading={starting}
                  onClick={() => void start()}
                >
                  {starting ? "Starting trial…" : trialLabel}
                </Button>
              )}
              <Link href="/login">
                <Button variant="secondary" size="lg" icon={<LogIn size={18} />}>
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>

        {!isAuthenticated && (
          <div className="mt-5 flex flex-col items-center gap-2">
            {trial.state === "none" && (
              <p className="text-xs text-gray-600">
                No credit card required · One free trial per device
              </p>
            )}
            {trial.state === "expired" && (
              <p className="inline-flex items-center gap-1.5 text-xs text-accent-amber">
                <Clock size={13} /> Your free trial on this device has ended — buy a subscription to
                keep going.
              </p>
            )}
            {trial.state === "blocked" && (
              <p className="text-xs text-accent-red">{trial.reason}</p>
            )}
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-accent-green hover:underline"
            >
              <MessageCircle size={14} /> Buy a subscription on WhatsApp ·{" "}
              {SUPPORT_WHATSAPP_NUMBER}
            </a>
          </div>
        )}
      </section>


      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-dark-600 bg-dark-800/40 p-4 lg:p-6 text-center"
              >
                <Icon size={20} className="text-accent-cyan mx-auto mb-2" />
                <p className="text-xl lg:text-2xl font-bold text-white mb-0.5">{stat.value}</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          Engineering tools, reimagined
        </h2>
        <p className="text-sm text-gray-500 text-center mb-10 max-w-lg mx-auto">
          Built from the ground up for speed, precision, and a premium user experience.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-xl border border-dark-600 bg-dark-800/40 p-5 hover:border-dark-400 hover:bg-dark-800/60 transition-all duration-300"
              >
                <div className={`rounded-lg ${f.bg} p-2.5 w-fit mb-3`}>
                  <Icon size={20} className={f.color} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            );
          })}

          {/* Additional tools */}
          <div className="rounded-xl border border-dashed border-dark-500 bg-dark-800/20 p-5 flex items-center justify-center">
            <p className="text-xs text-gray-600 text-center">And more engineering tools inside</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-8 lg:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-accent-cyan/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent-purple/5 rounded-full blur-3xl" />

          <div className="relative">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
              Ready to get started?
            </h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Sign in with your account credentials to access the full suite of precision
              engineering tools.
            </p>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" icon={<ArrowRight size={18} />}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" icon={<LogIn size={18} />}>
                  Sign In Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-700 mb-3">
          <Link href="/about" className="hover:text-gray-400 transition-colors">
            About
          </Link>
          <Link href="/faq" className="hover:text-gray-400 transition-colors">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-gray-400 transition-colors">
            Terms & Conditions
          </Link>
          <Link href="/contact" className="hover:text-gray-400 transition-colors">
            Contact
          </Link>
        </div>
        <p className="text-[11px] text-gray-700 text-center">
          © 2025 MachinistPro · Precision Engineering Tools · v1.0.0-rc1
        </p>
      </footer>
    </div>
  );
}
