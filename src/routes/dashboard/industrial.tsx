import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/industrial";
export const Route = createFileRoute("/dashboard/industrial")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "Industrial | MachinistPro" }] }),
});
