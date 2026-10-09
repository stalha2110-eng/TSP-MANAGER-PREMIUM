import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedCalculatorIconProps {
  active: boolean;
  size?: number;
  className?: string;
}

export function AnimatedCalculatorIcon({ active, size = 22, className }: AnimatedCalculatorIconProps) {
  // Dimensions for calculators
  const w = size;
  const h = Math.round(size * 1.15);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: size + 8, height: size + 8 }}
    >
      {/* Dynamic 3D Morphing Dual Calculator Stage */}
      <div className="relative flex items-center justify-center w-full h-full perspective-[800px]">

        {/* =========================================================
            CALCULATOR 1: Universal Store Calculator
            Theme: Rounded modern store calculator with solar panel,
            green/amber LCD bar & classic numeric keypad
           ========================================================= */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            opacity: [1, 1, 0, 0, 1],
            scale: [1, 1.05, 0.72, 0.72, 1],
            rotateY: [0, 0, 90, 90, 0],
            y: [0, 0, -2, -2, 0]
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            times: [0, 0.42, 0.48, 0.94, 1],
            ease: "easeInOut"
          }}
        >
          <svg
            width={w}
            height={h}
            viewBox="0 0 24 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="overflow-visible filter drop-shadow-xs"
          >
            {/* Chassis 1: Rounded handheld store counter */}
            <rect
              x="2.5"
              y="2"
              width="19"
              height="24"
              rx="4.5"
              className={active ? "fill-white/20 stroke-white" : "fill-amber-500/15 stroke-amber-500 dark:stroke-amber-400"}
              strokeWidth="1.9"
            />

            {/* Solar Cell Grid on Top */}
            <rect
              x="6"
              y="4.2"
              width="12"
              height="2.4"
              rx="0.8"
              className={active ? "fill-white/30 stroke-none" : "fill-neutral-900/30 dark:fill-white/30 stroke-none"}
            />
            <line x1="10" y1="4.2" x2="10" y2="6.6" strokeWidth="0.8" className={active ? "stroke-white/40" : "stroke-neutral-800/40 dark:stroke-white/40"} />
            <line x1="14" y1="4.2" x2="14" y2="6.6" strokeWidth="0.8" className={active ? "stroke-white/40" : "stroke-neutral-800/40 dark:stroke-white/40"} />

            {/* LCD Screen Display */}
            <rect
              x="5"
              y="8"
              width="14"
              height="5.5"
              rx="1.4"
              className={active ? "fill-white/35 stroke-white" : "fill-emerald-500/20 stroke-emerald-600/60 dark:stroke-emerald-400/60"}
              strokeWidth="1.2"
            />
            {/* Live Typing Numbers Stream inside Store Calc */}
            <motion.path
              d="M7 10.8h4.5M14 10.8h2.5"
              strokeWidth="1.4"
              strokeLinecap="round"
              className={active ? "stroke-white" : "stroke-emerald-700 dark:stroke-emerald-300"}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />

            {/* Standard Keypad Grid (Round Store Keys) */}
            {/* Row 1 */}
            <circle cx="7" cy="16" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="17" cy="16" r="1.1" fill="currentColor" stroke="none" />

            {/* Row 2 */}
            <circle cx="7" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="17" cy="19.2" r="1.1" fill="currentColor" stroke="none" />

            {/* Row 3 - Plus / Equals Accent */}
            <circle cx="7" cy="22.5" r="1.1" fill="currentColor" stroke="none" />
            <line x1="11" y1="22.5" x2="17.5" y2="22.5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </motion.div>

        {/* =========================================================
            CALCULATOR 2: Pro POS Business Engine (Offline Store Assistant)
            Theme: Rugged POS Terminal register with tilted receipt printer head,
            live bar scanner line, digital matrix buttons & POS screen
           ========================================================= */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            opacity: [0, 0, 1, 1, 0],
            scale: [0.72, 0.72, 1, 1.05, 0.72],
            rotateY: [-90, -90, 0, 0, -90],
            y: [-2, -2, 0, 0, -2]
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            times: [0, 0.46, 0.52, 0.94, 1],
            ease: "easeInOut"
          }}
        >
          <svg
            width={w}
            height={h}
            viewBox="0 0 24 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="overflow-visible filter drop-shadow-xs"
          >
            {/* Chassis 2: High-Tech POS Smart Terminal Engine with Printer Lip */}
            {/* Top Thermal Printer Slot Roll */}
            <rect
              x="5"
              y="1"
              width="14"
              height="3.2"
              rx="1.5"
              className={active ? "fill-white/30 stroke-white" : "fill-neutral-900/25 dark:fill-white/20 stroke-current"}
              strokeWidth="1.4"
            />
            {/* Micro receipt feeding slit */}
            <line x1="8" y1="2.6" x2="16" y2="2.6" strokeWidth="1" className={active ? "stroke-white" : "stroke-amber-500"} />

            {/* Main POS Register Body (Chamfered angular shape) */}
            <path
              d="M3 4.5h18v18.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V4.5z"
              className={active ? "fill-white/25 stroke-white" : "fill-orange-500/15 stroke-orange-500 dark:stroke-orange-400"}
              strokeWidth="1.9"
            />

            {/* High-Resolution Wide POS Touch Display */}
            <rect
              x="5"
              y="6.5"
              width="14"
              height="7"
              rx="1.2"
              className={active ? "fill-white/35 stroke-white" : "fill-amber-500/20 stroke-amber-500/70"}
              strokeWidth="1.2"
            />

            {/* Animated Laser Scanning Line inside POS Terminal screen */}
            <motion.line
              x1="6.5"
              y1="9.5"
              x2="17.5"
              y2="9.5"
              strokeWidth="1.6"
              strokeLinecap="round"
              className={active ? "stroke-white" : "stroke-red-500 dark:stroke-red-400"}
              animate={{
                y: [-2, 2.5, -2],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Status LED Lights on POS Header */}
            <circle cx="7" cy="8" r="0.6" fill="#10b981" stroke="none" />
            <circle cx="8.8" cy="8" r="0.6" fill="#f59e0b" stroke="none" />

            {/* POS Grid: Chunky square mechanical buttons */}
            <rect x="5.2" y="15.5" width="2.8" height="2.2" rx="0.6" fill="currentColor" stroke="none" />
            <rect x="9.2" y="15.5" width="2.8" height="2.2" rx="0.6" fill="currentColor" stroke="none" />
            <rect x="13.2" y="15.5" width="2.8" height="2.2" rx="0.6" fill="currentColor" stroke="none" />
            <rect x="17.2" y="15.5" width="1.6" height="2.2" rx="0.5" fill="currentColor" stroke="none" />

            {/* Row 2 Buttons */}
            <rect x="5.2" y="19" width="2.8" height="2.2" rx="0.6" fill="currentColor" stroke="none" />
            <rect x="9.2" y="19" width="2.8" height="2.2" rx="0.6" fill="currentColor" stroke="none" />
            <rect x="13.2" y="19" width="2.8" height="2.2" rx="0.6" fill="currentColor" stroke="none" />
            <rect x="17.2" y="19" width="1.6" height="2.2" rx="0.5" fill="currentColor" stroke="none" />

            {/* Bottom Wide ENTER / PAY bar */}
            <rect
              x="5.2"
              y="22.5"
              width="13.6"
              height="2"
              rx="0.7"
              className={active ? "fill-white" : "fill-emerald-500"}
              stroke="none"
            />
          </svg>
        </motion.div>

        {/* =========================================================
            MICRO SWITCHING ARROWS BADGE:
            Gentle circulating loop arrows showing transition between
            Calculator 1 and Calculator 2
           ========================================================= */}
        <motion.div
          className={cn(
            "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border shadow-xs flex items-center justify-center pointer-events-none",
            active
              ? "bg-white text-neutral-900 border-white/80"
              : "bg-amber-500 text-white border-amber-300/60 dark:border-amber-400/50"
          )}
          animate={{
            rotate: [0, 180, 180, 360, 360]
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            times: [0, 0.45, 0.52, 0.94, 1],
            ease: "easeInOut"
          }}
          title="Switching calculators animation"
        >
          {/* Circular Flip / Switch Cycle Icon */}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
        </motion.div>

      </div>
    </div>
  );
}
