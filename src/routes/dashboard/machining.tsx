import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/machining";
export const Route = createFileRoute("/dashboard/machining")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Machining | MachinistPro" }] }),
});
