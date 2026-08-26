import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/complex";

export const Route = createFileRoute("/dashboard/complex")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Complex Calculator | MachinistPro" }] }),
});
