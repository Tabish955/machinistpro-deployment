import React, { useRef, useState, useEffect } from "react";
import { MathRenderer } from "@/lib/calculator/math-renderer";

interface DesmosMathInputProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function DesmosMathInput({
  value,
  onChange,
  onEnter,
  placeholder = "e.g. y = x^2 - 4 or sin(x)",
  className = "",
  autoFocus = false,
}: DesmosMathInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPos, setCursorPos] = useState<number | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange(raw);
    setCursorPos(e.target.selectionStart);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`relative flex items-center min-h-[38px] w-full rounded-xl border px-3 py-1.5 transition-all cursor-text ${
        isFocused
          ? "border-accent-cyan/60 bg-dark-950 shadow-[0_0_15px_rgba(0,212,255,0.12)] ring-1 ring-accent-cyan/30"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.18]"
      } ${className}`}
    >
      {/* Visual Rendered Typography (Desmos style with raised superscripts, radicals, fractions) */}
      <div className="flex-1 font-mono text-sm sm:text-base text-white select-none pointer-events-none truncate flex items-center">
        {value.trim() ? (
          <div className="flex items-center">
            <MathRenderer expression={value} showCursor={isFocused} />
          </div>
        ) : (
          <span className="text-gray-600 font-sans text-xs sm:text-sm italic">{placeholder}</span>
        )}
      </div>

      {/* Invisible live input field layered underneath to handle user keyboard & IME events */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        onSelect={(e) => setCursorPos((e.target as HTMLInputElement).selectionStart)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text font-mono text-sm"
        aria-label="Mathematical Expression"
      />
    </div>
  );
}
