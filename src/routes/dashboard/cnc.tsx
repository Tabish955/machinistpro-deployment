import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/cnc";
export const Route = createFileRoute("/dashboard/cnc")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "CNC Cycles | MachinistPro" }] }),
});
