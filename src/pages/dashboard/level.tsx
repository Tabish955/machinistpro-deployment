import { useEffect, useRef, useState } from "react";
import {
  applyCalibration,
  averageTilt,
  ballOffset,
  formatSlope,
  isLevel,
  normaliseAngle,
  slopeDirection,
  smooth,
  totalTilt,
  detectMode,
  edgeAngle,
  edgeOrientation,
  plumbAngle,
  gravityToTilt,
  NO_CALIBRATION,
  SLOPE_UNITS,
  type LevelCalibration,
  type SlopeUnit,
  type Tilt,
  type Gravity,
  type LevelMode,
  type EdgeOrientation,
} from "@/lib/level/level";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Compass, Crosshair, Pause, Play, RotateCcw } from "lucide-react";

type Status = "idle" | "running" | "denied" | "unsupported";

const CAL_KEY = "machinist-pro-level-calibration";

export default function LevelPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [raw, setRaw] = useState<Tilt>({ pitch: 0, roll: 0 });
  const [held, setHeld] = useState<Tilt | null>(null);
  const [heldEdge, setHeldEdge] = useState<number | null>(null);
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
  const [gravity, setGravity] = useState<Gravity | null>(null);
  const [mode, setMode] = useState<LevelMode>("surface");
  const [edge, setEdge] = useState(0);
  const [plumb, setPlumb] = useState(0);
  const [heldOn, setHeldOn] = useState<EdgeOrientation>("portrait");

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
      const g = { x: a.x, y: a.y, z: a.z };
      setGravity(g);
      setMode((current) => detectMode(g, current));
      setEdge(edgeAngle(g));
      setPlumb(plumbAngle(g));
      setHeldOn(edgeOrientation(g));
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
  const level = isLevel(tilt);
  const direction = slopeDirection(tilt);

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

  const edgeShown = heldEdge ?? edge;
  const edgeLevel = Math.abs(edgeShown) <= 0.15;

  // Rolls downhill, both axes the same way round. Pinned at the rim so it stays in view.
  const ball = ballOffset(tilt);
  const bubbleX = ball.x * 42;
  const bubbleY = ball.y * 42;

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
              <p className="text-sm text-gray-400 mb-4">
                Lay the phone on the surface you want to check.
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
          <Card variant="solid" padding="md" className="border-dark-600">
            {mode === "surface" ? (
              <>
                <div className="flex flex-col items-center py-2">
                  <div
                    className={`relative h-56 w-56 rounded-full border-2 transition-colors ${
                      level
                        ? "border-accent-green/70 bg-accent-green/[0.06]"
                        : "border-dark-600 bg-dark-900/60"
                    }`}
                  >
                    <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dark-500" />
                    <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-dark-600" />
                    <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-dark-600" />
                    <div
                      className={`absolute left-1/2 top-1/2 h-12 w-12 rounded-full transition-transform ${
                        level ? "bg-accent-green/70" : "bg-accent-cyan/70"
                      }`}
                      style={{
                        transform: `translate(calc(-50% + ${bubbleX}%), calc(-50% + ${bubbleY}%))`,
                      }}
                    />
                  </div>
                  <p
                    className={`mt-5 font-mono text-4xl ${level ? "text-accent-green" : "text-white"}`}
                  >
                    {formatSlope(total, unit)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {level ? "Level" : `falls towards ${direction.toFixed(0)}°`}
                    {held && " · held"}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dark-700 pt-4">
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
                </div>
              </>
            ) : (
              <>
                {/* Stood on an edge, only the angle in the screen plane means anything,
                    so a seesaw beam replaces the bubble. */}
                <div className="flex flex-col items-center py-4">
                  <svg
                    viewBox="0 0 240 150"
                    className="w-full max-w-sm"
                    role="img"
                    aria-label="Edge level beam"
                  >
                    <line
                      x1="14"
                      y1="118"
                      x2="226"
                      y2="118"
                      stroke="#8b93a7"
                      strokeWidth="1"
                      strokeDasharray="6 4"
                    />
                    <g transform={`rotate(${Math.max(-35, Math.min(35, edgeShown))} 120 92)`}>
                      <rect
                        x="26"
                        y="84"
                        width="188"
                        height="16"
                        rx="8"
                        fill={edgeLevel ? "rgba(34,197,94,0.22)" : "rgba(0,212,255,0.18)"}
                        stroke={edgeLevel ? "#22c55e" : "#00d4ff"}
                        strokeWidth="2"
                      />
                      <circle cx="120" cy="92" r="5" fill={edgeLevel ? "#22c55e" : "#00d4ff"} />
                    </g>
                    <polygon points="120,92 134,124 106,124" fill="#8b93a7" opacity="0.5" />
                  </svg>
                  <p
                    className={`mt-4 font-mono text-4xl ${edgeLevel ? "text-accent-green" : "text-white"}`}
                  >
                    {formatSlope(Math.abs(edgeShown), unit)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {edgeLevel ? "Level" : `${edgeShown > 0 ? "right" : "left"} side low`}
                    {" · on its "}
                    {heldOn === "portrait" ? "short edge" : "long edge"}
                    {heldEdge !== null && " · held"}
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-3 border-t border-dark-700 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Off level</p>
                    <p className="font-mono text-lg text-white">{formatSlope(edgeShown, unit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Off plumb</p>
                    <p className="font-mono text-lg text-white">{formatSlope(plumb, unit)}</p>
                  </div>
                </div>
              </>
            )}
            <p className="mt-3 text-center text-[10px] text-gray-600">
              {mode === "surface"
                ? "Lying flat — both axes. Stand it on an edge to switch."
                : "Standing on an edge — one axis, portrait or landscape. Lay it flat to switch back."}
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
                  if (mode === "edge") setHeldEdge(heldEdge === null ? edge : null);
                  else setHeld(held ? null : live);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
              >
                {(mode === "edge" ? heldEdge !== null : held !== null) ? (
                  <Play size={13} />
                ) : (
                  <Pause size={13} />
                )}
                {(mode === "edge" ? heldEdge !== null : held !== null) ? "Resume" : "Hold reading"}
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
