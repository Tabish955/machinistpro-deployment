import { useEffect, useRef, useState } from "react";
import {
  applyCalibration,
  averageTilt,
  formatSlope,
  isLevel,
  normaliseAngle,
  slopeDirection,
  smooth,
  totalTilt,
  detectMode,
  edgeAngle,
  edgeBeamAngle,
  restingEdge,
  lowSide,
  edgeBubble,
  toViewFrame,
  currentScreenAngle,
  plumbAngle,
  gravityToTilt,
  NO_CALIBRATION,
  SLOPE_UNITS,
  LEVEL_TOLERANCE_DEG,
  type LevelCalibration,
  type SlopeUnit,
  type Tilt,
  type Gravity,
  type LevelMode,
  type RestingEdge,
} from "@/lib/level/level";
import { BullseyeVial, EdgeVial } from "@/components/level/vials";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Compass, Crosshair, Pause, Play, RotateCcw, Vibrate, VibrateOff } from "lucide-react";

type Status = "idle" | "running" | "denied" | "unsupported";

const CAL_KEY = "machinist-pro-level-calibration";

/**
 * The three ways a phone can be put against work, and what each one measures.
 * Showing all three, with the live one lit, is the quickest way to answer "is
 * this thing even working in landscape?" — it is, and the app says so.
 */
type Position = "flat" | "onEnd" | "onSide";

const POSITIONS: { id: Position; label: string; hint: string }[] = [
  { id: "flat", label: "Flat", hint: "laid on the surface — both axes" },
  { id: "onEnd", label: "On end", hint: "stood on its top or bottom edge" },
  { id: "onSide", label: "On side", hint: "stood on its left or right edge" },
];

function positionOf(mode: LevelMode, edge: RestingEdge): Position {
  if (mode === "surface") return "flat";
  return edge === "bottom" || edge === "top" ? "onEnd" : "onSide";
}

const EDGE_PHRASE: Record<RestingEdge, string> = {
  bottom: "resting on its bottom edge",
  top: "resting on its top edge",
  left: "resting on its left edge",
  right: "resting on its right edge",
};

const LOW_PHRASE: Record<RestingEdge, string> = {
  bottom: "bottom end low",
  top: "top end low",
  left: "left side low",
  right: "right side low",
};

export default function LevelPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [raw, setRaw] = useState<Tilt>({ pitch: 0, roll: 0 });
  const [held, setHeld] = useState<Tilt | null>(null);
  const [heldEdge, setHeldEdge] = useState<Gravity | null>(null);
  const [unit, setUnit] = useState<SlopeUnit>("deg");
  const [calibration, setCalibration] = useState<LevelCalibration>(() => {
    try {
      const saved = localStorage.getItem(CAL_KEY);
      return saved ? (JSON.parse(saved) as LevelCalibration) : NO_CALIBRATION;
    } catch {
      return NO_CALIBRATION;
    }
  });
  const history = useRef<Tilt[]>([]);
  // Gravity is the better source — it has no gimbal trouble near vertical and
  // can be turned into screen axes — but it needs the motion permission, so the
  // orientation reading stays as a fallback until the first sample arrives.
  const hasMotion = useRef(false);
  const [mode, setMode] = useState<LevelMode>("surface");
  // The whole gravity vector is kept rather than the handful of numbers derived
  // from it, so holding a reading freezes the position too and every figure on
  // screen keeps agreeing with every other.
  const [gview, setGview] = useState<Gravity | null>(null);
  const [buzz, setBuzz] = useState(true);

  const start = async () => {
    if (typeof DeviceOrientationEvent === "undefined") {
      setStatus("unsupported");
      return;
    }
    // iOS will not deliver readings until asked, and only from a tap.
    const request = (
      DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    ).requestPermission;
    if (typeof request === "function") {
      try {
        if ((await request()) !== "granted") {
          setStatus("denied");
          return;
        }
      } catch {
        setStatus("denied");
        return;
      }
    }
    const motionRequest =
      typeof DeviceMotionEvent !== "undefined"
        ? (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
            .requestPermission
        : undefined;
    if (typeof motionRequest === "function") {
      // A refusal here only costs the automatic mode switch, so it is not fatal.
      try {
        await motionRequest();
      } catch {
        /* the surface view still works from orientation alone */
      }
    }
    setStatus("running");
  };

  useEffect(() => {
    if (status !== "running") return;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (hasMotion.current) return;
      if (e.beta === null || e.gamma === null) return;
      history.current = smooth(history.current, {
        pitch: normaliseAngle(e.beta),
        roll: normaliseAngle(e.gamma),
      });
      setRaw(averageTilt(history.current));
    };
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      hasMotion.current = true;
      const device: Gravity = { x: a.x, y: a.y, z: a.z };
      // Everything the user is shown is worked out in the frame they are looking
      // at, so a screen that has turned under them does not flip left and right.
      const view = toViewFrame(device, currentScreenAngle());

      history.current = smooth(history.current, gravityToTilt(view));
      setRaw(averageTilt(history.current));

      setMode((current) => detectMode(view, current));
      setGview(view);
    };
    window.addEventListener("deviceorientation", onOrient, true);
    window.addEventListener("devicemotion", onMotion, true);
    return () => {
      window.removeEventListener("deviceorientation", onOrient, true);
      window.removeEventListener("devicemotion", onMotion, true);
    };
  }, [status]);

  const live = applyCalibration(raw, calibration);
  const tilt = held ?? live;
  const total = totalTilt(tilt);
  const surfaceLevel = isLevel(tilt);
  const direction = slopeDirection(tilt);

  // Everything about the edge view comes off one gravity vector, live or held.
  const gShown = heldEdge ?? gview;
  const edgeShown = gShown ? edgeAngle(gShown) : 0;
  const beam = gShown ? edgeBeamAngle(gShown) : 0;
  const plumb = gShown ? plumbAngle(gShown) : 0;
  const restsOn: RestingEdge = gShown ? restingEdge(gShown) : "bottom";
  const low = gShown ? lowSide(gShown) : null;
  const bubble = gShown ? edgeBubble(gShown) : 0;
  const edgeLevel = Math.abs(edgeShown) <= LEVEL_TOLERANCE_DEG;

  const onEdge = mode === "edge";
  const level = onEdge ? edgeLevel : surfaceLevel;
  const position = positionOf(mode, restsOn);
  const frozen = onEdge ? heldEdge !== null : held !== null;

  // A short buzz the moment it comes level, so the surface can be watched
  // instead of the screen while the last shim goes in.
  const wasLevel = useRef(false);
  useEffect(() => {
    if (level && !wasLevel.current && buzz && !frozen) {
      navigator.vibrate?.(35);
    }
    wasLevel.current = level;
  }, [level, buzz, frozen]);

  const calibrate = () => {
    setCalibration(raw);
    try {
      localStorage.setItem(CAL_KEY, JSON.stringify(raw));
    } catch {
      /* storage unavailable; the zero still applies for this session */
    }
  };
  const clearCalibration = () => {
    setCalibration(NO_CALIBRATION);
    try {
      localStorage.removeItem(CAL_KEY);
    } catch {
      /* nothing to clear */
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      <PageHeader
        title="Spirit Level"
        description="Machine beds, vices and setups — using the phone's tilt sensor"
        icon={<Compass size={20} />}
      />

      {status !== "running" ? (
        <Card variant="solid" padding="md" className="border-dark-600 text-center py-10">
          {status === "unsupported" ? (
            <p className="text-sm text-gray-400">
              This device has no tilt sensor, or the browser does not expose one. The level needs a
              phone or tablet.
            </p>
          ) : status === "denied" ? (
            <p className="text-sm text-gray-400">
              Permission was refused. Allow motion access in your browser settings, then reload.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-1">
                Lay the phone on the surface, or stand it on any edge.
              </p>
              <p className="text-xs text-gray-600 mb-4">
                It reads flat, on end, and on its side — and switches by itself.
              </p>
              <button
                onClick={start}
                className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-5 py-2.5 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20"
              >
                Start level
              </button>
              <p className="mt-4 text-[10px] text-gray-600">
                Needs a secure connection and a device with a tilt sensor.
              </p>
            </>
          )}
        </Card>
      ) : (
        <>
          {/* Which of the three positions is live */}
          <Card variant="solid" padding="sm" className="border-dark-600">
            <div className="grid grid-cols-3 gap-1.5">
              {POSITIONS.map((p) => {
                const active = position === p.id;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                      active
                        ? "border-accent-cyan/40 bg-accent-cyan/10"
                        : "border-dark-700 bg-dark-900/40"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-bold ${active ? "text-accent-cyan" : "text-gray-600"}`}
                    >
                      {p.label}
                    </p>
                    <p
                      className={`mt-0.5 text-[9px] leading-tight ${active ? "text-gray-400" : "text-gray-700"}`}
                    >
                      {p.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card variant="solid" padding="md" className="border-dark-600">
            <div className="flex flex-col items-center py-2">
              {onEdge ? (
                <EdgeVial beamAngle={beam} bubble={bubble} level={edgeLevel} />
              ) : (
                <BullseyeVial tilt={tilt} level={surfaceLevel} />
              )}

              <p
                className={`mt-5 font-mono text-5xl tabular-nums ${
                  level ? "text-accent-green" : "text-white"
                }`}
              >
                {formatSlope(onEdge ? Math.abs(edgeShown) : total, unit)}
              </p>

              <p className="mt-1.5 text-xs text-gray-500 text-center">
                {onEdge ? (
                  <>
                    {edgeLevel ? "Level" : low ? LOW_PHRASE[low] : "off level"}
                    {" · "}
                    {EDGE_PHRASE[restsOn]}
                  </>
                ) : (
                  <>{surfaceLevel ? "Level" : `falls towards ${direction.toFixed(0)}°`}</>
                )}
                {frozen && " · held"}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dark-700 pt-4">
              {onEdge ? (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Off level</p>
                    <p className="font-mono text-lg text-white">{formatSlope(edgeShown, unit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Off plumb</p>
                    <p className="font-mono text-lg text-white">{formatSlope(plumb, unit)}</p>
                    <p className="text-[9px] text-gray-600">how far the face leans from upright</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      Front · back
                    </p>
                    <p className="font-mono text-lg text-white">{formatSlope(tilt.pitch, unit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      Left · right
                    </p>
                    <p className="font-mono text-lg text-white">{formatSlope(tilt.roll, unit)}</p>
                  </div>
                </>
              )}
            </div>

            <p className="mt-3 text-center text-[10px] text-gray-600">
              The bubble climbs to the high side, the same as the level in your toolbox.
            </p>
          </Card>

          <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
            <SectionHeader title="Reading" />
            <div className="flex flex-wrap gap-1.5">
              {SLOPE_UNITS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUnit(u.id)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                    unit === u.id
                      ? "bg-accent-cyan/20 text-accent-cyan"
                      : "bg-white/[0.04] text-gray-400 hover:text-white"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  if (onEdge) setHeldEdge(heldEdge === null ? gview : null);
                  else setHeld(held ? null : live);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
              >
                {frozen ? <Play size={13} /> : <Pause size={13} />}
                {frozen ? "Resume" : "Hold reading"}
              </button>
              <button
                onClick={calibrate}
                className="flex items-center gap-1.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-2 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20"
              >
                <Crosshair size={13} /> Zero here
              </button>
              <button
                onClick={clearCalibration}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white"
              >
                <RotateCcw size={13} /> Clear zero
              </button>
              <button
                onClick={() => setBuzz(!buzz)}
                aria-pressed={buzz}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  buzz
                    ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                    : "border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-white"
                }`}
              >
                {buzz ? <Vibrate size={13} /> : <VibrateOff size={13} />}
                Buzz on level
              </button>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              A phone is never truly flat — the camera bump and case tilt it a fraction. Rest it on
              a surface you trust, press <span className="text-gray-400">Zero here</span>, and every
              reading after that is measured from it. Turn the phone end for end and read again: a
              true level gives the same figure both ways, and half the difference is the error left
              in the phone.
            </p>
            {(calibration.pitch !== 0 || calibration.roll !== 0) && (
              <p className="text-[10px] text-accent-cyan">
                Zeroed at {calibration.pitch.toFixed(2)}° / {calibration.roll.toFixed(2)}°
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
