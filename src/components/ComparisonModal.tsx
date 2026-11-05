import React from 'react';
import { motion } from 'motion/react';
import { X, Scale, ArrowUpDown, Package, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { Item, LanguageType } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { cn, formatNumber } from '../lib/utils';

export interface ComparisonModalProps {
  selectedItems: Item[];
  onClose: () => void;
  t: any;
  language: LanguageType;
  precision: number;
  hideBuyingPrice?: boolean;
  isLocked?: boolean;
  currency?: string;
}

export function ComparisonModal({ 
  selectedItems, 
  onClose, 
  t, 
  language, 
  precision, 
  hideBuyingPrice = false,
  isLocked = false,
  currency = '₹'
}: ComparisonModalProps) {
  const isBuyingLocked = isLocked || hideBuyingPrice;
  const count = selectedItems.length;

  // Format date concisely without taking extra screen space (e.g. "05 Nov")
  const formatCompactDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Compute delta insights when comparing exactly 2 items
  const deltaInsights = React.useMemo(() => {
    if (count !== 2) return null;
    const [itemA, itemB] = selectedItems;
    const nameA = (itemA.translations && (itemA.translations[language] || itemA.translations.en)) || itemA.name;
    const nameB = (itemB.translations && (itemB.translations[language] || itemB.translations.en)) || itemB.name;

    const retailDiff = (itemA.retailPrice || 0) - (itemB.retailPrice || 0);
    const wholesaleDiff = (itemA.wholesalePrice || 0) - (itemB.wholesalePrice || 0);
    const buyingDiff = !isBuyingLocked ? (itemA.buyingPrice || 0) - (itemB.buyingPrice || 0) : null;

    return {
      nameA,
      nameB,
      retailDiff,
      wholesaleDiff,
      buyingDiff
    };
  }, [selectedItems, count, language, isBuyingLocked]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.94, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[var(--background)] rounded-2xl sm:rounded-3xl border border-[var(--border)] shadow-2xl p-3 sm:p-5 max-h-[92vh] flex flex-col overflow-hidden text-[var(--foreground)]"
      >
        {/* Compact Header: Saves maximum vertical space for mobile */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] shrink-0">
              <Scale size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight truncate">
                  {t.compare || "Compare"}
                </h2>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shrink-0">
                  {count} {t.items || "Items"}
                </span>
              </div>
              <p className="text-[8.5px] opacity-50 font-bold truncate">
                {t.sideBySide || "Side-by-side rates comparison"}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="h-8 w-8 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-[var(--border)]"
            title="Close Comparison"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Cards Container */}
        <div className="overflow-y-auto flex-1 pr-0.5 space-y-2.5 no-scrollbar">
          {/* Items Grid: 2 columns on mobile side-by-side to save maximum space */}
          <div className={cn(
            "grid gap-2 sm:gap-3",
            count <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          )}>
            {selectedItems.map((item, sIdx) => {
              const cat = DEFAULT_CATEGORIES.find(c => c.id === item.categoryId);
              const name = (item.translations && (item.translations[language] || item.translations.en)) || item.name;
              
              const retailVal = item.retailPrice || 0;
              const wholesaleVal = item.wholesalePrice || 0;
              const buyingVal = item.buyingPrice || 0;
              const itemDate = item.priceChangedAt || item.lastUpdated;

              return (
                <div 
                  key={`sel-card-${item.id || 'item'}-${sIdx}`} 
                  className="rounded-xl sm:rounded-2xl bg-[var(--card)] border border-[var(--border)] p-2 sm:p-3 flex flex-col justify-between space-y-2 shadow-xs transition-shadow hover:shadow-md"
                >
                  {/* Item Header: Icon + Name + Category in high-density compact row */}
                  <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-base sm:text-lg shrink-0 shadow-inner">
                      {cat?.icon || '📦'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-xs sm:text-sm truncate leading-tight" title={name}>
                        {name}
                      </h3>
                      <p className="text-[8px] sm:text-[9px] font-bold opacity-50 uppercase tracking-wider truncate">
                        {cat?.name || 'Item'}
                      </p>
                    </div>
                  </div>

                  {/* Rates Matrix: Retail, Wholesale, and Buying (only when unlocked) */}
                  <div className="space-y-1.5 flex-1">
                    {/* 1. Retail Rate (Dark/Dim Red styling matching ItemCard) */}
                    <div className="rounded-lg bg-red-900/10 dark:bg-red-950/40 p-1.5 sm:p-2 border border-red-900/30 dark:border-red-800/40">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider text-red-900/90 dark:text-red-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-800 dark:bg-red-700 shrink-0" />
                          {t.retail || "Retail"}
                        </span>
                        <span className="text-[7px] sm:text-[8px] font-bold text-red-900/70 dark:text-red-300/70 truncate">
                          /{item.retailPriceUnit || 'Unit'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-red-950 dark:text-red-100 font-mono">
                          {currency}{formatNumber(retailVal, precision)}
                        </span>
                      </div>
                    </div>

                    {/* 2. Wholesale Rate (Warm Amber/Yellow styling matching ItemCard) */}
                    <div className="rounded-lg bg-amber-100/70 dark:bg-amber-950/40 p-1.5 sm:p-2 border border-amber-300/80 dark:border-amber-700/50">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {t.wholesale || "Wholesale"}
                        </span>
                        <span className="text-[7px] sm:text-[8px] font-bold text-amber-800/80 dark:text-amber-300/70 truncate">
                          /{item.wholesalePriceUnit || 'Unit'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100 font-mono">
                          {currency}{formatNumber(wholesaleVal, precision)}
                        </span>
                      </div>
                    </div>

                    {/* 3. Buying Rate (Sky Blue styling) - COMPLETELY OMITTED when lock is active */}
                    {!isBuyingLocked && (
                      <div className="rounded-lg bg-sky-500/10 dark:bg-sky-950/40 p-1.5 sm:p-2 border border-sky-400/30 dark:border-sky-600/50">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                            {t.buy || "Buying"}
                          </span>
                          <span className="text-[7px] sm:text-[8px] font-bold text-sky-700/80 dark:text-sky-300/70 truncate">
                            /{item.buyingPriceUnit || 'Unit'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-black text-sky-950 dark:text-sky-100 font-mono">
                            {currency}{formatNumber(buyingVal, precision)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock & Updated Date: Combined in a single row to save maximum space */}
                  <div className="pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[8px] sm:text-[9px] font-bold">
                    <span className="flex items-center gap-1 opacity-80 truncate">
                      <Package size={10} className="opacity-50 shrink-0" />
                      {item.quantity} {item.unit}
                    </span>
                    <span 
                      className="flex items-center gap-1 font-mono text-[8px] opacity-60 shrink-0" 
                      title={`Updated: ${itemDate ? new Date(itemDate).toLocaleString() : 'N/A'}`}
                    >
                      <Clock size={9} className="opacity-60 shrink-0" />
                      {formatCompactDate(itemDate)}
                    </span>
                  </div>

                  {/* Extra Notes if present (Ultra compact) */}
                  {item.notes && (
                    <div className="p-1.5 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                      <p className="text-[8px] opacity-70 italic line-clamp-1 leading-tight" title={item.notes}>
                        "{item.notes}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Delta Bar: Visible when 2 items are compared */}
          {deltaInsights && (
            <div className="rounded-xl bg-[var(--foreground)]/5 border border-[var(--border)] p-2 sm:p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowUpDown size={12} className="text-[var(--primary)] shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--primary)]">
                  Comparative Delta
                </span>
              </div>
              <div className={cn(
                "grid gap-1.5 text-[8.5px] sm:text-[9.5px]",
                !isBuyingLocked ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"
              )}>
                {/* Retail Diff */}
                <div className="p-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                  <span className="opacity-60 font-semibold">{t.retail || "Retail"} Diff:</span>
                  <span className={cn(
                    "font-mono font-black",
                    deltaInsights.retailDiff === 0 ? "opacity-60" : deltaInsights.retailDiff > 0 ? "text-red-900/90 dark:text-red-300" : "text-emerald-500"
                  )}>
                    {deltaInsights.retailDiff === 0 ? 'Equal' : `${deltaInsights.retailDiff > 0 ? '+' : ''}${currency}${formatNumber(deltaInsights.retailDiff, precision)}`}
                  </span>
                </div>

                {/* Wholesale Diff */}
                <div className="p-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                  <span className="opacity-60 font-semibold">{t.wholesale || "Wholesale"} Diff:</span>
                  <span className={cn(
                    "font-mono font-black",
                    deltaInsights.wholesaleDiff === 0 ? "opacity-60" : deltaInsights.wholesaleDiff > 0 ? "text-amber-800 dark:text-amber-400" : "text-emerald-500"
                  )}>
                    {deltaInsights.wholesaleDiff === 0 ? 'Equal' : `${deltaInsights.wholesaleDiff > 0 ? '+' : ''}${currency}${formatNumber(deltaInsights.wholesaleDiff, precision)}`}
                  </span>
                </div>

                {/* Buying Diff (Only shown when unlocked; omitted completely when locked) */}
                {!isBuyingLocked && deltaInsights.buyingDiff !== null && (
                  <div className="col-span-2 sm:col-span-1 p-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                    <span className="opacity-60 font-semibold">{t.buy || "Buying"} Diff:</span>
                    <span className={cn(
                      "font-mono font-black",
                      deltaInsights.buyingDiff === 0 ? "opacity-60" : deltaInsights.buyingDiff > 0 ? "text-sky-700 dark:text-sky-400" : "text-emerald-500"
                    )}>
                      {deltaInsights.buyingDiff === 0 ? 'Equal' : `${deltaInsights.buyingDiff > 0 ? '+' : ''}${currency}${formatNumber(deltaInsights.buyingDiff, precision)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Close: High-density button */}
        <div className="pt-2 mt-2 border-t border-[var(--border)] flex justify-end shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="h-8 px-4 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer hover:bg-[var(--foreground)]/5 border-[var(--border)]"
          >
            {t.close || "Close"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ComparisonModal;
