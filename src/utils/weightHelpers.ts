export interface ParsedSearchInput {
  raw: string;
  cleanQuery: string;
  quantity?: number;
  targetPrice?: number;
  unitLabel?: string;
  badgeLabel?: string;
  explicitUnit?: string;
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
  { label: '1kg', qty: 1.0, shortLabel: '1kg' },
  { label: '1.25kg', qty: 1.25, shortLabel: '1.25k' },
  { label: '1.5kg', qty: 1.5, shortLabel: '1.5k' },
  { label: '1.75kg', qty: 1.75, shortLabel: '1.75k' },
  { label: '2kg', qty: 2.0, shortLabel: '2kg' },
  { label: '2.5kg', qty: 2.5, shortLabel: '2.5k' },
  { label: '5kg', qty: 5.0, shortLabel: '5kg' },
];

export const COMMON_LIQUID_PRESETS: WeightPreset[] = [
  { label: '100ml', qty: 0.1, shortLabel: '100ml' },
  { label: '250ml', qty: 0.25, shortLabel: '250ml' },
  { label: '500ml', qty: 0.5, shortLabel: '500ml' },
  { label: '750ml', qty: 0.75, shortLabel: '750ml' },
  { label: '1 Ltr', qty: 1.0, shortLabel: '1L' },
  { label: '1.5 Ltr', qty: 1.5, shortLabel: '1.5L' },
  { label: '2 Ltr', qty: 2.0, shortLabel: '2L' },
  { label: '2.5 Ltr', qty: 2.5, shortLabel: '2.5L' },
  { label: '5 Ltr', qty: 5.0, shortLabel: '5L' },
  { label: '10 Ltr', qty: 10.0, shortLabel: '10L' },
];

export const COMMON_CHATAK_PRESETS: WeightPreset[] = [
  { label: '0.5 Chatak', qty: 0.5, shortLabel: '0.5' },
  { label: '1 Chatak', qty: 1.0, shortLabel: '1' },
  { label: '2 Chatak', qty: 2.0, shortLabel: '2' },
  { label: '3 Chatak', qty: 3.0, shortLabel: '3' },
  { label: '4 Chatak', qty: 4.0, shortLabel: '4' },
  { label: '5 Chatak', qty: 5.0, shortLabel: '5' },
  { label: '8 Chatak', qty: 8.0, shortLabel: '8' },
  { label: '10 Chatak', qty: 10.0, shortLabel: '10' },
  { label: '16 Chatak', qty: 16.0, shortLabel: '16' },
];

export const COMMON_DOZEN_PRESETS: WeightPreset[] = [
  { label: '0.5 Dzn (6)', qty: 0.5, shortLabel: '0.5' },
  { label: '1 Dzn (12)', qty: 1.0, shortLabel: '1' },
  { label: '1.5 Dzn (18)', qty: 1.5, shortLabel: '1.5' },
  { label: '2 Dzn (24)', qty: 2.0, shortLabel: '2' },
  { label: '3 Dzn', qty: 3.0, shortLabel: '3' },
  { label: '4 Dzn', qty: 4.0, shortLabel: '4' },
  { label: '5 Dzn', qty: 5.0, shortLabel: '5' },
  { label: '10 Dzn', qty: 10.0, shortLabel: '10' },
];

export const COMMON_BUDGET_PRESETS: number[] = [20, 50, 100, 200, 500];

/**
 * Format quantity and unit without space (e.g. "1kg", "250g", "1Chatak", "2pcs")
 */
export function formatQtyWithUnit(quantity: number | string, unit?: string): string {
  if (!unit) return `${quantity}`;
  const u = unit.trim();
  return `${quantity}${u}`;
}

/**
 * Check if the unit is liquid / volume based
 */
export function isLiquidUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return ['ltr', 'l', 'litre', 'litres', 'liter', 'liters', 'ml', 'लीटर'].includes(u);
}

/**
 * Check if the unit is gram based
 */
export function isGramUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return ['g', 'gm', 'gms', 'gram', 'grams', 'ग्राम'].includes(u);
}

/**
 * Check if the unit is chatak based
 */
export function isChatakUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return ['chatak', 'chattak', 'chhatak', 'ctk', 'satak', 'छटांक', 'छटाक', 'चटाक', 'चटक'].includes(u);
}

/**
 * Check if the unit is dozen based
 */
export function isDozenUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return ['dozen', 'dzn', 'darjan', 'दर्जन'].includes(u);
}

/**
 * Check if the unit is weight/volume or loose based where fractional quantities are typical.
 */
export function isWeightBasedUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return ['kg', 'kgs', 'kilo', 'kilogram', 'gm', 'g', 'gms', 'gram', 'grams', 'ltr', 'l', 'litre', 'litres', 'ml', 'loose', 'pond', 'm', 'chatak', 'chattak', 'chhatak'].includes(u);
}

/**
 * Formats discrete quantities with proper unit labels (e.g. "1 bottle", "2 bottles", "1 box", "2 boxes", "1 pkt", "2 pkts")
 */
export function formatDiscreteUnit(qty: number, rawUnit: string): string {
  const trimmed = rawUnit.trim();
  if (!trimmed) return `${qty}`;
  const lower = trimmed.toLowerCase();

  // Known singular/plural mappings
  if (lower === 'pc' || lower === 'pcs' || lower === 'piece' || lower === 'pieces' || lower === 'पीस' || lower === 'नग') {
    return qty === 1 ? '1 pc' : `${qty} pcs`;
  }
  if (lower === 'bottle' || lower === 'bottles' || lower === 'बोतल') {
    return qty === 1 ? '1 bottle' : `${qty} bottles`;
  }
  if (lower === 'box' || lower === 'boxes' || lower === 'बॉक्स') {
    return qty === 1 ? '1 box' : `${qty} boxes`;
  }
  if (lower === 'pkt' || lower === 'pkts' || lower === 'pack' || lower === 'packs' || lower === 'packet' || lower === 'packets' || lower === 'पैकेट') {
    return qty === 1 ? '1 pkt' : `${qty} pkts`;
  }
  if (lower === 'bag' || lower === 'bags' || lower === 'बोरी') {
    return qty === 1 ? '1 bag' : `${qty} bags`;
  }
  if (lower === 'can' || lower === 'cans') {
    return qty === 1 ? '1 can' : `${qty} cans`;
  }
  if (lower === 'tin' || lower === 'tins') {
    return qty === 1 ? '1 tin' : `${qty} tins`;
  }
  if (lower === 'jar' || lower === 'jars') {
    return qty === 1 ? '1 jar' : `${qty} jars`;
  }
  if (lower === 'strip' || lower === 'strips') {
    return qty === 1 ? '1 strip' : `${qty} strips`;
  }
  if (lower === 'roll' || lower === 'rolls') {
    return qty === 1 ? '1 roll' : `${qty} rolls`;
  }
  if (lower === 'bundle' || lower === 'bundles') {
    return qty === 1 ? '1 bundle' : `${qty} bundles`;
  }
  if (lower === 'carton' || lower === 'cartons') {
    return qty === 1 ? '1 carton' : `${qty} cartons`;
  }
  if (lower === 'pouch' || lower === 'pouches') {
    return qty === 1 ? '1 pouch' : `${qty} pouches`;
  }
  if (lower === 'plate' || lower === 'plates') {
    return qty === 1 ? '1 plate' : `${qty} plates`;
  }
  if (lower === 'cup' || lower === 'cups') {
    return qty === 1 ? '1 cup' : `${qty} cups`;
  }
  if (lower === 'glass' || lower === 'glasses') {
    return qty === 1 ? '1 glass' : `${qty} glasses`;
  }
  if (lower === 'meter' || lower === 'm' || lower === 'metre') {
    return `${qty}m`;
  }

  // Dynamic formatting for custom units:
  if (qty === 1) {
    return `1 ${trimmed}`;
  }
  const endsWithS = lower.endsWith('s');
  return `${qty} ${endsWithS ? trimmed : `${trimmed}s`}`;
}

/**
 * Returns the appropriate presets based on the product's actual unit:
 * - Weight (kg): 100g, 250g, 500g, 750g, 1kg, 1.25kg, 1.5kg, 2kg, 5kg...
 * - Liquid (ltr, ml): 100ml, 250ml, 500ml, 750ml, 1 Ltr, 1.5 Ltr, 2 Ltr, 5 Ltr...
 * - Chatak: 0.5 Chatak, 1 Chatak, 2 Chatak, 4 Chatak, 5 Chatak...
 * - Dozen: 0.5 Dzn (6), 1 Dzn (12), 1.5 Dzn, 2 Dzn...
 * - Grams (gm, g): 25g, 50g, 100g, 250g, 500g, 1000g...
 * - Discrete / Custom units (bottle, box, pkt, bag, pcs, etc.): 1, 2, 3, 4, 5, 6, 8, 10, 12, 20, 24, 50 formatted with that unit!
 */
export function getPresetsForUnit(unit?: string, customPresets?: WeightPreset[]): WeightPreset[] {
  if (customPresets && customPresets.length > 0) {
    return customPresets;
  }

  const cleanUnit = (unit || '').trim();
  if (isLiquidUnit(cleanUnit)) {
    return COMMON_LIQUID_PRESETS;
  }
  if (isChatakUnit(cleanUnit)) {
    return COMMON_CHATAK_PRESETS;
  }
  if (isDozenUnit(cleanUnit)) {
    return COMMON_DOZEN_PRESETS;
  }
  if (isGramUnit(cleanUnit)) {
    return [
      { label: '25g', qty: 25, shortLabel: '25g' },
      { label: '50g', qty: 50, shortLabel: '50g' },
      { label: '100g', qty: 100, shortLabel: '100g' },
      { label: '200g', qty: 200, shortLabel: '200g' },
      { label: '250g', qty: 250, shortLabel: '250g' },
      { label: '500g', qty: 500, shortLabel: '500g' },
      { label: '750g', qty: 750, shortLabel: '750g' },
      { label: '1000g', qty: 1000, shortLabel: '1000g' },
    ];
  }
  if (isWeightBasedUnit(cleanUnit)) {
    return COMMON_WEIGHT_PRESETS;
  }

  // Discrete or custom units: bottle, box, pkt, bag, pcs, etc.
  const activeUnit = cleanUnit || 'pcs';
  const DISCRETE_QTYS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 20, 24, 50];
  return DISCRETE_QTYS.map((qty) => ({
    label: formatDiscreteUnit(qty, activeUnit),
    qty,
    shortLabel: `${qty}`,
  }));
}

/**
 * Normalizes user-entered unit strings into canonical forms
 */
export function normalizeSearchUnit(rawUnit?: string): string | undefined {
  if (!rawUnit) return undefined;
  const u = rawUnit.toLowerCase().trim();
  if (['kg', 'kgs', 'kilo', 'kilogram', 'किग्रा', 'किलो'].includes(u)) return 'kg';
  if (['g', 'gm', 'gms', 'gram', 'grams', 'ग्राम'].includes(u)) return 'g';
  if (['chatak', 'chattak', 'chhatak', 'ctk', 'satak', 'छटांक', 'छटाक', 'चटाक', 'चटक'].includes(u)) return 'Chatak';
  if (['pcs', 'pc', 'piece', 'pieces', 'पीस', 'नग'].includes(u)) return 'pcs';
  if (['pkt', 'pkts', 'pack', 'packet', 'packets', 'पैकेट'].includes(u)) return 'pkt';
  if (['box', 'boxes', 'बॉक्स'].includes(u)) return 'box';
  if (['l', 'ltr', 'litre', 'litres', 'लीटर'].includes(u)) return 'ltr';
  if (['ml', 'एमएल'].includes(u)) return 'ml';
  if (['dozen', 'darjan', 'दर्जन'].includes(u)) return 'dozen';
  return rawUnit.trim();
}

/**
 * Parses shorthand search queries such as:
 * - "1kg badam" or "1 kg badam" -> qty 1, unit: "kg", clean: "badam"
 * - "1.5 kaju" -> qty 1.5, clean: "kaju"
 * - "1.5*kaju" or "1.5x kaju" -> qty 1.5, clean: "kaju"
 * - "250g kaju" or "250gm kaju" -> qty 0.25, unit: "kg", clean: "kaju"
 * - "1chatak badam" -> qty 1, unit: "Chatak", clean: "badam"
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

  // 2. Chatak Weight Shorthand (e.g. "1chatak badam", "1 chatak badam", "2 chatak badam")
  const chatakMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(chatak|chattak|chhatak|ctk|satak|छटांक|छटाक|चटाक|चटक)\s*[\*xX\s]?\s*(.+)$/i);
  if (chatakMatch) {
    const cVal = parseFloat(chatakMatch[1]);
    const term = (chatakMatch[3] || '').trim();
    if (!isNaN(cVal) && cVal > 0 && term) {
      return {
        raw: trimmed,
        cleanQuery: term,
        quantity: cVal,
        explicitUnit: 'Chatak',
        unitLabel: `${cVal}Chatak`,
        badgeLabel: `Qty: ${cVal}Chatak`,
        mode: 'multiplier'
      };
    }
  }

  // 3. Grams Weight Shorthand (e.g., "250g kaju", "250gm kaju", "500 g kaju", "100gms kaju", "750 gram kaju")
  const gramsMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams|ग्राम)\s*[\*xX\s]?\s*(.+)$/i);
  if (gramsMatch) {
    const gVal = parseFloat(gramsMatch[1]);
    const term = (gramsMatch[2] || '').trim();
    if (!isNaN(gVal) && gVal > 0 && term) {
      const kgVal = +(gVal / 1000).toFixed(3);
      return {
        raw: trimmed,
        cleanQuery: term,
        quantity: kgVal,
        explicitUnit: 'kg',
        unitLabel: `${gVal}g (${kgVal}kg)`,
        badgeLabel: `${gVal}g (${kgVal}kg)`,
        mode: 'weight_fraction'
      };
    }
  }

  // 4. Kilogram, Litre, Pcs or Standard Multiplier Shorthand (e.g., "1kg badam", "1 kg badam", "1.5 kaju", "1.5*kaju", "1.5x kaju", "1.5kg kaju", "2pcs kaju")
  const multiplierMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|kilogram|किग्रा|किलो|pcs|pc|piece|pieces|पीस|नग|pkt|pkts|pack|packet|packets|box|boxes|l|ltr|litre|litres|dozen)?\s*(?:[\*xX\s])\s*(.+)$/i) ||
                         trimmed.match(/^(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|kilogram|किग्रा|किलो|pcs|pc|piece|pieces|pkt|pkts|pack|packet|packets|box|boxes|l|ltr|litre|litres|dozen)(.+)$/i);
  if (multiplierMatch) {
    const qtyVal = parseFloat(multiplierMatch[1]);
    const matchedUnit = normalizeSearchUnit(multiplierMatch[2]);
    const term = (multiplierMatch[3] || '').trim();
    if (!isNaN(qtyVal) && qtyVal > 0 && term) {
      const unitText = matchedUnit || '';
      return {
        raw: trimmed,
        cleanQuery: term,
        quantity: qtyVal,
        explicitUnit: matchedUnit,
        unitLabel: unitText ? `${qtyVal}${unitText}` : `${qtyVal}`,
        badgeLabel: unitText ? `Qty: ${qtyVal}${unitText}` : `Qty: ${qtyVal}`,
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
