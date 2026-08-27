import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedBillHistoryIconProps {
  active: boolean;
  size?: number;
  className?: string;
}

export function AnimatedBillHistoryIcon({ active, size = 18, className }: AnimatedBillHistoryIconProps) {
  // Mechanical clock hands counter-clockwise rewind
  const handVariants: any = {
    inactive: { rotate: 0 },
    active: {
      rotate: [0, -360],
      transition: {
        duration: 4.5,
        ease: "linear",
        repeat: Infinity
      }
    }
  };

  // Circular rewind arrow head spring tick
  const arrowTipVariants: any = {
    inactive: { scale: 1, x: 0, y: 0 },
    active: {
      x: [0, -1.2, 0, -1.2, 0],
      y: [0, 1.2, 0, 1.2, 0],
      scale: [1, 1.2, 1, 1.2, 1],
      transition: {
        duration: 1.8,
        ease: "easeInOut",
        repeat: Infinity
      }
    }
  };

  // Time rewind circular pulse aura
  const timeAuraPulse: any = {
    inactive: { opacity: 0, scale: 0.8 },
    active: {
      opacity: [0, 0.7, 0],
      scale: [0.85, 1.3, 1.6],
      transition: {
        duration: 2.2,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 0.3
      }
    }
  };

  // Sparkle stars / historic receipt record dots
  const recordSparkle: any = {
    inactive: { opacity: 0, scale: 0.5 },
    active: {
      opacity: [0, 1, 0],
      scale: [0.6, 1.4, 0.6],
      transition: {
        duration: 1.6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.4
      }
    }
  };

  // Main container floating body animation
  const bodyVariants: any = {
    inactive: { scale: 1, y: 0 },
    active: {
      y: [0, -1.2, 0, -1, 0],
      scale: [1, 1.04, 1, 1.02, 1],
      transition: {
        duration: 3,
        ease: "easeInOut",
        repeat: Infinity
      }
    },
    hover: {
      scale: 1.12,
      y: -1.5,
      transition: { type: "spring", stiffness: 400, damping: 15 }
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
      {/* Active Time Rewind Pulse Ring */}
      <motion.span
        className="absolute inset-0 rounded-full border border-amber-400/80 dark:border-amber-300/70 pointer-events-none"
        variants={timeAuraPulse}
        animate={active ? "active" : "inactive"}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="overflow-visible"
      >
        {/* Outer Circular Rewind Arrow Path (Classic Lucide History) */}
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />

        {/* Arrow Tip Header at Top Left */}
        <motion.path
          d="M3 3v5h5"
          variants={arrowTipVariants}
          animate={active ? "active" : "inactive"}
        />

        {/* Center Clock Pivot Pin */}
        <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />

        {/* Animated Rewinding Clock Hands */}
        <motion.g
          style={{ originX: "12px", originY: "12px" }}
          variants={handVariants}
          animate={active ? "active" : "inactive"}
        >
          {/* Hour Hand (12 o'clock) */}
          <line x1="12" y1="12" x2="12" y2="6.5" strokeWidth="2.3" strokeLinecap="round" />
          {/* Minute Hand (2 o'clock) */}
          <line x1="12" y1="12" x2="16" y2="13.8" strokeWidth="2" strokeLinecap="round" />
        </motion.g>

        {/* Micro Historic Receipt Sparkle Dot (Bottom Right) */}
        {active && (
          <motion.circle
            cx="18.5"
            cy="18.5"
            r="1.4"
            fill="#f59e0b"
            stroke="none"
            variants={recordSparkle}
            animate="active"
          />
        )}
      </svg>
    </motion.div>
  );
}
