import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/scientific";

export const Route = createFileRoute("/_authenticated/dashboard/scientific")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Scientific | MachinistPro" }] }),
});
