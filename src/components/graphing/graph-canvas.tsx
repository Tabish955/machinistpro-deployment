import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { useGraphStore } from "@/lib/graphing/state/graph-store";
import { renderGraphScene, toWorldX, toWorldY, toScreenX, toScreenY } from "@/lib/graphing/renderer/canvas2d";
import { sampleFunctionY, sampleFunctionX, samplePolar, sampleParametric } from "@/lib/graphing/engine/sampler";
import { solveImplicitCurve, sampleInequalityRegion } from "@/lib/graphing/engine/implicit";
import { getTangentAndNormal } from "@/lib/graphing/engine/calculus";
import { fitRegression } from "@/lib/graphing/engine/regression";
import { parseExpression, compileFunction, buildEvaluationScope } from "@/lib/graphing/engine/compiler";
import type { Point2D, SliderItem, FunctionItem, TableItem } from "@/lib/graphing/types";

export function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    items,
    viewport: vp,
    settings,
    setViewport,
    zoomViewport,
    activeTrace,
    setActiveTrace,
    updateItem,
  } = useGraphStore();

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; vp: typeof vp }>({ x: 0, y: 0, vp });

  // 1. Build evaluation scope from variable sliders
  const scope = useMemo(() => {
    const varDefs = items
      .filter((it): it is SliderItem => it.type === "slider")
      .map((s) => ({ name: s.variableName, expr: String(s.value) }));
    return buildEvaluationScope(varDefs, [], settings.angleMode);
  }, [items, settings.angleMode]);

  // 2. Evaluate all visible graph items into curves, implicit contours, shaded areas, and markers
  const sceneData = useMemo(() => {
    const curves: Array<{ points: (Point2D | null)[]; color: string; lineWidth?: number; dash?: number[] }> = [];
    const implicitSegments: Array<{ segments: [Point2D, Point2D][]; color: string }> = [];
    const shadedPolygons: Array<{ points: Point2D[]; fillColor: string }> = [];
    const scatterSeries: Array<{ points: Point2D[]; color: string; joined?: boolean }> = [];
    const markers: Array<{ x: number; y: number; label?: string; kind: "root" | "min" | "max" | "intersection"; color?: string }> = [];

    for (const item of items) {
      if (!item.visible) continue;

      if (item.type === "function") {
        const raw = item.rawExpression?.trim();
        if (!raw) continue;

        try {
          const parsed = parseExpression(raw);
          if (parsed.kind === "function_y") {
            const fn = compileFunction(parsed.rightExpr || "0", ["x"], scope, settings.angleMode);
            const sample = sampleFunctionY(fn, vp.xMin, vp.xMax, vp.yMin, vp.yMax, parsed.domain);
            curves.push({ points: sample.points, color: item.color });

            // Add roots and extrema markers
            sample.roots.forEach((r) => markers.push({ x: r.x, y: r.y, kind: "root", color: "#10b981" }));
            sample.extrema.forEach((e) => markers.push({ x: e.x, y: e.y, kind: e.kind, color: e.kind === "max" ? "#f59e0b" : "#3b82f6" }));
          } else if (parsed.kind === "function_x") {
            const fn = compileFunction(parsed.rightExpr || "0", ["y"], scope, settings.angleMode);
            const sample = sampleFunctionX(fn, vp.yMin, vp.yMax, parsed.domain);
            curves.push({ points: sample.points, color: item.color });
          } else if (parsed.kind === "polar") {
            const fn = compileFunction(parsed.rightExpr || "0", ["theta", "t"], scope, settings.angleMode);
            const sample = samplePolar(fn, 0, Math.PI * 2, settings.angleMode);
            curves.push({ points: sample.points, color: item.color });
          } else if (parsed.kind === "parametric") {
            const fnX = compileFunction(parsed.leftExpr || "0", ["t"], scope, settings.angleMode);
            const fnY = compileFunction(parsed.rightExpr || "0", ["t"], scope, settings.angleMode);
            const sample = sampleParametric(fnX, fnY, 0, Math.PI * 2);
            curves.push({ points: sample.points, color: item.color });
          } else if (parsed.kind === "implicit") {
            const fn = compileFunction(`(${parsed.leftExpr || "0"}) - (${parsed.rightExpr || "0"})`, ["x", "y"], scope, settings.angleMode);
            const contour = solveImplicitCurve(fn, vp.xMin, vp.xMax, vp.yMin, vp.yMax);
            implicitSegments.push({ segments: contour.segments, color: item.color });
          } else if (parsed.kind === "inequality") {
            const fn = compileFunction(`(${parsed.leftExpr || "0"}) - (${parsed.rightExpr || "0"})`, ["x", "y"], scope, settings.angleMode);
            const ineq = sampleInequalityRegion(fn, parsed.inequalityOp || "<", vp.xMin, vp.xMax, vp.yMin, vp.yMax);
            if (ineq.boundary.length > 0) {
              curves.push({ points: ineq.boundary, color: item.color, dash: [4, 4] });
            }
          }
        } catch (err: any) {
          // Catch and record compilation error
          if (item.error !== err.message) {
            updateItem(item.id, { error: err.message });
          }
        }
      }

      if (item.type === "table") {
        const validPoints = (item as TableItem).rows
          .filter((r) => r.x !== null && r.y !== null)
          .map((r) => ({ x: r.x!, y: r.y! }));

        if (validPoints.length > 0) {
          scatterSeries.push({
            points: validPoints,
            color: item.color,
            joined: (item as TableItem).joinPoints,
          });

          // Render regression curve if enabled
          const tItem = item as TableItem;
          if (tItem.showRegressionLine && tItem.regressionModel && tItem.regressionModel !== "none" && validPoints.length >= 2) {
            try {
              const reg = fitRegression(validPoints, tItem.regressionModel, tItem.polynomialDegree || 2);
              const regSample = sampleFunctionY(reg.predict, vp.xMin, vp.xMax, vp.yMin, vp.yMax);
              curves.push({ points: regSample.points, color: item.color, lineWidth: 1.5, dash: [6, 4] });
            } catch {
              // Ignore regression fit error
            }
          }
        }
      }
    }

    return { curves, implicitSegments, shadedPolygons, scatterSeries, markers };
  }, [items, vp, scope, settings.angleMode, updateItem]);

  // 3. Render Canvas Frame
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

    // Compute tangent line for active trace point if trace is active
    let tracePointData = null;
    if (activeTrace) {
      let tangentLine = undefined;
      if (activeTrace.slope !== undefined && Number.isFinite(activeTrace.slope)) {
        const dx = (vp.xMax - vp.xMin) * 0.15;
        tangentLine = {
          p1: { x: activeTrace.x - dx, y: activeTrace.y - activeTrace.slope * dx },
          p2: { x: activeTrace.x + dx, y: activeTrace.y + activeTrace.slope * dx },
        };
      }
      tracePointData = {
        x: activeTrace.x,
        y: activeTrace.y,
        color: activeTrace.expressionLabel ? "#00d4ff" : "#f59e0b",
        tangentLine,
      };
    }

    renderGraphScene({
      ctx,
      width,
      height,
      dpr,
      viewport: vp,
      settings,
      curves: sceneData.curves,
      implicitSegments: sceneData.implicitSegments,
      shadedPolygons: sceneData.shadedPolygons,
      scatterSeries: sceneData.scatterSeries,
      markers: sceneData.markers,
      tracePoint: tracePointData,
    });
  }, [vp, settings, sceneData, activeTrace]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  // Resize handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      drawFrame();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawFrame]);

  // 4. Mouse / Touch Interactions (Pan & Zoom)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, vp: { ...vp } };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const spanX = dragStartRef.current.vp.xMax - dragStartRef.current.vp.xMin;
      const spanY = dragStartRef.current.vp.yMax - dragStartRef.current.vp.yMin;

      const worldDx = (dx / rect.width) * spanX;
      const worldDy = (dy / rect.height) * spanY;

      setViewport({
        xMin: dragStartRef.current.vp.xMin - worldDx,
        xMax: dragStartRef.current.vp.xMax - worldDx,
        yMin: dragStartRef.current.vp.yMin + worldDy,
        yMax: dragStartRef.current.vp.yMax + worldDy,
      });
      return;
    }

    // Trace calculation on hover
    const worldX = toWorldX(sx, vp, rect.width);
    const worldY = toWorldY(sy, vp, rect.height);

    // Find nearest function curve
    const activeFns = items.filter((it): it is FunctionItem => it.type === "function" && it.visible && Boolean(it.rawExpression));
    if (activeFns.length > 0) {
      try {
        const parsed = parseExpression(activeFns[0].rawExpression);
        if (parsed.kind === "function_y") {
          const fn = compileFunction(parsed.rightExpr || "0", ["x"], scope, settings.angleMode);
          const yVal = fn(worldX);
          if (Number.isFinite(yVal)) {
            const tangent = getTangentAndNormal(fn, worldX);
            setActiveTrace({
              x: worldX,
              y: yVal,
              slope: tangent.slope,
              tangentEquation: tangent.tangentEquation,
              normalEquation: tangent.normalEquation,
              expressionId: activeFns[0].id,
            });
            return;
          }
        }
      } catch {
        // Fallback
      }
    }

    // Default free cursor trace
    setActiveTrace({ x: worldX, y: worldY });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cursorX = toWorldX(e.clientX - rect.left, vp, rect.width);
    const cursorY = toWorldY(e.clientY - rect.top, vp, rect.height);

    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;

    const newXMin = cursorX - (cursorX - vp.xMin) * zoomFactor;
    const newXMax = cursorX + (vp.xMax - cursorX) * zoomFactor;
    const newYMin = cursorY - (cursorY - vp.yMin) * zoomFactor;
    const newYMax = cursorY + (vp.yMax - cursorY) * zoomFactor;

    setViewport({
      xMin: newXMin,
      xMax: newXMax,
      yMin: newYMin,
      yMax: newYMax,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setActiveTrace(null);
      }}
      onWheel={handleWheel}
      className="relative h-full w-full select-none overflow-hidden bg-[#0c0d14] cursor-crosshair"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
