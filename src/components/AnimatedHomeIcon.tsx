import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedHomeIconProps {
  active: boolean;
  size?: number;
}

export function AnimatedHomeIcon({ active, size = 22 }: AnimatedHomeIconProps) {
  // Store roof / awning bouncy animation
  const roofVariants: any = {
    normal: { y: 0, scale: 1 },
    active: {
      y: [0, -2, 0, -1, 0],
      scale: [1, 1.05, 0.98, 1.02, 1],
      transition: {
        duration: 2.8,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 2.0
      }
    },
    hover: {
      y: -1.5,
      scale: 1.03,
      transition: { duration: 0.25, ease: "easeOut" }
    }
  };

  // Welcome glow inside the doorway
  const lightVariants: any = {
    normal: { opacity: 0.15 },
    active: {
      opacity: [0.15, 0.8, 0.4, 0.9, 0.15],
      transition: {
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity
      }
    },
    hover: {
      opacity: 0.75,
      transition: { duration: 0.2 }
    }
  };

  // Small antenna/signal wifi wave reflecting alive state of the cloud database
  const waveVariants: any = {
    normal: { opacity: 0, scale: 0.8 },
    active: {
      opacity: [0, 1, 0],
      scale: [0.8, 1.5, 2.0],
      transition: {
        duration: 2.0,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 1.5
      }
    }
  };

  // Door swing animation
  const doorVariants: any = {
    normal: { rotateY: 0, originX: '15px' },
    active: {
      rotateY: [0, -35, -35, 0],
      originX: '15px',
      transition: {
        duration: 4.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 3.0
      }
    },
    hover: {
      rotateY: -25,
      originX: '15px',
      transition: { duration: 0.3 }
    }
  };

  return (
    <div 
      className="relative inline-flex items-center justify-center p-0.5" 
      style={{ width: size + 4, height: size + 4 }}
    >
      {/* Radio Wave Signal from Smart Store Antenna */}
      <motion.svg
        width={size + 4}
        height={size + 4}
        viewBox="0 0 24 24"
        fill="none"
        className="absolute inset-0 pointer-events-none overflow-visible text-[var(--primary)]"
      >
        <motion.circle
          cx="12"
          cy="2"
          r="3"
          stroke="currentColor"
          strokeWidth="1.2"
          variants={waveVariants}
          animate={active ? "active" : "normal"}
        />
      </motion.svg>

      {/* Modern Smart Storefront / Home SVG */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={roofVariants}
        animate={active ? "active" : "normal"}
        whileHover={active ? "active" : "hover"}
        className={cn(
          "transition-colors duration-200 z-10 overflow-visible",
          active ? "text-[var(--primary)]" : "text-[var(--foreground)]"
        )}
      >
        {/* The Protective Tech Roof / House Triad */}
        <path d="m3 9 9-7 9 7" strokeWidth="2.3" />

        {/* Dynamic Awnings/Shades indicating open storefront */}
        <path d="M5 9h14v2H5z" fill={active ? "currentColor" : "transparent"} opacity="0.15" />
        <line x1="8" y1="9" x2="8" y2="11" />
        <line x1="12" y1="9" x2="12" y2="11" />
        <line x1="16" y1="9" x2="16" y2="11" />

        {/* Main Building Frame */}
        <path d="M4 11v10h16V11" />

        {/* Warm open-floor Storefront Light */}
        <motion.rect
          x="9"
          y="15"
          width="6"
          height="6"
          fill="var(--primary)"
          stroke="none"
          variants={lightVariants}
          animate={active ? "active" : "normal"}
        />

        {/* Interactive Store Door */}
        <motion.path
          d="M9 21v-6h6v6"
          variants={doorVariants}
          animate={active ? "active" : "normal"}
        />

        {/* Tiny hanging sign board detail */}
        <rect x="17" y="12" width="2" height="1.5" rx="0.2" strokeWidth="1" />
        <line x1="18" y1="11" x2="18" y2="12" strokeWidth="1" />
      </motion.svg>
    </div>
  );
}
