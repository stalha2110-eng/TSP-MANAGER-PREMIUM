import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Plus, Trash2, ChevronDown, ChevronUp, Lock, Unlock, 
  Tag, Settings2, RotateCcw, Clock, Layers, Sparkles, Check, X, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, UnbilledEntry } from '../types';
import { cn } from '../lib/utils';
import { PINScreen } from './ui/PINScreen';
import { 
  getUnbilledEntries, 
  addUnbilledEntry, 
  deleteUnbilledEntry, 
  clearAllUnbilledEntries,
  getUnbilledPresets, 
  saveUnbilledPresets, 
  getUnbilledCategories, 
  addUnbilledCategory, 
  deleteUnbilledCategory,
  isUnbilledSessionUnlocked, 
  setUnbilledSessionUnlocked,
  UNBILLED_UPDATED_EVENT
} from '../lib/unbilledStorage';

interface UnbilledQuickLedgerWidgetProps {
  state: AppState;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  activeShiftCashier?: string;
}

export function UnbilledQuickLedgerWidget({
  state,
  addToast,
  activeShiftCashier
}: UnbilledQuickLedgerWidgetProps) {
  // State initialization
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tsm_unbilled_widget_collapsed') === 'true';
    }
    return false;
  });

  const [entries, setEntries] = useState<UnbilledEntry[]>(getUnbilledEntries);
  const [presets, setPresets] = useState<number[]>(getUnbilledPresets);
  const [categories, setCategories] = useState<string[]>(getUnbilledCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>('General');
  
  // Custom amount entry
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [recentlyTappedChip, setRecentlyTappedChip] = useState<{ amt: number; timestamp: number } | null>(null);
  
  // Modals & PIN Security
  const [showPresetManagerModal, setShowPresetManagerModal] = useState<boolean>(false);
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState<boolean>(false);
  const [showPINModal, setShowPINModal] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);

  // New preset/category inputs in management modals
  const [newPresetAmountInput, setNewPresetAmountInput] = useState<string>('');
  const [newCategoryNameInput, setNewCategoryNameInput] = useState<string>('');

  // Active cashier name
  const currentCashier = activeShiftCashier || state.settings.storeOwnerName || "Store Cashier";

  // Re-sync on storage changes or custom event
  const refreshLedgerData = () => {
    setEntries(getUnbilledEntries());
    setPresets(getUnbilledPresets());
    setCategories(getUnbilledCategories());
  };

  useEffect(() => {
    refreshLedgerData();
    const handleUpdate = () => refreshLedgerData();
    window.addEventListener(UNBILLED_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(UNBILLED_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Auto lock session if app-level lock button is triggered
  useEffect(() => {
    if (state.settings.isLocked) {
      setUnbilledSessionUnlocked(false);
    }
  }, [state.settings.isLocked]);

  // Save collapse preference
  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tsm_unbilled_widget_collapsed', String(next));
    }
  };

  // Filter today's entries for live shift tally
  const todayEntries = useMemo(() => {
    const todayStr = new Date().toDateString();
    return entries.filter(e => {
      const d = new Date(e.timestamp || e.dateStr);
      return !isNaN(d.getTime()) && d.toDateString() === todayStr;
    });
  }, [entries]);

  const todayTotalAmount = useMemo(() => {
    return todayEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [todayEntries]);

  // Trigger tactile vibration
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(12); } catch (err) {}
    }
  };

  // 1-Tap Entry Submission
  const handleQuickAdd = (amount: number, categoryOverride?: string) => {
    if (!amount || amount <= 0) return;
    triggerHaptic();
    const cat = categoryOverride || selectedCategory || 'General';
    addUnbilledEntry(amount, cat, currentCashier);
    setCustomAmountInput('');

    // Trigger instant visual confirmation on chip
    const timestamp = Date.now();
    setRecentlyTappedChip({ amt: amount, timestamp });
    setTimeout(() => {
      setRecentlyTappedChip((prev) => (prev?.timestamp === timestamp ? null : prev));
    }, 900);
  };

  // Handle Manual Amount Submit
  const handleManualAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(customAmountInput);
    if (isNaN(num) || num <= 0) {
      addToast('Please enter a valid amount', 'warning');
      return;
    }
    handleQuickAdd(num);
  };

  // Security-gated deletion handler
  const requestEntryDeletion = (id: string) => {
    if (isUnbilledSessionUnlocked()) {
      executeEntryDeletion(id);
    } else {
      setPendingDeleteId(id);
      setShowPINModal(true);
    }
  };

  const executeEntryDeletion = (id: string) => {
    triggerHaptic();
    deleteUnbilledEntry(id);
    addToast('Unbilled record deleted safely', 'info');
    setPendingDeleteId(null);
  };

  const handlePINSuccess = () => {
    setUnbilledSessionUnlocked(true);
    setShowPINModal(false);
    addToast('Security PIN verified: Deletion session unlocked 🔓', 'success');
    if (pendingDeleteId) {
      executeEntryDeletion(pendingDeleteId);
    } else if (showClearAllConfirm) {
      clearAllUnbilledEntries();
      setShowClearAllConfirm(false);
      addToast('All unbilled rush hour records cleared', 'info');
    }
  };

  // Handle preset chip additions
  const handleAddPresetChip = () => {
    const val = parseFloat(newPresetAmountInput);
    if (isNaN(val) || val <= 0) {
      addToast('Enter a valid preset amount e.g. 50', 'warning');
      return;
    }
    if (presets.includes(val)) {
      addToast(`Preset +₹${val} already exists`, 'info');
      return;
    }
    const updated = [...presets, val];
    saveUnbilledPresets(updated);
    setNewPresetAmountInput('');
    addToast(`Added preset chip +₹${val}`, 'success');
  };

  const handleRemovePresetChip = (amount: number) => {
    if (presets.length <= 1) {
      addToast('Must keep at least 1 preset chip', 'warning');
      return;
    }
    const updated = presets.filter(p => p !== amount);
    saveUnbilledPresets(updated);
    addToast(`Removed preset chip +₹${amount}`, 'info');
  };

  // Handle custom category tag additions
  const handleAddCategoryTag = () => {
    const name = newCategoryNameInput.trim();
    if (!name) return;
    const updated = addUnbilledCategory(name);
    setSelectedCategory(name);
    setNewCategoryNameInput('');
    setShowCategoryManagerModal(false);
    addToast(`Created category tag "${name}"`, 'success');
  };

  const handleRemoveCategoryTag = (catName: string) => {
    const updated = deleteUnbilledCategory(catName);
    if (selectedCategory === catName) {
      setSelectedCategory('General');
    }
    addToast(`Removed category tag "${catName}"`, 'info');
  };

  const sessionUnlocked = isUnbilledSessionUnlocked();

  return (
    <div id="unbilled-rush-hour-quick-ledger" className="mb-3">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 sm:p-4 shadow-md relative overflow-hidden backdrop-blur-xl transition-all duration-300">
        
        {/* Subtle Ambient Accent Flare */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 blur-[50px] pointer-events-none rounded-full" />

        {/* ================= HEADER SECTION ================= */}
        <div className="flex items-center justify-between gap-2 relative z-10 pb-2 border-b border-[var(--border)]/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs shrink-0">
              <Zap size={18} className="fill-amber-500/20" />
            </div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[var(--foreground)] shrink-0">
              Small Sales
            </h3>
          </div>

          {/* Right Header Controls: Tally Badge, Custom Chips & Collapse Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Real-time Shift Tally Badge */}
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center gap-1.5 text-amber-700 dark:text-amber-300 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-75">Today:</span>
              <span className="text-xs sm:text-sm font-black font-mono">₹{todayTotalAmount.toLocaleString()}</span>
              <span className="text-[10px] font-bold opacity-60 font-mono">({todayEntries.length})</span>
            </div>

            {/* Custom Chips Quick Action */}
            <button
              onClick={() => setShowPresetManagerModal(true)}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] border border-[var(--primary)]/25 transition-all cursor-pointer"
              title="Add or Edit Custom Preset Chips"
            >
              <Settings2 size={11} />
              <span>Chips</span>
            </button>

            {/* Collapse / Expand Toggle Button */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/[0.1] text-[var(--foreground)] transition-all cursor-pointer border border-[var(--border)]"
              title={isCollapsed ? "Expand Quick Ledger" : "Collapse Quick Ledger"}
            >
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {/* ================= COLLAPSIBLE CONTENT BODY ================= */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden pt-2.5 space-y-2.5 relative z-10"
            >
              {/* PRIMARY FOCUS: FAST 1-TAP PRESET AMOUNT CHIPS SECTION */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {presets.map((amt) => {
                  const isJustTapped = recentlyTappedChip?.amt === amt;

                  return (
                    <div key={amt} className="relative">
                      {/* Floating Confirmation Badge on Tap */}
                      <AnimatePresence>
                        {isJustTapped && (
                          <motion.div
                            initial={{ opacity: 0, y: 0, scale: 0.6 }}
                            animate={{ opacity: 1, y: -34, scale: 1 }}
                            exit={{ opacity: 0, y: -48, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                            className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono font-black text-xs shadow-lg border border-emerald-300 flex items-center gap-1"
                          >
                            <Check size={13} className="stroke-[3]" />
                            <span>+₹{amt} Added!</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.84, rotate: -2 }}
                        whileHover={{ scale: 1.04 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        onClick={() => handleQuickAdd(amt)}
                        className={cn(
                          "px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-black font-mono text-base sm:text-xl md:text-2xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer select-none group relative overflow-hidden",
                          isJustTapped
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-4 ring-emerald-500/30 shadow-md scale-105"
                            : "bg-gradient-to-b from-amber-500/25 to-amber-600/15 hover:from-amber-500/40 hover:to-amber-600/30 border-2 border-amber-500/50 hover:border-amber-500 text-amber-900 dark:text-amber-100 hover:shadow-sm"
                        )}
                        title={`Tap to instantly add +₹${amt} (${selectedCategory})`}
                      >
                        {isJustTapped ? (
                          <>
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              <Check size={20} className="text-white stroke-[3]" />
                            </motion.div>
                            <span className="text-white">✓ ₹{amt}</span>
                          </>
                        ) : (
                          <>
                            <Plus size={16} className="text-amber-500 group-hover:scale-125 transition-transform" />
                            <span>₹{amt}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  );
                })}

                {/* Quick Preset Settings Icon */}
                <button
                  type="button"
                  onClick={() => setShowPresetManagerModal(true)}
                  className="p-2.5 sm:p-3 rounded-xl bg-[var(--foreground)]/[0.04] hover:bg-[var(--foreground)]/[0.08] text-[var(--foreground)]/70 border-2 border-dashed border-[var(--border)] transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
                  title="Add or Edit Custom Preset Amount Chips"
                >
                  <Plus size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Add Chip</span>
                </button>
              </div>

              {/* DYNAMIC CATEGORY TAG SELECTOR & MANUAL AMOUNT INPUT */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                
                {/* CATEGORY TAG SELECTOR (8 cols on md) */}
                <div className="md:col-span-7 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60">
                    <span className="flex items-center gap-1">
                      <Tag size={11} /> Selected Category Tag
                    </span>
                    <button
                      onClick={() => setShowCategoryManagerModal(true)}
                      className="text-[var(--primary)] hover:underline cursor-pointer font-bold text-[10px]"
                    >
                      + Add Tag
                    </button>
                  </div>

                  {/* Horizontal Category Tag Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Default General Tag */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('General')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border select-none",
                        selectedCategory === 'General'
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-2xs scale-105"
                          : "bg-[var(--foreground)]/[0.04] text-[var(--foreground)]/70 border-[var(--border)] hover:bg-[var(--foreground)]/[0.08]"
                      )}
                    >
                      General
                    </button>

                    {/* Dynamic User Custom Categories */}
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border select-none flex items-center gap-1",
                          selectedCategory === cat
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-2xs scale-105"
                            : "bg-[var(--foreground)]/[0.04] text-[var(--foreground)]/70 border-[var(--border)] hover:bg-[var(--foreground)]/[0.08]"
                        )}
                      >
                        <span>{cat}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowCategoryManagerModal(true)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border border-[var(--primary)]/30 transition-all cursor-pointer flex items-center gap-1"
                      title="Add Custom Category Tag"
                    >
                      <Plus size={12} />
                      <span className="text-[10px]">New</span>
                    </button>
                  </div>
                </div>

                {/* MANUAL CUSTOM AMOUNT FORM (5 cols on md) */}
                <div className="md:col-span-5 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60 block">
                    Custom Amount Input
                  </span>
                  <form onSubmit={handleManualAmountSubmit} className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black font-mono text-[var(--foreground)]/50">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        placeholder="Other amount..."
                        value={customAmountInput}
                        onChange={(e) => setCustomAmountInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm font-mono font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] text-xs font-black tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </form>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= MODAL 1: PRESET CHIP MANAGER ================= */}
      <AnimatePresence>
        {showPresetManagerModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  Manage Quick Preset Chips
                </h3>
                <button
                  onClick={() => setShowPresetManagerModal(false)}
                  className="p-1 text-[var(--foreground)]/60 hover:text-[var(--foreground)] rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--foreground)]/80 block">Active Preset Amounts:</label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {presets.map(p => (
                    <div
                      key={p}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs flex items-center gap-2"
                    >
                      <span>+₹{p}</span>
                      <button
                        onClick={() => handleRemovePresetChip(p)}
                        className="text-amber-600/70 hover:text-red-500 cursor-pointer"
                        title="Remove chip"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Preset Input */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <label className="text-xs font-bold text-[var(--foreground)]/80 block">Add Custom Preset Amount:</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--foreground)]/50">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="e.g. 50"
                      value={newPresetAmountInput}
                      onChange={(e) => setNewPresetAmountInput(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--foreground)]"
                    />
                  </div>
                  <button
                    onClick={handleAddPresetChip}
                    className="px-3 py-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold cursor-pointer hover:opacity-90"
                  >
                    Add Chip
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowPresetManagerModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--foreground)]/[0.06] hover:bg-[var(--foreground)]/[0.1] text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 2: CUSTOM CATEGORY MANAGER ================= */}
      <AnimatePresence>
        {showCategoryManagerModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                  <Tag size={16} className="text-[var(--primary)]" />
                  Custom Category Tags
                </h3>
                <button
                  onClick={() => setShowCategoryManagerModal(false)}
                  className="p-1 text-[var(--foreground)]/60 hover:text-[var(--foreground)] rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--foreground)]/80 block">Active Category Tags:</label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  <div className="px-3 py-1 rounded-lg bg-zinc-500/15 text-zinc-400 font-bold text-xs">
                    General (System)
                  </div>
                  {categories.map(c => (
                    <div
                      key={c}
                      className="px-3 py-1 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] font-bold text-xs flex items-center gap-2"
                    >
                      <span>{c}</span>
                      <button
                        onClick={() => handleRemoveCategoryTag(c)}
                        className="text-red-400 hover:text-red-600 cursor-pointer"
                        title="Remove category"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Category Tag Input */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <label className="text-xs font-bold text-[var(--foreground)]/80 block">Add Custom Category Tag:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Chai/Coffee, Carry Bags, Toffees"
                    value={newCategoryNameInput}
                    onChange={(e) => setNewCategoryNameInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)]"
                  />
                  <button
                    onClick={handleAddCategoryTag}
                    className="px-3 py-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold cursor-pointer hover:opacity-90"
                  >
                    Save Tag
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowCategoryManagerModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--foreground)]/[0.06] hover:bg-[var(--foreground)]/[0.1] text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 3: SECURITY VERIFICATION PIN SCREEN ================= */}
      {showPINModal && (
        <PINScreen
          mode="unlock"
          correctPIN={state.settings.pin || '000000'}
          title="Verify PIN to Unlock Removal"
          description="Enter your 6-digit App Security PIN to unlock unbilled entry deletion for this active session."
          onSuccess={handlePINSuccess}
          onCancel={() => {
            setShowPINModal(false);
            setPendingDeleteId(null);
            setShowClearAllConfirm(false);
          }}
        />
      )}

      {/* ================= MODAL 4: CLEAR ALL LOG CONFIRMATION ================= */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert size={28} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">Clear Quick Ledger Log?</h3>
                <p className="text-xs text-[var(--foreground)]/60">This will remove all logged unbilled sales for today.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[var(--foreground)]/[0.06] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllUnbilledEntries();
                  setShowClearAllConfirm(false);
                  addToast('Cleared quick ledger log', 'info');
                }}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer hover:bg-red-600"
              >
                Confirm Clear
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
