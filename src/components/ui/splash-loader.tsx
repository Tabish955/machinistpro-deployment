"use client";

import { useEffect, useState } from "react";

export function SplashLoader() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Check if already loaded before
    const loaded = sessionStorage.getItem("mp_loaded");
    if (loaded) {
      setVisible(false);
      return;
    }

    // Animate progress
    let frame = 0;
    const duration = 60; // ~60 frames ≈ 2 seconds at 30fps
    const interval = setInterval(() => {
      frame++;
      // Ease-out curve
      const t = frame / duration;
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.min(eased * 100, 100));

      if (frame >= duration) {
        clearInterval(interval);
        setFadeOut(true);
        sessionStorage.setItem("mp_loaded", "1");
        setTimeout(() => setVisible(false), 600);
      }
    }, 33);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-dark-950 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ cursor: "none" }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Radial gradient pulses */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-cyan/[0.03] blur-[100px] animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-accent-purple/[0.04] blur-[80px]" style={{ animation: "pulse-glow 3s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] rounded-full bg-accent-blue/[0.03] blur-[60px]" style={{ animation: "pulse-glow 2.5s ease-in-out infinite 0.5s" }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-30" />

        {/* Rotating ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg width="280" height="280" viewBox="0 0 280 280" className="animate-rotate opacity-[0.08]">
            <circle cx="140" cy="140" r="130" fill="none" stroke="#00d4ff" strokeWidth="0.5" strokeDasharray="8 12" />
          </svg>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg width="220" height="220" viewBox="0 0 220 220" style={{ animation: "rotate 12s linear infinite reverse" }}>
            <circle cx="110" cy="110" r="100" fill="none" stroke="#8b5cf6" strokeWidth="0.5" strokeDasharray="4 16" className="opacity-[0.1]" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-2xl bg-accent-cyan/20 blur-xl scale-150" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 border border-accent-cyan/30 flex items-center justify-center backdrop-blur-sm">
            <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
              <circle cx="20" cy="18" r="10" stroke="#00d4ff" strokeWidth="2" />
              <circle cx="20" cy="18" r="2.5" fill="#00d4ff" />
              <line x1="20" y1="8" x2="20" y2="10" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="20" y1="26" x2="20" y2="28" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="18" x2="12" y2="18" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="28" y1="18" x2="30" y2="18" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="12" y="32" width="16" height="3" rx="1.5" fill="#00d4ff" opacity="0.5" />
            </svg>
          </div>
        </div>

        {/* Brand name */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            Machinist
          </span>
          <span className="text-3xl font-extrabold tracking-tight text-accent-cyan">
            Pro
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-10 tracking-widest uppercase">
          Precision Engineering Tools
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1 rounded-full bg-dark-800 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-blue transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status text */}
        <p className="text-[11px] text-gray-600 font-mono">
          {progress < 30
            ? "Initializing engine…"
            : progress < 60
            ? "Loading modules…"
            : progress < 90
            ? "Preparing workspace…"
            : "Ready"}
        </p>
      </div>

      {/* Bottom version */}
      <div className="absolute bottom-8 text-[10px] text-gray-700">
        v1.0.0-rc1
      </div>
    </div>
  );
}
