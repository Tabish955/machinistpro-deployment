import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/contact";

export const Route = createFileRoute("/contact")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Contact | MachinistPro" }] }),
});
