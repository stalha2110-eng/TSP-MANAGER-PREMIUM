import * as React from "react";
import { motion } from "motion/react";
import { Search, Weight, Package, Hash, Clock, X, Plus, Trash2, Tag, Zap } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";
import { useCustomUnits, useRecentUnits } from "../../lib/unitUtils";

interface UnitSelectorModalProps {
  onClose: () => void;
  onSelect: (unit: string) => void;
  currentUnit: string;
}

export function UnitSelectorModal({ onClose, onSelect, currentUnit }: UnitSelectorModalProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [gramChoice, setGramChoice] = React.useState(false);
  const [newUnitInput, setNewUnitInput] = React.useState('');
  const [inputError, setInputError] = React.useState<string | null>(null);

  const { allUnitGroups, addCustomUnit, removeCustomUnit } = useCustomUnits();
  const { recentUnits, trackRecentUnit } = useRecentUnits();

  // Helper to sort unit array based on recent usage order
  const sortUnitsByRecent = (units: string[], recentList: string[]) => {
    return [...units].sort((a, b) => {
      const idxA = recentList.findIndex(r => r.toLowerCase() === a.toLowerCase());
      const idxB = recentList.findIndex(r => r.toLowerCase() === b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  };

  const getMinRecentIndex = (values: string[], recentList: string[]) => {
    let minIdx = Infinity;
    for (const v of values) {
      const idx = recentList.findIndex(r => r.toLowerCase() === v.toLowerCase());
      if (idx !== -1 && idx < minIdx) minIdx = idx;
    }
    return minIdx;
  };

  const filteredGroups = allUnitGroups
    .map(group => ({
      ...group,
      values: sortUnitsByRecent(
        group.values.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase())),
        recentUnits
      )
    }))
    .filter(group => group.values.length > 0)
    .sort((a, b) => {
      const minA = getMinRecentIndex(a.values, recentUnits);
      const minB = getMinRecentIndex(b.values, recentUnits);
      return minA - minB;
    });

  const handleUnitClick = (val: string) => {
    trackRecentUnit(val);
    if (val.toLowerCase() === 'gram') {
      setGramChoice(true);
    } else {
      onSelect(val);
      onClose();
    }
  };

  const handleAddNewUnit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    if (!newUnitInput.trim()) return;

    const res = addCustomUnit(newUnitInput.trim());
    if (res.success) {
      const addedUnit = newUnitInput.trim();
      setNewUnitInput('');
      onSelect(addedUnit);
      onClose();
    } else if (res.error) {
      setInputError(res.error);
    }
  };

  const handleRemoveCustomUnit = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    removeCustomUnit(val);
  };

  const getIcon = (label: string) => {
    switch (label) {
      case 'Weight': return <Weight size={18} />;
      case 'Packaging': return <Package size={18} />;
      case 'Quantity': return <Hash size={18} />;
      case 'Custom Units': return <Tag size={18} className="text-amber-500" />;
      default: return <Clock size={18} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl rounded-2xl"
      >
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--foreground)]">
            <Weight className="text-[var(--primary)]" /> {gramChoice ? 'Specify weight' : 'Select or Create Unit'}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => gramChoice ? setGramChoice(false) : onClose()}><X size={20} /></Button>
        </div>

        {!gramChoice && (
          <div className="p-4 border-b border-[var(--border)] bg-[var(--background)] space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground)] opacity-40" size={16} />
              <input
                type="text"
                placeholder="Search units..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-[var(--foreground)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            {/* Quick Add Custom Unit Bar */}
            <form onSubmit={handleAddNewUnit} className="flex gap-2">
              <input
                type="text"
                placeholder="+ Add custom unit (e.g. Bora, Rim)..."
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 text-[var(--foreground)]"
                value={newUnitInput}
                onChange={(e) => {
                  setNewUnitInput(e.target.value);
                  setInputError(null);
                }}
              />
              <Button
                type="submit"
                disabled={!newUnitInput.trim()}
                className="px-3 py-1.5 h-auto text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Add
              </Button>
            </form>
            {inputError && (
              <p className="text-[10px] text-red-500 font-bold px-1">{inputError}</p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {gramChoice ? (
            <div className="space-y-6 py-4">
              <p className="text-center text-sm opacity-60">You selected Gram. Would you like to use standard Gram or the 250gm shortcut?</p>
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  onClick={() => {
                    trackRecentUnit('250gm');
                    onSelect('250gm');
                    onClose();
                  }}
                  className="h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg"
                >
                  250gm
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    trackRecentUnit('Gram');
                    onSelect('Gram');
                    onClose();
                  }}
                  className="h-16 rounded-2xl border-2 border-[var(--border)] font-black text-lg"
                >
                  Just Gram
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setGramChoice(false)}
                className="w-full opacity-40 text-[10px] font-black uppercase tracking-widest"
              >
                Go Back
              </Button>
            </div>
          ) : (
            <>
              {filteredGroups.length > 0 ? (
                filteredGroups.map(group => (
                  <div key={group.label} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
                      {getIcon(group.label)} {group.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {group.values.map(val => (
                        <div
                          key={val}
                          onClick={() => handleUnitClick(val)}
                          className={cn(
                            "group relative flex items-center justify-between p-3 rounded-xl border transition-all text-sm font-medium cursor-pointer select-none",
                            currentUnit.toLowerCase() === val.toLowerCase() 
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" 
                              : "border-[var(--border)] hover:bg-[var(--background)] text-[var(--foreground)]"
                          )}
                        >
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            <div className="h-6 w-6 rounded-lg bg-[var(--background)] flex items-center justify-center shrink-0">
                              {getIcon(group.label)}
                            </div>
                            <span className="truncate">{val}</span>
                          </div>

                          {(group as any).isCustomGroup && (
                            <button
                              type="button"
                              title="Remove custom unit"
                              onClick={(e) => handleRemoveCustomUnit(e, val)}
                              className="h-6 w-6 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center opacity-40 italic">
                  No units found matching "{searchTerm}"
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-[var(--border)] bg-[var(--background)] flex items-center justify-between text-[10px] opacity-60 font-bold uppercase tracking-widest">
          <span>{gramChoice ? 'Choose variant' : 'Tap to select'}</span>
          <span>1 Chatak = 50gm</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
