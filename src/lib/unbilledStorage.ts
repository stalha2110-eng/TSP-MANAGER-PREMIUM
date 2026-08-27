import { UnbilledEntry } from '../types';
import { db, auth } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_KEY_ENTRIES = 'tsm_unbilled_entries';
const STORAGE_KEY_PRESETS = 'tsm_unbilled_presets';
const STORAGE_KEY_CATEGORIES = 'tsm_unbilled_categories';
const SESSION_KEY_UNLOCKED = 'tsm_unbilled_session_unlocked';

export const DEFAULT_PRESET_CHIPS = [10, 15, 20, 25, 30];

// Custom event name for instant cross-component updates
export const UNBILLED_UPDATED_EVENT = 'tsm-unbilled-updated';

/**
 * Get all unbilled entries from localStorage
 */
export function getUnbilledEntries(): UnbilledEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse unbilled entries:', err);
    return [];
  }
}

/**
 * Save unbilled entries to localStorage and dispatch update event
 */
export function saveUnbilledEntries(entries: UnbilledEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(UNBILLED_UPDATED_EVENT));
  } catch (err) {
    console.error('Failed to save unbilled entries:', err);
  }
}

/**
 * Add a new unbilled entry
 */
export function addUnbilledEntry(
  amount: number,
  category: string = 'General',
  cashierName?: string,
  note?: string
): UnbilledEntry {
  const entries = getUnbilledEntries();
  const now = new Date();
  
  const newEntry: UnbilledEntry = {
    id: 'unbilled_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    amount: Math.max(0, amount),
    category: category.trim() || 'General',
    timestamp: now.getTime(),
    dateStr: now.toISOString(),
    cashier: cashierName || 'Store Cashier',
    note: note || ''
  };

  const updated = [newEntry, ...entries];
  saveUnbilledEntries(updated);

  if (auth.currentUser?.uid && db) {
    try {
      setDoc(doc(db, 'users', auth.currentUser.uid, 'unbilledEntries', newEntry.id), newEntry)
        .catch(err => console.error('Firestore unbilled entry upload error:', err));
    } catch (e) {
      console.error('Firestore unbilled upload error:', e);
    }
  }

  return newEntry;
}

/**
 * Delete an unbilled entry by ID
 */
export function deleteUnbilledEntry(id: string): void {
  const entries = getUnbilledEntries();
  const updated = entries.filter(e => e.id !== id);
  saveUnbilledEntries(updated);

  if (auth.currentUser?.uid && db) {
    try {
      deleteDoc(doc(db, 'users', auth.currentUser.uid, 'unbilledEntries', id))
        .catch(err => console.error('Firestore unbilled entry delete error:', err));
    } catch (e) {
      console.error('Firestore unbilled delete error:', e);
    }
  }
}

/**
 * Clear all unbilled entries
 */
export function clearAllUnbilledEntries(): void {
  const currentEntries = getUnbilledEntries();
  saveUnbilledEntries([]);

  if (auth.currentUser?.uid && db) {
    try {
      currentEntries.forEach(entry => {
        deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'unbilledEntries', entry.id))
          .catch(err => console.error('Firestore unbilled clear error:', err));
      });
    } catch (e) {
      console.error('Firestore unbilled clear all error:', e);
    }
  }
}

/**
 * Get preset chips array from localStorage (defaults to [10, 15, 20, 25, 30])
 */
export function getUnbilledPresets(): number[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_CHIPS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!raw) return DEFAULT_PRESET_CHIPS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRESET_CHIPS;
  } catch (err) {
    return DEFAULT_PRESET_CHIPS;
  }
}

/**
 * Save custom preset chips array to localStorage
 */
export function saveUnbilledPresets(presets: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Sort ascending for clean UI
    const sanitized = Array.from(new Set(presets.filter(p => typeof p === 'number' && p > 0))).sort((a, b) => a - b);
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(UNBILLED_UPDATED_EVENT));
  } catch (err) {
    console.error('Failed to save unbilled presets:', err);
  }
}

/**
 * Get dynamic custom categories from localStorage (NO default pre-baked categories like Snacks, Water, Hardware)
 */
export function getUnbilledCategories(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Save custom categories to localStorage
 */
export function saveUnbilledCategories(categories: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)));
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(UNBILLED_UPDATED_EVENT));
  } catch (err) {
    console.error('Failed to save unbilled categories:', err);
  }
}

/**
 * Add a custom category
 */
export function addUnbilledCategory(categoryName: string): string[] {
  const existing = getUnbilledCategories();
  const trimmed = categoryName.trim();
  if (!trimmed) return existing;
  if (!existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...existing, trimmed];
    saveUnbilledCategories(updated);
    return updated;
  }
  return existing;
}

/**
 * Delete a custom category
 */
export function deleteUnbilledCategory(categoryName: string): string[] {
  const existing = getUnbilledCategories();
  const updated = existing.filter(c => c.toLowerCase() !== categoryName.trim().toLowerCase());
  saveUnbilledCategories(updated);
  return updated;
}

/**
 * Check if the removal security session is unlocked
 */
export function isUnbilledSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_KEY_UNLOCKED) === 'true';
  } catch (err) {
    return false;
  }
}

/**
 * Set removal security session unlock state
 */
export function setUnbilledSessionUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(SESSION_KEY_UNLOCKED, 'true');
    } else {
      sessionStorage.removeItem(SESSION_KEY_UNLOCKED);
    }
    window.dispatchEvent(new CustomEvent(UNBILLED_UPDATED_EVENT));
  } catch (err) {
    console.error('Failed to set session unlock:', err);
  }
}
