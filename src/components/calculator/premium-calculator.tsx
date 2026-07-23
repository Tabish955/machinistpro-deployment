"use client";

import { useEffect, useRef } from "react";
import { useCalculatorStore } from "@/store/calculator-store";
import { PremiumDisplay } from "./premium-display";
import { PremiumKeypad } from "./premium-keypad";
import { HistoryPanel } from "./history-panel";
import {
  ArrowLeft,
  Clock,
  Undo2,
  Redo2,
  ClipboardPaste,
} from "lucide-react";
import Link from "next/link";
import type { AngleMode } from "@/lib/calculator/types";

export function PremiumCalculator() {
  const {
    angleMode,
    setAngleMode,
    isSecondFunction,
    toggleSecondFunction,
    toggleHistory,
    showHistory,
    hasMemory,
    undoStack,
    redoStack,
    undo,
    redo,
    pasteNumber,
    inputDigit,
    inputDecimal,
    inputOperator,
    inputParenthesis,
    inputConstant,
    backspace,
    clear,
    calculate,
  } = useCalculatorStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key;

      if (/^[0-9]$/.test(key)) { inputDigit(key); return; }
      if (key === "." || key === ",") { e.preventDefault(); inputDecimal(); return; }
      if (key === "+") { inputOperator("+"); return; }
      if (key === "-") { inputOperator("-"); return; }
      if (key === "*") { e.preventDefault(); inputOperator("*"); return; }
      if (key === "/") { e.preventDefault(); inputOperator("/"); return; }
      if (key === "^") { inputOperator("^"); return; }
      if (key === "%") { inputOperator("%"); return; }
      if (key === "(") { inputParenthesis("("); return; }
      if (key === ")") { inputParenthesis(")"); return; }
      if (key === "Enter" || key === "=") { e.preventDefault(); calculate(); return; }
      if (key === "Backspace") { backspace(); return; }
      if (key === "Escape") { clear(); return; }

      if (key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (key === "v" && (e.ctrlKey || e.metaKey)) {
        pasteNumber();
        return;
      }
      if (key === "p" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputConstant("π");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    inputDigit, inputDecimal, inputOperator, inputParenthesis,
    inputConstant, backspace, clear, calculate, undo, redo, pasteNumber,
  ]);

  const angleModes: AngleMode[] = ["deg", "rad", "grad"];

  const cycleAngleMode = () => {
    const i = angleModes.indexOf(angleMode);
    setAngleMode(angleModes[(i + 1) % angleModes.length]);
  };

  return (
    <>
      {/*
        calc-shell fills the entire content area the parent layout gives us.
        On mobile the parent's <main> stretches to the viewport minus the
        header / bottom-nav — we set negative margins to reclaim that padding
        and occupy the full area without any scrolling.
      */}
      <div
        ref={containerRef}
        className="flex flex-col -m-4 lg:-m-6 overflow-hidden bg-gradient-to-b from-dark-900 via-dark-950 to-[#020204]"
        style={{
          height: "calc(100dvh - 3.5rem)",          /* subtract header 56px */
          maxHeight: "calc(100dvh - 3.5rem)",
          touchAction: "manipulation",
        }}
      >
        {/* ─── Top bar ─── */}
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 border-b border-white/[0.04]">
          {/* Left cluster */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </Link>

            <span className="hidden sm:inline text-sm font-semibold text-white pl-1">
              Scientific Calculator
            </span>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-25"
              aria-label="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-25"
              aria-label="Redo"
            >
              <Redo2 size={16} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />

            <button
              onClick={() => { void pasteNumber(); }}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors hidden sm:flex"
              aria-label="Paste"
            >
              <ClipboardPaste size={16} />
            </button>

            <button
              onClick={toggleHistory}
              className={`p-2 rounded-xl transition-colors ${
                showHistory
                  ? "text-accent-cyan bg-accent-cyan/10"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
              aria-label="Toggle history"
            >
              <Clock size={16} />
            </button>
          </div>
        </div>

        {/* ─── Mode bar ─── */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 sm:px-4">
          <button
            onClick={cycleAngleMode}
            className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-accent-cyan hover:bg-white/[0.07] transition-colors"
          >
            {angleMode.toUpperCase()}
          </button>

          <button
            onClick={toggleSecondFunction}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
              isSecondFunction
                ? "bg-accent-purple/20 border-accent-purple/30 text-accent-purple"
                : "bg-white/[0.04] border-white/[0.06] text-gray-500 hover:text-white"
            }`}
          >
            2nd
          </button>

          {hasMemory && (
            <span className="px-2 py-0.5 rounded bg-accent-amber/15 text-accent-amber text-[10px] font-bold tracking-wider">
              M
            </span>
          )}

          <span className="ml-auto text-[10px] text-gray-700 hidden md:block">
            Keyboard enabled
          </span>
        </div>

        {/* ─── Display ─── */}
        <div className="shrink-0 px-3 pt-1 pb-2 sm:px-4">
          <PremiumDisplay />
        </div>

        {/* ─── Keypad (fills all remaining space) ─── */}
        <div className="flex-1 min-h-0 px-2 pb-2 sm:px-3 sm:pb-3 lg:pb-2">
          <PremiumKeypad />
        </div>
      </div>

      {/* History panel (uses fixed positioning internally) */}
      <HistoryPanel />
    </>
  );
}
