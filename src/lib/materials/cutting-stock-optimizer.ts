/**
 * 1D Cutting Stock Optimizer (Bin Packing Algorithm)
 * Minimizes scrap waste and determines optimal cutting layout for bar stock, pipes,
 * structural tubing, beams, and linear stock.
 */

export interface CutItem {
  id: string;
  length: number;
  quantity: number;
  label?: string;
}

export interface StockBar {
  id: string;
  length: number;
  cost?: number;
  availableQuantity?: number; // Infinite if undefined
}

export interface CutPlacement {
  itemId: string;
  length: number;
  label?: string;
  startPosition: number;
  endPosition: number;
}

export interface StockResultBar {
  barIndex: number;
  stockLength: number;
  usedLength: number;
  wasteLength: number;
  cuts: CutPlacement[];
  efficiencyPct: number;
}

export interface OptimizationResult {
  totalBarsNeeded: number;
  totalStockLength: number;
  totalCutLength: number;
  totalWasteLength: number;
  totalKerfLoss: number;
  overallEfficiencyPct: number;
  bars: StockResultBar[];
  unplacedItems: CutItem[];
}

export interface OptimizerOptions {
  kerfWidth?: number; // Saw blade thickness (e.g. 3mm or 0.125 in)
  trimCut?: number; // End trim cleanup cut on each raw bar
  strategy?: "first-fit-decreasing" | "best-fit-decreasing";
}

/**
 * Optimize linear cutting stock using Best-Fit Decreasing / First-Fit Decreasing algorithm
 */
export function optimizeCuttingStock(
  items: CutItem[],
  stockBarLength: number,
  options: OptimizerOptions = {}
): OptimizationResult {
  const kerf = Math.max(0, options.kerfWidth ?? 3);
  const trim = Math.max(0, options.trimCut ?? 0);
  const effectiveStockLength = stockBarLength - trim * 2;

  if (effectiveStockLength <= 0) {
    return {
      totalBarsNeeded: 0,
      totalStockLength: 0,
      totalCutLength: 0,
      totalWasteLength: 0,
      totalKerfLoss: 0,
      overallEfficiencyPct: 0,
      bars: [],
      unplacedItems: items,
    };
  }

  // Flatten all individual cut pieces
  const flatPieces: { id: string; length: number; label?: string }[] = [];
  const unplacedItems: CutItem[] = [];

  for (const it of items) {
    if (it.length > effectiveStockLength) {
      unplacedItems.push(it);
      continue;
    }
    for (let q = 0; q < it.quantity; q++) {
      flatPieces.push({
        id: `${it.id}-${q + 1}`,
        length: it.length,
        label: it.label || `${it.length} mm`,
      });
    }
  }

  // Sort descending by length (Decreasing heuristic)
  flatPieces.sort((a, b) => b.length - a.length);

  interface ActiveBar {
    cuts: CutPlacement[];
    currentPos: number;
    remainingSpace: number;
  }

  const activeBars: ActiveBar[] = [];

  for (const piece of flatPieces) {
    let placed = false;
    const neededSpace = piece.length;

    if (options.strategy === "best-fit-decreasing") {
      // Find the bar with the tightest remaining space that can still fit the piece
      let bestBarIdx = -1;
      let minSlack = Infinity;

      for (let b = 0; b < activeBars.length; b++) {
        const bar = activeBars[b];
        const extraKerf = bar.cuts.length > 0 ? kerf : 0;
        const required = neededSpace + extraKerf;
        if (bar.remainingSpace >= required) {
          const slack = bar.remainingSpace - required;
          if (slack < minSlack) {
            minSlack = slack;
            bestBarIdx = b;
          }
        }
      }

      if (bestBarIdx !== -1) {
        const bar = activeBars[bestBarIdx];
        const extraKerf = bar.cuts.length > 0 ? kerf : 0;
        const start = bar.currentPos + extraKerf;
        const end = start + piece.length;
        bar.cuts.push({
          itemId: piece.id,
          length: piece.length,
          label: piece.label,
          startPosition: start,
          endPosition: end,
        });
        bar.currentPos = end;
        bar.remainingSpace -= piece.length + extraKerf;
        placed = true;
      }
    } else {
      // First-Fit Decreasing
      for (const bar of activeBars) {
        const extraKerf = bar.cuts.length > 0 ? kerf : 0;
        const required = neededSpace + extraKerf;
        if (bar.remainingSpace >= required) {
          const start = bar.currentPos + extraKerf;
          const end = start + piece.length;
          bar.cuts.push({
            itemId: piece.id,
            length: piece.length,
            label: piece.label,
            startPosition: start,
            endPosition: end,
          });
          bar.currentPos = end;
          bar.remainingSpace -= piece.length + extraKerf;
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      // Open a new stock bar
      const start = trim;
      const end = start + piece.length;
      activeBars.push({
        cuts: [
          {
            itemId: piece.id,
            length: piece.length,
            label: piece.label,
            startPosition: start,
            endPosition: end,
          },
        ],
        currentPos: end,
        remainingSpace: stockBarLength - trim - end,
      });
    }
  }

  // Build structured result
  let totalCutLength = 0;
  let totalKerfLoss = 0;

  const resultBars: StockResultBar[] = activeBars.map((bar, idx) => {
    const barCutLength = bar.cuts.reduce((sum, c) => sum + c.length, 0);
    const kerfCount = Math.max(0, bar.cuts.length - 1);
    const barKerfLoss = kerfCount * kerf;
    const usedLength = barCutLength + barKerfLoss + trim * 2;
    const wasteLength = Math.max(0, stockBarLength - usedLength);
    const efficiency = (barCutLength / stockBarLength) * 100;

    totalCutLength += barCutLength;
    totalKerfLoss += barKerfLoss;

    return {
      barIndex: idx + 1,
      stockLength: stockBarLength,
      usedLength: parseFloat(usedLength.toFixed(2)),
      wasteLength: parseFloat(wasteLength.toFixed(2)),
      cuts: bar.cuts,
      efficiencyPct: parseFloat(efficiency.toFixed(2)),
    };
  });

  const totalBarsNeeded = resultBars.length;
  const totalStockLength = totalBarsNeeded * stockBarLength;
  const totalWasteLength = Math.max(0, totalStockLength - totalCutLength - totalKerfLoss);
  const overallEfficiencyPct =
    totalStockLength > 0 ? parseFloat(((totalCutLength / totalStockLength) * 100).toFixed(2)) : 0;

  return {
    totalBarsNeeded,
    totalStockLength,
    totalCutLength: parseFloat(totalCutLength.toFixed(2)),
    totalWasteLength: parseFloat(totalWasteLength.toFixed(2)),
    totalKerfLoss: parseFloat(totalKerfLoss.toFixed(2)),
    overallEfficiencyPct,
    bars: resultBars,
    unplacedItems,
  };
}
