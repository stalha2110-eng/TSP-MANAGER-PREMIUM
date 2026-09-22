import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, X, Play, BookOpen } from 'lucide-react';

interface OnboardingPromptModalProps {
  isOpen: boolean;
  stage: 'add_product' | 'make_bill';
  onDecline: () => void;
  onAccept: () => void;
}

export const OnboardingPromptModal: React.FC<OnboardingPromptModalProps> = ({
  isOpen,
  stage,
  onDecline,
  onAccept
}) => {
  if (!isOpen) return null;

  const title = stage === 'add_product' 
    ? 'नया सामान (Product) कैसे जोड़ें?' 
    : 'बिल (Bill) कैसे बनाएं?';

  const subtitle = stage === 'add_product'
    ? 'क्या आप लाइव एनीमेशन और आवाज़ के साथ सीखना चाहते हैं कि वॉइस असिस्टेंट से नया सामान कैसे जोड़ें?'
    : 'क्या आप लाइव एनीमेशन और आवाज़ के साथ सीखना चाहते हैं कि ग्राहकों का बिल तुरंत कैसे बनाएं?';

  const badgeText = stage === 'add_product'
    ? 'ट्यूटोरियल भाग 1 (Part 1)'
    : 'ट्यूटोरियल भाग 2 (Part 2)';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDecline}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm rounded-3xl bg-[var(--card)] border-2 border-[var(--primary)]/30 p-6 shadow-2xl overflow-hidden text-center z-10"
        >
          {/* Top accent glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-[var(--primary)] to-emerald-500" />

          {/* Close button */}
          <button
            onClick={onDecline}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/50 hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Icon Badge */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center mb-3 shadow-inner">
            <Sparkles size={28} className="animate-pulse" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider mb-2">
            {badgeText}
          </span>

          <h3 className="text-base font-black text-[var(--foreground)] tracking-tight">
            {title}
          </h3>

          <p className="text-xs text-[var(--foreground)]/70 mt-2 leading-relaxed px-2">
            {subtitle}
          </p>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={onDecline}
              className="py-3 px-4 rounded-xl border border-[var(--border)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)]/70 hover:text-[var(--foreground)] text-xs font-bold transition-all cursor-pointer select-none"
            >
              No (नहीं)
            </button>

            <button
              type="button"
              onClick={onAccept}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer select-none flex items-center justify-center gap-1.5"
            >
              <span>Continue tutorials</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
