import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/engineering";
export const Route = createFileRoute("/dashboard/engineering")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "Engineering | MachinistPro" }] }),
});
