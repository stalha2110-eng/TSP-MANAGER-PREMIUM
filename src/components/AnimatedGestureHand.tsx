import React from 'react';
import { motion } from 'motion/react';

export type GestureType = 'tap' | 'swipe' | 'hold';

interface AnimatedGestureHandProps {
  gesture: GestureType;
  className?: string;
  label?: string;
}

export const AnimatedGestureHand: React.FC<AnimatedGestureHandProps> = ({
  gesture,
  className = '',
  label,
}) => {
  return (
    <div className={`relative pointer-events-none select-none flex flex-col items-center ${className}`}>
      {/* Ripple or Action Effect under fingertip */}
      {gesture === 'tap' && (
        <div className="absolute -top-3 -left-3 w-10 h-10 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [0.6, 1.8, 2.2],
              opacity: [0.9, 0.4, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className="w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/25"
          />
        </div>
      )}

      {gesture === 'hold' && (
        <div className="absolute -top-4 -left-4 w-12 h-12 flex items-center justify-center">
          {/* Animated Hold Progress Ring */}
          <svg className="w-10 h-10 transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="15"
              stroke="rgba(245, 158, 11, 0.3)"
              strokeWidth="3"
              fill="none"
            />
            <motion.circle
              cx="20"
              cy="20"
              r="15"
              stroke="#f59e0b"
              strokeWidth="3.5"
              fill="rgba(245, 158, 11, 0.2)"
              strokeDasharray="94.2"
              animate={{
                strokeDashoffset: [94.2, 0, 0, 94.2],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </svg>
        </div>
      )}

      {/* Main Animated Hand SVG */}
      <motion.div
        animate={
          gesture === 'tap'
            ? {
                y: [0, -6, 2, -6, 0],
                scale: [1, 1, 0.88, 1, 1],
                rotate: [0, -4, 0, -4, 0],
              }
            : gesture === 'swipe'
            ? {
                x: [-18, 24, -18],
                y: [0, -2, 0],
                rotate: [-8, 8, -8],
              }
            : {
                // Hold gesture: press down and stay pressed, then reset
                scale: [1, 0.88, 0.88, 0.88, 1],
                y: [0, 4, 4, 4, 0],
              }
        }
        transition={{
          duration: gesture === 'swipe' ? 2.0 : gesture === 'hold' ? 2.2 : 1.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
      >
        <svg
          width="44"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hand Outline & Glow */}
          <path
            d="M10 2a1.5 1.5 0 0 0-1.5 1.5v7.586l-1.793-.717a2 2 0 0 0-2.316.591l-.707.884a1 1 0 0 0 .193 1.438l5.228 3.921A5 5 0 0 0 12.106 18H16a4 4 0 0 0 4-4V7.5a1.5 1.5 0 0 0-3 0V10h-1V5.5a1.5 1.5 0 0 0-3 0V10h-1V3.5A1.5 1.5 0 0 0 10 2z"
            fill="#ffffff"
            stroke="#18181b"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner Accent Ring on Fingertip */}
          <circle cx="10" cy="3.5" r="1" fill="#f59e0b" />
          <path
            d="M10 6.5v4M13 8v3M16 9.5v2.5"
            stroke="#e4e4e7"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      {/* Floating Gesture Tag / Prompt */}
      {label && (
        <motion.div
          animate={{ opacity: [0.85, 1, 0.85], scale: [0.97, 1, 0.97] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mt-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/90 text-amber-300 border border-amber-400/40 text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg whitespace-nowrap"
        >
          {label}
        </motion.div>
      )}
    </div>
  );
};
