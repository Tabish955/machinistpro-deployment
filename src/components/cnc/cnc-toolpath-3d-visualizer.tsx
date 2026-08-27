import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Cpu,
  Layers,
  Sparkles,
  Eye,
  Sliders,
} from "lucide-react";

export interface ToolpathPoint3D {
  x: number;
  y: number;
  z: number;
  type: "rapid" | "feed" | "arc" | "retract";
  f?: number;
  lineNumber?: number;
}

interface CncToolpath3DVisualizerProps {
  toolpathPoints?: ToolpathPoint3D[];
  stockDiameter?: number;
  stockLength?: number;
  isLathe?: boolean;
}

export function CncToolpath3DVisualizer({
  toolpathPoints,
  stockDiameter = 50,
  stockLength = 120,
  isLathe = true,
}: CncToolpath3DVisualizerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [activePointIndex, setActivePointIndex] = useState<number>(0);

  // Default sample G71 Lathe Turning Toolpath if none provided
  const points: ToolpathPoint3D[] = useMemoDefaultPoints(toolpathPoints, stockDiameter, stockLength);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 640;
    const height = 340;

    // 1. Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(stockLength * 0.8, stockDiameter * 1.5, stockLength * 1.6);
    camera.lookAt(stockLength * 0.4, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 2. Grid & Coordinates Axis
    const grid = new THREE.GridHelper(stockLength * 2, 20, 0x334155, 0x1e293b);
    grid.position.set(stockLength * 0.5, -stockDiameter * 0.6, 0);
    scene.add(grid);

    // 3. Stock Material Bounding Mesh (Transparent Glassy Look)
    if (isLathe) {
      const stockGeo = new THREE.CylinderGeometry(
        stockDiameter / 2,
        stockDiameter / 2,
        stockLength,
        32,
        1,
        false
      );
      stockGeo.rotateZ(Math.PI / 2);
      stockGeo.translate(stockLength / 2, 0, 0);
      const stockMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      });
      const stockMesh = new THREE.Mesh(stockGeo, stockMat);
      scene.add(stockMesh);
    }

    // 4. Color-coded 3D Toolpath Lines
    const rapidPositions: number[] = [];
    const feedPositions: number[] = [];
    const arcPositions: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      if (p2.type === "rapid" || p2.type === "retract") {
        rapidPositions.push(p1.z, p1.x, p1.y, p2.z, p2.x, p2.y);
      } else if (p2.type === "arc") {
        arcPositions.push(p1.z, p1.x, p1.y, p2.z, p2.x, p2.y);
      } else {
        feedPositions.push(p1.z, p1.x, p1.y, p2.z, p2.x, p2.y);
      }
    }

    if (rapidPositions.length > 0) {
      const rapidGeo = new THREE.BufferGeometry();
      rapidGeo.setAttribute("position", new THREE.Float32BufferAttribute(rapidPositions, 3));
      const rapidMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.65 });
      scene.add(new THREE.LineSegments(rapidGeo, rapidMat));
    }

    if (feedPositions.length > 0) {
      const feedGeo = new THREE.BufferGeometry();
      feedGeo.setAttribute("position", new THREE.Float32BufferAttribute(feedPositions, 3));
      const feedMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
      scene.add(new THREE.LineSegments(feedGeo, feedMat));
    }

    if (arcPositions.length > 0) {
      const arcGeo = new THREE.BufferGeometry();
      arcGeo.setAttribute("position", new THREE.Float32BufferAttribute(arcPositions, 3));
      const arcMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 2 });
      scene.add(new THREE.LineSegments(arcGeo, arcMat));
    }

    // 5. Tool Insert Marker (Diamond Cone)
    const toolGeo = new THREE.ConeGeometry(3, 8, 4);
    toolGeo.rotateX(Math.PI / 2);
    const toolMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const toolMesh = new THREE.Mesh(toolGeo, toolMat);
    scene.add(toolMesh);

    // Mouse Drag Rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      scene.rotation.y += deltaX * 0.01;
      scene.rotation.x += deltaY * 0.01;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Animation Loop
    let animId: number;
    let currentIdx = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isPlaying && points.length > 0) {
        currentIdx = (currentIdx + 1 * speedMultiplier) % points.length;
        const targetPt = points[Math.floor(currentIdx)];
        toolMesh.position.set(targetPt.z, targetPt.x, targetPt.y);
        setActivePointIndex(Math.floor(currentIdx));
        setPlaybackProgress((currentIdx / points.length) * 100);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [points, stockDiameter, stockLength, isLathe, isPlaying, speedMultiplier]);

  const activePt = points[activePointIndex] || points[0];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Cpu size={20} className="text-accent-purple" />
            <span>3D WebGL Toolpath Backplotter & Simulation HUD</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Interactive 3D toolpath verification with G00 rapid, G01 linear feed, and G02/G03 arc color-coding
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> G00 Rapid
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> G01 Feed
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-500" /> G02/G03 Arc
          </span>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-dark-950 overflow-hidden">
        <div ref={mountRef} className="w-full h-80 sm:h-96 cursor-grab active:cursor-grabbing" />

        {/* Real-Time CNC Telemetry HUD */}
        <div className="absolute top-3 left-3 bg-dark-900/90 border border-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-xl font-mono text-xs text-white space-y-1 shadow-lg pointer-events-none">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Live Tool Telemetry</p>
          <div className="flex items-center gap-3 font-bold">
            <span className="text-cyan-400">X: {(activePt.x * 2).toFixed(3)} mm (Ø)</span>
            <span className="text-pink-400">Z: {activePt.z.toFixed(3)} mm</span>
          </div>
          <p className="text-[11px] text-gray-300">
            Move: <span className="font-bold text-accent-amber">{activePt.type.toUpperCase()}</span> · Block N{activePointIndex + 10}
          </p>
        </div>
      </div>

      {/* Playback Controls & Scrubber */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 rounded-xl bg-accent-purple/20 border border-accent-purple/40 px-4 py-2 text-xs font-bold text-accent-purple hover:bg-accent-purple/30 transition shadow-sm"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "Pause Simulation" : "Play Toolpath"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActivePointIndex(0);
              setPlaybackProgress(0);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white transition"
            title="Reset to origin"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-gray-400">Speed:</span>
          {[1, 2, 4, 8].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setSpeedMultiplier(spd)}
              className={`px-2 py-0.5 rounded-lg border text-xs transition ${
                speedMultiplier === spd
                  ? "bg-white/20 text-white border-white/30 font-bold"
                  : "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function useMemoDefaultPoints(
  provided: ToolpathPoint3D[] | undefined,
  stockDia: number,
  stockLen: number
): ToolpathPoint3D[] {
  return React.useMemo(() => {
    if (provided && provided.length > 0) return provided;

    // Generate multi-pass G71 canned roughing & finishing profile
    const pts: ToolpathPoint3D[] = [];
    const passes = 6;
    const depthPerPass = (stockDia / 2 - 10) / passes;

    for (let p = 1; p <= passes; p++) {
      const currentRadius = stockDia / 2 - p * depthPerPass;
      // 1. Rapid to clearance
      pts.push({ x: currentRadius + 1, y: 0, z: stockLen + 2, type: "rapid" });
      // 2. Feed plunge to target diameter
      pts.push({ x: currentRadius, y: 0, z: stockLen, type: "feed" });
      // 3. Roughing longitudinal cut along Z
      pts.push({ x: currentRadius, y: 0, z: 20 + p * 8, type: "feed" });
      // 4. 45-degree chamfer retract
      pts.push({ x: currentRadius + 2, y: 0, z: 18 + p * 8, type: "retract" });
      // 5. Rapid back to start Z
      pts.push({ x: currentRadius + 2, y: 0, z: stockLen + 2, type: "rapid" });
    }

    // Final finish contour pass
    pts.push({ x: stockDia / 2 + 2, y: 0, z: stockLen + 2, type: "rapid" });
    pts.push({ x: 10, y: 0, z: stockLen, type: "feed" });
    pts.push({ x: 10, y: 0, z: 80, type: "feed" });
    pts.push({ x: 15, y: 0, z: 60, type: "arc" });
    pts.push({ x: 15, y: 0, z: 30, type: "feed" });
    pts.push({ x: 22, y: 0, z: 10, type: "feed" });
    pts.push({ x: 25, y: 0, z: 10, type: "feed" });
    pts.push({ x: stockDia / 2 + 5, y: 0, z: stockLen + 5, type: "rapid" });

    return pts;
  }, [provided, stockDia, stockLen]);
}
