import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  id?: string;
}

export function NavButton({ active, icon, label, onClick, id }: NavButtonProps) {
  return (
    <motion.button 
      id={id}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 py-1.5 px-4 select-none cursor-pointer group focus:outline-none"
    >
      {/* Sliding Background Tab Pill */}
      {active && (
        <motion.div
          layoutId="active-tab-indicator"
          className="absolute inset-0 bg-[var(--primary)]/10 dark:bg-[var(--primary)]/15 border border-[var(--primary)]/15 rounded-2xl shadow-xs"
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
        />
      )}

      {/* Animated Floating Icon Container */}
      <motion.div
        animate={active ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className={cn(
          "rounded-full p-1 transition-colors duration-200 z-10",
          active ? "text-[var(--primary)] bg-[var(--primary)]/5" : "text-[var(--foreground)] opacity-40 group-hover:opacity-75"
        )}
      >
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      </motion.div>

      {/* Scale & Contrast Text */}
      <motion.span
        animate={active ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.5 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={cn(
          "text-[9px] uppercase tracking-wider font-extrabold z-10 leading-none transition-colors duration-200",
          active ? "text-[var(--primary)]" : "text-[var(--foreground)] group-hover:text-[var(--foreground)]/80"
        )}
      >
        {label}
      </motion.span>

      {/* Dynamic Sliding Anchor Anchor Dot */}
      {active && (
        <motion.div 
          layoutId="active-nav-dot" 
          className="h-1 w-1.5 rounded-full bg-[var(--primary)] mt-0.5 z-10" 
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
        />
      )}
    </motion.button>
  );
}
