import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/electrical";
export const Route = createFileRoute("/dashboard/electrical")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Electrical | MachinistPro" }] }),
});
