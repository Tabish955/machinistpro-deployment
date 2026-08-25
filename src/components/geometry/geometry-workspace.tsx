import React, { useState, useMemo } from "react";
import {
  Hexagon,
  PenTool,
  CircleDot,
  Compass,
  Triangle,
  Sparkles,
  Cpu,
  Layers,
} from "lucide-react";
import { GeometryEngine } from "@/lib/geometry/interactive/engine";
import { exportSceneToDXF } from "@/lib/geometry/export/dxf-export";
import { ConstructionToolbar } from "./construction-toolbar";
import { MeasurementPanel } from "./measurement-panel";
import { InteractiveCanvas } from "./interactive-canvas";
import { BoltCircleTool } from "./engineering/bolt-circle-tool";
import { CncCoordTool } from "./engineering/cnc-coord-tool";
import { ArcSolverTool } from "./engineering/arc-solver-tool";
import { FilletChamferTool } from "./engineering/fillet-chamfer-tool";
import { TriangleSolverTool } from "./engineering/triangle-solver-tool";
import { ToolpathVisualizer } from "./engineering/toolpath-visualizer";
import { StandardShapesTool } from "./standard-shapes-tool";
import type { ConstructionTool, InteractiveGeometryScene } from "@/lib/geometry/types";

type GeometryTab =
  "workbench" | "pcd" | "cnc_coord" | "arc" | "fillet_chamfer" | "triangle" | "toolpath" | "shapes";

export function GeometryWorkspace() {
  const [tab, setTab] = useState<GeometryTab>("workbench");
  const [activeTool, setActiveTool] = useState<ConstructionTool>("select");

  // Single interactive engine instance
  const engine = useMemo(() => {
    const e = new GeometryEngine();
    // Default initial demonstration triangle
    const p1 = e.addPoint(-20, -15, "A");
    const p2 = e.addPoint(25, -15, "B");
    const p3 = e.addPoint(0, 20, "C");
    e.addSegment(p1.id, p2.id);
    e.addSegment(p2.id, p3.id);
    e.addSegment(p3.id, p1.id);
    e.addPolygon([p1.id, p2.id, p3.id]);
    return e;
  }, []);

  const [sceneState, setSceneState] = useState<InteractiveGeometryScene>(engine.getScene());

  const handleClear = () => {
    engine.clear();
    setSceneState({ ...engine.getScene() });
  };

  const handleRotate = () => {
    engine.rotateAll({ x: 0, y: 0 }, 45);
    setSceneState({ ...engine.getScene() });
  };

  const handleTranslate = () => {
    engine.translateAll(5, 5);
    setSceneState({ ...engine.getScene() });
  };

  const handleExportDXF = () => {
    exportSceneToDXF(sceneState, "machinistpro-construction.dxf");
  };

  const navTabs: Array<{ id: GeometryTab; label: string; icon: React.ReactNode }> = [
    { id: "workbench", label: "Interactive 2D Canvas", icon: <PenTool size={14} /> },
    { id: "pcd", label: "Bolt Circle (PCD)", icon: <CircleDot size={14} /> },
    { id: "cnc_coord", label: "CNC Coordinates", icon: <Compass size={14} /> },
    { id: "arc", label: "Arc & Sagitta", icon: <Layers size={14} /> },
    { id: "fillet_chamfer", label: "Fillet & Chamfer", icon: <Sparkles size={14} /> },
    { id: "triangle", label: "Triangle Solver", icon: <Triangle size={14} /> },
    { id: "toolpath", label: "Toolpath Visualizer", icon: <Cpu size={14} /> },
    { id: "shapes", label: "2D / 3D Shapes", icon: <Hexagon size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Navigation Sub-Header */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {navTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              tab === t.id
                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                : "bg-dark-800/60 text-gray-400 border border-white/5 hover:text-white hover:bg-dark-800"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Interactive 2D Construction Workbench */}
      {tab === "workbench" && (
        <div className="flex h-[calc(100vh-140px)] min-h-[560px] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-dark-900 shadow-2xl">
          <ConstructionToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onRotate={handleRotate}
            onTranslate={handleTranslate}
            onExportDXF={handleExportDXF}
            onClear={handleClear}
          />
          <div className="flex flex-1 overflow-hidden">
            <div className="relative flex-1">
              <InteractiveCanvas
                engine={engine}
                activeTool={activeTool}
                onSceneChange={(newScene) => setSceneState({ ...newScene })}
              />
            </div>
            <div className="w-72 sm:w-80 shrink-0 border-l border-white/[0.08] hidden md:block">
              <MeasurementPanel scene={sceneState} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bolt Circle PCD */}
      {tab === "pcd" && <BoltCircleTool />}

      {/* Tab 3: CNC Coordinates */}
      {tab === "cnc_coord" && <CncCoordTool />}

      {/* Tab 4: Arc & Sagitta */}
      {tab === "arc" && <ArcSolverTool />}

      {/* Tab 5: Fillet & Chamfer */}
      {tab === "fillet_chamfer" && <FilletChamferTool />}

      {/* Tab 6: Triangle Solver */}
      {tab === "triangle" && <TriangleSolverTool />}

      {/* Tab 7: Toolpath Visualizer */}
      {tab === "toolpath" && <ToolpathVisualizer />}

      {/* Tab 8: Standard 2D / 3D Shapes */}
      {tab === "shapes" && <StandardShapesTool />}
    </div>
  );
}
