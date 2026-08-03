import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/workspace";
export const Route = createFileRoute("/dashboard/workspace")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Workspace | MachinistPro" }] }),
});
