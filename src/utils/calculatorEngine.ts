/**
 * High-Precision Universal Store Calculator Engine
 * 
 * Provides:
 * - Accurate decimal arithmetic free from standard JavaScript floating-point errors (e.g. 0.1 + 0.2 = 0.3)
 * - Retail business percentage calculation (e.g. 100 + 18% = 118, 500 - 10% = 450, 250 * 20% = 50)
 * - Trailing operator auto-trimming and parentheses auto-completion
 * - Instant live calculation preview
 * - Quick GST and Discount calculators with reverse tax extraction
 * - Indian currency denomination cash return breakdown
 * - Detailed itemized audit tape statistics (item list, average, min, max)
 */

/**
 * Normalizes floating point numbers to eliminate binary rounding artifacts (e.g. 0.30000000000000004)
 */
export function normalizeFloat(val: number, maxDecimals: number = 10): number {
  if (!isFinite(val) || isNaN(val)) return 0;
  return parseFloat(val.toFixed(maxDecimals));
}

/**
 * Parses and replaces store-specific percentage operations:
 * - A + B% => A + (A * B / 100)  [e.g. 100 + 18% = 118]
 * - A - B% => A - (A * B / 100)  [e.g. 500 - 10% = 450]
 * - A * B% => A * (B / 100)       [e.g. 200 * 15% = 30]
 * - A / B% => A / (B / 100)       [e.g. 100 / 20% = 500]
 * - Standalone B% => (B / 100)
 */
export function preprocessRetailPercentages(formula: string): string {
  let cleaned = formula.replace(/×/g, '*').replace(/÷/g, '/');

  // Loop to handle chained percentages if any
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    // Replace "Number + Number%" with "Number + (Number * Number / 100)"
    cleaned = cleaned.replace(
      /(\d+(?:\.\d+)?|\))\s*([+\-])\s*(\d+(?:\.\d+)?)%/g,
      (_match, base, op, pct) => {
        return `${base} ${op} ((${base}) * (${pct}) / 100)`;
      }
    );

    // Replace "Number * Number%" with "Number * (Number / 100)"
    cleaned = cleaned.replace(
      /(\d+(?:\.\d+)?|\))\s*([*\/])\s*(\d+(?:\.\d+)?)%/g,
      (_match, base, op, pct) => {
        return `${base} ${op} ((${pct}) / 100)`;
      }
    );

    // Replace remaining standalone "Number%" with "(Number / 100)"
    cleaned = cleaned.replace(/(\d+(?:\.\d+)?)%/g, '($1 / 100)');
  }

  return cleaned;
}

/**
 * Auto-balances unclosed parentheses and trims trailing incomplete operators
 */
export function sanitizeExpressionForEvaluation(rawExpr: string): string {
  if (!rawExpr || typeof rawExpr !== 'string') return '';
  
  let expr = rawExpr.trim();
  if (!expr) return '';

  // Replace multiplication and division visual characters
  expr = expr.replace(/×/g, '*').replace(/÷/g, '/');

  // Remove trailing operators like +, -, *, /, %, (
  expr = expr.replace(/[+\-*\/%(.\s]+$/, '');
  if (!expr) return '';

  // Process retail percentages
  expr = preprocessRetailPercentages(expr);

  // Auto-close missing parentheses
  let openCount = 0;
  let closeCount = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') openCount++;
    if (expr[i] === ')') closeCount++;
  }
  if (openCount > closeCount) {
    expr += ')'.repeat(openCount - closeCount);
  }

  return expr;
}

/**
 * High-precision evaluation with floating point sanitation and error handling
 */
export function evaluateExpression(rawFormula: string): { 
  success: boolean; 
  result: number | null; 
  resultStr: string; 
  error?: string; 
} {
  try {
    const sanitized = sanitizeExpressionForEvaluation(rawFormula);
    if (!sanitized) {
      return { success: false, result: null, resultStr: '', error: 'Empty formula' };
    }

    // Safety check: only allow digits, arithmetic symbols, dots, parentheses, whitespace
    const safeRegex = /^[\d+\-*\/().\s]+$/;
    if (!safeRegex.test(sanitized)) {
      return { success: false, result: null, resultStr: 'Error', error: 'Invalid characters in formula' };
    }

    // Evaluate using strict Function execution
    const rawVal = Function(`"use strict"; return (${sanitized})`)();

    if (typeof rawVal !== 'number' || isNaN(rawVal)) {
      return { success: false, result: null, resultStr: 'Error', error: 'Not a valid number' };
    }

    if (!isFinite(rawVal)) {
      return { success: false, result: null, resultStr: 'Cannot divide by 0', error: 'Division by zero' };
    }

    // Normalize precision to avoid IEEE 754 precision errors (e.g. 0.1 + 0.2 = 0.3)
    const normalized = normalizeFloat(rawVal, 10);
    const resultStr = String(normalized);

    return {
      success: true,
      result: normalized,
      resultStr,
    };
  } catch (err: any) {
    return {
      success: false,
      result: null,
      resultStr: 'Error',
      error: err?.message || 'Syntax Error',
    };
  }
}

/**
 * Format calculation output based on user's preferred precision setting:
 * - auto: Clean trimmed decimals (e.g. 15, 15.5, 120.45)
 * - '0': Whole integer with standard rounding
 * - '2': Currency standard (2 decimal places)
 * - '3': 3 decimal places (ideal for weights in kg/grams)
 * - '4': 4 decimal places (for exact unit pricing)
 */
export function formatWithPrecision(
  val: number,
  precisionMode: 'auto' | '0' | '2' | '3' | '4' = 'auto'
): string {
  if (!isFinite(val) || isNaN(val)) return '0';

  if (precisionMode === '0') {
    return Math.round(val).toLocaleString('en-IN');
  }

  if (precisionMode === '2') {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (precisionMode === '3') {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }

  if (precisionMode === '4') {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  // Auto mode: Format up to 6 decimal places, omitting trailing zeroes
  const formatted = normalizeFloat(val, 6);
  return formatted.toLocaleString('en-IN', { maximumFractionDigits: 6 });
}

/**
 * GST Calculation Helper:
 * - add: Adds GST on top of base amount -> Total = Base + (Base * Rate / 100)
 * - extract: Extracts reverse GST from MRP inclusive amount -> Base = Total / (1 + Rate / 100)
 */
export function calculateGstBreakdown(amount: number, ratePercent: number, mode: 'add' | 'extract' = 'add') {
  if (amount <= 0 || ratePercent <= 0) {
    return { baseAmount: amount, gstAmount: 0, totalAmount: amount };
  }

  if (mode === 'add') {
    const gstAmount = normalizeFloat((amount * ratePercent) / 100, 2);
    const totalAmount = normalizeFloat(amount + gstAmount, 2);
    return { baseAmount: amount, gstAmount, totalAmount };
  } else {
    // Reverse tax extraction: Base = Total / (1 + rate/100)
    const baseAmount = normalizeFloat(amount / (1 + ratePercent / 100), 2);
    const gstAmount = normalizeFloat(amount - baseAmount, 2);
    return { baseAmount, gstAmount, totalAmount: amount };
  }
}

/**
 * Currency Denominations for Cash Change Breakdown (Indian Rupee context)
 */
export interface DenominationItem {
  value: number;
  count: number;
  type: 'note' | 'coin';
  label: string;
}

export function calculateDenominationBreakdown(changeAmount: number): DenominationItem[] {
  if (changeAmount <= 0) return [];

  // Round change to 2 decimal places and handle whole Rupee units
  let remaining = Math.floor(changeAmount);

  const denominations: { value: number; type: 'note' | 'coin' }[] = [
    { value: 500, type: 'note' },
    { value: 200, type: 'note' },
    { value: 100, type: 'note' },
    { value: 50, type: 'note' },
    { value: 20, type: 'note' },
    { value: 10, type: 'note' },
    { value: 5, type: 'coin' },
    { value: 2, type: 'coin' },
    { value: 1, type: 'coin' },
  ];

  const breakdown: DenominationItem[] = [];

  for (const denom of denominations) {
    if (remaining >= denom.value) {
      const count = Math.floor(remaining / denom.value);
      remaining = remaining % denom.value;
      breakdown.push({
        value: denom.value,
        count,
        type: denom.type,
        label: `₹${denom.value}`
      });
    }
  }

  return breakdown;
}

/**
 * Extracts itemized numerical values from the formula and provides statistical insights
 * Ideal for tallying customer items, expense lists, and basket orders.
 */
export interface FormulaStatistics {
  items: number[];
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
}

export function extractFormulaStatistics(formula: string): FormulaStatistics {
  if (!formula || typeof formula !== 'string') {
    return { items: [], count: 0, total: 0, average: 0, min: 0, max: 0 };
  }

  const clean = formula.replace(/,/g, '');
  const matches = clean.match(/\d+(?:\.\d+)?|\.\d+/g);

  if (!matches || matches.length === 0) {
    return { items: [], count: 0, total: 0, average: 0, min: 0, max: 0 };
  }

  const items = matches.map(m => parseFloat(m)).filter(n => !isNaN(n));
  if (items.length === 0) {
    return { items: [], count: 0, total: 0, average: 0, min: 0, max: 0 };
  }

  const count = items.length;
  const total = normalizeFloat(items.reduce((acc, curr) => acc + curr, 0), 2);
  const average = normalizeFloat(total / count, 2);
  const min = Math.min(...items);
  const max = Math.max(...items);

  return {
    items,
    count,
    total,
    average,
    min,
    max,
  };
}
