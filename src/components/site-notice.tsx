import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSiteSettings, type SiteSettings } from "@/lib/site.functions";
import { useAuthStore } from "@/store/auth-store";
import { Megaphone, Wrench, X } from "lucide-react";

/** Announcement banner shown at the very top of the site for every visitor. */
export function AnnouncementBanner() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const load = useServerFn(getSiteSettings);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await load({});
        if (!cancelled) setSettings(s);
      } catch {
        /* banner is non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const ann = settings?.announcement;
  if (!ann?.enabled || !ann.message.trim() || dismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-accent-cyan/20 to-accent-blue/10 border-b border-accent-cyan/25 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        <Megaphone size={16} className="text-accent-cyan shrink-0 mt-0.5" />
        <p className="flex-1 text-xs sm:text-sm text-white leading-relaxed">{ann.message}</p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="text-gray-400 hover:text-white cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/**
 * Blocks the app while maintenance mode is on. Administrators keep full access
 * so they can turn it back off.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const user = useAuthStore((s) => s.user);
  const load = useServerFn(getSiteSettings);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await load({});
        if (!cancelled) setSettings(s);
      } catch {
        /* fail open — never lock users out because of a settings read error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const m = settings?.maintenance;
  if (m?.enabled && !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 gradient-bg px-6">
        <div className="max-w-md text-center space-y-4">
          <Wrench size={40} className="mx-auto text-accent-amber" />
          <h1 className="text-2xl font-bold text-white">Under maintenance</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            {m.message || "MachinistPro is temporarily unavailable. Please check back shortly."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
