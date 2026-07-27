import { useEffect, useMemo, useRef, useState } from "react";
import { evaluate } from "mathjs";
import {
  cartesianToPolar,
  complexDetails,
  convertSIPrefix,
  evaluateEngineeringExpression,
  engineeringFormat,
  evaluateComplex,
  formatAdvanced,
  formatEngineeringNumber,
  linearRegression,
  matrixOperation,
  normalizeEngineeringExpression,
  parseRequiredNumber,
  polarToCartesian,
  programmerOperation,
  sampleGraph,
  solvePolynomial,
  statistics,
  SI_PREFIXES,
  type CalculatorMode,
  type EngineeringAngleMode,
  type EngineeringAngleRange,
  type GraphSeries,
  type NumericBase,
  type SIPrefix,
  type WordSize,
} from "@/lib/calculator/advanced";
import { useCalculatorStore } from "@/store/calculator-store";
import type { CalculationResult } from "@/lib/calculator/types";

const field =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-white placeholder:text-gray-700 focus:border-accent-cyan/40 focus:outline-none";
const selectField = `${field} [color-scheme:dark]`;
const selectOption = "bg-dark-900 text-gray-100";
const button =
  "rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/[0.08] hover:text-white";
const primary =
  "rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-xs font-semibold text-accent-cyan transition hover:bg-accent-cyan/20";
const toDisplayOps = (value: string) => value.replace(/\*/g, "×").replace(/\//g, "÷");
const toAsciiOps = (value: string) =>
  value.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");

const panel = "rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4";

function Result({ error, children }: { error?: string; children?: React.ReactNode }) {
  return (
    <div className={`${panel} min-h-20 overflow-auto`} aria-live="polite">
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        (children ?? <p className="text-sm text-gray-600">Results appear here.</p>)
      )}
    </div>
  );
}

function EngineeringWorkspace({
  historyItem,
  onHistoryConsumed,
}: {
  historyItem?: CalculationResult | null;
  onHistoryConsumed?: () => void;
}) {
  const addHistoryEntry = useCalculatorStore((state) => state.addHistoryEntry);
  const [expression, setExpression] = useState("1250000 ÷ 3");
  const [figures, setFigures] = useState(6);
  const [exponentShift, setExponentShift] = useState(0);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [prefixValue, setPrefixValue] = useState("1");
  const [fromPrefix, setFromPrefix] = useState<SIPrefix>("k");
  const [toPrefix, setToPrefix] = useState<SIPrefix>("");
  const [unit, setUnit] = useState("m");
  const [siPrecision, setSiPrecision] = useState(10);
  const [prefixResult, setPrefixResult] = useState("");
  const [prefixError, setPrefixError] = useState("");
  const [coordinateType, setCoordinateType] = useState<"cartesian" | "polar">("cartesian");
  const [angleMode, setAngleMode] = useState<EngineeringAngleMode>("deg");
  const [angleRange, setAngleRange] = useState<EngineeringAngleRange>("signed");
  const [outputPrecision, setOutputPrecision] = useState(10);
  const [coordinateA, setCoordinateA] = useState("3");
  const [coordinateB, setCoordinateB] = useState("4");
  const [coordinateResult, setCoordinateResult] = useState("");
  const [coordinateError, setCoordinateError] = useState("");
  const [copied, setCopied] = useState<"notation" | "prefix" | "coordinate" | null>(null);

  useEffect(() => {
    const restored = historyItem?.engineeringState;
    if (!restored) return;
    if (restored.tool === "notation") {
      setExpression(restored.expression);
      setFigures(restored.figures);
      setExponentShift(restored.exponentShift);
      setResult(historyItem.displayResult);
      setError("");
    } else if (restored.tool === "si") {
      setPrefixValue(restored.value);
      setFromPrefix(restored.fromPrefix as SIPrefix);
      setToPrefix(restored.toPrefix as SIPrefix);
      setUnit(restored.unit);
      setSiPrecision(restored.precision);
      setPrefixResult(historyItem.displayResult);
      setPrefixError("");
    } else {
      setCoordinateType(restored.coordinateType);
      setAngleMode(restored.angleMode);
      setAngleRange(restored.angleRange);
      setOutputPrecision(restored.precision);
      setCoordinateA(restored.first);
      setCoordinateB(restored.second);
      setCoordinateResult(historyItem.displayResult);
      setCoordinateError("");
    }
    onHistoryConsumed?.();
  }, [historyItem, onHistoryConsumed]);

  const copy = async (value: string, target: typeof copied) => {
    if (!value || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const calculate = (shift = exponentShift, recordHistory = true) => {
    try {
      const evaluableExpression = evaluateEngineeringExpression(expression);
      const value = Number(evaluate(evaluableExpression));
      if (!Number.isFinite(value)) throw new Error("The result is not finite.");
      const formatted = engineeringFormat(value, figures, shift);
      const display = `${formatted} · ${value.toExponential(figures - 1)}`;
      setResult(display);
      setError("");
      if (recordHistory) {
        addHistoryEntry({
          expression,
          result: value,
          displayResult: display,
          calculatorMode: "engineering",
          engineeringState: {
            tool: "notation",
            expression,
            figures,
            exponentShift: shift,
          },
        });
      }
    } catch (cause) {
      setResult("");
      setError(cause instanceof Error ? cause.message : "Invalid expression.");
    }
  };

  const convertPrefix = () => {
    try {
      const value = parseRequiredNumber(prefixValue, "Value");
      const converted = convertSIPrefix(value, fromPrefix, toPrefix);
      const outputUnit = `${toPrefix}${unit.trim()}`;
      const display = `${formatEngineeringNumber(converted, siPrecision)} ${outputUnit}`.trim();
      setPrefixResult(display);
      setPrefixError("");
      addHistoryEntry({
        expression: `${prefixValue} ${fromPrefix}${unit.trim()} → ${toPrefix}${unit.trim()}`.trim(),
        result: converted,
        displayResult: display,
        calculatorMode: "engineering",
        engineeringState: {
          tool: "si",
          value: prefixValue,
          fromPrefix,
          toPrefix,
          unit,
          precision: siPrecision,
        },
      });
    } catch (cause) {
      setPrefixResult("");
      setPrefixError(cause instanceof Error ? cause.message : "Invalid conversion.");
    }
  };

  const convertCoordinates = () => {
    try {
      const first = parseRequiredNumber(
        coordinateA,
        coordinateType === "cartesian" ? "X" : "Radius",
      );
      const second = parseRequiredNumber(
        coordinateB,
        coordinateType === "cartesian" ? "Y" : "Angle",
      );
      let display: string;
      let historyResult: number;
      let historyExpression: string;
      if (coordinateType === "cartesian") {
        const converted = cartesianToPolar(first, second, angleMode, angleRange);
        display = `r = ${formatEngineeringNumber(converted.radius, outputPrecision)}, θ = ${formatEngineeringNumber(converted.angle, outputPrecision)} ${angleMode.toUpperCase()}`;
        historyResult = converted.radius;
        historyExpression = `Cartesian (${coordinateA}, ${coordinateB}) → Polar`;
      } else {
        const converted = polarToCartesian(first, second, angleMode);
        display = `x = ${formatEngineeringNumber(converted.x, outputPrecision)}, y = ${formatEngineeringNumber(converted.y, outputPrecision)}`;
        historyResult = converted.x;
        historyExpression = `Polar (${coordinateA}, ${coordinateB} ${angleMode.toUpperCase()}) → Cartesian`;
      }
      setCoordinateResult(display);
      setCoordinateError("");
      addHistoryEntry({
        expression: historyExpression,
        result: historyResult,
        displayResult: display,
        calculatorMode: "engineering",
        engineeringState: {
          tool: "coordinate",
          coordinateType,
          angleMode,
          angleRange,
          precision: outputPrecision,
          first: coordinateA,
          second: coordinateB,
        },
      });
    } catch (cause) {
      setCoordinateResult("");
      setCoordinateError(cause instanceof Error ? cause.message : "Invalid coordinates.");
    }
  };

  const changeCoordinateType = (type: "cartesian" | "polar") => {
    setCoordinateType(type);
    setCoordinateA(type === "cartesian" ? "3" : "5");
    setCoordinateB(type === "cartesian" ? "4" : "53.130102");
    setCoordinateResult("");
    setCoordinateError("");
  };

  const shiftExponent = (delta: number) => {
    const nextShift = Math.max(-8, Math.min(8, exponentShift + delta));
    setExponentShift(nextShift);
    calculate(nextShift, false);
  };

  const resetNotation = () => {
    setExpression("1250000 ÷ 3");
    setFigures(6);
    setExponentShift(0);
    setResult("");
    setError("");
  };

  const resetPrefix = () => {
    setPrefixValue("1");
    setFromPrefix("k");
    setToPrefix("");
    setUnit("m");
    setSiPrecision(10);
    setPrefixResult("");
    setPrefixError("");
  };

  const resetCoordinates = () => {
    setCoordinateType("cartesian");
    setAngleMode("deg");
    setAngleRange("signed");
    setOutputPrecision(10);
    setCoordinateA("3");
    setCoordinateB("4");
    setCoordinateResult("");
    setCoordinateError("");
  };

  const angleRangeLabels =
    angleMode === "deg"
      ? { signed: "−180° to 180°", positive: "0° to 360°" }
      : angleMode === "grad"
        ? { signed: "−200 to 200", positive: "0 to 400" }
        : { signed: "−π to π", positive: "0 to 2π" };

  return (
    <Workspace
      title="Engineering"
      subtitle="Engineering notation, SI-prefix conversion and coordinate conversion"
    >
      <section className={panel}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-gray-300">Engineering notation</h3>
          <button className={button} onClick={resetNotation}>
            Reset
          </button>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_150px]">
          <input
            className={field}
            value={expression}
            onChange={(event) => setExpression(normalizeEngineeringExpression(event.target.value))}
            onInput={() => {
              setExponentShift(0);
              setResult("");
              setError("");
            }}
            onKeyDown={(event) => event.key === "Enter" && calculate()}
            aria-label="Engineering expression"
            placeholder="Example: 1250000 ÷ 3"
          />
          <label className="text-[10px] text-gray-500">
            Significant figures
            <input
              className={`${field} mt-1`}
              type="number"
              min={2}
              max={12}
              step={1}
              value={figures}
              onChange={(event) => setFigures(Number(event.target.value))}
              onKeyDown={(event) => event.key === "Enter" && calculate()}
            />
          </label>
        </div>
        <p className="mt-2 text-[10px] text-gray-600">
          Keyboard * and / are accepted and displayed as × and ÷.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={primary} onClick={() => calculate()}>
            Calculate
          </button>
          <button className={button} onClick={() => shiftExponent(-1)} disabled={!result}>
            ENG −3
          </button>
          <button className={button} onClick={() => shiftExponent(1)} disabled={!result}>
            ENG +3
          </button>
          <span className="self-center text-[10px] text-gray-600">Shift: {exponentShift * 3}</span>
        </div>
        <div className="mt-3">
          <Result error={error}>
            {result && (
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-lg text-white">{result}</p>
                <button className={button} onClick={() => void copy(result, "notation")}>
                  {copied === "notation" ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </Result>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className={panel}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-gray-300">SI-prefix converter</h3>
            <button className={button} onClick={resetPrefix}>
              Reset
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] text-gray-500">
              Value
              <input
                className={`${field} mt-1`}
                type="number"
                value={prefixValue}
                onChange={(event) => setPrefixValue(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && convertPrefix()}
                aria-label="SI value"
              />
            </label>
            <label className="text-[10px] text-gray-500">
              Unit (optional)
              <input
                className={`${field} mt-1`}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && convertPrefix()}
                placeholder="m, V, Pa..."
                aria-label="SI unit"
              />
            </label>
            <label className="text-[10px] text-gray-500">
              Output precision
              <input
                className={`${field} mt-1`}
                type="number"
                min={2}
                max={12}
                step={1}
                value={siPrecision}
                onChange={(event) => setSiPrecision(Number(event.target.value))}
                onKeyDown={(event) => event.key === "Enter" && convertPrefix()}
                aria-label="SI output precision"
              />
            </label>
            <label className="text-[10px] text-gray-500">
              From
              <select
                className={`${selectField} mt-1`}
                value={fromPrefix}
                onChange={(event) => setFromPrefix(event.target.value as SIPrefix)}
                aria-label="From SI prefix"
              >
                {SI_PREFIXES.map((prefix) => (
                  <option
                    key={`from-${prefix.name}`}
                    value={prefix.symbol}
                    className={selectOption}
                  >
                    {prefix.name} {prefix.symbol && `(${prefix.symbol})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] text-gray-500">
              To
              <select
                className={`${selectField} mt-1`}
                value={toPrefix}
                onChange={(event) => setToPrefix(event.target.value as SIPrefix)}
                aria-label="To SI prefix"
              >
                {SI_PREFIXES.map((prefix) => (
                  <option key={`to-${prefix.name}`} value={prefix.symbol} className={selectOption}>
                    {prefix.name} {prefix.symbol && `(${prefix.symbol})`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={primary} onClick={convertPrefix}>
              Convert prefix
            </button>
            <button
              className={button}
              onClick={() => {
                setFromPrefix(toPrefix);
                setToPrefix(fromPrefix);
                setPrefixResult("");
                setPrefixError("");
              }}
            >
              Swap prefixes
            </button>
          </div>
          <div className="mt-3">
            <Result error={prefixError}>
              {prefixResult && (
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-lg text-white">{prefixResult}</p>
                  <button className={button} onClick={() => void copy(prefixResult, "prefix")}>
                    {copied === "prefix" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </Result>
          </div>
        </section>

        <section className={panel}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-gray-300">Coordinate converter</h3>
            <button className={button} onClick={resetCoordinates}>
              Reset
            </button>
          </div>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="flex gap-1" role="group" aria-label="Angle mode">
              {(["deg", "rad", "grad"] as const).map((mode) => (
                <button
                  key={mode}
                  className={angleMode === mode ? primary : button}
                  onClick={() => setAngleMode(mode)}
                  aria-pressed={angleMode === mode}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="min-w-24 text-[10px] text-gray-500">
              Output precision
              <input
                className={`${field} mt-1`}
                type="number"
                min={2}
                max={12}
                step={1}
                value={outputPrecision}
                onChange={(event) => setOutputPrecision(Number(event.target.value))}
                aria-label="Coordinate output precision"
              />
            </label>
          </div>
          <div
            className="mb-3 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Coordinate direction"
          >
            <button
              className={coordinateType === "cartesian" ? primary : button}
              onClick={() => changeCoordinateType("cartesian")}
              aria-pressed={coordinateType === "cartesian"}
            >
              Cartesian → Polar
            </button>
            <button
              className={coordinateType === "polar" ? primary : button}
              onClick={() => changeCoordinateType("polar")}
              aria-pressed={coordinateType === "polar"}
            >
              Polar → Cartesian
            </button>
          </div>
          {coordinateType === "cartesian" && (
            <div className="mb-3 grid grid-cols-2 gap-2" role="group" aria-label="Angle range">
              <button
                className={angleRange === "signed" ? primary : button}
                onClick={() => setAngleRange("signed")}
                aria-pressed={angleRange === "signed"}
              >
                {angleRangeLabels.signed}
              </button>
              <button
                className={angleRange === "positive" ? primary : button}
                onClick={() => setAngleRange("positive")}
                aria-pressed={angleRange === "positive"}
              >
                {angleRangeLabels.positive}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[10px] text-gray-500">
              {coordinateType === "cartesian" ? "X" : "Radius"}
              <input
                className={`${field} mt-1`}
                type="number"
                value={coordinateA}
                onChange={(event) => setCoordinateA(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && convertCoordinates()}
                aria-label={coordinateType === "cartesian" ? "X coordinate" : "Radius"}
              />
            </label>
            <label className="text-[10px] text-gray-500">
              {coordinateType === "cartesian" ? "Y" : `Angle (${angleMode.toUpperCase()})`}
              <input
                className={`${field} mt-1`}
                type="number"
                value={coordinateB}
                onChange={(event) => setCoordinateB(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && convertCoordinates()}
                aria-label={coordinateType === "cartesian" ? "Y coordinate" : "Angle"}
              />
            </label>
          </div>
          <button className={`${primary} mt-3 w-full sm:w-auto`} onClick={convertCoordinates}>
            Convert coordinates
          </button>
          <div className="mt-3">
            <Result error={coordinateError}>
              {coordinateResult && (
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-base text-white">{coordinateResult}</p>
                  <button
                    className={button}
                    onClick={() => void copy(coordinateResult, "coordinate")}
                  >
                    {copied === "coordinate" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </Result>
          </div>
        </section>
      </div>
    </Workspace>
  );
}

function StatisticsWorkspace() {
  const [data, setData] = useState("12, 18, 15, 20, 18, 22, 17");
  const [pairs, setPairs] = useState("1,2; 2,4.1; 3,5.9; 4,8.2");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const describe = () => {
    try {
      const values = data
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map(Number);
      setResult(statistics(values));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid dataset.");
    }
  };
  const regress = () => {
    try {
      // Drop blank segments so a trailing semicolon — which the placeholder
      // invites — does not turn into an empty pair.
      const parsed = pairs
        .split(";")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const [x, y] = pair.split(",").map(Number);
          return { x, y };
        });
      setResult(linearRegression(parsed));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid x,y pairs.");
    }
  };
  return (
    <Workspace title="Statistics" subtitle="Descriptive statistics and linear regression">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={panel}>
          <label className="text-xs text-gray-400">Dataset</label>
          <textarea
            className={`${field} mt-2 min-h-24`}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
          <button className={`${primary} mt-2`} onClick={describe}>
            Analyze data
          </button>
        </div>
        <div className={panel}>
          <label className="text-xs text-gray-400">Regression pairs (x,y; x,y)</label>
          <textarea
            className={`${field} mt-2 min-h-24`}
            value={pairs}
            onChange={(e) => setPairs(e.target.value)}
          />
          <button className={`${primary} mt-2`} onClick={regress}>
            Run regression
          </button>
        </div>
      </div>
      <Result error={error}>
        {result && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {Object.entries(result).map(([key, value]) => (
              <div key={key}>
                <dt className="text-[10px] capitalize text-gray-600">
                  {key.replace(/([A-Z])/g, " $1")}
                </dt>
                <dd className="font-mono text-sm text-white">{formatAdvanced(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Result>
    </Workspace>
  );
}

function ComplexWorkspace() {
  const [expression, setExpression] = useState("(3 + 4i) × (2 − i)");
  const [real, setReal] = useState(3);
  const [imaginary, setImaginary] = useState(4);
  const [result, setResult] = useState<Record<string, unknown> | string>("");
  const [error, setError] = useState("");
  const run = () => {
    try {
      setResult(evaluateComplex(toAsciiOps(expression)));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid complex expression.");
    }
  };
  const details = () => {
    try {
      setResult(complexDetails(real, imaginary));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid complex value.");
    }
  };
  return (
    <Workspace title="Complex" subtitle="Rectangular and polar complex-number calculations">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={panel}>
          <label className="text-xs text-gray-400">Expression using i</label>
          <input
            className={`${field} mt-2`}
            value={expression}
            onChange={(e) => setExpression(toDisplayOps(e.target.value))}
          />
          <button className={`${primary} mt-2`} onClick={run}>
            Evaluate
          </button>
        </div>
        <div className={panel}>
          <label className="text-xs text-gray-400">Inspect a + bi</label>
          <div className="mt-2 flex gap-2">
            <input
              className={field}
              type="number"
              value={real}
              onChange={(e) => setReal(Number(e.target.value))}
              aria-label="Real part"
            />
            <input
              className={field}
              type="number"
              value={imaginary}
              onChange={(e) => setImaginary(Number(e.target.value))}
              aria-label="Imaginary part"
            />
          </div>
          <button className={`${primary} mt-2`} onClick={details}>
            Convert & inspect
          </button>
        </div>
      </div>
      <Result error={error}>
        {typeof result === "string" ? (
          <p className="font-mono text-lg text-white">{result}</p>
        ) : (
          result && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(result).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[10px] capitalize text-gray-600">
                    {key.replace(/([A-Z])/g, " $1")}
                  </dt>
                  <dd className="font-mono text-sm text-white">{formatAdvanced(value)}</dd>
                </div>
              ))}
            </dl>
          )
        )}
      </Result>
    </Workspace>
  );
}

function ProgrammerWorkspace() {
  const [left, setLeft] = useState("FF");
  const [right, setRight] = useState("1");
  const [operation, setOperation] = useState("AND");
  const [base, setBase] = useState<NumericBase>(16);
  const [wordSize, setWordSize] = useState<WordSize>(32);
  const [signed, setSigned] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const run = () => {
    try {
      setResult(programmerOperation(left, right, operation, base, wordSize, signed));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid programmer input.");
    }
  };
  return (
    <Workspace
      title="Programmer"
      subtitle="Base conversion, fixed word sizes and bitwise operations"
    >
      <div className={`${panel} grid gap-2 sm:grid-cols-2 lg:grid-cols-6`}>
        <input
          className={field}
          value={left}
          onChange={(e) => setLeft(e.target.value.toUpperCase())}
          aria-label="Left value"
        />
        <select
          aria-label="Programmer operation"
          className={field}
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
        >
          {["AND", "OR", "XOR", "NOT", "SHL", "SHR", "ROL", "ROR", "+", "−", "×", "÷"].map((op) => (
            <option key={op} className="bg-dark-900">
              {op}
            </option>
          ))}
        </select>
        <input
          className={field}
          value={right}
          onChange={(e) => setRight(e.target.value.toUpperCase())}
          aria-label="Right value"
        />
        <select
          aria-label="Number base"
          className={field}
          value={base}
          onChange={(e) => setBase(Number(e.target.value) as NumericBase)}
        >
          {[2, 8, 10, 16].map((b) => (
            <option key={b} value={b} className="bg-dark-900">
              Base {b}
            </option>
          ))}
        </select>
        <select
          aria-label="Word size"
          className={field}
          value={wordSize}
          onChange={(e) => setWordSize(Number(e.target.value) as WordSize)}
        >
          {[8, 16, 32, 64].map((bits) => (
            <option key={bits} value={bits} className="bg-dark-900">
              {bits}-bit
            </option>
          ))}
        </select>
        <button className={primary} onClick={run}>
          Calculate
        </button>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />{" "}
          Signed
        </label>
      </div>
      <Result error={error}>
        {result && (
          <dl className="space-y-2">
            {Object.entries(result).map(([key, value]) => (
              <div className="grid grid-cols-[90px_1fr] gap-3" key={key}>
                <dt className="text-xs capitalize text-gray-600">{key}</dt>
                <dd className="break-all font-mono text-sm text-white">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Result>
    </Workspace>
  );
}

function MatrixWorkspace() {
  const [a, setA] = useState("1 2; 3 4");
  const [b, setB] = useState("5 6; 7 8");
  const [operation, setOperation] = useState("multiply");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const run = () => {
    try {
      setResult(matrixOperation(a, operation, b));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid matrix operation.");
    }
  };
  return (
    <Workspace title="Matrix" subtitle="Matrices up to 10 × 10; separate rows with semicolons">
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="text-xs text-gray-400">
          Matrix A
          <textarea
            className={`${field} mt-2 min-h-28 font-mono`}
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
        </label>
        <label className="text-xs text-gray-400">
          Matrix B / solution vector
          <textarea
            className={`${field} mt-2 min-h-28 font-mono`}
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          "add",
          "subtract",
          "multiply",
          "transpose",
          "determinant",
          "inverse",
          "trace",
          "rank",
          "rref",
          "solve",
        ].map((op) => (
          <button
            key={op}
            onClick={() => setOperation(op)}
            className={operation === op ? primary : button}
          >
            {op}
          </button>
        ))}
        <button className={primary} onClick={run}>
          Run
        </button>
      </div>
      <Result error={error}>
        {result !== null && (
          <pre className="whitespace-pre-wrap font-mono text-sm text-white">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </Result>
    </Workspace>
  );
}

function EquationWorkspace() {
  const [coefficients, setCoefficients] = useState("1, -6, 11, -6");
  const [matrixA, setMatrixA] = useState("2 1; 1 -1");
  const [vectorB, setVectorB] = useState("5; 1");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const polynomial = () => {
    try {
      setResult(
        solvePolynomial(
          coefficients
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number),
        ),
      );
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid coefficients.");
    }
  };
  const system = () => {
    try {
      setResult(matrixOperation(matrixA, "solve", vectorB));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid system.");
    }
  };
  return (
    <Workspace title="Equation" subtitle="Linear, quadratic, cubic and simultaneous equations">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={panel}>
          <label className="text-xs text-gray-400">
            Polynomial coefficients (highest degree first)
          </label>
          <input
            className={`${field} mt-2`}
            value={coefficients}
            onChange={(e) => setCoefficients(e.target.value)}
          />
          <button className={`${primary} mt-2`} onClick={polynomial}>
            Solve polynomial
          </button>
        </div>
        <div className={panel}>
          <label className="text-xs text-gray-400">System A and vector b</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <textarea
              className={`${field} min-h-20 font-mono`}
              value={matrixA}
              onChange={(e) => setMatrixA(e.target.value)}
            />
            <textarea
              className={`${field} min-h-20 font-mono`}
              value={vectorB}
              onChange={(e) => setVectorB(e.target.value)}
            />
          </div>
          <button className={`${primary} mt-2`} onClick={system}>
            Solve system
          </button>
        </div>
      </div>
      <Result error={error}>
        {result !== null && (
          <pre className="whitespace-pre-wrap font-mono text-sm text-white">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </Result>
    </Workspace>
  );
}

const colors = ["#22d3ee", "#a78bfa", "#f59e0b", "#34d399", "#fb7185", "#60a5fa"];

function GraphingWorkspace() {
  const [expressions, setExpressions] = useState(["sin(x)", "0.2×x^2−2"]);
  const [enabled, setEnabled] = useState([true, true]);
  const [seriesColors, setSeriesColors] = useState(colors);
  const [range, setRange] = useState({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
  const [trace, setTrace] = useState({ x: 0, y: 0 });
  const graphResult = useMemo(() => {
    try {
      return {
        series: expressions
          .map((expression, sourceIndex) => ({ expression, sourceIndex }))
          .filter(
            ({ expression, sourceIndex }) => Boolean(expression) && enabled[sourceIndex] !== false,
          )
          .slice(0, 6)
          .map(({ expression, sourceIndex }) => ({
            ...sampleGraph(toAsciiOps(expression), range.xMin, range.xMax),
            sourceIndex,
          })),
        error: "",
      };
    } catch (cause) {
      return {
        series: [] as Array<GraphSeries & { sourceIndex: number }>,
        error: cause instanceof Error ? cause.message : "Unable to graph expression.",
      };
    }
  }, [enabled, expressions, range.xMin, range.xMax]);
  const { series, error } = graphResult;
  const dragRef = useRef<{ clientX: number; clientY: number; range: typeof range } | null>(null);
  const width = 900,
    height = 420;
  const sx = (x: number) => ((x - range.xMin) / (range.xMax - range.xMin)) * width;
  const sy = (y: number) => height - ((y - range.yMin) / (range.yMax - range.yMin)) * height;
  const pathFor = (item: GraphSeries) => {
    let drawing = false;
    return item.points
      .map((point) => {
        if (!point || point.y < range.yMin * 5 || point.y > range.yMax * 5) {
          drawing = false;
          return "";
        }
        const command = drawing ? "L" : "M";
        drawing = true;
        return `${command}${sx(point.x)},${sy(point.y)}`;
      })
      .join(" ");
  };
  const intersections = useMemo(() => {
    if (series.length < 2) return [];
    const a = series[0].points.filter((point): point is { x: number; y: number } => !!point);
    const b = series[1].points.filter((point): point is { x: number; y: number } => !!point);
    const found: Array<{ x: number; y: number }> = [];
    for (let i = 1; i < Math.min(a.length, b.length); i++) {
      const previous = a[i - 1].y - b[i - 1].y;
      const current = a[i].y - b[i].y;
      if (Math.sign(previous) !== Math.sign(current))
        found.push({ x: a[i].x, y: (a[i].y + b[i].y) / 2 });
    }
    return found.slice(0, 12);
  }, [series]);
  const zoom = (factor: number) =>
    setRange((r) => {
      const cx = (r.xMin + r.xMax) / 2,
        cy = (r.yMin + r.yMax) / 2;
      const hx = ((r.xMax - r.xMin) * factor) / 2,
        hy = ((r.yMax - r.yMin) * factor) / 2;
      return { xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy };
    });
  const pan = (xFactor: number, yFactor: number) =>
    setRange((current) => {
      const dx = (current.xMax - current.xMin) * xFactor;
      const dy = (current.yMax - current.yMin) * yFactor;
      return {
        xMin: current.xMin + dx,
        xMax: current.xMax + dx,
        yMin: current.yMin + dy,
        yMax: current.yMax + dy,
      };
    });
  return (
    <Workspace title="Graphing" subtitle="Up to six interactive 2D functions">
      <div className="grid gap-3 xl:grid-cols-[250px_1fr]">
        <div className="space-y-2">
          {Array.from({ length: Math.max(2, expressions.length) }).map((_, index) => (
            <div key={index} className="flex gap-2">
              <input
                aria-label={`Function ${index + 1} color`}
                type="color"
                className="mt-1 h-8 w-8 shrink-0 rounded border-0 bg-transparent"
                value={seriesColors[index]}
                onChange={(e) =>
                  setSeriesColors((current) => {
                    const next = [...current];
                    next[index] = e.target.value;
                    return next;
                  })
                }
              />
              <input
                aria-label={`Show function ${index + 1}`}
                type="checkbox"
                checked={enabled[index] !== false}
                onChange={(e) =>
                  setEnabled((current) => {
                    const next = [...current];
                    next[index] = e.target.checked;
                    return next;
                  })
                }
              />
              <input
                className={field}
                value={expressions[index] ?? ""}
                placeholder={`f${index + 1}(x)`}
                onChange={(e) =>
                  setExpressions((current) => {
                    const next = [...current];
                    next[index] = toDisplayOps(e.target.value);

                    return next;
                  })
                }
              />
              {expressions.length > 1 && (
                <button
                  className={button}
                  aria-label={`Remove function ${index + 1}`}
                  onClick={() => {
                    setExpressions((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    );
                    setEnabled((current) => current.filter((_, itemIndex) => itemIndex !== index));
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {expressions.length < 6 && (
            <button
              className={button}
              onClick={() => {
                setExpressions((current) => [...current, ""]);
                setEnabled((current) => [...current, true]);
              }}
            >
              + Add function
            </button>
          )}
          <p className="text-[10px] text-gray-600">
            Polar: <code>polar:2×sin(3×t)</code>
            <br />
            Parametric: <code>param:cos(t);sin(t)</code>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(range).map(([key, value]) => (
              <label key={key} className="text-[10px] text-gray-600">
                {key}
                <input
                  className={`${field} mt-1`}
                  type="number"
                  value={value}
                  onChange={(e) => setRange((r) => ({ ...r, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => zoom(0.7)}>
              Zoom in
            </button>
            <button className={button} onClick={() => zoom(1.4)}>
              Zoom out
            </button>
            <button
              className={button}
              onClick={() => setRange({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 })}
            >
              Reset
            </button>
            <button className={button} onClick={() => pan(-0.2, 0)} aria-label="Pan graph left">
              ←
            </button>
            <button className={button} onClick={() => pan(0.2, 0)} aria-label="Pan graph right">
              →
            </button>
            <button className={button} onClick={() => pan(0, 0.2)} aria-label="Pan graph up">
              ↑
            </button>
            <button className={button} onClick={() => pan(0, -0.2)} aria-label="Pan graph down">
              ↓
            </button>
          </div>
        </div>
        <div className={`${panel} relative overflow-hidden p-0`}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block w-full touch-none"
            role="img"
            aria-label="Interactive function graph"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                range: { ...range },
              };
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (dragRef.current) {
                const start = dragRef.current;
                const dx =
                  ((e.clientX - start.clientX) / rect.width) *
                  (start.range.xMax - start.range.xMin);
                const dy =
                  ((e.clientY - start.clientY) / rect.height) *
                  (start.range.yMax - start.range.yMin);
                setRange({
                  xMin: start.range.xMin - dx,
                  xMax: start.range.xMax - dx,
                  yMin: start.range.yMin + dy,
                  yMax: start.range.yMax + dy,
                });
                return;
              }
              const x =
                range.xMin + ((e.clientX - rect.left) / rect.width) * (range.xMax - range.xMin);
              const first = series[0]?.points
                .filter((p): p is { x: number; y: number } => !!p)
                .reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), {
                  x,
                  y: 0,
                });
              setTrace(first ?? { x, y: 0 });
            }}
          >
            <rect width={width} height={height} fill="#05070b" />
            {Array.from({ length: 11 }).map((_, i) => (
              <g key={i}>
                <line
                  x1={(i * width) / 10}
                  x2={(i * width) / 10}
                  y1={0}
                  y2={height}
                  stroke="#ffffff12"
                />
                <line
                  x1={0}
                  x2={width}
                  y1={(i * height) / 10}
                  y2={(i * height) / 10}
                  stroke="#ffffff12"
                />
              </g>
            ))}
            {range.xMin <= 0 && range.xMax >= 0 && (
              <line x1={sx(0)} x2={sx(0)} y1={0} y2={height} stroke="#ffffff55" />
            )}
            {range.yMin <= 0 && range.yMax >= 0 && (
              <line x1={0} x2={width} y1={sy(0)} y2={sy(0)} stroke="#ffffff55" />
            )}
            {series.map((item) => (
              <path
                key={item.expression}
                d={pathFor(item)}
                fill="none"
                stroke={seriesColors[item.sourceIndex]}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1={sx(trace.x)}
              x2={sx(trace.x)}
              y1={0}
              y2={height}
              stroke="#ffffff40"
              strokeDasharray="4 4"
            />
            <circle cx={sx(trace.x)} cy={sy(trace.y)} r="5" fill="#fff" />
          </svg>
          <div className="absolute left-3 top-3 rounded-lg bg-black/60 px-2 py-1 font-mono text-[10px] text-gray-300">
            x {trace.x.toFixed(4)} · y {trace.y.toFixed(4)}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {intersections.length > 0 && (
        <div className={panel}>
          <p className="text-[10px] text-gray-500">Intersections of first two functions</p>
          <p className="mt-1 font-mono text-xs text-white">
            {intersections
              .map((point) => `(${point.x.toFixed(3)}, ${point.y.toFixed(3)})`)
              .join(" · ")}
          </p>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {series.map((item) => (
          <div key={item.expression} className={panel}>
            <p className="font-mono text-xs" style={{ color: seriesColors[item.sourceIndex] }}>
              {item.expression}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              Roots:{" "}
              {item.roots.length
                ? item.roots.map((p) => p.x.toFixed(4)).join(", ")
                : "none in view"}
            </p>
            <p className="text-[10px] text-gray-500">
              Extrema:{" "}
              {item.extrema.length
                ? item.extrema
                    .map((p) => `${p.kind} (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`)
                    .join(", ")
                : "none in view"}
            </p>
          </div>
        ))}
      </div>
      {series[0] && (
        <div className={`${panel} overflow-x-auto`}>
          <table className="w-full text-left text-xs">
            <thead className="text-gray-600">
              <tr>
                <th className="pb-2">x</th>
                <th className="pb-2">y</th>
              </tr>
            </thead>
            <tbody className="font-mono text-gray-300">
              {series[0].points
                .filter((point): point is { x: number; y: number } => !!point)
                .filter(
                  (_, index, values) => index % Math.max(1, Math.floor(values.length / 8)) === 0,
                )
                .slice(0, 9)
                .map((point) => (
                  <tr key={point.x}>
                    <td className="py-1">{point.x.toFixed(4)}</td>
                    <td className="py-1">{point.y.toFixed(4)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </Workspace>
  );
}

function Workspace({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto px-3 pb-4 sm:px-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-[10px] text-gray-600">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function AdvancedWorkspace({
  mode,
  historyItem,
  onHistoryConsumed,
}: {
  mode: Exclude<CalculatorMode, "standard" | "scientific">;
  historyItem?: CalculationResult | null;
  onHistoryConsumed?: () => void;
}) {
  switch (mode) {
    case "engineering":
      return (
        <EngineeringWorkspace historyItem={historyItem} onHistoryConsumed={onHistoryConsumed} />
      );
    case "statistics":
      return <StatisticsWorkspace />;
    case "complex":
      return <ComplexWorkspace />;
    case "programmer":
      return <ProgrammerWorkspace />;
    case "matrix":
      return <MatrixWorkspace />;
    case "equation":
      return <EquationWorkspace />;
    case "graphing":
      return <GraphingWorkspace />;
  }
}
