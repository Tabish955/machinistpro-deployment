import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/history";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "History | MachinistPro" }] }),
});
