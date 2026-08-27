import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Scale, IndianRupee, Sparkles, Plus, Minus, Check, X, Package, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COMMON_WEIGHT_PRESETS, COMMON_BUDGET_PRESETS, calculateWeightFromAmount, isWeightBasedUnit, WeightPreset } from '../utils/weightHelpers';
import { cn, formatNumber } from '../lib/utils';
import { Item } from '../types';

export const PIECE_PRESETS: WeightPreset[] = [
  { label: '1 pc', qty: 1, shortLabel: '1' },
  { label: '2 pcs', qty: 2, shortLabel: '2' },
  { label: '3 pcs', qty: 3, shortLabel: '3' },
  { label: '4 pcs', qty: 4, shortLabel: '4' },
  { label: '5 pcs', qty: 5, shortLabel: '5' },
  { label: '6 pcs', qty: 6, shortLabel: '6' },
  { label: '10 pcs', qty: 10, shortLabel: '10' },
  { label: '12 pcs', qty: 12, shortLabel: '12' },
  { label: '20 pcs', qty: 20, shortLabel: '20' },
  { label: '24 pcs', qty: 24, shortLabel: '24' },
  { label: '50 pcs', qty: 50, shortLabel: '50' },
  { label: '100 pcs', qty: 100, shortLabel: '100' },
];

interface QuickWeightPresetsProps {
  currentQty: number;
  unitPrice: number;
  unit?: string;
  precision?: number;
  onSelectQty: (qty: number) => void;
  compact?: boolean;
  align?: 'left' | 'right' | 'center';
  label?: string;
  customPresets?: WeightPreset[];
}

export const QuickWeightPresets: React.FC<QuickWeightPresetsProps> = ({
  currentQty,
  unitPrice,
  unit = 'kg',
  precision = 2,
  onSelectQty,
  compact = false,
  align = 'right',
  label,
  customPresets
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'weights' | 'amount'>('weights');
  const [customAmount, setCustomAmount] = useState<string>('');
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'bottom'
  });

  const isWeightItem = isWeightBasedUnit(unit);
  const activePresets = isWeightItem 
    ? ((customPresets && customPresets.length > 0) ? customPresets : COMMON_WEIGHT_PRESETS)
    : PIECE_PRESETS;

  // Calculate coordinates relative to viewport for Portal rendering
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    
    const popoverWidth = Math.min(320, window.innerWidth - 20);
    const popoverHeight = 320;
    
    let left = rect.right - popoverWidth;
    if (align === 'left') {
      left = rect.left;
    } else if (align === 'center') {
      left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    }
    
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }

    let top = rect.bottom + 6;
    let placement: 'top' | 'bottom' = 'bottom';

    if (rect.bottom + popoverHeight > window.innerHeight && rect.top > popoverHeight + 10) {
      top = rect.top - popoverHeight - 6;
      placement = 'top';
    }

    if (top < 10) top = 10;

    setPosition({ top, left, placement });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current && 
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleApplyAmount = (amountNum: number) => {
    if (amountNum > 0 && unitPrice > 0) {
      const calculatedQty = calculateWeightFromAmount(amountNum, unitPrice, 3);
      onSelectQty(calculatedQty);
      setIsOpen(false);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "rounded-md border flex items-center justify-center gap-1 transition-all cursor-pointer select-none active:scale-95 shrink-0 z-10",
          compact 
            ? "h-5 px-1.5 text-[8px] font-bold" 
            : "h-6 px-2 text-[9px] font-black uppercase tracking-wider",
          isOpen
            ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
            : "bg-[var(--foreground)]/5 hover:bg-[var(--primary)]/15 text-[var(--foreground)]/85 hover:text-[var(--primary)] border-[var(--border)]"
        )}
        title="Quick Weight Presets & Rupee Converter"
      >
        <Scale size={compact ? 10 : 11} className={cn("shrink-0", isOpen ? "text-white" : "text-amber-500")} />
        <span className="font-mono">{label || (isWeightItem ? 'Weight' : 'Qty')}</span>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-[99998] bg-black/20 backdrop-blur-[0.5px]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              />

              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.95, y: position.placement === 'top' ? 8 : -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: position.placement === 'top' ? 8 : -8 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                style={{
                  position: 'fixed',
                  top: `${position.top}px`,
                  left: `${position.left}px`,
                  width: `${Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 20 : 320)}px`,
                  zIndex: 99999
                }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-3 text-[var(--foreground)] backdrop-blur-xl select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header & Tabs */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2.5">
                  <div className="flex items-center gap-1 p-0.5 bg-[var(--foreground)]/5 rounded-xl border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setActiveTab('weights')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                        activeTab === 'weights'
                          ? "bg-[var(--primary)] text-white shadow-xs"
                          : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
                      )}
                    >
                      <Scale size={11} />
                      <span>{isWeightItem ? 'Weight Presets' : 'Quick Qty'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('amount')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                        activeTab === 'amount'
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
                      )}
                    >
                      <IndianRupee size={11} />
                      <span>₹ to Weight</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="text-right">
                      <span className="text-[8.5px] opacity-60 font-medium block">₹{formatNumber(unitPrice, precision)}/{unit}</span>
                      <span className="text-[10px] font-black font-mono text-[var(--primary)] block leading-none">
                        {currentQty} {unit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="h-5 w-5 rounded-full hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* TAB 1: QUICK WEIGHT CHIPS */}
                {activeTab === 'weights' && (
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[8.5px] font-black uppercase tracking-wider opacity-50 mb-1.5 flex items-center justify-between">
                        <span>1-Tap Exact Quantities</span>
                        {isWeightItem && <span className="text-amber-500 font-bold">1.25kg, 1.5kg...</span>}
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
                        {activePresets.map((preset, idx) => {
                          const isSelected = Math.abs(currentQty - preset.qty) < 0.001;
                          const priceVal = preset.qty * unitPrice;
                          return (
                            <button
                              key={`preset-${preset.qty}-${preset.label}-${idx}`}
                              type="button"
                              onClick={() => {
                                onSelectQty(preset.qty);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "p-1.5 rounded-xl border text-center transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center",
                                isSelected
                                  ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm font-black ring-2 ring-[var(--primary)]/30"
                                  : "bg-[var(--foreground)]/5 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 border-[var(--border)]"
                              )}
                            >
                              <span className="text-[10.5px] font-black font-mono leading-none">{preset.label}</span>
                              <span className={cn(
                                "text-[7.5px] font-mono mt-0.5 leading-none",
                                isSelected ? "text-amber-200" : "opacity-60"
                              )}>
                                ₹{formatNumber(priceVal, 0)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rapid Increments / Decrements */}
                    <div className="pt-2 border-t border-[var(--border)]">
                      <div className="text-[8.5px] font-black uppercase tracking-wider opacity-50 mb-1 flex items-center justify-between">
                        <span>Rapid Step (+ / -)</span>
                        <span className="opacity-50">Current: {currentQty}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {(isWeightItem ? [0.25, 0.5, 1.0, 2.0] : [1, 2, 5, 10]).map((step, idx) => {
                          const stepLabel = isWeightItem 
                            ? (step >= 1 ? `+${step}kg` : `+${step * 1000}g`)
                            : `+${step}`;
                          return (
                            <button
                              key={`step-${step}-${idx}`}
                              type="button"
                              onClick={() => {
                                const newQ = +(currentQty + step).toFixed(3);
                                onSelectQty(newQ);
                              }}
                              className="py-1.5 px-1 rounded-lg bg-[var(--foreground)]/5 hover:bg-emerald-600 hover:text-white border border-[var(--border)] text-[9.5px] font-black font-mono transition-all flex items-center justify-center gap-0.5 cursor-pointer active:scale-95"
                            >
                              <Plus size={10} strokeWidth={3} />
                              <span>{stepLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: RUPEE AMOUNT TO WEIGHT */}
                {activeTab === 'amount' && (
                  <div className="space-y-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <div className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5 flex items-center gap-1">
                        <Sparkles size={11} />
                        <span>Customer Rupee Budget Mode</span>
                      </div>
                      <p className="text-[9.5px] opacity-75 leading-tight">
                        Enter rupee budget (e.g. ₹100) to auto-calculate weight from ₹{formatNumber(unitPrice, precision)}/{unit}.
                      </p>
                    </div>

                    <div>
                      <div className="text-[8.5px] font-black uppercase tracking-wider opacity-50 mb-1">
                        Popular Rupee Budgets
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {COMMON_BUDGET_PRESETS.map((amt, idx) => {
                          const computedWeight = calculateWeightFromAmount(amt, unitPrice, 3);
                          return (
                            <button
                              key={`budget-${amt}-${idx}`}
                              type="button"
                              onClick={() => handleApplyAmount(amt)}
                              className="p-1.5 rounded-xl bg-[var(--foreground)]/5 hover:bg-emerald-600 hover:text-white border border-[var(--border)] hover:border-emerald-500 transition-all text-center cursor-pointer active:scale-95"
                            >
                              <span className="text-[10.5px] font-black font-mono block leading-none">₹{amt}</span>
                              <span className="text-[7.5px] font-mono opacity-70 block mt-0.5">
                                {computedWeight} {unit}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border)]">
                      <div className="text-[8.5px] font-black uppercase tracking-wider opacity-50 mb-1">
                        Custom Amount (₹)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold opacity-50">₹</span>
                          <input
                            type="number"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="e.g. 150"
                            className="w-full pl-6 pr-2 py-1.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseFloat(customAmount);
                                if (!isNaN(val) && val > 0) {
                                  handleApplyAmount(val);
                                }
                              }
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const val = parseFloat(customAmount);
                            if (!isNaN(val) && val > 0) {
                              handleApplyAmount(val);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Check size={12} strokeWidth={3} />
                          <span>Apply</span>
                        </button>
                      </div>

                      {parseFloat(customAmount) > 0 && unitPrice > 0 && (
                        <div className="mt-1.5 text-center text-[10.5px] font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 py-1 rounded-lg border border-emerald-500/20">
                          ₹{customAmount} = {calculateWeightFromAmount(parseFloat(customAmount), unitPrice, 3)} {unit}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

/* =========================================================================
   ITEM HOLD WEIGHT MODAL (TRIGGERED ON PRESS & HOLD ON ITEM CARDS)
   ========================================================================= */

interface ItemHoldWeightModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectQty: (item: Item, qty: number) => void;
  unitPrice: number;
  currentQty?: number;
  customPresets?: WeightPreset[];
  precision?: number;
}

export const ItemHoldWeightModal: React.FC<ItemHoldWeightModalProps> = ({
  item,
  isOpen,
  onClose,
  onSelectQty,
  unitPrice,
  currentQty = 1,
  customPresets,
  precision = 2
}) => {
  const [activeTab, setActiveTab] = useState<'weights' | 'amount'>('weights');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [manualQty, setManualQty] = useState<string>(currentQty.toString());

  useEffect(() => {
    if (isOpen) {
      setManualQty(currentQty.toString());
      setCustomAmount('');
      setActiveTab('weights');
    }
  }, [isOpen, currentQty]);

  if (!item || !isOpen) return null;

  const unit = item.unit || 'kg';
  const isWeightItem = isWeightBasedUnit(unit);
  const activePresets = isWeightItem 
    ? ((customPresets && customPresets.length > 0) ? customPresets : COMMON_WEIGHT_PRESETS)
    : PIECE_PRESETS;

  const handleApplyPreset = (qtyVal: number) => {
    onSelectQty(item, qtyVal);
    onClose();
  };

  const handleApplyRupeeAmount = (amountNum: number) => {
    if (amountNum > 0 && unitPrice > 0) {
      const calculatedQty = calculateWeightFromAmount(amountNum, unitPrice, 3);
      onSelectQty(item, calculatedQty);
      onClose();
    }
  };

  const handleApplyManualQty = () => {
    const q = parseFloat(manualQty);
    if (!isNaN(q) && q > 0) {
      onSelectQty(item, q);
      onClose();
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-[var(--foreground)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner with Product Details */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-[var(--primary)]/10 via-[var(--card)] to-[var(--background)] border-b border-[var(--border)] relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 h-7 w-7 rounded-full bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 flex items-center justify-center text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-md shadow-[var(--primary)]/20 shrink-0">
                <Scale size={22} />
              </div>

              <div className="flex-1 pr-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                    Hold Quick Weight Card
                  </span>
                  <span className="text-[8px] font-bold opacity-50 uppercase">
                    ({item.unit || 'pcs'})
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase text-[var(--foreground)] truncate mt-0.5">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-black font-mono text-[var(--primary)]">
                    ₹{formatNumber(unitPrice, precision)}
                  </span>
                  <span className="text-[9px] font-bold opacity-50">
                    / {item.unit || 'kg'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setActiveTab('weights')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === 'weights'
                    ? "bg-[var(--primary)] text-white shadow-md"
                    : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
                )}
              >
                <Scale size={14} />
                <span>{isWeightItem ? 'Weight Presets' : 'Quantity Presets'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('amount')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === 'amount'
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
                )}
              >
                <IndianRupee size={14} />
                <span>₹ to Weight</span>
              </button>
            </div>

            {/* TAB 1: WEIGHT CHIPS PRESETS */}
            {activeTab === 'weights' && (
              <div className="space-y-3.5">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-2 flex items-center justify-between">
                    <span>1-Tap Weight Chips (Select to Add to Cart)</span>
                    <span className="text-amber-500 font-bold">{activePresets.length} chips</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-0.5 no-scrollbar">
                    {activePresets.map((preset, idx) => {
                      const isSelected = Math.abs(currentQty - preset.qty) < 0.001;
                      const priceVal = preset.qty * unitPrice;
                      return (
                        <button
                          key={`hold-preset-${preset.qty}-${preset.label}-${idx}`}
                          type="button"
                          onClick={() => handleApplyPreset(preset.qty)}
                          className={cn(
                            "p-2.5 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center hover:shadow-md",
                            isSelected
                              ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm font-black ring-2 ring-[var(--primary)]/40"
                              : "bg-[var(--foreground)]/5 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 border-[var(--border)]"
                          )}
                        >
                          <span className="text-xs sm:text-sm font-black font-mono leading-none">
                            {preset.label}
                          </span>
                          <span className={cn(
                            "text-[8.5px] font-mono mt-1 font-bold",
                            isSelected ? "text-amber-200" : "opacity-60"
                          )}>
                            ₹{formatNumber(priceVal, 0)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual Quantity Input with Step Buttons */}
                <div className="pt-3 border-t border-[var(--border)]">
                  <div className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1.5">
                    Custom Quantity Value ({unit})
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl p-1 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseFloat(manualQty) || 1;
                          const step = isWeightItem ? 0.25 : 1;
                          const nextVal = Math.max(0.05, +(cur - step).toFixed(3));
                          setManualQty(nextVal.toString());
                        }}
                        className="h-8 w-8 rounded-xl hover:bg-[var(--foreground)]/10 flex items-center justify-center font-bold text-base cursor-pointer active:scale-95"
                      >
                        <Minus size={14} />
                      </button>

                      <input
                        type="number"
                        step="any"
                        value={manualQty}
                        onChange={(e) => setManualQty(e.target.value)}
                        placeholder="1.0"
                        className="w-full text-center bg-transparent text-sm font-mono font-black outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseFloat(manualQty) || 1;
                          const step = isWeightItem ? 0.25 : 1;
                          const nextVal = +(cur + step).toFixed(3);
                          setManualQty(nextVal.toString());
                        }}
                        className="h-8 w-8 rounded-xl hover:bg-[var(--foreground)]/10 flex items-center justify-center font-bold text-base cursor-pointer active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyManualQty}
                      className="px-4 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <ShoppingCart size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RUPEE BUDGET CALCULATOR */}
            {activeTab === 'amount' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Customer Rupee Budget Mode</span>
                  </div>
                  <p className="text-[10px] opacity-80 leading-relaxed">
                    Customer says "₹50 ka {item.name}"? Tap below or type the amount to calculate the exact weight automatically.
                  </p>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1.5">
                    Popular Rupee Budgets
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {COMMON_BUDGET_PRESETS.map((amt, idx) => {
                      const computedWeight = calculateWeightFromAmount(amt, unitPrice, 3);
                      return (
                        <button
                          key={`hold-budget-${amt}-${idx}`}
                          type="button"
                          onClick={() => handleApplyRupeeAmount(amt)}
                          className="p-2 rounded-2xl bg-[var(--foreground)]/5 hover:bg-emerald-600 hover:text-white border border-[var(--border)] hover:border-emerald-500 transition-all text-center cursor-pointer active:scale-95"
                        >
                          <span className="text-xs font-black font-mono block leading-none">₹{amt}</span>
                          <span className="text-[8px] font-mono opacity-70 block mt-1">
                            {computedWeight} {unit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <div className="text-[9px] font-black uppercase tracking-wider opacity-50 mb-1.5">
                    Custom Amount (₹)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold opacity-50">₹</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="e.g. 150"
                        className="w-full pl-8 pr-3 py-2 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl text-sm font-mono font-bold outline-none focus:border-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseFloat(customAmount);
                            if (!isNaN(val) && val > 0) {
                              handleApplyRupeeAmount(val);
                            }
                          }
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(customAmount);
                        if (!isNaN(val) && val > 0) {
                          handleApplyRupeeAmount(val);
                        }
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Check size={14} strokeWidth={3} />
                      <span>Apply</span>
                    </button>
                  </div>

                  {parseFloat(customAmount) > 0 && unitPrice > 0 && (
                    <div className="mt-2 text-center text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 py-1.5 rounded-xl border border-emerald-500/20">
                      ₹{customAmount} = {calculateWeightFromAmount(parseFloat(customAmount), unitPrice, 3)} {unit}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  ) : null;
};
