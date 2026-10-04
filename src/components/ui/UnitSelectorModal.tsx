import * as React from "react";
import { motion } from "motion/react";
import { Search, X, Plus, Trash2, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { useCustomUnits, useRecentUnits } from "../../lib/unitUtils";

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

  const { customUnits, addCustomUnit, removeCustomUnit } = useCustomUnits();
  const { recentUnits, trackRecentUnit } = useRecentUnits();

  // Escape key listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Combined list of units (recent/common + custom), deduplicated
  const allUnits = React.useMemo(() => {
    const list: { name: string; isCustom: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Add custom units first so user's store units are readily available
    customUnits.forEach(u => {
      const lower = u.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ name: u, isCustom: true });
      }
    });

    // 2. Add recent and common units
    const baseList = [...recentUnits, ...COMMON_UNITS];
    baseList.forEach(u => {
      const lower = u.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ name: u, isCustom: false });
      }
    });

    return list;
  }, [customUnits, recentUnits]);

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
    trackRecentUnit(unitName);
    onSelect(unitName, showApplyToAllOption ? applyToAllPrices : undefined);
    onClose();
  };

  const handleSelectOrAdd = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      onClick={onClose}
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 font-sans"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Compact Header */}
        <div className="px-3.5 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-[var(--foreground)] truncate">
              {title || 'Select Unit'}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-zinc-400 truncate leading-tight">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X size={15} />
          </button>
        </div>

        {/* Minimal Search & Quick-Add Input */}
        <div className="p-2.5 border-b border-[var(--border)] bg-[var(--background)]/30">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 text-zinc-400 pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search or type unit..."
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

        {/* Short, Clean Units Grid */}
        <div className="p-2.5 max-h-[240px] overflow-y-auto no-scrollbar">
          {filteredUnits.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {filteredUnits.map((u) => {
                const isSelected = currentUnit.toLowerCase() === u.name.toLowerCase();
                return (
                  <button
                    key={u.name}
                    type="button"
                    onClick={() => handleSelect(u.name)}
                    className={cn(
                      "px-2 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-between group relative border cursor-pointer active:scale-95",
                      isSelected
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-xs"
                        : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:border-zinc-400 hover:bg-[var(--card)]"
                    )}
                  >
                    <span className="truncate flex-1 text-center font-bold tracking-tight">
                      {u.name}
                    </span>
                    {u.isCustom && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomUnit(u.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 transition-opacity shrink-0 -mr-1"
                        title="Delete custom unit"
                      >
                        <Trash2 size={11} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-zinc-400 space-y-2">
              <p className="text-xs">No unit named &ldquo;{searchTerm}&rdquo;</p>
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

        {/* Optional 1-Line Apply to All */}
        {showApplyToAllOption && (
          <div className="px-3 py-2 border-t border-[var(--border)] bg-[var(--background)]/60 flex items-center">
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
