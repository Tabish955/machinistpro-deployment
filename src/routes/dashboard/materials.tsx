import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/materials";
export const Route = createFileRoute("/dashboard/materials")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "Materials | MachinistPro" }] }),
});
