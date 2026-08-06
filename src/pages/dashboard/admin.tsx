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
  NOT_AUTHORISED,
  type AdminUserRow,
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
  Eye,
  EyeOff,
  Check,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const inputClass =
  "w-full rounded-xl bg-dark-900 border border-dark-600 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent-cyan";

type SortKey = "username" | "subscription" | "expiry" | "lastLogin" | "status";

const PAGE_SIZE = 10;

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

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  /** Something went wrong that is not a question of permission. */
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [nu, setNu] = useState({
    username: "",
    password: "",
    email: "",
    subscription: "Standard",
    expiryDate: "",
    isAdmin: false,
    allowMultiDevice: false,
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  /** Which account has its password field open, and what has been typed. */
  const [pwEdit, setPwEdit] = useState<{ id: string; value: string } | null>(null);

  /** The account the delete confirmation dialog is asking about. */
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [maint, setMaint] = useState({ enabled: false, message: "" });
  const [ann, setAnn] = useState({ enabled: false, message: "" });
  const refresh = useCallback(async () => {
    if (!token) {
      // `loading` starts true, so returning quietly here left the panel saying
      // "Loading…" for ever. Every admin call needs a session token, and there
      // is not one, so say that rather than spin.
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
      setMaint(s.maintenance);
      setAnn(s.announcement);
      setDenied(false);
      setFailure("");
    } catch (reason) {
      // Only the server refusing the token means the account is not an admin.
      // Treating every failure as that sent an administrator who was correctly
      // signed in off to look at their own account, when the real fault was a
      // database that could not be reached.
      //
      // Match the string the server actually throws, rather than guessing from
      // the wording of whatever came back.
      const message = reason instanceof Error ? reason.message : String(reason);
      const refused =
        message.includes(NOT_AUTHORISED) || message.includes("401") || message.includes("403");
      if (refused) {
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
    setCreating(true);
    try {
      const r = await createUser({ data: { sessionToken: token, ...nu } });
      if (r.ok) {
        toast.success("Client created", `${nu.username} can now sign in.`);
        setNu({
          username: "",
          password: "",
          email: "",
          subscription: "Standard",
          expiryDate: "",
          isAdmin: false,
          allowMultiDevice: false,
        });
        setShowNewPassword(false);
        void refresh();
      } else {
        toast.error("Could not create", r.error);
      }
    } finally {
      setCreating(false);
    }
  };

  const patch = async (userId: string, data: Record<string, unknown>, msg: string) => {
    if (!token) return;
    const r = await updateUser({ data: { sessionToken: token, userId, ...data } });
    if (r.ok) {
      toast.success(msg, "Change applied.");
      void refresh();
    } else toast.error("Update failed", r.error);
  };

  /**
   * Carry out a deletion the administrator has confirmed in the dialog.
   * window.confirm() was used here. It cannot be styled, it names the account
   * only in prose that is easy to skim past, and browsers suppress it after
   * repeated use, which quietly turned Delete into a button that did nothing.
   */
  const confirmDelete = async () => {
    const u = pendingDelete;
    if (!token || !u) return;
    setDeletingId(u.id);
    try {
      const r = await deleteUser({ data: { sessionToken: token, userId: u.id } });
      if (r.ok) {
        toast.success("Client removed", `${u.username} can no longer sign in.`);
        setPendingDelete(null);
        void refresh();
      } else toast.error("Delete failed", r.error);
    } finally {
      setDeletingId(null);
    }
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

  /**
   * Save the password typed into the inline field for one account. A prompt()
   * box was used here, which cannot be styled, cannot mask what is typed, and
   * is blocked outright in some browsers.
   */
  const savePassword = async (u: AdminUserRow) => {
    if (!pwEdit || pwEdit.id !== u.id) return;
    if (pwEdit.value.length < 4) {
      toast.error("Too short", "Use at least 4 characters.");
      return;
    }
    await patch(u.id, { password: pwEdit.value }, `Password changed for ${u.username}`);
    setPwEdit(null);
  };

  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.username, u.email ?? "", u.subscription].some((field) => field.toLowerCase().includes(q)),
    );
  }, [users, search]);

  const shown = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    // Accounts with no date sort to the bottom whichever way round the list is,
    // rather than pretending the date is 1970 and burying real rows.
    const stamp = (v: string | null | undefined) => (v ? new Date(v).getTime() : Number.NaN);
    const byDate = (a: number, b: number) => {
      if (Number.isNaN(a) && Number.isNaN(b)) return 0;
      if (Number.isNaN(a)) return 1;
      if (Number.isNaN(b)) return -1;
      return factor * (a - b);
    };
    return [...matched].sort((a, b) => {
      switch (sort) {
        case "subscription":
          return factor * a.subscription.localeCompare(b.subscription);
        case "expiry":
          return byDate(stamp(a.expiry_date), stamp(b.expiry_date));
        case "lastLogin":
          return byDate(stamp(a.last_login_at), stamp(b.last_login_at));
        case "status":
          return factor * (Number(b.is_active) - Number(a.is_active));
        default:
          return factor * a.username.localeCompare(b.username);
      }
    });
  }, [matched, sort, sortDir]);

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  // Narrowing the search can leave the viewer on a page that no longer exists.
  // Fall back to the last real page instead of showing an empty one.
  const currentPage = Math.min(page, pageCount);
  const visible = useMemo(
    () => shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [shown, currentPage],
  );

  useEffect(() => {
    setPage(1);
  }, [search, sort, sortDir]);

  const adminCount = users.filter((u) => u.is_admin).length;
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
        description={`Signed in as ${user?.username ?? "admin"} · manage clients, access and site status`}
        icon={<ShieldCheck size={22} className="text-accent-cyan" />}
        iconColor="cyan"
      />

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
            <Button size="sm" variant="secondary" onClick={() => void saveSetting("announcement", ann)}>
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
            autoComplete="off"
            value={nu.username}
            onChange={(e) => setNu({ ...nu, username: e.target.value })}
          />
          <div className="relative">
            <input
              className={`${inputClass} pr-10`}
              type={showNewPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              value={nu.password}
              onChange={(e) => setNu({ ...nu, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
              tabIndex={-1}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
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
          <div className="flex flex-col justify-end gap-2 text-xs text-gray-400">
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
              Allow multiple devices
            </label>
          </div>
        </div>
        <Button icon={<UserPlus size={14} />} loading={creating} onClick={() => void handleCreate()}>
          Create account
        </Button>
      </Card>

      {/* Clients */}
      <SectionHeader title={`Clients (${users.length})`} />
      <Card variant="solid" padding="md" className="border-dark-600">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Search size={14} />
            </div>
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search by username, email or plan"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-500">
            {adminCount} administrator{adminCount === 1 ? "" : "s"} · {users.length} account
            {users.length === 1 ? "" : "s"}
          </p>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            Sort
            <select
              className={`${inputClass} w-auto py-1.5`}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="username">Username</option>
              <option value="subscription">Plan</option>
              <option value="expiry">Expiry date</option>
              <option value="lastLogin">Last login</option>
              <option value="status">Status</option>
            </select>
          </label>
          <Button
            size="sm"
            variant="secondary"
            icon={sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          >
            {sortDir === "asc" ? "Ascending" : "Descending"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={13} />}
            onClick={() => void refresh()}
          >
            Reload
          </Button>
        </div>
      </Card>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-500">
          {users.length === 0
            ? "No accounts exist yet. Create one above."
            : "No account matches that search."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((u) => (
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
                      {u.allow_multi_device ? "Multi-device" : "1 device"}
                    </Badge>
                    {u.hwid_locked && <Badge color="blue">HWID locked</Badge>}
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
                    icon={<RefreshCw size={13} />}
                    onClick={() => void patch(u.id, { resetHwid: true }, "Device reset")}
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
                        u.allow_multi_device ? "Locked to one device" : "Multi-device enabled",
                      )
                    }
                  >
                    {u.allow_multi_device ? "Lock to 1 device" : "Allow multi-device"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<KeyRound size={13} />}
                    onClick={() => setPwEdit(pwEdit?.id === u.id ? null : { id: u.id, value: "" })}
                  >
                    Password
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
                    onClick={() => setPendingDelete(u)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {pwEdit?.id === u.id && (
                <div className="mt-3 border-t border-dark-700 pt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="password"
                      autoFocus
                      autoComplete="new-password"
                      className={`${inputClass} max-w-xs`}
                      placeholder="New password (4+ characters)"
                      value={pwEdit.value}
                      onChange={(e) => setPwEdit({ id: u.id, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void savePassword(u);
                        if (e.key === "Escape") setPwEdit(null);
                      }}
                    />
                    <Button size="sm" icon={<Check size={13} />} onClick={() => void savePassword(u)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<X size={13} />}
                      onClick={() => setPwEdit(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Saving signs {u.username} out of every device.
                  </p>
                </div>
              )}
            </Card>
          ))}
          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, shown.length)} of {shown.length}
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Button size="sm" variant="secondary" onClick={() => setPage(currentPage - 1)}>
                    Previous
                  </Button>
                )}
                <span className="text-xs text-gray-500">
                  Page {currentPage} of {pageCount}
                </span>
                {currentPage < pageCount && (
                  <Button size="sm" variant="secondary" onClick={() => setPage(currentPage + 1)}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-dark-600 bg-dark-900 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-accent-red" />
              <div>
                <h3 className="text-sm font-semibold text-white break-all">
                  Delete {pendingDelete.username}?
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Their sign-in is revoked immediately and this cannot be undone.
                </p>
                {pendingDelete.is_admin && (
                  <p className="mt-2 text-xs text-accent-amber">
                    {adminCount <= 1
                      ? "This is the only administrator account. Deleting it leaves nobody able to reach this panel."
                      : "This account is an administrator."}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPendingDelete(null)}>
                Keep account
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={13} />}
                loading={deletingId === pendingDelete.id}
                onClick={() => void confirmDelete()}
              >
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
