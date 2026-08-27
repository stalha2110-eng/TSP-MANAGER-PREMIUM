import * as React from "react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Settings2, Trash2, Edit2, Check, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Category, Item } from "../../types";

interface ManageCategoriesModalProps {
  onClose: () => void;
  categories: Category[];
  items: Item[];
  onEditCategory: (id: string, newName: string) => void;
  onDeleteCategory: (id: string) => void;
  t: any;
}

export function ManageCategoriesModal({
  onClose,
  categories,
  items,
  onEditCategory,
  onDeleteCategory,
  t,
}: ManageCategoriesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Calculate item counts per category for the safety warning
  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (item.categoryId) {
        counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onEditCategory(id, editName.trim());
    setEditingId(null);
  };

  const handleDeleteConfirm = (id: string) => {
    onDeleteCategory(id);
    setDeletingId(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="w-full max-w-lg p-6 md:p-8 space-y-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/5 bg-[#0e121a] rounded-3xl text-left flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <Settings2 size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                {t.manageCategories || "Manage Categories"}
              </h3>
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-bold">
                {t.renameOrDelete || "Rename, Delete & Reassign"}
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

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-white/45">
              <p className="text-sm font-bold uppercase tracking-widest">No Categories Found</p>
            </div>
          ) : (
            categories.map((cat) => {
              const itemCount = categoryItemCounts[cat.id] || 0;
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-[#07090d] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[var(--primary)]/20"
                >
                  {isEditing ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white/[0.03] border-2 border-[var(--primary)] rounded-xl px-4 py-2 font-bold text-sm text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(cat.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="rounded-xl px-3"
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl px-3 border-white/5"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-base truncate">{cat.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5 font-semibold">
                        {itemCount} {itemCount === 1 ? "item" : "items"} currently assigned
                      </p>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="h-9 w-9 rounded-xl hover:bg-white/[0.05] flex items-center justify-center transition-colors text-white/60 hover:text-[var(--primary)]"
                        title="Rename Category"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingId(cat.id)}
                        className="h-9 w-9 rounded-xl hover:bg-red-500/10 flex items-center justify-center transition-colors text-white/60 hover:text-red-500"
                        title="Delete Category"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        <AnimatePresence>
          {deletingId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="w-full max-w-md p-6 space-y-6 shadow-2xl border border-red-500/20 bg-[#140b0e] rounded-3xl text-left"
              >
                <div className="flex items-center gap-3 text-red-500">
                  <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-red-400">
                      Delete Category?
                    </h4>
                    <p className="text-[10px] text-red-400/60 uppercase tracking-widest font-bold">
                      Irreversible action
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs text-white/70 leading-relaxed">
                  <p>
                    Are you sure you want to delete the category{" "}
                    <span className="font-black text-white">
                      "{categories.find((c) => c.id === deletingId)?.name}"
                    </span>
                    ?
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-amber-500 font-bold">
                    <span>
                      {categoryItemCounts[deletingId || ""] || 0} affected items
                    </span>
                    <ArrowRight size={12} />
                    <span className="text-white">Reassigned to 'General'</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeletingId(null)}
                    className="px-6 rounded-xl border-white/5 text-white/80"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDeleteConfirm(deletingId)}
                    className="px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    Delete & Reassign
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bottom Actions */}
        <div className="flex justify-end pt-4 border-t border-white/5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-6 rounded-xl border-white/5 text-white/80"
          >
            {t.close || "Close"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
