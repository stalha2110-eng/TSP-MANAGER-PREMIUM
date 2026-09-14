import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

export interface ExportCostChoiceModalProps {
  onClose: () => void;
  onSelectOption: (includeCost: boolean) => void;
}

export function ExportCostChoiceModal({ 
  onClose, 
  onSelectOption 
}: ExportCostChoiceModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">Select Export Mode</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">
              Choose whether to include Cost Prices in your document
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="rounded-full h-10 w-10 border-white/10 cursor-pointer">
            <X size={20} />
          </Button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: With Cost Price */}
            <div 
              onClick={() => onSelectOption(true)}
              className="p-6 rounded-3xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 cursor-pointer transition-all flex flex-col justify-between group h-40 select-none"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 font-bold text-lg">
                  ₹
                </div>
                <h4 className="font-black text-sm text-[var(--foreground)] leading-none mb-1 group-hover:text-emerald-500 transition-colors">
                  With Cost Price
                </h4>
                <p className="text-[10px] opacity-60 leading-normal font-medium">
                  Includes buying price, profit margin calculation, and cost units. Best for internal operations and management.
                </p>
              </div>
            </div>

            {/* Option 2: Without Cost Price */}
            <div 
              onClick={() => onSelectOption(false)}
              className="p-6 rounded-3xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 border border-[var(--primary)]/10 hover:border-[var(--primary)]/30 cursor-pointer transition-all flex flex-col justify-between group h-40 select-none"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-4 font-bold text-lg">
                  🏷️
                </div>
                <h4 className="font-black text-sm text-[var(--foreground)] leading-none mb-1 group-hover:text-[var(--primary)] transition-colors">
                  Without Cost Price
                </h4>
                <p className="text-[10px] opacity-60 leading-normal font-medium">
                  Hides confidential cost details. Safely lists only retail and wholesale prices. Perfect to share with retail customers.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="rounded-full px-6 cursor-pointer">
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
export default ExportCostChoiceModal;
