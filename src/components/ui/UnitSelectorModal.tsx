import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Plus, Trash2, Check, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { useCustomUnits, useRecentUnits, useHiddenUnits } from "../../lib/unitUtils";

export interface UnitSelectorModalProps {
  onClose: () => void;
  onSelect: (unit: string, applyToAll?: boolean) => void;
  currentUnit: string;
  title?: string;
  subtitle?: string;
  showApplyToAllOption?: boolean;
}

const COMMON_UNITS = [
  'KG', 'Gram', '250gm', 'Chatak',
  'Piece', 'Packet', 'Box', 'Bag',
  'Dozen', 'Litre', 'Quintal', 'Carton',
  'Pouch', 'Tin', 'Bundle', 'Ton'
];

export function UnitSelectorModal({ 
  onClose, 
  onSelect, 
  currentUnit,
  title,
  subtitle,
  showApplyToAllOption = false
}: UnitSelectorModalProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [applyToAllPrices, setApplyToAllPrices] = React.useState(true);
  const [isManageMode, setIsManageMode] = React.useState(false);
  const [deletedNotice, setDeletedNotice] = React.useState<string | null>(null);

  const { customUnits, addCustomUnit, removeCustomUnit } = useCustomUnits();
  const { recentUnits, trackRecentUnit } = useRecentUnits();
  const { hiddenUnits, hideUnit, restoreAllHiddenUnits } = useHiddenUnits();

  // Escape key listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Combined list of units (recent/common + custom), deduplicated and filtering out hidden ones
  const allUnits = React.useMemo(() => {
    const list: { name: string; isCustom: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Add custom units first
    customUnits.forEach(u => {
      const lower = u.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ name: u, isCustom: true });
      }
    });

    // 2. Add recent and common units (excluding hidden ones)
    const baseList = [...recentUnits, ...COMMON_UNITS];
    baseList.forEach(u => {
      const lower = u.toLowerCase();
      if (!seen.has(lower) && (!hiddenUnits.includes(lower) || isManageMode)) {
        seen.add(lower);
        list.push({ name: u, isCustom: false });
      }
    });

    return list;
  }, [customUnits, recentUnits, hiddenUnits, isManageMode]);

  // Filtered list
  const filteredUnits = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allUnits;
    return allUnits.filter(u => u.name.toLowerCase().includes(term));
  }, [allUnits, searchTerm]);

  // Exact match check
  const exactMatchExists = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allUnits.some(u => u.name.toLowerCase() === term);
  }, [allUnits, searchTerm]);

  const handleSelect = (unitName: string) => {
    if (isManageMode) return;
    trackRecentUnit(unitName);
    onSelect(unitName, showApplyToAllOption ? applyToAllPrices : undefined);
    onClose();
  };

  const handleSelectOrAdd = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      if (currentUnit) {
        handleSelect(currentUnit);
      } else if (filteredUnits[0]) {
        handleSelect(filteredUnits[0].name);
      }
      return;
    }

    // If exists, select it
    const existing = allUnits.find(u => u.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      handleSelect(existing.name);
      return;
    }

    // Otherwise add as custom unit and select
    addCustomUnit(trimmed);
    trackRecentUnit(trimmed);
    onSelect(trimmed, showApplyToAllOption ? applyToAllPrices : undefined);
    onClose();
  };

  const handleDeleteUnit = (e: React.MouseEvent, unitName: string, isCustom: boolean) => {
    e.stopPropagation();
    if (isCustom) {
      removeCustomUnit(unitName);
    } else {
      hideUnit(unitName);
    }
    setDeletedNotice(`Unit "${unitName}" deleted`);
    setTimeout(() => setDeletedNotice(null), 2500);
  };

  // Group into custom and standard units for pristine clarity
  const customUnitsList = filteredUnits.filter(u => u.isCustom);
  const standardUnitsList = filteredUnits.filter(u => !u.isCustom);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      onClick={onClose}
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 font-sans"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] bg-[var(--card-solid,#0f172a)] modal-opaque border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Compact Header */}
        <div className="px-3.5 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h3 className="text-xs font-bold text-[var(--foreground)] truncate">
              {title || 'Select Unit'}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-zinc-400 truncate leading-tight">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Manage/Delete Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsManageMode(!isManageMode)}
              className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border",
                isManageMode
                  ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                  : "bg-[var(--background)] text-zinc-400 hover:text-rose-500 hover:border-rose-500/40 border-[var(--border)]"
              )}
              title={isManageMode ? "Exit Delete Mode" : "Manage & Delete Units"}
            >
              <Trash2 size={12} className={isManageMode ? "text-white" : "text-rose-400"} />
              <span>{isManageMode ? 'Done' : 'Delete'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Delete Mode Hint Banner */}
        <AnimatePresence>
          {isManageMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-rose-500/10 border-b border-rose-500/20 px-3 py-1.5 text-[10px] text-rose-500 font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-1">
                <Trash2 size={11} /> Tap any unit or 🗑️ to delete it
              </span>
              {hiddenUnits.length > 0 && (
                <button
                  type="button"
                  onClick={() => restoreAllHiddenUnits()}
                  className="text-[9px] underline font-bold hover:text-rose-600 flex items-center gap-0.5 cursor-pointer"
                >
                  <RotateCcw size={10} /> Reset all
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deleted Feedback Toast */}
        <AnimatePresence>
          {deletedNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="bg-emerald-500/15 border-b border-emerald-500/30 px-3 py-1 text-[10px] text-emerald-500 font-bold text-center"
            >
              ✓ {deletedNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal Search & Quick-Add Input */}
        <div className="p-2.5 border-b border-[var(--border)] bg-[var(--background)]/30">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 text-zinc-400 pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search or add unit (e.g. Bora)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSelectOrAdd(searchTerm);
                }
              }}
              autoFocus
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-1.5 pl-8 pr-14 text-xs font-semibold text-[var(--foreground)] placeholder:text-zinc-500 focus:outline-none focus:border-[var(--primary)] transition-all shadow-inner"
            />
            {searchTerm.trim() && !exactMatchExists && (
              <button
                type="button"
                onClick={() => handleSelectOrAdd(searchTerm)}
                className="absolute right-1 px-2 py-0.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-bold hover:opacity-90 flex items-center gap-0.5 cursor-pointer shadow-xs"
              >
                <Plus size={11} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Clean Units List with Visible Trash Icons */}
        <div className="p-2.5 max-h-[250px] overflow-y-auto no-scrollbar space-y-3">
          {/* 1. Custom Units Section (Prominent with always-visible red trash icon) */}
          {customUnitsList.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1.5 px-0.5">
                <span>Custom Units ({customUnitsList.length})</span>
                <span className="text-[9px] text-rose-500/90 font-bold lowercase flex items-center gap-0.5">
                  <Trash2 size={10} /> tap 🗑️ to delete
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {customUnitsList.map((u) => {
                  const isSelected = currentUnit.toLowerCase() === u.name.toLowerCase();
                  return (
                    <div
                      key={u.name}
                      onClick={() => !isManageMode && handleSelect(u.name)}
                      className={cn(
                        "px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border shadow-2xs group",
                        isSelected
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-xs"
                          : "bg-amber-500/10 text-[var(--foreground)] border-amber-500/30 hover:border-amber-500/60",
                        isManageMode ? "cursor-default" : "cursor-pointer active:scale-95"
                      )}
                    >
                      <span className="truncate flex-1 text-left font-bold tracking-tight pr-1">
                        {u.name}
                      </span>
                      {/* Permanently visible Red Trash Icon Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteUnit(e, u.name, true)}
                        className="p-1 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white transition-all cursor-pointer shrink-0"
                        title={`Delete custom unit "${u.name}"`}
                      >
                        <Trash2 size={12} className="stroke-[2.5]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Standard Units Section */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1.5 px-0.5">
              <span>Standard Units</span>
              {isManageMode && (
                <span className="text-[9px] text-rose-400 font-bold lowercase">
                  tap 🗑️ to hide
                </span>
              )}
            </div>

            {standardUnitsList.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {standardUnitsList.map((u) => {
                  const isSelected = currentUnit.toLowerCase() === u.name.toLowerCase();
                  return (
                    <button
                      key={u.name}
                      type="button"
                      onClick={(e) => isManageMode ? handleDeleteUnit(e, u.name, false) : handleSelect(u.name)}
                      className={cn(
                        "px-2 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-between border cursor-pointer active:scale-95",
                        isManageMode && "border-rose-400/40 hover:border-rose-500 hover:bg-rose-500/10",
                        !isManageMode && (isSelected
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-xs"
                          : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:border-zinc-400 hover:bg-[var(--card)]")
                      )}
                    >
                      <span className="truncate flex-1 text-center font-bold tracking-tight">
                        {u.name}
                      </span>
                      {isManageMode && (
                        <span
                          onClick={(e) => handleDeleteUnit(e, u.name, false)}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-500 hover:text-white transition-all shrink-0 -mr-1"
                          title={`Hide ${u.name}`}
                        >
                          <Trash2 size={11} className="stroke-[2.5]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-zinc-400 space-y-2">
                <p className="text-xs">No unit matching &ldquo;{searchTerm}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => handleSelectOrAdd(searchTerm)}
                  className="px-3 py-1 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer"
                >
                  + Add &ldquo;{searchTerm.trim()}&rdquo;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Optional 1-Line Apply to All */}
        {showApplyToAllOption && (
          <div className="px-3 py-2 border-t border-[var(--border)] bg-[var(--background)]/60 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-zinc-400 hover:text-[var(--foreground)] transition-colors">
              <input
                type="checkbox"
                checked={applyToAllPrices}
                onChange={(e) => setApplyToAllPrices(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
              />
              <span>Apply to Retail, Wholesale & Cost</span>
            </label>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
