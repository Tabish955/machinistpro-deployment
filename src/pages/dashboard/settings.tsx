
import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import {
  downloadBackup,
  validateBackup,
  restoreBackup,
  clearAllData,
  getStorageSize,
  formatBytes,
} from "@/lib/backup";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import {
  Settings, User, Shield, LogOut, Download, Upload, Trash2,
  HardDrive, AlertTriangle, Check, ChevronRight, RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storageSize, setStorageSize] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importError, setImportError] = useState("");

  useEffect(() => {
    setStorageSize(getStorageSize());
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mp_session");
    localStorage.removeItem("mp_user");
    localStorage.removeItem("mp_trial");
    logout();
    toast.success("Signed out", "You have been logged out successfully");
    router.push("/login");
  };

  const handleExport = () => {
    downloadBackup();
    toast.success("Backup created", "Your data has been exported");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const result = validateBackup(content);

      if (!result.valid || !result.backup) {
        setImportStatus("error");
        setImportError(result.error || "Invalid file");
        toast.error("Import failed", result.error || "Invalid file");
        return;
      }

      // Confirm before overwriting
      if (confirm("This will replace all current data with the backup. Continue?")) {
        restoreBackup(result.backup);
        setImportStatus("success");
        setStorageSize(getStorageSize());
        toast.success("Backup restored", "Your data has been imported. Reloading…");
        setTimeout(() => window.location.reload(), 1500);
      }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = "";
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
    setStorageSize(0);
    toast.success("Data cleared", "All local data has been removed");
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleFullReset = () => {
    clearAllData();
    localStorage.removeItem("mp_session");
    localStorage.removeItem("mp_user");
    localStorage.removeItem("mp_trial");
    logout();
    setShowResetConfirm(false);
    toast.success("App reset", "MachinistPro has been reset to default");
    setTimeout(() => { window.location.href = "/login"; }, 1000);
  };

  const formatExpiry = (expiry: string | undefined) => {
    if (!expiry) return "—";
    const timestamp = Number(expiry);
    if (isNaN(timestamp)) return expiry;
    return new Date(timestamp * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        description="Account, data management, and preferences"
        icon={<Settings size={22} className="text-accent-cyan" />}
        iconColor="cyan"
      />

      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {/* Account */}
      <Card variant="solid" padding="lg" className="border-dark-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-5">
            <div className="rounded-xl bg-accent-green/10 p-3">
              <Shield size={24} className="text-accent-green" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Account</h3>
                <Badge color="green">Active</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Offline-first · Data stored locally</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl bg-dark-900/60 p-4">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Username</p>
              <p className="text-sm font-semibold text-white">{user?.username || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Plan</p>
              <p className="text-sm font-semibold text-white">{user?.subscription || "Standard"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Valid Until</p>
              <p className="text-sm font-semibold text-white">{formatExpiry(user?.expiry)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile & Logout */}
      <Card variant="solid" padding="md" className="border-dark-600">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
            <User size={22} className="text-dark-950" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">{user?.username || "User"}</h3>
            <p className="text-xs text-gray-500">{user?.subscription || "Standard"} · MachinistPro</p>
          </div>
          <Button variant="danger" size="sm" icon={<LogOut size={14} />} onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </Card>

      {/* Data Management */}
      <SectionHeader title="Data Management" />

      {/* Storage info */}
      <Card variant="solid" padding="md" className="border-dark-600">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-dark-700 p-2.5">
            <HardDrive size={18} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">Local Storage</h3>
            <p className="text-xs text-gray-500">All data is stored on this device</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono text-white">{formatBytes(storageSize)}</p>
            <p className="text-[10px] text-gray-600">in use</p>
          </div>
        </div>
      </Card>

      {/* Export */}
      <Card variant="solid" padding="md" hoverable className="border-dark-600 group cursor-pointer" onClick={handleExport}>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-accent-cyan/10 p-2.5 group-hover:bg-accent-cyan/20 transition-colors">
            <Download size={18} className="text-accent-cyan" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">Export Backup</h3>
            <p className="text-xs text-gray-500">Download all data as a JSON file</p>
          </div>
          <ChevronRight size={16} className="text-gray-600" />
        </div>
      </Card>

      {/* Import */}
      <Card variant="solid" padding="md" hoverable className="border-dark-600 group cursor-pointer" onClick={handleImportClick}>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-accent-blue/10 p-2.5 group-hover:bg-accent-blue/20 transition-colors">
            <Upload size={18} className="text-accent-blue" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">Import Backup</h3>
            <p className="text-xs text-gray-500">Restore from a MachinistPro backup file</p>
          </div>
          {importStatus === "success" && <Check size={16} className="text-accent-green" />}
          {importStatus === "error" && <AlertTriangle size={16} className="text-accent-red" />}
          <ChevronRight size={16} className="text-gray-600" />
        </div>
        {importStatus === "error" && importError && (
          <p className="text-xs text-accent-red mt-2 ml-14">{importError}</p>
        )}
      </Card>

      {/* Danger zone */}
      <SectionHeader title="Danger Zone" />

      {/* Clear data */}
      {!showClearConfirm ? (
        <Card variant="solid" padding="md" className="border-dark-600 cursor-pointer" onClick={() => setShowClearConfirm(true)}>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-accent-amber/10 p-2.5">
              <Trash2 size={18} className="text-accent-amber" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">Clear Local Data</h3>
              <p className="text-xs text-gray-500">Remove history, favorites, and workspace data</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="solid" padding="md" className="border-accent-amber/30 animate-fade-in">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-accent-amber shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-accent-amber">Clear all local data?</h3>
              <p className="text-xs text-gray-400 mt-1">
                This will permanently delete your calculation history, favorites, workspace projects, and saved preferences. Your account will not be affected.
              </p>
            </div>
          </div>
          <div className="flex gap-2 ml-8">
            <button onClick={handleClearData} className="px-4 py-2 rounded-xl bg-accent-amber/20 text-accent-amber text-xs font-semibold cursor-pointer hover:bg-accent-amber/30 transition-colors">
              Yes, Clear Data
            </button>
            <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-xl text-gray-500 text-xs cursor-pointer hover:text-white">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Full reset */}
      {!showResetConfirm ? (
        <Card variant="solid" padding="md" className="border-dark-600 cursor-pointer" onClick={() => setShowResetConfirm(true)}>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-accent-red/10 p-2.5">
              <RefreshCw size={18} className="text-accent-red" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">Reset App</h3>
              <p className="text-xs text-gray-500">Clear everything and sign out — start fresh</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="solid" padding="md" className="border-accent-red/30 animate-fade-in">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-accent-red shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-accent-red">Reset MachinistPro?</h3>
              <p className="text-xs text-gray-400 mt-1">
                This will delete ALL local data, sign you out, and reset the app to its default state. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-2 ml-8">
            <button onClick={handleFullReset} className="px-4 py-2 rounded-xl bg-accent-red/20 text-accent-red text-xs font-semibold cursor-pointer hover:bg-accent-red/30 transition-colors">
              Yes, Reset Everything
            </button>
            <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-xl text-gray-500 text-xs cursor-pointer hover:text-white">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* App info */}
      <Card variant="solid" padding="md" className="border-dark-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">MachinistPro</p>
            <p className="text-xs text-gray-600">Offline-First Engineering Calculator Suite</p>
          </div>
          <div className="text-right">
            <Badge color="cyan">v1.0.0-rc1.0-rc1</Badge>
            <p className="text-[10px] text-gray-700 mt-1">All data stored locally</p>
          </div>
        </div>
      </Card>

      <p className="text-center text-[10px] text-gray-700 pb-4">
        © 2025 MachinistPro · Precision Engineering Tools
      </p>
    </div>
  );
}
