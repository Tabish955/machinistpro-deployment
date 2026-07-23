import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/terms";

export const Route = createFileRoute("/terms")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Terms | MachinistPro" }] }),
});
