import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/Button';

export interface DeleteConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  t: any;
}

export function DeleteConfirmationModal({ onClose, onConfirm, count, t }: DeleteConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConfirmed = inputValue.trim().toLowerCase() === 'yes';

  const handleConfirm = async () => {
    if (!isConfirmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm card p-8 space-y-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-red-500/20"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center shadow-inner">
            <Trash2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Purge Confirmation</h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Caution: Irreversible Op</p>
          </div>
          <p className="text-xs font-medium opacity-60 leading-relaxed">
            You are about to delete <strong>{count} {count === 1 ? 'item' : 'items'}</strong> from the database, cloud, and local device.
          </p>
          <div className="w-full p-4 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60">
              Type <span className="text-red-500">"yes"</span> to authorize
            </p>
            <input 
              autoFocus
              className="w-full bg-[var(--background)] border border-red-500/20 rounded-xl px-4 py-3 text-center font-black uppercase tracking-[0.2em] focus:border-red-500 outline-none transition-all"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed && !isSubmitting) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder="..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100"
          >
            Abort
          </Button>
          <Button 
            variant="primary"
            disabled={!isConfirmed || isSubmitting}
            onClick={handleConfirm}
            className="flex-1 rounded-2xl h-12 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 disabled:opacity-30 disabled:scale-100"
          >
            {isSubmitting ? 'Purging...' : 'Confirm'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
