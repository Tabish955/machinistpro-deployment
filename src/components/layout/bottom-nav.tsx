
import { Link } from "@tanstack/react-router";
import { usePathname } from "@tanstack/react-router";
import { LayoutDashboard, Calculator, Star, Clock, Settings } from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: Calculator, label: "Calc", href: "/dashboard/scientific" },
  { icon: Star, label: "Favorites", href: "/dashboard/favorites" },
  { icon: Clock, label: "History", href: "/dashboard/history" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-xl border-t border-dark-700/50 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
                active
                  ? "text-accent-cyan"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {active && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-accent-cyan" />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
