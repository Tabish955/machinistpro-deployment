import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/geometry";
export const Route = createFileRoute("/dashboard/geometry")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Geometry | MachinistPro" }] }),
});
