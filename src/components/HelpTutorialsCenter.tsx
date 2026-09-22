import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, HelpCircle, Mic, Search, Layers, Play, 
  Sparkles, CheckCircle, Info, ChevronRight, MessageSquare
} from 'lucide-react';
import { TutorialFlowType } from './OnboardingOverlayTour';

interface HelpTutorialsCenterProps {
  onStartTutorial: (flow: TutorialFlowType) => void;
}

export const HelpTutorialsCenter: React.FC<HelpTutorialsCenterProps> = ({
  onStartTutorial,
}) => {
  const [activeTab, setActiveTab] = useState<'tutorials' | 'help'>('tutorials');

  return (
    <div className="space-y-4 pt-2 pb-6 text-left select-none">
      {/* Top Segmented Switch: Tutorials vs Help */}
      <div className="flex bg-[var(--foreground)]/5 p-1 rounded-2xl border border-[var(--border)] gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('tutorials')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'tutorials'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5'
          }`}
        >
          <BookOpen size={14} />
          <span>Tutorials (सीखें)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('help')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'help'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5'
          }`}
        >
          <HelpCircle size={14} />
          <span>Help (मदद)</span>
        </button>
      </div>

      {/* Content Rendering based on Tab */}
      {activeTab === 'tutorials' ? (
        <div className="space-y-3">
          {/* Header Info */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
              <Sparkles size={16} />
            </span>
            <div>
              <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider">
                इंटरैक्टिव ट्यूटोरियल व वॉइस गाइड
              </h4>
              <p className="text-[11px] text-[var(--foreground)]/70 mt-0.5 leading-relaxed font-medium">
                किसी भी ट्यूटोरियल पर क्लिक करें। ऐप आपको स्क्रीन पर ले जाकर हिंदी आवाज व इशारों (Gestures) से सिखाएगा।
              </p>
            </div>
          </div>

          {/* Tutorial Cards List */}
          <div className="space-y-2.5">
            {/* 1. HOW TO ADD PRODUCTS: VOICE ASSISTANT */}
            <motion.div
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-amber-500/60 shadow-sm transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mic size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-[8.5px] font-black uppercase tracking-wider">
                      वॉइस एंट्री
                    </span>
                    <span className="text-[8.5px] font-bold text-[var(--foreground)]/40 uppercase">
                      3 कदम • 30 सेकंड
                    </span>
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)] mt-1 group-hover:text-amber-500 transition-colors">
                    Product ki entry kaise kare? (Voice Assistant)
                  </h4>
                  <p className="text-[11px] text-[var(--foreground)]/60 mt-0.5 leading-relaxed">
                    माइक बटन दबाकर बोलें (उदा. "1 किलो चीनी 45 रुपये") और प्रोडक्ट तुरंत सेव करें।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onStartTutorial('voice_add_product')}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Play size={13} fill="currentColor" />
                <span>ट्यूटोरियल शुरू करें (Start)</span>
              </button>
            </motion.div>

            {/* 2. HOW TO CREATE BILL - METHOD 2: SEARCH BAR (QUANTITY & AMOUNT) */}
            <motion.div
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-blue-500/60 shadow-sm transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-500/15 text-blue-500 border border-blue-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Search size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-500 text-[8.5px] font-black uppercase tracking-wider">
                      सर्च बार बिलिंग
                    </span>
                    <span className="text-[8.5px] font-bold text-[var(--foreground)]/40 uppercase">
                      4 कदम • 45 सेकंड
                    </span>
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)] mt-1 group-hover:text-blue-500 transition-colors">
                    Bill kaise banaye: Search Bar se (Quantity & Amount)
                  </h4>
                  <p className="text-[11px] text-[var(--foreground)]/60 mt-0.5 leading-relaxed">
                    मात्रा (जैसे '2 kg Chini') और रुपये (जैसे '50 rs Chini') दोनों तरीकों से सर्च बार द्वारा बिल बनाना सीखें।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onStartTutorial('create_bill_method2')}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 active:scale-95 transition-all"
              >
                <Play size={13} fill="currentColor" />
                <span>ट्यूटोरियल शुरू करें (Start)</span>
              </button>
            </motion.div>

            {/* 3. HOW TO CREATE BILL - METHOD 3: ALL ITEMS SECTION (CLICK & LONG PRESS) */}
            <motion.div
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-purple-500/60 shadow-sm transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-purple-500/15 text-purple-500 border border-purple-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Layers size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-500 text-[8.5px] font-black uppercase tracking-wider">
                      ऑल आइटम्स कैटलॉग
                    </span>
                    <span className="text-[8.5px] font-bold text-[var(--foreground)]/40 uppercase">
                      4 कदम • 45 सेकंड
                    </span>
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)] mt-1 group-hover:text-purple-500 transition-colors">
                    Bill kaise banaye: All Items Section se (Tap & Long Press)
                  </h4>
                  <p className="text-[11px] text-[var(--foreground)]/60 mt-0.5 leading-relaxed">
                    कार्ड पर 1 बार क्लिक करने और 1 सेकंड दबाकर (Long Press) वजन चुनने के सभी तरीके सीखें।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onStartTutorial('create_bill_method3')}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95 transition-all"
              >
                <Play size={13} fill="currentColor" />
                <span>ट्यूटोरियल शुरू करें (Start)</span>
              </button>
            </motion.div>
          </div>
        </div>
      ) : (
        /* Blank / Coming Soon Help section as requested by user */
        <div className="p-8 rounded-3xl bg-[var(--card)] border border-[var(--border)] text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-[var(--foreground)]/5 border border-[var(--border)] text-[var(--primary)] flex items-center justify-center mx-auto shadow-inner">
            <HelpCircle size={28} />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-black uppercase tracking-wider inline-block mb-1.5">
              Support Center
            </span>
            <h3 className="text-base font-black uppercase tracking-tight text-[var(--foreground)]">
              Help & Support Center
            </h3>
            <p className="text-xs text-[var(--foreground)]/50 mt-1 max-w-xs mx-auto leading-relaxed">
              मदद और सपोर्ट सेक्शन तैयार किया जा रहा है। जल्द ही यहाँ डायरेक्ट गाइड, हेल्पडेस्क और सपोर्ट उपलब्ध होगा।
            </p>
          </div>
          <div className="pt-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/40 border border-dashed border-[var(--border)] px-4 py-2 rounded-xl inline-block">
              Coming Soon • जल्द उपलब्ध होगा
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
