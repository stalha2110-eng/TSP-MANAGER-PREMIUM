import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { Item } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { formatNumber } from '../lib/utils';

export function StatCard({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string; 
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5",
  };

  return (
    <div className={cn("p-6 rounded-[2.5rem] border shadow-sm space-y-4 hover:shadow-xl transition-all duration-500", colors[color])}>
       <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
          {icon}
       </div>
       <div>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-tight mb-1">{label}</p>
          <p className="text-xl font-black uppercase tracking-tight">{value}</p>
       </div>
    </div>
  );
}

export function RecentPriceChanges({ 
  items, 
  t, 
  precision, 
  renderHeaderAction 
}: { 
  items: Item[]; 
  t: any; 
  precision: number; 
  renderHeaderAction?: () => React.ReactNode; 
}) {
  const recentChanges = useMemo(() => {
    return items
      .filter(item => item.priceChangedAt)
      .sort((a, b) => new Date(b.priceChangedAt!).getTime() - new Date(a.priceChangedAt!).getTime())
      .slice(0, 5);
  }, [items]);

  return (
    <div className="card p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4">
       <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-[var(--foreground)]">
            <RotateCcw size={15} className="text-[var(--primary)]" />
            <span>{t.recentPriceChanges || "Recent Price Changes"}</span>
          </div>
          {renderHeaderAction && renderHeaderAction()}
       </div>
       
       {recentChanges.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 opacity-55">
             <div className="h-10 w-10 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center border border-[var(--primary)]/20 animate-pulse">
                <RotateCcw size={18} />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-wide">No Recent Changes</p>
                <p className="text-[9px] opacity-60">Any updates to sell prices or stock purchase costs will appear here.</p>
             </div>
          </div>
       ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {recentChanges.map((item, idx) => (
              <motion.div 
                key={`recent-change-${item.id || 'item'}-${idx}`} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex-shrink-0 w-64 p-4 border border-[var(--border)] bg-[var(--foreground)]/[0.02] rounded-2xl cursor-pointer"
              >
                 <div className="flex items-center justify-between mb-3">
                    <div className="h-8 w-8 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-xs">
                      {DEFAULT_CATEGORIES.find(c => c.id === item.categoryId)?.icon}
                    </div>
                    <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                      {new Date(item.priceChangedAt!).toLocaleDateString()}
                    </span>
                 </div>
                 <h4 className="font-bold text-sm truncate mb-2">{item.name}</h4>
                 <div className="flex items-center gap-4">
                    <div>
                       <p className="text-[8px] font-bold uppercase opacity-40">Retail</p>
                       <p className="text-xs font-bold">₹{formatNumber(item.retailPrice, precision)}</p>
                    </div>
                    <div className="h-6 w-px bg-[var(--border)]" />
                    <div>
                       <p className="text-[8px] font-bold uppercase opacity-40">Cost</p>
                       <p className="text-xs font-bold">₹{formatNumber(item.buyingPrice, precision)}</p>
                    </div>
                 </div>
              </motion.div>
            ))}
          </div>
       )}
    </div>
  );
}
