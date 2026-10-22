import React from 'react';
import { motion } from 'motion/react';
import { AppSettings, LanguageType } from '../types';
import { ShoppingCart, Plus, ArrowRight, Sparkles } from 'lucide-react';

interface AnimatedAddItemButtonProps {
  onClick: () => void;
  itemsCount?: number;
  currentLang: LanguageType;
  settings?: Partial<AppSettings>;
}

export function AnimatedAddItemButton({
  onClick,
  currentLang,
}: AnimatedAddItemButtonProps) {
  // Label explicitly set to 'All Items' as requested (with localization for hi/mr)
  const allItemsLabel = currentLang === 'hi'
    ? 'सभी सामान'
    : currentLang === 'mr'
      ? 'सर्व सामान'
      : 'All Items';

  const subtitleText = currentLang === 'hi'
    ? 'सभी सामान कैटलॉग • बिल में जोड़ें'
    : currentLang === 'mr'
      ? 'सर्व सामान कॅटलॉग • बिलात जोडा'
      : 'Browse all items catalog & add to cart';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(18);
      } catch {
        // Ignore browser vibration restrictions silently
      }
    }
    onClick();
  };

  return (
    <motion.button
      id="billing-view-all-items-btn"
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.006, y: -1 }}
      whileTap={{ scale: 0.99, y: 0 }}
      transition={{ duration: 0.15 }}
      style={{ height: '58px', marginLeft: '0px', paddingLeft: '7px' }}
      className="w-full h-[58px] ml-0 pl-[7px] pr-4 sm:pr-5 rounded-2xl bg-indigo-950 text-white py-2.5 cursor-pointer group shadow-xl shadow-indigo-600/30 dark:shadow-indigo-950/60 hover:shadow-indigo-500/40 border border-indigo-400/30 hover:border-indigo-300/50 flex items-center justify-between gap-3 transition-all select-none relative overflow-hidden"
      title="Open All Items Catalog to add products to bill"
      aria-label="Add Items to Bill"
    >
      {/* Rich Inner Core Body */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-800 via-indigo-900 to-blue-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 transition-colors pointer-events-none shadow-inner" />

      {/* Glass Top Highlight & Subtle Inner Depth Bevel */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.14] via-transparent to-black/[0.2] pointer-events-none border border-white/15 rounded-2xl" />

      {/* Luminous Shimmer Sheen moving across the button face */}
      <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none animate-shimmer-sweep" />

      {/* Ambient hover glow streak */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.08] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Left: Trolley Icon Box & Command Typography */}
      <div className="flex items-center gap-3.5 min-w-0 z-10">
        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/20 border border-white/30 backdrop-blur-xs flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 group-hover:scale-105 shadow-inner transition-all">
          <motion.div
            animate={{ 
              scale: [1, 1.06, 1],
              rotate: [0, -2, 2, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex items-center justify-center"
          >
            {/* Trolley / Shopping Cart Icon */}
            <ShoppingCart size={20} className="text-white drop-shadow-xs" />
            <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-amber-400 text-indigo-950 flex items-center justify-center shadow-xs border border-white/60">
              <Plus size={10} strokeWidth={4} />
            </span>
          </motion.div>
        </div>

        <div className="flex flex-col text-left justify-center min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm sm:text-base font-black tracking-wider uppercase text-white drop-shadow-xs whitespace-nowrap">
              + Add Items to Bill
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-indigo-100 text-[10px] font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
              <Sparkles size={9} className="text-amber-300" />
              <span>All Items</span>
            </span>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-indigo-100/90 truncate">
            {subtitleText}
          </span>
        </div>
      </div>

      {/* Right: High-Contrast Hero Action Pill with 'All Items' */}
      <div className="flex items-center gap-2 shrink-0 z-10">
        <div 
          style={{ height: '36px' }}
          className="h-[36px] px-3 sm:px-4 rounded-xl bg-white text-indigo-700 font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 group-hover:bg-indigo-50 group-hover:shadow-md transition-all"
        >
          <span>{allItemsLabel}</span>
          <ArrowRight
            size={14}
            strokeWidth={2.8}
            className="text-indigo-600 group-hover:translate-x-0.5 transition-transform"
          />
        </div>
      </div>
    </motion.button>
  );
}
