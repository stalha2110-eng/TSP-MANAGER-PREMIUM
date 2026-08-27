export interface ParsedSearchInput {
  raw: string;
  cleanQuery: string;
  quantity?: number;
  targetPrice?: number;
  unitLabel?: string;
  badgeLabel?: string;
  mode?: 'multiplier' | 'weight_fraction' | 'target_budget' | 'plain';
}

export interface WeightPreset {
  label: string;
  qty: number;
  shortLabel?: string;
}

export const COMMON_WEIGHT_PRESETS: WeightPreset[] = [
  { label: '100g', qty: 0.1, shortLabel: '100g' },
  { label: '250g', qty: 0.25, shortLabel: '250g' },
  { label: '500g', qty: 0.5, shortLabel: '500g' },
  { label: '750g', qty: 0.75, shortLabel: '750g' },
  { label: '1 kg', qty: 1.0, shortLabel: '1kg' },
  { label: '1.25 kg', qty: 1.25, shortLabel: '1.25k' },
  { label: '1.5 kg', qty: 1.5, shortLabel: '1.5k' },
  { label: '1.75 kg', qty: 1.75, shortLabel: '1.75k' },
  { label: '2 kg', qty: 2.0, shortLabel: '2kg' },
  { label: '2.5 kg', qty: 2.5, shortLabel: '2.5k' },
  { label: '5 kg', qty: 5.0, shortLabel: '5kg' },
];

export const COMMON_BUDGET_PRESETS: number[] = [20, 50, 100, 200, 500];

/**
 * Check if the unit is weight/volume or loose based where fractional quantities are typical.
 */
export function isWeightBasedUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return ['kg', 'kgs', 'kilo', 'kilogram', 'gm', 'g', 'gms', 'gram', 'grams', 'ltr', 'l', 'litre', 'litres', 'ml', 'loose', 'pond', 'm'].includes(u);
}

/**
 * Parses shorthand search queries such as:
 * - "1.5 kaju" -> qty 1.5, clean: "kaju"
 * - "1.5*kaju" or "1.5x kaju" -> qty 1.5, clean: "kaju"
 * - "250g kaju" or "250gm kaju" -> qty 0.25, clean: "kaju"
 * - "₹100 kaju" or "100rs kaju" or "100 rs kaju" -> targetPrice: 100, clean: "kaju"
 * - "3 kaju" -> qty 3, clean: "kaju"
 */
export function parseSearchInput(rawQuery: string): ParsedSearchInput {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { raw: '', cleanQuery: '', mode: 'plain' };
  }

  // 1. Target Currency Budget Prefix (e.g., "₹100 kaju", "₹ 100 kaju", "100rs kaju", "100 rs kaju", "100/- kaju", "rs100 kaju", "rs 100 kaju")
  const targetPriceMatch = trimmed.match(/^(?:₹\s*(\d+(?:\.\d+)?)|rs\.?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|inr|\/-|\/))\s+(.+)$/i);
  if (targetPriceMatch) {
    const amountStr = targetPriceMatch[1] || targetPriceMatch[2] || targetPriceMatch[3];
    const amount = parseFloat(amountStr);
    const term = (targetPriceMatch[4] || '').trim();
    if (!isNaN(amount) && amount > 0 && term) {
      return {
        raw: trimmed,
        cleanQuery: term,
        targetPrice: amount,
        badgeLabel: `₹${amount} Budget`,
        mode: 'target_budget'
      };
    }
  }

  // 2. Grams Weight Shorthand (e.g., "250g kaju", "250gm kaju", "500 g kaju", "100gms kaju", "750 gram kaju")
  const gramsMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\s*[\*xX\s]?\s*(.+)$/i);
  if (gramsMatch) {
    const gVal = parseFloat(gramsMatch[1]);
    const term = (gramsMatch[2] || '').trim();
    if (!isNaN(gVal) && gVal > 0 && term) {
      const kgVal = +(gVal / 1000).toFixed(3);
      return {
        raw: trimmed,
        cleanQuery: term,
        quantity: kgVal,
        unitLabel: `${gVal}g (${kgVal}kg)`,
        badgeLabel: `${gVal}g (${kgVal} kg)`,
        mode: 'weight_fraction'
      };
    }
  }

  // 3. Kilogram or Standard Multiplier Shorthand (e.g., "1.5 kaju", "1.5*kaju", "1.5x kaju", "1.5kg kaju", "1.5 kg kaju", "0.75 kaju", "2.25 kaju")
  const multiplierMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|pcs|pc|pkt|pkts|box|boxes|l|ltr|litre|litres)?\s*(?:[\*xX\s])\s*(.+)$/i);
  if (multiplierMatch) {
    const qtyVal = parseFloat(multiplierMatch[1]);
    const term = (multiplierMatch[2] || '').trim();
    if (!isNaN(qtyVal) && qtyVal > 0 && term) {
      return {
        raw: trimmed,
        cleanQuery: term,
        quantity: qtyVal,
        unitLabel: `${qtyVal}`,
        badgeLabel: `Qty: ${qtyVal}`,
        mode: 'multiplier'
      };
    }
  }

  return { raw: trimmed, cleanQuery: trimmed, mode: 'plain' };
}

/**
 * Calculates weight / quantity from target rupee budget and unit price.
 * e.g., ₹100 for an item at ₹800/kg => 0.125 kg.
 */
export function calculateWeightFromAmount(targetAmount: number, unitPrice: number, decimals: number = 3): number {
  if (!unitPrice || unitPrice <= 0 || !targetAmount || targetAmount <= 0) return 0;
  const rawQty = targetAmount / unitPrice;
  return +(parseFloat(rawQty.toFixed(decimals)));
}
