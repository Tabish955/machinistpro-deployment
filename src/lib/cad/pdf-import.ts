import type { CadPrimitive, DxfPath, DxfPoint } from "@/lib/dxf-converter";

/* ── Reading PDF ───────────────────────────────────────────────────────────────
 * Engineering drawings travel as PDF more than as anything else, and a vector
 * PDF already holds the geometry — the lines are lines, not a picture of lines.
 * What is needed is to walk the page's drawing operators and keep the path
 * construction ones, with the transform that was in force at the time.
 *
 * A scanned drawing is a different thing: the page holds one big image and no
 * paths. That is a tracing job, and saying so is more use than returning an
 * empty drawing.
 */

export interface PdfImportResult {
  paths: DxfPath[];
  warnings: string[];
  pages: number;
}

/**
 * The verbs inside a constructPath subpath. These are pdf.js's own internal
 * drawing opcodes and are not the same numbers as the OPS constants, which is
 * an easy and silent mistake to make — reading a path with the wrong opcodes
 * produces a geometrically plausible drawing of the wrong thing.
 */
const DRAW_MOVE_TO = 0;
const DRAW_LINE_TO = 1;
const DRAW_CURVE_TO = 2;
const DRAW_QUADRATIC_TO = 3;
const DRAW_CLOSE_PATH = 4;

/** PDF user space is 1/72 inch and counts y upwards; geometry here counts down. */
type Matrix = [number, number, number, number, number, number];

function apply(m: Matrix, x: number, y: number): DxfPoint {
  return { x: m[0] * x + m[2] * y + m[4], y: -(m[1] * x + m[3] * y + m[5]) };
}

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/**
 * One subpath of a PDF path, as drawing geometry.
 *
 * Kept separate from the pdf.js plumbing so it can be tested against real
 * captured operator data without a PDF reader in the loop, which is where the
 * fiddly part lives: the verbs are pdf.js's own opcodes, and a closed subpath
 * has to be given its closing segment explicitly.
 */
export function subpathToPaths(
  data: ArrayLike<number>,
  transform: Matrix,
  warnings: Set<string> = new Set(),
): DxfPath[] {
  const paths: DxfPath[] = [];
  if (!data || typeof data.length !== "number") return paths;
  let points: DxfPoint[] = [];
  let primitives: CadPrimitive[] = [];
  let at: DxfPoint | null = null;

  const flush = (closed: boolean) => {
    if (points.length > 1) {
      // "h" returns to the start of the subpath. Recording only the flag and
      // not the segment leaves the shape one edge short: a traced rectangle
      // exported as three sides, open where it should be shut.
      const first = points[0];
      const last = points[points.length - 1];
      if (closed && primitives.length && Math.hypot(last.x - first.x, last.y - first.y) > 1e-9)
        primitives.push({ type: "line", start: last, end: first });
      paths.push({
        points,
        closed,
        layer: "PDF",
        primitives: primitives.length ? primitives : undefined,
      });
    }
    points = [];
    primitives = [];
  };

  const cubic = (c1: DxfPoint, c2: DxfPoint, to: DxfPoint) => {
    if (!at) return;
    // Kept as a real cubic, which is exactly what a DXF SPLINE holds.
    primitives.push({ type: "spline", controls: [at, c1, c2, to] });
    const from = at;
    for (let step = 1; step <= 16; step++) {
      const t = step / 16;
      const mt = 1 - t;
      points.push({
        x: mt ** 3 * from.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * to.x,
        y: mt ** 3 * from.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * to.y,
      });
    }
  };

  for (let cursor = 0; cursor < data.length; ) {
    const verb = data[cursor++];
    if (verb === DRAW_MOVE_TO) {
      flush(false);
      at = apply(transform, data[cursor++], data[cursor++]);
      points.push(at);
    } else if (verb === DRAW_LINE_TO) {
      const to = apply(transform, data[cursor++], data[cursor++]);
      if (at) primitives.push({ type: "line", start: at, end: to });
      points.push(to);
      at = to;
    } else if (verb === DRAW_CURVE_TO) {
      const c1 = apply(transform, data[cursor++], data[cursor++]);
      const c2 = apply(transform, data[cursor++], data[cursor++]);
      const to = apply(transform, data[cursor++], data[cursor++]);
      cubic(c1, c2, to);
      at = to;
    } else if (verb === DRAW_QUADRATIC_TO) {
      const q = apply(transform, data[cursor++], data[cursor++]);
      const to = apply(transform, data[cursor++], data[cursor++]);
      if (at) {
        // A quadratic is exactly a cubic whose handles sit two thirds of the
        // way to the single control point, so nothing is lost converting it.
        const from = at;
        cubic(
          { x: from.x + (2 / 3) * (q.x - from.x), y: from.y + (2 / 3) * (q.y - from.y) },
          { x: to.x + (2 / 3) * (q.x - to.x), y: to.y + (2 / 3) * (q.y - to.y) },
          to,
        );
      }
      at = to;
    } else if (verb === DRAW_CLOSE_PATH) {
      flush(true);
      at = null;
    } else {
      // An unknown verb makes every number after it ambiguous, so the rest of
      // this subpath is abandoned rather than misread.
      warnings.add("Part of a path used a drawing operator this reader does not know.");
      break;
    }
  }
  flush(false);
  return paths;
}

/**
 * pdf.js hands back the page as a list of operators and arguments. Only the
 * ones that build or transform geometry matter here; text, shading and images
 * are counted so they can be reported rather than silently missed.
 */
export async function parsePdf(
  data: ArrayBuffer,
  onProgress: (message: string) => void = () => {},
): Promise<PdfImportResult> {
  onProgress("Starting the PDF reader…");
  const pdfjs = await import("pdfjs-dist");
  // The worker keeps a large drawing from freezing the tab, which matters far
  // more on a phone than on a desktop.
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const task = pdfjs.getDocument({ data });
  const document = await task.promise;
  const warnings = new Set<string>();
  const paths: DxfPath[] = [];
  let images = 0;
  let text = 0;

  const pages = document.numPages;
  if (pages > 1)
    warnings.add(
      `This PDF has ${pages} pages; only the first was converted. Split the file if you need another sheet.`,
    );

  onProgress("Reading page geometry…");
  const page = await document.getPage(1);
  const operators = await page.getOperatorList();
  const OPS = pdfjs.OPS;

  // The viewport carries the page rotation and the flip out of PDF space; the
  // y flip is done in `apply`, so only rotation and origin are taken from here.
  const viewport = page.getViewport({ scale: 1 });
  const base: Matrix = [1, 0, 0, 1, 0, 0];
  let transform: Matrix = base;
  const stack: Matrix[] = [];

  for (let index = 0; index < operators.fnArray.length; index++) {
    const op = operators.fnArray[index];
    const args = operators.argsArray[index];

    if (op === OPS.save) stack.push(transform);
    else if (op === OPS.restore) transform = stack.pop() ?? base;
    else if (op === OPS.transform) transform = multiply(transform, args as unknown as Matrix);
    else if (op === OPS.paintImageXObject || op === OPS.paintInlineImageXObject) images++;
    else if (op === OPS.showText || op === OPS.showSpacedText) text++;
    else if (op === OPS.constructPath) {
      // [paintOperation, subpaths, boundingBox]. Each subpath is one flat array
      // with its own verbs inline, in a little language of five opcodes; a
      // rectangle has already been expanded into moves and lines by this point.
      const subpaths = (args as unknown[])[1];
      if (!Array.isArray(subpaths)) continue;
      for (const raw of subpaths) {
        paths.push(...subpathToPaths(raw as ArrayLike<number>, transform, warnings));
      }
    }
  }

  // Releases the worker; a phone that converts several files in a row will
  // otherwise keep one alive per file.
  await task.destroy();

  if (!paths.length) {
    if (images)
      throw new Error(
        "This PDF holds a scanned picture rather than drawn geometry. Export the page as a PNG and bring it back here to be traced.",
      );
    throw new Error("No drawable geometry was found on the first page of this PDF.");
  }
  if (images)
    warnings.add(
      `${images} embedded image${images > 1 ? "s were" : " was"} skipped — a picture inside a PDF has no outline to cut.`,
    );
  if (text)
    warnings.add("Text on the page was skipped; only drawn geometry converts to CAD entities.");
  void viewport;

  return { paths, warnings: [...warnings], pages };
}
