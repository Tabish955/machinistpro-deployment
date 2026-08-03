import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { TrialBanner } from "@/components/trial-banner";
import { MaintenanceGate } from "@/components/site-notice";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ToastContainer } from "@/components/ui/toast";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <MaintenanceGate>
        <div className="flex min-h-screen bg-dark-950 gradient-bg">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
              <TrialBanner />
              {children}
            </main>
          </div>
          <BottomNav />
        </div>
      </MaintenanceGate>
      <ToastContainer />
    </ProtectedRoute>
  );
}
