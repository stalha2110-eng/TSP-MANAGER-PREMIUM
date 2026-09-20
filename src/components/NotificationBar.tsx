import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BellRing, ChevronDown, Clock, FileText, TrendingUp, X } from 'lucide-react';
import { Note, Item } from '../types';
import { Alert } from '../constants/initialState';
import { cn } from '../lib/utils';

export interface NotificationBarProps {
  notes: Note[];
  items: Item[];
  dismissed: string[];
  currentTime: Date;
  onDismiss: (id: string) => void;
  onView: (id: string, type: 'item' | 'note' | 'batch') => void;
}

export function NotificationBar({ 
  notes, 
  items,
  dismissed, 
  currentTime,
  onDismiss, 
  onView
}: NotificationBarProps) {
  const [expanded, setExpanded] = useState(false);

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const now = currentTime;

    // 1. Process High-Priority Notes & Reminders
    notes.forEach(note => {
      const noteTitle = note.title?.toLowerCase() || '';
      const noteDesc = note.description?.toLowerCase() || '';
      const isKOT = noteTitle.includes('kitchen ticket') || noteTitle.includes('kot-') || noteDesc.includes('kot-');
      if (isKOT) return;

      const isReminder = note.category === 'Reminder' && note.dueDate;
      const isDue = isReminder && new Date(note.dueDate!) <= now;
      const isSoon = isReminder && !isDue && (new Date(note.dueDate!).getTime() - now.getTime()) < 3600000 * 24;

      if (!dismissed.includes(note.id) && (isDue || isSoon || note.priority === 'Urgent' || note.priority === 'Important')) {
        list.push({
          id: note.id,
          type: 'note',
          title: note.title,
          subtitle: isDue ? "REACHED DUE DATE" : isSoon ? `Due ${new Date(note.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : note.description,
          priority: isDue ? 'Urgent' : note.priority,
          icon: isReminder ? <Clock size={16} /> : <FileText size={16} />,
          timestamp: note.createdAt
        });
      }
    });

    // 2. Process Item Price Changes (Batch if > 2)
    const itemPriceChanges = items.filter(item => {
      if (item.priceChangedAt && !dismissed.includes(`price-${item.id}-${item.priceChangedAt}`)) {
        const changedAt = new Date(item.priceChangedAt);
        return (now.getTime() - changedAt.getTime() < 3600000 * 24);
      }
      return false;
    });

    if (itemPriceChanges.length > 2) {
      if (!dismissed.includes('batched-prices')) {
        list.push({
          id: 'batched-prices',
          type: 'batch',
          title: `${itemPriceChanges.length} Price Updates`,
          subtitle: `Multiple inventory items have new rates. Audit required.`,
          priority: 'Info',
          icon: <TrendingUp size={16} />,
          timestamp: itemPriceChanges[0].priceChangedAt || now.toISOString()
        });
      }
    } else {
      itemPriceChanges.forEach(item => {
        list.push({
          id: item.id,
          type: 'item',
          title: `Rate Change: ${item.translations?.en || item.name}`,
          subtitle: `Updated by ${item.lastChangedBy || 'System'}`,
          priority: 'Info',
          icon: <TrendingUp size={16} />,
          timestamp: item.priceChangedAt!
        });
      });
    }

    // 3. Process Less Critical Info Notes (Batch if > 2)
    const infoNotes = notes.filter(n => 
      !dismissed.includes(n.id) && 
      n.priority === 'Info' && 
      !n.dueDate && 
      (now.getTime() - new Date(n.createdAt).getTime() < 3600000 * 24)
    );

    if (infoNotes.length > 2) {
      if (!dismissed.includes('batched-info-notes')) {
        list.push({
          id: 'batched-info-notes',
          type: 'batch',
          title: `${infoNotes.length} Operation Logs`,
          subtitle: `Routine updates and log entries recorded today.`,
          priority: 'Info',
          icon: <FileText size={16} />,
          timestamp: infoNotes[0].createdAt
        });
      }
    } else if (infoNotes.length > 0) {
      infoNotes.forEach(note => {
        list.push({
          id: note.id,
          type: 'note',
          title: note.title,
          subtitle: note.description,
          priority: 'Info',
          icon: <FileText size={16} />,
          timestamp: note.createdAt
        });
      });
    }

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, items, dismissed, currentTime]);

  if (alerts.length === 0) return null;

  return (
    <div className="sticky top-20 z-40 px-4 py-2 pointer-events-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-2 pointer-events-auto">
        <div 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between px-4 py-3 bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-xl cursor-pointer hover:border-[var(--primary)]/30 transition-all group"
        >
          <div className="flex items-center gap-3">
             <div className="relative">
                <BellRing size={16} className="text-[var(--primary)] animate-bounce" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4 w-4 flex items-center justify-center rounded-full shadow-sm">{alerts.length}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40 leading-none mb-0.5">Live Settings Feed</span>
                <span className="text-xs font-bold truncate max-w-[180px] leading-tight">{alerts[0].title}</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black uppercase tracking-tight opacity-30 group-hover:opacity-100 transition-opacity">
                {expanded ? 'Hide Feed' : 'Explore Feed'}
             </span>
             <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                <ChevronDown size={14} className="opacity-40" />
             </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              className="overflow-hidden"
            >
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-2 space-y-1 max-h-[400px] overflow-y-auto no-scrollbar mt-1">
                 {alerts.map((alert, index) => (
                   <div 
                     key={`${alert.type || 'alert'}-${alert.id || 'id'}-${index}`}
                     className={cn(
                       "flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--primary)]/5 transition-all cursor-pointer group/item border border-transparent hover:border-[var(--primary)]/10",
                       alert.priority === 'Urgent' ? "bg-red-500/5 shadow-inner" : ""
                     )}
                     onClick={(e) => {
                       e.stopPropagation();
                       onView(alert.id, alert.type);
                     }}
                   >
                     <div className={cn(
                       "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                       alert.priority === 'Urgent' ? "bg-red-500 text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"
                     )}>
                       {alert.icon}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-tight truncate leading-none">{alert.title}</p>
                          {alert.priority === 'Urgent' && <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase">Critical</span>}
                        </div>
                        <p className="text-[11px] font-medium opacity-50 truncate mt-1">{alert.subtitle}</p>
                     </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          let dismissId = alert.id;
                          if (alert.type === 'item') dismissId = `price-${alert.id}-${alert.timestamp}`;
                          onDismiss(dismissId);
                        }}
                        className="opacity-80 group-hover/item:opacity-100 p-2 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10 cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X size={16} />
                      </button>
                   </div>
                 ))}
                 <div className="py-2 text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-20 italic">End of system timeline</p>
                 </div>
              </div>
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
export default NotificationBar;
