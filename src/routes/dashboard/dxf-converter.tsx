import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/dashboard/dxf-converter";

export const Route = createFileRoute("/dashboard/dxf-converter")({
  component: Page,
  ssr: false,
  head: () => ({ meta: [{ title: "DXF Workshop | MachinistPro" }] }),
});
