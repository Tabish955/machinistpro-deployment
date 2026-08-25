import React, { useRef, useEffect, useState, useCallback } from "react";
import { GeometryEngine } from "@/lib/geometry/interactive/engine";
import { renderInteractiveGeometry } from "@/lib/geometry/interactive/renderer";
import { findSnapTarget } from "@/lib/geometry/interactive/snapping";
import { toWorldX, toWorldY, toScreenX, toScreenY } from "@/lib/graphing/renderer/canvas2d";
import type { ConstructionTool, GeoPoint, SnapTarget, InteractiveGeometryScene } from "@/lib/geometry/types";
import type { Viewport } from "@/lib/graphing/types";

interface InteractiveCanvasProps {
  engine: GeometryEngine;
  activeTool: ConstructionTool;
  onSceneChange: (scene: InteractiveGeometryScene) => void;
}

export function InteractiveCanvas({
  engine,
  activeTool,
  onSceneChange,
}: InteractiveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<Viewport>({
    xMin: -50,
    xMax: 50,
    yMin: -40,
    yMax: 40,
    aspectLocked: true,
  });

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [snapTarget, setSnapTarget] = useState<SnapTarget | null>(null);
  const [activePoints, setActivePoints] = useState<GeoPoint[]>([]);

  const isDraggingPointRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, vp: viewport });

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    renderInteractiveGeometry({
      ctx,
      width,
      height,
      dpr,
      viewport,
      scene: engine.getScene(),
      selectedPointId,
      hoveredPointId,
      snapTarget,
      activeConstructionPoints: activePoints,
    });
  }, [viewport, engine, selectedPointId, hoveredPointId, snapTarget, activePoints]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  // Resize handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => drawFrame());
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawFrame]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Right click or middle click -> Pan
    if (e.button === 1 || e.button === 2) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, vp: { ...viewport } };
      return;
    }

    if (e.button !== 0) return;

    // Check if clicked an existing point
    const scene = engine.getScene();
    const clickedPt = scene.points.find((p) => {
      const px = toScreenX(p.x, viewport, rect.width);
      const py = toScreenY(p.y, viewport, rect.height);
      return Math.hypot(sx - px, sy - py) < 12;
    });

    if (activeTool === "select") {
      if (clickedPt) {
        setSelectedPointId(clickedPt.id);
        isDraggingPointRef.current = true;
      } else {
        // Pan on empty space drag
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY, vp: { ...viewport } };
      }
      return;
    }

    // Determine coordinate using snapping
    const worldPos = {
      x: toWorldX(sx, viewport, rect.width),
      y: toWorldY(sy, viewport, rect.height),
    };

    const snap = findSnapTarget(worldPos, {
      points: scene.points,
      segments: scene.segments,
      lines: scene.lines,
      circles: scene.circles,
      gridSize: 5,
      screenToWorld: (px, py) => ({ x: toWorldX(px, viewport, rect.width), y: toWorldY(py, viewport, rect.height) }),
      worldToScreen: (wx, wy) => ({ x: toScreenX(wx, viewport, rect.width), y: toScreenY(wy, viewport, rect.height) }),
    });

    const targetPt = clickedPt || engine.addPoint(snap.x, snap.y);

    if (activeTool === "point") {
      onSceneChange(engine.getScene());
      drawFrame();
      return;
    }

    if (activeTool === "segment") {
      if (activePoints.length === 0) {
        setActivePoints([targetPt]);
      } else {
        engine.addSegment(activePoints[0].id, targetPt.id);
        setActivePoints([]);
        onSceneChange(engine.getScene());
      }
      drawFrame();
      return;
    }

    if (activeTool === "circle_center_point") {
      if (activePoints.length === 0) {
        setActivePoints([targetPt]);
      } else {
        engine.addCircle(activePoints[0].id, targetPt.id);
        setActivePoints([]);
        onSceneChange(engine.getScene());
      }
      drawFrame();
      return;
    }

    if (activeTool === "polygon") {
      if (activePoints.length >= 2 && clickedPt && clickedPt.id === activePoints[0].id) {
        // Close polygon
        engine.addPolygon(activePoints.map((p) => p.id));
        setActivePoints([]);
        onSceneChange(engine.getScene());
      } else {
        setActivePoints([...activePoints, targetPt]);
      }
      drawFrame();
      return;
    }

    if (activeTool === "midpoint") {
      if (activePoints.length === 0) {
        setActivePoints([targetPt]);
      } else {
        const p1 = activePoints[0];
        const p2 = targetPt;
        engine.addPoint((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, "M");
        setActivePoints([]);
        onSceneChange(engine.getScene());
      }
      drawFrame();
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const spanX = panStartRef.current.vp.xMax - panStartRef.current.vp.xMin;
      const spanY = panStartRef.current.vp.yMax - panStartRef.current.vp.yMin;

      setViewport({
        ...viewport,
        xMin: panStartRef.current.vp.xMin - (dx / rect.width) * spanX,
        xMax: panStartRef.current.vp.xMax - (dx / rect.width) * spanX,
        yMin: panStartRef.current.vp.yMin + (dy / rect.height) * spanY,
        yMax: panStartRef.current.vp.yMax + (dy / rect.height) * spanY,
      });
      return;
    }

    if (isDraggingPointRef.current && selectedPointId) {
      const wx = toWorldX(sx, viewport, rect.width);
      const wy = toWorldY(sy, viewport, rect.height);
      engine.updatePoint(selectedPointId, wx, wy);
      onSceneChange(engine.getScene());
      drawFrame();
      return;
    }

    // Hover & Snapping calculation
    const worldPos = {
      x: toWorldX(sx, viewport, rect.width),
      y: toWorldY(sy, viewport, rect.height),
    };

    const scene = engine.getScene();
    const hover = scene.points.find((p) => {
      const px = toScreenX(p.x, viewport, rect.width);
      const py = toScreenY(p.y, viewport, rect.height);
      return Math.hypot(sx - px, sy - py) < 12;
    });
    setHoveredPointId(hover ? hover.id : null);

    const snap = findSnapTarget(worldPos, {
      points: scene.points,
      segments: scene.segments,
      lines: scene.lines,
      circles: scene.circles,
      gridSize: 5,
      screenToWorld: (px, py) => ({ x: toWorldX(px, viewport, rect.width), y: toWorldY(py, viewport, rect.height) }),
      worldToScreen: (wx, wy) => ({ x: toScreenX(wx, viewport, rect.width), y: toScreenY(wy, viewport, rect.height) }),
    });
    setSnapTarget(snap);
  };

  const handleMouseUp = () => {
    isDraggingPointRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.85;
    const cx = (viewport.xMin + viewport.xMax) / 2;
    const cy = (viewport.yMin + viewport.yMax) / 2;
    const hx = ((viewport.xMax - viewport.xMin) * factor) / 2;
    const hy = ((viewport.yMax - viewport.yMin) * factor) / 2;

    setViewport({
      ...viewport,
      xMin: cx - hx,
      xMax: cx + hx,
      yMin: cy - hy,
      yMax: cy + hy,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-full w-full select-none overflow-hidden bg-[#0c0d14] cursor-crosshair"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
