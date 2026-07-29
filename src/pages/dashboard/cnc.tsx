import { useMemo, useState } from "react";
import {
  calculateG71,
  generateG71Code,
  profileCoordinates,
  profileLength,
  type G71Input,
  type ProfileStep,
} from "@/lib/cnc/g71";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Cpu, Copy, Check, AlertTriangle } from "lucide-react";

const field =
  "w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none";

function Num({
  label, value, onChange, suffix, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string;
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

const pf = (v: string) => parseFloat(v);

export default function CNCPage() {
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
  const [copied, setCopied] = useState(false);
  // The part as it is dimensioned on the drawing: a diameter and a length per step.
  const [rows, setRows] = useState<Array<{ d: string; l: string }>>([
    { d: "20", l: "15" },
    { d: "30", l: "20" },
    { d: "40", l: "25" },
  ]);

  const steps: ProfileStep[] = rows
    .map((r) => ({ diameter: pf(r.d), length: pf(r.l) }))
    .filter((s) => Number.isFinite(s.diameter) && Number.isFinite(s.length));

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

  const setRow = (i: number, key: "d" | "l", v: string) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

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
      return {
        result: calculateG71(input),
        code: generateG71Code(input, {
          startBlock: parseInt(ns, 10) || 100,
          endBlock: parseInt(nf, 10) || 110,
          feed: pf(feed) || 0.2,
          steps: steps.length ? steps : undefined,
        }),
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

  const copy = () => {
    navigator.clipboard?.writeText(code.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="G71 — OD Roughing (Type I)" />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Stock Ø" value={stock} onChange={setStock} suffix="mm" />
            <Num label="Finished Ø" value={finish} onChange={setFinish} suffix="mm" />
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
              <div className="max-h-64 overflow-auto">
                <table className="w-full font-mono text-xs">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="text-left font-normal">Pass</th>
                      <th className="text-right font-normal">X (Ø)</th>
                      <th className="text-right font-normal">Depth (rad)</th>
                      <th className="text-right font-normal">Z</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {result.passes.map((p) => (
                      <tr key={p.pass} className="border-t border-dark-700/60">
                        <td className="py-1.5">{p.pass}</td>
                        <td className="py-1.5 text-right">{p.diameter}</td>
                        <td className="py-1.5 text-right text-gray-400">{p.depth}</td>
                        <td className="py-1.5 text-right text-gray-400">{p.z}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Part Profile" className="!mb-0" />
            <span className="text-[10px] text-gray-600">as dimensioned on the drawing</span>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1.6rem_1fr_1fr_1.8rem] gap-2 text-[10px] uppercase tracking-wider text-gray-600">
              <span>#</span><span>Diameter</span><span>Length</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.6rem_1fr_1fr_1.8rem] gap-2 items-center">
                <span className="font-mono text-xs text-gray-500">{i + 1}</span>
                <input
                  className={field} value={r.d} inputMode="decimal"
                  aria-label={`Step ${i + 1} diameter`}
                  onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "d", e.target.value)}
                />
                <input
                  className={field} value={r.l} inputMode="decimal"
                  aria-label={`Step ${i + 1} length`}
                  onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setRow(i, "l", e.target.value)}
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
            onClick={() => setRows((c) => [...c, { d: "", l: "" }])}
            className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/[0.08] hover:text-white"
          >
            + Add step
          </button>
          <p className="mt-3 text-[10px] text-gray-600 leading-relaxed">
            Enter each step from the face outwards. Z is worked out cumulatively, so step two
            runs to the sum of the lengths before it — the part that is easy to get wrong by hand.
          </p>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Profile Coordinates" />
          {profile.error ? (
            <p className="text-sm text-accent-red py-4">{profile.error}</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Overall length <span className="font-mono text-white">{profile.total}</span> mm
              </p>
              <div className="max-h-64 overflow-auto">
                <table className="w-full font-mono text-xs">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="text-left font-normal">X (Ø)</th>
                      <th className="text-right font-normal">Z</th>
                      <th className="text-right font-normal">Move</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {profile.points.map((p, i) => (
                      <tr key={i} className="border-t border-dark-700/60">
                        <td className="py-1.5">{p.x}</td>
                        <td className="py-1.5 text-right">{p.z}</td>
                        <td className="py-1.5 text-right text-gray-500">{p.move}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      {!error && code.length > 0 && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Program Blocks" className="!mb-0" />
            <button
              onClick={copy}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                copied ? "bg-accent-green/20 text-accent-green" : "bg-dark-700/50 text-gray-500 hover:text-white"
              }`}
              aria-label="Copy program blocks"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <pre className="rounded-xl bg-dark-900 border border-dark-700 p-3 text-xs font-mono text-accent-cyan overflow-x-auto">
{code.join("\n")}
          </pre>
          <p className="mt-2 text-[10px] text-gray-600">
            Type I profile — a straight turn. A groove or an undercut needs Type II, which this
            does not write.
          </p>
        </Card>
      )}
    </div>
  );
}
