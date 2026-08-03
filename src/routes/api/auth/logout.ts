import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { revokeSession } from "@/lib/session-server";

const bodySchema = z.object({ sessionToken: z.string().min(1) });

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, reason: "bad_request" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ success: false, reason: "bad_request" }, { status: 400 });
        }
        try {
          const revoked = await revokeSession(parsed.data.sessionToken);
          return Response.json({ success: true, revoked });
        } catch (err) {
          console.error("[/api/auth/logout] revokeSession failed:", err);
          return Response.json({ success: false, reason: "internal" }, { status: 500 });
        }
      },
    },
  },
});
