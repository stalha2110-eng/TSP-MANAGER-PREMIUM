import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, ChevronDown, ChevronUp, FileText, Package, CreditCard, 
  Users, Truck, Clock, Calendar, CheckCircle2, Pin, Trash2, X, Mic 
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { Note } from '../types';
import { useBackModal } from '../utils/backNavigationManager';

export interface NotesDashboardProps {
  notes: Note[];
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  t: any;
  isPreview?: boolean;
}

export function NotesDashboard({ 
  notes, 
  expanded, 
  onToggle, 
  onAdd, 
  onUpdate, 
  onDelete, 
  t,
  isPreview = false
}: NotesDashboardProps) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesFilter = filter === 'All' || n.category === filter;
      const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                           n.description.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, filter, search]);

  const displayNotes = isPreview ? filteredNotes.slice(0, 3) : filteredNotes;
  const categories = ['All', 'Stock', 'Payment', 'Customer', 'Supplier', 'Reminder', 'General'];

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Important': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Stock': return <Package size={14} />;
      case 'Payment': return <CreditCard size={14} />;
      case 'Customer': return <Users size={14} />;
      case 'Supplier': return <Truck size={14} />;
      case 'Reminder': return <Clock size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-700", !isPreview && "space-y-6")}>
      {!isPreview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={onToggle} className="flex items-center gap-3 group">
               <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
                 {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
               </div>
               <div>
                 <h3 className="text-xl font-black uppercase tracking-widest opacity-80">{t.notesDashboard}</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Operational Journal</p>
               </div>
            </button>
            <Button onClick={onAdd} className="rounded-xl flex gap-2 h-10 px-4 bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
               <Plus size={18} /> <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{t.addNote}</span>
            </Button>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                   <div className="flex-1 relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20" size={16} />
                     <input 
                       className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] py-2.5 pl-10 pr-4 text-xs font-bold focus:border-[var(--primary)] outline-none transition-all placeholder:opacity-20"
                       placeholder="Search journal..."
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                     />
                   </div>
                   <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilter(cat)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                            filter === cat 
                              ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20" 
                              : "bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className={cn(
        "grid gap-4 transition-all",
        !expanded && !isPreview ? "opacity-30 blur-[1px] grayscale pointer-events-none" : "opacity-100",
        isPreview ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        <AnimatePresence mode="popLayout">
          {displayNotes.length > 0 ? displayNotes.map((note, nIdx) => (
            <NoteCard 
               key={`note-${note.id || 'note'}-${nIdx}`} 
               note={note} 
               onUpdate={onUpdate} 
               onDelete={onDelete} 
               t={t}
               priorityClass={getPriorityClass(note.priority)}
               categoryIcon={getCategoryIcon(note.category)}
               isPreview={isPreview}
            />
          )) : (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="col-span-full py-16 text-center card border-dashed border-[var(--border)] border-white/10 opacity-40">
               <FileText className="mx-auto mb-4 opacity-20" size={48} />
               <p className="text-xs font-black uppercase tracking-widest opacity-20">Zero active entries detected</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function NoteCard({ 
  note, onUpdate, onDelete, t, priorityClass, categoryIcon, isPreview 
}: { 
  note: Note; 
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  t: any;
  priorityClass: string;
  categoryIcon: React.ReactNode;
  isPreview?: boolean;
  key?: any;
}) {
  return (
    <motion.div 
      layout
      key={note.id}
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      whileHover={isPreview ? undefined : { y: -6, scale: 1.015 }}
      whileTap={isPreview ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      className={cn(
        "group relative rounded-[2.5rem] transition-colors duration-200",
        isPreview ? "p-4 hover:bg-[var(--primary)]/5" : "bg-[var(--card)] p-6 shadow-sm border border-[var(--border)] hover:shadow-2xl hover:border-[var(--primary)]/30",
        note.status === 'Completed' && !isPreview && 'opacity-30 grayscale saturate-0'
      )}
    >
      <div className="flex items-start gap-5">
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-inner", priorityClass)}>
           {categoryIcon}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
           <div className="flex items-center gap-2">
              <span className={cn("text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border", priorityClass)}>
                {note.priority}
              </span>
              <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.2em]">{note.category}</span>
           </div>
           <h5 className={cn("font-black tracking-tight text-base truncate uppercase", note.status === 'Completed' && "line-through opacity-40")}>
             {note.title}
           </h5>
           <p className={cn("text-xs font-medium opacity-60 line-clamp-2 leading-relaxed h-[2.5rem]", note.status === 'Completed' && "opacity-20")}>
             {note.description}
           </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] border-dashed pt-5">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 opacity-30">
               <Clock size={12} />
               <span className="text-[9px] font-black uppercase tracking-tighter">
                 {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
            </div>
            {note.dueDate && (
               <div className="flex items-center gap-1.5 text-amber-500/80">
                  <Calendar size={12} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">{new Date(note.dueDate).toLocaleDateString()}</span>
               </div>
            )}
         </div>
         <div className={cn("flex gap-1.5 transition-opacity duration-500", isPreview ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100")}>
            <button onClick={() => onUpdate(note.id, { status: note.status === 'Completed' ? 'Active' : 'Completed' })} className="p-2.5 bg-green-500/5 hover:bg-green-500 hover:text-white rounded-xl transition-all active:scale-90">
               <CheckCircle2 size={16} />
            </button>
            <button onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })} className={cn("p-2.5 rounded-xl transition-all active:scale-90", note.isPinned ? "bg-amber-500 text-white" : "bg-amber-500/5 hover:bg-amber-500 hover:text-white")}>
               <Pin size={16} />
            </button>
            <button onClick={() => onDelete(note.id)} className="p-2.5 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-90">
               <Trash2 size={16} />
            </button>
         </div>
      </div>
    </motion.div>
  );
}

export function NoteFormModal({ onClose, onSave, t }: { onClose: () => void; onSave: (data: any) => void; t: any }) {
  useBackModal(true, onClose, 'note_form_modal');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General' as const,
    priority: 'Info' as const,
    dueDate: '',
    isPinned: false
  });
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice-to-text not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isWorking = false;
    const originalStart = recognition.start;
    recognition.start = function() {
      if (isWorking) {
        console.warn("SpeechRecognition already working.");
        return;
      }
      try {
        isWorking = true;
        originalStart.call(recognition);
      } catch (err) {
        console.warn("SpeechRecognition start error:", err);
      }
    };

    recognition.onstart = () => {
      isWorking = true;
      setIsListening(true);
    };
    recognition.onend = () => {
      isWorking = false;
      setIsListening(false);
    };
    recognition.onerror = () => {
      isWorking = false;
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, description: prev.description + ' ' + transcript }));
    };
    try {
      recognition.start();
    } catch (e) {
      console.warn("Speech start bypassed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="w-full max-w-lg card p-8 space-y-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-white/5"
      >
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black uppercase tracking-widest">{t.addNote}</h3>
           <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
             <X size={20} />
           </button>
        </div>

        <div className="space-y-4">
           <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block">Title</label>
              <input 
                 value={formData.title} 
                 onChange={e => setFormData({ ...formData, title: e.target.value })}
                 className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
                 placeholder="Short descriptive title"
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block">Category</label>
                 <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none"
                 >
                    {['Stock', 'Payment', 'Customer', 'Supplier', 'Reminder', 'General'].map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block">Priority</label>
                 <select 
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none"
                 >
                    {['Urgent', 'Important', 'Completed', 'Info'].map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
              </div>
           </div>

           <div>
              <div className="flex items-center justify-between mb-1">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block">Details</label>
                 <button 
                   onClick={handleVoiceInput}
                   className={cn(
                     "h-7 w-7 rounded-full flex items-center justify-center transition-all",
                     isListening ? "bg-red-500 scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-[var(--primary)]/20 text-[var(--primary)]"
                   )}
                 >
                    <Mic size={14} className={isListening ? 'animate-pulse text-white' : ''} />
                 </button>
              </div>
              <textarea 
                 value={formData.description} 
                 onChange={e => setFormData({ ...formData, description: e.target.value })}
                 className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 min-h-[100px] outline-none transition-all"
                 placeholder="Note details (Use microphone icon for voice-to-text)"
              />
           </div>

           <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                 <input type="checkbox" checked={formData.isPinned} onChange={e => setFormData({ ...formData, isPinned: e.target.checked })} className="h-5 w-5 rounded border-[var(--border)] bg-[var(--background)]" />
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Pin to top</span>
              </label>
              <div className="flex-1">
                 <input 
                   type="date" 
                   value={formData.dueDate} 
                   onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                   className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs outline-none"
                 />
              </div>
           </div>
        </div>

        <div className="flex gap-4 pt-4">
           <Button variant="ghost" className="flex-1 rounded-2xl" onClick={onClose}>Cancel</Button>
           <Button className="flex-1 rounded-2xl py-4" onClick={() => onSave(formData)}>Create Note</Button>
        </div>
      </motion.div>
    </div>
  );
}
