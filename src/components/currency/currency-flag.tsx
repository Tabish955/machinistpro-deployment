import React, { useState } from "react";
import { getCurrencyMeta, type CurrencyMeta } from "@/lib/currency/database";

interface CurrencyFlagProps {
  code: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CurrencyFlag({ code, size = "md", className = "" }: CurrencyFlagProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const meta = getCurrencyMeta(code);

  const sizeClasses = {
    sm: "w-4 h-4 text-[9px]",
    md: "w-5 h-5 text-[10px]",
    lg: "w-7 h-7 text-xs",
  }[size];

  // 1. Precious Metals
  if (meta.category === "metal") {
    const isGold = meta.code === "XAU";
    const isSilver = meta.code === "XAG";
    const isPlatinum = meta.code === "XPT";

    const bgGradient = isGold
      ? "from-amber-400 to-yellow-600 text-dark-950 font-black border-amber-300/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
      : isSilver
      ? "from-slate-200 to-slate-400 text-dark-950 font-black border-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.3)]"
      : isPlatinum
      ? "from-cyan-200 to-teal-400 text-dark-950 font-black border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
      : "from-amber-200 to-orange-400 text-dark-950 font-black border-orange-300";

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br border shrink-0 font-mono tracking-tighter ${bgGradient} ${sizeClasses} ${className}`}
        title={meta.name}
      >
        {meta.symbol || meta.code.slice(1, 3)}
      </span>
    );
  }

  // 2. Cryptocurrencies
  if (meta.category === "crypto") {
    const cryptoGradients: Record<string, string> = {
      BTC: "from-amber-500 to-orange-600 text-white font-bold border-amber-400/50",
      ETH: "from-indigo-400 to-purple-600 text-white font-bold border-indigo-400/50",
      SOL: "from-emerald-400 to-teal-600 text-white font-bold border-emerald-400/50",
      BNB: "from-yellow-400 to-amber-500 text-dark-950 font-black border-yellow-300/50",
      XRP: "from-blue-400 to-cyan-600 text-white font-bold border-blue-400/50",
      DOGE: "from-amber-300 to-yellow-500 text-dark-950 font-black border-amber-300/50",
      USDT: "from-emerald-500 to-teal-700 text-white font-bold border-emerald-400/50",
      USDC: "from-blue-500 to-indigo-600 text-white font-bold border-blue-400/50",
    };

    const gradient =
      cryptoGradients[meta.code] ||
      "from-accent-cyan/80 to-accent-blue/80 text-white font-bold border-accent-cyan/30";

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br border shrink-0 font-mono ${gradient} ${sizeClasses} ${className}`}
        title={meta.name}
      >
        {meta.symbol || meta.code.slice(0, 2)}
      </span>
    );
  }

  // 3. Fiat with country code SVG flag
  if (meta.countryCode && !imgFailed) {
    const country = meta.countryCode.toLowerCase();
    // Circle-flags CDN provides beautiful crisp SVG flags for all countries
    const flagUrl = `https://hatscripts.github.io/circle-flags/flags/${country}.svg`;

    return (
      <img
        src={flagUrl}
        alt={`${meta.code} flag`}
        onError={() => setImgFailed(true)}
        className={`inline-block rounded-full object-cover shrink-0 shadow-sm ${sizeClasses} ${className}`}
        loading="lazy"
      />
    );
  }

  // 4. Fallback stylish country/currency badge
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border border-white/15 bg-dark-700 font-mono font-bold text-accent-cyan shrink-0 ${sizeClasses} ${className}`}
      title={meta.name}
    >
      {meta.code.slice(0, 2)}
    </span>
  );
}
