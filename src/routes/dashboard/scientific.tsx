import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/scientific";
export const Route = createFileRoute("/dashboard/scientific")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "Calculator | MachinistPro" }] }),
});
