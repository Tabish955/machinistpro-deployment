import { useCallback, useEffect, useState } from "react";
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
  type AdminUserRow,
} from "@/lib/admin.functions";
import { ShieldCheck, UserPlus, RefreshCw, Trash2, Megaphone, Wrench, KeyRound } from "lucide-react";

const inputClass =
  "w-full rounded-xl bg-dark-900 border border-dark-600 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent-cyan";

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

  const [nu, setNu] = useState({
    username: "",
    password: "",
    email: "",
    subscription: "Standard",
    expiryDate: "",
    isAdmin: false,
    allowMultiDevice: false,
  });

  const [maint, setMaint] = useState({ enabled: false, message: "" });
  const [ann, setAnn] = useState({ enabled: false, message: "" });

  const refresh = useCallback(async () => {
    if (!token) return;
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
    } catch {
      setDenied(true);
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
      setNu({
        username: "",
        password: "",
        email: "",
        subscription: "Standard",
        expiryDate: "",
        isAdmin: false,
        allowMultiDevice: false,
      });
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

  const saveSetting = async (key: "maintenance" | "announcement", v: { enabled: boolean; message: string }) => {
    if (!token) return;
    const r = await setSetting({ data: { sessionToken: token, key, ...v } });
    if (r.ok) toast.success("Saved", key === "maintenance" ? "Maintenance mode updated." : "Announcement updated.");
    else toast.error("Save failed", r.error);
  };

  const handleResetPassword = async (u: AdminUserRow) => {
    const pw = prompt(`New password for ${u.username}:`);
    if (!pw || pw.length < 4) return;
    await patch(u.id, { password: pw }, "Password changed");
  };

  if (denied) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <ShieldCheck size={40} className="mx-auto text-accent-red" />
        <h1 className="text-xl font-semibold text-white">Administrators only</h1>
        <p className="text-sm text-gray-400">
          This area is restricted. Sign in with an administrator account to continue.
        </p>
        <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
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
            <Button size="sm" variant="secondary" onClick={() => void saveSetting("maintenance", maint)}>
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
            value={nu.username}
            onChange={(e) => setNu({ ...nu, username: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Password"
            value={nu.password}
            onChange={(e) => setNu({ ...nu, password: e.target.value })}
          />
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
        <Button icon={<UserPlus size={14} />} onClick={() => void handleCreate()}>
          Create account
        </Button>
      </Card>

      {/* Clients */}
      <SectionHeader title={`Clients (${users.length})`} />
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
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
                    {u.expiry_date ? ` · expires ${new Date(u.expiry_date).toLocaleDateString()}` : " · no expiry"}
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
                    onClick={() => void handleResetPassword(u)}
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
                    onClick={() => void handleDelete(u)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
