
import { useEffect, useState } from "react";
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { useThemeStore } from "@/store/theme-store";
import { toast } from "@/store/toast-store";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch } from "@/components/ui/search";
import { Menu, LogOut, User, Bell, Settings, Sun, Moon } from "lucide-react";
import { Link } from "@/lib/next-compat";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleMobileSidebar } = useAppStore();
  const { theme, toggleTheme, hydrate } = useThemeStore();

  useEffect(() => { hydrate(); }, [hydrate]);


  const [confirmTrialSignOut, setConfirmTrialSignOut] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const doLogout = () => {
    localStorage.removeItem("mp_session");
    localStorage.removeItem("mp_user");
    localStorage.removeItem("mp_trial");
    logout();
    toast.success("Signed out", "You have been logged out successfully");
    router.push("/login");
  };

  const handleLogout = () => {
    const isTrial =
      typeof window !== "undefined" && localStorage.getItem("mp_trial") === "1";
    if (isTrial) {
      setAcknowledged(false);
      setConfirmTrialSignOut(true);
      return;
    }
    doLogout();
  };

  return (
    <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14 gap-4">
        {/* Left: mobile menu */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Center: Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <GlobalSearch 
            placeholder="Search modules..."
            className="w-full"
          />
        </div>

        {/* Mobile search icon */}
        <div className="sm:hidden flex-1">
          <GlobalSearch className="w-auto" />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button 
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-cyan" />
          </button>

          {/* Settings */}
          <Link
            href="/dashboard/settings"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </Link>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-dark-600 mx-1" />

          {/* User */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
                <User size={14} className="text-dark-950" />
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-white leading-none">
                  {user.username}
                </p>
                <p className="text-[10px] text-gray-600 leading-none mt-0.5">
                  {user.subscription}
                </p>
              </div>
            </div>
          )}

          {/* Status badge - mobile */}
          <Badge color="green" className="sm:hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          </Badge>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-accent-red hover:bg-accent-red/10 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
      {confirmTrialSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-dark-600 bg-dark-900 p-5">
            <h2 className="text-base font-semibold text-white">Sign out of your trial?</h2>
            <p className="mt-2 text-xs text-gray-400">
              Your 14-day trial is tied to this device and keeps counting down while you are
              signed out. When you sign back in you will get only the days that are left — the
              trial is never restarted.
            </p>
            <label className="mt-4 flex items-start gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 accent-accent-cyan"
              />
              <span>I acknowledge this</span>
            </label>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmTrialSignOut(false)}
                className="flex-1 rounded-lg border border-dark-600 px-3 py-2 text-xs text-gray-300 hover:bg-dark-700 cursor-pointer"
              >
                Stay signed in
              </button>
              <button
                disabled={!acknowledged}
                onClick={doLogout}
                className="flex-1 rounded-lg bg-accent-red/20 border border-accent-red/40 px-3 py-2 text-xs font-semibold text-accent-red disabled:opacity-40 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
