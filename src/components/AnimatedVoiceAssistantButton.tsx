import React from 'react';
import { motion } from 'motion/react';
import { Mic } from 'lucide-react';

interface AnimatedVoiceAssistantButtonProps {
  onClick: () => void;
  className?: string;
  id?: string;
}

export const AnimatedVoiceAssistantButton: React.FC<AnimatedVoiceAssistantButtonProps> = ({
  onClick,
  className = '',
  id = 'floating-voice-assistant-mic-btn',
}) => {
  return (
    <div className={`relative flex flex-col items-center group z-30 select-none ${className}`}>
      {/* Tooltip badge for speech */}
      <div 
        id="voice-mic-tooltip"
        className="absolute -top-10 right-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:-translate-y-0.5 whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xl border border-[var(--border)] backdrop-blur-md z-40"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--foreground)',
        }}
      >
        <span className="text-amber-500 mr-1 font-mono">✦</span>
        <span>Voice Assistant</span>
      </div>

      {/* Ripple Animation Ring 1 */}
      <motion.div
        animate={{
          scale: [1, 1.45, 1.7],
          opacity: [0.65, 0.25, 0],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: 'easeOut',
        }}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0) 70%)',
        }}
      />

      {/* Ripple Animation Ring 2 (delayed) */}
      <motion.div
        animate={{
          scale: [1, 1.35, 1.6],
          opacity: [0.5, 0.2, 0],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 0.8,
        }}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
        }}
      />

      {/* Core Animated Button */}
      <motion.button
        id={id}
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.12, y: -2 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Open Voice Product Assistant"
        className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #b45309 100%)',
          boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.5), 0 4px 12px -2px rgba(0, 0, 0, 0.25)',
          border: '2px solid rgba(254, 243, 199, 0.6)',
        }}
      >
        {/* Subtle Glass Top Highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/15 pointer-events-none" />

        {/* Ambient Orbiting Glow Dot */}
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full pointer-events-none flex items-start justify-center p-0.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-100 shadow-[0_0_6px_#fff]" />
        </motion.span>

        {/* Dancing Waveform Visualizer Bars (Subtle micro-movement) */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity">
          <motion.span
            animate={{ scaleY: [0.5, 1.2, 0.6] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            className="w-0.5 h-3 bg-white/70 rounded-full"
          />
          <motion.span
            animate={{ scaleY: [0.7, 1.4, 0.5] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="w-0.5 h-4 bg-white/70 rounded-full"
          />
        </div>

        {/* Center Mic Icon */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative z-10 text-white flex items-center justify-center drop-shadow-md"
        >
          <Mic size={22} strokeWidth={2.6} className="text-white" />
        </motion.div>
      </motion.button>
    </div>
  );
};

export default AnimatedVoiceAssistantButton;
