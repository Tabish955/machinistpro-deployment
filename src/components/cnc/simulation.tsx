import { useEffect, useMemo, useRef, useState } from "react";
import { applyCut, buildToolpath, createStock, type Move } from "@/lib/cnc/simulate";
import { profileCoordinates, profileLength, type G71Input, type ProfileStep } from "@/lib/cnc/g71";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Pause, Play, RotateCcw, Route, SkipBack, SkipForward } from "lucide-react";

const W = 620;
const H = 260;
const PAD = 28;

/** One straight leg of the motion, in part coordinates: X is a diameter, Z runs negative. */
interface Leg {
  from: { x: number; z: number };
  to: { x: number; z: number };
  cutting: boolean;
  /** Which pass drew it; 0 is the finishing pass. */
  pass: number;
}

/** Distance of a move, used to pace the animation so rapids are not slow. */
const moveLength = (from: { x: number; z: number }, to: { x: number; z: number }) =>
  Math.hypot((to.x - from.x) / 2, to.z - from.z);

export interface LatheSimulationProps {
  /** The motion to animate, from whichever cycle is on screen. */
  moves: Move[];
  /** Bar diameter before anything is cut, mm. */
  stockDiameter: number;
  /** Length of bar to draw, mm. */
  length: number;
  /** Finished shape drawn underneath as a dashed target, if the cycle has one. */
  targetPoints?: { x: number; z: number }[];
  /** Where the tool starts. Clear of the stock at the face when left out. */
  start?: { x: number; z: number };
  /** Names a pass for the caption. */
  passLabel?: (pass: number) => string;
  /** Anything the cycle could not plan, shown instead of the picture. */
  error?: string;
  /** Sentence under the picture explaining what this particular cycle shows. */
  note?: string;
  title?: string;
}

/**
 * One picture for every cycle on the page.
 *
 * It is driven by a move list rather than by any one cycle, so the material it
 * shows is removed by the same motion that is drawn, and both come from the
 * planner that writes the G-code. The three cannot disagree.
 */
export function LatheSimulation({
  moves,
  stockDiameter,
  length,
  targetPoints,
  start,
  passLabel,
  error,
  note,
  title = "Simulation",
}: LatheSimulationProps) {
  const [progress, setProgress] = useState(0); // 0..1 along the whole path
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showPath, setShowPath] = useState(true);
  const frame = useRef<number>(0);

  const origin = useMemo(() => start ?? { x: stockDiameter + 4, z: 2 }, [start, stockDiameter]);

  const plan = useMemo(() => {
    // Cumulative distance so the tool travels at an even rate, and a rapid does
    // not take as long as a cut of the same length.
    let travelled = 0;
    const cursors: Array<{
      move: Move;
      start: number;
      end: number;
      from: { x: number; z: number };
    }> = [];
    let from = origin;
    for (const m of moves) {
      const d = Math.max(moveLength(from, m), 0.01) / (m.cutting ? 1 : 4);
      cursors.push({ move: m, start: travelled, end: travelled + d, from });
      travelled += d;
      from = { x: m.x, z: m.z };
    }
    return { cursors, total: travelled };
  }, [moves, origin]);

  /**
   * The whole motion as legs, drawn faintly under everything else. Seeing where
   * the tool is going next is half of reading a backplot; without it the first
   * play is the only time you learn the shape of the cycle.
   */
  const wholePath = useMemo<Leg[]>(
    () =>
      plan.cursors.map((c) => ({
        from: c.from,
        to: { x: c.move.x, z: c.move.z },
        cutting: c.move.cutting,
        pass: c.move.pass,
      })),
    [plan],
  );

  // Replay the path from the start each frame rather than mutating as we go, so
  // scrubbing backwards shows the same material — and the same trail — as
  // playing forwards.
  const state = useMemo(() => {
    if (!plan.total || !(length > 0) || !(stockDiameter > 0)) return null;
    const stock = createStock(stockDiameter, length);
    const target = progress * plan.total;
    let tool = origin;
    let activePass = 0;
    const trail: Leg[] = [];

    for (const c of plan.cursors) {
      if (c.start >= target) break;
      const span = c.end - c.start;
      const t = Math.min(1, (target - c.start) / (span || 1));
      const now = {
        x: c.from.x + (c.move.x - c.from.x) * t,
        z: c.from.z + (c.move.z - c.from.z) * t,
      };
      if (c.move.cutting) applyCut(stock, c.from, now, c.move);
      // The leg is added only as far as the tool has actually reached, so the
      // line grows out of the tool tip rather than snapping whole into place.
      trail.push({ from: c.from, to: now, cutting: c.move.cutting, pass: c.move.pass });
      tool = now;
      activePass = c.move.pass;
    }
    return { stock, tool, activePass, trail };
  }, [plan, progress, stockDiameter, length, origin]);

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

  if (error) {
    return (
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title={title} />
        <p className="text-sm text-accent-red">{error}</p>
      </Card>
    );
  }
  if (!state) return null;

  const maxRadius = stockDiameter / 2;
  const centreY = H - PAD;
  // Chuck at the left, face of the part at the right, as the machine stands.
  const sx = (z: number) => W - PAD + (z / length) * (W - PAD * 2);
  const sy = (radius: number) => centreY - (radius / maxRadius) * (H - PAD * 2);

  const lastIndex = state.stock.zs.length - 1;
  const silhouette = (radii: number[]) =>
    [
      `M${sx(state.stock.zs[0]).toFixed(1)},${centreY.toFixed(1)}`,
      ...state.stock.zs.map((z, i) => `L${sx(z).toFixed(1)},${sy(radii[i]).toFixed(1)}`),
      `L${sx(state.stock.zs[lastIndex]).toFixed(1)},${centreY.toFixed(1)}`,
      "Z",
    ].join(" ");

  // Material still on the bar, with any hole drilled through it punched out.
  // Even-odd fill turns the second loop into a void rather than a second solid.
  const bored = state.stock.bores.some((r) => r > 0);
  const stockPath = bored
    ? `${silhouette(state.stock.radii)} ${silhouette(state.stock.bores)}`
    : silhouette(state.stock.radii);

  const targetPath = (targetPoints ?? [])
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.z).toFixed(1)},${sy(p.x / 2).toFixed(1)}`)
    .join(" ");

  // Each leg is drawn as its own subpath so a rapid never joins to a cut.
  const legPath = (legs: Leg[]) =>
    legs
      .map(
        (l) =>
          `M${sx(l.from.z).toFixed(1)},${sy(l.from.x / 2).toFixed(1)} ` +
          `L${sx(l.to.z).toFixed(1)},${sy(l.to.x / 2).toFixed(1)}`,
      )
      .join(" ");

  // Split by pass, not by what is happening right now: a roughing line must not
  // turn green behind the tool when the finishing pass starts.
  const roughTrail = legPath(state.trail.filter((l) => l.cutting && l.pass !== 0));
  const finishTrail = legPath(state.trail.filter((l) => l.cutting && l.pass === 0));
  const rapidTrail = legPath(state.trail.filter((l) => !l.cutting));
  const ghostCut = legPath(wholePath.filter((l) => l.cutting));
  const ghostRapid = legPath(wholePath.filter((l) => !l.cutting));

  const tx = sx(state.tool.z);
  const ty = sy(state.tool.x / 2);
  const describePass =
    passLabel ?? ((pass: number) => (pass === 0 ? "finishing pass" : `pass ${pass}`));

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
        <SectionHeader title={title} className="!mb-0" />
        <span className="text-[10px] text-gray-600">
          {progress >= 1 ? "complete" : describePass(state.activePass)}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title} view`}>
        {/* Chuck, drawn so the view stands the same way round as the machine */}
        <g>
          <rect
            x={0}
            y={sy(maxRadius) - 14}
            width={PAD}
            height={centreY - sy(maxRadius) + 14}
            fill="#252b3a"
            stroke="#4b5568"
            strokeWidth="1"
          />
          <rect
            x={PAD - 7}
            y={sy(maxRadius) - 6}
            width={7}
            height={centreY - sy(maxRadius) + 6}
            fill="#38415a"
          />
          <text x={3} y={centreY - 5} fill="#6b7385" fontSize="8" fontFamily="monospace">
            CHUCK
          </text>
        </g>
        {/* Finished shape underneath, as the target */}
        {targetPath && (
          <path
            d={targetPath}
            fill="none"
            stroke="#8b93a7"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        )}
        {/* Material still on the bar */}
        <path
          d={stockPath}
          fillRule="evenodd"
          fill="rgba(0,212,255,0.13)"
          stroke="#00d4ff"
          strokeWidth="1.5"
        />
        {/* Centre line */}
        <line
          x1="0"
          y1={centreY}
          x2={W}
          y2={centreY}
          stroke="#8b93a7"
          strokeWidth="1"
          strokeDasharray="10 4 2 4"
        />
        {showPath && (
          <g>
            {/* Where the tool has still to go */}
            <path
              d={ghostRapid}
              fill="none"
              stroke="#8b93a7"
              strokeWidth="1"
              strokeDasharray="4 5"
              opacity="0.28"
            />
            <path d={ghostCut} fill="none" stroke="#00d4ff" strokeWidth="1.2" opacity="0.28" />
            {/* Where it has been */}
            <path
              d={rapidTrail}
              fill="none"
              stroke="#8b93a7"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            <path
              d={roughTrail}
              fill="none"
              stroke="#00d4ff"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d={finishTrail}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
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
        <button
          onClick={() => step(-1)}
          aria-label="Previous move"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"
        >
          <SkipBack size={13} />
        </button>
        <button
          onClick={() => step(1)}
          aria-label="Next move"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"
        >
          <SkipForward size={13} />
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setProgress(0);
          }}
          aria-label="Reset"
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-gray-300 hover:text-white"
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={() => setShowPath(!showPath)}
          aria-pressed={showPath}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
            showPath
              ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
              : "border-white/[0.08] bg-white/[0.04] text-gray-500 hover:text-white"
          }`}
        >
          <Route size={13} /> Path
        </button>
        <div className="flex gap-1 ml-auto">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                speed === s
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "bg-white/[0.04] text-gray-500 hover:text-white"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">
        Chuck on the left, Z0 at the face on the right, as the machine stands. The tool draws its
        path as it travels — cyan cutting, dashed grey the rapids — over the faint line of the moves
        still to come. Step through move by move with the arrows.
        {note ? ` ${note}` : ""}
      </p>
    </Card>
  );
}

/** The G71 roughing cycle with its finishing pass, planned from the profile. */
export function G71Simulation({
  input,
  steps,
  includeFinish,
}: {
  input: G71Input;
  steps: ProfileStep[];
  includeFinish: boolean;
}) {
  const plan = useMemo(() => {
    try {
      return {
        moves: buildToolpath(input, steps, { finish: includeFinish }),
        length: steps.length ? profileLength(steps) : input.length,
        points: steps.length
          ? profileCoordinates(steps)
          : profileCoordinates([{ diameter: input.finishDiameter, length: input.length }]),
        error: "",
      };
    } catch (cause) {
      return {
        moves: [] as Move[],
        length: 0,
        points: [] as { x: number; z: number }[],
        error: cause instanceof Error ? cause.message : "Cannot simulate this.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input), JSON.stringify(steps), includeFinish]);

  return (
    <LatheSimulation
      moves={plan.moves}
      stockDiameter={input.stockDiameter}
      length={plan.length}
      targetPoints={plan.points}
      start={{ x: input.stockDiameter, z: 2 }}
      error={plan.error}
      passLabel={(pass) => (pass === 0 ? "finishing pass" : `roughing pass ${pass}`)}
      note="Green is the finishing pass. Each roughing pass stops where the profile would be cut into, which is why a shallow pass ends at the first shoulder. This shows the geometry, not your control's exact sequencing."
    />
  );
}
