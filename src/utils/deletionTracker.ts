/**
 * deletionTracker.ts
 * Reliable tombstone tracking for deleted inventory items and records.
 * Prevents background sync, real-time snapshot listeners, and cached state
 * from resurrecting items that have been deleted by the user.
 */

const DELETED_ITEMS_KEY = 'ts_deleted_item_ids';

export function getDeletedItemIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    console.warn('[deletionTracker] Failed to read deleted items from localStorage', e);
    return new Set();
  }
}

export function markItemsAsDeleted(ids: string | string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedItemIds();
    const toAdd = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of toAdd) {
      if (id && !current.has(id)) {
        current.add(id);
        changed = true;
      }
    }
    if (changed) {
      // Keep up to 2000 most recent deleted ids to prevent unbounded growth
      const list = Array.from(current).slice(-2000);
      localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('[deletionTracker] Failed to save deleted items', e);
  }
}

export function unmarkItemsAsDeleted(ids: string | string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedItemIds();
    const toRemove = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of toRemove) {
      if (id && current.has(id)) {
        current.delete(id);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(Array.from(current)));
    }
  } catch (e) {
    console.error('[deletionTracker] Failed to unmark deleted items', e);
  }
}

export function isItemDeleted(id: string): boolean {
  if (!id || typeof window === 'undefined') return false;
  const set = getDeletedItemIds();
  return set.has(id);
}

// Udhar Customer Deletion Tracker
const DELETED_UDHAR_CUSTOMERS_KEY = 'ts_deleted_udhar_customer_ids';

export function getDeletedUdharCustomerIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_UDHAR_CUSTOMERS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

export function markUdharCustomerDeleted(ids: string | string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedUdharCustomerIds();
    const toAdd = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of toAdd) {
      if (id && !current.has(id)) {
        current.add(id);
        changed = true;
      }
    }
    if (changed) {
      const list = Array.from(current).slice(-2000);
      localStorage.setItem(DELETED_UDHAR_CUSTOMERS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('[deletionTracker] Failed to save deleted udhar customer', e);
  }
}

export function unmarkUdharCustomerDeleted(ids: string | string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedUdharCustomerIds();
    const toRemove = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of toRemove) {
      if (id && current.has(id)) {
        current.delete(id);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(DELETED_UDHAR_CUSTOMERS_KEY, JSON.stringify(Array.from(current)));
    }
  } catch (e) {
    console.error('[deletionTracker] Failed to unmark deleted udhar customer', e);
  }
}

export function isUdharCustomerDeleted(id: string): boolean {
  if (!id || typeof window === 'undefined') return false;
  return getDeletedUdharCustomerIds().has(id);
}

// Udhar Transaction Deletion Tracker
const DELETED_UDHAR_TX_KEY = 'ts_deleted_udhar_tx_ids';

export function getDeletedUdharTxIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_UDHAR_TX_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

export function markUdharTxDeleted(ids: string | string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedUdharTxIds();
    const toAdd = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of toAdd) {
      if (id && !current.has(id)) {
        current.add(id);
        changed = true;
      }
    }
    if (changed) {
      const list = Array.from(current).slice(-2000);
      localStorage.setItem(DELETED_UDHAR_TX_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('[deletionTracker] Failed to save deleted udhar tx', e);
  }
}

export function unmarkUdharTxDeleted(ids: string | string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedUdharTxIds();
    const toRemove = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of toRemove) {
      if (id && current.has(id)) {
        current.delete(id);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(DELETED_UDHAR_TX_KEY, JSON.stringify(Array.from(current)));
    }
  } catch (e) {
    console.error('[deletionTracker] Failed to unmark deleted udhar tx', e);
  }
}

export function isUdharTxDeleted(id: string): boolean {
  if (!id || typeof window === 'undefined') return false;
  return getDeletedUdharTxIds().has(id);
}

