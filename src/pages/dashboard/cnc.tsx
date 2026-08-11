import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  calculateG71,
  generateG71Code,
  profileCoordinates,
  profileLength,
  profileDrawing,
  type G71Input,
  type ProfileStep,
} from "@/lib/cnc/g71";
import {
  calcG72,
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
export type ProfileRow = { d: string; l: string; e: string };

/** The typed rows as steps, dropping any row not yet filled in. */
function rowsToSteps(rows: ProfileRow[]): ProfileStep[] {
  return rows
    .map((r) => ({
      diameter: pf(r.d),
      length: pf(r.l),
      // Blank means a parallel step; a value makes it a taper.
      endDiameter: r.e.trim() === "" ? undefined : pf(r.e),
    }))
    .filter((s) => Number.isFinite(s.diameter) && Number.isFinite(s.length));
}

/**
 * The shape of the finished part, shared by every cycle that roughs to a
 * profile. G71 had this and G73 did not, which is why G73 could only ever
 * illustrate a shape rather than cut the operator's own.
 *
 * Straight and tapered steps only. A radius needs a G02/G03 block and the
 * pass planner walks straight segments to find where a pass stops, so arcs
 * are a change to the geometry underneath this, not to the table.
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

  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader title="Part Profile" className="!mb-0" />
        <span className="text-[10px] text-gray-600">as dimensioned on the drawing</span>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-[1.4rem_1fr_1fr_1fr_1.6rem] gap-2 text-[10px] uppercase tracking-wider text-gray-600">
          <span>#</span>
          <span>Diameter</span>
          <span>Length</span>
          <span>End Ø</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1.4rem_1fr_1fr_1fr_1.6rem] gap-2 items-center">
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
      <button
        onClick={() => setRows((c) => [...c, { d: "", l: "", e: "" }])}
        className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/[0.08] hover:text-white"
      >
        + Add step
      </button>
      <p className="mt-3 text-[10px] text-gray-600 leading-relaxed">
        Enter each step from the face outwards. Leave End Ø blank for a parallel step, or give it to
        cut a taper. Z is worked out cumulatively, so step two runs to the sum of the lengths before
        it — the part that is easy to get wrong by hand.
      </p>
    </Card>
  );
}

/* ═══ G71 · OD roughing ═════════════════════════════════════════════════════ */

function G71Panel() {
  const [stock, setStock] = useState("50");
  const [finish, setFinish] = useState("40");
  const [length, setLength] = useState("60");
  const [doc, setDoc] = useState("2");
  const [allowX, setAllowX] = useState("0.5");
  const [allowZ, setAllowZ] = useState("0.1");
  const [retract, setRetract] = useState("1");
  const [feed, setFeed] = useState("0.25");
  const [ns, setNs] = useState("100");
  const [nf, setNf] = useState("110");
  // The part as it is dimensioned on the drawing: a diameter and a length per step.
  const [rows, setRows] = useState<Array<{ d: string; l: string; e: string }>>([
    { d: "20", l: "15", e: "" },
    { d: "30", l: "20", e: "" },
    { d: "40", l: "25", e: "" },
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

  const drawing = useMemo(() => {
    try {
      return profileDrawing(steps, pf(stock) || 0);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rows), stock]);

  const input: G71Input = {
    stockDiameter: pf(stock),
    finishDiameter: pf(finish),
    length: pf(length),
    depthOfCut: pf(doc),
    finishAllowanceX: pf(allowX),
    finishAllowanceZ: pf(allowZ),
    retract: pf(retract),
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
  }, [stock, finish, length, doc, allowX, allowZ, retract, feed, ns, nf, JSON.stringify(rows)]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="G71 — OD Roughing (Type I)" />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Stock Ø" value={stock} onChange={setStock} suffix="mm" />
            <Num
              label="Finished Ø"
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
                head={["Pass", "X (Ø)", "Depth (rad)", "Z"]}
                rows={result.passes.map((p) => [p.pass, p.diameter, p.depth, p.z])}
              />
            </>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProfileEditor rows={rows} setRows={setRows} />

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

      {!error && !profile.error && steps.length > 0 && (
        <G71Simulation input={input} steps={steps} includeFinish />
      )}

      {!error && code.length > 0 && (
        <Program
          lines={code}
          note="Type I profile — a straight turn. A groove or an undercut needs Type II, which this does not write. G70 finishes to size on the same blocks the roughing named."
        />
      )}
    </div>
  );
}

/* ═══ G72 · Facing roughing ═════════════════════════════════════════════════ */

function G72Panel() {
  const [stock, setStock] = useState("60");
  const [finish, setFinish] = useState("20");
  const [facing, setFacing] = useState("10");
  const [doc, setDoc] = useState("2");
  const [allowX, setAllowX] = useState("0.5");
  const [allowZ, setAllowZ] = useState("0.1");
  const [retract, setRetract] = useState("1");
  const [feed, setFeed] = useState("0.2");

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
    try {
      return {
        result: calcG72(input),
        code: generateG72Code(input, { feed: pf(feed) || 0.2 }),
        moves: buildG72Toolpath(input),
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
  }, [stock, finish, facing, doc, allowX, allowZ, retract, feed]);

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
                  head={["Pass", "Z", "Depth"]}
                  rows={out.result.passes.map((p) => [p.pass, p.z, p.depth])}
                />
              </>
            )
          )}
        </Card>
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

/* ═══ G73 · Pattern repeat ══════════════════════════════════════════════════ */

function G73Panel() {
  // Defaults are a coherent job, not just plausible numbers: a 44 mm blank over
  // a 38 mm largest diameter is 3 mm oversize on the radius, which is what the
  // relief is set to. Anything else would greet the user with their own warning.
  const [stock, setStock] = useState("44");
  const [reliefX, setReliefX] = useState("3");
  const [reliefZ, setReliefZ] = useState("1");
  const [divisions, setDivisions] = useState("4");
  const [allowX, setAllowX] = useState("0.5");
  const [allowZ, setAllowZ] = useState("0.1");
  const [feed, setFeed] = useState("0.2");
  const [ns, setNs] = useState("100");
  const [nf, setNf] = useState("110");

  // The part itself, the same table G71 uses. Before this the cycle drew a
  // fixed illustration, so the one thing an operator wanted to check — their
  // own shape — was the one thing it could not show.
  const [rows, setRows] = useState<ProfileRow[]>([
    { d: "26", l: "18", e: "" },
    { d: "38", l: "22", e: "" },
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
        <ProfileEditor rows={rows} setRows={setRows} />
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
        error={out.error}
        passLabel={(p) => `pass ${p}`}
        note="Every pass keeps the same outline, which is what separates this cycle from G71 — there the passes are parallel slices, here they are copies of the finished shape stepped back from it."
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
  const [depth, setDepth] = useState("30");
  const [peck, setPeck] = useState("5");
  const [drill, setDrill] = useState("10");
  const [retract, setRetract] = useState("1");
  const [feed, setFeed] = useState("0.15");
  const [clearance, setClearance] = useState("2");

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
        stockDiameter={Math.max((pf(drill) || 10) * 3, 20)}
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
  const [stock, setStock] = useState("50");
  const [grooveDia, setGrooveDia] = useState("40");
  const [width, setWidth] = useState("6");
  const [toolWidth, setToolWidth] = useState("3");
  const [xPeck, setXPeck] = useState("1");
  const [retract, setRetract] = useState("0.5");
  const [feed, setFeed] = useState("0.08");
  const [zStart, setZStart] = useState("-20");

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
  const [major, setMajor] = useState("20");
  const [pitch, setPitch] = useState("2.5");
  const [zEnd, setZEnd] = useState("-30");
  const [form, setForm] = useState<ThreadForm>("metric60");
  const [firstPass, setFirstPass] = useState("0.3");
  const [minDepth, setMinDepth] = useState("0.05");
  const [allowance, setAllowance] = useState("0.05");
  const [finishPasses, setFinishPasses] = useState("2");
  const [chamfer, setChamfer] = useState("10");
  const [taper, setTaper] = useState("0");
  const [internal, setInternal] = useState(false);

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
          </div>
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
        stockDiameter={pf(major) + 8}
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
  const [cycle, setCycle] = useState<SimpleCycle>("g90");
  const [start, setStart] = useState("50");
  const [finish, setFinish] = useState("40");
  const [startZ, setStartZ] = useState("0");
  const [zEnd, setZEnd] = useState("-40");
  const [doc, setDoc] = useState("2");
  const [feed, setFeed] = useState("0.2");
  const [taper, setTaper] = useState("0");
  const [pitch, setPitch] = useState("2.5");

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
        stockDiameter={pf(start)}
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
  const [program, setProgram] = useState(SAMPLE);
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
    [],
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
