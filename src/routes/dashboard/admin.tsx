import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/admin";
export const Route = createFileRoute("/dashboard/admin")({
  component: Page,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel | MachinistPro" },
      {
        name: "description",
        content:
          "Manage MachinistPro client licences, device locks, maintenance mode and announcements.",
      },
      { property: "og:title", content: "Admin Panel | MachinistPro" },
      {
        property: "og:description",
        content:
          "Manage MachinistPro client licences, device locks, maintenance mode and announcements.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});
