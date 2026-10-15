import React from 'react';
import { motion } from 'motion/react';
import { AppSettings, LanguageType } from '../types';
import { cleanAndValidateText } from '../services/languageEngine';
import { ShoppingCart, Plus, ChevronRight } from 'lucide-react';

interface AnimatedAddItemButtonProps {
  onClick: () => void;
  itemsCount?: number;
  currentLang: LanguageType;
  settings?: Partial<AppSettings>;
}

export function AnimatedAddItemButton({
  onClick,
  currentLang,
  settings
}: AnimatedAddItemButtonProps) {
  return (
    <motion.button
      id="billing-view-all-items-btn"
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.008 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3.5 py-2 cursor-pointer group shadow-sm hover:shadow border border-indigo-500/50 flex items-center justify-between gap-3 transition-colors select-none"
    >
      {/* Left: Shopping Trolley Icon & Label */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 transition-colors">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex items-center justify-center"
          >
            {/* Trolley / Shopping Cart Icon */}
            <ShoppingCart size={17} className="text-white" />
            <Plus size={8} strokeWidth={3.5} className="absolute -top-1 -right-1.5 text-amber-300 drop-shadow-xs" />
          </motion.div>
        </div>

        <div className="flex items-baseline gap-1.5 truncate text-left">
          <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
            + Add Items to Bill
          </span>
          <span className="text-[11px] font-medium text-indigo-200/90 whitespace-nowrap hidden sm:inline">
            ({cleanAndValidateText("सामान जोड़ें", currentLang, settings)})
          </span>
        </div>
      </div>

      {/* Right: Clean Action Indicator without Items Count */}
      <div className="flex items-center gap-1 shrink-0 text-white/80 group-hover:text-white transition-colors">
        <span className="text-[11px] font-semibold text-indigo-100 opacity-90 tracking-wide">
          {cleanAndValidateText("Select", currentLang, settings)}
        </span>
        <ChevronRight
          size={16}
          className="text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </motion.button>
  );
}
