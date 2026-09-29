import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn } from 'lucide-react';

export interface ImagePreviewDetail {
  url: string;
  title?: string;
}

export const previewImage = (url: string, title?: string) => {
  if (!url) return;
  window.dispatchEvent(new CustomEvent<ImagePreviewDetail>('app-preview-image', { detail: { url, title } }));
};

export const ImagePreviewModal: React.FC = () => {
  const [previewData, setPreviewData] = useState<ImagePreviewDetail | null>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<ImagePreviewDetail>;
      if (customEvent.detail?.url) {
        setPreviewData(customEvent.detail);
      }
    };

    window.addEventListener('app-preview-image', handleOpen);
    return () => window.removeEventListener('app-preview-image', handleOpen);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewData) {
        setPreviewData(null);
      }
    };

    if (previewData) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData]);

  if (!previewData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        {/* Backdrop click to close */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={() => setPreviewData(null)}
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 max-w-2xl w-full bg-[var(--card)] border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3.5 px-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)] shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                <ZoomIn size={16} />
              </div>
              <h3 className="font-extrabold uppercase text-xs sm:text-sm text-[var(--foreground)] truncate tracking-wide">
                {previewData.title || 'Item Image Preview'}
              </h3>
            </div>
            
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              className="p-1.5 rounded-xl bg-[var(--background)] hover:bg-rose-500/15 text-zinc-400 hover:text-rose-500 border border-[var(--border)] transition-colors cursor-pointer shrink-0"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[220px]">
            <img 
              src={previewData.url} 
              alt={previewData.title || 'Item image'} 
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-xl select-none"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Footer */}
          <div className="p-2.5 px-4 bg-[var(--card)] border-t border-[var(--border)] flex items-center justify-between text-[10px] text-zinc-400 font-mono shrink-0">
            <span className="uppercase font-bold tracking-wider">High Resolution View</span>
            <span className="opacity-60">Press ESC or click outside to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
