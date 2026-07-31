import { useEffect, useMemo, useRef, useState } from "react";
import { parseGCode, pathBounds, type GMove } from "@/lib/cnc/parse";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertTriangle, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

const W = 620;
const H = 300;
const PAD = 30;

const SAMPLE = `(THREE STEP SHAFT)
G21 G97 S900 M03
T0101
G00 X52 Z2
G71 U2 R1
G71 P100 Q110 U0.5 W0.1 F0.25
N100 G00 X20
     G01 Z-15
     X30
     Z-35
     X40
N110 Z-60
G00 X60 Z50
M30`;

/** Length of a move in the drawing plane, X halved because it is a diameter. */
const span = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot((b.x - a.x) / 2, b.z - a.z);

export function Backplot() {
  const [source, setSource] = useState(SAMPLE);
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);

  const plan = useMemo(() => {
    const { moves, warnings } = parseGCode(source);
    let travelled = 0;
    const legs: Array<{ move: GMove; from: { x: number; z: number }; start: number; end: number }> = [];
    let from = { x: 0, z: 0 };
    for (const m of moves) {
      const d = Math.max(span(from, m), 0.01) / (m.kind === "rapid" ? 4 : 1);
      legs.push({ move: m, from, start: travelled, end: travelled + d });
      travelled += d;
      from = { x: m.x, z: m.z };
    }
    return { moves, warnings, legs, total: travelled, bounds: pathBounds(moves) };
  }, [source]);

  useEffect(() => {
    if (!playing || !plan.total) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + dt / 5;
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, plan.total]);

  const { minZ, maxZ, maxX } = plan.bounds;
  const zRange = Math.max(maxZ - minZ, 1);
  const xRange = Math.max(maxX / 2, 1);
  // Chuck at the left, face of the part at the right, as the machine stands.
  const sx = (z: number) => W - PAD - ((maxZ - z) / zRange) * (W - PAD * 2);
  const sy = (diameter: number) => H - PAD - (diameter / 2 / xRange) * (H - PAD * 2);

  /** SVG arc for a circular move, or a line if the centre is missing. */
  const arcPath = (m: GMove, from: { x: number; z: number }) => {
    if (!m.centre) return `L${sx(m.z)},${sy(m.x)}`;
    const r = Math.hypot(m.centre.z - from.z, (m.centre.x - from.x) / 2);
    const rx = (r / xRange) * (H - PAD * 2);
    const rz = (r / zRange) * (W - PAD * 2);
    // Radius runs up the screen while SVG's y runs down, so one axis is mirrored
    // and a clockwise arc has to be drawn with the anticlockwise sweep flag.
    const sweep = m.kind === "arcCW" ? 1 : 0;
    return `A${rz},${rx} 0 0 ${sweep} ${sx(m.z)},${sy(m.x)}`;
  };

  const target = progress * plan.total;
  const drawn: string[] = [];
  let tool = { x: 0, z: 0 };
  let activeLine = 0;
  let cutPath = "";
  let rapidPath = "";

  for (const leg of plan.legs) {
    const { move, from } = leg;
    const visible = Math.min(1, Math.max(0, (target - leg.start) / (leg.end - leg.start || 1)));
    if (visible <= 0) break;
    const to =
      visible >= 1
        ? { x: move.x, z: move.z }
        : { x: from.x + (move.x - from.x) * visible, z: from.z + (move.z - from.z) * visible };

    const seg =
      visible >= 1 && (move.kind === "arcCW" || move.kind === "arcCCW")
        ? arcPath(move, from)
        : `L${sx(to.z)},${sy(to.x)}`;
    const head = `M${sx(from.z)},${sy(from.x)}`;
    if (move.kind === "rapid") rapidPath += ` ${head} ${seg}`;
    else cutPath += ` ${head} ${seg}`;
    tool = to;
    activeLine = move.line;
    drawn.push(seg);
  }

  const step = (dir: 1 | -1) => {
    setPlaying(false);
    const bounds = plan.legs.map((l) => l.start).concat(plan.total);
    const next = dir === 1
      ? bounds.find((b) => b > target + 1e-6)
      : [...bounds].reverse().find((b) => b < target - 1e-6);
    setProgress(Math.max(0, Math.min(1, (next ?? (dir === 1 ? plan.total : 0)) / plan.total)));
  };

  const activeText = plan.moves.find((m) => m.line === activeLine)?.text ?? "";

  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Backplot — paste a program" className="!mb-0" />
        <span className="text-[10px] text-gray-600">{plan.moves.length} moves</span>
      </div>

      <textarea
        value={source}
        onChange={(e) => { setSource(e.target.value); setProgress(1); }}
        aria-label="G-code program"
        spellCheck={false}
        className="w-full min-h-36 rounded-xl bg-dark-900 border border-dark-600 px-3 py-2.5 text-xs font-mono text-white focus:border-accent-cyan/50 focus:outline-none"
      />

      {plan.warnings.length > 0 && (
        <div className="mt-2 rounded-xl border border-accent-amber/25 bg-accent-amber/[0.06] px-3 py-2">
          {plan.warnings.slice(0, 4).map((w, i) => (
            <p key={i} className="flex gap-2 text-[11px] text-gray-400">
              <AlertTriangle size={12} className="text-accent-amber shrink-0 mt-0.5" />
              Line {w.line}: {w.message}
            </p>
          ))}
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Tool path backplot">
        {/* Centre line: the axis the part turns about */}
        <line x1="0" y1={H - PAD} x2={W} y2={H - PAD} stroke="#8b93a7" strokeWidth="1" strokeDasharray="10 4 2 4" />
        <path d={rapidPath} fill="none" stroke="#8b93a7" strokeWidth="1.2" strokeDasharray="5 4" />
        <path d={cutPath} fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
        {plan.moves.length > 0 && (
          <polygon
            points={`${sx(tool.z)},${sy(tool.x)} ${sx(tool.z) + 10},${sy(tool.x) - 14} ${sx(tool.z) - 10},${sy(tool.x) - 14}`}
            fill="#f59e0b"
          />
        )}
      </svg>

      <input
        type="range" min={0} max={1000} value={Math.round(progress * 1000)}
        onChange={(e) => { setPlaying(false); setProgress(Number(e.target.value) / 1000); }}
        aria-label="Scrub backplot"
        className="mt-1 w-full accent-accent-cyan"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { if (progress >= 1) setProgress(0); setPlaying(!playing); }}
          aria-label={playing ? "Pause backplot" : "Play backplot"}
          className="flex items-center gap-1.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-2 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
        </button>
        <button onClick={() => step(-1)} aria-label="Previous block"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"><SkipBack size={13} /></button>
        <button onClick={() => step(1)} aria-label="Next block"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"><SkipForward size={13} /></button>
        <button onClick={() => { setPlaying(false); setProgress(0); }} aria-label="Reset backplot"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"><RotateCcw size={13} /></button>
        {activeText && (
          <code className="ml-auto rounded-lg bg-dark-900 px-2 py-1.5 text-[11px] text-accent-cyan">
            {activeText}
          </code>
        )}
      </div>

      <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">
        Solid cyan is cutting, dashed grey is rapid. Step block by block with the arrows to see
        where each line takes the tool. It draws the path the words describe — it does not model
        the machine, so it will not catch a crash into the chuck or a tool that cannot reach.
      </p>
    </Card>
  );
}
