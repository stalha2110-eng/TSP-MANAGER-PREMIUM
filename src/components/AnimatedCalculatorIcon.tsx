import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedCalculatorIconProps {
  active: boolean;
  size?: number;
  className?: string;
}

export function AnimatedCalculatorIcon({ active, size = 18, className }: AnimatedCalculatorIconProps) {
  // Cascading sequential button press animations
  const keyPulse1: any = {
    inactive: { opacity: 0.75, scale: 1 },
    active: {
      scale: [1, 1.4, 0.9, 1],
      opacity: [0.75, 1, 0.75],
      transition: { duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }
    }
  };

  const keyPulse2: any = {
    inactive: { opacity: 0.75, scale: 1 },
    active: {
      scale: [1, 1.4, 0.9, 1],
      opacity: [0.75, 1, 0.75],
      transition: { duration: 1.4, ease: "easeInOut", repeat: Infinity, delay: 0.3, repeatDelay: 0.2 }
    }
  };

  const keyPulse3: any = {
    inactive: { opacity: 0.75, scale: 1 },
    active: {
      scale: [1, 1.4, 0.9, 1],
      opacity: [0.75, 1, 0.75],
      transition: { duration: 1.4, ease: "easeInOut", repeat: Infinity, delay: 0.6, repeatDelay: 0.2 }
    }
  };

  // Screen equation typing simulation
  const screenDigits: any = {
    inactive: { opacity: 0.3, scaleX: 1 },
    active: {
      opacity: [0.3, 0.95, 0.6, 1, 0.3],
      scaleX: [0.9, 1.1, 0.95, 1.05, 0.9],
      transition: { duration: 2.2, ease: "easeInOut", repeat: Infinity }
    }
  };

  // Equal sign operator bounce & shine
  const equalsGlow: any = {
    inactive: { opacity: 0.7, x: 0 },
    active: {
      x: [0, 1.8, -0.5, 0],
      opacity: [0.7, 1, 0.8, 1],
      transition: { duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.4 }
    }
  };

  // Outer Calculation Ambient Pulse Ring
  const calcPulseRing: any = {
    inactive: { opacity: 0, scale: 0.8 },
    active: {
      opacity: [0, 0.65, 0],
      scale: [0.8, 1.3, 1.6],
      transition: { duration: 2, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }
    }
  };

  // Main container floating body animation
  const bodyVariants: any = {
    inactive: { scale: 1, y: 0 },
    active: {
      y: [0, -1.2, 0, -1, 0],
      scale: [1, 1.04, 1, 1.02, 1],
      transition: { duration: 3, ease: "easeInOut", repeat: Infinity }
    },
    hover: { scale: 1.12, y: -1.5, transition: { type: "spring", stiffness: 400, damping: 15 } }
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
      {/* Active Aura Pulse Ring */}
      <motion.span
        className="absolute inset-0 rounded-xl border border-amber-400/80 dark:border-amber-300/70 pointer-events-none"
        variants={calcPulseRing}
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
        {/* Modern Calculator Chassis */}
        <rect x="3.5" y="2.5" width="17" height="19" rx="3" strokeWidth="2" />

        {/* OLED Display Screen Box */}
        <rect
          x="6"
          y="5.5"
          width="12"
          height="5"
          rx="1.2"
          strokeWidth="1.2"
          fill={active ? "currentColor" : "transparent"}
          fillOpacity={active ? "0.18" : "0"}
        />

        {/* Dynamic Display Math Equation Stream */}
        <motion.path
          d="M7.5 8h3.5M13.5 8h2.5"
          strokeWidth="1.4"
          strokeLinecap="round"
          variants={screenDigits}
          animate={active ? "active" : "inactive"}
        />

        {/* Green Active Math Power LED */}
        <motion.circle
          cx="16.5"
          cy="7"
          r="0.8"
          fill={active ? "#10b981" : "currentColor"}
          stroke="none"
          animate={active ? { scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] } : { scale: 1, opacity: 0.4 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Keypad Grid - Row 1 (AC / % / ÷) */}
        <circle cx="7.5" cy="13" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none" />
        <motion.circle
          cx="16.5"
          cy="13"
          r="0.9"
          fill="currentColor"
          stroke="none"
          variants={keyPulse1}
          animate={active ? "active" : "inactive"}
        />

        {/* Keypad Grid - Row 2 (7 / 8 / 9) */}
        <circle cx="7.5" cy="16" r="0.9" fill="currentColor" stroke="none" />
        <motion.circle
          cx="12"
          cy="16"
          r="0.9"
          fill="currentColor"
          stroke="none"
          variants={keyPulse2}
          animate={active ? "active" : "inactive"}
        />
        <circle cx="16.5" cy="16" r="0.9" fill="currentColor" stroke="none" />

        {/* Keypad Grid - Row 3 (4 / 5 / ×) */}
        <motion.circle
          cx="7.5"
          cy="19"
          r="0.9"
          fill="currentColor"
          stroke="none"
          variants={keyPulse3}
          animate={active ? "active" : "inactive"}
        />
        <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none" />

        {/* Animated Equals Operator Button (=) */}
        <motion.g variants={equalsGlow} animate={active ? "active" : "inactive"}>
          <line x1="14.8" y1="18.5" x2="18.2" y2="18.5" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="14.8" y1="20.2" x2="18.2" y2="20.2" strokeWidth="1.8" strokeLinecap="round" />
        </motion.g>
      </svg>
    </motion.div>
  );
}
