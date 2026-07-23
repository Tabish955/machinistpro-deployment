import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { sessionToken?: string };
          if (body.sessionToken && body.sessionToken.length > 0) return Response.json({ valid: true });
          return Response.json({ valid: false }, { status: 401 });
        } catch {
          return Response.json({ valid: false }, { status: 401 });
        }
      },
    },
  },
});
