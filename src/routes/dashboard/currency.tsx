import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/currency";

export const Route = createFileRoute("/dashboard/currency")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Currency & Forex Rates | MachinistPro" }] }),
});
