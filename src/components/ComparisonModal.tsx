import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { Item, LanguageType } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { formatNumber } from '../lib/utils';

export interface ComparisonModalProps {
  selectedItems: Item[];
  onClose: () => void;
  t: any;
  language: LanguageType;
  precision: number;
  hideBuyingPrice: boolean;
}

export function ComparisonModal({ 
  selectedItems, 
  onClose, 
  t, 
  language, 
  precision, 
  hideBuyingPrice 
}: ComparisonModalProps) {
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
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-5xl bg-[var(--background)] rounded-[3rem] border border-[var(--border)] shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
           <div>
             <h2 className="text-2xl font-black tracking-tight">{t.compare || "Compare"} {selectedItems.length} {t.items || "Items"}</h2>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">{t.sideBySide || "Side-by-side analysis"}</p>
           </div>
           <Button variant="outline" size="icon" onClick={onClose} className="rounded-full h-12 w-12 hover:bg-red-500/10 hover:text-red-500 border-white/10 cursor-pointer">
             <X size={24} />
           </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedItems.map((item, sIdx) => {
            const cat = DEFAULT_CATEGORIES.find(c => c.id === item.categoryId);
            const name = (item.translations && (item.translations[language] || item.translations.en)) || item.name;
            return (
              <div key={`sel-card-${item.id || 'item'}-${sIdx}`} className="card p-6 bg-gradient-to-br from-[var(--card)] to-transparent border-white/5 space-y-6">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <div className="h-16 w-16 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-3xl shadow-inner">
                    {cat?.icon || '📦'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg truncate">{name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{cat?.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.retail || "Retail"}</span>
                      <div className="text-right">
                        <span className="text-sm font-black">₹{formatNumber(item.retailPrice, precision)}</span>
                        <span className="text-[8px] opacity-40 block">/ {item.retailPriceUnit}</span>
                      </div>
                   </div>

                   {!hideBuyingPrice && (
                     <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.buying || "Buying"}</span>
                        <div className="text-right">
                          <span className="text-sm font-black">₹{formatNumber(item.buyingPrice, precision)}</span>
                          <span className="text-[8px] opacity-40 block">/ {item.buyingPriceUnit}</span>
                        </div>
                     </div>
                   )}

                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.inventory || "Stock"}</span>
                      <span className="text-sm font-black">{item.quantity} {item.unit}</span>
                   </div>

                   {!hideBuyingPrice && (
                     <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">{t.margin || "Margin"}</span>
                        <span className="text-sm font-black text-emerald-500">
                          {(( (item.retailPrice * (item.quantity || 1)) - (item.buyingPrice * (item.quantity || 1)) ) / ( (item.buyingPrice * (item.quantity || 1)) || 1 ) * 100).toFixed(1)}%
                        </span>
                     </div>
                   )}

                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.lastChanged || "Last Update"}</span>
                      <span className="text-[10px] font-bold opacity-60">
                        {item.priceChangedAt ? new Date(item.priceChangedAt).toLocaleDateString() : 'Never'}
                      </span>
                   </div>
                </div>

                {item.notes && (
                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Extra Info</p>
                  <p className="text-[10px] font-medium leading-relaxed opacity-70 italic">"{item.notes}"</p>
                </div>
              )}

              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
export default ComparisonModal;
