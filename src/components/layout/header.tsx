
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { toast } from "@/store/toast-store";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch } from "@/components/ui/search";
import { Menu, LogOut, User, Bell, Settings } from "lucide-react";
import { Link } from "@/lib/next-compat";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleMobileSidebar } = useAppStore();

  const handleLogout = () => {
    localStorage.removeItem("mp_session");
    localStorage.removeItem("mp_user");
    logout();
    toast.success("Signed out", "You have been logged out successfully");
    router.push("/login");
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
    </header>
  );
}
