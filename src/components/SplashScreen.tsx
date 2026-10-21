import React, { useEffect } from 'react';
import { motion } from 'motion/react';
// @ts-ignore
import appLogo from './ui/premium(TsPrice).png';

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
        <div className="relative mb-8">
          <motion.div 
            className="absolute inset-0 bg-amber-500 blur-[60px] opacity-20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative h-40 w-40 rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-900 p-1 border border-white/10 shadow-2xl overflow-hidden">
             <img src={appLogo} alt="TS" className="h-full w-full object-contain" />
          </div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-black tracking-tighter text-white">
            TS <span className="text-amber-500">PRICE</span> MANAGER
          </h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.5em] text-white/30">
            Enterprise Pricing Core v2.5
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
