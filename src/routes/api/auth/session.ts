import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { validateSession } from "@/lib/session-server";

const bodySchema = z.object({ sessionToken: z.string().min(1) });

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ valid: false, reason: "bad_request" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ valid: false, reason: "bad_request" }, { status: 400 });
        }
        try {
          const session = await validateSession(parsed.data.sessionToken);
          if (!session) {
            return Response.json({ valid: false }, { status: 401 });
          }
          return Response.json({
            valid: true,
            user: {
              username: session.username,
              subscription: session.subscription,
              expiry: session.expiry,
              isTrial: session.isTrial,
              isAdmin: session.isAdmin,
            },
            expiresAt: session.expiresAt,
          });
        } catch (err) {
          console.error("[/api/auth/session] failed:", err);
          return Response.json({ valid: false, reason: "internal" }, { status: 500 });
        }
      },
    },
  },
});
