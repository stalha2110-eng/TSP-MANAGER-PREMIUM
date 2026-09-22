import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic, ShoppingBag, X, ArrowRight } from 'lucide-react';

interface InitialTutorialWelcomeModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onDismiss: () => void;
}

export const InitialTutorialWelcomeModal: React.FC<InitialTutorialWelcomeModalProps> = ({
  isOpen,
  onContinue,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-zinc-950 text-white rounded-3xl border-2 border-amber-500/50 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-6 overflow-hidden text-left"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="बंद करें (Close)"
          >
            <X size={16} />
          </button>

          {/* Top Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="animate-spin duration-3000" />
              <span>स्मार्ट ऐप गाइड • Quick Tour</span>
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-xl font-black text-white tracking-tight leading-snug">
            क्या आप ऐप चलाना सीखना चाहते हैं?
          </h2>
          <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed font-medium">
            दुकान में सुपरफास्ट काम करने के लिए 1 मिनट में 2 मुख्य चीजें सीखें:
          </p>

          {/* 2 Feature Pills Preview */}
          <div className="space-y-2.5 my-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Mic size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black uppercase text-amber-300">
                  1. प्रोडक्ट की एंट्री (Voice Assistant)
                </h4>
                <p className="text-[11px] text-zinc-400">
                  माइक में बोलकर तुरंत प्रोडक्ट का नाम, भाव और वजन जोड़ना।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <ShoppingBag size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black uppercase text-blue-300">
                  2. बिल बनाना (Dashboard Item Tap)
                </h4>
                <p className="text-[11px] text-zinc-400">
                  डैशबोर्ड पर सिंगल टैप से आइटम जोड़कर रसीद तैयार करना।
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              नहीं, बाद में (No)
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <span>ट्यूटोरियल शुरू करें</span>
              <ArrowRight size={14} strokeWidth={3} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
