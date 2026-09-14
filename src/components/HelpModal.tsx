import React from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, Zap } from 'lucide-react';
import { Button } from './ui/Button';

export interface HelpModalProps {
  onClose: () => void;
  t: any;
}

export function HelpModal({ onClose, t }: HelpModalProps) {
  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t.help}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Enterprise Support & Documentation</p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="rounded-full h-10 w-10 border-white/10 cursor-pointer">
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-[var(--primary)]">
              <BookOpen size={20} />
              <h3 className="font-bold uppercase text-xs tracking-widest">Getting Started</h3>
            </div>
            <div className="grid gap-4">
              {faqs.map((faq, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-[var(--primary)]/20 transition-all">
                  <p className="font-black text-sm mb-2 text-[var(--primary)]">Q: {faq.q}</p>
                  <p className="text-xs opacity-60 leading-relaxed font-medium">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
              <Zap size={20} />
              <h3 className="font-bold uppercase text-xs tracking-widest">Pro Tips</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex gap-3 text-xs opacity-60">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Use the <strong>"Compare"</strong> feature to view price differences between items side-by-side.</span>
              </li>
              <li className="flex gap-3 text-xs opacity-60">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Enable <strong>Lock</strong> to hide cost prices when showing customers the screen.</span>
              </li>
              <li className="flex gap-3 text-xs opacity-60">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Each item can have a <strong>"Margin Spread"</strong> which updates live as you edit prices.</span>
              </li>
            </ul>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
export default HelpModal;
