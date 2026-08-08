import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminGetSettings,
  adminSetSetting,
  adminListDevices,
  adminRemoveDevice,
  type AdminUserRow,
  type AdminDeviceRow,
  type AdminStats,
} from "@/lib/admin.functions";
import {
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Trash2,
  Megaphone,
  Wrench,
  KeyRound,
  AlertTriangle,
  Search,
  Laptop,
  LogOut,
  CalendarPlus,
  Pencil,
  Users,
  Copy,
  Download,
  Wand2,
  Radio,
} from "lucide-react";

/** Cryptographically strong, human-typeable licence password. */
function generatePassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied", `${label} copied to the clipboard.`);
  } catch {
    toast.error("Copy failed", "Your browser blocked clipboard access.");
  }
}

/** Whole days until expiry; null when the account never expires. */
function daysLeft(expiry: string | null): number | null {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
}

type ClientFilter = "all" | "active" | "suspended" | "admins" | "expiring" | "expired";
type ClientSort = "recent" | "name" | "expiry" | "lastLogin";


const inputClass =
  "w-full rounded-xl bg-dark-900 border border-dark-600 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent-cyan";

const emptyNewUser = {
  username: "",
  password: "",
  email: "",
  subscription: "Standard",
  expiryDate: "",
  isAdmin: false,
  allowMultiDevice: false,
  deviceLimit: 1,
};

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = typeof window !== "undefined" ? localStorage.getItem("mp_session") : null;

  const listUsers = useServerFn(adminListUsers);
  const createUser = useServerFn(adminCreateUser);
  const updateUser = useServerFn(adminUpdateUser);
  const deleteUser = useServerFn(adminDeleteUser);
  const getSettings = useServerFn(adminGetSettings);
  const setSetting = useServerFn(adminSetSetting);
  const listDevices = useServerFn(adminListDevices);
  const removeDevice = useServerFn(adminRemoveDevice);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  /** Something went wrong that is not a question of permission. */
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [sort, setSort] = useState<ClientSort>("recent");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);


  const [nu, setNu] = useState(emptyNewUser);
  const [maint, setMaint] = useState({ enabled: false, message: "" });
  const [ann, setAnn] = useState({ enabled: false, message: "" });

  /** Which client's device list is expanded, and its rows. */
  const [openDevices, setOpenDevices] = useState<string | null>(null);
  const [devices, setDevices] = useState<AdminDeviceRow[]>([]);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setFailure(
        "No session token was found in this browser, so the admin data cannot be fetched. Sign in properly — an administrator's own token is what authorises every call on this page.",
      );
      return;
    }
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        listUsers({ data: { sessionToken: token } }),
        getSettings({ data: { sessionToken: token } }),
      ]);
      setUsers(u.users);
      setStats(u.stats);
      setMaint(s.maintenance);
      setAnn(s.announcement);
      setDenied(false);
      setFailure("");
      setLastSync(new Date());

    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      if (/not authoris|not authoriz|forbidden|401|403/i.test(message)) {
        setDenied(true);
        setFailure("");
      } else {
        setDenied(false);
        setFailure(message || "The admin data could not be loaded.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, listUsers, getSettings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!token) return;
    if (!nu.username.trim() || nu.password.length < 4) {
      toast.error("Missing details", "Username and a password of 4+ characters are required.");
      return;
    }
    const r = await createUser({ data: { sessionToken: token, ...nu } });
    if (r.ok) {
      toast.success("Client created", `${nu.username} can now sign in.`);
      setNu(emptyNewUser);
      void refresh();
    } else {
      toast.error("Could not create", r.error);
    }
  };

  const patch = async (userId: string, data: Record<string, unknown>, msg: string) => {
    if (!token) return;
    const r = await updateUser({ data: { sessionToken: token, userId, ...data } });
    if (r.ok) {
      toast.success(msg, "Change applied.");
      void refresh();
      if (openDevices === userId) void loadDevices(userId);
    } else toast.error("Update failed", r.error);
  };

  const handleDelete = async (u: AdminUserRow) => {
    if (!token) return;
    if (!confirm(`Permanently delete ${u.username}? Their access is revoked immediately.`)) return;
    const r = await deleteUser({ data: { sessionToken: token, userId: u.id } });
    if (r.ok) {
      toast.success("Client removed", `${u.username} can no longer sign in.`);
      void refresh();
    } else toast.error("Delete failed", r.error);
  };

  const saveSetting = async (
    key: "maintenance" | "announcement",
    v: { enabled: boolean; message: string },
  ) => {
    if (!token) return;
    const r = await setSetting({ data: { sessionToken: token, key, ...v } });
    if (r.ok)
      toast.success(
        "Saved",
        key === "maintenance" ? "Maintenance mode updated." : "Announcement updated.",
      );
    else toast.error("Save failed", r.error);
  };

  const handleResetPassword = async (u: AdminUserRow) => {
    const pw = prompt(`New password for ${u.username}:`);
    if (!pw || pw.length < 4) return;
    await patch(u.id, { password: pw }, "Password changed");
  };

  const handleRename = async (u: AdminUserRow) => {
    const name = prompt("New username:", u.username);
    if (!name || name.trim().length < 3 || name.trim() === u.username) return;
    const email = prompt("Email (leave blank for none):", u.email ?? "") ?? "";
    await patch(u.id, { username: name.trim(), email: email.trim() }, "Account details updated");
  };

  const handleDeviceLimit = async (u: AdminUserRow) => {
    const raw = prompt(
      `How many devices may "${u.username}" sign in from with these credentials?\n(1 – 100)`,
      String(u.device_limit),
    );
    if (raw === null) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      toast.error("Invalid number", "Enter a whole number between 1 and 100.");
      return;
    }
    await patch(u.id, { deviceLimit: n, allowMultiDevice: false }, `Device allowance set to ${n}`);
  };

  const handleExtend = async (u: AdminUserRow, days: number) => {
    await patch(u.id, { extendDays: days }, `Subscription extended by ${days} days`);
  };

  const loadDevices = useCallback(
    async (userId: string) => {
      if (!token) return;
      try {
        const r = await listDevices({ data: { sessionToken: token, userId } });
        setDevices(r.devices);
      } catch {
        setDevices([]);
      }
    },
    [token, listDevices],
  );

  const toggleDevices = async (u: AdminUserRow) => {
    if (openDevices === u.id) {
      setOpenDevices(null);
      return;
    }
    setOpenDevices(u.id);
    setDevices([]);
    await loadDevices(u.id);
  };

  const handleRemoveDevice = async (userId: string, deviceId: string) => {
    if (!token) return;
    const r = await removeDevice({ data: { sessionToken: token, userId, deviceId } });
    if (r.ok) {
      toast.success("Device removed", "The slot is free for a new machine.");
      void loadDevices(userId);
      void refresh();
    } else toast.error("Could not remove device", r.error);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = users.filter((u) => {
      if (
        q &&
        !(
          u.username.toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          u.subscription.toLowerCase().includes(q)
        )
      )
        return false;
      const d = daysLeft(u.expiry_date);
      switch (filter) {
        case "active":
          return u.is_active;
        case "suspended":
          return !u.is_active;
        case "admins":
          return u.is_admin;
        case "expiring":
          return d !== null && d >= 0 && d <= 7;
        case "expired":
          return d !== null && d < 0;
        default:
          return true;
      }
    });
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.username.localeCompare(b.username);
        case "expiry":
          return (
            (a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity) -
            (b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity)
          );
        case "lastLogin":
          return (
            (b.last_login_at ? new Date(b.last_login_at).getTime() : 0) -
            (a.last_login_at ? new Date(a.last_login_at).getTime() : 0)
          );
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return rows;
  }, [users, query, filter, sort]);

  /** Live mode: quietly re-pull the roster so device and session counts stay current. */
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void refresh(), 20000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const exportCsv = () => {
    const header = [
      "username",
      "email",
      "plan",
      "expiry",
      "admin",
      "active",
      "devices_used",
      "device_limit",
      "unlimited_devices",
      "last_login",
      "created",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      header.join(","),
      ...filtered.map((u) =>
        [
          u.username,
          u.email ?? "",
          u.subscription,
          u.expiry_date ?? "",
          u.is_admin,
          u.is_active,
          u.device_count,
          u.device_limit,
          u.allow_multi_device,
          u.last_login_at ?? "",
          u.created_at,
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `machinistpro-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export ready", `${filtered.length} client records downloaded.`);
  };



  if (denied) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <ShieldCheck size={40} className="mx-auto text-accent-red" />
        <h1 className="text-xl font-semibold text-white">Administrators only</h1>
        <p className="text-sm text-gray-400">
          This area is restricted. Sign in with an administrator account to continue.
        </p>
        <p className="text-xs text-gray-500">
          Signed in as {user?.username ?? "unknown"}. If this account was made an administrator
          after you signed in, sign out and back in.
        </p>
        <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
      </div>
    );
  }

  if (failure) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <AlertTriangle size={40} className="mx-auto text-accent-amber" />
        <h1 className="text-xl font-semibold text-white">The admin panel could not load</h1>
        <p className="text-sm text-gray-400">
          This is not a permissions problem — your account was accepted. Something behind it failed.
        </p>
        <p className="text-xs text-gray-500 font-mono break-words bg-dark-900 border border-dark-700 rounded-lg p-3">
          {failure}
        </p>
        <Button onClick={() => void refresh()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Admin Panel"
        description={`Signed in as ${user?.username ?? "admin"} · manage clients, devices and site status`}
        icon={<ShieldCheck size={22} className="text-accent-cyan" />}
        iconColor="cyan"
      />

      {/* Command bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAutoRefresh((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
            autoRefresh
              ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
              : "border-dark-600 bg-dark-900 text-gray-400 hover:text-white"
          }`}
        >
          <Radio size={13} className={autoRefresh ? "animate-pulse" : ""} />
          {autoRefresh ? "Live monitoring on" : "Live monitoring off"}
        </button>
        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw size={13} />}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
        <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={exportCsv}>
          Export CSV
        </Button>
        <span className="text-[11px] text-gray-600 ml-auto">
          {lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : "Not synced yet"}
        </span>
      </div>

      {/* Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Clients", value: stats.total, icon: Users, tone: "text-accent-cyan" },
            { label: "Active", value: stats.active, icon: ShieldCheck, tone: "text-accent-green" },
            {
              label: "Live sessions",
              value: stats.activeSessions,
              icon: Laptop,
              tone: "text-accent-purple",
            },
            {
              label: "Trials issued",
              value: stats.trialsIssued,
              icon: CalendarPlus,
              tone: "text-accent-amber",
            },
          ].map((s) => (
            <Card
              key={s.label}
              variant="solid"
              padding="md"
              className="border-dark-600 relative overflow-hidden transition-transform hover:-translate-y-0.5"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/50 to-transparent" />
              <s.icon size={16} className={`${s.tone} mb-1.5`} />
              <p className="text-xl font-bold text-white leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {stats && (stats.expiringSoon > 0 || stats.expired > 0 || stats.suspended > 0) && (
        <p className="text-xs text-gray-500">
          {stats.expiringSoon} expiring within 7 days · {stats.expired} expired ·{" "}
          {stats.suspended} suspended
        </p>
      )}

      {/* Site controls */}
      <SectionHeader title="Site Controls" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <div className="flex items-center gap-3">
            <Wrench size={18} className="text-accent-amber" />
            <h3 className="text-sm font-semibold text-white flex-1">Maintenance Mode</h3>
            <Badge color={maint.enabled ? "amber" : "green"}>{maint.enabled ? "ON" : "OFF"}</Badge>
          </div>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Message shown to visitors"
            value={maint.message}
            onChange={(e) => setMaint({ ...maint, message: e.target.value })}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={maint.enabled ? "danger" : "primary"}
              onClick={() => {
                const next = { ...maint, enabled: !maint.enabled };
                setMaint(next);
                void saveSetting("maintenance", next);
              }}
            >
              {maint.enabled ? "Turn off" : "Turn on"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void saveSetting("maintenance", maint)}
            >
              Save message
            </Button>
          </div>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <div className="flex items-center gap-3">
            <Megaphone size={18} className="text-accent-cyan" />
            <h3 className="text-sm font-semibold text-white flex-1">Announcement Banner</h3>
            <Badge color={ann.enabled ? "cyan" : "green"}>{ann.enabled ? "LIVE" : "OFF"}</Badge>
          </div>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Announcement shown at the top of the site"
            value={ann.message}
            onChange={(e) => setAnn({ ...ann, message: e.target.value })}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={ann.enabled ? "danger" : "primary"}
              onClick={() => {
                const next = { ...ann, enabled: !ann.enabled };
                setAnn(next);
                void saveSetting("announcement", next);
              }}
            >
              {ann.enabled ? "Hide" : "Publish"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void saveSetting("announcement", ann)}
            >
              Save message
            </Button>
          </div>
        </Card>
      </div>

      {/* Create client */}
      <SectionHeader title="Create Login Credentials" />
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Username"
            value={nu.username}
            onChange={(e) => setNu({ ...nu, username: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              placeholder="Password"
              value={nu.password}
              onChange={(e) => setNu({ ...nu, password: e.target.value })}
            />
            <Button
              variant="secondary"
              icon={<Wand2 size={13} />}
              onClick={() => setNu({ ...nu, password: generatePassword() })}
            >
              Generate
            </Button>
          </div>

          <input
            className={inputClass}
            placeholder="Email (optional)"
            value={nu.email}
            onChange={(e) => setNu({ ...nu, email: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Plan (e.g. Pro)"
            value={nu.subscription}
            onChange={(e) => setNu({ ...nu, subscription: e.target.value })}
          />
          <label className="text-xs text-gray-400 flex flex-col gap-1">
            Expiry date (optional)
            <input
              type="date"
              className={inputClass}
              value={nu.expiryDate}
              onChange={(e) => setNu({ ...nu, expiryDate: e.target.value })}
            />
          </label>
          <label className="text-xs text-gray-400 flex flex-col gap-1">
            Devices allowed
            <input
              type="number"
              min={1}
              max={100}
              className={inputClass}
              value={nu.deviceLimit}
              disabled={nu.allowMultiDevice}
              onChange={(e) =>
                setNu({ ...nu, deviceLimit: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
          <div className="flex flex-col justify-end gap-2 text-xs text-gray-400 sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nu.isAdmin}
                onChange={(e) => setNu({ ...nu, isAdmin: e.target.checked })}
              />
              Administrator account
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nu.allowMultiDevice}
                onChange={(e) => setNu({ ...nu, allowMultiDevice: e.target.checked })}
              />
              Unlimited devices (ignores the number above)
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<UserPlus size={14} />} onClick={() => void handleCreate()}>
            Create account
          </Button>
          <Button
            variant="secondary"
            icon={<Copy size={14} />}
            disabled={!nu.username || !nu.password}
            onClick={() =>
              void copyToClipboard(
                `MachinistPro login\nUsername: ${nu.username}\nPassword: ${nu.password}`,
                "Credentials",
              )
            }
          >
            Copy credentials
          </Button>
        </div>
      </Card>

      {/* Clients */}
      <SectionHeader title={`Clients (${filtered.length})`} />
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className={`${inputClass} pl-9`}
          placeholder="Search by username, email or plan"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `All ${users.length}`],
            ["active", `Active ${users.filter((u) => u.is_active).length}`],
            ["suspended", `Suspended ${users.filter((u) => !u.is_active).length}`],
            ["admins", `Admins ${users.filter((u) => u.is_admin).length}`],
            ["expiring", `Expiring ${stats?.expiringSoon ?? 0}`],
            ["expired", `Expired ${stats?.expired ?? 0}`],
          ] as [ClientFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
              filter === key
                ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
                : "border-dark-600 bg-dark-900 text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        <select
          className={`${inputClass} ml-auto w-auto text-xs`}
          value={sort}
          onChange={(e) => setSort(e.target.value as ClientSort)}
        >
          <option value="recent">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="expiry">Expiry soonest</option>
          <option value="lastLogin">Recently active</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <Card key={u.id} variant="solid" padding="md" className="border-dark-600">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white break-all">{u.username}</h3>
                    {u.is_admin && <Badge color="purple">Admin</Badge>}
                    <Badge color={u.is_active ? "green" : "red"}>
                      {u.is_active ? "Active" : "Suspended"}
                    </Badge>
                    <Badge color={u.allow_multi_device ? "cyan" : "amber"}>
                      {u.allow_multi_device
                        ? "Unlimited devices"
                        : `${u.device_count}/${u.device_limit} devices`}
                    </Badge>
                    {(() => {
                      const d = daysLeft(u.expiry_date);
                      if (d === null) return null;
                      if (d < 0) return <Badge color="red">Expired</Badge>;
                      if (d <= 7) return <Badge color="amber">{d}d left</Badge>;
                      return <Badge color="green">{d}d left</Badge>;
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {u.subscription}
                    {u.expiry_date
                      ? ` · expires ${new Date(u.expiry_date).toLocaleDateString()}`
                      : " · no expiry"}
                    {u.last_login_at
                      ? ` · last login ${new Date(u.last_login_at).toLocaleString()}`
                      : " · never signed in"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Copy size={13} />}
                    onClick={() => void copyToClipboard(u.username, "Username")}
                  >
                    Copy user
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Laptop size={13} />}
                    onClick={() => void toggleDevices(u)}
                  >
                    Devices
                  </Button>

                  <Button size="sm" variant="secondary" onClick={() => void handleDeviceLimit(u)}>
                    Set limit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<RefreshCw size={13} />}
                    onClick={() => void patch(u.id, { resetHwid: true }, "Devices reset")}
                  >
                    Reset HWID
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void patch(
                        u.id,
                        { allowMultiDevice: !u.allow_multi_device },
                        u.allow_multi_device ? "Device limit enforced" : "Unlimited devices",
                      )
                    }
                  >
                    {u.allow_multi_device ? "Enforce limit" : "Unlimited"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<CalendarPlus size={13} />}
                    onClick={() => void handleExtend(u, 30)}
                  >
                    +30d
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void handleExtend(u, 365)}>
                    +1y
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Pencil size={13} />}
                    onClick={() => void handleRename(u)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<KeyRound size={13} />}
                    onClick={() => void handleResetPassword(u)}
                  >
                    Password
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<LogOut size={13} />}
                    onClick={() => void patch(u.id, { revokeSessions: true }, "Signed out")}
                  >
                    Force sign-out
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ShieldCheck size={13} />}
                    onClick={() =>
                      void patch(
                        u.id,
                        { isAdmin: !u.is_admin },
                        u.is_admin ? "Admin rights removed" : "Promoted to administrator",
                      )
                    }
                  >
                    {u.is_admin ? "Demote" : "Make admin"}
                  </Button>
                  <Button
                    size="sm"
                    variant={u.is_active ? "danger" : "primary"}
                    onClick={() =>
                      void patch(
                        u.id,
                        { isActive: !u.is_active },
                        u.is_active ? "Access revoked" : "Access restored",
                      )
                    }
                  >
                    {u.is_active ? "Revoke" : "Restore"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={13} />}
                    onClick={() => void handleDelete(u)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {openDevices === u.id && (
                <div className="mt-4 border-t border-dark-700 pt-3 space-y-2">
                  {devices.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No devices registered yet — the next successful sign-in claims a slot.
                    </p>
                  ) : (
                    devices.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-dark-900 border border-dark-700 px-3 py-2"
                      >
                        <div className="flex-1 min-w-[160px]">
                          <p className="text-[11px] font-mono text-gray-400 break-all">
                            {d.hwid.slice(0, 24)}…
                          </p>
                          <p className="text-[11px] text-gray-600 break-all">
                            {d.user_agent?.slice(0, 90) || "Unknown browser"} · last used{" "}
                            {new Date(d.last_seen).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => void handleRemoveDevice(u.id, d.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">No clients match that search.</p>
          )}
        </div>
      )}
    </div>
  );
}
