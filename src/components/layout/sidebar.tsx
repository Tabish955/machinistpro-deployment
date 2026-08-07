import { Link } from "@/lib/next-compat";
import { usePathname } from "@/lib/next-compat";
import { useAppStore } from "@/store/app-store";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import {
  calculatorModules,
  referenceModules,
  workspaceModules,
  systemModules,
} from "@/config/modules";
import {
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
  X,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useEffect, useState } from "react";

interface NavSection {
  /** Stable identifier. Was derived from the title with `.toLowerCase()`, which
   *  silently breaks the moment a title gains a space or changes case. */
  key: string;
  title: string;
  items: typeof calculatorModules;
  defaultOpen: boolean;
}

const SECTIONS: NavSection[] = [
  { key: "calculators", title: "Calculators", items: calculatorModules, defaultOpen: true },
  { key: "reference", title: "Reference", items: referenceModules, defaultOpen: true },
  { key: "workspace", title: "Workspace", items: workspaceModules, defaultOpen: true },
  { key: "system", title: "System", items: systemModules, defaultOpen: true },
];

const SECTION_STATE_KEY = "mp_sidebar_sections";

/**
 * Derived from SECTIONS so a section can never be left out of the initial
 * state again. The object this replaces was written by hand and listed
 * calculators, reference and system but not workspace, so that heading read as
 * closed on every page load and hid both of its entries — the CAD Converter
 * and Projects — behind a click nobody knew to make. `defaultOpen` was
 * declared on every section and read nowhere, so it could not correct it.
 */
function defaultSectionState(): Record<string, boolean> {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, s.defaultOpen]));
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useAppStore();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(defaultSectionState);

  // Restored after mount rather than in the initial state: this app renders on
  // the server, where localStorage does not exist, and reading it during the
  // first render would make the client disagree with the server's markup.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(SECTION_STATE_KEY);
    } catch {
      return; // Storage can be disabled outright; navigation still works.
    }
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      setOpenSections((prev) => {
        const next = { ...prev };
        // Only keys we still ship, and only booleans — a stale or hand-edited
        // value must not be able to introduce a section or a non-boolean.
        for (const section of SECTIONS) {
          if (typeof parsed[section.key] === "boolean") {
            next[section.key] = parsed[section.key] as boolean;
          }
        }
        return next;
      });
    } catch {
      // A corrupt value must not take the whole navigation down with it.
    }
  }, []);

  const toggleSection = (key: string) => {
    const next = { ...openSections, [key]: !openSections[key] };
    setOpenSections(next);
    try {
      localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing and a full quota must not swallow the click.
    }
  };

  const isActive = (href: string) => pathname === href;

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-dark-700/50">
        <Logo size="sm" showText={sidebarOpen} />
        {/* Desktop collapse */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        {/* Mobile close */}
        <button
          onClick={closeMobileSidebar}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          onClick={closeMobileSidebar}
          title="Dashboard"
          aria-current={isActive("/dashboard") ? "page" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
            isActive("/dashboard")
              ? "bg-gradient-to-r from-accent-cyan/20 to-accent-cyan/5 text-accent-cyan border border-accent-cyan/20"
              : "text-gray-400 hover:text-white hover:bg-dark-700"
          }`}
        >
          <LayoutDashboard size={18} />
          {sidebarOpen && <span>Dashboard</span>}
        </Link>

        {isAdmin && (
          <Link
            href="/dashboard/admin"
            onClick={closeMobileSidebar}
            title="Admin Panel"
            aria-current={isActive("/dashboard/admin") ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              isActive("/dashboard/admin")
                ? "bg-gradient-to-r from-accent-purple/20 to-accent-purple/5 text-accent-purple border border-accent-purple/20"
                : "text-gray-400 hover:text-white hover:bg-dark-700"
            }`}
          >
            <ShieldCheck size={18} />
            {sidebarOpen && <span>Admin Panel</span>}
          </Link>
        )}

        {/* Sections */}
        {SECTIONS.map((section) => {
          const open = openSections[section.key] ?? section.defaultOpen;
          const panelId = `sidebar-section-${section.key}`;

          return (
            <div key={section.key} className="pt-4">
              {sidebarOpen && (
                <button
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex items-center justify-between w-full px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-dark-300 hover:text-gray-400 transition-colors cursor-pointer"
                >
                  {section.title}
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                </button>
              )}

              {(open || !sidebarOpen) && (
                <div id={panelId} className="space-y-0.5">
                  {section.items.map((mod) => {
                    const Icon = mod.icon;
                    const active = isActive(mod.href);

                    return (
                      <Link
                        key={mod.id}
                        href={mod.href}
                        onClick={closeMobileSidebar}
                        // With the sidebar collapsed only the icon is drawn, and
                        // nothing named it. Also carries the full name, which the
                        // truncated label in the open sidebar may be hiding.
                        title={mod.name}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                          active
                            ? "bg-gradient-to-r from-accent-cyan/20 to-accent-cyan/5 text-accent-cyan border border-accent-cyan/20"
                            : "text-gray-400 hover:text-white hover:bg-dark-700"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-accent-cyan" : ""} />
                        {sidebarOpen && (
                          <>
                            <span className="flex-1 truncate">{mod.shortName || mod.name}</span>
                            {mod.status === "coming-soon" && (
                              <Badge color="gray" className="text-[8px] px-1.5">
                                Soon
                              </Badge>
                            )}
                            {mod.status === "beta" && (
                              <Badge color="purple" className="text-[8px] px-1.5">
                                Beta
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div className="px-4 py-4 border-t border-dark-700/50">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-700">MachinistPro v1.0.0-rc1</p>
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" title="Online" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-dark-950/80 z-40 lg:hidden backdrop-blur-sm animate-fade-in"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-dark-900 border-r border-dark-700/50 transition-transform duration-300 lg:hidden w-64 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen bg-dark-900 border-r border-dark-700/50 transition-all duration-300 shrink-0 sticky top-0 ${
          sidebarOpen ? "w-60" : "w-16"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
