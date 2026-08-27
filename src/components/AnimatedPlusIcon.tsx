import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedPlusIconProps {
  size?: number;
  isAtMicThreshold?: boolean;
}

export function AnimatedPlusIcon({ size = 20, isAtMicThreshold = false }: AnimatedPlusIconProps) {
  // Ultra-precise modern spring mechanics
  const fluidSpring = {
    type: "spring",
    stiffness: 260,
    damping: 20,
    mass: 0.6
  } as any;

  const rotationalSpring = {
    type: "spring",
    stiffness: 200,
    damping: 18
  } as any;

  // Variants for precision concentric structures
  const spinCounterVariants: any = {
    normal: { rotate: 0, scale: 1 },
    hover: { 
      rotate: -180, 
      scale: 1.12,
      transition: rotationalSpring
    },
    tap: { scale: 0.94 }
  };

  const spinClockwiseVariants: any = {
    normal: { rotate: 0, scale: 1 },
    hover: { 
      rotate: 180, 
      scale: 1.08,
      transition: rotationalSpring
    },
    tap: { scale: 0.94 }
  };

  const plusCrossVariants: any = {
    normal: { rotate: 0, scale: 1 },
    hover: {
      rotate: 90,
      scale: 1.05,
      transition: fluidSpring
    }
  };

  return (
    <motion.div
      className="relative flex items-center justify-center select-none cursor-pointer w-full h-full"
      initial="normal"
      whileHover="hover"
      whileTap="tap"
    >
      {/* 1. Balanced Velvet Soft Ambient Backlighting Glow */}
      <motion.div 
        className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[var(--primary)] via-amber-500 to-amber-600 filter blur-md pointer-events-none opacity-20"
        variants={{
          normal: { scale: 1, opacity: 0.22 },
          hover: { 
            scale: 1.35, 
            opacity: 0.45,
            transition: { duration: 0.4, ease: "easeOut" }
          }
        }}
        animate={isAtMicThreshold ? {
          scale: 1.5,
          opacity: 0.7,
        } : {}}
      />

      {/* 2. Concentric Precision Engineering Lines */}
      <div className={`absolute inset-0 pointer-events-none flex items-center justify-center scale-110 z-0 overflow-visible transition-opacity duration-300 ${isAtMicThreshold ? 'opacity-30' : 'opacity-100'}`}>
        
        {/* Precise Outer Dashed Spindle (Clockwise) */}
        <motion.svg
          width="54"
          height="54"
          viewBox="0 0 54 54"
          fill="none"
          stroke="currentColor"
          className="text-amber-500/20 absolute"
          variants={spinClockwiseVariants}
          animate={isAtMicThreshold ? { rotate: 360 } : {}}
          transition={isAtMicThreshold ? { repeat: Infinity, duration: 4, ease: "linear" } : {}}
        >
          <circle 
            cx="27" 
            cy="27" 
            r="23" 
            strokeWidth="0.75" 
            strokeDasharray="4 8" 
          />
        </motion.svg>

        {/* Inner Counter-Clockwise Tick ring */}
        <motion.svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          stroke="currentColor"
          className="text-[var(--primary)]/30 absolute"
          variants={spinCounterVariants}
          animate={isAtMicThreshold ? { rotate: -360 } : {}}
          transition={isAtMicThreshold ? { repeat: Infinity, duration: 3, ease: "linear" } : {}}
        >
          <circle 
            cx="22" 
            cy="22" 
            r="17" 
            strokeWidth="0.75" 
            strokeDasharray="14 4" 
          />
          <circle cx="22" cy="5" r="1" fill="currentColor" stroke="none" />
          <circle cx="22" cy="39" r="1" fill="currentColor" stroke="none" />
        </motion.svg>
      </div>

      {/* 3. Constant / Drag active Concentric Expanding Radar Waves for custom haptic feeling */}
      <AnimatePresence>
        {isAtMicThreshold && (
          <div className="absolute inset-x-0 h-full w-full flex items-center justify-center z-0 pointer-events-none overflow-visible">
            {/* Fast Haptic Ring 1 */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0.9 }}
              animate={{
                scale: [0.8, 1.9],
                opacity: [0.9, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                ease: "easeOut"
              }}
              className="absolute h-12 w-12 rounded-full border-2 border-amber-400 z-0 bg-amber-400/5"
            />
            {/* Intermediate Haptic Ring 2 */}
            <motion.div 
              initial={{ scale: 0.7, opacity: 0.7 }}
              animate={{
                scale: [0.7, 2.4],
                opacity: [0.7, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.2
              }}
              className="absolute h-12 w-12 rounded-full border border-amber-500 z-0"
            />
            {/* Slow Ambient Outer Expansion Ring 3 */}
            <motion.div 
              initial={{ scale: 0.6, opacity: 0.5 }}
              animate={{
                scale: [0.6, 2.9],
                opacity: [0.5, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.4
              }}
              className="absolute h-12 w-12 rounded-full border border-yellow-300/30 z-0"
            />
          </div>
        )}
      </AnimatePresence>

      {/* 3.1 Concentric Expanding Radar Waves on Hover */}
      {!isAtMicThreshold && (
        <motion.div 
          className="absolute h-10 w-10 rounded-full border border-amber-400 pointer-events-none z-0 opacity-0"
          variants={{
            hover: {
              scale: [1, 2.2],
              opacity: [0.5, 0],
              transition: {
                duration: 1.2,
                repeat: Infinity,
                ease: "easeOut"
              }
            }
          }}
        />
      )}

      {/* 4. Luxury Floating Glassmorphic Center Core Container */}
      <motion.div
        className={`relative z-10 flex items-center justify-center h-12 w-12 rounded-full border overflow-hidden shadow-lg transition-all duration-350 ${
          isAtMicThreshold 
            ? 'border-amber-400 bg-gradient-to-tr from-neutral-950 via-neutral-900 to-amber-950 scale-120 shadow-[0_0_20px_rgba(245,158,11,0.6)]' 
            : 'border-white/20 bg-gradient-to-tr from-[var(--primary)] to-amber-500'
        }`}
        variants={{
          normal: { scale: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
          hover: { 
            scale: 1.1, 
            boxShadow: "0 10px 25px rgba(217, 119, 6, 0.4)",
            transition: fluidSpring 
          },
          tap: { scale: 0.93 }
        }}
        animate={isAtMicThreshold ? {
          scale: [1.15, 1.28, 1.15],
          boxShadow: [
            "0 0 15px rgba(245,158,11,0.4)",
            "0 0 30px rgba(245,158,11,0.7)",
            "0 0 15px rgba(245,158,11,0.4)"
          ]
        } : {}}
        transition={isAtMicThreshold ? {
          scale: { repeat: Infinity, duration: 1.0, ease: "easeInOut" },
          boxShadow: { repeat: Infinity, duration: 1.0, ease: "easeInOut" }
        } : undefined}
      >
        {/* Subtle inner glassy gloss highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/15 pointer-events-none" />
        <div className="absolute inset-[1px] rounded-full bg-gradient-to-tr from-white/5 to-white/25 pointer-events-none mix-blend-overlay" />

        {/* 5. Precise Clean Vector Plus - Spring Twisted */}
        <motion.svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={`drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.25)] transition-colors duration-300 ${
            isAtMicThreshold ? 'text-amber-400' : 'text-white'
          }`}
          variants={plusCrossVariants}
          animate={isAtMicThreshold ? {
            rotate: 135,
            scale: 1.05
          } : {}}
          transition={{ type: "spring", stiffness: 350, damping: 15 }}
        >
          <path d="M12 5v14M5 12h14" />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
}
