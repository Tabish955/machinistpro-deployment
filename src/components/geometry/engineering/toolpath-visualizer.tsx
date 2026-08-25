import React, { useState, useMemo, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Cpu, Download } from "lucide-react";
import { formatNumber } from "@/lib/shared/math-utils";

interface ToolpathMove {
  type: "G00" | "G01" | "G02" | "G03";
  x: number;
  y: number;
  i?: number;
  j?: number;
  r?: number;
}

const DEFAULT_GCODE = `%
( MACHINISTPRO SAMPLE CONTOUR TOOLPATH )
G90 G54 G00 X0 Y0
G00 X10 Y10
G01 X50 Y10 F200
G01 X70 Y30
G02 X90 Y50 R20
G01 X90 Y80
G03 X70 Y100 R20
G01 X20 Y100
G01 X10 Y90
G01 X10 Y10
G00 X0 Y0
%`;

export function ToolpathVisualizer() {
  const [gcodeText, setGcodeText] = useState(DEFAULT_GCODE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(1); // 0 to 1
  const animRef = useRef<number | null>(null);

  // Parse G-Code text into toolpath moves
  const moves = useMemo(() => {
    const lines = gcodeText.split(/\r?\n/);
    const parsedMoves: ToolpathMove[] = [];
    let curX = 0;
    let curY = 0;
    let curType: "G00" | "G01" | "G02" | "G03" = "G00";

    for (const rawLine of lines) {
      const line = rawLine
        .replace(/\(.*?\)/g, "")
        .trim()
        .toUpperCase();
      if (!line || line.startsWith("%")) continue;

      if (line.includes("G00") || line.includes("G0 ")) curType = "G00";
      else if (line.includes("G01") || line.includes("G1 ")) curType = "G01";
      else if (line.includes("G02") || line.includes("G2 ")) curType = "G02";
      else if (line.includes("G03") || line.includes("G3 ")) curType = "G03";

      const xMatch = line.match(/X\s*(-?\d*\.?\d+)/);
      const yMatch = line.match(/Y\s*(-?\d*\.?\d+)/);
      const rMatch = line.match(/R\s*(-?\d*\.?\d+)/);
      const iMatch = line.match(/I\s*(-?\d*\.?\d+)/);
      const jMatch = line.match(/J\s*(-?\d*\.?\d+)/);

      if (xMatch || yMatch) {
        if (xMatch) curX = parseFloat(xMatch[1]);
        if (yMatch) curY = parseFloat(yMatch[1]);

        parsedMoves.push({
          type: curType,
          x: curX,
          y: curY,
          r: rMatch ? parseFloat(rMatch[1]) : undefined,
          i: iMatch ? parseFloat(iMatch[1]) : undefined,
          j: jMatch ? parseFloat(jMatch[1]) : undefined,
        });
      }
    }

    return parsedMoves;
  }, [gcodeText]);

  // Compute total toolpath length
  const totalLength = useMemo(() => {
    let len = 0;
    for (let i = 1; i < moves.length; i++) {
      const p1 = moves[i - 1];
      const p2 = moves[i];
      len += Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
    return len;
  }, [moves]);

  // Play animation
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setProgress((p) => {
        const next = p + dt * 0.2;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  // Viewport bounds for SVG
  const bounds = useMemo(() => {
    if (moves.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const m of moves) {
      if (m.x < minX) minX = m.x;
      if (m.x > maxX) maxX = m.x;
      if (m.y < minY) minY = m.y;
      if (m.y > maxY) maxY = m.y;
    }
    const pad = Math.max(10, (maxX - minX) * 0.15);
    return {
      minX: minX - pad,
      maxX: maxX + pad,
      minY: minY - pad,
      maxY: maxY + pad,
    };
  }, [moves]);

  const scale = 260 / Math.max(bounds.maxX - bounds.minX || 1, bounds.maxY - bounds.minY || 1);
  const sx = (x: number) => 20 + (x - bounds.minX) * scale;
  const sy = (y: number) => 280 - (y - bounds.minY) * scale;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-white">
      {/* Left G-Code Editor */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-3">
            <Cpu size={18} className="text-accent-purple" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              CNC G-Code Program Input
            </h3>
          </div>

          <textarea
            value={gcodeText}
            onChange={(e) => {
              setGcodeText(e.target.value);
              setProgress(1);
            }}
            rows={12}
            className="w-full rounded-xl border border-white/10 bg-dark-800 p-3 font-mono text-xs text-white focus:border-accent-purple/40 focus:outline-none"
          />

          <div className="mt-2 flex items-center justify-between text-xs font-mono text-gray-400">
            <span>{moves.length} Motion Blocks</span>
            <span>
              Path: <strong className="text-white">{formatNumber(totalLength, 3)} mm</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Right Toolpath 2D Viewport */}
      <div className="lg:col-span-7 space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              2D Toolpath Simulator
            </span>

            {/* Animation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (progress >= 1) setProgress(0);
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center gap-1 rounded-lg border border-accent-purple/40 bg-accent-purple/20 px-3 py-1 text-xs font-semibold text-accent-purple hover:bg-accent-purple/30"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? "Pause" : "Simulate"}</span>
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setProgress(1);
                }}
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 hover:text-white"
                title="Reset Path"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* SVG Toolpath Visualizer Canvas */}
          <div className="flex justify-center bg-[#0c0d14] rounded-xl p-3">
            <svg viewBox="0 0 300 300" className="w-full max-w-[340px] h-[300px]">
              {/* Origin Grid axes */}
              <line
                x1={sx(0)}
                y1="0"
                x2={sx(0)}
                y2="300"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1={sy(0)}
                x2="300"
                y2={sy(0)}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              <circle cx={sx(0)} cy={sy(0)} r="4" fill="#ffffff" />

              {/* Toolpath lines */}
              {moves.map((m, i) => {
                if (i === 0) return null;
                const prev = moves[i - 1];
                const movePct = i / moves.length;
                if (movePct > progress) return null;

                const isRapid = m.type === "G00";
                const strokeColor = isRapid ? "#ef4444" : "#00d4ff";
                const strokeDash = isRapid ? "4,4" : undefined;

                return (
                  <line
                    key={i}
                    x1={sx(prev.x)}
                    y1={sy(prev.y)}
                    x2={sx(m.x)}
                    y2={sy(m.y)}
                    stroke={strokeColor}
                    strokeWidth={isRapid ? "1.5" : "2.5"}
                    strokeDasharray={strokeDash}
                  />
                );
              })}

              {/* Waypoints */}
              {moves.map((m, i) => {
                const movePct = (i + 1) / moves.length;
                if (movePct > progress && progress < 1) return null;

                return (
                  <g key={i}>
                    <circle
                      cx={sx(m.x)}
                      cy={sy(m.y)}
                      r={3}
                      fill={m.type === "G00" ? "#ef4444" : "#00d4ff"}
                    />
                  </g>
                );
              })}

              {/* Active Cutter Position Marker */}
              {moves.length > 0 &&
                (() => {
                  const activeIdx = Math.min(
                    moves.length - 1,
                    Math.floor(progress * (moves.length - 1)),
                  );
                  const curMove = moves[activeIdx];
                  if (!curMove) return null;

                  return (
                    <g>
                      <circle
                        cx={sx(curMove.x)}
                        cy={sy(curMove.y)}
                        r="7"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                      />
                      <circle cx={sx(curMove.x)} cy={sy(curMove.y)} r="2" fill="#f59e0b" />
                    </g>
                  );
                })()}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-center gap-5 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-b border-dashed border-[#ef4444]" />
              <span className="text-gray-400">G00 Rapid Move</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-[#00d4ff]" />
              <span className="text-gray-400">G01/G02/G03 Cutting Feed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
