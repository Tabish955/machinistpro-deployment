/**
 * Reusable validation layer for all calculators.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationRule {
  field: string;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  positive?: boolean;
  integer?: boolean;
  nonZero?: boolean;
  custom?: (value: number, all: Record<string, number>) => string | null;
}

/**
 * Validate a set of numeric values against rules.
 * Returns null if valid, or an array of errors.
 */
export function validate(
  values: Record<string, number>,
  rules: ValidationRule[]
): ValidationError[] | null {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const v = values[rule.field];

    // Required check
    if (rule.required !== false) {
      if (v === undefined || isNaN(v)) {
        errors.push({ field: rule.field, message: `${rule.label} is required` });
        continue;
      }
    } else if (v === undefined || isNaN(v)) {
      continue; // Optional and missing — skip
    }

    // Positive check
    if (rule.positive && v < 0) {
      errors.push({ field: rule.field, message: `${rule.label} must be positive` });
      continue;
    }

    // Non-zero check
    if (rule.nonZero && v === 0) {
      errors.push({ field: rule.field, message: `${rule.label} cannot be zero` });
      continue;
    }

    // Min check
    if (rule.min !== undefined && v < rule.min) {
      errors.push({ field: rule.field, message: `${rule.label} must be ≥ ${rule.min}` });
      continue;
    }

    // Max check
    if (rule.max !== undefined && v > rule.max) {
      errors.push({ field: rule.field, message: `${rule.label} must be ≤ ${rule.max}` });
      continue;
    }

    // Integer check
    if (rule.integer && !Number.isInteger(v)) {
      errors.push({ field: rule.field, message: `${rule.label} must be a whole number` });
      continue;
    }

    // Custom validator
    if (rule.custom) {
      const msg = rule.custom(v, values);
      if (msg) {
        errors.push({ field: rule.field, message: msg });
      }
    }
  }

  return errors.length > 0 ? errors : null;
}

/**
 * Quick check: are all required fields filled with valid positive numbers?
 */
export function allPositive(values: Record<string, number>, fields: string[]): boolean {
  return fields.every(f => {
    const v = values[f];
    return v !== undefined && !isNaN(v) && v > 0;
  });
}

/**
 * Parse a set of string inputs into numbers, returning NaN for invalid.
 */
export function parseInputs(raw: Record<string, string>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    result[key] = val === "" ? NaN : parseFloat(val);
  }
  return result;
}

/**
 * Check for division-by-zero risk.
 */
export function safeDivide(a: number, b: number, fallback = 0): number {
  if (b === 0 || !isFinite(b)) return fallback;
  return a / b;
}
