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
import { LayoutDashboard, PanelLeftClose, PanelLeft, X, ChevronDown } from "lucide-react";
import { useState } from "react";

interface NavSection {
  title: string;
  items: typeof calculatorModules;
  defaultOpen?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useAppStore();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    calculators: true,
    reference: true,
    system: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (href: string) => pathname === href;

  const sections: NavSection[] = [
    { title: "Calculators", items: calculatorModules, defaultOpen: true },
    { title: "Reference", items: referenceModules, defaultOpen: true },
    { title: "Workspace", items: workspaceModules, defaultOpen: true },
    { title: "System", items: systemModules, defaultOpen: true },
  ];

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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
            isActive("/dashboard")
              ? "bg-gradient-to-r from-accent-cyan/20 to-accent-cyan/5 text-accent-cyan border border-accent-cyan/20"
              : "text-gray-400 hover:text-white hover:bg-dark-700"
          }`}
        >
          <LayoutDashboard size={18} />
          {sidebarOpen && <span>Dashboard</span>}
        </Link>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.title} className="pt-4">
            {sidebarOpen && (
              <button
                onClick={() => toggleSection(section.title.toLowerCase())}
                className="flex items-center justify-between w-full px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-dark-300 hover:text-gray-400 transition-colors cursor-pointer"
              >
                {section.title}
                <ChevronDown
                  size={12}
                  className={`transition-transform ${openSections[section.title.toLowerCase()] ? "" : "-rotate-90"}`}
                />
              </button>
            )}

            {(openSections[section.title.toLowerCase()] || !sidebarOpen) && (
              <div className="space-y-0.5">
                {section.items.map((mod) => {
                  const Icon = mod.icon;
                  const active = isActive(mod.href);

                  return (
                    <Link
                      key={mod.id}
                      href={mod.href}
                      onClick={closeMobileSidebar}
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
        ))}
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
