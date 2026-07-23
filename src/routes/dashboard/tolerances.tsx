import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/tolerances";
export const Route = createFileRoute("/dashboard/tolerances")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "Tolerances | MachinistPro" }] }),
});
