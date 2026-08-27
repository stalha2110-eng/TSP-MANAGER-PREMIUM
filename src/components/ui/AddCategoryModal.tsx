import * as React from "react";
import { useState } from "react";
import { motion } from "motion/react";
import { X, FolderPlus } from "lucide-react";
import { Button } from "./Button";

interface AddCategoryModalProps {
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
  t: any;
}

export function AddCategoryModal({ onClose, onSave, t }: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t.categoryNameRequired || "Category name is required");
      return;
    }
    onSave(name.trim(), "");
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="w-full max-w-md p-6 md:p-8 space-y-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/5 bg-[#0e121a] rounded-3xl text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <FolderPlus size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                {t.addNewCategory || "Add Category"}
              </h3>
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-bold">
                {t.dashboardSync || "Real-time Cloud Sync"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-white/[0.08] flex items-center justify-center transition-colors text-white/60 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Name Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block">
              {t.categoryName || "Category Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder={t.categoryPlaceholder || "e.g., Beverages, Grains, Dairy..."}
              className="w-full bg-[#07090d] border-2 border-white/5 rounded-2xl px-5 py-4 font-black text-lg text-white focus:border-[var(--primary)] focus:outline-none transition-all placeholder:text-white/20 shadow-inner"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-500 font-bold uppercase tracking-wide">
                {error}
              </p>
            )}
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-[10px] text-white/50 leading-relaxed font-medium">
              ℹ️ This category will be available instantly in the item creation form and filterable across the real-time stock dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 rounded-xl border-white/5 text-white/80"
            >
              {t.cancel || "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-6 rounded-xl text-white font-bold"
            >
              {t.createCategory || "Create Category"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
