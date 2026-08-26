import React, { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Layers, Compass } from "lucide-react";
import type { ComplexFormDetails, ComplexRoot } from "@/lib/calculator/complex-engine";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(35); // pixels per unit
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Auto scale when real or imag changes drastically
  useEffect(() => {
    const maxCoord = Math.max(Math.abs(real), Math.abs(imag), 4);
    if (maxCoord * scale > 180 || maxCoord * scale < 50) {
      setScale(Math.max(15, Math.min(80, 160 / maxCoord)));
    }
  }, [real, imag]);

  // Redraw Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2 + offset.x;
    const centerY = height / 2 + offset.y;

    // Clear background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    // 1. Grid Lines
    const step = scale;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";

    // Vertical grid
    for (let x = centerX % step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // Horizontal grid
    for (let y = centerY % step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Unit Circle & Radius Circles
    if (showUnitCircle) {
      ctx.strokeStyle = "rgba(6, 182, 212, 0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, scale, 0, Math.PI * 2);
      ctx.stroke();

      // Radius circle for current z
      const rPix = Math.hypot(real, imag) * scale;
      if (rPix > 5) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.15)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, rPix, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 3. Axes
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";

    // Real Axis (X)
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Imaginary Axis (Y)
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.fillText("Re (Real)", width - 60, centerY - 6);
    ctx.fillText("Im (Imaginary)", centerX + 6, 16);

    // Number ticks on axes
    const visibleUnitsX = Math.ceil(width / (2 * step));
    const visibleUnitsY = Math.ceil(height / (2 * step));
    ctx.fillStyle = "rgba(156, 163, 175, 0.5)";
    ctx.font = "9px monospace";

    for (let i = -visibleUnitsX; i <= visibleUnitsX; i++) {
      if (i === 0) continue;
      const tx = centerX + i * step;
      ctx.fillText(i.toString(), tx - 4, centerY + 14);
    }
    for (let i = -visibleUnitsY; i <= visibleUnitsY; i++) {
      if (i === 0) continue;
      const ty = centerY - i * step;
      ctx.fillText(`${i}i`, centerX + 4, ty + 3);
    }

    // 4. Roots Polygon (if roots provided)
    if (roots && roots.length > 1) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      roots.forEach((rt, idx) => {
        const rx = centerX + rt.real * scale;
        const ry = centerY - rt.imag * scale;
        if (idx === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw each root point & vector
      roots.forEach((rt) => {
        const rx = centerX + rt.real * scale;
        const ry = centerY - rt.imag * scale;

        ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        ctx.fillStyle = "#c084fc";
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#e9d5ff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`w${rt.k}`, rx + 6, ry - 6);
      });
    }

    // 5. Complex Conjugate (z*)
    if (showConjugate && Math.abs(imag) > 1e-4) {
      const conjX = centerX + real * scale;
      const conjY = centerY - -imag * scale;

      ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(conjX, conjY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(conjX, conjY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fcd34d";
      ctx.font = "9px monospace";
      ctx.fillText("z* (Conjugate)", conjX + 7, conjY + 12);
    }

    // 6. Complex Reciprocal (1/z)
    if (showReciprocal && (real !== 0 || imag !== 0)) {
      const d = real * real + imag * imag;
      const recipReal = real / d;
      const recipImag = -imag / d;
      const rx = centerX + recipReal * scale;
      const ry = centerY - recipImag * scale;

      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#93c5fd";
      ctx.font = "9px monospace";
      ctx.fillText("1/z", rx + 6, ry - 4);
    }

    // 7. Primary Vector z = a + bi
    const zPixX = centerX + real * scale;
    const zPixY = centerY - imag * scale;

    // Angle Arc sector
    const mod = Math.hypot(real, imag);
    if (mod > 0.05) {
      const angleRad = Math.atan2(imag, real);
      const arcRadius = Math.min(28, mod * scale * 0.4);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius, 0, -angleRad, angleRad < 0);
      ctx.stroke();

      const angleDeg = ((angleRad * 180) / Math.PI).toFixed(1);
      ctx.fillStyle = "#22d3ee";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`θ = ${angleDeg}°`, centerX + arcRadius + 4, centerY - 6);
    }

    // Vector Ray
    const gradient = ctx.createLinearGradient(centerX, centerY, zPixX, zPixY);
    gradient.addColorStop(0, "rgba(6, 182, 212, 0.4)");
    gradient.addColorStop(1, "#06b6d4");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(zPixX, zPixY);
    ctx.stroke();

    // Draggable point head with pulsing ring
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(zPixX, zPixY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(zPixX, zPixY, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Value HUD Callout
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    const sign = imag >= 0 ? "+" : "−";
    const zStr = `z = (${real.toFixed(2)} ${sign} ${Math.abs(imag).toFixed(2)}i)`;
    ctx.fillText(zStr, zPixX + 10, zPixY - 10);
  }, [real, imag, scale, offset, roots, showConjugate, showReciprocal, showUnitCircle]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer event handlers for dragging point or panning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = canvas.width / 2 + offset.x;
    const centerY = canvas.height / 2 + offset.y;
    const zPixX = centerX + real * scale;
    const zPixY = centerY - imag * scale;

    const distToPoint = Math.hypot(clickX - zPixX, clickY - zPixY);

    if (distToPoint < 18) {
      setIsDraggingPoint(true);
      canvas.setPointerCapture(e.pointerId);
    } else {
      setIsPanning(true);
      setDragStart({ x: clickX - offset.x, y: clickY - offset.y });
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;

    if (isDraggingPoint && onChange) {
      const centerX = canvas.width / 2 + offset.x;
      const centerY = canvas.height / 2 + offset.y;
      const newReal = parseFloat(((currX - centerX) / scale).toFixed(3));
      const newImag = parseFloat(((centerY - currY) / scale).toFixed(3));
      onChange(newReal, newImag);
    } else if (isPanning) {
      setOffset({
        x: currX - dragStart.x,
        y: currY - dragStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDraggingPoint(false);
    setIsPanning(false);
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className={`relative rounded-2xl border border-white/[0.08] bg-dark-950 p-2 shadow-2xl overflow-hidden ${className}`}>
      {/* Top Floating Control Bar */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-white/10 bg-dark-900/90 p-1 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(120, s * 1.25))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(10, s * 0.8))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setOffset({ x: 0, y: 0 });
            setScale(35);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition"
          title="Reset View"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={560}
        height={340}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-80 cursor-grab active:cursor-grabbing select-none rounded-xl"
      />

      {/* Legend and Instruction */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2 px-2 text-[11px] text-gray-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent-cyan" />
            <span>Vector z</span>
          </span>
          {showConjugate && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent-amber" />
              <span>Conjugate z*</span>
            </span>
          )}
          {roots && roots.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span>{roots.length} Roots</span>
            </span>
          )}
        </div>
        <span className="text-gray-500">Drag cyan dot to change (a + bi)</span>
      </div>
    </div>
  );
}
