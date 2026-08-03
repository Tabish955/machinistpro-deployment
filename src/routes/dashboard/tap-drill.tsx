import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/tap-drill";
export const Route = createFileRoute("/dashboard/tap-drill")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Tap Drill Chart | MachinistPro" }] }),
});
