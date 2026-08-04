import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  analyzeCadGeometry,
  createDxf,
  getBounds,
  parseCoordinateText,
  parseSvg,
  traceRasterContours,
  type DxfPath,
} from "@/lib/dxf-converter";
import { Download, FileUp, RefreshCw, Ruler, ScanLine } from "lucide-react";

type SourceKind = "vector" | "coordinates" | "raster";

export default function DxfConverterPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [paths, setPaths] = useState<DxfPath[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [units, setUnits] = useState<"mm" | "in">("mm");
  const [scale, setScale] = useState(1);
  // A traced image has no size of its own, so the default 1 is a guess, not a
  // measurement. Until someone changes it, a traced export is refused.
  const [scaleWasSet, setScaleWasSet] = useState(false);
  const [threshold, setThreshold] = useState(128);
  const [invert, setInvert] = useState(false);
  const [smoothing, setSmoothing] = useState(55);
  const [fitTolerance, setFitTolerance] = useState(0.8);
  const [error, setError] = useState("");
  const [raster, setRaster] = useState<{
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  const bounds = useMemo(() => (paths.length ? getBounds(paths) : null), [paths]);
  const geometryStats = useMemo(
    () => analyzeCadGeometry(paths, fitTolerance),
    [paths, fitTolerance],
  );
  const viewBox = bounds
    ? `${bounds.minX - bounds.width * 0.05} ${bounds.minY - bounds.height * 0.05} ${bounds.width * 1.1} ${bounds.height * 1.1}`
    : "0 0 100 100";

  const reset = () => {
    setPaths([]);
    setFileName("");
    setSourceKind(null);
    setRaster(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const updateRaster = (value = threshold, inverted = invert, smoothness = smoothing) => {
    if (!raster) return;
    try {
      setPaths(
        traceRasterContours(
          raster.pixels,
          raster.width,
          raster.height,
          value,
          inverted,
          smoothness,
        ),
      );
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not trace this image.");
    }
  };

  const importFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "svg") {
        setPaths(parseSvg(await file.text()));
        setSourceKind("vector");
      } else if (extension === "csv" || extension === "txt" || extension === "xyz") {
        setPaths(parseCoordinateText(await file.text()));
        setSourceKind("coordinates");
      } else if (["png", "jpg", "jpeg", "bmp", "webp"].includes(extension ?? "")) {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const ratio = Math.min(1, 1400 / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            setError("Image processing is unavailable on this device.");
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const data = context.getImageData(0, 0, canvas.width, canvas.height);
          const nextRaster = { pixels: data.data, width: canvas.width, height: canvas.height };
          setRaster(nextRaster);
          setSourceKind("raster");
          try {
            setPaths(
              traceRasterContours(
                data.data,
                canvas.width,
                canvas.height,
                threshold,
                invert,
                smoothing,
              ),
            );
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not trace this image.");
          }
          URL.revokeObjectURL(url);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          setError("The image could not be opened.");
        };
        image.src = url;
      } else throw new Error("Supported inputs are SVG, CSV, TXT, XYZ, PNG, JPG, BMP and WebP.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The file could not be converted.");
    }
  };

  const download = () => {
    if (!paths.length) return;
    let dxf: string;
    try {
      dxf = createDxf(paths, scale, units, fitTolerance, { scaleWasSet });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The DXF could not be written.");
      return;
    }
    const blob = new Blob([dxf], {
      type: "application/dxf",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName.replace(/\.[^.]+$/, "") || "machinistpro"}.dxf`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl mx-auto">
      <PageHeader
        title="DXF Workshop"
        description="Convert workshop drawings into offline CAD geometry"
        icon={<ScanLine size={22} className="text-accent-cyan" />}
        iconColor="cyan"
        status="beta"
      />

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <div className="space-y-4">
          <Card variant="solid" padding="md" className="border-dark-600">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">1. Import drawing</h2>
              <Badge color="green">Offline</Badge>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".svg,.csv,.txt,.xyz,.png,.jpg,.jpeg,.bmp,.webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full min-h-36 rounded-xl border border-dashed border-dark-500 bg-dark-900/50 hover:border-accent-cyan/50 hover:bg-accent-cyan/5 transition-colors flex flex-col items-center justify-center gap-3 text-center p-5 cursor-pointer"
            >
              <FileUp size={28} className="text-accent-cyan" />
              <span className="text-sm font-medium text-white">Choose a workshop file</span>
              <span className="text-[11px] text-gray-500">
                SVG · CSV/XYZ · PNG/JPG · BMP · WebP
              </span>
            </button>
            {fileName && (
              <p className="mt-3 text-xs text-gray-400 truncate">
                Loaded: <span className="text-white">{fileName}</span>
              </p>
            )}
            {error && (
              <p className="mt-3 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg p-3">
                {error}
              </p>
            )}
          </Card>

          <Card variant="solid" padding="md" className="border-dark-600">
            <h2 className="text-sm font-semibold text-white mb-4">2. Drawing setup</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
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
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Scale per source unit
                </span>
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
              {sourceKind === "raster" && (
                <>
                  <label className="block">
                    <span className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      <span>Trace threshold</span>
                      <span>{threshold}</span>
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="245"
                      value={threshold}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setThreshold(value);
                        updateRaster(value, invert);
                      }}
                      className="w-full mt-2 accent-cyan-400"
                    />
                  </label>
                  <label className="block">
                    <span className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      <span>Contour smoothing</span>
                      <span>{smoothing}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={smoothing}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setSmoothing(value);
                        updateRaster(threshold, invert, value);
                      }}
                      className="w-full mt-2 accent-cyan-400"
                    />
                  </label>
                  <label className="block">
                    <span className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      <span>Line/arc tolerance</span>
                      <span>{fitTolerance.toFixed(1)} px</span>
                    </span>
                    <input
                      type="range"
                      min="0.2"
                      max="3"
                      step="0.1"
                      value={fitTolerance}
                      onChange={(event) => setFitTolerance(Number(event.target.value))}
                      className="w-full mt-2 accent-cyan-400"
                    />
                    <span className="text-[10px] text-gray-600">
                      Lower values keep more detail; higher values make cleaner geometry.
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invert}
                      onChange={(event) => {
                        setInvert(event.target.checked);
                        updateRaster(threshold, event.target.checked);
                      }}
                      className="accent-cyan-400"
                    />{" "}
                    Trace light shapes instead of dark
                  </label>
                </>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={reset}
                  disabled={!fileName}
                  className="rounded-lg py-2.5 border border-dark-600 text-xs text-gray-400 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={13} /> Reset
                </button>
                <button
                  onClick={download}
                  disabled={!paths.length}
                  className="rounded-lg py-2.5 bg-accent-cyan text-dark-950 text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} /> Export DXF
                </button>
              </div>
            </div>
          </Card>
        </div>

        <Card variant="solid" padding="md" className="border-dark-600 min-h-[560px] flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">CAD preview</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Geometry is processed locally on this device
              </p>
            </div>
            {bounds && (
              <div className="flex flex-wrap gap-2">
                <Badge color="purple">{geometryStats.arcs.toLocaleString()} arcs</Badge>
                <Badge color="gray">{geometryStats.lines.toLocaleString()} lines</Badge>
                {geometryStats.polylines > 0 && (
                  <Badge color="gray">{geometryStats.polylines} polylines</Badge>
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
                  {paths.map((path, index) => (
                    <polyline
                      key={index}
                      points={path.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              </svg>
            ) : (
              <div className="absolute inset-0 grid place-items-center text-center p-8">
                <div>
                  <ScanLine size={42} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-sm text-gray-400">
                    Import a supported drawing to inspect its CAD geometry
                  </p>
                  <p className="text-xs text-gray-600 mt-2">Nothing is uploaded to a server</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
