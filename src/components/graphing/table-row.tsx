import React, { useMemo } from "react";
import { Plus, Trash2, TrendingUp, ScatterChart, ClipboardPaste } from "lucide-react";
import type { TableItem } from "@/lib/graphing/types";
import { fitRegression } from "@/lib/graphing/engine/regression";

interface TableRowProps {
  item: TableItem;
  onChange: (updates: Partial<TableItem>) => void;
  onDelete: () => void;
}

export function TableRow({ item, onChange, onDelete }: TableRowProps) {
  const [showRegression, setShowRegression] = React.useState(true);

  // Compute live regression result
  const regressionResult = useMemo(() => {
    if (!item.regressionModel || item.regressionModel === "none") return null;
    const validPoints = item.rows
      .filter((r) => r.x !== null && r.y !== null)
      .map((r) => ({ x: r.x!, y: r.y! }));

    if (validPoints.length < 2) return null;

    try {
      return fitRegression(validPoints, item.regressionModel, item.polynomialDegree || 2);
    } catch {
      return null;
    }
  }, [item.rows, item.regressionModel, item.polynomialDegree]);

  const updateCell = (index: number, key: "x" | "y", value: string) => {
    const nextRows = [...item.rows];
    const num = value.trim() === "" ? null : parseFloat(value);
    nextRows[index] = { ...nextRows[index], [key]: Number.isFinite(num) ? num : null };
    onChange({ rows: nextRows });
  };

  const addRow = () => {
    onChange({ rows: [...item.rows, { x: null, y: null }] });
  };

  const removeRow = (index: number) => {
    if (item.rows.length <= 1) return;
    onChange({ rows: item.rows.filter((_, i) => i !== index) });
  };

  const handlePasteCSV = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const lines = text.trim().split(/\r?\n/);
    const newRows: { x: number | null; y: number | null }[] = [];

    for (const line of lines) {
      const parts = line.split(/[,\t\s]+/).filter(Boolean);
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          newRows.push({ x, y });
        }
      }
    }

    if (newRows.length > 0) {
      e.preventDefault();
      onChange({ rows: newRows });
    }
  };

  return (
    <div
      onPaste={handlePasteCSV}
      className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3 text-white transition hover:border-white/[0.15]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <ScatterChart size={15} className="text-accent-cyan" />
          <span className="text-xs font-semibold text-white">Data Table</span>
          <span className="text-[10px] text-gray-500">({item.rows.length} rows)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange({ joinPoints: !item.joinPoints })}
            className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition ${
              item.joinPoints
                ? "border-accent-cyan/40 bg-accent-cyan/20 text-accent-cyan"
                : "border-white/10 bg-white/5 text-gray-400"
            }`}
          >
            {item.joinPoints ? "Lines On" : "Points Only"}
          </button>

          <button
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-500 hover:text-accent-red"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Grid of X and Y */}
      <div className="mt-2.5 max-h-48 overflow-y-auto pr-1">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-gray-500">
              <th className="w-8 pb-1">#</th>
              <th className="pb-1">x₁</th>
              <th className="pb-1">y₁</th>
              <th className="w-6 pb-1"></th>
            </tr>
          </thead>
          <tbody>
            {item.rows.map((row, idx) => (
              <tr key={idx} className="border-b border-white/[0.03]">
                <td className="py-1 text-[10px] text-gray-600">{idx + 1}</td>
                <td className="py-1 pr-1">
                  <input
                    type="number"
                    value={row.x !== null ? row.x : ""}
                    onChange={(e) => updateCell(idx, "x", e.target.value)}
                    placeholder="x"
                    className="w-full rounded-md border border-white/[0.06] bg-dark-800 px-2 py-1 text-xs text-white placeholder:text-gray-700 focus:border-accent-cyan/40 focus:outline-none"
                  />
                </td>
                <td className="py-1 pl-1">
                  <input
                    type="number"
                    value={row.y !== null ? row.y : ""}
                    onChange={(e) => updateCell(idx, "y", e.target.value)}
                    placeholder="y"
                    className="w-full rounded-md border border-white/[0.06] bg-dark-800 px-2 py-1 text-xs text-white placeholder:text-gray-700 focus:border-accent-cyan/40 focus:outline-none"
                  />
                </td>
                <td className="py-1 pl-1 text-right">
                  <button
                    onClick={() => removeRow(idx)}
                    className="text-gray-600 hover:text-accent-red"
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-[11px] font-semibold text-accent-cyan hover:underline"
        >
          <Plus size={12} /> Add Point
        </button>

        <span className="text-[10px] text-gray-500">Paste CSV supported</span>
      </div>

      {/* Regression Section */}
      <div className="mt-3 border-t border-white/[0.06] pt-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-gray-500">
            Regression Model
          </label>
          <select
            value={item.regressionModel || "none"}
            onChange={(e) =>
              onChange({
                regressionModel: e.target.value as TableItem["regressionModel"],
                showRegressionLine: e.target.value !== "none",
              })
            }
            className="rounded-lg border border-white/10 bg-dark-800 px-2 py-1 text-xs font-mono text-white [color-scheme:dark]"
          >
            <option value="none">None</option>
            <option value="linear">Linear (y ~ mx + b)</option>
            <option value="quadratic">Quadratic (y ~ ax² + bx + c)</option>
            <option value="exponential">Exponential (y ~ a·e^bx)</option>
            <option value="logarithmic">Logarithmic (y ~ a·ln x + b)</option>
            <option value="power">Power (y ~ a·x^b)</option>
          </select>
        </div>

        {regressionResult && (
          <div className="mt-2 rounded-lg bg-accent-cyan/10 p-2.5 font-mono text-xs text-accent-cyan">
            <div className="font-bold">{regressionResult.equation}</div>
            <div className="mt-1 flex gap-3 text-[11px] text-gray-300">
              <span>
                R² = <strong className="text-white">{regressionResult.r2.toFixed(4)}</strong>
              </span>
              <span>
                RMSE = <strong className="text-white">{regressionResult.rmse.toFixed(4)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
