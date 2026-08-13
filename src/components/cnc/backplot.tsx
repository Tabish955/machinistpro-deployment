import { useEffect, useMemo, useRef, useState } from "react";
import { arcPointAt, arcSweep, parseGCode, pathBounds, type GMove } from "@/lib/cnc/parse";
import { checkProgram } from "@/lib/cnc/check";
import { stockFromProgram, toolpathFromProgram } from "@/lib/cnc/simulate";
import { LatheSimulation } from "@/components/cnc/simulation";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertTriangle, Check, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

const W = 620;
const H = 300;
const PAD = 30;

/**
 * Every coordinate here carries a decimal point, and that is the point of it.
 *
 * This sample used to be written X52, Z-15, U2 and so on. A Fanuc reads a word
 * without a decimal point in microns, so that program asks for a 0.052 mm bar
 * and a 15 micron cut. As the first thing anyone sees on this page it was
 * teaching the exact habit the rest of the app warns about — and the checker
 * now sitting under it flagged all eleven of them on its first run.
 */
export const SAMPLE = `(THREE STEP SHAFT)
G21 G97 S900 M03
T0101
G00 X52.0 Z2.0
G71 U2.0 R1.0
G71 P100 Q110 U0.5 W0.1 F0.25
N100 G00 X20.0
     G01 Z-15.0
     X30.0
     Z-35.0
     X40.0
N110 Z-60.0
G00 X60.0 Z50.0
M30`;

/**
 * Length of a move in the drawing plane, X halved because it is a diameter.
 *
 * An arc is measured round the curve rather than across its chord, so playback
 * spends the time on it that the tool would — a full circle is not a null move.
 */
const span = (a: { x: number; z: number }, b: GMove) => {
  const arc = arcSweep(b, a);
  if (arc) return Math.abs(arc.sweep) * arc.radius;
  return Math.hypot((b.x - a.x) / 2, b.z - a.z);
};

/**
 * Takes its program from the page when one is given, so the blocks a cycle just
 * wrote can be plotted without copying them out and pasting them back in.
 * Falls back to its own state, and the sample, when used on its own.
 */
export function Backplot({
  source: controlledSource,
  onSourceChange,
}: {
  source?: string;
  onSourceChange?: (source: string) => void;
} = {}) {
  const [ownSource, setOwnSource] = useState(SAMPLE);
  const source = controlledSource ?? ownSource;
  const setSource = onSourceChange ?? setOwnSource;
  const [progress, setProgress] = useState(1);
  const [barDiameter, setBarDiameter] = useState("");
  const [barLength, setBarLength] = useState("");
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);

  // A program arriving from outside is a different program: show all of it
  // rather than however far the last one had been scrubbed to.
  useEffect(() => {
    setProgress(1);
    setPlaying(false);
  }, [source]);

  // Checked against what a control would do with the blocks, which is a
  // different question from whether the backplot can draw them.
  const diagnostics = useMemo(() => checkProgram(source), [source]);

  const plan = useMemo(() => {
    const { moves, warnings } = parseGCode(source);
    let travelled = 0;
    const legs: Array<{ move: GMove; from: { x: number; z: number }; start: number; end: number }> =
      [];
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
  }, [playing, plan.total]);

  const { minZ, maxZ, maxX } = plan.bounds;
  const zRange = Math.max(maxZ - minZ, 1);
  const xRange = Math.max(maxX / 2, 1);
  // Chuck at the left, face of the part at the right, as the machine stands.
  const sx = (z: number) => W - PAD - ((maxZ - z) / zRange) * (W - PAD * 2);
  const sy = (diameter: number) => H - PAD - (diameter / 2 / xRange) * (H - PAD * 2);

  /**
   * A circular move as far as it has been travelled: the SVG segment for it and
   * the point it leaves the tool at. Part way through, that point is on the
   * curve rather than on the chord across it, so the tool follows the arc while
   * it is being drawn instead of cutting the corner off it.
   */
  const arcSegment = (m: GMove, from: { x: number; z: number }, fraction: number) => {
    const arc = arcSweep(m, from);
    if (!m.centre || !arc) {
      const to = {
        x: from.x + (m.x - from.x) * fraction,
        z: from.z + (m.z - from.z) * fraction,
      };
      return { seg: `L${sx(to.z)},${sy(to.x)}`, to };
    }
    // Z and the radius are scaled by different amounts to fit the box, so the
    // circle is drawn as the ellipse that scaling turns it into.
    const rx = (arc.radius / xRange) * (H - PAD * 2);
    const rz = (arc.radius / zRange) * (W - PAD * 2);
    const swept = arc.sweep * fraction;
    // Whether the arc goes the long way round is the block's to say. Left at 0
    // a half-turn or more is drawn as the short way, which is the other shape.
    const large = Math.abs(swept) > Math.PI ? 1 : 0;
    // The picture keeps the machine's orientation — Z to the right, radius up —
    // and SVG's y runs down, so its positive-angle sweep is the clockwise one.
    const sweepFlag = m.kind === "arcCW" ? 1 : 0;
    const to = fraction >= 1 ? { x: m.x, z: m.z } : arcPointAt(arc, m.centre, fraction);
    return { seg: `A${rz},${rx} 0 ${large} ${sweepFlag} ${sx(to.z)},${sy(to.x)}`, to };
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
    const { seg, to } = arcSegment(move, from, visible);
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
    const next =
      dir === 1
        ? bounds.find((b) => b > target + 1e-6)
        : [...bounds].reverse().find((b) => b < target - 1e-6);
    setProgress(Math.max(0, Math.min(1, (next ?? (dir === 1 ? plan.total : 0)) / plan.total)));
  };

  const activeText = plan.moves.find((m) => m.line === activeLine)?.text ?? "";

  // The bar the program appears to be cutting from, measured off the cuts
  // rather than the whole path — a retract to X60 Z50 is not the size of the
  // blank, and taking it as one drew a huge bar with a nick in the corner.
  const blank = useMemo(() => stockFromProgram(plan.moves), [plan.moves]);
  const suggestedBar = blank.diameter;
  const suggestedLength = blank.length;
  const materialMoves = useMemo(() => toolpathFromProgram(plan.moves), [plan.moves]);

  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Backplot" className="!mb-0" />
        <span className="text-[10px] text-gray-600">{plan.moves.length} moves</span>
      </div>

      <textarea
        value={source}
        onChange={(e) => {
          setSource(e.target.value);
          setProgress(1);
        }}
        aria-label="G-code program"
        spellCheck={false}
        className="w-full min-h-36 rounded-xl bg-dark-900 border border-dark-600 px-3 py-2.5 text-xs font-mono text-white focus:border-accent-cyan/50 focus:outline-none"
      />

      {/* What a control would refuse or silently misread, checked block by
          block. Separate from the parser's own warnings above: those say what
          the backplot could not draw, these say what the machine would do
          with it. */}
      {diagnostics.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 rounded-xl border border-accent-green/25 bg-accent-green/[0.06] px-3 py-2 text-[11px] text-accent-green">
          <Check size={12} className="shrink-0" />
          Nothing wrong with the blocks. That is not the same as the right part — it means the
          program is well formed, not that it cuts what you meant.
        </p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {diagnostics.map((d, i) => (
            <div
              key={i}
              className={`rounded-xl border px-3 py-2 ${
                d.severity === "error"
                  ? "border-accent-red/30 bg-accent-red/[0.07]"
                  : "border-accent-amber/25 bg-accent-amber/[0.06]"
              }`}
            >
              <p className="flex gap-2 text-[11px]">
                <AlertTriangle
                  size={12}
                  className={`shrink-0 mt-0.5 ${d.severity === "error" ? "text-accent-red" : "text-accent-amber"}`}
                />
                <span>
                  <span
                    className={`font-semibold ${d.severity === "error" ? "text-accent-red" : "text-accent-amber"}`}
                  >
                    Line {d.line}
                  </span>
                  <span className="text-gray-300"> — {d.message}</span>
                </span>
              </p>
              {d.text && (
                <pre className="mt-1 ml-5 font-mono text-[10px] text-gray-500">{d.text}</pre>
              )}
            </div>
          ))}
        </div>
      )}

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

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label="Tool path backplot"
      >
        {/* Centre line: the axis the part turns about */}
        <line
          x1="0"
          y1={H - PAD}
          x2={W}
          y2={H - PAD}
          stroke="#8b93a7"
          strokeWidth="1"
          strokeDasharray="10 4 2 4"
        />
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
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => {
          setPlaying(false);
          setProgress(Number(e.target.value) / 1000);
        }}
        aria-label="Scrub backplot"
        className="mt-1 w-full accent-accent-cyan"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying(!playing);
          }}
          aria-label={playing ? "Pause backplot" : "Play backplot"}
          className="flex items-center gap-1.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-2 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
        </button>
        <button
          onClick={() => step(-1)}
          aria-label="Previous block"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"
        >
          <SkipBack size={13} />
        </button>
        <button
          onClick={() => step(1)}
          aria-label="Next block"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"
        >
          <SkipForward size={13} />
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setProgress(0);
          }}
          aria-label="Reset backplot"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"
        >
          <RotateCcw size={13} />
        </button>
        {activeText && (
          <code className="ml-auto rounded-lg bg-dark-900 px-2 py-1.5 text-[11px] text-accent-cyan">
            {activeText}
          </code>
        )}
      </div>

      <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">
        Solid cyan is cutting, dashed grey is rapid. Step block by block with the arrows to see
        where each line takes the tool. It draws the path the words describe — it does not model the
        machine, so it will not catch a crash into the chuck or a tool that cannot reach.
      </p>

      {/* The path above says where the tool goes; this says what comes off. It
          needs a bar to cut, and the program never states one — the tool's
          furthest retract is only a guess at it, so it is offered as a filled
          default rather than assumed. */}
      <div className="mt-4 border-t border-dark-700 pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Bar Ø
            </label>
            <input
              value={barDiameter}
              onChange={(e) =>
                /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setBarDiameter(e.target.value)
              }
              inputMode="decimal"
              aria-label="Bar diameter"
              placeholder={String(suggestedBar)}
              className="w-28 rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 font-mono text-sm text-white focus:border-accent-cyan/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Bar Length
            </label>
            <input
              value={barLength}
              onChange={(e) =>
                /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setBarLength(e.target.value)
              }
              inputMode="decimal"
              aria-label="Bar length"
              placeholder={String(suggestedLength)}
              className="w-28 rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 font-mono text-sm text-white focus:border-accent-cyan/50 focus:outline-none"
            />
          </div>
          <p className="max-w-sm text-[10px] leading-relaxed text-gray-600">
            Taken from the path when left blank, which is only a guess: the furthest the tool
            retracts is not necessarily the size of the bar.
          </p>
        </div>
      </div>

      <LatheSimulation
        moves={materialMoves}
        stockDiameter={Number(barDiameter) || suggestedBar}
        length={Number(barLength) || suggestedLength}
        targetPoints={blank.target}
        passLabel={(n) => `line ${n}`}
        title="Material"
        note="Metal coming off the blocks as written. A canned cycle is one block the control expands into many passes, so a G71 here cuts its contour once rather than roughing it — that cycle's own tab shows the passes."
      />
    </Card>
  );
}
