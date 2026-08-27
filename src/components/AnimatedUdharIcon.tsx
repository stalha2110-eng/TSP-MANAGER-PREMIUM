import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedUdharIconProps {
  active: boolean;
  size?: number;
}

export function AnimatedUdharIcon({ active, size = 22 }: AnimatedUdharIconProps) {
  // Sway/Journal writing signature pen path animation
  const penVariants: any = {
    normal: { x: 0, y: 0, rotate: 0, originX: '18px', originY: '6px' },
    active: {
      x: [0, -2, 1, -2, 0],
      y: [0, 2, -1, 2, 0],
      rotate: [0, -12, 10, -8, 0],
      transition: {
        duration: 3.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }
    },
    hover: {
      rotate: -15,
      x: -1,
      y: 1,
      transition: { duration: 0.25, ease: "easeOut" }
    }
  };

  // Sparkly ledger currency success indicators rise from book
  const inkDripVariants: any = {
    normal: { opacity: 0, scale: 0, y: 0 },
    active: {
      opacity: [0, 0.9, 0],
      scale: [0.3, 0.85, 0.3],
      y: [-2, -8, -14],
      x: [0, -4, -6],
      transition: {
        duration: 2.2,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 1.0
      }
    }
  };

  // Notebook page slight flexing
  const notebookVariants: any = {
    normal: { scale: 1 },
    active: {
      scale: [1, 1.03, 0.98, 1.01, 1],
      transition: {
        duration: 3.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }
    },
    hover: {
      scale: 1.04,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div 
      className="relative inline-flex items-center justify-center p-0.5" 
      style={{ width: size + 4, height: size + 4 }}
    >
      {/* Mini Ink/Ledger balance floating particle */}
      <motion.svg
        width={size + 4}
        height={size + 4}
        viewBox="0 0 24 24"
        fill="none"
        className="absolute inset-0 pointer-events-none overflow-visible text-[var(--primary)]"
      >
        <motion.circle
          cx="10"
          cy="12"
          r="1.7"
          fill="currentColor"
          variants={inkDripVariants}
          animate={active ? "active" : "normal"}
        />
      </motion.svg>

      {/* Main Ledger Book with Pen */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={notebookVariants}
        animate={active ? "active" : "normal"}
        whileHover={active ? "active" : "hover"}
        className={cn(
          "transition-colors duration-200 z-10 overflow-visible",
          active ? "text-[var(--primary)]" : "text-[var(--foreground)]"
        )}
      >
        {/* Main Ledger Book Cover / Page base */}
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        
        {/* Ledger binding line or margin separator */}
        <path d="M6 2v20" opacity="0.75" />

        {/* Ledger entry text lines represent balances */}
        <line x1="10" y1="7" x2="15" y2="7" strokeWidth="1.5" />
        <line x1="10" y1="11" x2="14" y2="11" strokeWidth="1.5" />
        <line x1="10" y1="15" x2="13" y2="15" strokeWidth="1.5" />

        {/* Active Signature Pen writing entries */}
        <motion.g
          variants={penVariants}
          animate={active ? "active" : "normal"}
        >
          {/* Elegant fountain pen body */}
          <path 
            d="M13.4 14l3.5-3.5a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4L16.2 17H13.4v-3z" 
            fill={active ? "var(--background)" : "transparent"}
            className="transition-colors"
          />
          {/* Fountain pen nib point touching notes */}
          <path d="m13.4 14-.4.6.6-.4z" />
        </motion.g>
      </motion.svg>
    </div>
  );
}
