import React, { useState } from 'react';
import { Scale, Plus, Trash2, Edit2, RotateCcw, Check, X, Sparkles, HelpCircle } from 'lucide-react';
import { WeightPreset, AppSettings } from '../types';
import { COMMON_WEIGHT_PRESETS } from '../utils/weightHelpers';
import { cn } from '../lib/utils';

interface CustomWeightChipsSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
}

export const CustomWeightChipsSettings: React.FC<CustomWeightChipsSettingsProps> = ({
  settings,
  onUpdateSettings
}) => {
  const activePresets: WeightPreset[] = (settings.customWeightPresets && settings.customWeightPresets.length > 0)
    ? settings.customWeightPresets
    : COMMON_WEIGHT_PRESETS;

  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [formLabel, setFormLabel] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formShortLabel, setFormShortLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenAdd = () => {
    setFormLabel('');
    setFormQty('');
    setFormShortLabel('');
    setErrorMessage('');
    setEditingIndex(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = activePresets[index];
    setFormLabel(item.label);
    setFormQty(item.qty.toString());
    setFormShortLabel(item.shortLabel || '');
    setErrorMessage('');
    setEditingIndex(index);
    setIsAdding(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedQty = parseFloat(formQty);
    if (!formLabel.trim()) {
      setErrorMessage('Please enter a display label (e.g. 1.25 kg, 350g, 250ml)');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMessage('Please enter a valid positive quantity in base units (e.g. 1.25 for 1.25kg, 0.25 for 250g)');
      return;
    }

    const newPreset: WeightPreset = {
      label: formLabel.trim(),
      qty: parsedQty,
      shortLabel: formShortLabel.trim() || formLabel.trim()
    };

    let updated: WeightPreset[];
    if (editingIndex !== null) {
      updated = [...activePresets];
      updated[editingIndex] = newPreset;
    } else {
      updated = [...activePresets, newPreset];
    }

    // Sort ascending by quantity
    updated.sort((a, b) => a.qty - b.qty);

    onUpdateSettings({ customWeightPresets: updated });
    setIsAdding(false);
    setEditingIndex(null);
    setErrorMessage('');
  };

  const handleDelete = (index: number) => {
    if (activePresets.length <= 1) {
      alert('You must keep at least 1 weight chip preset.');
      return;
    }
    const updated = activePresets.filter((_, i) => i !== index);
    onUpdateSettings({ customWeightPresets: updated });
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset all weight chips back to standard presets (100g, 250g, 500g, 750g, 1kg, 1.25kg, 1.5kg, 1.75kg, 2kg, 2.5kg, 5kg)?')) {
      onUpdateSettings({ customWeightPresets: COMMON_WEIGHT_PRESETS });
      setIsAdding(false);
      setEditingIndex(null);
    }
  };

  return (
    <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Scale size={16} />
            </span>
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
              Custom Weight & Quantity Chips
            </h4>
          </div>
          <p className="text-[10px] opacity-60 font-medium mt-1">
            Customize quick 1-tap presets (e.g. 1.25kg, 1.5kg, 250g) shown on items when pressed & held.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-2.5 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--foreground)]/5 text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/70 hover:text-[var(--foreground)] flex items-center gap-1 cursor-pointer transition-colors"
            title="Restore default weight chips"
          >
            <RotateCcw size={11} />
            <span>Reset Defaults</span>
          </button>

          {!isAdding && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-[9.5px] font-black uppercase tracking-wider shadow-sm hover:bg-[var(--primary)]/90 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus size={12} strokeWidth={3} />
              <span>Add Chip</span>
            </button>
          )}
        </div>
      </div>

      {/* ADD / EDIT CHIP FORM */}
      {isAdding && (
        <form onSubmit={handleSave} className="p-3.5 bg-[var(--card)] border border-[var(--primary)]/30 rounded-xl space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-[var(--primary)] flex items-center gap-1">
              <Sparkles size={12} />
              {editingIndex !== null ? 'Edit Weight Chip' : 'Add New Weight Chip'}
            </span>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingIndex(null); }}
              className="p-1 rounded-md text-[var(--foreground)]/50 hover:text-[var(--foreground)]"
            >
              <X size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[8px] font-black uppercase tracking-wider opacity-60 block mb-1">
                Display Label (e.g. "1.25 kg", "350g")
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="1.25 kg or 350g"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-[var(--primary)]"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-wider opacity-60 block mb-1">
                Base Quantity Value (kg / pcs)
              </label>
              <input
                type="number"
                step="any"
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
                placeholder="1.25 (or 0.35 for 350g)"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-wider opacity-60 block mb-1">
                Short Label (Optional)
              </label>
              <input
                type="text"
                value={formShortLabel}
                onChange={(e) => setFormShortLabel(e.target.value)}
                placeholder="1.25k or 350g"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {errorMessage && (
            <p className="text-[10px] text-rose-500 font-bold">{errorMessage}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingIndex(null); }}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-[9.5px] font-black uppercase tracking-wider shadow-sm hover:bg-[var(--primary)]/90 flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Check size={12} strokeWidth={3} />
              <span>{editingIndex !== null ? 'Save Changes' : 'Add Preset'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ACTIVE WEIGHT CHIPS GRID */}
      <div>
        <div className="text-[8.5px] font-black uppercase tracking-wider opacity-50 mb-2 flex items-center justify-between">
          <span>Active Presets ({activePresets.length} chips configured)</span>
          <span>Click Edit / Trash to customize</span>
        </div>

        <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {activePresets.map((preset, idx) => (
            <div
              key={`${preset.qty}-${idx}`}
              className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all flex flex-col justify-between group relative shadow-xs"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-black font-mono text-[var(--foreground)]">
                  {preset.label}
                </span>
                <span className="text-[7.5px] font-mono opacity-50 px-1 py-0.2 rounded bg-[var(--foreground)]/5">
                  {preset.qty}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5 mt-2">
                <span className="text-[8px] font-bold opacity-45 uppercase">
                  {preset.shortLabel || preset.label}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    className="p-1 rounded hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/50 hover:text-[var(--primary)] transition-colors cursor-pointer"
                    title="Edit Preset"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="p-1 rounded hover:bg-rose-500/10 text-[var(--foreground)]/50 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Delete Preset"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide Note */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--primary)]/[0.04] border border-[var(--primary)]/15 text-[10px] text-[var(--foreground)]/75">
        <HelpCircle size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[var(--foreground)]">How to use on Billing Desk:</strong> Press and hold on any item card on the POS screen or Store Items Catalog for 0.4s to pop up the Weight Chips selector with these exact preset options.
        </p>
      </div>
    </div>
  );
};
