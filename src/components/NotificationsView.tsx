import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock, FileText, TrendingUp, BellRing } from 'lucide-react';
import { cn } from '../lib/utils';
import { Note, Item } from '../types';

export interface NotificationsViewProps {
  notes: Note[];
  items: Item[];
  dismissed: string[];
  currentTime: Date;
  onViewNote: (id: string) => void;
  onViewItem: (id: string) => void;
}

export function NotificationsView({ 
  notes, 
  items, 
  dismissed, 
  currentTime, 
  onViewNote, 
  onViewItem 
}: NotificationsViewProps) {
  const allNotifications = useMemo(() => {
    const list: any[] = [];
    const now = currentTime;

    // 1. Reminders & Notes
    notes.forEach(note => {
      const titleLower = note.title?.toLowerCase() || '';
      const descLower = note.description?.toLowerCase() || '';
      const isKOT = titleLower.includes('kitchen ticket') || titleLower.includes('kot-') || descLower.includes('kot-');
      if (isKOT) return;

      const isReminder = note.category === 'Reminder' && note.dueDate;
      const isDue = isReminder && new Date(note.dueDate!) <= now;
      const isSoon = isReminder && !isDue && (new Date(note.dueDate!).getTime() - now.getTime()) < 3600000 * 24;

      list.push({
        id: note.id,
        type: 'note',
        category: note.category,
        title: note.title,
        description: note.description,
        timestamp: note.createdAt,
        priority: isDue ? 'Urgent' : note.priority,
        icon: isReminder ? <Clock size={20} /> : <FileText size={20} />,
        dueInfo: isDue ? "OVERDUE" : isSoon ? "Due Soon" : null,
        dismissed: dismissed.includes(note.id)
      });
    });

    // 2. Price Changes
    items.forEach(item => {
      if (item.priceChangedAt) {
        list.push({
          id: `price-${item.id}-${item.priceChangedAt}`,
          type: 'price',
          title: `Price Evolution: ${item.translations?.en || item.name}`,
          description: `Price changed on ${new Date(item.priceChangedAt).toLocaleDateString()} by ${item.lastChangedBy || 'Master Node'}.`,
          timestamp: item.priceChangedAt,
          priority: 'Info',
          icon: <TrendingUp size={20} />,
          itemId: item.id,
          dismissed: dismissed.includes(`price-${item.id}-${item.priceChangedAt}`)
        });
      }
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, items, dismissed, currentTime]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-32">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Activity <span className="text-[var(--primary)]">Feed</span></h1>
        <p className="text-xs font-bold opacity-40 uppercase tracking-[0.2em]">Audit trail and real-time operational alerts</p>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {allNotifications.map((notif, index) => (
          <motion.div
            key={`${notif.type || 'notif'}-${notif.id || 'id'}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => notif.type === 'price' ? onViewItem(notif.itemId) : onViewNote(notif.id)}
            className={cn(
              "group p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex items-center gap-6",
              notif.dismissed ? "opacity-40 grayscale" : "opacity-100",
              notif.priority === 'Urgent' ? "bg-red-500/5 border-red-500/20" : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]/30"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 shrink-0",
              notif.priority === 'Urgent' ? "bg-red-500 text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"
            )}>
              {notif.icon}
            </div>

            <div className="flex-1 space-y-1 min-w-0">
               <div className="flex items-center gap-3">
                  <h3 className="font-bold text-sm truncate uppercase tracking-tight">{notif.title}</h3>
                  {notif.priority === 'Urgent' && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase">Critical</span>
                  )}
                  {notif.dueInfo && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase">{notif.dueInfo}</span>
                  )}
               </div>
               <p className="text-xs opacity-60 line-clamp-1">{notif.description}</p>
            </div>

            <div className="text-right shrink-0">
               <p className="text-[10px] font-black opacity-30 uppercase">{new Date(notif.timestamp).toLocaleDateString()}</p>
               <p className="text-[10px] font-black opacity-30 uppercase">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </motion.div>
        ))}

        {allNotifications.length === 0 && (
          <div className="py-32 text-center space-y-4 opacity-30">
             <BellRing size={64} className="mx-auto opacity-20" />
             <p className="font-black uppercase tracking-widest text-sm">System Quiet. No active alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default NotificationsView;
