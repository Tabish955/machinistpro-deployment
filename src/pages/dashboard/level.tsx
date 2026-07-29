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
  NO_CALIBRATION,
  SLOPE_UNITS,
  type LevelCalibration,
  type SlopeUnit,
  type Tilt,
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
    window.addEventListener("deviceorientation", onOrient, true);
    return () => window.removeEventListener("deviceorientation", onOrient, true);
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

  // Bubble sits opposite the fall, as a real vial does. Clamped so it stays in view.
  const clamp = (v: number) => Math.max(-1, Math.min(1, v / 5));
  const bubbleX = -clamp(tilt.roll) * 42;
  const bubbleY = clamp(tilt.pitch) * 42;

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
              This device has no tilt sensor, or the browser does not expose one. The level needs
              a phone or tablet.
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
              <button onClick={start} className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-5 py-2.5 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20">
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
            <div className="flex flex-col items-center py-2">
              <div
                className={`relative h-56 w-56 rounded-full border-2 transition-colors ${
                  level ? "border-accent-green/70 bg-accent-green/[0.06]" : "border-dark-600 bg-dark-900/60"
                }`}
              >
                <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dark-500" />
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-dark-600" />
                <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-dark-600" />
                <div
                  className={`absolute left-1/2 top-1/2 h-12 w-12 rounded-full transition-transform ${
                    level ? "bg-accent-green/70" : "bg-accent-cyan/70"
                  }`}
                  style={{ transform: `translate(calc(-50% + ${bubbleX}%), calc(-50% + ${bubbleY}%))` }}
                />
              </div>
              <p className={`mt-5 font-mono text-4xl ${level ? "text-accent-green" : "text-white"}`}>
                {formatSlope(total, unit)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {level ? "Level" : `falls towards ${direction.toFixed(0)}°`}
                {held && " · held"}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dark-700 pt-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Front · back</p>
                <p className="font-mono text-lg text-white">{formatSlope(tilt.pitch, unit)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Left · right</p>
                <p className="font-mono text-lg text-white">{formatSlope(tilt.roll, unit)}</p>
              </div>
            </div>
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
                onClick={() => setHeld(held ? null : live)}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
              >
                {held ? <Play size={13} /> : <Pause size={13} />}
                {held ? "Resume" : "Hold reading"}
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
