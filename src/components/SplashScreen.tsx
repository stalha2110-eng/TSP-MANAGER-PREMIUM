import React, { useEffect } from 'react';
import { motion } from 'motion/react';
// @ts-ignore
import appLogo from './ui/tsBizManagerLogo.png';

export interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0c10]"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="relative mb-6">
          <motion.div 
            className="absolute -inset-6 bg-gradient-to-tr from-amber-500/25 via-amber-400/10 to-transparent blur-3xl rounded-full pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex items-center justify-center p-2">
            <motion.img 
              src={appLogo} 
              alt="TS BIZ MANAGER" 
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] filter select-none pointer-events-none" 
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-black tracking-tighter text-white">
            TS <span className="text-amber-500">BIZ</span> MANAGER
          </h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.5em] text-white/30">
            Enterprise Business Core v2.5
          </p>
        </motion.div>
        
        <div className="mt-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-amber-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
export default SplashScreen;
