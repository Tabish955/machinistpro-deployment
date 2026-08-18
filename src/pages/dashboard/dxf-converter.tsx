import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  analyzeCadGeometry,
  createDxfR12,
  getBounds,
  toSvgPathData,
  type DxfPath,
} from "@/lib/dxf-converter";
import {
  ACCEPTED,
  FORMATS,
  formatFor,
  loadDrawing,
  toSvgFile,
  type LoadedDrawing,
} from "@/lib/cad/registry";
import type { StlMode } from "@/lib/cad/stl-import";
import type { TraceMode } from "@/lib/cad/registry";
import {
  AlertTriangle,
  Download,
  FileUp,
  Layers,
  Loader2,
  RefreshCw,
  Ruler,
  ScanLine,
} from "lucide-react";

type OutputFormat = "dxf" | "svg";

const NO_PATHS: DxfPath[] = [];

export default function DxfConverterPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drawing, setDrawing] = useState<LoadedDrawing | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [advice, setAdvice] = useState("");
  const [dragging, setDragging] = useState(false);

  const [units, setUnits] = useState<"mm" | "in">("mm");
  const [scale, setScale] = useState(1);
  const [scaleWasSet, setScaleWasSet] = useState(false);
  const [output, setOutput] = useState<OutputFormat>("dxf");
  const [invert, setInvert] = useState(false);
  // How far the exported geometry may sit from the traced outline, in source
  // pixels. This is not slack to be removed: a traced edge is a staircase of
  // whole pixels, and the tolerance is the room the fitter needs to lay a
  // clean line or arc along it. At zero every pixel step becomes a vertex,
  // which is a heavier file and a rougher edge, not a truer one. 0.8 px is
  // below what any cutter resolves, so it is fixed rather than asked about.
  const fitTolerance = 0.8;
  const [stlMode, setStlMode] = useState<StlMode>("slice");
  // Left null the tracer decides from the ink; set, the user has overruled it.
  // An image is always read as a filled shape, which traces both edges of
  // every stroke — the outline you cut to. The centreline reading, which
  // brings a drawn line through once down its middle, is still in the
  // importer but is not offered: it answers a different question (reading a
  // scanned print) and having it on the same screen only invited the wrong
  // one to be picked.
  const [traceMode] = useState<TraceMode>("outline");
  const [sliceZ, setSliceZ] = useState<number | null>(null);

  // A fresh [] on every render would make every memo below recompute, and
  // fitting curves is not cheap enough to do for nothing.
  const paths: DxfPath[] = drawing?.paths ?? NO_PATHS;
  const bounds = useMemo(() => (paths.length ? getBounds(paths) : null), [paths]);
  const stats = useMemo(() => analyzeCadGeometry(paths, fitTolerance), [paths, fitTolerance]);
  const preview = useMemo(
    () => (paths.length ? toSvgPathData(paths, fitTolerance) : []),
    [paths, fitTolerance],
  );
  const viewBox = bounds
    ? `${bounds.minX - bounds.width * 0.05} ${bounds.minY - bounds.height * 0.05} ${bounds.width * 1.1} ${bounds.height * 1.1}`
    : "0 0 100 100";

  const reset = () => {
    setDrawing(null);
    setFile(null);
    setError("");
    setAdvice("");
    setBusy("");
    setSliceZ(null);
    setScaleWasSet(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const run = useCallback(
    async (
      target: File,
      overrides: {
        invert?: boolean;
        stlMode?: StlMode;
        sliceZ?: number;
        traceMode?: TraceMode;
      } = {},
    ) => {
      setError("");
      setAdvice("");
      setBusy("Reading file…");
      try {
        const loaded = await loadDrawing(target, {
          invert: overrides.invert ?? invert,
          stlMode: overrides.stlMode ?? stlMode,
          sliceZ: overrides.sliceZ ?? sliceZ ?? undefined,
          traceMode: overrides.traceMode ?? traceMode ?? undefined,
          onProgress: setBusy,
        });
        setDrawing(loaded);
        // A file that states its own units is believed over the current choice.
        if (loaded.units) setUnits(loaded.units);
        if (loaded.mesh && sliceZ === null)
          setSliceZ((loaded.mesh.min[2] + loaded.mesh.max[2]) / 2);
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "The file could not be read.";
        setError(message);
        // An unsupported format is not a failure to explain away — it comes
        // with the way out of it.
        const known = formatFor(target.name);
        if (known && !known.supported) setAdvice(known.advice ?? "");
        setDrawing(null);
      } finally {
        setBusy("");
      }
    },
    [invert, stlMode, sliceZ, traceMode],
  );

  const accept = (chosen: File | undefined | null) => {
    if (!chosen) return;
    reset();
    setFile(chosen);
    void run(chosen);
  };

  const download = () => {
    if (!paths.length) return;
    let text: string;
    let mime: string;
    let extension: string;
    try {
      if (output === "svg") {
        text = toSvgFile(paths, scale, fitTolerance);
        mime = "image/svg+xml";
        extension = "svg";
      } else {
        // R12 rather than the 2000 format: no handles, no object dictionary
        // and no layouts, which is the bookkeeping AutoCAD rejected the file over.
        text = createDxfR12(paths, scale, units, fitTolerance, {
          scaleWasSet: drawing?.needsScale ? scaleWasSet : true,
        });
        mime = "application/dxf";
        extension = "dxf";
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The file could not be written.");
      return;
    }
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${file?.name.replace(/\.[^.]+$/, "") || "machinistpro"}.${extension}`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const warnings = drawing?.warnings ?? [];

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl mx-auto">
      <PageHeader
        title="CAD Converter"
        description="Turn drawings, models, programs and photographs into CAD geometry — on this device"
        icon={<ScanLine size={22} className="text-accent-cyan" />}
        iconColor="cyan"
        status="beta"
      />

      <div className="grid lg:grid-cols-[380px_1fr] gap-5">
        <div className="space-y-4">
          <Card variant="solid" padding="md" className="border-dark-600">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">1. Drop a file</h2>
              <Badge color="green">Offline</Badge>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(event) => accept(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                accept(event.dataTransfer.files?.[0]);
              }}
              className={`w-full min-h-40 rounded-xl border border-dashed transition-colors flex flex-col items-center justify-center gap-3 text-center p-5 cursor-pointer ${
                dragging
                  ? "border-accent-cyan bg-accent-cyan/10"
                  : "border-dark-500 bg-dark-900/50 hover:border-accent-cyan/50 hover:bg-accent-cyan/5"
              }`}
            >
              {busy ? (
                <Loader2 size={28} className="text-accent-cyan animate-spin" />
              ) : (
                <FileUp size={28} className="text-accent-cyan" />
              )}
              <span className="text-sm font-medium text-white">
                {busy || "Drop a file here, or choose one"}
              </span>
              <span className="text-xs text-gray-400">
                DXF · PDF · SVG · STL · G-code · PNG/JPG · CSV
              </span>
            </button>

            {file && drawing && (
              <div className="mt-3 text-xs text-gray-400">
                <p className="truncate">
                  <span className="text-white">{file.name}</span>
                </p>
                <p className="mt-1">
                  Read as {drawing.format.label} — {drawing.summary}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-3 text-xs bg-accent-red/10 border border-accent-red/20 rounded-lg p-3">
                <p className="text-accent-red">{error}</p>
                {advice && <p className="text-gray-300 mt-2 leading-relaxed">{advice}</p>}
              </div>
            )}

            {warnings.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {warnings.map((warning) => (
                  <li
                    key={warning}
                    className="text-xs text-accent-amber flex gap-2 bg-accent-amber/10 border border-accent-amber/20 rounded-lg p-2.5"
                  >
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{warning}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card variant="solid" padding="md" className="border-dark-600">
            <h2 className="text-sm font-semibold text-white mb-4">2. Set up the drawing</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  Save as
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["dxf", "svg"] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => setOutput(kind)}
                      className={`rounded-lg py-2 text-xs font-semibold border cursor-pointer ${output === kind ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan" : "border-dark-600 text-gray-400"}`}
                    >
                      {kind === "dxf" ? "DXF (CAD)" : "SVG (vector)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  Output units
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["mm", "in"] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setUnits(unit)}
                      className={`rounded-lg py-2 text-xs font-semibold border cursor-pointer ${units === unit ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan" : "border-dark-600 text-gray-400"}`}
                    >
                      {unit === "mm" ? "Millimetres" : "Inches"}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  Scale per source unit
                </span>
                {drawing?.needsScale && !scaleWasSet && (
                  <span className="mt-1 block text-xs text-accent-amber">
                    A traced image is pixels, not millimetres. Set what one pixel measures before
                    exporting.
                  </span>
                )}
                <div className="relative mt-2">
                  <Ruler
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={scale}
                    onChange={(event) => {
                      setScale(Math.max(0.000001, Number(event.target.value) || 1));
                      setScaleWasSet(true);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-dark-900 border border-dark-600 text-sm font-mono text-white focus:border-accent-cyan/50 focus:outline-none"
                  />
                </div>
              </label>

              {drawing?.format.kind === "mesh" && drawing.mesh && (
                <div className="space-y-3 border-t border-dark-700 pt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <Layers size={13} className="text-accent-cyan" />A model is a solid; a drawing
                    is flat.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["slice", "outline"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setStlMode(mode);
                          if (file) void run(file, { stlMode: mode });
                        }}
                        className={`rounded-lg py-2 text-xs font-semibold border cursor-pointer ${stlMode === mode ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan" : "border-dark-600 text-gray-400"}`}
                      >
                        {mode === "slice" ? "Cross-section" : "Flatten"}
                      </button>
                    ))}
                  </div>
                  {stlMode === "slice" && (
                    <label className="block">
                      <span className="flex justify-between text-xs uppercase tracking-wider text-gray-400 font-semibold">
                        <span>Section height</span>
                        <span className="text-accent-cyan">Z {(sliceZ ?? 0).toFixed(2)}</span>
                      </span>
                      <input
                        type="range"
                        min={drawing.mesh.min[2]}
                        max={drawing.mesh.max[2]}
                        step={(drawing.mesh.max[2] - drawing.mesh.min[2]) / 200 || 0.01}
                        value={sliceZ ?? 0}
                        onChange={(event) => setSliceZ(Number(event.target.value))}
                        onPointerUp={() => {
                          if (file) void run(file, { sliceZ: sliceZ ?? undefined });
                        }}
                        className="w-full mt-2 accent-cyan-400"
                      />
                    </label>
                  )}
                </div>
              )}

              {drawing?.format.kind === "raster" && (
                <div className="space-y-3 border-t border-dark-700 pt-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invert}
                      onChange={(event) => {
                        setInvert(event.target.checked);
                        if (file) void run(file, { invert: event.target.checked });
                      }}
                      className="accent-cyan-400"
                    />
                    Trace light shapes instead of dark
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={reset}
                  disabled={!file}
                  className="rounded-lg py-2.5 border border-dark-600 text-xs text-gray-300 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={13} /> Reset
                </button>
                <button
                  onClick={download}
                  disabled={!paths.length || !!busy}
                  className="rounded-lg py-2.5 bg-accent-cyan text-dark-950 text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} /> Save {output.toUpperCase()}
                </button>
              </div>
            </div>
          </Card>
        </div>

        <Card variant="solid" padding="md" className="border-dark-600 min-h-[560px] flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">CAD preview</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                This is the geometry that will be written to the file
              </p>
            </div>
            {bounds && (
              <div className="flex flex-wrap gap-2">
                {stats.splines > 0 && (
                  <Badge color="cyan">{stats.splines.toLocaleString()} splines</Badge>
                )}
                {stats.arcs > 0 && <Badge color="purple">{stats.arcs.toLocaleString()} arcs</Badge>}
                {stats.lines > 0 && (
                  <Badge color="gray">{stats.lines.toLocaleString()} lines</Badge>
                )}
                {stats.polylines > 0 && (
                  <Badge color="gray">{stats.polylines.toLocaleString()} polylines</Badge>
                )}
                <Badge color="blue">
                  {(bounds.width * scale).toFixed(2)} × {(bounds.height * scale).toFixed(2)} {units}
                </Badge>
              </div>
            )}
          </div>
          <div
            className="relative flex-1 min-h-[460px] rounded-xl bg-[#080c12] border border-dark-700 overflow-hidden"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34,211,238,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.04) 1px,transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {paths.length ? (
              <svg
                viewBox={viewBox}
                className="absolute inset-0 w-full h-full p-5"
                preserveAspectRatio="xMidYMid meet"
              >
                <g
                  fill="none"
                  stroke="rgb(34 211 238)"
                  strokeWidth={Math.max(bounds!.width, bounds!.height) / 900}
                  vectorEffect="non-scaling-stroke"
                >
                  {preview.map((data, index) => (
                    <path
                      key={index}
                      d={data}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      // Rapids are travel, not metal removal, so they are drawn
                      // faintly rather than as something to cut.
                      opacity={paths[index]?.layer === "RAPID" ? 0.25 : 1}
                      strokeDasharray={paths[index]?.layer === "RAPID" ? "4 4" : undefined}
                    />
                  ))}
                </g>
              </svg>
            ) : (
              <div className="absolute inset-0 grid place-items-center text-center p-8">
                <div className="max-w-md">
                  <ScanLine size={42} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm text-gray-300">
                    Drop a drawing, model, program or photograph to convert it
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Everything is processed on this device — nothing is uploaded
                  </p>
                  <div className="mt-5 flex flex-wrap gap-1.5 justify-center">
                    {FORMATS.filter((format) => format.supported).map((format) => (
                      <span
                        key={format.id}
                        className="text-[11px] px-2 py-1 rounded-md bg-dark-800 border border-dark-600 text-gray-300"
                      >
                        {format.extensions[0].toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
