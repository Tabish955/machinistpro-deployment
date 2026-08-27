import React, { useRef, useState, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Eye, Compass, Layers } from "lucide-react";
import { formatNum, type ComplexRoot } from "@/lib/calculator/complex-engine";

interface ComplexArgandPlaneProps {
  real: number;
  imag: number;
  onChange?: (real: number, imag: number) => void;
  roots?: ComplexRoot[];
  showConjugate?: boolean;
  showReciprocal?: boolean;
  showUnitCircle?: boolean;
  className?: string;
}

export function ComplexArgandPlane({
  real,
  imag,
  onChange,
  roots,
  showConjugate = true,
  showReciprocal = false,
  showUnitCircle = true,
  className = "",
}: ComplexArgandPlaneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(32); // pixels per unit
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const width = 580;
  const height = 360;
  const centerX = width / 2 + offset.x;
  const centerY = height / 2 + offset.y;

  // Vector Pixel Position
  const zPixX = centerX + real * scale;
  const zPixY = centerY - imag * scale;

  // Polar details
  const modulus = Math.hypot(real, imag);
  const angleRad = Math.atan2(imag, real);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Grid Ticks
  const maxUnits = Math.ceil(Math.max(width, height) / (2 * scale)) + 2;
  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let i = -maxUnits; i <= maxUnits; i++) {
      if (i !== 0) list.push(i);
    }
    return list;
  }, [maxUnits]);

  // Pointer drag handler
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * width;
    const clickY = ((e.clientY - rect.top) / rect.height) * height;

    const distToZ = Math.hypot(clickX - zPixX, clickY - zPixY);
    if (distToZ < 30 && onChange) {
      setIsDragging(true);
      svg.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !onChange || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const currX = ((e.clientX - rect.left) / rect.width) * width;
    const currY = ((e.clientY - rect.top) / rect.height) * height;

    const newReal = parseFloat(((currX - centerX) / scale).toFixed(2));
    const newImag = parseFloat(((centerY - currY) / scale).toFixed(2));
    onChange(newReal, newImag);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Angle Arc Path
  const arcRadius = Math.min(36, Math.max(18, modulus * scale * 0.45));
  const arcStartX = centerX + arcRadius;
  const arcStartY = centerY;
  const arcEndX = centerX + arcRadius * Math.cos(-angleRad);
  const arcEndY = centerY + arcRadius * Math.sin(-angleRad);
  const largeArcFlag = Math.abs(angleRad) > Math.PI ? 1 : 0;
  const sweepFlag = angleRad >= 0 ? 0 : 1;
  const arcPath =
    modulus > 0.1
      ? `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY}`
      : "";

  return (
    <div className={`relative rounded-2xl border border-white/[0.08] bg-dark-950 p-2 shadow-2xl overflow-hidden min-w-0 w-full ${className}`}>
      {/* Top Floating Controls Bar */}
      <div className="absolute left-2 sm:left-4 top-2 sm:top-4 z-10 flex items-center gap-1 sm:gap-1.5 rounded-xl border border-white/10 bg-dark-900/90 p-1 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(90, s * 1.25))}
          className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition"
          title="Zoom In"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(12, s * 0.8))}
          className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition"
          title="Zoom Out"
        >
          <ZoomOut size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            setOffset({ x: 0, y: 0 });
            setScale(32);
          }}
          className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition"
          title="Reset View"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Floating HUD Pill */}
      <div className="absolute right-2 sm:right-4 top-2 sm:top-4 z-10 max-w-[55%] sm:max-w-none rounded-xl border border-cyan-500/30 bg-dark-900/95 px-2 sm:px-3 py-1 sm:py-1.5 backdrop-blur-md shadow-xl text-[10px] sm:text-xs font-mono truncate">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-accent-cyan animate-pulse shrink-0" />
          <span className="font-bold text-white truncate">
            {formatNum(real)} {imag >= 0 ? "+" : "−"} {formatNum(Math.abs(imag))}i
          </span>
          <span className="text-gray-500 hidden sm:inline">|</span>
          <span className="text-accent-cyan hidden sm:inline">{formatNum(modulus)} ∠ {formatNum(angleDeg)}°</span>
        </div>
      </div>

      {/* SVG Interactive Argand Plane */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-56 sm:h-80 select-none cursor-crosshair rounded-xl bg-radial from-dark-900/50 to-dark-950 touch-none max-w-full"
      >
        <defs>
          {/* Arrowhead Marker */}
          <marker
            id="cyan-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
          </marker>
          <marker
            id="amber-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>
          <radialGradient id="vector-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Grid Lines */}
        {ticks.map((t) => (
          <g key={`grid-${t}`}>
            <line
              x1={centerX + t * scale}
              y1={0}
              x2={centerX + t * scale}
              y2={height}
              stroke="rgba(255, 255, 255, 0.035)"
              strokeWidth="1"
            />
            <line
              x1={0}
              y1={centerY - t * scale}
              x2={width}
              y2={centerY - t * scale}
              stroke="rgba(255, 255, 255, 0.035)"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* 2. Concentric Radius Rings */}
        {showUnitCircle && (
          <>
            <circle
              cx={centerX}
              cy={centerY}
              r={scale}
              fill="none"
              stroke="rgba(6, 182, 212, 0.25)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {modulus > 0.2 && (
              <circle
                cx={centerX}
                cy={centerY}
                r={modulus * scale}
                fill="none"
                stroke="rgba(245, 158, 11, 0.15)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}
          </>
        )}

        {/* 3. Coordinate Axes */}
        <line
          x1={0}
          y1={centerY}
          x2={width}
          y2={centerY}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
        />
        <line
          x1={centerX}
          y1={0}
          x2={centerX}
          y2={height}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
        />

        {/* Axis Labels */}
        <text
          x={width - 55}
          y={centerY - 8}
          fill="rgba(156, 163, 175, 0.7)"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          Re (Real)
        </text>
        <text
          x={centerX + 8}
          y={16}
          fill="rgba(156, 163, 175, 0.7)"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          Im (Imag)
        </text>

        {/* Axis Number Ticks */}
        {ticks
          .filter((t) => Math.abs(t) <= 10 && t % 2 === 0)
          .map((t) => (
            <g key={`num-${t}`}>
              <text
                x={centerX + t * scale}
                y={centerY + 14}
                fill="rgba(156, 163, 175, 0.4)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {t}
              </text>
              <text
                x={centerX + 6}
                y={centerY - t * scale + 3}
                fill="rgba(156, 163, 175, 0.4)"
                fontSize="9"
                fontFamily="monospace"
              >
                {t}i
              </text>
            </g>
          ))}

        {/* 4. De Moivre Roots Polygon */}
        {roots && roots.length > 1 && (
          <g>
            <polygon
              points={roots
                .map((r) => `${centerX + r.real * scale},${centerY - r.imag * scale}`)
                .join(" ")}
              fill="rgba(168, 85, 247, 0.08)"
              stroke="rgba(168, 85, 247, 0.5)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {roots.map((r) => {
              const rx = centerX + r.real * scale;
              const ry = centerY - r.imag * scale;
              return (
                <g key={`root-${r.k}`}>
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={rx}
                    y2={ry}
                    stroke="rgba(168, 85, 247, 0.4)"
                    strokeWidth="1"
                  />
                  <circle cx={rx} cy={ry} r="4.5" fill="#c084fc" />
                  <circle cx={rx} cy={ry} r="2" fill="#ffffff" />
                  <text
                    x={rx + 6}
                    y={ry - 6}
                    fill="#e9d5ff"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    w{r.k}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* 5. Conjugate Vector (z*) */}
        {showConjugate && Math.abs(imag) > 0.05 && (
          <g>
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + real * scale}
              y2={centerY - -imag * scale}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              markerEnd="url(#amber-arrow)"
            />
            <circle
              cx={centerX + real * scale}
              cy={centerY - -imag * scale}
              r="4"
              fill="#f59e0b"
            />
          </g>
        )}

        {/* 6. Angle Arc */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke="rgba(6, 182, 212, 0.6)"
            strokeWidth="1.5"
          />
        )}

        {/* 7. Primary Vector z */}
        <line
          x1={centerX}
          y1={centerY}
          x2={zPixX}
          y2={zPixY}
          stroke="#06b6d4"
          strokeWidth="2.5"
          markerEnd="url(#cyan-arrow)"
        />

        {/* Glowing Head & Draggable Pin */}
        <circle cx={zPixX} cy={zPixY} r="14" fill="url(#vector-glow)" />
        <circle
          cx={zPixX}
          cy={zPixY}
          r="6.5"
          fill="#06b6d4"
          stroke="#ffffff"
          strokeWidth="2"
          className="cursor-pointer transition-transform hover:scale-125 active:scale-95"
        />
      </svg>

      {/* Clean Bottom Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5 px-3 text-[11px] font-mono text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-cyan" />
            <span className="text-gray-300">Vector z (Active)</span>
          </span>
          {showConjugate && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-amber" />
              <span className="text-gray-400">Conjugate z*</span>
            </span>
          )}
          {roots && roots.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span className="text-gray-400">{roots.length} Roots of Unity</span>
            </span>
          )}
        </div>
        <span className="text-gray-500">Drag cyan point on plane to adjust (a + bi)</span>
      </div>
    </div>
  );
}
