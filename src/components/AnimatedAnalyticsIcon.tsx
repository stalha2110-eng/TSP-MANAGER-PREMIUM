import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AnimatedAnalyticsIconProps {
  active: boolean;
  size?: number;
  isLocked?: boolean;
}

export function AnimatedAnalyticsIcon({ active, size = 22, isLocked = false }: AnimatedAnalyticsIconProps) {
  // Animating the chart bars individually with staggered rise heights
  const bar1Variants: any = {
    normal: { scaleY: 0.4, originY: 1 },
    active: {
      scaleY: [0.4, 0.85, 0.5, 0.9, 0.4],
      transition: {
        duration: 3.2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }
    },
    hover: {
      scaleY: 0.8,
      transition: { duration: 0.25 }
    }
  };

  const bar2Variants: any = {
    normal: { scaleY: 0.65, originY: 1 },
    active: {
      scaleY: [0.65, 0.35, 0.9, 0.55, 0.65],
      transition: {
        duration: 3.2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }
    },
    hover: {
      scaleY: 1.05,
      transition: { duration: 0.25 }
    }
  };

  const bar3Variants: any = {
    normal: { scaleY: 0.9, originY: 1 },
    active: {
      scaleY: [0.9, 0.5, 0.95, 0.4, 0.9],
      transition: {
        duration: 3.2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }
    },
    hover: {
      scaleY: 1.15,
      transition: { duration: 0.25 }
    }
  };

  // Sparkle floating trend line path animation
  const trendLineVariants: any = {
    normal: { pathLength: 0.8, opacity: 0.9 },
    active: {
      pathLength: [0.8, 1, 0.7, 0.8],
      opacity: [0.9, 1, 0.8, 0.9],
      transition: {
        duration: 2.2,
        ease: "linear",
        repeat: Infinity
      }
    },
    hover: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.2 }
    }
  };

  // Arrowhead of the rising graph
  const arrowVariants: any = {
    normal: { scale: 1, x: 0, y: 0 },
    active: {
      scale: [1, 1.25, 0.9, 1],
      x: [0, 0.5, -0.3, 0],
      y: [0, -0.5, 0.3, 0],
      transition: {
        duration: 2.2,
        ease: "easeInOut",
        repeat: Infinity
      }
    }
  };

  return (
    <div 
      className="relative inline-flex items-center justify-center p-0.5" 
      style={{ width: size + 4, height: size + 4 }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "transition-all duration-300 z-10 overflow-visible",
          active ? "text-[var(--primary)]" : "text-[var(--foreground)]",
          isLocked && "opacity-20 scale-[0.65] blur-[0.5px]"
        )}
      >
        {/* Dynamic growing chart bar 1 */}
        <motion.line 
          x1="18" 
          y1="20" 
          x2="18" 
          y2="10" 
          variants={bar3Variants}
          animate={active && !isLocked ? "active" : "normal"}
          whileHover={active && !isLocked ? "active" : "hover"}
        />

        {/* Dynamic growing chart bar 2 */}
        <motion.line 
          x1="12" 
          y1="20" 
          x2="12" 
          y2="4" 
          variants={bar2Variants}
          animate={active && !isLocked ? "active" : "normal"}
          whileHover={active && !isLocked ? "active" : "hover"}
        />

        {/* Dynamic growing chart bar 3 */}
        <motion.line 
          x1="6" 
          y1="20" 
          x2="6" 
          y2="14" 
          variants={bar1Variants}
          animate={active && !isLocked ? "active" : "normal"}
          whileHover={active && !isLocked ? "active" : "hover"}
        />

        {/* Graph Bottom Axis reference line */}
        <line x1="3" y1="20" x2="21" y2="20" opacity="0.45" />

        {/* Rising Trend Line Overlay */}
        <motion.path
          d="M4 14l5-4 5 4 5-8"
          strokeWidth="1.8"
          strokeDasharray="40"
          strokeDashoffset="0"
          variants={trendLineVariants}
          animate={active && !isLocked ? "active" : "normal"}
        />

        {/* Dynamic Arrow Head */}
        <motion.path 
          d="M17 6h2v2" 
          strokeWidth="1.8"
          variants={arrowVariants}
          animate={active && !isLocked ? "active" : "normal"}
        />
      </motion.svg>

      {/* Lock Snapping overlay */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            key="lock-indicator"
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 45 }}
            transition={{ type: "spring", stiffness: 450, damping: 14 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-500 drop-shadow-[0_2px_4px_rgba(245,158,11,0.2)]"
            >
              {/* Shackle: snaps down with y motion and a spring */}
              <motion.path
                d="M7 11V7a5 5 0 0 1 10 0v4"
                initial={{ y: -3, pathLength: 0.7 }}
                animate={{ y: 0, pathLength: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 600, 
                  damping: 12,
                  delay: 0.15 
                }}
              />
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="currentColor" fillOpacity="0.15" />
              <path d="M12 15v3" strokeWidth="2" />
              <circle cx="12" cy="15" r="1.2" fill="currentColor" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
