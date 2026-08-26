import React, { useRef, useState, useMemo } from "react";
import { evaluate } from "mathjs";
import { formatNum } from "@/lib/calculator/complex-engine";

interface EquationCurvePlotProps {
  expression: string; // e.g. "x^2 - 5x + 6"
  roots?: number[]; // list of real root x coordinates
  vertex?: { x: number; y: number };
  xRange?: [number, number];
  className?: string;
}

export function EquationCurvePlot({
  expression,
  roots = [],
  vertex,
  xRange = [-6, 6],
  className = "",
}: EquationCurvePlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const width = 560;
  const height = 260;
  const padding = 25;

  const [minX, maxX] = xRange;

  // Evaluate curve points
  const { pathD, points, minY, maxY } = useMemo(() => {
    if (!expression) return { pathD: "", points: [], minY: -10, maxY: 10 };

    const cleanExpr = expression
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-");

    const sampleCount = 120;
    const step = (maxX - minX) / sampleCount;
    const pts: { x: number; y: number; px: number; py: number }[] = [];

    let rawMinY = Infinity;
    let rawMaxY = -Infinity;

    for (let i = 0; i <= sampleCount; i++) {
      const x = minX + i * step;
      try {
        const y = evaluate(cleanExpr, { x, e: Math.E, pi: Math.PI });
        if (typeof y === "number" && Number.isFinite(y)) {
          pts.push({ x, y, px: 0, py: 0 });
          if (y < rawMinY) rawMinY = y;
          if (y > rawMaxY) rawMaxY = y;
        }
      } catch {}
    }

    if (rawMinY === Infinity || rawMaxY === -Infinity) {
      rawMinY = -10;
      rawMaxY = 10;
    }

    // Clamp Y range for visual stability
    const boundedMinY = Math.max(-40, Math.min(rawMinY, -2));
    const boundedMaxY = Math.min(40, Math.max(rawMaxY, 2));
    const ySpan = boundedMaxY - boundedMinY || 1;
    const xSpan = maxX - minX || 1;

    const plotW = width - 2 * padding;
    const plotH = height - 2 * padding;

    pts.forEach((p) => {
      p.px = padding + ((p.x - minX) / xSpan) * plotW;
      p.py = padding + plotH - ((p.y - boundedMinY) / ySpan) * plotH;
    });

    let d = "";
    pts.forEach((p, idx) => {
      if (idx === 0) d += `M ${p.px.toFixed(2)} ${p.py.toFixed(2)}`;
      else d += ` L ${p.px.toFixed(2)} ${p.py.toFixed(2)}`;
    });

    return { pathD: d, points: pts, minY: boundedMinY, maxY: boundedMaxY };
  }, [expression, minX, maxX]);

  // Coordinate transforms
  const toPxX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  const toPxY = (y: number) => padding + (height - 2 * padding) - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

  const originX = toPxX(0);
  const originY = toPxY(0);

  // Mouse hover scrubber
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const mathX = minX + ((relX - padding) / (width - 2 * padding)) * (maxX - minX);
    setHoverX(Math.max(minX, Math.min(maxX, mathX)));
  };

  const hoveredY = useMemo(() => {
    if (hoverX === null) return null;
    try {
      const cleanExpr = expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
      const y = evaluate(cleanExpr, { x: hoverX, e: Math.E, pi: Math.PI });
      return typeof y === "number" && Number.isFinite(y) ? y : null;
    } catch {
      return null;
    }
  }, [hoverX, expression]);

  return (
    <div className={`relative rounded-2xl border border-white/[0.08] bg-dark-950 p-2 shadow-2xl overflow-hidden ${className}`}>
      {/* Top Readout HUD */}
      <div className="absolute right-3 top-3 z-10 rounded-xl border border-white/10 bg-dark-900/90 px-3 py-1 text-xs font-mono backdrop-blur-md shadow-lg">
        {hoverX !== null && hoveredY !== null ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">x: <strong className="text-white">{formatNum(hoverX, 2)}</strong></span>
            <span className="text-gray-500">|</span>
            <span className="text-accent-cyan">f(x): <strong className="text-cyan-300">{formatNum(hoveredY, 3)}</strong></span>
          </div>
        ) : (
          <span className="text-gray-500">Hover graph to trace f(x)</span>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverX(null)}
        className="w-full h-56 select-none cursor-crosshair rounded-xl"
      >
        <defs>
          <linearGradient id="curve-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Axes */}
        {originY >= padding && originY <= height - padding && (
          <line
            x1={padding}
            y1={originY}
            x2={width - padding}
            y2={originY}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1.5"
          />
        )}
        {originX >= padding && originX <= width - padding && (
          <line
            x1={originX}
            y1={padding}
            x2={originX}
            y2={height - padding}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1.5"
          />
        )}

        {/* Function Curve */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Roots on x-axis */}
        {roots.map((rx, idx) => {
          if (rx < minX || rx > maxX) return null;
          const px = toPxX(rx);
          const py = originY >= padding && originY <= height - padding ? originY : toPxY(0);
          return (
            <g key={`root-${idx}`}>
              <circle cx={px} cy={py} r="6" fill="#10b981" />
              <circle cx={px} cy={py} r="2.5" fill="#ffffff" />
              <text
                x={px}
                y={py - 9}
                fill="#34d399"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                x={formatNum(rx, 2)}
              </text>
            </g>
          );
        })}

        {/* Vertex (if quadratic) */}
        {vertex && vertex.x >= minX && vertex.x <= maxX && (
          <g>
            <circle cx={toPxX(vertex.x)} cy={toPxY(vertex.y)} r="5" fill="#f59e0b" />
            <text
              x={toPxX(vertex.x)}
              y={toPxY(vertex.y) + (vertex.y < 0 ? 14 : -9)}
              fill="#fbbf24"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="middle"
            >
              Vertex ({formatNum(vertex.x, 1)}, {formatNum(vertex.y, 1)})
            </text>
          </g>
        )}

        {/* Scrubber Line */}
        {hoverX !== null && hoveredY !== null && (
          <g>
            <line
              x1={toPxX(hoverX)}
              y1={padding}
              x2={toPxX(hoverX)}
              y2={height - padding}
              stroke="rgba(6, 182, 212, 0.5)"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
            <circle
              cx={toPxX(hoverX)}
              cy={toPxY(hoveredY)}
              r="4.5"
              fill="#06b6d4"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
