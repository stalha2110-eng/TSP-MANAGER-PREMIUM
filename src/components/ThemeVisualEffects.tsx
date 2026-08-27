import React from 'react';
import { motion } from 'motion/react';

interface ThemeVisualEffectsProps {
  theme: string;
  disableMovement?: boolean;
}

export function ThemeVisualEffects({ theme, disableMovement = false }: ThemeVisualEffectsProps) {
  if (theme === 'cyberpunk') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 z-0 rounded-[2.5rem]">
        {/* Animated Cybernetic Scanlines Grid */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(23ec,72,153,0.04),rgba(6,182,212,0.02),rgba(236,72,153,0.04))] bg-[size:100%_4px,3px_100%]" 
          style={disableMovement ? undefined : { animation: 'pulse 6s infinite alternate' }}
        />
        {/* Luminous laser line flowing downwards */}
        {!disableMovement && (
          <motion.div 
            initial={{ y: '-100%' }}
            animate={{ y: '200%' }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"
          />
        )}
        {/* Random drifting cyber particles */}
        {!disableMovement && [...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: `${Math.random() * 100}%`, y: '100%', scale: Math.random() * 0.5 + 0.5, opacity: 0 }}
            animate={{ 
              y: '-20%', 
              opacity: [0, 0.7, 0.7, 0], 
              x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`] 
            }}
            transition={{ duration: Math.random() * 8 + 6, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
            className="absolute w-1.5 h-1.5 bg-pink-500 rounded-xs shadow-[0_0_8px_#ec4899]"
          />
        ))}
      </div>
    );
  }

  if (theme === 'emerald_matrix') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 col-span-full z-0 font-mono text-[7px] text-emerald-500 leading-none rounded-[2.5rem]">
        {/* Simulated falling code columns */}
        {[...Array(8)].map((_, col) => {
          const colX = (col * 14) + col * 1 + 2;
          return (
            <motion.div
              key={col}
              initial={{ y: -150 }}
              animate={disableMovement ? { y: '10%' } : { y: '110%' }}
              transition={disableMovement ? undefined : { duration: Math.random() * 10 + col * 1.5 + 10, repeat: Infinity, ease: 'linear' }}
              className="absolute select-none flex flex-col gap-0.5"
              style={{ left: `${colX}%` }}
            >
              {[...Array(20)].map((_, cell) => (
                <div key={cell} className={cell === 0 ? 'text-white font-bold' : 'text-emerald-500'}>
                  {Math.random() > 0.5 ? '1' : '0'}
                </div>
              ))}
            </motion.div>
          );
        })}
      </div>
    );
  }

  if (theme === 'glass_modern') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 z-0 rounded-[2.5rem]">
        {/* Intersecting soft deforming blurred blobs */}
        <motion.div
          animate={disableMovement ? { x: 0, y: 0, scale: 1 } : {
            x: [0, 30, -15, 0],
            y: [0, -25, 15, 0],
            scale: [1, 1.1, 0.95, 1]
          }}
          transition={disableMovement ? undefined : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-12 -left-12 w-64 h-64 bg-purple-500/25 rounded-full blur-[80px]"
        />
        <motion.div
          animate={disableMovement ? { x: 0, y: 0, scale: 1 } : {
            x: [0, -30, 20, 0],
            y: [0, 20, -25, 0],
            scale: [1, 0.9, 1.05, 1]
          }}
          transition={disableMovement ? undefined : { duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-16 -right-16 w-80 h-80 bg-pink-500/20 rounded-full blur-[90px]"
        />
      </div>
    );
  }

  if (theme === 'luxury_gold') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25 z-0 rounded-[2.5rem]">
        {!disableMovement && [...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: `${Math.random() * 100}%`, y: '110%', opacity: 0, scale: Math.random() * 0.7 + 0.3 }}
            animate={{
              y: '-10%',
              opacity: [0, 0.8, 0.8, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: Math.random() * 8 + 8, repeat: Infinity, ease: 'easeInOut', delay: i * 2 }}
            className="absolute text-amber-500/40 select-none text-[8.5px]"
          >
            ✦
          </motion.div>
        ))}
      </div>
    );
  }

  if (theme === 'retro-blue') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 z-0 rounded-[2.5rem]">
        {/* Starfield simulation elements */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: Math.random() * 0.3 }}
            animate={disableMovement ? { opacity: 0.5 } : {
              opacity: [0.1, 0.9, 0.1]
            }}
            transition={disableMovement ? undefined : { duration: Math.random() * 3 + 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
            className={`absolute rounded-full bg-white ${i % 3 === 0 ? 'w-1 h-1' : 'w-[1.5px] h-[1.5px]'} shadow-[0_0_6px_rgba(255,255,255,0.8)]`}
          />
        ))}
      </div>
    );
  }

  if (theme === 'emerald-gold') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15 z-0 rounded-[2.5rem]">
        {/* Deep botanical gold glow sparks */}
        {!disableMovement && [...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: `${Math.random() * 100}%`, y: '105%', scale: Math.random() * 0.4 + 0.4, opacity: 0 }}
            animate={{
              y: '-5%',
              opacity: [0, 0.6, 0],
              x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`]
            }}
            transition={{ duration: Math.random() * 12 + 10, repeat: Infinity, ease: 'easeInOut', delay: i * 2.5 }}
            className="absolute w-2 h-2 rounded-full bg-emerald-400 border border-amber-300"
          />
        ))}
      </div>
    );
  }

  return null;
}
