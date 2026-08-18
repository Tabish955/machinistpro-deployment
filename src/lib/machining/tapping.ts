/**
 * Tapping.
 *
 * A tap is the one tool in the shop that is guaranteed to break if the feed is
 * wrong, and it breaks *inside* a part that already has all its other work in
 * it. The tap is screwed into its own thread: it advances exactly one pitch
 * per revolution because the thread it is cutting says so. The feed is not a
 * choice, and a machine told otherwise will either strip the thread or snap
 * the tap.
 *
 * Everything here that is geometry is exact. The speeds are not — tapping
 * speed depends on the tap, the coating, the coolant and how rigid the holder
 * is — so those are asked for rather than assumed.
 */

/**
 * Feed rate for a tap: Vf = pitch × RPM.
 *
 * With pitch in mm and speed in rev/min this is mm/min directly. There is no
 * feed-per-tooth and no chip load to look up; the thread sets the feed.
 */
export const tapFeedRate = (pitchMm: number, rpm: number) => pitchMm * rpm;

/** The same the other way round: what speed a machine's feed limit allows. */
export const tapRpmForFeed = (pitchMm: number, feedMmMin: number) => feedMmMin / pitchMm;

/** Pitch from threads per inch, for imperial taps. */
export const pitchFromTpi = (tpi: number) => 25.4 / tpi;

/**
 * Thread engagement.
 *
 * The hole is bigger than the thread's minor diameter, and how much bigger
 * decides how much of the thread's full depth actually gets cut. The
 * relationship for 60° threads is
 *
 *   %engagement = 76.98 × (major − hole) / pitch
 *
 * which rearranges to give the drill for a wanted engagement. The constant is
 * the geometry of a 60° form, and it checks out against the standard tap drill
 * for every common metric size: M6×1 at 75% wants 5.03 mm and the chart says
 * 5.0; M8×1.25 wants 6.78 and the chart says 6.8; M10×1.5 wants 8.54 and the
 * chart says 8.5.
 */
export const TAP_FORM_CONSTANT = 76.98;

export const tapDrillForEngagement = (majorMm: number, pitchMm: number, percent: number) =>
  majorMm - (percent * pitchMm) / TAP_FORM_CONSTANT;

export const engagementFromDrill = (majorMm: number, pitchMm: number, drillMm: number) =>
  (TAP_FORM_CONSTANT * (majorMm - drillMm)) / pitchMm;

/**
 * Why 100% engagement is not the goal.
 *
 * Going from 60% to 100% engagement roughly triples the torque on the tap and
 * buys only a few percent of thread strength — the fastener fails in the bolt
 * long before the thread strips. Shops cut 65–75% for this reason, and a tap
 * asked for much more than that in anything tough is the classic way to leave
 * broken tool in a finished part.
 */
export const ENGAGEMENT_TYPICAL = 75;
export const ENGAGEMENT_HIGH = 85;

/** Is this engagement into the territory where taps start breaking? */
export const engagementIsRisky = (percent: number) => percent > ENGAGEMENT_HIGH;

/**
 * Depth a tap must travel to give a wanted depth of full thread.
 *
 * A tap does not cut full depth from its first tooth: the chamfered lead is
 * ground away over the first few threads so it can start. Those threads are
 * incomplete, so the tap has to go that much deeper than the thread the
 * drawing calls for. A bottoming tap has about 1.5 threads of lead, a plug 3
 * to 5, and a taper 8 to 10 — which is why a taper tap cannot finish a blind
 * hole that a plug tap can.
 */
export type TapStyle = "taper" | "plug" | "bottoming";

export const LEAD_THREADS: Record<TapStyle, number> = {
  taper: 9,
  plug: 4,
  bottoming: 1.5,
};

export const tapLeadLength = (pitchMm: number, style: TapStyle) => pitchMm * LEAD_THREADS[style];

export const tapTravelForFullThread = (
  fullThreadDepthMm: number,
  pitchMm: number,
  style: TapStyle,
) => fullThreadDepthMm + tapLeadLength(pitchMm, style);

/**
 * Does the tap fit the hole that was drilled?
 *
 * In a blind hole the tap needs the drilled depth to swallow its lead, and the
 * drill's own point adds depth the thread cannot use. Returns the shortfall in
 * mm — positive means the hole is too shallow by that much.
 */
export const blindHoleShortfall = (
  drilledDepthMm: number,
  fullThreadDepthMm: number,
  pitchMm: number,
  style: TapStyle,
) => tapTravelForFullThread(fullThreadDepthMm, pitchMm, style) - drilledDepthMm;

/**
 * Number of turns the tap makes to reach depth, and back out again.
 * A tap that has to be reversed all the way out doubles this.
 */
export const tapTurns = (travelMm: number, pitchMm: number) => travelMm / pitchMm;

/**
 * Time for one tapped hole, in minutes, in and back out.
 *
 * Reversing is usually quicker than cutting, so the return speed is asked for
 * separately rather than assumed equal.
 */
export const tapCycleTimeMin = (
  travelMm: number,
  pitchMm: number,
  rpmIn: number,
  rpmOut: number,
) => {
  if (rpmIn <= 0 || rpmOut <= 0 || pitchMm <= 0) return 0;
  const feedIn = tapFeedRate(pitchMm, rpmIn);
  const feedOut = tapFeedRate(pitchMm, rpmOut);
  return travelMm / feedIn + travelMm / feedOut;
};

/**
 * Cutting speed for tapping is far below drilling — the tap is a form tool
 * cutting on every flute at full depth, and it cannot be retracted from a bad
 * cut. A third of the drilling speed is the usual starting point, and this
 * returns that rather than pretending to know the tap.
 */
export const TAPPING_SPEED_FRACTION = 1 / 3;
export const suggestedTapSpeed = (drillSpeedMMin: number) =>
  drillSpeedMMin * TAPPING_SPEED_FRACTION;
