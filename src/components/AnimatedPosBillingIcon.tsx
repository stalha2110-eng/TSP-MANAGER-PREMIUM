import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedPosBillingIconProps {
  active: boolean;
  size?: number;
  className?: string;
}

export function AnimatedPosBillingIcon({ active, size = 18, className }: AnimatedPosBillingIconProps) {
  // Receipt paper feeding motion
  const receiptVariants: any = {
    inactive: { y: 0.5, scaleY: 0.85, opacity: 0.85, originY: 1 },
    active: {
      y: [0.5, -3.5, -2, -4.5, -1, 0.5],
      scaleY: [0.85, 1.25, 1.05, 1.3, 1.1, 0.85],
      opacity: 1,
      originY: 1,
      transition: {
        duration: 2.6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.6
      }
    },
    hover: {
      y: -2.5,
      scaleY: 1.2,
      originY: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };

  // Laser scanner line animation across POS screen
  const laserVariants: any = {
    inactive: { opacity: 0, y: -2 },
    active: {
      opacity: [0, 1, 1, 0],
      y: [-2.5, 2.5, -2.5],
      transition: {
        duration: 1.6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.4
      }
    }
  };

  // NFC / Wireless Payment Pulse Ring
  const nfcPulseVariants: any = {
    inactive: { opacity: 0, scale: 0.6 },
    active: {
      opacity: [0, 0.7, 0],
      scale: [0.7, 1.35, 1.7],
      transition: {
        duration: 1.8,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }
    }
  };

  // Terminal body micro bounce
  const bodyVariants: any = {
    inactive: { scale: 1, y: 0 },
    active: {
      y: [0, -1, 0, -1.2, 0],
      scale: [1, 1.03, 1, 1.02, 1],
      transition: {
        duration: 3.2,
        ease: "easeInOut",
        repeat: Infinity
      }
    },
    hover: {
      scale: 1.08,
      y: -1,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: size + 4, height: size + 4 }}
      variants={bodyVariants}
      initial="inactive"
      animate={active ? "active" : "inactive"}
      whileHover="hover"
    >
      {/* Contactless Wireless Payment Ring */}
      <motion.span
        className="absolute inset-0 rounded-full border border-amber-300/80 dark:border-amber-400/70 pointer-events-none"
        variants={nfcPulseVariants}
        animate={active ? "active" : "inactive"}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="overflow-visible"
      >
        {/* Receipt Paper Feeding Top */}
        <motion.g variants={receiptVariants}>
          {/* Paper Sheet */}
          <path
            d="M8 7V2.5C8 2.22 8.22 2 8.5 2H15.5C15.78 2 16 2.22 16 2.5V7"
            strokeWidth="1.8"
            fill={active ? "rgba(255, 255, 255, 0.25)" : "transparent"}
            className="transition-colors"
          />
          {/* Micro Printed Dashed Lines */}
          <line x1="9.5" y1="3.8" x2="14.5" y2="3.8" strokeWidth="1.1" strokeDasharray="1.2 0.8" />
          <line x1="9.5" y1="5.3" x2="13" y2="5.3" strokeWidth="1" strokeDasharray="1 0.8" />
        </motion.g>

        {/* POS Terminal Main Body */}
        <rect x="4" y="7" width="16" height="14" rx="2.5" strokeWidth="2" />

        {/* Display Screen */}
        <rect
          x="7"
          y="10"
          width="10"
          height="4.5"
          rx="1"
          strokeWidth="1.3"
          fill={active ? "currentColor" : "transparent"}
          fillOpacity={active ? "0.15" : "0"}
        />

        {/* Laser Scanner Sweep Line */}
        {active && (
          <motion.line
            x1="8"
            y1="12"
            x2="16"
            y2="12"
            stroke="#10b981"
            strokeWidth="1.4"
            strokeLinecap="round"
            variants={laserVariants}
          />
        )}

        {/* Keypad Grid Dots */}
        <circle cx="8.5" cy="16.8" r="0.65" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16.8" r="0.65" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="16.8" r="0.65" fill="currentColor" stroke="none" />

        <circle cx="8.5" cy="18.8" r="0.65" fill="currentColor" stroke="none" />
        <circle cx="12" cy="18.8" r="0.65" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="18.8" r="0.65" fill="currentColor" stroke="none" strokeWidth="0" />

        {/* Live Active Status Green LED */}
        <motion.circle
          cx="17.5"
          cy="8.5"
          r="1.1"
          fill={active ? "#22c55e" : "currentColor"}
          stroke="none"
          animate={active ? {
            scale: [1, 1.35, 1],
            opacity: [0.75, 1, 0.75]
          } : { scale: 1, opacity: 0.5 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}
