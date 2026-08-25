import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Hexagon, LineChart } from "lucide-react";
import { GeometryWorkspace } from "@/components/geometry/geometry-workspace";
import { GraphingCalculator } from "@/components/graphing/graphing-calculator";

export default function GeometryPage() {
  const [activeMainTab, setActiveMainTab] = useState<"geometry" | "graphing">("geometry");

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-8">
      {/* Header with quick switch */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title={activeMainTab === "geometry" ? "Geometry Calculator" : "Graphing Calculator"}
          description={
            activeMainTab === "geometry"
              ? "Interactive 2D construction workbench, bolt circle PCD, CNC coordinates, arc & fillet solvers"
              : "Desmos-class function, polar, parametric, implicit curves, calculus, regressions, and 3D plotting"
          }
          icon={
            activeMainTab === "geometry" ? (
              <Hexagon size={22} className="text-accent-amber" />
            ) : (
              <LineChart size={22} className="text-accent-cyan" />
            )
          }
          iconColor={activeMainTab === "geometry" ? "amber" : "cyan"}
          status="available"
        />

        <div className="flex items-center gap-1.5 self-start sm:self-center rounded-2xl border border-white/[0.08] bg-dark-900/90 p-1">
          <button
            onClick={() => setActiveMainTab("geometry")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMainTab === "geometry"
                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Hexagon size={14} />
            <span>Geometry Suite</span>
          </button>

          <button
            onClick={() => setActiveMainTab("graphing")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMainTab === "graphing"
                ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_15px_rgba(0,212,255,0.15)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <LineChart size={14} />
            <span>Graphing Calculator</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeMainTab === "geometry" ? <GeometryWorkspace /> : <GraphingCalculator />}
    </div>
  );
}
