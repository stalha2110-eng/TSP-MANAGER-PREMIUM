import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Check, TrendingUp, Eye, Edit2, Trash2, Lock } from 'lucide-react';
import { Button } from './ui/Button';
import { cn, formatNumber } from '../lib/utils';
import { Item, LanguageType } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

export interface ItemCardProps {
  item: Item; 
  isLocked: boolean; 
  language: LanguageType;
  precision: number;
  onEdit: () => void;
  onDelete: () => void;
  t: any;
  onUpdateItem: (id: string, updates: Partial<Item>) => void;
  isSelected: boolean;
  anyItemsSelected: boolean;
  onSelect: () => void;
  onPeek?: (preview: { type: 'item' | 'customer' | 'bill' | 'notification' | 'analytics'; payload: any }) => void;
}

export const ItemCard = React.memo(({ item, isLocked, language, precision, onEdit, onDelete, t, onUpdateItem, isSelected, anyItemsSelected, onSelect, onPeek }: ItemCardProps) => {

  const category = DEFAULT_CATEGORIES.find(c => c.id === item.categoryId);
  const name = (item.translations && (item.translations[language] || item.translations.en)) || item.name;
  
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [justSelected, setJustSelected] = useState(false);

  useEffect(() => {
    if (isSelected) {
      setJustSelected(true);
      const timer = setTimeout(() => {
        setJustSelected(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setJustSelected(false);
    }
  }, [isSelected]);

  const holdTimerRef = React.useRef<any>(null);
  const progressIntervalRef = React.useRef<any>(null);
  const pointerStartRef = React.useRef<{ x: number, y: number } | null>(null);
  const hasMovedRef = React.useRef<boolean>(false);

  const startHold = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only process left click/primary touch
    if ((e.target as HTMLElement).closest('button')) return;
    
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    
    if (anyItemsSelected) {
      return;
    }
    
    setIsHolding(true);
    setHoldProgress(0);
    
    const duration = 1500;
    const intervalTime = 50;
    let elapsed = 0;
    
    holdTimerRef.current = setTimeout(() => {
      onSelect();
      if (navigator.vibrate) navigator.vibrate(100);
      cancelHold();
    }, duration);

    progressIntervalRef.current = setInterval(() => {
      elapsed += intervalTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(pct);
    }, intervalTime);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      hasMovedRef.current = true;
      cancelHold();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    cancelHold();
    
    if (pointerStartRef.current && !hasMovedRef.current) {
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) {
        if (anyItemsSelected) {
          onSelect();
        }
      }
    }
    pointerStartRef.current = null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Falls back/stops propagation
    if (anyItemsSelected) {
      e.stopPropagation();
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isSelected ? {
        opacity: 1,
        scale: justSelected ? [1, 1.05, 1.01] : 1.01,
        boxShadow: justSelected 
          ? "0 0 25px var(--primary), 0 10px 25px rgba(var(--primary-rgb), 0.3)" 
          : "0 10px 25px rgba(var(--primary-rgb), 0.15)",
      } : {
        opacity: 1,
        scale: 1,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
      }}
      whileHover={{ y: -6, scale: isSelected ? 1.025 : 1.018 }}
      whileTap={{ scale: 0.995 }}
      transition={{ 
        scale: { type: "spring", stiffness: 450, damping: 14 },
        boxShadow: { duration: justSelected ? 0.4 : 0.2 },
        opacity: { duration: 0.2 }
      }}
      className={`card group overflow-hidden border-2 relative select-none cursor-pointer transition-all duration-200 outline-none focus-within:ring-4 focus-within:ring-[var(--primary)]/40 focus:ring-4 focus:ring-[var(--primary)]/40 ${
        isSelected ? 'border-[var(--primary)] shadow-2xl' : 'border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-xl'
      }`}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={startHold}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onPointerMove={handlePointerMove}
      onClick={handleCardClick}
    >
      {/* Temporary selection expanding glow border */}
      <AnimatePresence>
        {justSelected && (
          <motion.div 
            initial={{ opacity: 0.8, scale: 0.96 }}
            animate={{ opacity: [0.8, 1, 0], scale: [0.96, 1.04, 1.08] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="absolute inset-x-0 inset-y-0 rounded-[inherit] border-4 border-[var(--primary)] pointer-events-none z-40 select-none shadow-[0_0_35px_var(--primary)]"
          />
        )}
      </AnimatePresence>

      {/* Hold Visual Overlay */}
      {isHolding && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-45 select-none pointer-events-none">
          <div className="text-white text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 animate-pulse">
            <Clock size={11} /> Hold to select ({((1500 - (holdProgress / 100 * 1500)) / 1000).toFixed(1)}s)
          </div>
          <div className="w-1/2 h-1.5 rounded-full bg-white/20 overflow-hidden border border-white/10 shadow-inner">
            <div className="h-full bg-[var(--primary)] transition-all duration-75" style={{ width: `${holdProgress}%` }} />
          </div>
        </div>

      )}
      {/* Selection Badge */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-30 bg-[var(--primary)] text-white p-1 rounded-full shadow-lg border border-white/20">
          <Check size={16} strokeWidth={4} />
        </div>
      )}

      <div className="relative p-4 cursor-pointer">
        {/* Glow effect on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-transparent transition-opacity duration-500 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`} />
        
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex gap-3 items-center min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xl shadow-inner group-hover:scale-105 transition-transform duration-500 ${
              isSelected ? 'bg-[var(--primary)] text-white border-white/20' : 'bg-[var(--background)] border-[var(--border)]'
            }`}>
              {isSelected ? <TrendingUp size={18} /> : (category?.icon || '📦')}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)] truncate leading-tight">{name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-1.5 py-0.5 text-[8.5px] font-bold text-[var(--primary)] uppercase tracking-tight leading-none">
                  {category?.name}
                </span>
                <span className={cn(
                  "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border select-none leading-none",
                  item.quantity <= 0
                    ? "text-red-500 bg-red-500/10 border-red-500/20"
                    : item.quantity <= (item.minStockLevel ?? 10)
                      ? "text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse"
                      : "text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
                )}>
                  Stock: {item.quantity} {item.unit === 'Chatak' ? 'Chatak (50gm)' : item.unit} {item.quantity <= (item.minStockLevel ?? 10) && "⚠️"}
                </span>
                <span className="text-[8.5px] opacity-35 font-mono select-none" title={`${t.lastCheck}: ${new Date(item.lastUpdated).toLocaleDateString()}`}>
                  U: {new Date(item.lastUpdated).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0 z-10 transition-all duration-200 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100">
            {onPeek && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  onPeek({ type: 'item', payload: item });
                }} 
                className="h-8 w-8 rounded-[var(--radius,9999px)] bg-[var(--background)] border border-[var(--border)] text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
                title="Quick Peek"
              >
                <Eye size={14} />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }} 
              className="h-8 w-8 rounded-[var(--radius,9999px)] bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
              title="Edit Item"
            >
              <Edit2 size={13} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }} 
              className="h-8 w-8 rounded-[var(--radius,9999px)] bg-[var(--background)] border border-[var(--border)] text-red-500 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
              title="Delete Item"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
        
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center relative z-10">
          {/* Retail */}
          <div className="rounded-xl bg-[var(--primary)]/5 p-2 border border-[var(--primary)]/15">
            <p className="text-[8.5px] font-black uppercase tracking-wider text-[var(--primary)] opacity-75 mb-0.5">{t.retail}</p>
            <p className="text-xs font-black text-[var(--foreground)] truncate">₹{formatNumber(item.retailPrice, precision)}</p>
            <p className="text-[7.5px] opacity-40">/ {item.retailPriceUnit === 'Chatak' ? 'Chatak (50gm)' : item.retailPriceUnit}</p>
          </div>

          {/* Wholesale */}
          <div className="rounded-xl bg-[var(--foreground)]/[0.02] p-2 border border-[var(--border)]/60">
            <p className="text-[8.5px] font-black uppercase tracking-wider opacity-45 mb-0.5">{t.wholesale}</p>
            <p className="text-xs font-black text-[var(--foreground)] truncate">₹{formatNumber(item.wholesalePrice, precision)}</p>
            <p className="text-[7.5px] opacity-40">/ {item.wholesalePriceUnit === 'Chatak' ? 'Chatak (50gm)' : item.wholesalePriceUnit}</p>
          </div>

          {/* Buy */}
          <div className="rounded-xl bg-[var(--foreground)]/[0.02] p-2 border border-[var(--border)]/60">
            <p className="text-[8.5px] font-black uppercase tracking-wider opacity-45 mb-0.5">{t.buy}</p>
            <div className="flex flex-col items-center justify-center">
              {isLocked ? (
                <Lock size={10} className="opacity-40" />
              ) : (
                <>
                  <p className="text-xs font-black text-[var(--foreground)] truncate">₹{formatNumber(item.buyingPrice, precision)}</p>
                  <p className="text-[7.5px] opacity-40">/ {item.buyingPriceUnit === 'Chatak' ? 'Chatak (50gm)' : item.buyingPriceUnit}</p>
                </>
              )}
            </div>
          </div>

          {/* Profit Margin */}
          <div className="rounded-xl bg-emerald-500/5 p-2 border border-emerald-500/15">
            <p className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600 opacity-75 mb-0.5">{t.margin}</p>
            <div className="flex flex-col items-center justify-center">
              {isLocked ? (
                <Lock size={10} className="opacity-40" />
              ) : (
                <>
                  <p className="text-xs font-black text-emerald-600 truncate">₹{formatNumber(item.retailPrice - item.buyingPrice, precision)}</p>
                  <p className="text-[7.5px] text-emerald-500 font-bold leading-none">
                    {item.buyingPrice > 0 ? `+${formatNumber(((item.retailPrice - item.buyingPrice) / item.buyingPrice) * 100, 1)}%` : '---'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notes / Extra Info Section */}
        {item.notes && (
          <div className="mt-2.5 p-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10 relative z-10">
            <p className="text-[9px] font-medium leading-relaxed opacity-70 italic">“{item.notes}”</p>
          </div>
        )}


      </div>
    </motion.div>
  );
});
