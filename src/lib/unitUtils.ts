import { useState, useEffect } from 'react';
import { UNITS } from '../constants';

const CUSTOM_UNITS_STORAGE_KEY = 'ts_custom_units';
const CUSTOM_UNITS_EVENT_NAME = 'ts_custom_units_updated';

const RECENT_UNITS_STORAGE_KEY = 'ts_recent_units';
const RECENT_UNITS_EVENT_NAME = 'ts_recent_units_updated';

const DEFAULT_RECENT_UNITS = ['KG', 'Gram', '250gm', 'Packet', 'Piece', 'Chatak', 'Box', 'Dozen'];

export function getRecentUnits(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_UNITS_STORAGE_KEY);
    if (!raw) return DEFAULT_RECENT_UNITS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_RECENT_UNITS;
  } catch {
    return DEFAULT_RECENT_UNITS;
  }
}

export function trackRecentUnit(unitName: string): string[] {
  const trimmed = unitName?.trim();
  if (!trimmed) return getRecentUnits();

  try {
    const current = getRecentUnits();
    // Case insensitive match to find existing index
    const existingIndex = current.findIndex(u => u.toLowerCase() === trimmed.toLowerCase());
    
    // Exact casing preferred if already in list, else trimmed
    const canonicalUnit = existingIndex !== -1 ? current[existingIndex] : trimmed;
    
    const filtered = current.filter((_, idx) => idx !== existingIndex);
    const updated = [canonicalUnit, ...filtered].slice(0, 8); // Keep top 8 recent units

    localStorage.setItem(RECENT_UNITS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(RECENT_UNITS_EVENT_NAME, { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Failed to track recent unit', err);
    return getRecentUnits();
  }
}

export function useRecentUnits() {
  const [recentUnits, setRecentUnits] = useState<string[]>(getRecentUnits());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      if ('detail' in e && Array.isArray((e as CustomEvent).detail)) {
        setRecentUnits((e as CustomEvent).detail);
      } else {
        setRecentUnits(getRecentUnits());
      }
    };

    window.addEventListener(RECENT_UNITS_EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(RECENT_UNITS_EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    recentUnits,
    trackRecentUnit: (unit: string) => trackRecentUnit(unit)
  };
}

export function getCustomUnits(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_UNITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomUnits(units: string[]): string[] {
  try {
    // Unique & clean
    const cleaned = Array.from(new Set(units.map(u => u.trim()).filter(Boolean)));
    localStorage.getItem(CUSTOM_UNITS_STORAGE_KEY);
    localStorage.setItem(CUSTOM_UNITS_STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent(CUSTOM_UNITS_EVENT_NAME, { detail: cleaned }));
    return cleaned;
  } catch (err) {
    console.error('Failed to save custom units', err);
    return units;
  }
}

export function addCustomUnit(newUnit: string): { success: boolean; units: string[]; error?: string } {
  const trimmed = newUnit.trim();
  if (!trimmed) {
    return { success: false, units: getCustomUnits(), error: 'Unit name cannot be empty' };
  }

  const existingCustom = getCustomUnits();
  const allStandard = UNITS.flatMap(g => g.values);

  // Case insensitive duplicate check
  const isDuplicate = [...allStandard, ...existingCustom].some(
    u => u.toLowerCase() === trimmed.toLowerCase()
  );

  if (isDuplicate) {
    return { success: false, units: existingCustom, error: `Unit "${trimmed}" already exists` };
  }

  const updated = [...existingCustom, trimmed];
  saveCustomUnits(updated);
  return { success: true, units: updated };
}

export function removeCustomUnit(unitToRemove: string): string[] {
  const existingCustom = getCustomUnits();
  const updated = existingCustom.filter(u => u.toLowerCase() !== unitToRemove.trim().toLowerCase());
  saveCustomUnits(updated);
  return updated;
}

export function getAllUnitGroups(customUnitsList?: string[]) {
  const custom = customUnitsList ?? getCustomUnits();
  return [
    ...UNITS,
    ...(custom.length > 0 ? [{ label: 'Custom Units', values: custom, isCustomGroup: true }] : [])
  ];
}

export function getAllUnitsFlat(customUnitsList?: string[]): string[] {
  const custom = customUnitsList ?? getCustomUnits();
  const standard = UNITS.flatMap(g => g.values);
  return [...standard, ...custom];
}

export function useCustomUnits() {
  const [customUnits, setCustomUnits] = useState<string[]>(getCustomUnits());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      if ('detail' in e && Array.isArray((e as CustomEvent).detail)) {
        setCustomUnits((e as CustomEvent).detail);
      } else {
        setCustomUnits(getCustomUnits());
      }
    };

    window.addEventListener(CUSTOM_UNITS_EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(CUSTOM_UNITS_EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleAdd = (name: string) => addCustomUnit(name);
  const handleRemove = (name: string) => removeCustomUnit(name);

  return {
    customUnits,
    addCustomUnit: handleAdd,
    removeCustomUnit: handleRemove,
    allUnitGroups: getAllUnitGroups(customUnits),
    allUnitsFlat: getAllUnitsFlat(customUnits)
  };
}
