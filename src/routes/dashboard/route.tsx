import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashboardLayout from "@/pages/dashboard/layout";

function DashboardShell() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardShell,
  ssr: false,
});
