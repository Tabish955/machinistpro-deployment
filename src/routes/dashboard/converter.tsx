import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/converter";
export const Route = createFileRoute("/dashboard/converter")({
  component: Page, ssr: false,
  head: () => ({ meta: [{ title: "Converter | MachinistPro" }] }),
});
