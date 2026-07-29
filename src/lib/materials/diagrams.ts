/**
 * Cross-section diagrams for the stock shapes, so the picture on screen matches
 * the profile being weighed and each dimension label has somewhere to point.
 *
 * Every diagram draws into a 200×200 box. Proportions are illustrative rather
 * than to scale: the drawing is there to say which measurement is which.
 */

const STROKE = "#00d4ff";
const FILL = "rgba(0,212,255,0.07)";
const DIM = "#8b93a7";

const shell = (body: string) => body;

const poly = (points: string) =>
  `<polygon points="${points}" fill="${FILL}" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>`;

const label = (x: number, y: number, text: string, anchor = "middle", fill = DIM) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="12" font-family="ui-monospace, monospace" text-anchor="${anchor}">${text}</text>`;

// Arrowed dimension line.
const dim = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${DIM}" stroke-width="1"
     marker-start="url(#ms)" marker-end="url(#me)"/>`;

export const DIAGRAM_DEFS = `
  <defs>
    <marker id="me" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 z" fill="${DIM}"/>
    </marker>
    <marker id="ms" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
      <path d="M7,0 L0,3.5 L7,7 z" fill="${DIM}"/>
    </marker>
  </defs>`;

/** Regular hexagon drawn to a given across-flats width, matching the volume formula. */
function hexPoints(cx: number, cy: number, acrossFlats: number): string {
  const r = acrossFlats / Math.sqrt(3); // circumradius from across-flats
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (30 + i * 60);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

export const SHAPE_DIAGRAMS: Record<string, string> = {
  round_bar: shell(`
    <circle cx="100" cy="100" r="62" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>
    ${dim(38, 100, 162, 100)}
    ${label(100, 94, "D")}
    ${label(100, 186, "length runs into the page", "middle")}`),

  square_bar: shell(`
    ${poly("40,40 160,40 160,160 40,160")}
    ${dim(40, 175, 160, 175)}
    ${label(100, 192, "a")}
    ${label(28, 104, "a", "end")}`),

  hex_bar: shell(`
    ${poly(hexPoints(100, 100, 120))}
    ${dim(40, 100, 160, 100)}
    ${label(100, 94, "AF")}
    ${label(100, 192, "across flats", "middle")}`),

  flat_bar: shell(`
    ${poly("30,75 170,75 170,125 30,125")}
    ${dim(30, 140, 170, 140)}
    ${label(100, 157, "w")}
    ${dim(182, 75, 182, 125)}
    ${label(176, 104, "t", "end")}`),

  plate: shell(`
    ${poly("30,55 170,55 170,145 30,145")}
    ${dim(30, 160, 170, 160)}
    ${label(100, 177, "w")}
    ${dim(182, 55, 182, 145)}
    ${label(176, 104, "h", "end")}
    ${label(100, 105, "t = thickness")}`),

  block: shell(`
    ${poly("35,70 135,70 135,160 35,160")}
    ${poly("35,70 65,45 165,45 135,70")}
    ${poly("135,70 165,45 165,135 135,160")}
    ${dim(35, 175, 135, 175)}
    ${label(85, 192, "w")}
    ${label(28, 118, "h", "end")}
    ${label(158, 100, "l", "start")}`),

  cylinder: shell(`
    <ellipse cx="100" cy="55" rx="60" ry="18" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>
    <path d="M40,55 L40,145" stroke="${STROKE}" stroke-width="2" fill="none"/>
    <path d="M160,55 L160,145" stroke="${STROKE}" stroke-width="2" fill="none"/>
    <path d="M40,145 A60,18 0 0 0 160,145" stroke="${STROKE}" stroke-width="2" fill="none"/>
    ${dim(40, 55, 160, 55)}
    ${label(100, 49, "D")}
    ${dim(175, 55, 175, 145)}
    ${label(182, 104, "h", "start")}`),

  sphere: shell(`
    <circle cx="100" cy="100" r="62" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>
    <ellipse cx="100" cy="100" rx="62" ry="20" fill="none" stroke="${DIM}" stroke-width="1" stroke-dasharray="4 3"/>
    ${dim(38, 100, 162, 100)}
    ${label(100, 94, "D")}`),

  pipe: shell(`
    <circle cx="100" cy="100" r="65" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="100" r="38" fill="#0b0f19" stroke="${STROKE}" stroke-width="2"/>
    ${dim(35, 100, 165, 100)}
    ${label(100, 30, "OD")}
    ${label(100, 94, "ID")}`),

  tube: shell(`
    <circle cx="100" cy="100" r="65" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>
    <circle cx="100" cy="100" r="42" fill="#0b0f19" stroke="${STROKE}" stroke-width="2"/>
    ${dim(35, 100, 165, 100)}
    ${label(100, 30, "OD")}
    ${dim(142, 100, 165, 100)}
    ${label(154, 92, "t")}`),

  hollow_square: shell(`
    ${poly("40,40 160,40 160,160 40,160")}
    <rect x="58" y="58" width="84" height="84" fill="#0b0f19" stroke="${STROKE}" stroke-width="2"/>
    ${dim(40, 175, 160, 175)}
    ${label(100, 192, "a")}
    ${dim(142, 100, 160, 100)}
    ${label(151, 92, "t")}`),

  hollow_rect: shell(`
    ${poly("25,60 175,60 175,140 25,140")}
    <rect x="42" y="77" width="116" height="46" fill="#0b0f19" stroke="${STROKE}" stroke-width="2"/>
    ${dim(25, 155, 175, 155)}
    ${label(100, 172, "w")}
    ${dim(188, 60, 188, 140)}
    ${label(182, 104, "h", "end")}
    ${label(33, 104, "t", "middle")}`),

  angle: shell(`
    ${poly("45,35 75,35 75,135 165,135 165,165 45,165")}
    ${dim(45, 25, 75, 25)}
    ${label(60, 20, "t")}
    ${dim(30, 35, 30, 165)}
    ${label(24, 104, "a", "end")}
    ${dim(45, 180, 165, 180)}
    ${label(105, 194, "b")}`),

  channel: shell(`
    ${poly("45,40 165,40 165,68 73,68 73,132 165,132 165,160 45,160")}
    ${dim(45, 25, 165, 25)}
    ${label(105, 20, "w")}
    ${dim(30, 40, 30, 160)}
    ${label(24, 104, "h", "end")}
    ${label(140, 60, "tf", "middle")}
    ${label(60, 104, "tw", "middle")}`),

  i_beam: shell(`
    ${poly("40,35 160,35 160,62 113,62 113,138 160,138 160,165 40,165 40,138 87,138 87,62 40,62")}
    ${dim(40, 22, 160, 22)}
    ${label(100, 17, "w")}
    ${dim(25, 35, 25, 165)}
    ${label(19, 104, "h", "end")}
    ${label(137, 54, "tf", "middle")}
    ${label(100, 104, "tw", "middle")}`),

  t_section: shell(`
    ${poly("35,45 165,45 165,73 113,73 113,165 87,165 87,73 35,73")}
    ${dim(35, 32, 165, 32)}
    ${label(100, 27, "w")}
    ${dim(180, 45, 180, 165)}
    ${label(186, 108, "h", "start")}
    ${label(60, 65, "tf", "middle")}
    ${label(100, 130, "tw", "middle")}`),

  sheet: shell(`
    ${poly("30,60 170,60 170,140 30,140")}
    <path d="M30,60 L48,44 L188,44 L170,60" fill="${FILL}" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
    ${dim(30, 155, 170, 155)}
    ${label(100, 172, "w")}
    ${dim(15, 60, 15, 140)}
    ${label(9, 104, "l", "end")}
    ${label(100, 105, "t = thickness")}`),
};
