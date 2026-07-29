import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/level";
export const Route = createFileRoute("/dashboard/level")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "Spirit Level | MachinistPro" }] }),
});
