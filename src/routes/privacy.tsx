import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/privacy";

export const Route = createFileRoute("/privacy")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Privacy | MachinistPro" }] }),
});
