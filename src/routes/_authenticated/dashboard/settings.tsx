import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/settings";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Settings | MachinistPro" }] }),
});
