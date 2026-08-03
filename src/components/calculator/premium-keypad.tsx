import { useCallback, useRef, useState, useEffect } from "react";
import { useCalculatorStore } from "@/store/calculator-store";
import { Delete, Divide, X, Minus, Plus, Equal, Percent } from "lucide-react";

type ButtonVariant = "number" | "operator" | "function" | "action" | "memory" | "equal" | "clear";

interface CalcButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  onLongPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  label?: string;
}

function CalcButton({
  children,
  onClick,
  onLongPress,
  variant = "number",
  disabled = false,
  className = "",
  label,
}: CalcButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressInterval = useRef<NodeJS.Timeout | null>(null);
  const pressActive = useRef(false);
  const didLongPress = useRef(false);
  const [isPressed, setIsPressed] = useState(false);

  const variantStyles: Record<ButtonVariant, string> = {
    number: "bg-dark-800 hover:bg-dark-700 text-white border-dark-700 shadow-lg shadow-black/20",
    operator:
      "bg-dark-700 hover:bg-dark-600 text-accent-cyan border-dark-600 shadow-lg shadow-black/20",
    function:
      "bg-dark-800/70 hover:bg-dark-700 text-gray-300 border-dark-700/50 text-[11px] sm:text-sm font-medium",
    action: "bg-dark-700/70 hover:bg-dark-600 text-gray-400 border-dark-600/50",
    memory:
      "bg-dark-800/50 hover:bg-dark-700 text-gray-500 border-dark-700/30 text-[10px] sm:text-xs",
    equal:
      "bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-cyan text-dark-950 font-bold border-transparent shadow-lg shadow-accent-cyan/20",
    clear: "bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border-accent-red/20",
  };

  const handleTouchStart = useCallback(() => {
    if (pressActive.current) return;
    pressActive.current = true;
    didLongPress.current = false;
    setIsPressed(true);

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        // Start repeating on long press
        didLongPress.current = true;
        onLongPress();
        longPressInterval.current = setInterval(onLongPress, 100);
      }, 500);
    }

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [onLongPress]);

  const handleTouchEnd = useCallback(() => {
    pressActive.current = false;
    setIsPressed(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (longPressInterval.current) {
      clearInterval(longPressInterval.current);
      longPressInterval.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (!longPressInterval.current) {
      onClick();
    }
  }, [onClick]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (longPressInterval.current) clearInterval(longPressInterval.current);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      disabled={disabled}
      aria-label={label}
      className={`
        relative flex items-center justify-center
        rounded-xl border
        font-semibold
        select-none
        transition-all duration-100
        active:scale-[0.96]
        disabled:opacity-40 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:ring-offset-2 focus:ring-offset-dark-950
        ${variantStyles[variant]}
        ${isPressed ? "scale-[0.96] brightness-110" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function PremiumKeypad({ scientific = true }: { scientific?: boolean }) {
  const {
    isSecondFunction,
    inputDigit,
    inputDecimal,
    inputOperator,
    inputFunction,
    inputConstant,
    inputParenthesis,
    inputComma,
    inputExponent,
    inputAnswer,
    backspace,
    clear,
    clearEntry,
    calculate,
    negate,
    percentage,
    memoryClear,
    memoryRecall,
    memoryStore,
    memoryAdd,
    memorySubtract,
    hasMemory,
  } = useCalculatorStore();

  return (
    <div className={`flex h-full flex-col gap-1.5 sm:gap-2 ${scientific ? "min-h-[35rem]" : ""}`}>
      {/* Memory row */}
      <div className="grid h-9 shrink-0 grid-cols-5 gap-1 sm:h-10 sm:gap-1.5">
        <CalcButton
          onClick={memoryClear}
          variant="memory"
          disabled={!hasMemory}
          label="Memory Clear"
        >
          MC
        </CalcButton>
        <CalcButton
          onClick={memoryRecall}
          variant="memory"
          disabled={!hasMemory}
          label="Memory Recall"
        >
          MR
        </CalcButton>
        <CalcButton onClick={memoryStore} variant="memory" label="Memory Store">
          MS
        </CalcButton>
        <CalcButton onClick={memoryAdd} variant="memory" label="Memory Add">
          M+
        </CalcButton>
        <CalcButton onClick={memorySubtract} variant="memory" label="Memory Subtract">
          M−
        </CalcButton>
      </div>

      {/* Scientific functions row 1 */}
      {scientific && (
        <div className="grid h-10 shrink-0 grid-cols-5 gap-1 sm:gap-1.5">
          <CalcButton
            onClick={() => inputFunction(isSecondFunction ? "asin" : "sin")}
            variant="function"
            label={isSecondFunction ? "Arc sine" : "Sine"}
          >
            {isSecondFunction ? "sin⁻¹" : "sin"}
          </CalcButton>
          <CalcButton
            onClick={() => inputFunction(isSecondFunction ? "acos" : "cos")}
            variant="function"
            label={isSecondFunction ? "Arc cosine" : "Cosine"}
          >
            {isSecondFunction ? "cos⁻¹" : "cos"}
          </CalcButton>
          <CalcButton
            onClick={() => inputFunction(isSecondFunction ? "atan" : "tan")}
            variant="function"
            label={isSecondFunction ? "Arc tangent" : "Tangent"}
          >
            {isSecondFunction ? "tan⁻¹" : "tan"}
          </CalcButton>
          {/* ln and log pair with their own inverses, as on a physical calculator. */}
          <CalcButton
            onClick={() => inputFunction(isSecondFunction ? "exp" : "ln")}
            variant="function"
            label={isSecondFunction ? "e to power" : "Natural log"}
          >
            {isSecondFunction ? "eˣ" : "ln"}
          </CalcButton>
          <CalcButton
            onClick={() => inputFunction(isSecondFunction ? "pow10" : "log")}
            variant="function"
            label={isSecondFunction ? "10 to power" : "Log base 10"}
          >
            {isSecondFunction ? "10ˣ" : "log"}
          </CalcButton>
        </div>
      )}

      {/* Scientific functions row 2 */}
      {scientific && (
        <div className="grid h-10 shrink-0 grid-cols-5 gap-1 sm:gap-1.5">
          <CalcButton onClick={() => inputFunction("sqrt")} variant="function" label="Square root">
            √
          </CalcButton>
          <CalcButton onClick={() => inputFunction("square")} variant="function" label="Square">
            x²
          </CalcButton>
          <CalcButton
            onClick={() => inputFunction(isSecondFunction ? "cbrt" : "cube")}
            variant="function"
            label={isSecondFunction ? "Cube root" : "Cube"}
          >
            {isSecondFunction ? "∛" : "x³"}
          </CalcButton>
          <CalcButton
            onClick={() => (isSecondFunction ? inputFunction("nroot") : inputOperator("^"))}
            variant="function"
            label={isSecondFunction ? "Nth root" : "Power"}
          >
            {isSecondFunction ? "ʸ√x" : "xʸ"}
          </CalcButton>
          <CalcButton
            onClick={() => inputFunction(isSecondFunction ? "abs" : "fact")}
            variant="function"
            label={isSecondFunction ? "Absolute value" : "Factorial"}
          >
            {isSecondFunction ? "|x|" : "x!"}
          </CalcButton>
        </div>
      )}

      {/* Parentheses & constants row */}
      {scientific && (
        <div className="grid h-10 shrink-0 grid-cols-5 gap-1 sm:gap-1.5">
          <CalcButton
            onClick={() => inputParenthesis("(")}
            variant="function"
            label="Open parenthesis"
          >
            (
          </CalcButton>
          <CalcButton
            onClick={() => inputParenthesis(")")}
            variant="function"
            label="Close parenthesis"
          >
            )
          </CalcButton>
          <CalcButton onClick={() => inputConstant("π")} variant="function" label="Pi">
            π
          </CalcButton>
          <CalcButton onClick={() => inputConstant("e")} variant="function" label="Euler's number">
            e
          </CalcButton>
          <CalcButton onClick={() => inputFunction("recip")} variant="function" label="Reciprocal">
            ¹⁄ₓ
          </CalcButton>
        </div>
      )}

      {/* Additional functions stay compact and horizontally scroll on small screens. */}
      {scientific && (
        <div
          className="flex h-9 shrink-0 gap-1 overflow-x-auto pb-0.5 sm:h-10 sm:gap-1.5"
          aria-label="Additional scientific functions"
        >
          <CalcButton
            onClick={inputAnswer}
            variant="function"
            className="min-w-14 px-2"
            label="Last answer"
          >
            Ans
          </CalcButton>
          <CalcButton
            onClick={inputExponent}
            variant="function"
            className="min-w-14 px-2"
            label="Scientific exponent"
          >
            EE
          </CalcButton>
          <CalcButton
            onClick={inputComma}
            variant="function"
            className="min-w-12 px-2"
            label="Argument separator"
          >
            ,
          </CalcButton>
          {[
            ["sinh", "Hyperbolic sine", "sinh"],
            ["cosh", "Hyperbolic cosine", "cosh"],
            ["tanh", "Hyperbolic tangent", "tanh"],
            ["asinh", "Inverse hyperbolic sine", "asinh"],
            ["acosh", "Inverse hyperbolic cosine", "acosh"],
            ["atanh", "Inverse hyperbolic tangent", "atanh"],
            ["log2", "Log base 2", "log₂"],
            ["floor", "Floor", "⌊x⌋"],
            ["ceil", "Ceiling", "⌈x⌉"],
            ["round", "Round", "round"],
            ["ncr", "Combinations", "nCr"],
            ["npr", "Permutations", "nPr"],
            ["mod", "Modulo (remainder)", "mod"],
          ].map(([fn, label, text]) => (
            <CalcButton
              key={fn}
              onClick={() => inputFunction(fn)}
              variant="function"
              className="min-w-16 px-2"
              label={label}
            >
              {text}
            </CalcButton>
          ))}
        </div>
      )}

      {/* Main keypad */}
      <div
        className={`grid flex-1 grid-cols-4 gap-1.5 sm:gap-2 ${
          scientific ? "min-h-[15.5rem] grid-rows-5" : "min-h-[19rem] grid-rows-6"
        }`}
      >
        {scientific ? (
          <>
            {/* Row 1: AC, CE, %, ÷ */}
            <CalcButton onClick={clear} variant="clear" label="All Clear">
              AC
            </CalcButton>
            <CalcButton onClick={clearEntry} variant="action" label="Clear Entry">
              CE
            </CalcButton>
            <CalcButton onClick={percentage} variant="action" label="Percent">
              <Percent size={18} />
            </CalcButton>
            <CalcButton onClick={() => inputOperator("/")} variant="operator" label="Divide">
              <Divide size={20} />
            </CalcButton>
          </>
        ) : (
          <>
            {/* Row 1: %, CE, AC, backspace */}
            <CalcButton onClick={percentage} variant="action" label="Percent">
              <Percent size={18} />
            </CalcButton>
            <CalcButton onClick={clearEntry} variant="action" label="Clear Entry">
              CE
            </CalcButton>
            <CalcButton onClick={clear} variant="clear" label="All Clear">
              AC
            </CalcButton>
            <CalcButton
              onClick={backspace}
              onLongPress={backspace}
              variant="action"
              label="Backspace"
            >
              <Delete size={20} />
            </CalcButton>

            {/* Row 2: 1/x, x², √, ÷ */}
            <CalcButton
              onClick={() => inputFunction("recip")}
              variant="function"
              label="Reciprocal"
            >
              ¹⁄ₓ
            </CalcButton>
            <CalcButton onClick={() => inputFunction("square")} variant="function" label="Square">
              x²
            </CalcButton>
            <CalcButton
              onClick={() => inputFunction("sqrtOf")}
              variant="function"
              label="Square root"
            >
              √
            </CalcButton>
            <CalcButton onClick={() => inputOperator("/")} variant="operator" label="Divide">
              <Divide size={20} />
            </CalcButton>
          </>
        )}

        {/* Row 2: 7, 8, 9, × */}
        <CalcButton onClick={() => inputDigit("7")} variant="number" label="7">
          7
        </CalcButton>
        <CalcButton onClick={() => inputDigit("8")} variant="number" label="8">
          8
        </CalcButton>
        <CalcButton onClick={() => inputDigit("9")} variant="number" label="9">
          9
        </CalcButton>
        <CalcButton onClick={() => inputOperator("*")} variant="operator" label="Multiply">
          <X size={20} />
        </CalcButton>

        {/* Row 3: 4, 5, 6, − */}
        <CalcButton onClick={() => inputDigit("4")} variant="number" label="4">
          4
        </CalcButton>
        <CalcButton onClick={() => inputDigit("5")} variant="number" label="5">
          5
        </CalcButton>
        <CalcButton onClick={() => inputDigit("6")} variant="number" label="6">
          6
        </CalcButton>
        <CalcButton onClick={() => inputOperator("-")} variant="operator" label="Subtract">
          <Minus size={20} />
        </CalcButton>

        {/* Row 4: 1, 2, 3, + */}
        <CalcButton onClick={() => inputDigit("1")} variant="number" label="1">
          1
        </CalcButton>
        <CalcButton onClick={() => inputDigit("2")} variant="number" label="2">
          2
        </CalcButton>
        <CalcButton onClick={() => inputDigit("3")} variant="number" label="3">
          3
        </CalcButton>
        <CalcButton onClick={() => inputOperator("+")} variant="operator" label="Add">
          <Plus size={20} />
        </CalcButton>

        {/* Row 5: +/−, 0, ., = */}
        <CalcButton onClick={negate} variant="action" label="Negate">
          +/−
        </CalcButton>
        <CalcButton onClick={() => inputDigit("0")} variant="number" label="0">
          0
        </CalcButton>
        <CalcButton onClick={inputDecimal} variant="number" label="Decimal">
          .
        </CalcButton>
        <CalcButton
          onClick={() => calculate(!scientific, scientific ? "scientific" : "standard")}
          variant="equal"
          label="Calculate"
        >
          <Equal size={22} />
        </CalcButton>
      </div>
    </div>
  );
}
