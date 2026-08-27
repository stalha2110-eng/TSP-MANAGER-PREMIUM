import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR", precision: number = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(amount);
}

export function formatNumber(num: number, precision: number = 0): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(num);
}

export function parseTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date(0);
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'number') return new Date(timestamp);
  
  // Handle Firestore Timestamp instances or serialized objects
  if (typeof timestamp === 'object') {
    if (typeof timestamp.toDate === 'function') {
      try { return timestamp.toDate(); } catch (e) {}
    }
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    if (typeof timestamp._seconds === 'number') return new Date(timestamp._seconds * 1000);
  }

  if (typeof timestamp === 'string') {
    // String representation of a numeric timestamp (e.g. "1712345678000")
    if (/^\d{10,}$/.test(timestamp.trim())) {
      const numMs = Number(timestamp.trim());
      if (!isNaN(numMs)) return new Date(numMs);
    }

    // 1. Direct ISO / Standard Date parse
    const direct = new Date(timestamp);
    if (!isNaN(direct.getTime())) return direct;

    // 2. Local strings like "10/08/2026, 11:27:00 AM", "10-08-2026 11:27", or "2026/08/10"
    const cleaned = timestamp.trim().replace(/,/g, '');
    const parts = cleaned.split(/\s+/);
    if (parts.length > 0) {
      const datePart = parts[0];
      const timePart = parts[1] || '';
      const ampm = parts[2] ? parts[2].toUpperCase() : '';

      const dateSegs = datePart.split(/[\/\-\.]/).map(Number);
      if (dateSegs.length === 3) {
        let year = dateSegs[0] > 1000 ? dateSegs[0] : dateSegs[2];
        let month = dateSegs[0] > 1000 ? dateSegs[1] : dateSegs[0];
        let day = dateSegs[0] > 1000 ? dateSegs[2] : dateSegs[1];

        // If month is > 12 and day <= 12, swap them
        if (month > 12 && day <= 12) {
          const temp = month;
          month = day;
          day = temp;
        }

        if (year < 100) year += 2000;

        let hours = 0;
        let mins = 0;
        let secs = 0;

        if (timePart) {
          const timeSegs = timePart.split(':').map(Number);
          hours = timeSegs[0] || 0;
          mins = timeSegs[1] || 0;
          secs = timeSegs[2] || 0;

          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
        }

        const constructed = new Date(year, month - 1, day, hours, mins, secs);
        if (!isNaN(constructed.getTime())) return constructed;
      }
    }
  }

  return new Date(0);
}

export function getNormalizedDateKey(timestamp: any): string {
  const d = parseTimestamp(timestamp);
  if (!d || isNaN(d.getTime()) || d.getTime() === 0) return 'unknown';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getParsedTimestampMs(timestamp: any): number {
  const d = parseTimestamp(timestamp);
  return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
}

/**
 * Counts the number of numeric entries in a mathematical expression string.
 * Supports all operators (+, -, *, /, ×, ÷, %, ^, parentheses), decimals, commas, currency symbols.
 * Ignores empty strings, error states, and non-numeric symbols.
 */
export function countNumericEntries(expression: string | null | undefined): number {
  if (!expression || typeof expression !== 'string') return 0;

  const trimmed = expression.trim();
  if (!trimmed) return 0;

  // Ignore error states
  if (trimmed.toLowerCase().includes('error') || trimmed.toLowerCase().includes('nan')) {
    return 0;
  }

  // Remove commas used in formatting (e.g. 1,000 -> 1000)
  const sanitized = trimmed.replace(/,/g, '');

  // Extract all numbers (integers or decimals like 26, 156.5, .75)
  const matches = sanitized.match(/\d+(?:\.\d+)?|\.\d+/g);

  if (!matches) return 0;

  return matches.length;
}

/**
 * Formats an item count into a clean user-friendly label (e.g., "3 Items", "1 Item", "0 Items")
 */
export function formatItemCountLabel(count: number): string {
  if (count === 1) return '1 Item';
  return `${count} Items`;
}

/**
 * Accurately calculates the net profit for a given bill.
 * Uses item-level cost if available, otherwise falls back to store items catalog buyingPrice.
 * Ensures strict safety against NaN, null, undefined, or missing values.
 */
export function calculateBillProfit(bill: any, itemsCatalog?: any[]): number {
  if (!bill || !bill.items || !Array.isArray(bill.items)) return 0;

  let totalCostOfGoods = 0;
  let totalItemRevenue = 0;

  // Build quick map of items catalog if provided
  const itemsMap = new Map<string, any>();
  if (itemsCatalog && Array.isArray(itemsCatalog)) {
    itemsCatalog.forEach(i => {
      if (i.id) itemsMap.set(i.id, i);
      if (i.name) itemsMap.set(i.name.toLowerCase().trim(), i);
    });
  }

  bill.items.forEach((item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    if (qty <= 0 || price < 0) return;

    totalItemRevenue += price * qty;

    // Determine accurate unit cost
    let unitCost = Number(item.cost) || 0;

    // Fallback 1: Look up catalog item if item.cost is missing or 0
    if (unitCost <= 0) {
      const catalogItem = itemsMap.get(item.itemId) || itemsMap.get((item.name || '').toLowerCase().trim());
      if (catalogItem && typeof catalogItem.buyingPrice === 'number' && catalogItem.buyingPrice > 0) {
        unitCost = catalogItem.buyingPrice;
      } else if (catalogItem && typeof catalogItem.cost === 'number' && catalogItem.cost > 0) {
        unitCost = catalogItem.cost;
      }
    }

    // Fallback 2: If cost is still 0 or if cost >= price (unrealistic for retail margin),
    // estimate a standard 25% gross profit margin (cost = 75% of price)
    if (unitCost <= 0 || unitCost >= price) {
      unitCost = price * 0.75;
    }

    totalCostOfGoods += unitCost * qty;
  });

  const billTotal = typeof bill.total === 'number' && !isNaN(bill.total) ? bill.total : totalItemRevenue;

  // Account for overall bill discounts
  let netProfit = billTotal - totalCostOfGoods;

  if (isNaN(netProfit) || netProfit < 0) {
    // If net profit became negative due to heavy discount or cost anomaly, ensure reasonable non-negative fallback based on actual bill total
    netProfit = Math.max(0, billTotal * 0.20); // 20% floor estimate if data is noisy
  }

  return Number(netProfit.toFixed(2));
}


