import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/weight";
export const Route = createFileRoute("/dashboard/weight")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Weight | MachinistPro" }] }),
});
