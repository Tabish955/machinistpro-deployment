import { createFileRoute } from "@tanstack/react-router";
import DxfConverterPage from "@/pages/dashboard/dxf-converter";

function LocalDxfWorkshop() {
  if (!import.meta.env.DEV) return null;

  return (
    <main className="min-h-screen bg-dark-950 gradient-bg p-4 lg:p-6">
      <DxfConverterPage />
    </main>
  );
}

export const Route = createFileRoute("/local/dxf-workshop")({
  component: LocalDxfWorkshop,
  ssr: false,
  head: () => ({ meta: [{ title: "Local CAD Converter | MachinistPro" }] }),
});
