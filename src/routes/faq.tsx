import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/faq";

export const Route = createFileRoute("/faq")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Faq | MachinistPro" }] }),
});
