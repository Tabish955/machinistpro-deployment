import React, { useState, useMemo } from "react";
import {
  Compass,
  Layers,
  Sparkles,
  Info,
  RotateCw,
} from "lucide-react";

export function MohrsCircleVisualizer() {
  const [sigmaX, setSigmaX] = useState<number>(80); // Normal stress X in MPa
  const [sigmaY, setSigmaY] = useState<number>(-40); // Normal stress Y in MPa
  const [tauXY, setTauXY] = useState<number>(35); // Shear stress XY in MPa
  const [thetaRotation, setThetaRotation] = useState<number>(0); // Element rotation in deg

  // Mohr's Circle calculations
  const calc = useMemo(() => {
    const avgSigma = (sigmaX + sigmaY) / 2;
    const diffSigma = (sigmaX - sigmaY) / 2;
    const radius = Math.sqrt(diffSigma * diffSigma + tauXY * tauXY);

    const sigma1 = avgSigma + radius;
    const sigma2 = avgSigma - radius;
    const tauMax = radius;

    // Angle of principal plane 2*theta_p (radians)
    const twoThetaP = Math.atan2(tauXY, diffSigma);
    const thetaP1_deg = (twoThetaP * 180) / Math.PI / 2;
    const thetaP2_deg = thetaP1_deg + 90;

    // von Mises equivalent stress (2D plane stress)
    const vonMises = Math.sqrt(
      sigmaX * sigmaX - sigmaX * sigmaY + sigmaY * sigmaY + 3 * tauXY * tauXY
    );

    // Tresca equivalent stress
    const tresca = Math.max(Math.abs(sigma1 - sigma2), Math.abs(sigma1), Math.abs(sigma2));

    // Stresses at custom rotation angle theta
    const radTheta = (thetaRotation * Math.PI) / 180;
    const sigmaX_rot = avgSigma + diffSigma * Math.cos(2 * radTheta) + tauXY * Math.sin(2 * radTheta);
    const sigmaY_rot = avgSigma - diffSigma * Math.cos(2 * radTheta) - tauXY * Math.sin(2 * radTheta);
    const tauXY_rot = -diffSigma * Math.sin(2 * radTheta) + tauXY * Math.cos(2 * radTheta);

    return {
      avgSigma,
      radius,
      sigma1,
      sigma2,
      tauMax,
      thetaP1_deg,
      thetaP2_deg,
      vonMises,
      tresca,
      sigmaX_rot,
      sigmaY_rot,
      tauXY_rot,
    };
  }, [sigmaX, sigmaY, tauXY, thetaRotation]);

  // SVG parameters
  const svgSize = 340;
  const centerCanvas = svgSize / 2;
  const maxSpan = Math.max(80, Math.abs(calc.avgSigma) + calc.radius * 1.35);
  const scale = (svgSize * 0.42) / maxSpan;

  const toSvgX = (val: number) => centerCanvas + val * scale;
  const toSvgY = (val: number) => centerCanvas - val * scale; // Inverted Y

  const circleCenterX = toSvgX(calc.avgSigma);
  const circleCenterY = centerCanvas;
  const circleRadiusPx = calc.radius * scale;

  const ptA = { x: toSvgX(sigmaX), y: toSvgY(tauXY) };
  const ptB = { x: toSvgX(sigmaY), y: toSvgY(-tauXY) };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass size={20} className="text-accent-cyan" />
            <span>Interactive 2D Mohr's Circle & Stress Tensor</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Principal stresses (σ₁, σ₂), maximum shear (τ_max), von Mises yield criterion, and element transformation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Inputs & Transformation Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400">Normal Stress σ_x (MPa)</label>
              <input
                type="number"
                step="5"
                value={sigmaX}
                onChange={(e) => setSigmaX(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400">Normal Stress σ_y (MPa)</label>
              <input
                type="number"
                step="5"
                value={sigmaY}
                onChange={(e) => setSigmaY(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Shear Stress τ_xy (MPa)</label>
            <input
              type="number"
              step="5"
              value={tauXY}
              onChange={(e) => setTauXY(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
            />
          </div>

          {/* Element Rotation Angle Slider */}
          <div className="rounded-xl border border-white/[0.06] bg-dark-800/60 p-3.5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                <RotateCw size={13} className="text-accent-amber" />
                Element Rotation Angle (θ)
              </span>
              <span className="font-mono text-accent-amber font-bold">{thetaRotation}°</span>
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              value={thetaRotation}
              onChange={(e) => setThetaRotation(parseInt(e.target.value, 10))}
              className="w-full accent-accent-amber cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>-90°</span>
              <span>0°</span>
              <span>+90°</span>
            </div>
          </div>

          {/* Rotated Stresses Telemetry */}
          {thetaRotation !== 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs font-mono text-amber-300 space-y-1">
              <p className="font-bold">Stresses on Rotated Plane ({thetaRotation}°):</p>
              <p>σ_x' = {calc.sigmaX_rot.toFixed(1)} MPa · σ_y' = {calc.sigmaY_rot.toFixed(1)} MPa</p>
              <p>τ_xy' = {calc.tauXY_rot.toFixed(1)} MPa</p>
            </div>
          )}
        </div>

        {/* Center: 2D Mohr's Circle Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative rounded-2xl border border-white/[0.08] bg-dark-950/90 p-4 shadow-inner">
            <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-72 h-72 sm:w-80 sm:h-80 select-none">
              {/* Grid axes */}
              <line x1={0} y1={centerCanvas} x2={svgSize} y2={centerCanvas} stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
              <line x1={centerCanvas} y1={0} x2={centerCanvas} y2={svgSize} stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />

              <text x={svgSize - 18} y={centerCanvas - 6} fill="#9ca3af" fontSize="10" fontFamily="monospace">
                σ
              </text>
              <text x={centerCanvas + 6} y={15} fill="#9ca3af" fontSize="10" fontFamily="monospace">
                τ
              </text>

              {/* Mohr's Circle */}
              <circle
                cx={circleCenterX}
                cy={circleCenterY}
                r={circleRadiusPx}
                fill="rgba(34, 211, 238, 0.08)"
                stroke="#22d3ee"
                strokeWidth="2"
              />

              {/* Diameter line joining Face X and Face Y */}
              <line x1={ptA.x} y1={ptA.y} x2={ptB.x} y2={ptB.y} stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="3 3" />

              {/* Center point */}
              <circle cx={circleCenterX} cy={circleCenterY} r="3.5" fill="#ffffff" />

              {/* Point A (sigma_x, tau_xy) */}
              <circle cx={ptA.x} cy={ptA.y} r="4.5" fill="#22d3ee" />
              <text x={ptA.x + 6} y={ptA.y - 4} fill="#22d3ee" fontSize="9" fontWeight="bold" fontFamily="monospace">
                X({sigmaX}, {tauXY})
              </text>

              {/* Point B (sigma_y, -tau_xy) */}
              <circle cx={ptB.x} cy={ptB.y} r="4.5" fill="#f472b6" />
              <text x={ptB.x + 6} y={ptB.y + 12} fill="#f472b6" fontSize="9" fontWeight="bold" fontFamily="monospace">
                Y({sigmaY}, {-tauXY})
              </text>

              {/* Principal stresses markers on horizontal axis */}
              <circle cx={toSvgX(calc.sigma1)} cy={centerCanvas} r="4.5" fill="#10b981" />
              <text x={toSvgX(calc.sigma1) + 4} y={centerCanvas + 14} fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                σ₁
              </text>

              <circle cx={toSvgX(calc.sigma2)} cy={centerCanvas} r="4.5" fill="#10b981" />
              <text x={toSvgX(calc.sigma2) - 16} y={centerCanvas + 14} fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                σ₂
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Output Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Principal Stress σ₁
          </span>
          <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
            {calc.sigma1.toFixed(1)} <span className="text-xs text-gray-400 font-normal">MPa</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">θ_p1 = {calc.thetaP1_deg.toFixed(1)}°</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Principal Stress σ₂
          </span>
          <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
            {calc.sigma2.toFixed(1)} <span className="text-xs text-gray-400 font-normal">MPa</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">θ_p2 = {calc.thetaP2_deg.toFixed(1)}°</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Max In-Plane Shear (τ_max)
          </span>
          <span className="text-xl font-black font-mono text-amber-400 mt-1 block">
            {calc.tauMax.toFixed(1)} <span className="text-xs text-gray-400 font-normal">MPa</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">R = {calc.radius.toFixed(1)} MPa</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            von Mises Stress (σ_v)
          </span>
          <span className="text-xl font-black font-mono text-cyan-400 mt-1 block">
            {calc.vonMises.toFixed(1)} <span className="text-xs text-gray-400 font-normal">MPa</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Tresca = {calc.tresca.toFixed(1)} MPa</span>
        </div>
      </div>
    </div>
  );
}
