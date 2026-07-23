import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/pricing";

export const Route = createFileRoute("/_authenticated/dashboard/pricing")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Pricing | MachinistPro" }] }),
});
