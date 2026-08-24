import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import {
  calculateG71,
  generateG71Code,
  profileCoordinates,
  profileLength,
  profileDrawing,
  profileReversal,
  requiredType,
  type G71Input,
  type G71Type,
  type ProfileStep,
  type ArcDirection,
} from "@/lib/cnc/g71";
import {
  calcG72,
  faceProfileCoordinates,
  type FaceStep,
  generateG72Code,
  calcG73,
  generateG73Code,
  patternOversize,
  calcG74,
  generateG74Code,
  calcG75,
  generateG75Code,
  calcG76,
  generateG76Code,
  generateG70Code,
  calcSimpleCycle,
  generateSimpleCycleCode,
  THREAD_FORMS,
  SIMPLE_CYCLES,
  type ThreadForm,
  type SimpleCycle,
} from "@/lib/cnc/cycles";
import {
  buildG72Toolpath,
  buildG73Toolpath,
  buildG74Toolpath,
  buildG75Toolpath,
  buildG76Toolpath,
  buildSimpleToolpath,
} from "@/lib/cnc/toolpaths";
import { G71Simulation, LatheSimulation } from "@/components/cnc/simulation";
import { Backplot, SAMPLE } from "@/components/cnc/backplot";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Cpu, Copy, Check, X, AlertTriangle, Route } from "lucide-react";
import { copyText } from "@/lib/clipboard";

const field =
  "w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none";

function Num({
  label,
  value,
  onChange,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          aria-label={label}
          onChange={(e) => {
            const v = e.target.value;
            if (/^-?[0-9]*\.?[0-9]*$/.test(v) || v === "") onChange(v);
          }}
          className={`${field} pr-12`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[10px] text-gray-600">{hint}</p>}
    </div>
  );
}

function Pick<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
        {label}
      </label>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${field} cursor-pointer appearance-none`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Hands a cycle's generated blocks to the backplot tab. The backplot used to sit
 * under every cycle showing the same canned sample, which taught nobody
 * anything; it is one tab now, and each cycle can send its own program to it.
 */
const SendToBackplot = createContext<((lines: string[]) => void) | null>(null);

/** A generated program with the copy button beside it. */
function Program({ lines, note }: { lines: string[]; note?: ReactNode }) {
  // Three states, not two. A copy that did not happen must not look like one
  // that did: the operator would paste whatever was on the clipboard before
  // into the control, believing it to be the blocks on screen.
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  const plot = useContext(SendToBackplot);
  const copy = async () => {
    const ok = await copyText(lines.join("\n"));
    setCopyState(ok ? "done" : "failed");
    // Leave a failure up long enough to be read and acted on.
    setTimeout(() => setCopyState("idle"), ok ? 1500 : 5000);
  };

  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Program Blocks" className="!mb-0" />
        <div className="flex items-center gap-2">
          {plot && (
            <button
              onClick={() => plot(lines)}
              className="flex items-center gap-1.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-cyan hover:bg-accent-cyan/20 cursor-pointer"
            >
              <Route size={12} /> Backplot this
            </button>
          )}
          <button
            onClick={() => void copy()}
            aria-label="Copy program blocks"
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              copyState === "done"
                ? "bg-accent-green/20 text-accent-green"
                : copyState === "failed"
                  ? "bg-accent-red/20 text-accent-red"
                  : "bg-dark-700/50 text-gray-500 hover:text-white"
            }`}
          >
            {copyState === "done" ? (
              <Check size={14} />
            ) : copyState === "failed" ? (
              <X size={14} />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>
      {copyState === "failed" && (
        <p role="alert" className="mb-2 text-[11px] text-accent-red leading-relaxed">
          The clipboard is not available here — nothing was copied. Select the blocks below and copy
          them by hand. A browser only grants the clipboard over https, or on localhost.
        </p>
      )}
      <pre className="select-all rounded-xl bg-dark-900 border border-dark-700 p-3 text-xs font-mono text-accent-cyan overflow-x-auto">
        {lines.join("\n")}
      </pre>
      {note && <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">{note}</p>}
    </Card>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full font-mono text-xs">
        <thead className="text-gray-500">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`font-normal ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-white">
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-dark-700/60">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-1.5 ${j === 0 ? "" : "text-right"} ${j > 0 && j < row.length - 1 ? "text-gray-400" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const pf = (v: string) => parseFloat(v);
const pi = (v: string, fallback: number) =>
  Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : fallback;

/* ═══ Part profile ══════════════════════════════════════════════════════════ */

/** One row of the profile table as it is typed, before it becomes a number. */
export type ProfileRow = {
  d: string;
  l: string;
  e: string;
  /**
   * Radius on the corner the step starts at — the root of its shoulder, or the
   * front corner on step one. Blank leaves that corner sharp.
   */
  r: string;
  /**
   * Radius on the outer lip of that same shoulder. A drawing can call for a
   * radius on both corners, so it is its own dimension rather than a setting
   * on the first. Step one has no shoulder and so no lip.
   */
  lip: string;
  /**
   * What the first radius does: round the corner, or bow the whole step from
   * its diameter to its End Ø — a form rather than a corner.
   */
  blend: "fillet" | "arc";
  /** Which way an arc bows. A round works its own out. */
  dir: ArcDirection;
};

export const emptyRow = (): ProfileRow => ({
  d: "",
  l: "",
  e: "",
  r: "",
  lip: "",
  blend: "fillet",
  dir: "cw",
});

/** The settings the blend button steps through, in the order it does. */
const BLEND_STATES: Array<{ blend: ProfileRow["blend"]; dir: ArcDirection; label: string }> = [
  { blend: "fillet", dir: "cw", label: "R" },
  { blend: "arc", dir: "cw", label: "G02" },
  { blend: "arc", dir: "ccw", label: "G03" },
];

const blendLabel = (row: ProfileRow) =>
  row.blend === "fillet" ? "R" : row.dir === "cw" ? "G02" : "G03";

/**
 * A corner size the way it is written on a drawing.
 *
 * R2 rounds the corner, C1 takes it off flat, and a bare number is a radius
 * because that is what the box used to mean. Reading the letter saves a column
 * in a table that is already wide, and it is the notation on the paper the
 * operator is working from — ISO 13715 writes a 1×45° chamfer as C1.
 */
export const parseCorner = (
  typed: string,
): { size: number; kind: "round" | "chamfer" } | undefined => {
  const m = typed.trim().match(/^([rc])?\s*([0-9]*\.?[0-9]+)$/i);
  if (!m) return undefined;
  const size = Number(m[2]);
  if (!Number.isFinite(size) || size <= 0) return undefined;
  return { size, kind: m[1]?.toLowerCase() === "c" ? "chamfer" : "round" };
};

/** The typed rows as steps, dropping any row not yet filled in. */
function rowsToSteps(rows: ProfileRow[]): ProfileStep[] {
  return rows
    .map((row) => {
      const corner = parseCorner(row.r);
      const lip = parseCorner(row.lip);
      const isCorner = row.blend === "fillet";
      return {
        diameter: pf(row.d),
        length: pf(row.l),
        // Blank means a parallel step; a value makes it a taper.
        endDiameter: row.e.trim() === "" ? undefined : pf(row.e),
        // The one corner box is the corner or the whole step, never both.
        cornerRadius: isCorner && corner?.kind === "round" ? corner.size : undefined,
        cornerChamfer: isCorner && corner?.kind === "chamfer" ? corner.size : undefined,
        // An arc bows the step on a radius; a chamfer there means nothing.
        arcRadius: row.blend === "arc" ? corner?.size : undefined,
        lipRadius: lip?.kind === "round" ? lip.size : undefined,
        lipChamfer: lip?.kind === "chamfer" ? lip.size : undefined,
        arcDirection: row.dir,
      };
    })
    .filter((s) => Number.isFinite(s.diameter) && Number.isFinite(s.length));
}

/**
 * What the shape forced the cycle to be, or what it cannot be cut by at all.
 *
 * A profile that dips and comes back has a pocket in it, and only Type II
 * roughs a pocket. Which form the program is written as is worked out from the
 * shape rather than asked for — but it must never be worked out silently, since
 * not every control has Type II, so this says what happened and why.
 */
function ProfileFormNotice({
  points,
  hasTypeII,
}: {
  points: { x: number; z: number; move: string }[];
  /** Whether this cycle has a Type II at all. G73 does not. */
  hasTypeII: boolean;
}) {
  const reversal = points.length ? profileReversal(points as never) : null;
  if (!reversal) return null;

  if (hasTypeII) {
    return (
      <div className="mt-3 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 p-3">
        <p className="text-xs font-semibold text-accent-cyan">
          Written as Type II: the pocket behind Z{fmtNum(reversal.z)} is roughed as its own cut.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-300">
          The profile turns back on itself at Ø{fmtNum(reversal.diameter)}, which Type I cannot
          reach — its passes would drive straight through the recess. Passes lift over standing
          metal and drop back in beyond it instead, so one pass can be several separate cuts. The Z
          on the first block after P is what tells the control to read it this way.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-accent-amber">
          Your control has to support Type II. Older ones do not, and those that do often cap how
          many pockets a profile may have — check the manual before running this.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-accent-red/30 bg-accent-red/10 p-3">
      <p className="text-xs font-semibold text-accent-red">
        This profile turns back on itself at Z{fmtNum(reversal.z)}, Ø{fmtNum(reversal.diameter)}.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-gray-300">
        The diameter has to run one way along the part. Behind that point is a face the tool cannot
        reach coming in from the front, so a pass stops at it and the metal beyond is never taken
        off. G73 has no Type II — rough a shape like this with G71, which has.
      </p>
    </div>
  );
}

/** Trim a coordinate for a sentence rather than a program block. */
const fmtNum = (v: number) => Number(v.toFixed(3)).toString();

/**
 * The shape of the finished part, shared by every cycle that roughs to a
 * profile. G71 had this and G73 did not, which is why G73 could only ever
 * illustrate a shape rather than cut the operator's own.
 *
 * A step can run parallel, taper, or blend on a radius. The radius is carried
 * as a fine polyline underneath so the pass planner, the backplot and the
 * material model all follow the curve, while the program still gets the single
 * G02 or G03 block an operator expects to read.
 */
function ProfileEditor({
  rows,
  setRows,
}: {
  rows: ProfileRow[];
  setRows: React.Dispatch<React.SetStateAction<ProfileRow[]>>;
}) {
  const setRow = (i: number, key: keyof ProfileRow, v: string) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  /**
   * Which corner this row's radius rounds, named on the row itself.
   *
   * A shoulder has a step either side of it and the radius belongs to only one
   * of them — the bigger diameter, the step that begins there. Nothing on screen
   * used to say so, so a radius typed on the row below rounded the front corner
   * instead and the shoulder stayed sharp, with no way to tell why.
   */
  /** "Rounds" or "chamfers", from what was actually typed in the box. */
  const verb = (typed: string) => (parseCorner(typed)?.kind === "chamfer" ? "Chamfers" : "Rounds");

  const roundsWhat = (i: number) => {
    const diameter = rows[i].d.trim();
    const does = verb(rows[i].r);
    if (i === 0) {
      return diameter
        ? `${does} the front corner, where the face meets Ø${diameter}`
        : `${does} the front corner, where the face meets the first diameter`;
    }
    const before = rows[i - 1];
    const from = (before.e.trim() || before.d.trim()) ?? "";
    return from
      ? `${does} the root of the shoulder this step starts at — the inside corner at Ø${from}`
      : `${does} the root of the shoulder this step starts at`;
  };

  /** And the other corner of that shoulder, which is its own dimension. */
  const lipRoundsWhat = (i: number) => {
    const diameter = rows[i].d.trim();
    if (i === 0) return "The first step has no shoulder, so it has no lip to take";
    const does = verb(rows[i].lip);
    return diameter
      ? `${does} the outer lip of that shoulder, where its face meets Ø${diameter}`
      : `${does} the outer lip of that shoulder`;
  };

  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader title="Part Profile" className="!mb-0" />
        <span className="text-[10px] text-gray-600">as dimensioned on the drawing</span>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-[1.4rem_1fr_1fr_1fr_1fr_1fr_3.4rem_1.6rem] gap-2 text-[10px] uppercase tracking-wider text-gray-600">
          <span>#</span>
          <span>Diameter</span>
          <span>Length</span>
          <span>End Ø</span>
          <span>Corner</span>
          <span>Lip</span>
          <span>Blend</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.4rem_1fr_1fr_1fr_1fr_1fr_3.4rem_1.6rem] gap-2 items-center"
          >
            <span className="font-mono text-xs text-gray-500">{i + 1}</span>
            <input
              className={field}
              value={r.d}
              inputMode="decimal"
              aria-label={`Step ${i + 1} diameter`}
              onChange={(e) =>
                /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "d", e.target.value)
              }
            />
            <input
              className={field}
              value={r.l}
              inputMode="decimal"
              aria-label={`Step ${i + 1} length`}
              onChange={(e) =>
                /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "l", e.target.value)
              }
            />
            <input
              className={field}
              value={r.e}
              inputMode="decimal"
              placeholder="—"
              aria-label={`Step ${i + 1} end diameter`}
              onChange={(e) =>
                /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "e", e.target.value)
              }
            />
            <input
              className={field}
              value={r.r}
              inputMode="decimal"
              placeholder="R / C"
              aria-label={`Step ${i + 1} corner radius`}
              title={r.blend === "arc" ? undefined : roundsWhat(i)}
              onChange={(e) =>
                /^[RrCc]?[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "r", e.target.value)
              }
            />
            <input
              className={field}
              value={r.lip}
              inputMode="decimal"
              placeholder="—"
              // The first step has no shoulder, so there is no lip on it to
              // round. Better to shut the box than to take a number and refuse it.
              disabled={i === 0}
              aria-label={`Step ${i + 1} lip radius`}
              title={lipRoundsWhat(i)}
              onChange={(e) =>
                /^[RrCc]?[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "lip", e.target.value)
              }
            />
            <button
              type="button"
              disabled={r.r.trim() === ""}
              aria-label={`Step ${i + 1} blend`}
              title={
                r.blend === "arc"
                  ? "The whole step bowed on the radius, from its diameter to its end diameter"
                  : `${roundsWhat(i)}. Tangent both sides, and it writes its own G02 or G03.`
              }
              onClick={() =>
                setRows((cur) =>
                  cur.map((row, j) => {
                    if (j !== i) return row;
                    const at = BLEND_STATES.findIndex(
                      (s) => s.blend === row.blend && (row.blend !== "arc" || s.dir === row.dir),
                    );
                    const next = BLEND_STATES[(at + 1) % BLEND_STATES.length];
                    return { ...row, blend: next.blend, dir: next.dir };
                  }),
                )
              }
              className="rounded-lg border border-dark-600 bg-dark-900 px-1 py-2 font-mono text-[11px] text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
            >
              {blendLabel(r)}
            </button>
            <button
              onClick={() => setRows((c) => c.filter((_, j) => j !== i))}
              disabled={rows.length < 2}
              aria-label={`Remove step ${i + 1}`}
              className="text-gray-600 hover:text-accent-red disabled:opacity-30 text-lg leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {/* Which corner each radius went to, said out loud. A radius that rounded
          somewhere other than where it was wanted is otherwise only findable by
          reading the shape and guessing. */}
      {rows.some((r) => (r.r.trim() !== "" && r.blend !== "arc") || r.lip.trim() !== "") && (
        <ul className="mt-3 space-y-1">
          {rows.flatMap((r, i) => {
            const said: React.ReactNode[] = [];
            const line = (key: string, typed: string, what: string) => {
              const size = parseCorner(typed);
              // Echoed back in the notation it was read as, so a C typed where
              // an R was meant shows up here rather than in the metal.
              const said = size
                ? `${size.kind === "chamfer" ? "C" : "R"}${size.size}`
                : typed.trim();
              return (
                <li key={key} className="text-[10px] text-gray-500 leading-relaxed">
                  <span className="font-mono text-accent-cyan">{said}</span> on step {i + 1}:{" "}
                  {what.replace(/^(Rounds|Chamfers) /, (m) => m.toLowerCase())}.
                </li>
              );
            };
            if (r.r.trim() !== "" && r.blend !== "arc")
              said.push(line(`${i}c`, r.r, roundsWhat(i)));
            if (r.lip.trim() !== "" && i > 0) said.push(line(`${i}l`, r.lip, lipRoundsWhat(i)));
            return said;
          })}
        </ul>
      )}
      <button
        onClick={() => setRows((c) => [...c, emptyRow()])}
        className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/[0.08] hover:text-white"
      >
        + Add step
      </button>
      <p className="mt-3 text-[10px] text-gray-600 leading-relaxed">
        Enter each step from the face outwards. Leave End Ø blank for a parallel step, or give it to
        cut a taper. Corner and Lip take a corner off the way the drawing writes it:{" "}
        <span className="font-mono text-gray-500">R2</span> rounds it on a 2 mm radius,{" "}
        <span className="font-mono text-gray-500">C1</span> takes it off flat 1 mm each way — the
        1×45° chamfer on every shaft end — and a bare number is a radius. Either way it comes off
        both faces and leaves the rest of them straight, and the app writes its own G01, G02 or G03
        for it. A shoulder has two corners and gets both from the row of the bigger diameter — the
        step that begins there: <span className="font-mono text-gray-500">Corner</span> is the root,
        down in the inside corner, and <span className="font-mono text-gray-500">Lip</span> is the
        outer edge where the shoulder face meets the diameter above it. On step one there is no
        shoulder, so Corner is the front corner and Lip is shut. Press{" "}
        <span className="font-mono text-gray-500">R</span> under Blend to turn the corner radius
        into <span className="font-mono text-gray-500">G02</span> or{" "}
        <span className="font-mono text-gray-500">G03</span> instead, which stops it being a corner
        at all: it bows the whole step from its diameter to its End Ø, a ball nose or a crown. Z is
        worked out cumulatively, so step two runs to the sum of the lengths before it — the part
        that is easy to get wrong by hand.
      </p>
    </Card>
  );
}

/* ═══ G71 · OD roughing ═════════════════════════════════════════════════════ */

function G71Panel() {
  const [stock, setStock] = usePersistentState("cnc.G71Panel.stock", "50");
  const [finish, setFinish] = usePersistentState("cnc.G71Panel.finish", "40");
  const [length, setLength] = usePersistentState("cnc.G71Panel.length", "60");
  const [doc, setDoc] = usePersistentState("cnc.G71Panel.doc", "2");
  const [allowX, setAllowX] = usePersistentState("cnc.G71Panel.allowX", "0.5");
  const [allowZ, setAllowZ] = usePersistentState("cnc.G71Panel.allowZ", "0.1");
  const [retract, setRetract] = usePersistentState("cnc.G71Panel.retract", "1");
  const [feed, setFeed] = usePersistentState("cnc.G71Panel.feed", "0.25");
  const [ns, setNs] = usePersistentState("cnc.G71Panel.ns", "100");
  const [nf, setNf] = usePersistentState("cnc.G71Panel.nf", "110");
  // The same cycle bores as well as turns, and everything about it is the other
  // way round: the stock is the hole that is already there, the passes open it
  // outwards, and the allowance is left on the inside.
  const [internal, setInternal] = usePersistentState("cnc.G71Panel.internal", false);
  // The part as it is dimensioned on the drawing: a diameter and a length per step.
  const [rows, setRows] = usePersistentState<ProfileRow[]>("cnc.G71Panel.rows", [
    { ...emptyRow(), d: "20", l: "15" },
    { ...emptyRow(), d: "30", l: "20" },
    { ...emptyRow(), d: "40", l: "25" },
  ]);

  const steps: ProfileStep[] = rowsToSteps(rows);

  const profile = useMemo(() => {
    try {
      return {
        points: profileCoordinates(steps, internal),
        total: profileLength(steps),
        error: "",
      };
    } catch (cause) {
      return {
        points: [],
        total: 0,
        error: cause instanceof Error ? cause.message : "Check the profile.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rows), internal]);

  const drawing = useMemo(() => {
    // The half-section draws a bar with metal taken off the outside of it, which
    // is not what a bore looks like. Rather than show a picture of the wrong
    // part, it is left out for internal work.
    if (internal) return null;
    try {
      return profileDrawing(steps, pf(stock) || 0);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rows), stock, internal]);

  // Which form the control will read this as is not a setting: it is decided by
  // whether the shape has a pocket in it, and the program says so by whether the
  // first block after P carries a Z. Working it out from the profile is the only
  // way the two cannot disagree.
  const cycleType: G71Type = requiredType(profile.points);

  const input: G71Input = {
    stockDiameter: pf(stock),
    finishDiameter: pf(finish),
    length: pf(length),
    depthOfCut: pf(doc),
    finishAllowanceX: pf(allowX),
    finishAllowanceZ: pf(allowZ),
    retract: pf(retract),
    type: cycleType,
    internal,
  };

  const { result, code, error } = useMemo(() => {
    try {
      const startBlock = pi(ns, 100);
      const endBlock = pi(nf, 110);
      return {
        // Planned against the profile so the table shows the passes the cycle
        // really makes, down to the smallest diameter and stopping at each shoulder.
        result: calculateG71(input, steps.length ? profileCoordinates(steps) : undefined),
        code: [
          ...generateG71Code(input, {
            startBlock,
            endBlock,
            feed: pf(feed) || 0.2,
            steps: steps.length ? steps : undefined,
          }),
          // The finishing cycle, which is the block most often left out. Without
          // it the allowance the roughing left is still on the part.
          ...generateG70Code(startBlock, endBlock),
        ],
        error: "",
      };
    } catch (cause) {
      return {
        result: null,
        code: [] as string[],
        error: cause instanceof Error ? cause.message : "Check the values.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stock,
    finish,
    length,
    doc,
    allowX,
    allowZ,
    retract,
    feed,
    ns,
    nf,
    cycleType,
    internal,
    JSON.stringify(rows),
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader
              title={internal ? "G71 — Boring" : "G71 — OD Roughing"}
              className="!mb-0"
            />
            {/* Read out, not chosen: the shape decides this and the program says
                which by whether the P block carries a Z. */}
            <span
              aria-label={`Written as Type ${cycleType}`}
              title={
                cycleType === "II"
                  ? "The profile has a pocket in it, so it is written as Type II — the first block after P carries a Z"
                  : "The profile only grows from the face, so it is written as Type I — the first block after P carries X alone"
              }
              className="rounded-lg border border-dark-600 bg-dark-800 px-3 py-1 text-[11px] font-semibold text-gray-400"
            >
              Type {cycleType}
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              aria-label="Bore rather than turn"
              className="accent-accent-cyan cursor-pointer"
            />
            Bore it out — the stock is the hole, not the bar
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Num
              label={internal ? "Hole Ø" : "Stock Ø"}
              value={stock}
              onChange={setStock}
              suffix="mm"
              hint={internal ? "the hole that is already there" : undefined}
            />
            <Num
              label={internal ? "Bore to Ø" : "Finished Ø"}
              value={finish}
              onChange={setFinish}
              suffix="mm"
              hint="plain turn only — a profile below sets its own"
            />
            <Num label="Length of Cut" value={length} onChange={setLength} suffix="mm" />
            <Num
              label="Depth of Cut (U)"
              value={doc}
              onChange={setDoc}
              suffix="mm"
              hint="radius value"
            />
            <Num
              label="Finish Allow. X (U)"
              value={allowX}
              onChange={setAllowX}
              suffix="mm"
              hint="diameter value"
            />
            <Num label="Finish Allow. Z (W)" value={allowZ} onChange={setAllowZ} suffix="mm" />
            <Num label="Retract (R)" value={retract} onChange={setRetract} suffix="mm" />
            <Num label="Feed (F)" value={feed} onChange={setFeed} suffix="mm/rev" />
            <Num label="Start Block (P)" value={ns} onChange={setNs} suffix="N" />
            <Num label="End Block (Q)" value={nf} onChange={setNf} suffix="N" />
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            The two U words are not the same thing: on the first line U is the depth of cut as a
            radius, on the second it is the X allowance as a diameter.
          </p>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Passes" />
          {error ? (
            <p className="text-sm text-accent-red py-4">{error}</p>
          ) : result ? (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400 mb-3">
                <span>
                  Radial stock <span className="font-mono text-white">{result.radialStock}</span> mm
                </span>
                <span>
                  Roughs to Ø<span className="font-mono text-white">{result.roughedDiameter}</span>
                </span>
                <span>
                  Z to <span className="font-mono text-white">{result.roughedZ}</span>
                </span>
              </div>
              <Table
                // The Z column is where the pass finishes. On a Type II pass
                // that is the end of the last stretch, not one unbroken cut
                // from the face — so the stretches are spelled out beside it
                // rather than left to be read as travel through the collar.
                head={
                  result.mostSpansInAPass > 1
                    ? ["Pass", "X (Ø)", "Depth (rad)", "Z", "Cuts"]
                    : ["Pass", "X (Ø)", "Depth (rad)", "Z"]
                }
                rows={result.passes.map((p) =>
                  result.mostSpansInAPass > 1
                    ? [
                        p.pass,
                        p.diameter,
                        p.depth,
                        p.z,
                        p.spans.map((s) => `${s.from}→${s.to}`).join("  "),
                      ]
                    : [p.pass, p.diameter, p.depth, p.z],
                )}
              />
            </>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ProfileEditor rows={rows} setRows={setRows} />
          <ProfileFormNotice points={profile.error ? [] : profile.points} hasTypeII />
        </div>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Profile Coordinates" />
          {profile.error ? (
            <p className="text-sm text-accent-red py-4">{profile.error}</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Overall length <span className="font-mono text-white">{profile.total}</span> mm
              </p>
              <Table
                head={["X (Ø)", "Z", "Move"]}
                rows={profile.points.map((p) => [p.x, p.z, p.move])}
              />
            </>
          )}
        </Card>
      </div>

      {drawing && !profile.error && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Programmed Shape" className="!mb-0" />
            <span className="text-[10px] text-gray-600">half section · stock shown dashed</span>
          </div>
          <svg
            viewBox={"0 0 " + drawing.width + " " + drawing.height}
            className="w-full"
            role="img"
            aria-label="Half section of the programmed profile"
          >
            <path
              d={drawing.stockPath}
              stroke="#8b93a7"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              fill="none"
            />
            <path
              d={drawing.partPath}
              fill="rgba(0,212,255,0.10)"
              stroke="#00d4ff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line
              x1="0"
              y1={drawing.centreY}
              x2={drawing.width}
              y2={drawing.centreY}
              stroke="#8b93a7"
              strokeWidth="1"
              strokeDasharray="10 4 2 4"
            />
          </svg>
          <p className="mt-1 text-[10px] text-gray-600">
            The shape the blocks will cut. A diameter in the wrong step, or a length that does not
            add up, shows here before it reaches the machine.
          </p>
        </Card>
      )}

      {/* The material model takes metal off the outside of a bar, so run against
          a bore it would animate the wrong part being cut the wrong way. Left
          out for boring rather than shown wrong; the pass table and the blocks
          are the answer there. */}
      {!error && !profile.error && steps.length > 0 && !internal && (
        <G71Simulation input={input} steps={steps} includeFinish />
      )}
      {internal && !error && !profile.error && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <p className="text-[11px] leading-relaxed text-gray-400">
            The shape and the material simulation are left out for boring. Both draw metal coming
            off the outside of a bar, which is not what is happening in a hole, and a picture of the
            wrong part is worse than none. The pass table above and the blocks below are worked out
            for the bore.
          </p>
        </Card>
      )}

      {!error && code.length > 0 && (
        <Program
          lines={code}
          note={
            cycleType === "II"
              ? "Type II: the first block after P carries a Z, which is what tells the control to rough the pocket rather than drive through it. G70 finishes to size on the same blocks the roughing named."
              : "Type I: the diameter runs one way along the part, so the first block after P carries X alone. G70 finishes to size on the same blocks the roughing named."
          }
        />
      )}
    </div>
  );
}

/* ═══ G72 · Facing roughing ═════════════════════════════════════════════════ */

function G72Panel() {
  const [stock, setStock] = usePersistentState("cnc.G72Panel.stock", "60");
  const [finish, setFinish] = usePersistentState("cnc.G72Panel.finish", "20");
  const [facing, setFacing] = usePersistentState("cnc.G72Panel.facing", "10");
  const [doc, setDoc] = usePersistentState("cnc.G72Panel.doc", "2");
  const [allowX, setAllowX] = usePersistentState("cnc.G72Panel.allowX", "0.5");
  const [allowZ, setAllowZ] = usePersistentState("cnc.G72Panel.allowZ", "0.1");
  const [retract, setRetract] = usePersistentState("cnc.G72Panel.retract", "1");
  const [feed, setFeed] = usePersistentState("cnc.G72Panel.feed", "0.2");
  // Empty means the plain inputs above describe the whole job, which is the
  // usual one: face straight in to a diameter.
  const [faceRows, setFaceRows] = usePersistentState<FaceRow[]>("cnc.G72Panel.faceRows", []);

  const input = {
    stockDiameter: pf(stock),
    finishDiameter: pf(finish),
    stockLength: pf(facing),
    depthOfCut: pf(doc),
    allowanceX: pf(allowX),
    allowanceZ: pf(allowZ),
    retract: pf(retract),
  };

  const out = useMemo(() => {
    const steps = faceRowsToSteps(faceRows);
    try {
      return {
        result: calcG72(input, steps),
        code: generateG72Code(input, { feed: pf(feed) || 0.2, steps }),
        moves: buildG72Toolpath(input),
        points: steps.length ? faceProfileCoordinates(steps, pf(stock)) : [],
        error: "",
      };
    } catch (cause) {
      return {
        result: null,
        code: [],
        moves: [],
        points: [],
        error: cause instanceof Error ? cause.message : "Check the values.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, finish, facing, doc, allowX, allowZ, retract, feed, JSON.stringify(faceRows)]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="G72 — Facing Roughing" />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Stock Ø" value={stock} onChange={setStock} suffix="mm" />
            <Num label="Face in to Ø" value={finish} onChange={setFinish} suffix="mm" />
            <Num label="Stock on Face" value={facing} onChange={setFacing} suffix="mm" />
            <Num
              label="Depth of Cut (W)"
              value={doc}
              onChange={setDoc}
              suffix="mm"
              hint="a Z distance, not a radius"
            />
            <Num label="Finish Allow. X (U)" value={allowX} onChange={setAllowX} suffix="mm" />
            <Num label="Finish Allow. Z (W)" value={allowZ} onChange={setAllowZ} suffix="mm" />
            <Num label="Retract (R)" value={retract} onChange={setRetract} suffix="mm" />
            <Num label="Feed (F)" value={feed} onChange={setFeed} suffix="mm/rev" />
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            G72 is G71 turned through ninety degrees: it steps along Z and sweeps in X, so the depth
            of cut is written at W and is a distance along the axis rather than a radius. Use it
            when most of the metal is on the face — a disc or a flange — where G71 would take one
            long pass per shallow layer.
          </p>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Passes" />
          {out.error ? (
            <p className="text-sm text-accent-red py-4">{out.error}</p>
          ) : (
            out.result && (
              <>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400 mb-3">
                  <span>
                    Roughs to Z <span className="font-mono text-white">{out.result.roughedZ}</span>
                  </span>
                  <span>
                    Leaves Ø
                    <span className="font-mono text-white">{out.result.roughedDiameter}</span>
                  </span>
                </div>
                <Table
                  head={["Pass", "Z", "Depth", "In to Ø"]}
                  rows={out.result.passes.map((p) => [p.pass, p.z, p.depth, p.toDiameter])}
                />
              </>
            )
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FaceProfileEditor rows={faceRows} setRows={setFaceRows} />
        {out.points.length > 0 && (
          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="Face Coordinates" />
            <Table head={["X (Ø)", "Z"]} rows={out.points.map((p) => [p.x, p.z])} />
            <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">
              The finished face, walked the way the cycle reads it: in at one depth, along the wall
              of the step, in again. The first block after P carries Z alone, which is what tells
              the control it is a Type I facing shape.
            </p>
          </Card>
        )}
      </div>
      <LatheSimulation
        moves={out.moves}
        stockDiameter={pf(stock)}
        length={Math.max(pf(facing) * 2.5, pf(facing) + 10)}
        error={out.error}
        passLabel={(p) => `facing pass ${p}`}
        note="Each pass clears the end of the bar back to its own Z, so the metal comes off the face rather than off the diameter."
      />
      {!out.error && (
        <Program
          lines={out.code}
          note="Follow with G70 on the same block numbers to finish to size."
        />
      )}
    </div>
  );
}

/** One row of the face table as it is typed. */
export type FaceRow = { d: string; z: string };
export const emptyFaceRow = (): FaceRow => ({ d: "", z: "" });

/** The typed rows as levels, dropping any row not yet filled in. */
function faceRowsToSteps(rows: FaceRow[]): FaceStep[] {
  return rows
    .map((row) => ({ diameter: pf(row.d), depth: pf(row.z) }))
    .filter((s) => Number.isFinite(s.diameter) && Number.isFinite(s.depth));
}

/**
 * The face as a staircase of levels, entered from the outside diameter in.
 *
 * G72 reads its contour the opposite way round from G71 — largest diameter
 * first, working towards the centre — so the table is written that way too
 * rather than making the operator invert the drawing in their head.
 */
function FaceProfileEditor({
  rows,
  setRows,
}: {
  rows: FaceRow[];
  setRows: React.Dispatch<React.SetStateAction<FaceRow[]>>;
}) {
  const setRow = (i: number, key: keyof FaceRow, v: string) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader title="Face Profile" className="!mb-0" />
        <span className="text-[10px] text-gray-600">optional — from the outside in</span>
      </div>
      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1.4rem_1fr_1fr_1.6rem] gap-2 text-[10px] uppercase tracking-wider text-gray-600">
            <span>#</span>
            <span>In to Ø</span>
            <span>Depth</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1.4rem_1fr_1fr_1.6rem] gap-2 items-center">
              <span className="font-mono text-xs text-gray-500">{i + 1}</span>
              <input
                className={field}
                value={r.d}
                inputMode="decimal"
                aria-label={`Level ${i + 1} diameter`}
                onChange={(e) =>
                  /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "d", e.target.value)
                }
              />
              <input
                className={field}
                value={r.z}
                inputMode="decimal"
                aria-label={`Level ${i + 1} depth`}
                onChange={(e) =>
                  /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "z", e.target.value)
                }
              />
              <button
                onClick={() => setRows((c) => c.filter((_, j) => j !== i))}
                aria-label={`Remove level ${i + 1}`}
                className="text-gray-600 hover:text-accent-red text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => setRows((c) => [...c, emptyFaceRow()])}
        className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/[0.08] hover:text-white"
      >
        + Add level
      </button>
      <p className="mt-3 text-[10px] text-gray-600 leading-relaxed">
        Leave this empty and the cycle faces straight in to the diameter above, which is the usual
        job. Add levels for a face that steps: each row is a diameter to sweep in to and how deep
        the face sits there, written from the outside diameter inwards. The face has to get
        shallower as it goes in — a level deeper than the one outside it is a recess with metal
        standing over it, which only Type II reaches, and G72 here is Type I.
      </p>
    </Card>
  );
}

/* ═══ G73 · Pattern repeat ══════════════════════════════════════════════════ */

function G73Panel() {
  // Defaults are a coherent job, not just plausible numbers: a 44 mm blank over
  // a 38 mm largest diameter is 3 mm oversize on the radius, which is what the
  // relief is set to. Anything else would greet the user with their own warning.
  const [stock, setStock] = usePersistentState("cnc.G73Panel.stock", "44");
  const [reliefX, setReliefX] = usePersistentState("cnc.G73Panel.reliefX", "3");
  const [reliefZ, setReliefZ] = usePersistentState("cnc.G73Panel.reliefZ", "1");
  const [divisions, setDivisions] = usePersistentState("cnc.G73Panel.divisions", "4");
  const [allowX, setAllowX] = usePersistentState("cnc.G73Panel.allowX", "0.5");
  const [allowZ, setAllowZ] = usePersistentState("cnc.G73Panel.allowZ", "0.1");
  const [feed, setFeed] = usePersistentState("cnc.G73Panel.feed", "0.2");
  const [ns, setNs] = usePersistentState("cnc.G73Panel.ns", "100");
  const [nf, setNf] = usePersistentState("cnc.G73Panel.nf", "110");

  // The part itself, the same table G71 uses. Before this the cycle drew a
  // fixed illustration, so the one thing an operator wanted to check — their
  // own shape — was the one thing it could not show.
  const [rows, setRows] = usePersistentState<ProfileRow[]>("cnc.G73Panel.rows", [
    { ...emptyRow(), d: "26", l: "18" },
    { ...emptyRow(), d: "38", l: "22" },
  ]);

  const steps: ProfileStep[] = rowsToSteps(rows);

  const profile = useMemo(() => {
    try {
      return { points: profileCoordinates(steps), total: profileLength(steps), error: "" };
    } catch (cause) {
      return {
        points: [],
        total: 0,
        error: cause instanceof Error ? cause.message : "Check the profile.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rows)]);

  const input = {
    reliefX: pf(reliefX),
    reliefZ: pf(reliefZ),
    divisions: pi(divisions, 1),
    allowanceX: pf(allowX),
    allowanceZ: pf(allowZ),
  };

  const out = useMemo(() => {
    try {
      if (profile.error) throw new Error(profile.error);
      return {
        result: calcG73(input),
        code: [
          ...generateG73Code(input, {
            startBlock: pi(ns, 100),
            endBlock: pi(nf, 110),
            feed: pf(feed) || 0.2,
            steps: steps.length ? steps : undefined,
            stockDiameter: pf(stock) || undefined,
          }),
          // Roughing leaves the allowance on. G70 is the block that takes it off.
          ...generateG70Code(pi(ns, 100), pi(nf, 110)),
        ],
        moves: buildG73Toolpath(input, profile.points),
        error: "",
      };
    } catch (cause) {
      return {
        result: null,
        code: [],
        moves: [],
        error: cause instanceof Error ? cause.message : "Check the values.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reliefX, reliefZ, divisions, allowX, allowZ, feed, ns, nf, stock, JSON.stringify(rows)]);

  // What the blank actually is against what the relief claims it is. G73 only
  // makes sense when those agree.
  const oversize = patternOversize(pf(stock), profile.points);
  const reliefShort = oversize > 0 && pf(reliefX) > 0 && pf(reliefX) < oversize - 0.001;
  const reliefLong = oversize > 0 && pf(reliefX) > oversize * 2;

  // A radial depth past this is more than a normal roughing pass on a lathe of
  // the size this app is written for.
  const HEAVY_DEPTH = 4;
  const heavy = (out.result?.depthPerPass ?? 0) > HEAVY_DEPTH;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="G73 — Pattern Repeat" />
          <div className="grid grid-cols-2 gap-3">
            <Num
              label="Blank Ø"
              value={stock}
              onChange={setStock}
              suffix="mm"
              hint="the casting, not the finished size"
            />
            <Num
              label="Relief X (U)"
              value={reliefX}
              onChange={setReliefX}
              suffix="mm"
              hint="radius value"
            />
            <Num label="Relief Z (W)" value={reliefZ} onChange={setReliefZ} suffix="mm" />
            <Num label="Divisions (R)" value={divisions} onChange={setDivisions} suffix="passes" />
            <Num label="Finish Allow. X (U)" value={allowX} onChange={setAllowX} suffix="mm" />
            <Num label="Finish Allow. Z (W)" value={allowZ} onChange={setAllowZ} suffix="mm" />
            <Num label="Feed (F)" value={feed} onChange={setFeed} suffix="mm/rev" />
            <Num label="Start Block (P)" value={ns} onChange={setNs} suffix="N" />
            <Num label="End Block (Q)" value={nf} onChange={setNf} suffix="N" />
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Every pass follows the finished shape, walking in from the relief distance to nothing.
            That suits a casting or a forging already near size. On solid bar it cuts air for most
            of its travel, which is what G71 exists to avoid — the relief is how much oversize the
            blank really is, not how much you want to remove.
          </p>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Passes" />
          {out.error ? (
            <p className="text-sm text-accent-red py-4">{out.error}</p>
          ) : (
            out.result && (
              <>
                <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  <span className="text-gray-500">
                    Depth per pass{" "}
                    <span className="font-mono text-white">{out.result.depthPerPass}</span> mm
                    radial
                  </span>
                  <span className="text-gray-500">
                    <span className="font-mono text-white">{out.result.depthOnDiameter}</span> mm on
                    diameter
                  </span>
                </div>
                <Table
                  head={["Pass", "Off X (rad)", "Off Z", "Cuts (rad)"]}
                  rows={out.result.passes.map((p) => [p.pass, p.offsetX, p.offsetZ, p.depth])}
                />
                {out.result.singlePass && (
                  <p className="mt-3 rounded-lg bg-accent-red/10 border border-accent-red/30 p-3 text-[11px] text-accent-red leading-relaxed">
                    One division is one pass, and it takes the whole {out.result.depthPerPass} mm of
                    relief in a single cut. R1 is legal but it is not a light setting — the zero
                    offset in the table means the pass sits on the finished shape, not that there is
                    nothing to remove.
                  </p>
                )}
                {!out.result.singlePass && heavy && (
                  <p className="mt-3 rounded-lg bg-accent-amber/10 border border-accent-amber/30 p-3 text-[11px] text-accent-amber leading-relaxed">
                    {out.result.depthPerPass} mm on the radius per pass is a heavy roughing cut (
                    {out.result.depthOnDiameter} mm on diameter). Raise the divisions to spread it —
                    G71 and G72 ask for this depth outright, G73 only lets you choose it through the
                    pass count.
                  </p>
                )}
                {reliefShort && (
                  <p className="mt-3 rounded-lg bg-accent-red/10 border border-accent-red/30 p-3 text-[11px] text-accent-red leading-relaxed">
                    The blank is {oversize} mm oversize on the radius but the relief is only{" "}
                    {pf(reliefX)} mm. The first pass would start inside the material and take a cut
                    nobody planned. Set the relief to at least {oversize}.
                  </p>
                )}
                {reliefLong && (
                  <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                    The relief is well past the {oversize} mm the blank is actually oversize, so the
                    early passes cut air — the waste G73 exists to avoid.
                  </p>
                )}
              </>
            )
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ProfileEditor rows={rows} setRows={setRows} />
          <ProfileFormNotice points={profile.error ? [] : profile.points} hasTypeII={false} />
        </div>
        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Profile Coordinates" />
          {profile.error ? (
            <p className="text-sm text-accent-red py-4">{profile.error}</p>
          ) : (
            <>
              <p className="mb-2 text-[11px] text-gray-500">
                Overall length <span className="font-mono text-white">{profile.total}</span> mm
              </p>
              <Table
                head={["X (Ø)", "Z", "Move"]}
                rows={profile.points.map((p) => [p.x, p.z, p.move])}
              />
            </>
          )}
        </Card>
      </div>

      <LatheSimulation
        moves={out.moves}
        stockDiameter={(pf(stock) || 0) > 0 ? pf(stock) : 38 + 2 * (pf(reliefX) || 0)}
        length={profile.total || 40}
        targetPoints={profile.points}
        // The blank is a casting that already follows the shape, oversize by
        // the relief. Drawn as a solid bar instead, the first pass appeared to
        // hog metal that was never there and contradicted the depth per pass
        // printed beside it.
        nearNetOversize={pf(reliefX) || 0}
        error={out.error}
        passLabel={(p) => `pass ${p}`}
        note="The blank starts as the finished shape plus the relief, which is the casting or forging this cycle is written for. Every pass keeps that same outline, which is what separates it from G71 — there the passes are parallel slices, here they are copies of the shape stepped back from it."
      />
      {!out.error && (
        <Program
          lines={out.code}
          note="The profile blocks between P and Q are written out here. A G73 header on its own names blocks it never defines, and the control either alarms or follows whatever shape those numbers happen to hold from an earlier program."
        />
      )}
    </div>
  );
}

/* ═══ G74 · Peck drilling ═══════════════════════════════════════════════════ */

function G74Panel() {
  const [depth, setDepth] = usePersistentState("cnc.G74Panel.depth", "30");
  const [peck, setPeck] = usePersistentState("cnc.G74Panel.peck", "5");
  const [drill, setDrill] = usePersistentState("cnc.G74Panel.drill", "10");
  const [retract, setRetract] = usePersistentState("cnc.G74Panel.retract", "1");
  const [feed, setFeed] = usePersistentState("cnc.G74Panel.feed", "0.15");
  const [clearance, setClearance] = usePersistentState("cnc.G74Panel.clearance", "2");
  // What is actually in the chuck. Without it the picture invented a bar three
  // times the drill, so a 10 mm hole through a 100 mm billet was drawn in a
  // 30 mm one — a part nobody was making.
  const [bar, setBar] = usePersistentState("cnc.G74Panel.bar", "");

  const input = {
    depth: pf(depth),
    peck: pf(peck),
    retract: pf(retract),
    feed: pf(feed),
    clearance: pf(clearance),
  };

  const out = useMemo(() => {
    try {
      return {
        result: calcG74(input),
        code: generateG74Code(input),
        moves: buildG74Toolpath({ ...input, drillDiameter: pf(drill) || 10 }),
        error: "",
      };
    } catch (cause) {
      return {
        result: null,
        code: [],
        moves: [],
        error: cause instanceof Error ? cause.message : "Check the values.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth, peck, drill, retract, feed, clearance]);

  // Depth in diameters is the number that decides whether pecking is optional.
  const ratio = pf(drill) > 0 ? pf(depth) / pf(drill) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="G74 — Peck Drilling" />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Hole Depth" value={depth} onChange={setDepth} suffix="mm" />
            <Num label="Drill Ø" value={drill} onChange={setDrill} suffix="mm" />
            <Num label="Peck (Q)" value={peck} onChange={setPeck} suffix="mm" />
            <Num label="Retract (R)" value={retract} onChange={setRetract} suffix="mm" />
            <Num label="Feed (F)" value={feed} onChange={setFeed} suffix="mm/rev" />
            <Num label="Start Clearance" value={clearance} onChange={setClearance} suffix="mm" />
            <Num
              label="Bar Ø"
              value={bar}
              onChange={setBar}
              suffix="mm"
              hint={
                pf(bar) > 0
                  ? "the workpiece being drilled"
                  : `guessed at Ø${Math.max((pf(drill) || 10) * 3, 20)} — say what it really is`
              }
            />
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Q is written in microns with no decimal point, which is the trap in this cycle: a peck
            of 5 mm is Q5000. Peck anything past about three diameters deep — the chips have nowhere
            to go and the drill packs up and snaps.
          </p>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Pecks" />
          {out.error ? (
            <p className="text-sm text-accent-red py-4">{out.error}</p>
          ) : (
            out.result && (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  <span className="font-mono text-white">{out.result.totalPecks}</span> pecks to
                  reach <span className="font-mono text-white">{depth}</span> mm —{" "}
                  <span className={ratio > 3 ? "text-accent-amber" : ""}>
                    {ratio.toFixed(1)}× diameter
                  </span>
                </p>
                <Table
                  head={["Peck", "Z", "Advance"]}
                  rows={out.result.steps.map((s) => [s.peck, s.z, s.advance])}
                />
              </>
            )
          )}
        </Card>
      </div>
      <LatheSimulation
        moves={out.moves}
        stockDiameter={pf(bar) > 0 ? pf(bar) : Math.max((pf(drill) || 10) * 3, 20)}
        length={Math.max(pf(depth) * 1.25, pf(depth) + 5)}
        start={{ x: pf(drill) || 10, z: pf(clearance) || 2 }}
        error={out.error}
        passLabel={(p) => `peck ${p}`}
        note="The hole is punched out of the bar as the drill advances. Each peck rapids back down to where the last one stopped and only feeds the fresh metal, which is why pecking costs so little time."
      />
      {!out.error && (
        <Program
          lines={out.code}
          note="X0 puts the drill on centre. The same cycle grooves a face if you give it an X as well."
        />
      )}
    </div>
  );
}

/* ═══ G75 · Grooving and parting ════════════════════════════════════════════ */

function G75Panel() {
  const [stock, setStock] = usePersistentState("cnc.G75Panel.stock", "50");
  const [grooveDia, setGrooveDia] = usePersistentState("cnc.G75Panel.grooveDia", "40");
  const [width, setWidth] = usePersistentState("cnc.G75Panel.width", "6");
  const [toolWidth, setToolWidth] = usePersistentState("cnc.G75Panel.toolWidth", "3");
  const [xPeck, setXPeck] = usePersistentState("cnc.G75Panel.xPeck", "1");
  const [retract, setRetract] = usePersistentState("cnc.G75Panel.retract", "0.5");
  const [feed, setFeed] = usePersistentState("cnc.G75Panel.feed", "0.08");
  const [zStart, setZStart] = usePersistentState("cnc.G75Panel.zStart", "-20");

  const input = {
    stockDiameter: pf(stock),
    grooveDiameter: pf(grooveDia),
    grooveWidth: pf(width),
    toolWidth: pf(toolWidth),
    xPeck: pf(xPeck),
    retract: pf(retract),
    feed: pf(feed),
    zStart: pf(zStart),
  };

  const out = useMemo(() => {
    try {
      return {
        result: calcG75(input),
        code: generateG75Code(input),
        moves: buildG75Toolpath(input),
        error: "",
      };
    } catch (cause) {
      return {
        result: null,
        code: [],
        moves: [],
        error: cause instanceof Error ? cause.message : "Check the values.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, grooveDia, width, toolWidth, xPeck, retract, feed, zStart]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="G75 — Grooving / Parting" />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Stock Ø" value={stock} onChange={setStock} suffix="mm" />
            <Num
              label="Groove Ø"
              value={grooveDia}
              onChange={setGrooveDia}
              suffix="mm"
              hint="0 parts the bar off"
            />
            <Num label="Groove Width" value={width} onChange={setWidth} suffix="mm" />
            <Num label="Tool Width" value={toolWidth} onChange={setToolWidth} suffix="mm" />
            <Num
              label="X Peck (P)"
              value={xPeck}
              onChange={setXPeck}
              suffix="mm"
              hint="radius value"
            />
            <Num label="Retract (R)" value={retract} onChange={setRetract} suffix="mm" />
            <Num label="Feed (F)" value={feed} onChange={setFeed} suffix="mm/rev" />
            <Num label="Z of First Plunge" value={zStart} onChange={setZStart} suffix="mm" />
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            The step between plunges can never exceed the tool width or a ring of metal is left
            standing between them. The plunges below are spaced evenly across what is left after the
            first cut, so the last one lands exactly on the far wall.
          </p>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Plunges" />
          {out.error ? (
            <p className="text-sm text-accent-red py-4">{out.error}</p>
          ) : (
            out.result && (
              <>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400 mb-3">
                  <span>
                    Depth <span className="font-mono text-white">{out.result.radialDepth}</span> mm
                    radius
                  </span>
                  <span>
                    <span className="font-mono text-white">{out.result.pecksPerPlunge}</span> pecks
                    each
                  </span>
                  {out.result.parting && <span className="text-accent-amber">parting off</span>}
                </div>
                <Table head={["Plunge", "Z"]} rows={out.result.plungeZ.map((z, i) => [i + 1, z])} />
              </>
            )
          )}
        </Card>
      </div>
      <LatheSimulation
        moves={out.moves}
        stockDiameter={pf(stock)}
        length={Math.abs(pf(zStart)) + pf(width) + 10}
        error={out.error}
        passLabel={(p) => `plunge ${p}`}
        note="The slot is cut as wide as the tool, not as a line, so overlapping plunges show as one groove. If a step ever exceeded the tool width you would see the metal left standing between them."
      />
      {!out.error && (
        <Program
          lines={out.code}
          note="Parting off, take the speed down and hold constant surface speed off — at G96 the spindle runs away as the diameter falls to nothing."
        />
      )}
    </div>
  );
}

/* ═══ G76 · Threading ═══════════════════════════════════════════════════════ */

function G76Panel() {
  const [major, setMajor] = usePersistentState("cnc.G76Panel.major", "20");
  const [pitch, setPitch] = usePersistentState("cnc.G76Panel.pitch", "2.5");
  const [zEnd, setZEnd] = usePersistentState("cnc.G76Panel.zEnd", "-30");
  const [form, setForm] = usePersistentState<ThreadForm>("cnc.G76Panel.form", "metric60");
  const [firstPass, setFirstPass] = usePersistentState("cnc.G76Panel.firstPass", "0.3");
  const [minDepth, setMinDepth] = usePersistentState("cnc.G76Panel.minDepth", "0.05");
  const [allowance, setAllowance] = usePersistentState("cnc.G76Panel.allowance", "0.05");
  const [finishPasses, setFinishPasses] = usePersistentState("cnc.G76Panel.finishPasses", "2");
  const [chamfer, setChamfer] = usePersistentState("cnc.G76Panel.chamfer", "10");
  const [taper, setTaper] = usePersistentState("cnc.G76Panel.taper", "0");
  const [internal, setInternal] = usePersistentState("cnc.G76Panel.internal", false);
  /**
   * The bar the thread is cut on, or bored into.
   *
   * Guessing it as major + 8 drew a Ø28 billet for an M20 screw. For a nut it
   * is wrong the other way about: there the major diameter is the bore, and
   * the bar has to be larger than it, not eight millimetres larger than the
   * thread it contains.
   */
  const [threadBar, setThreadBar] = usePersistentState("cnc.G76Panel.threadBar", "");

  const input = {
    majorDiameter: pf(major),
    pitch: pf(pitch),
    zEnd: pf(zEnd),
    form,
    firstPassDepth: pf(firstPass),
    finishPasses: pi(finishPasses, 0),
    finishAllowance: pf(allowance),
    minDepth: pf(minDepth),
    chamfer: pi(chamfer, 0),
    taper: pf(taper) || 0,
    internal,
  };

  const out = useMemo(() => {
    try {
      return {
        result: calcG76(input),
        code: generateG76Code(input),
        moves: buildG76Toolpath(input),
        error: "",
      };
    } catch (cause) {
      return {
        result: null,
        code: [],
        moves: [],
        error: cause instanceof Error ? cause.message : "Check the values.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    major,
    pitch,
    zEnd,
    form,
    firstPass,
    minDepth,
    allowance,
    finishPasses,
    chamfer,
    taper,
    internal,
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="G76 — Threading" />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Major Ø" value={major} onChange={setMajor} suffix="mm" />
            <Num label="Pitch (F)" value={pitch} onChange={setPitch} suffix="mm" />
            <Num label="Thread to Z" value={zEnd} onChange={setZEnd} suffix="mm" />
            <Pick
              label="Form"
              value={form}
              onChange={setForm}
              options={(Object.keys(THREAD_FORMS) as ThreadForm[]).map((k) => ({
                value: k,
                label: THREAD_FORMS[k].label,
              }))}
            />
            <Num
              label="First Pass (Q)"
              value={firstPass}
              onChange={setFirstPass}
              suffix="mm"
              hint="radius value"
            />
            <Num label="Min Depth (Q)" value={minDepth} onChange={setMinDepth} suffix="mm" />
            <Num label="Finish Allow. (R)" value={allowance} onChange={setAllowance} suffix="mm" />
            <Num
              label="Finish Passes"
              value={finishPasses}
              onChange={setFinishPasses}
              suffix="passes"
            />
            <Num label="Chamfer" value={chamfer} onChange={setChamfer} suffix="×0.1 lead" />
            <Num
              label="Taper (R)"
              value={taper}
              onChange={setTaper}
              suffix="mm"
              hint="0 is parallel"
            />
            <Num
              label="Bar Ø"
              value={threadBar}
              onChange={setThreadBar}
              suffix="mm"
              hint={
                pf(threadBar) > 0
                  ? internal
                    ? "the billet the nut is bored from"
                    : "the bar the screw is cut from"
                  : `guessed at Ø${pf(major) + 8} — say what it really is`
              }
            />
          </div>
          {/* An internal thread is cut into a bore, so the billet has to be
              bigger than the major diameter. The other way round there is no
              metal for the thread to be in. */}
          {internal && pf(threadBar) > 0 && pf(threadBar) <= pf(major) && (
            <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3">
              <p className="text-xs font-semibold text-accent-red">
                A Ø{pf(threadBar)} bar cannot hold a Ø{pf(major)} internal thread.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-300">
                For a nut the major diameter is the bore, so the billet has to be larger than it —
                enough larger to leave a wall once the thread is in.
              </p>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              aria-label="Internal thread"
            />
            Internal — cut a nut, not a screw
          </label>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Passes" />
          {out.error ? (
            <p className="text-sm text-accent-red py-4">{out.error}</p>
          ) : (
            out.result && (
              <>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400 mb-3">
                  <span>
                    Height <span className="font-mono text-white">{out.result.height}</span> mm
                    radius
                  </span>
                  <span>
                    Finishes at Ø
                    <span className="font-mono text-white">{out.result.finalDiameter}</span>
                  </span>
                  <span>
                    <span className="font-mono text-white">{out.result.roughingPasses}</span>{" "}
                    roughing
                  </span>
                </div>
                <Table
                  head={["Pass", "X (Ø)", "Depth", "This cut"]}
                  rows={out.result.passes.map((p) => [
                    p.finishing ? `${p.pass} ✓` : p.pass,
                    p.diameter,
                    p.depth,
                    p.increment,
                  ])}
                />
              </>
            )
          )}
        </Card>
      </div>

      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Why the passes get thinner" />
        <p className="text-xs text-gray-400 leading-relaxed">
          Depth after n passes is Q×√n, so every pass removes the same area of metal rather than the
          same depth. A thread cut at a constant depth loads the last passes hardest, because the
          tool is engaged across the full flank by then — which is how threading inserts get broken.
          The ticks mark the finishing passes: the first takes the allowance, the rest are spring
          passes that cut nothing and clean the form up.
        </p>
      </Card>

      <LatheSimulation
        moves={out.moves}
        stockDiameter={pf(threadBar) > 0 ? pf(threadBar) : pf(major) + 8}
        length={Math.abs(pf(zEnd)) + 10}
        error={out.error}
        passLabel={(p) =>
          out.result && p > out.result.roughingPasses ? `finishing pass ${p}` : `pass ${p}`
        }
        note="Watch the passes crowd together as they get shallower — that is the constant-volume infeed. The tool infeeds clear of the work each time, which is why a thread needs run-out room in front of a shoulder. The picture shows the envelope the tool sweeps, not the helix itself."
      />
      {!out.error && (
        <Program
          lines={out.code}
          note="P on the first block packs three pairs of digits with no separators — finishing passes, chamfer in tenths of the lead, then the tool angle. P and Q are microns without a decimal point; everything else carries one."
        />
      )}
    </div>
  );
}

/* ═══ G90 / G92 / G94 · Single-block cycles ═════════════════════════════════ */

function SimplePanel() {
  const [cycle, setCycle] = usePersistentState<SimpleCycle>("cnc.SimplePanel.cycle", "g90");
  const [start, setStart] = usePersistentState("cnc.SimplePanel.start", "50");
  const [finish, setFinish] = usePersistentState("cnc.SimplePanel.finish", "40");
  const [startZ, setStartZ] = usePersistentState("cnc.SimplePanel.startZ", "0");
  const [zEnd, setZEnd] = usePersistentState("cnc.SimplePanel.zEnd", "-40");
  const [doc, setDoc] = usePersistentState("cnc.SimplePanel.doc", "2");
  const [feed, setFeed] = usePersistentState("cnc.SimplePanel.feed", "0.2");
  const [taper, setTaper] = usePersistentState("cnc.SimplePanel.taper", "0");
  const [pitch, setPitch] = usePersistentState("cnc.SimplePanel.pitch", "2.5");
  /**
   * The bar in the chuck, which is not the same thing as where the cut starts.
   *
   * Turning happens to begin at the outside, so borrowing the start diameter
   * for the bar looked right under G90. Under G94 it is not: a facing cut
   * starts at whatever diameter it starts at, and drawing the billet that size
   * showed a part narrower than the one being faced.
   */
  const [bar, setBar] = usePersistentState("cnc.SimplePanel.bar", "");

  const facing = cycle === "g94";
  const threading = cycle === "g92";

  const input = {
    cycle,
    startDiameter: pf(start),
    finishDiameter: pf(finish),
    startZ: pf(startZ) || 0,
    zEnd: pf(zEnd),
    depthOfCut: pf(doc),
    feed: pf(feed),
    taper: pf(taper) || 0,
    pitch: pf(pitch),
  };

  const out = useMemo(() => {
    try {
      const result = calcSimpleCycle(input);
      return {
        ...result,
        code: generateSimpleCycleCode(input),
        moves: buildSimpleToolpath(input),
        error: "",
      };
    } catch (cause) {
      return {
        axis: "X" as const,
        stops: [] as number[],
        code: [] as string[],
        moves: [],
        error: cause instanceof Error ? cause.message : "Check the values.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, start, finish, startZ, zEnd, doc, feed, taper, pitch]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="Single-block cycles" />
          <Pick
            label="Cycle"
            value={cycle}
            onChange={setCycle}
            options={(Object.keys(SIMPLE_CYCLES) as SimpleCycle[]).map((k) => ({
              value: k,
              label: SIMPLE_CYCLES[k].label,
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            {!facing && <Num label="Start Ø" value={start} onChange={setStart} suffix="mm" />}
            <Num
              label={facing ? "Face in to Ø" : "Finish Ø"}
              value={finish}
              onChange={setFinish}
              suffix="mm"
              hint={facing ? "held on every block" : undefined}
            />
            {facing && <Num label="Z Start" value={startZ} onChange={setStartZ} suffix="mm" />}
            <Num label="Z End" value={zEnd} onChange={setZEnd} suffix="mm" />
            <Num
              label="Depth of Cut"
              value={doc}
              onChange={setDoc}
              suffix="mm"
              hint={facing ? "a Z distance" : "radius value"}
            />
            {threading ? (
              <Num label="Pitch (F)" value={pitch} onChange={setPitch} suffix="mm" />
            ) : (
              <Num label="Feed (F)" value={feed} onChange={setFeed} suffix="mm/rev" />
            )}
            <Num
              label="Taper (R)"
              value={taper}
              onChange={setTaper}
              suffix="mm"
              hint="0 is parallel"
            />
            <Num
              label="Bar Ø"
              value={bar}
              onChange={setBar}
              suffix="mm"
              hint={
                pf(bar) > 0
                  ? "the workpiece in the chuck"
                  : `guessed at Ø${Math.max(pf(start), pf(finish)) || 0} — say what it really is`
              }
            />
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            {SIMPLE_CYCLES[cycle].description} These cycles cut once per block, so the programmer
            writes the whole stack out by hand. That column is where a transposed digit hides, which
            is the reason to generate it rather than type it.
          </p>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            {facing
              ? "A facing cycle walks back along Z and holds the diameter, so Z is the word that changes line by line."
              : "A turning cycle walks in on X and holds Z, so X is the word that changes line by line."}
          </p>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Cuts" />
          {out.error ? (
            <p className="text-sm text-accent-red py-4">{out.error}</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                <span className="font-mono text-white">{out.stops.length}</span> blocks, stepping
                along <span className="font-mono text-white">{out.axis}</span>
              </p>
              <Table
                head={["Block", out.axis === "X" ? "X (Ø)" : "Z"]}
                rows={out.stops.map((s, i) => [i + 1, s])}
              />
            </>
          )}
        </Card>
      </div>
      <LatheSimulation
        moves={out.moves}
        stockDiameter={pf(bar) > 0 ? pf(bar) : Math.max(pf(start), pf(finish))}
        length={Math.abs(pf(zEnd)) + 10}
        error={out.error}
        passLabel={(p) => `block ${p}`}
        note={
          facing
            ? "Every block takes another slice off the end of the bar, holding the same diameter."
            : "Every block is one full-length pass at the next diameter down."
        }
      />
      {!out.error && (
        <Program
          lines={out.code}
          note="After the first block the control holds Z, R and F in force, so only X changes. That is the format a lathe expects — repeating the whole block on every line is legal but nobody writes it that way."
        />
      )}
    </div>
  );
}

/* ═══ Page ══════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "g71", label: "G71 · OD Rough", comp: G71Panel },
  { id: "g72", label: "G72 · Facing", comp: G72Panel },
  { id: "g73", label: "G73 · Pattern", comp: G73Panel },
  { id: "g74", label: "G74 · Peck Drill", comp: G74Panel },
  { id: "g75", label: "G75 · Groove", comp: G75Panel },
  { id: "g76", label: "G76 · Thread", comp: G76Panel },
  { id: "simple", label: "G90 · G92 · G94", comp: SimplePanel },
  // The backplot is a tab of its own rather than a footer under every cycle.
  // Repeated seven times it only ever showed the same canned sample.
  { id: "backplot", label: "Backplot", comp: null },
];

const TAB_KEY = "mp_cnc_tab";

export default function CNCPage() {
  const [tab, setTab] = useState("g71");
  const [program, setProgram] = usePersistentState("cnc.CNCPage.program", SAMPLE);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Come back to the cycle that was last open. Somebody working through a job
  // moves between this page and the machine repeatedly, and landing on G71
  // every time meant finding G76 again on each return.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(TAB_KEY);
    } catch {
      return;
    }
    // Only a tab that still exists — a stored id from an older build must not
    // leave the page with nothing to render.
    if (saved && TABS.some((t) => t.id === saved)) setTab(saved);
  }, []);

  const selectTab = (id: string) => {
    setTab(id);
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      // Storage being unavailable must not stop the tab changing.
    }
  };

  // Arrow keys move between tabs, which is what a tablist is expected to do
  // and the only way to reach them without a mouse on a shop terminal.
  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    selectTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  // Falls back rather than asserting: the stored id is validated above, but a
  // non-null assertion here would turn any future miss into a blank page.
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const Panel = active.comp;

  const plot = useMemo(
    () => (lines: string[]) => {
      setProgram(lines.join("\n"));
      setTab("backplot");
      try {
        localStorage.setItem(TAB_KEY, "backplot");
      } catch {
        /* not worth failing the plot over */
      }
    },
    // setProgram is stable; listed only because the linter cannot see that
    // through usePersistentState.
    [setProgram],
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="CNC Canned Cycles"
        description="Fanuc lathe cycles — pass coordinates and the blocks to type in"
        icon={<Cpu size={20} />}
      />

      <div className="rounded-xl border border-accent-amber/25 bg-accent-amber/[0.06] px-4 py-3 flex gap-3">
        <AlertTriangle size={16} className="text-accent-amber shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          Check these figures against your own setup before cutting, and dry-run with the tool
          clear. A wrong coordinate here moves the machine, not just the screen.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Canned cycle"
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {TABS.map((t, i) => {
          const selected = t.id === active.id;
          return (
            <button
              key={t.id}
              id={`cnc-tab-${t.id}`}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              aria-selected={selected}
              aria-controls="cnc-tabpanel"
              // Roving tabindex: Tab reaches the strip once, then the arrow
              // keys move within it, rather than stopping on all eight.
              tabIndex={selected ? 0 : -1}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              onClick={() => selectTab(t.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selected
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                  : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white hover:bg-dark-800"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id="cnc-tabpanel" role="tabpanel" aria-labelledby={`cnc-tab-${active.id}`}>
        {Panel ? (
          <SendToBackplot.Provider value={plot}>
            <Panel />
          </SendToBackplot.Provider>
        ) : (
          <Backplot source={program} onSourceChange={setProgram} />
        )}
      </div>
    </div>
  );
}
