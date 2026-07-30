import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyCut,
  buildToolpath,
  createStock,
  type Move,
} from "@/lib/cnc/simulate";
import { profileCoordinates, profileLength, type G71Input, type ProfileStep } from "@/lib/cnc/g71";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

const W = 620;
const H = 260;
const PAD = 28;

/** Distance of a move, used to pace the animation so rapids are not slow. */
const moveLength = (from: { x: number; z: number }, to: { x: number; z: number }) =>
  Math.hypot((to.x - from.x) / 2, to.z - from.z);

export function G71Simulation({
  input,
  steps,
  includeFinish,
}: {
  input: G71Input;
  steps: ProfileStep[];
  includeFinish: boolean;
}) {
  const [progress, setProgress] = useState(0); // 0..1 along the whole path
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frame = useRef<number>(0);

  const plan = useMemo(() => {
    try {
      const moves = buildToolpath(input, steps, { finish: includeFinish });
      const length = steps.length ? profileLength(steps) : input.length;
      const points = steps.length
        ? profileCoordinates(steps)
        : profileCoordinates([{ diameter: input.finishDiameter, length: input.length }]);

      // Cumulative distance so the tool travels at an even rate, and a rapid
      // does not take as long as a cut of the same duration.
      let travelled = 0;
      const cursors: Array<{ move: Move; start: number; end: number; from: { x: number; z: number } }> = [];
      let from = { x: input.stockDiameter, z: 2 };
      for (const m of moves) {
        const d = Math.max(moveLength(from, m), 0.01) / (m.cutting ? 1 : 4);
        cursors.push({ move: m, start: travelled, end: travelled + d, from });
        travelled += d;
        from = { x: m.x, z: m.z };
      }
      return { moves, cursors, total: travelled, length, points, error: "" };
    } catch (cause) {
      return {
        moves: [] as Move[],
        cursors: [],
        total: 0,
        length: 0,
        points: [],
        error: cause instanceof Error ? cause.message : "Cannot simulate this.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input), JSON.stringify(steps), includeFinish]);

  // Replay the path from the start each frame rather than mutating as we go, so
  // scrubbing backwards shows the same material as playing forwards.
  const state = useMemo(() => {
    if (plan.error || !plan.total) return null;
    const stock = createStock(input.stockDiameter, plan.length);
    const target = progress * plan.total;
    let tool = { x: input.stockDiameter, z: 2 };
    let activePass = 0;

    for (const c of plan.cursors) {
      if (c.start >= target) break;
      const span = c.end - c.start;
      const t = Math.min(1, (target - c.start) / (span || 1));
      const now = {
        x: c.from.x + (c.move.x - c.from.x) * t,
        z: c.from.z + (c.move.z - c.from.z) * t,
      };
      if (c.move.cutting) applyCut(stock, c.from, now);
      tool = now;
      activePass = c.move.pass;
    }
    return { stock, tool, activePass };
  }, [plan, progress, input.stockDiameter]);

  useEffect(() => {
    if (!playing || !plan.total) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + (dt * speed) / 6;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, speed, plan.total]);

  if (plan.error) {
    return (
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Simulation" />
        <p className="text-sm text-accent-red">{plan.error}</p>
      </Card>
    );
  }
  if (!state) return null;

  const maxRadius = input.stockDiameter / 2;
  const centreY = H - PAD;
  const sx = (z: number) => PAD + (-z / plan.length) * (W - PAD * 2);
  const sy = (radius: number) => centreY - (radius / maxRadius) * (H - PAD * 2);

  // Remaining material as one silhouette above the centre line.
  const stockPath = [
    `M${sx(0).toFixed(1)},${centreY.toFixed(1)}`,
    ...state.stock.zs.map((z, i) => `L${sx(z).toFixed(1)},${sy(state.stock.radii[i]).toFixed(1)}`),
    `L${sx(state.stock.zs[state.stock.zs.length - 1]).toFixed(1)},${centreY.toFixed(1)}`,
    "Z",
  ].join(" ");

  const targetPath = plan.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.z).toFixed(1)},${sy(p.x / 2).toFixed(1)}`)
    .join(" ");

  const tx = sx(state.tool.z);
  const ty = sy(state.tool.x / 2);
  const passLabel = state.activePass === 0 ? "finishing pass" : `roughing pass ${state.activePass}`;

  const step = (dir: 1 | -1) => {
    setPlaying(false);
    const target = progress * plan.total;
    const boundaries = plan.cursors.map((c) => c.start).concat(plan.total);
    const next =
      dir === 1
        ? boundaries.find((b) => b > target + 1e-6)
        : [...boundaries].reverse().find((b) => b < target - 1e-6);
    setProgress(Math.max(0, Math.min(1, (next ?? (dir === 1 ? plan.total : 0)) / plan.total)));
  };

  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Simulation" className="!mb-0" />
        <span className="text-[10px] text-gray-600">
          {progress >= 1 ? "complete" : passLabel}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="G71 cycle simulation">
        {/* Finished shape underneath, as the target */}
        <path d={targetPath} fill="none" stroke="#8b93a7" strokeWidth="1.5" strokeDasharray="5 4" />
        {/* Material still on the bar */}
        <path d={stockPath} fill="rgba(0,212,255,0.13)" stroke="#00d4ff" strokeWidth="1.5" />
        {/* Centre line */}
        <line x1="0" y1={centreY} x2={W} y2={centreY} stroke="#8b93a7" strokeWidth="1" strokeDasharray="10 4 2 4" />
        {/* Tool */}
        <polygon
          points={`${tx},${ty} ${tx + 11},${ty - 15} ${tx - 11},${ty - 15}`}
          fill={state.activePass === 0 ? "#22c55e" : "#f59e0b"}
        />
      </svg>

      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => {
          setPlaying(false);
          setProgress(Number(e.target.value) / 1000);
        }}
        aria-label="Scrub simulation"
        className="mt-2 w-full accent-accent-cyan"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying(!playing);
          }}
          aria-label={playing ? "Pause" : "Play"}
          className="flex items-center gap-1.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-2 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
        </button>
        <button onClick={() => step(-1)} aria-label="Previous move"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white">
          <SkipBack size={13} />
        </button>
        <button onClick={() => step(1)} aria-label="Next move"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white">
          <SkipForward size={13} />
        </button>
        <button onClick={() => { setPlaying(false); setProgress(0); }} aria-label="Reset"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white">
          <RotateCcw size={13} />
        </button>
        <div className="flex gap-1 ml-auto">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                speed === s ? "bg-accent-cyan/20 text-accent-cyan" : "bg-white/[0.04] text-gray-500 hover:text-white"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">
        Amber is roughing, green the finishing pass. Each pass stops where the profile would be
        cut into, which is why a shallow pass ends at the first shoulder. Step through move by
        move with the arrows. This shows the geometry, not your control's exact sequencing.
      </p>
    </Card>
  );
}
