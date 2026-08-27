import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedBillingIconProps {
  active: boolean;
  size?: number;
}

export function AnimatedBillingIcon({ active, size = 22 }: AnimatedBillingIconProps) {
  // Variations for the Receipt rolling/printing out
  const receiptVariants: any = {
    normal: { 
      y: 1, 
      scaleY: 0.7, 
      originY: 0,
      opacity: 0.95
    },
    active: {
      y: [1, -5, -4, -6, -4, 1],
      scaleY: [0.7, 1.25, 1.1, 1.35, 1.15, 0.7],
      originY: 0,
      opacity: 1,
      transition: {
        duration: 3.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1.0
      }
    },
    hover: {
      y: -3,
      scaleY: 1.15,
      originY: 0,
      transition: { duration: 0.25, ease: "easeOut" }
    }
  };

  // Pulse effect or glowing light inside the terminal printer
  const glowVariants: any = {
    normal: { opacity: 0.2, scale: 0.8 },
    active: {
      opacity: [0.2, 0.9, 0.2],
      scale: [0.8, 1.1, 0.8],
      transition: {
        duration: 1.8,
        ease: "linear",
        repeat: Infinity
      }
    },
    hover: { opacity: 0.7, scale: 1 }
  };

  // Sparkle / Ledger star indicators shooting sideways
  const burstVariants: any = {
    normal: { opacity: 0, scale: 0, x: 0, y: 0 },
    active: {
      opacity: [0, 1, 1, 0],
      scale: [0.2, 1, 1, 0],
      x: [-2, -8, -11, -12],
      y: [2, 0, -3, -4],
      transition: {
        duration: 1.4,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 0.8
      }
    }
  };

  const rightBurstVariants: any = {
    normal: { opacity: 0, scale: 0, x: 0, y: 0 },
    active: {
      opacity: [0, 1, 1, 0],
      scale: [0.2, 0.9, 0.9, 0],
      x: [2, 7, 10, 11],
      y: [2, 1, -2, -3],
      transition: {
        duration: 1.4,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 1.1
      }
    }
  };

  // Terminal body tiny feedback jump
  const terminalVariants: any = {
    normal: { scale: 1, y: 0 },
    active: {
      y: [0, -1, 0, -1.5, 0],
      transition: {
        duration: 3.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1.0
      }
    },
    hover: {
      y: -0.5,
      scale: 1.03,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div 
      className="relative inline-flex items-center justify-center p-0.5" 
      style={{ width: size + 4, height: size + 4 }}
    >
      {/* Side Burst Particles representing fast transactions / successful calculations */}
      <motion.svg
        width={size + 4}
        height={size + 4}
        viewBox="0 0 24 24"
        fill="none"
        className="absolute inset-0 pointer-events-none overflow-visible text-[var(--primary)]"
      >
        {/* Left Burst Coin Sparkle */}
        <motion.circle
          cx="6"
          cy="8"
          r="1.8"
          fill="currentColor"
          variants={burstVariants}
          animate={active ? "active" : "normal"}
        />
        {/* Right Burst Sparkle Star */}
        <motion.path
          d="M17 9l1.5-1.5L17 6l-1.5 1.5z"
          fill="currentColor"
          variants={rightBurstVariants}
          animate={active ? "active" : "normal"}
        />
      </motion.svg>

      {/* POS Terminal & Receipt Body Container */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={terminalVariants}
        animate={active ? "active" : "normal"}
        whileHover={active ? "active" : "hover"}
        className={cn(
          "transition-colors duration-200 z-10 overflow-visible",
          active ? "text-[var(--primary)]" : "text-[var(--foreground)]"
        )}
      >
        {/* The Receipt Sheet Paper rolling up from printer slots */}
        <motion.g
          variants={receiptVariants}
          animate={active ? "active" : "normal"}
        >
          {/* Main Paper Slate */}
          <path 
            d="M8 8V3h8v5" 
            strokeWidth="1.5"
            fill={active ? "var(--background)" : "transparent"} 
            className="transition-colors"
          />
          {/* Dashed Printed Ledger Lines on the receipt */}
          <line x1="10" y1="5" x2="14" y2="5" strokeWidth="1" strokeDasharray="1.5 1" opacity="0.8" />
          {/* Jagged bottom cutter line effect */}
          <path d="M8 3h8" strokeWidth="1" />
        </motion.g>

        {/* Outer POS terminal casing */}
        <rect x="5" y="8" width="14" height="13" rx="2" strokeWidth="2.2" />

        {/* Sleek magnetic credit card slot */}
        <path d="M16 11v8" strokeWidth="1.2" strokeDasharray="3 1" opacity="0.8" />

        {/* Small interface screen segment */}
        <rect x="8" y="11" width="5" height="3" rx="0.5" strokeWidth="1.2" />

        {/* Active scan status LED */}
        <motion.circle
          cx="17"
          cy="13"
          r="1.2"
          fill={active ? "var(--primary)" : "currentColor"}
          stroke="none"
          variants={glowVariants}
          animate={active ? "active" : "normal"}
        />

        {/* Dynamic miniature keyboard feed lines */}
        <line x1="8" y1="17" x2="10" y2="17" strokeWidth="1.5" />
        <line x1="12" y1="17" x2="13" y2="17" strokeWidth="1.5" />
        <line x1="8" y1="19" x2="9" y2="19" strokeWidth="1.5" />
        <line x1="11" y1="19" x2="13" y2="19" strokeWidth="1.5" />
      </motion.svg>
    </div>
  );
}
