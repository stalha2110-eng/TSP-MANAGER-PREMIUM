import { doc, setDoc, updateDoc, Firestore } from 'firebase/firestore';
import { db } from '../firebase';

export interface PendingDeletionRecord {
  uid: string;
  itemId: string;
  publicId: string;
  queuedAt: string;      // ISO 8601 timestamp — when the record was written
  deleteAfter: string;   // ISO 8601 timestamp — cron must NOT delete before this time (Undo grace period)
  undone: boolean;       // true = user clicked Undo; cron must skip this record
  status: 'pending' | 'processing' | 'failed';
  reason: 'replaced' | 'removed' | 'deleted';
  retryCount: number;
}

/** Grace period in milliseconds before the cron worker may process a 'deleted' record. */
export const DELETION_GRACE_PERIOD_MS = 5000;

/**
 * Derives a deterministic, safe Firestore document ID for a pending deletion record.
 * Using a deterministic ID based on the unique asset ensures idempotency (no duplicate entries).
 * Cloudinary publicId format: ts_biz_manager/users/{uid}/items/{cleanItemId}_{versionTimestamp}
 */
export function getPendingDeletionDocId(itemId: string, publicId: string): string {
  const assetKey = publicId.split('/').pop() || publicId;
  const cleanKey = assetKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanItem = itemId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleanKey.startsWith(cleanItem) ? cleanKey : `${cleanItem}_${cleanKey}`;
}

/**
 * Validates that a publicId belongs to the authenticated user and conforms to the expected Cloudinary pattern.
 * Rejects base64 data URLs, arbitrary external URLs, and cross-user asset paths.
 */
export function isValidUserCloudinaryPublicId(publicId: unknown, uid: string): boolean {
  if (typeof publicId !== 'string' || !publicId.trim()) return false;
  if (!uid || typeof uid !== 'string' || !uid.trim()) return false;

  const trimmed = publicId.trim();
  // Reject base64 data URLs
  if (trimmed.startsWith('data:')) return false;
  // Reject HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false;

  const expectedPrefix = `ts_biz_manager/users/${uid}/items/`;
  if (!trimmed.startsWith(expectedPrefix)) return false;

  // Must match standard user asset pattern
  const pattern = new RegExp(`^ts_biz_manager/users/${uid}/items/[a-zA-Z0-9_-]+$`);
  return pattern.test(trimmed);
}

/**
 * Safely enqueues an obsolete Cloudinary asset into Firestore users/{uid}/pending_deletions.
 *
 * For 'replaced' and 'removed' reasons, deleteAfter = queuedAt (immediately eligible for cleanup).
 * For 'deleted' reason (product deletion with Undo), deleteAfter = queuedAt + DELETION_GRACE_PERIOD_MS.
 * The 'undone' field is false by default; cancelPendingDeletion() sets it to true if the user clicks Undo.
 *
 * Fails gracefully without throwing to prevent breaking main product flows.
 */
export async function enqueuePendingDeletion(
  uid: string,
  itemId: string,
  publicId: string,
  reason: 'replaced' | 'removed' | 'deleted',
  customSetDoc?: (ref: any, data: any, options?: any) => Promise<any>,
  customDoc?: (db: any, ...pathSegments: string[]) => any
): Promise<boolean> {
  try {
    if (!uid || uid === 'guest_user') return false;
    if (!itemId || typeof itemId !== 'string' || !itemId.trim()) return false;
    if (!isValidUserCloudinaryPublicId(publicId, uid)) return false;

    const docId = getPendingDeletionDocId(itemId, publicId);
    const docFn = customDoc || doc;
    const setDocFn = customSetDoc || setDoc;

    const now = new Date();
    const gracePeriod = reason === 'deleted' ? DELETION_GRACE_PERIOD_MS : 0;
    const deleteAfter = new Date(now.getTime() + gracePeriod).toISOString();

    const record: PendingDeletionRecord = {
      uid,
      itemId: itemId.trim(),
      publicId: publicId.trim(),
      queuedAt: now.toISOString(),
      deleteAfter,
      undone: false,
      status: 'pending',
      reason,
      retryCount: 0,
    };

    const docRef = docFn(db, 'users', uid, 'pending_deletions', docId);
    await setDocFn(docRef, record, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[CleanupQueue] Failed to enqueue pending deletion for ${publicId}:`, err);
    return false;
  }
}

/**
 * Cancels a pending deletion record so the cron worker will skip it.
 *
 * Called by performUndo when the user restores a deleted product within the grace period.
 * Sets undone=true on the Firestore document. The cron worker checks this field before deleting.
 * Fails gracefully without throwing.
 */
export async function cancelPendingDeletion(
  uid: string,
  itemId: string,
  publicId: string,
  customUpdateDoc?: (ref: any, data: any) => Promise<any>,
  customDoc?: (db: any, ...pathSegments: string[]) => any
): Promise<boolean> {
  try {
    if (!uid || uid === 'guest_user') return false;
    if (!itemId || typeof itemId !== 'string' || !itemId.trim()) return false;
    if (!isValidUserCloudinaryPublicId(publicId, uid)) return false;

    const docId = getPendingDeletionDocId(itemId, publicId);
    const docFn = customDoc || doc;
    const updateDocFn = customUpdateDoc || updateDoc;

    const docRef = docFn(db, 'users', uid, 'pending_deletions', docId);
    await updateDocFn(docRef, { undone: true });
    return true;
  } catch (err) {
    // If the document doesn't exist (e.g. record was never written), that is safe to ignore
    console.warn(`[CleanupQueue] Failed to cancel pending deletion for ${publicId}:`, err);
    return false;
  }
}

/**
 * Safely enqueues multiple obsolete Cloudinary assets into Firestore users/{uid}/pending_deletions.
 */
export async function enqueueMultiplePendingDeletions(
  uid: string,
  items: { itemId: string; publicId: string }[],
  reason: 'replaced' | 'removed' | 'deleted',
  customSetDoc?: (ref: any, data: any, options?: any) => Promise<any>,
  customDoc?: (db: any, ...pathSegments: string[]) => any
): Promise<number> {
  if (!items || items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    const ok = await enqueuePendingDeletion(uid, item.itemId, item.publicId, reason, customSetDoc, customDoc);
    if (ok) count++;
  }
  return count;
}

/**
 * Cancels multiple pending deletion records (Undo for a batch deletion).
 * Fails gracefully without throwing.
 */
export async function cancelMultiplePendingDeletions(
  uid: string,
  items: { itemId: string; publicId: string }[],
  customUpdateDoc?: (ref: any, data: any) => Promise<any>,
  customDoc?: (db: any, ...pathSegments: string[]) => any
): Promise<number> {
  if (!items || items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    const ok = await cancelPendingDeletion(uid, item.itemId, item.publicId, customUpdateDoc, customDoc);
    if (ok) count++;
  }
  return count;
}
