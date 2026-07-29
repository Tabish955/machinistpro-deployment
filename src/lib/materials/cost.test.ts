import { describe, expect, it } from "vitest";
import { calculateCost } from "./engine";

describe("cost breakdown", () => {
  it("applies waste, then discount, then tax", () => {
    // 2 kg a piece, 10 pieces, £5/kg = £100 of material.
    const c = calculateCost(2, {
      pricePerKg: 5,
      quantity: 10,
      wastePct: 10,
      discountPct: 20,
      taxPct: 20,
    });
    expect(c.totalWeight).toBe(20);
    expect(c.materialCost).toBe(100);
    expect(c.wasteCost).toBe(10); // 10% of material
    // Discount comes off material + waste, and tax is charged on what is left.
    // 110 - 22 = 88, +20% tax = 105.6
    expect(c.grandTotal).toBeCloseTo(105.6, 9);
    expect(c.costPerItem).toBeCloseTo(10.56, 9);
  });

  it("keeps the parts consistent with the total", () => {
    const c = calculateCost(1.5, {
      pricePerKg: 12.34,
      quantity: 7,
      wastePct: 5,
      discountPct: 0,
      taxPct: 17.5,
    });
    const subtotal = c.materialCost + c.wasteCost;
    expect(c.grandTotal).toBeCloseTo(subtotal * 1.175, 9);
    expect(c.costPerItem * 7).toBeCloseTo(c.grandTotal, 9);
  });

  it("does not divide by a zero quantity", () => {
    const c = calculateCost(2, {
      pricePerKg: 5,
      quantity: 0,
      wastePct: 0,
      discountPct: 0,
      taxPct: 0,
    });
    expect(c.costPerItem).toBe(0);
    expect(Number.isFinite(c.grandTotal)).toBe(true);
  });
});
