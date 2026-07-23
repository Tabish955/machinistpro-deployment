import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/index";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard | MachinistPro" }] }),
});
