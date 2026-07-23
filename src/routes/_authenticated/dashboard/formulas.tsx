import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/formulas";

export const Route = createFileRoute("/_authenticated/dashboard/formulas")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Formulas | MachinistPro" }] }),
});
