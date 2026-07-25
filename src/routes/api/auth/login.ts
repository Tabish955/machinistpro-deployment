import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "crypto";

interface MughalInitResponse { success: boolean; sessionid?: string; message?: string }
interface MughalLoginResponse {
  success: boolean; message?: string;
  info?: { username: string; subscriptions?: Array<{ subscription: string; expiry: string }> };
}

const API_URL = "https://api.mughalxcheat.xyz/api/1.2/index.php";

async function mughalInit() {
  const name = process.env.MUGHAL_APP_NAME || "MachinistPro";
  const ownerId = process.env.MUGHAL_OWNER_ID;
  const version = process.env.MUGHAL_VERSION || "1.0";
  if (!ownerId) return { success: false as const, error: "Server configuration error: Missing MUGHAL_OWNER_ID" };
  try {
    const params = new URLSearchParams({ type: "init", ver: version, name, ownerid: ownerId });
    const res = await fetch(`${API_URL}?${params.toString()}`, {
      method: "GET", headers: { "User-Agent": "MachinistPro/1.0", Accept: "application/json" },
    });
    const text = await res.text();
    let data: MughalInitResponse;
    try { data = JSON.parse(text) as MughalInitResponse; }
    catch { return { success: false as const, error: "Invalid response from authentication server" }; }
    if (data.success) return { success: true as const, sessionId: data.sessionid };
    return { success: false as const, error: data.message || "Initialization failed" };
  } catch { return { success: false as const, error: "Failed to connect to authentication server" }; }
}

async function mughalLogin(sessionId: string, username: string, password: string) {
  const ownerId = process.env.MUGHAL_OWNER_ID;
  const name = process.env.MUGHAL_APP_NAME || "MachinistPro";
  if (!ownerId) return { success: false as const, error: "Server configuration error" };
  // Mughal Auth requires HWID >= 20 characters
  const hwid = randomBytes(16).toString("hex"); // 32 chars
  try {
    const params = new URLSearchParams({
      type: "login", username, pass: password, sessionid: sessionId, name, ownerid: ownerId, hwid,
    });
    const res = await fetch(`${API_URL}?${params.toString()}`, {
      method: "GET", headers: { "User-Agent": "MachinistPro/1.0", Accept: "application/json" },
    });
    const text = await res.text();
    let data: MughalLoginResponse;
    try { data = JSON.parse(text) as MughalLoginResponse; }
    catch { return { success: false as const, error: "Invalid response from authentication server" }; }
    if (data.success && data.info) {
      const sub = data.info.subscriptions?.[0];
      return {
        success: true as const,
        username: data.info.username,
        subscription: sub?.subscription || "Standard",
        expiry: sub?.expiry || "",
      };
    }
    return { success: false as const, error: data.message || "Invalid username or password" };
  } catch { return { success: false as const, error: "Authentication request failed. Please try again." }; }
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { username?: string; password?: string };
          const { username, password } = body;
          if (!username?.trim()) return Response.json({ success: false, error: "Username is required" }, { status: 400 });
          if (!password) return Response.json({ success: false, error: "Password is required" }, { status: 400 });
          const init = await mughalInit();
          if (!init.success || !init.sessionId) {
            return Response.json({ success: false, error: init.error || "Authentication server unavailable" }, { status: 503 });
          }
          const login = await mughalLogin(init.sessionId, username.trim(), password);
          if (!login.success) {
            return Response.json({ success: false, error: login.error || "Invalid credentials" }, { status: 401 });
          }
          const sessionToken = randomBytes(32).toString("hex");
          return Response.json({
            success: true, sessionToken,
            username: login.username || username.trim(),
            subscription: login.subscription || "Standard",
            expiry: login.expiry || "",
          });
        } catch {
          return Response.json({ success: false, error: "An unexpected error occurred. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
