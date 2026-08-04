import {
  getBounds,
  parseCoordinateText,
  parseSvg,
  toSvgPathData,
  traceRasterContours,
  type DxfPath,
} from "@/lib/dxf-converter";
import type { StlMesh, StlMode } from "./stl-import";

/* ── What this app can and cannot read ─────────────────────────────────────────
 * Everything here runs on the device, with no upload and no server. That is the
 * whole point of the tool, and it is also the boundary: DWG, STEP and the native
 * formats of individual CAD packages are either undocumented or need a geometry
 * kernel, and neither is going to happen in a browser tab.
 *
 * They are still listed. A converter that says "unsupported file" when handed a
 * DWG has told the user nothing; one that says "DWG is AutoCAD's own format,
 * here is how to get a DXF out of it" has solved their problem.
 */

export type FormatKind = "vector" | "raster" | "mesh" | "toolpath" | "data";

export interface CadFormat {
  id: string;
  label: string;
  extensions: string[];
  kind: FormatKind;
  supported: boolean;
  /** Shown when the format cannot be read, explaining what to do instead. */
  advice?: string;
}

export const FORMATS: CadFormat[] = [
  {
    id: "dxf",
    label: "DXF drawing",
    extensions: ["dxf"],
    kind: "vector",
    supported: true,
  },
  {
    id: "svg",
    label: "SVG vector",
    extensions: ["svg"],
    kind: "vector",
    supported: true,
  },
  {
    id: "pdf",
    label: "PDF drawing",
    extensions: ["pdf"],
    kind: "vector",
    supported: true,
  },
  {
    id: "raster",
    label: "Image",
    extensions: ["png", "jpg", "jpeg", "bmp", "webp", "gif"],
    kind: "raster",
    supported: true,
  },
  {
    id: "stl",
    label: "STL mesh",
    extensions: ["stl"],
    kind: "mesh",
    supported: true,
  },
  {
    id: "gcode",
    label: "G-code program",
    extensions: ["nc", "gcode", "tap", "ngc", "cnc", "mpf", "gco"],
    kind: "toolpath",
    supported: true,
  },
  {
    id: "coordinates",
    label: "Coordinate list",
    extensions: ["csv", "txt", "xyz", "pts"],
    kind: "data",
    supported: true,
  },
  {
    id: "dwg",
    label: "DWG drawing",
    extensions: ["dwg"],
    kind: "vector",
    supported: false,
    advice:
      "DWG is AutoCAD's own closed format and cannot be read on the device. In AutoCAD, LibreCAD, or the free ODA File Converter, save the drawing as DXF and bring that here.",
  },
  {
    id: "step",
    label: "STEP / IGES model",
    extensions: ["step", "stp", "iges", "igs"],
    kind: "mesh",
    supported: false,
    advice:
      "STEP and IGES describe solids with curved surfaces, which needs a geometry kernel this app does not carry. Export the part as STL from your CAD and bring that here — a cross-section of it can be taken.",
  },
  {
    id: "native",
    label: "Native CAD part",
    extensions: ["sldprt", "sldasm", "ipt", "iam", "prt", "catpart", "3dm", "dgn", "f3d"],
    kind: "mesh",
    supported: false,
    advice:
      "This is a single CAD package's own format. Export it as STL, DXF or PDF from the program that made it.",
  },
];

const BY_EXTENSION = new Map<string, CadFormat>();
for (const format of FORMATS)
  for (const extension of format.extensions) BY_EXTENSION.set(extension, format);

export function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function formatFor(name: string): CadFormat | null {
  return BY_EXTENSION.get(extensionOf(name)) ?? null;
}

/** Every extension the picker should offer, unsupported ones included so the
 *  user gets the explanation rather than a greyed-out file. */
export const ACCEPTED = FORMATS.flatMap((format) =>
  format.extensions.map((extension) => `.${extension}`),
).join(",");

export interface LoadedDrawing {
  paths: DxfPath[];
  format: CadFormat;
  warnings: string[];
  /** Set when the file stated its own units. */
  units?: "mm" | "in";
  /**
   * True when the geometry has no real size — a traced image is pixels, and one
   * pixel is not one millimetre until somebody says what something measures.
   */
  needsScale: boolean;
  /** Kept for STL so the section height can be moved without re-reading. */
  mesh?: StlMesh;
  /** A plain sentence about what was read, for the user. */
  summary: string;
}

export interface LoadOptions {
  invert?: boolean;
  /** STL: where to take the cross-section, and whether to section or flatten. */
  sliceZ?: number;
  stlMode?: StlMode;
  /** Progress for the slow ones, so a large file on a phone is not a dead UI. */
  onProgress?: (message: string) => void;
}

async function readImage(file: File): Promise<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The image could not be opened."));
      element.src = url;
    });
    const canvas = document.createElement("canvas");
    // A phone will not thank you for a 48 megapixel photograph, and the tracer
    // gains nothing past this either.
    const ratio = Math.min(1, 1400 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image processing is unavailable on this device.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    return { pixels: data.data, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "1 entity" but "6 entities" — an app that says "6 entitys" reads as a machine
 *  talking, and this text is the first thing a user sees about their file. */
function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${count.toLocaleString()} ${word}`;
}

function countOf(paths: DxfPath[], noun: string, nounPlural?: string): string {
  const points = paths.reduce((total, path) => total + path.points.length, 0);
  return `${plural(paths.length, noun, nounPlural)}, ${plural(points, "point")}`;
}

export async function loadDrawing(file: File, options: LoadOptions = {}): Promise<LoadedDrawing> {
  const format = formatFor(file.name);
  if (!format)
    throw new Error(
      `"${extensionOf(file.name) || file.name}" is not a format this converter knows. Supported: DXF, SVG, PDF, STL, G-code, images and coordinate lists.`,
    );
  if (!format.supported) throw new Error(format.advice ?? `${format.label} cannot be read here.`);

  const progress = options.onProgress ?? (() => {});
  const warnings: string[] = [];

  switch (format.id) {
    case "dxf": {
      progress("Reading DXF entities…");
      const { parseDxf } = await import("./dxf-import");
      const result = parseDxf(await file.text());
      return {
        paths: result.paths,
        format,
        warnings: result.warnings,
        units: result.units,
        needsScale: false,
        summary: countOf(result.paths, "entity", "entities"),
      };
    }

    case "svg": {
      progress("Reading SVG geometry…");
      const paths = parseSvg(await file.text(), warnings);
      return {
        paths,
        format,
        warnings,
        needsScale: false,
        summary: countOf(paths, "shape"),
      };
    }

    case "pdf": {
      progress("Reading PDF page…");
      const { parsePdf } = await import("./pdf-import");
      const result = await parsePdf(await file.arrayBuffer(), progress);
      return {
        paths: result.paths,
        format,
        warnings: result.warnings,
        needsScale: false,
        summary: countOf(result.paths, "shape"),
      };
    }

    case "stl": {
      progress("Reading mesh…");
      const { parseStl, sliceStl, flattenStl } = await import("./stl-import");
      const mesh = parseStl(await file.arrayBuffer());
      const mode = options.stlMode ?? "slice";
      const middle = (mesh.min[2] + mesh.max[2]) / 2;
      progress(mode === "slice" ? "Taking the cross-section…" : "Flattening the mesh…");
      const result = mode === "slice" ? sliceStl(mesh, options.sliceZ ?? middle) : flattenStl(mesh);
      return {
        paths: result.paths,
        format,
        warnings: result.warnings,
        needsScale: false,
        mesh,
        summary: `${plural(mesh.triangles.length, "triangle")} → ${countOf(result.paths, "outline")}`,
      };
    }

    case "gcode": {
      progress("Following the toolpath…");
      const { parseGcode } = await import("./gcode-import");
      const result = parseGcode(await file.text());
      return {
        paths: result.paths,
        format,
        warnings: result.warnings,
        units: result.units,
        needsScale: false,
        summary: `${plural(result.cuts, "cutting move")}, ${plural(result.rapids, "rapid")}`,
      };
    }

    case "coordinates": {
      progress("Reading coordinates…");
      const paths = parseCoordinateText(await file.text());
      return { paths, format, warnings, needsScale: false, summary: countOf(paths, "run") };
    }

    case "raster": {
      progress("Loading image…");
      const image = await readImage(file);
      progress("Finding outlines…");
      const paths = traceRasterContours(
        image.pixels,
        image.width,
        image.height,
        undefined,
        options.invert ?? false,
      );
      return {
        paths,
        format,
        warnings,
        // Pixels have no size. Until the user says what something measures, an
        // exported DXF would be confidently and invisibly the wrong scale.
        needsScale: true,
        summary: `${image.width}×${image.height} traced → ${countOf(paths, "outline")}`,
      };
    }

    default:
      throw new Error(`${format.label} cannot be read here.`);
  }
}

/** The drawing as a standalone SVG file, for people whose next tool wants one. */
export function toSvgFile(paths: DxfPath[], scale: number, tolerance: number): string {
  const bounds = getBounds(paths);
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  const body = toSvgPathData(paths, tolerance)
    .map((data) => `  <path d="${data}" fill="none" stroke="#000" stroke-width="0.25"/>`)
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}" height="${height.toFixed(3)}"`,
    `     viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}">`,
    body,
    `</svg>`,
    "",
  ].join("\n");
}
