import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/favorites";

export const Route = createFileRoute("/_authenticated/dashboard/favorites")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "Favorites | MachinistPro" }] }),
});
