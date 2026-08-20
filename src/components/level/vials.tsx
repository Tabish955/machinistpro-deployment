import { bubbleOffset, type Tilt } from "@/lib/level/level";

/**
 * The vials.
 *
 * Both are drawn to look like the tool they replace — a machined body, a fluid
 * window, a pair of graduation lines, and a bubble that climbs to the high side.
 * A machinist should be able to read either one at a glance without being told
 * how, which a bare number and a seesaw never managed.
 */

const LEVEL_FILL = "var(--color-accent-green)";
const LIVE_FILL = "var(--color-accent-cyan)";

/** Bullseye vial — the phone lying flat, both axes at once. */
export function BullseyeVial({ tilt, level }: { tilt: Tilt; level: boolean }) {
  const bubble = bubbleOffset(tilt);
  const tint = level ? LEVEL_FILL : LIVE_FILL;
  const cx = 140 + bubble.x * 90;
  const cy = 140 + bubble.y * 90;

  return (
    <svg
      viewBox="0 0 280 280"
      className="w-full max-w-[17rem]"
      role="img"
      aria-label={level ? "Level" : "Not level"}
    >
      {/* Body */}
      <circle cx="140" cy="140" r="130" fill="var(--color-dark-800)" />
      <circle
        cx="140"
        cy="140"
        r="130"
        fill="none"
        stroke="var(--color-dark-500)"
        strokeWidth="2"
      />
      {/* Fluid */}
      <circle
        cx="140"
        cy="140"
        r="118"
        fill={level ? "rgba(16,185,129,0.10)" : "rgba(0,212,255,0.07)"}
      />
      {/* Graduation rings. The innermost is the tolerance: bubble inside it and
          the surface is level to within the same 0.15° the readout uses. */}
      <circle
        cx="140"
        cy="140"
        r="118"
        fill="none"
        stroke="var(--color-dark-500)"
        strokeWidth="1.5"
      />
      <circle cx="140" cy="140" r="78" fill="none" stroke="var(--color-dark-600)" strokeWidth="1" />
      <circle
        cx="140"
        cy="140"
        r="30"
        fill="none"
        stroke={level ? LEVEL_FILL : "var(--color-dark-400)"}
        strokeWidth="2"
      />
      {/* Crosshair */}
      <line x1="140" y1="14" x2="140" y2="266" stroke="var(--color-dark-600)" strokeWidth="1" />
      <line x1="14" y1="140" x2="266" y2="140" stroke="var(--color-dark-600)" strokeWidth="1" />
      {/* Bubble */}
      <circle cx={cx} cy={cy} r="26" fill={tint} opacity="0.28" />
      <circle cx={cx} cy={cy} r="26" fill="none" stroke={tint} strokeWidth="2.5" />
      <circle cx={cx - 8} cy={cy - 9} r="6" fill={tint} opacity="0.35" />
    </svg>
  );
}

/**
 * Tube vial — the phone stood on an edge.
 *
 * `beamAngle` turns the whole body so it lies along the edge that is actually
 * resting on the work. That is what makes the picture differ between standing
 * the phone on its foot and standing it on its side; without it the beam lay
 * flat across the screen in every position and the two looked identical.
 */
export function EdgeVial({
  beamAngle,
  bubble,
  level,
}: {
  beamAngle: number;
  bubble: number;
  level: boolean;
}) {
  const tint = level ? LEVEL_FILL : LIVE_FILL;
  const bx = 140 + bubble * 56;
  // The body is bolted to the phone, so it lies along the resting edge — a
  // quarter turn, whichever edge that is. The dashed line is true level, and
  // the angle you can see between the two is the error, drawn to scale.
  const quarter = Math.round(beamAngle / 90) * 90;

  return (
    <svg
      viewBox="0 0 280 280"
      className="w-full max-w-[17rem]"
      role="img"
      aria-label={level ? "Level" : "Not level"}
    >
      {/* True level, for the body to be compared against. The angle you can see
          between this and the body is the error itself, drawn to scale. */}
      <g transform={`rotate(${beamAngle} 140 140)`} opacity={level ? 0.55 : 0.85}>
        <line
          x1="2"
          y1="140"
          x2="278"
          y2="140"
          stroke={level ? LEVEL_FILL : LIVE_FILL}
          strokeWidth="2"
          strokeDasharray="6 7"
        />
        {/* Caught by the eye even where the body covers the middle. */}
        <circle cx="6" cy="140" r="3.5" fill={level ? LEVEL_FILL : LIVE_FILL} />
        <circle cx="274" cy="140" r="3.5" fill={level ? LEVEL_FILL : LIVE_FILL} />
      </g>

      {/* The level itself, lying along the resting edge */}
      <g transform={`rotate(${quarter} 140 140)`}>
        <rect
          x="34"
          y="112"
          width="212"
          height="56"
          rx="12"
          fill="var(--color-dark-800)"
          stroke="var(--color-dark-500)"
          strokeWidth="2"
        />
        {/* Fluid window */}
        <rect
          x="66"
          y="122"
          width="148"
          height="36"
          rx="18"
          fill={level ? "rgba(16,185,129,0.12)" : "rgba(0,212,255,0.08)"}
          stroke={level ? LEVEL_FILL : "var(--color-dark-400)"}
          strokeWidth="2"
        />
        {/* Graduation lines — the bubble sits between them when level */}
        <line x1="120" y1="122" x2="120" y2="158" stroke="var(--color-dark-300)" strokeWidth="2" />
        <line x1="160" y1="122" x2="160" y2="158" stroke="var(--color-dark-300)" strokeWidth="2" />
        {/* Machined ends */}
        <line x1="52" y1="124" x2="52" y2="156" stroke="var(--color-dark-600)" strokeWidth="2" />
        <line x1="228" y1="124" x2="228" y2="156" stroke="var(--color-dark-600)" strokeWidth="2" />
        {/* Bubble */}
        <circle cx={bx} cy="140" r="16" fill={tint} opacity="0.3" />
        <circle cx={bx} cy="140" r="16" fill="none" stroke={tint} strokeWidth="2.5" />
        <circle cx={bx - 5} cy="134" r="4" fill={tint} opacity="0.4" />
      </g>
    </svg>
  );
}
