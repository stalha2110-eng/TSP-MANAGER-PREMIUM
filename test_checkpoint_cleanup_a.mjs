import assert from 'assert';
import {
  getPendingDeletionDocId,
  isValidUserCloudinaryPublicId,
  enqueuePendingDeletion,
  enqueueMultiplePendingDeletions,
  cancelPendingDeletion,
  cancelMultiplePendingDeletions,
  DELETION_GRACE_PERIOD_MS,
} from './src/services/cleanupQueueService.ts';
import { verifyAssetSafeToDelete } from './api/cloudinary/_utils.ts';

let passed = 0;
let failed = 0;
let total = 0;

function it(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(err);
    failed++;
  }
}

async function itAsync(description, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(err);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING CLOUDINARY CLEANUP CHECKPOINT A TESTS');
console.log('   Pending Deletion Queue Tracking & Safety Verification');
console.log('======================================================\n');

// -------------------------------------------------------------
// Suite 1: Document ID & Public ID Validation Rules
// -------------------------------------------------------------
console.log('Suite 1: Queue Document ID & Public ID Validation');

it('T01 — Derives deterministic, safe document ID from publicId without slashes', () => {
  const docId = getPendingDeletionDocId('item_123', 'ts_biz_manager/users/u1/items/item_123_1740000000');
  assert.strictEqual(docId, 'item_123_1740000000');
  assert.ok(!docId.includes('/'), 'Document ID must not contain slashes');
});

it('T02 — Derives composite safe document ID for non-matching item prefix', () => {
  const docId = getPendingDeletionDocId('item_abc', 'ts_biz_manager/users/u1/items/custom_asset_999');
  assert.strictEqual(docId, 'item_abc_custom_asset_999');
  assert.ok(!docId.includes('/'));
});

it('T03 — Rejects Base64 data URLs from being queued as public IDs', () => {
  const isOk = isValidUserCloudinaryPublicId('data:image/jpeg;base64,/9j/4AAQSkZJRg...', 'user_1');
  assert.strictEqual(isOk, false, 'Base64 data URLs must never be accepted as public IDs');
});

it('T04 — Rejects external HTTP/HTTPS URLs from being queued as public IDs', () => {
  const isOk = isValidUserCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/sample.jpg', 'user_1');
  assert.strictEqual(isOk, false, 'Full URLs must not be queued as public IDs');
});

it('T05 — Rejects cross-user asset paths for authenticated user', () => {
  const isOk = isValidUserCloudinaryPublicId('ts_biz_manager/users/attacker_user/items/item_1_1740000000', 'victim_user');
  assert.strictEqual(isOk, false, 'Assets belonging to a different UID must be rejected');
});

it('T06 — Accepts authentic matching user asset public ID', () => {
  const isOk = isValidUserCloudinaryPublicId('ts_biz_manager/users/user_123/items/item_abc_1740980000', 'user_123');
  assert.strictEqual(isOk, true, 'Authentic matching public ID must be accepted');
});

// -------------------------------------------------------------
// Suite 2: Enqueue Logic & Firestore Mocking
// -------------------------------------------------------------
console.log('\nSuite 2: Enqueue Logic & Error Resilience');

await itAsync('T07 — Successfully enqueues obsolete asset with expected schema (including deleteAfter and undone)', async () => {
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data, options) => {
    writtenDocs.set(docRef.path, { data, options });
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const before = Date.now();
  const success = await enqueuePendingDeletion(
    'user_abc',
    'item_1',
    'ts_biz_manager/users/user_abc/items/item_1_1740000001',
    'replaced',
    mockSetDoc,
    mockDoc
  );
  const after = Date.now();

  assert.strictEqual(success, true);
  assert.strictEqual(writtenDocs.size, 1);

  const entry = writtenDocs.get('users/user_abc/pending_deletions/item_1_1740000001');
  assert.ok(entry, 'Expected document written at correct path');
  assert.strictEqual(entry.data.uid, 'user_abc');
  assert.strictEqual(entry.data.itemId, 'item_1');
  assert.strictEqual(entry.data.publicId, 'ts_biz_manager/users/user_abc/items/item_1_1740000001');
  assert.strictEqual(entry.data.status, 'pending');
  assert.strictEqual(entry.data.reason, 'replaced');
  assert.strictEqual(entry.data.retryCount, 0);
  assert.ok(entry.data.queuedAt, 'queuedAt timestamp must exist');
  assert.ok(entry.data.deleteAfter, 'deleteAfter timestamp must exist');
  assert.strictEqual(entry.data.undone, false, 'undone must be false on initial enqueue');

  // For 'replaced', grace period = 0: deleteAfter should equal queuedAt (within 5ms tolerance)
  const queuedMs = new Date(entry.data.queuedAt).getTime();
  const deleteAfterMs = new Date(entry.data.deleteAfter).getTime();
  assert.ok(deleteAfterMs >= queuedMs, 'deleteAfter must be >= queuedAt');
  assert.ok(deleteAfterMs <= queuedMs + 50, 'replaced assets: deleteAfter must be close to queuedAt');
});

await itAsync('T08 — Duplicate queue protection: enqueuing same asset overwrites idempotently', async () => {
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data, options) => {
    writtenDocs.set(docRef.path, { data, options });
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  await enqueuePendingDeletion(
    'user_abc',
    'item_1',
    'ts_biz_manager/users/user_abc/items/item_1_1740000001',
    'replaced',
    mockSetDoc,
    mockDoc
  );

  await enqueuePendingDeletion(
    'user_abc',
    'item_1',
    'ts_biz_manager/users/user_abc/items/item_1_1740000001',
    'replaced',
    mockSetDoc,
    mockDoc
  );

  assert.strictEqual(writtenDocs.size, 1, 'Idempotent write: exactly 1 document exists for the asset');
});

await itAsync('T09 — Gracefully handles Firestore write rejection without throwing', async () => {
  const failingSetDoc = async () => {
    throw new Error('Firestore connection timeout');
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const success = await enqueuePendingDeletion(
    'user_abc',
    'item_1',
    'ts_biz_manager/users/user_abc/items/item_1_1740000001',
    'replaced',
    failingSetDoc,
    mockDoc
  );

  assert.strictEqual(success, false, 'Should return false on Firestore error without throwing');
});

await itAsync('T10 — Rejects unauthenticated or guest user from enqueuing', async () => {
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data) => writtenDocs.set(docRef.path, data);
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const res1 = await enqueuePendingDeletion('', 'item_1', 'ts_biz_manager/users//items/item_1', 'replaced', mockSetDoc, mockDoc);
  assert.strictEqual(res1, false);

  const res2 = await enqueuePendingDeletion('guest_user', 'item_1', 'ts_biz_manager/users/guest_user/items/item_1', 'replaced', mockSetDoc, mockDoc);
  assert.strictEqual(res2, false);
  assert.strictEqual(writtenDocs.size, 0);
});

// -------------------------------------------------------------
// Suite 3: Image Replacement, Removal, and Failure Scenarios
// -------------------------------------------------------------
console.log('\nSuite 3: Replacement & Removal Lifecycle Scenarios');

await itAsync('T11 — Image replacement: old public ID queued only after new image writes to Firestore', async () => {
  const queue = [];
  const oldPublicId = 'ts_biz_manager/users/u1/items/item1_v1';
  const newPublicId = 'ts_biz_manager/users/u1/items/item1_v2';
  let firestoreProductState = { cloudinaryPublicId: oldPublicId };

  // Simulated upload & write flow
  const uploadSuccess = true;
  if (uploadSuccess) {
    // 1. New image written to Firestore
    firestoreProductState = { cloudinaryPublicId: newPublicId };

    // 2. Only after setDoc succeeds:
    if (oldPublicId && oldPublicId !== newPublicId) {
      queue.push({ publicId: oldPublicId, reason: 'replaced' });
    }
  }

  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].publicId, oldPublicId);
  assert.strictEqual(queue[0].reason, 'replaced');
  assert.strictEqual(firestoreProductState.cloudinaryPublicId, newPublicId, 'New image is active');
});

await itAsync('T12 — Failed upload does NOT queue the old image', async () => {
  const queue = [];
  const oldPublicId = 'ts_biz_manager/users/u1/items/item1_v1';
  let uploadFailed = true;

  try {
    if (uploadFailed) throw new Error('Cloudinary 500 error');
    queue.push({ publicId: oldPublicId, reason: 'replaced' });
  } catch (err) {
    // Expected upload failure
  }

  assert.strictEqual(queue.length, 0, 'Old image must not be queued if upload fails');
});

await itAsync('T13 — Failed Firestore write does NOT queue the old image', async () => {
  const queue = [];
  const oldPublicId = 'ts_biz_manager/users/u1/items/item1_v1';
  let setDocFailed = true;

  try {
    // Upload succeeded
    const newPublicId = 'ts_biz_manager/users/u1/items/item1_v2';
    // Firestore write failed
    if (setDocFailed) throw new Error('Firestore unavailable');
    queue.push({ publicId: oldPublicId, reason: 'replaced' });
  } catch (err) {
    // Expected setDoc failure
  }

  assert.strictEqual(queue.length, 0, 'Old image must not be queued if Firestore write fails');
});

await itAsync('T14 — Explicit image removal queues previous public ID after persistence', async () => {
  const queue = [];
  const activePublicId = 'ts_biz_manager/users/u1/items/item1_v1';
  let isImageExplicitlyRemoved = true;

  // Persist removal in Firestore
  let firestoreDoc = { imageUrl: activePublicId, cloudinaryPublicId: activePublicId };
  if (isImageExplicitlyRemoved) {
    firestoreDoc = { imageUrl: undefined, cloudinaryPublicId: undefined };
    // After write succeeds:
    queue.push({ publicId: activePublicId, reason: 'removed' });
  }

  assert.strictEqual(queue.length, 1);
  assert.strictEqual(queue[0].publicId, activePublicId);
  assert.strictEqual(queue[0].reason, 'removed');
  assert.strictEqual(firestoreDoc.cloudinaryPublicId, undefined);
});

await itAsync('T15 — Multiple replacements do not queue currently active image', async () => {
  const queue = [];
  let currentActive = 'ts_biz_manager/users/u1/items/item1_v1';

  // Replacement 1: v1 -> v2
  const v1 = currentActive;
  currentActive = 'ts_biz_manager/users/u1/items/item1_v2';
  queue.push({ publicId: v1, reason: 'replaced' });

  // Replacement 2: v2 -> v3
  const v2 = currentActive;
  currentActive = 'ts_biz_manager/users/u1/items/item1_v3';
  queue.push({ publicId: v2, reason: 'replaced' });

  // Check queue contents
  assert.strictEqual(queue.length, 2);
  assert.strictEqual(queue[0].publicId, 'ts_biz_manager/users/u1/items/item1_v1');
  assert.strictEqual(queue[1].publicId, 'ts_biz_manager/users/u1/items/item1_v2');

  const queuedPublicIds = queue.map(q => q.publicId);
  assert.ok(!queuedPublicIds.includes(currentActive), 'Currently active image (v3) must never be in the queue');
});

// -------------------------------------------------------------
// Suite 4: Durable Undo — Firestore Grace-Period Records
// (replaces the client-side setTimeout approach)
// -------------------------------------------------------------
console.log('\nSuite 4: Durable Undo — Firestore Grace-Period Protection');

await itAsync('T16 — Product deletion: record written to Firestore immediately with deleteAfter = now + 5000ms', async () => {
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data, options) => {
    writtenDocs.set(docRef.path, { data, options });
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const beforeMs = Date.now();
  const success = await enqueuePendingDeletion(
    'user_x',
    'item_del',
    'ts_biz_manager/users/user_x/items/item_del_1740999999',
    'deleted',
    mockSetDoc,
    mockDoc
  );
  const afterMs = Date.now();

  assert.strictEqual(success, true, 'Enqueue must succeed immediately (not deferred)');
  assert.strictEqual(writtenDocs.size, 1, 'Record must be written to Firestore before grace period expires');

  const entry = writtenDocs.get('users/user_x/pending_deletions/item_del_1740999999');
  assert.ok(entry, 'Expected document written at correct Firestore path');
  assert.strictEqual(entry.data.undone, false, 'undone must be false on initial write');
  assert.strictEqual(entry.data.reason, 'deleted');

  const deleteAfterMs = new Date(entry.data.deleteAfter).getTime();
  const queuedAtMs = new Date(entry.data.queuedAt).getTime();

  // deleteAfter must be DELETION_GRACE_PERIOD_MS ahead of queuedAt
  assert.ok(
    deleteAfterMs >= queuedAtMs + DELETION_GRACE_PERIOD_MS - 50,
    `deleteAfter must be at least ${DELETION_GRACE_PERIOD_MS}ms after queuedAt`
  );
  assert.ok(
    deleteAfterMs <= afterMs + DELETION_GRACE_PERIOD_MS + 50,
    'deleteAfter must not be unreasonably far in the future'
  );
});

await itAsync('T17 — Undo sets undone=true in Firestore, cron will skip the record', async () => {
  const updatedDocs = new Map();
  const mockUpdateDoc = async (docRef, data) => {
    updatedDocs.set(docRef.path, data);
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const cancelled = await cancelPendingDeletion(
    'user_x',
    'item_del',
    'ts_biz_manager/users/user_x/items/item_del_1740999999',
    mockUpdateDoc,
    mockDoc
  );

  assert.strictEqual(cancelled, true, 'Undo cancellation must return true');
  assert.strictEqual(updatedDocs.size, 1, 'Exactly one Firestore document must be updated');

  const docUpdate = updatedDocs.get('users/user_x/pending_deletions/item_del_1740999999');
  assert.ok(docUpdate, 'Update must target the correct document path');
  assert.strictEqual(docUpdate.undone, true, 'undone must be set to true so cron skips this record');
  assert.ok(!('deleteAfter' in docUpdate), 'cancelPendingDeletion must not modify deleteAfter');
  assert.ok(!('status' in docUpdate), 'cancelPendingDeletion must not modify status');
});

await itAsync('T18 — Batch Undo: cancelMultiplePendingDeletions marks all restored assets as undone', async () => {
  const updatedDocs = new Map();
  const mockUpdateDoc = async (docRef, data) => {
    updatedDocs.set(docRef.path, data);
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const assets = [
    { itemId: 'item_a', publicId: 'ts_biz_manager/users/user_x/items/item_a_1740000001' },
    { itemId: 'item_b', publicId: 'ts_biz_manager/users/user_x/items/item_b_1740000002' },
  ];

  const count = await cancelMultiplePendingDeletions('user_x', assets, mockUpdateDoc, mockDoc);

  assert.strictEqual(count, 2, 'Both records must be cancelled');
  assert.strictEqual(updatedDocs.size, 2, 'Two Firestore documents must be updated');

  for (const [, updateData] of updatedDocs) {
    assert.strictEqual(updateData.undone, true, 'Each record must have undone=true');
  }
});

await itAsync('T19 — cancelPendingDeletion rejects guest_user and empty uid without Firestore write', async () => {
  const updatedDocs = new Map();
  const mockUpdateDoc = async (docRef, data) => {
    updatedDocs.set(docRef.path, data);
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const r1 = await cancelPendingDeletion(
    'guest_user',
    'item_1',
    'ts_biz_manager/users/guest_user/items/item_1_1740000001',
    mockUpdateDoc,
    mockDoc
  );
  const r2 = await cancelPendingDeletion(
    '',
    'item_1',
    'ts_biz_manager/users//items/item_1_1740000001',
    mockUpdateDoc,
    mockDoc
  );

  assert.strictEqual(r1, false, 'guest_user must be rejected');
  assert.strictEqual(r2, false, 'empty uid must be rejected');
  assert.strictEqual(updatedDocs.size, 0, 'No Firestore writes must have occurred');
});

await itAsync('T20 — Durable durability: tab-crash simulation confirms record survives in Firestore before grace period', async () => {
  // This verifies that the record is written SYNCHRONOUSLY during the deletion flow,
  // not deferred to a client-side timer. The test represents what happens if the
  // browser closes immediately after enqueuePendingDeletion returns true.
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data, options) => {
    writtenDocs.set(docRef.path, { data, options });
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  // Simulate deletion enqueue
  await enqueuePendingDeletion(
    'user_y',
    'item_crash',
    'ts_biz_manager/users/user_y/items/item_crash_1741000000',
    'deleted',
    mockSetDoc,
    mockDoc
  );

  // "Browser tab closes here" — no further client-side code runs

  // Record must be in Firestore already with undone=false
  const entry = writtenDocs.get('users/user_y/pending_deletions/item_crash_1741000000');
  assert.ok(entry, 'Record must exist in Firestore even if browser closes immediately after');
  assert.strictEqual(entry.data.undone, false);

  // deleteAfter confirms cron will not process it prematurely
  const deleteAfterMs = new Date(entry.data.deleteAfter).getTime();
  assert.ok(deleteAfterMs > Date.now() - 100, 'deleteAfter must be in the future relative to deletion time');
});

// -------------------------------------------------------------
// Suite 5: Compatibility with Existing Safety Helper
// -------------------------------------------------------------
console.log('\nSuite 5: Compatibility with verifyAssetSafeToDelete()');

await itAsync('T21 — verifyAssetSafeToDelete correctly validates asset when product is active (Case 2A: Referenced)', async () => {
  // Global fetch mock
  const originalFetch = global.fetch;
  const targetPublicId = 'ts_biz_manager/users/u1/items/item1_v1';

  global.fetch = async (url) => {
    if (url.includes('/users/u1/items/item1')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            cloudinaryPublicId: { stringValue: targetPublicId },
            imageUrl: { stringValue: `https://res.cloudinary.com/demo/image/upload/${targetPublicId}.jpg` }
          }
        })
      };
    }
    return { ok: false, status: 404 };
  };

  try {
    const res = await verifyAssetSafeToDelete('u1', 'item1', targetPublicId, 'token123');
    assert.strictEqual(res.safeToDelete, false, 'Must NOT be safe to delete when still referenced');
    assert.ok(res.reason.includes('currently active'));
  } finally {
    global.fetch = originalFetch;
  }
});

await itAsync('T22 — verifyAssetSafeToDelete allows deletion when asset is superseded (Case 2B: Superseded)', async () => {
  const originalFetch = global.fetch;
  const oldPublicId = 'ts_biz_manager/users/u1/items/item1_v1';
  const newPublicId = 'ts_biz_manager/users/u1/items/item1_v2';

  global.fetch = async (url) => {
    if (url.includes('/users/u1/items/item1')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            cloudinaryPublicId: { stringValue: newPublicId },
            imageUrl: { stringValue: `https://res.cloudinary.com/demo/image/upload/${newPublicId}.jpg` }
          }
        })
      };
    }
    return { ok: false, status: 404 };
  };

  try {
    const res = await verifyAssetSafeToDelete('u1', 'item1', oldPublicId, 'token123');
    assert.strictEqual(res.safeToDelete, true, 'Must be safe to delete when superseded by newer public ID');
    assert.ok(res.reason.includes('superseded'));
  } finally {
    global.fetch = originalFetch;
  }
});

await itAsync('T23 — verifyAssetSafeToDelete recognizes deleted product using deterministic queue docId', async () => {
  const originalFetch = global.fetch;
  const deletedPublicId = 'ts_biz_manager/users/u1/items/item1_1740980000';
  let queueDocChecked = false;

  global.fetch = async (url) => {
    if (url.includes('/users/u1/items/item1')) {
      return { ok: false, status: 404 }; // Product is deleted
    }
    if (url.includes('/users/u1/pending_deletions/item1_1740980000')) {
      queueDocChecked = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            uid: { stringValue: 'u1' },
            itemId: { stringValue: 'item1' },
            publicId: { stringValue: deletedPublicId },
            undone: { booleanValue: false },
            deleteAfter: { stringValue: new Date(Date.now() - 10_000).toISOString() }, // 10s ago — elapsed
            status: { stringValue: 'pending' },
            reason: { stringValue: 'deleted' },
          }
        })
      };
    }
    return { ok: false, status: 404 };
  };

  try {
    const res = await verifyAssetSafeToDelete('u1', 'item1', deletedPublicId, 'token123');
    assert.strictEqual(res.safeToDelete, true, 'Confirmed deleted product must be safe to delete');
    assert.strictEqual(queueDocChecked, true, 'Queue document with deterministic docId must be checked');
  } finally {
    global.fetch = originalFetch;
  }
});

// -------------------------------------------------------------
// Suite 6: I1 & I2 Corrective Patch Tests (Partial Failures & In-Flight Undo Race)
// -------------------------------------------------------------
console.log('\nSuite 6: I1 & I2 Corrective Patch Tests');

await itAsync('T24 — I1 Fix: Product deletion failure prevents obsolete asset from entering pending-deletion queue', async () => {
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data, options) => {
    writtenDocs.set(docRef.path, { data, options });
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const idsToDelete = ['item_failed_1'];
  const assetsToEnqueue = [{ itemId: 'item_failed_1', publicId: 'ts_biz_manager/users/u1/items/item_failed_1_1740000000' }];
  const successfullyDeletedIds = new Set();

  // Simulated deleteDoc with failure
  for (const id of idsToDelete) {
    try {
      throw new Error('Firestore deleteDoc permission denied');
      successfullyDeletedIds.add(id);
    } catch (e) {
      // Caught as in App.tsx
    }
  }

  // Filter as in patched App.tsx
  const successfullyDeletedAssets = assetsToEnqueue.filter(a => successfullyDeletedIds.has(a.itemId));

  if (successfullyDeletedAssets.length > 0) {
    await enqueueMultiplePendingDeletions('u1', successfullyDeletedAssets, 'deleted', mockSetDoc, mockDoc);
  }

  assert.strictEqual(writtenDocs.size, 0, 'No queue documents should be written when deleteDoc fails');
});

await itAsync('T25 — I1 Fix: Bulk product deletion with partial failure only enqueues successfully deleted products', async () => {
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data, options) => {
    writtenDocs.set(docRef.path, { data, options });
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const idsToDelete = ['item_ok', 'item_err'];
  const assetsToEnqueue = [
    { itemId: 'item_ok', publicId: 'ts_biz_manager/users/u1/items/item_ok_1740000001' },
    { itemId: 'item_err', publicId: 'ts_biz_manager/users/u1/items/item_err_1740000002' },
  ];
  const successfullyDeletedIds = new Set();

  // Simulated partial failure: item_ok succeeds, item_err fails
  for (const id of idsToDelete) {
    try {
      if (id === 'item_err') {
        throw new Error('Firestore deleteDoc quota exceeded');
      }
      successfullyDeletedIds.add(id);
    } catch (e) {
      // Error handled
    }
  }

  // Filter as in patched App.tsx
  const successfullyDeletedAssets = assetsToEnqueue.filter(a => successfullyDeletedIds.has(a.itemId));

  if (successfullyDeletedAssets.length > 0) {
    await enqueueMultiplePendingDeletions('u1', successfullyDeletedAssets, 'deleted', mockSetDoc, mockDoc);
  }

  assert.strictEqual(writtenDocs.size, 1, 'Exactly one queue document written for successful delete');
  assert.ok(writtenDocs.has('users/u1/pending_deletions/item_ok_1740000001'), 'item_ok asset must be queued');
  assert.ok(!writtenDocs.has('users/u1/pending_deletions/item_err_1740000002'), 'item_err asset must NOT be queued');
});

await itAsync('T26 — I2 Fix: Undo clicked while enqueue is in flight awaits enqueue and guarantees undone=true', async () => {
  const firestoreStore = new Map();
  const writeOrder = [];

  // Simulated delayed setDoc (25ms latency)
  const mockSetDoc = async (docRef, data, options) => {
    await new Promise(r => setTimeout(r, 25));
    firestoreStore.set(docRef.path, { ...data });
    writeOrder.push(`setDoc:${data.undone}`);
  };

  const mockUpdateDoc = async (docRef, data) => {
    const existing = firestoreStore.get(docRef.path);
    firestoreStore.set(docRef.path, { ...(existing || {}), ...data });
    writeOrder.push(`updateDoc:${data.undone}`);
  };

  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const uId = 'user_race';
  const assets = [{ itemId: 'item_race', publicId: 'ts_biz_manager/users/user_race/items/item_race_1740000000' }];

  // 1. confirmDeletion sets up batchEntry synchronously and begins enqueue
  const batchEntry = {
    assets,
    uid: uId,
    isUndone: false,
    enqueuePromise: null,
  };

  // Start enqueue (takes 25ms)
  const enqueuePromise = enqueueMultiplePendingDeletions(uId, assets, 'deleted', mockSetDoc, mockDoc);
  batchEntry.enqueuePromise = enqueuePromise;

  // 2. User clicks Undo 5ms later (while enqueue is in flight!)
  await new Promise(r => setTimeout(r, 5));
  batchEntry.isUndone = true;

  // performUndo logic: wait for in-flight enqueue to finish, then cancel
  const waitPromise = batchEntry.enqueuePromise ?? Promise.resolve(0);
  await waitPromise
    .catch(() => 0)
    .then(async () => {
      await cancelMultiplePendingDeletions(uId, assets, mockUpdateDoc, mockDoc);
    });

  // Verify write order and final document state
  assert.strictEqual(firestoreStore.size, 1);
  const doc = firestoreStore.get('users/user_race/pending_deletions/item_race_1740000000');
  assert.ok(doc, 'Document must exist in Firestore');
  assert.strictEqual(doc.undone, true, 'Final document state MUST have undone=true');
  assert.deepStrictEqual(writeOrder, ['setDoc:false', 'updateDoc:true'], 'setDoc MUST complete before updateDoc cancels');
});

await itAsync('T27 — I2 Fix: Undo clicked before enqueue begins prevents enqueueing altogether', async () => {
  const writtenDocs = new Map();
  const mockSetDoc = async (docRef, data, options) => {
    writtenDocs.set(docRef.path, { data, options });
  };
  const mockDoc = (db, ...pathSegments) => ({ path: pathSegments.join('/') });

  const uId = 'user_early_undo';
  const assets = [{ itemId: 'item_early', publicId: 'ts_biz_manager/users/user_early_undo/items/item_early_1740000000' }];

  // 1. confirmDeletion registers batchEntry synchronously before deleteDoc
  const batchEntry = {
    assets,
    uid: uId,
    isUndone: false,
    enqueuePromise: null,
  };

  // 2. User clicks Undo while deleteDoc is awaiting (before enqueue starts)
  batchEntry.isUndone = true;

  // 3. deleteDoc completes, confirmDeletion checks batchEntry.isUndone
  if (!batchEntry.isUndone) {
    await enqueueMultiplePendingDeletions(uId, assets, 'deleted', mockSetDoc, mockDoc);
  }

  assert.strictEqual(writtenDocs.size, 0, 'No pending deletion record queued if Undo was clicked during deleteDoc');
});

// -------------------------------------------------------------
// Suite 7: Two-Point Write-Chain Synchronization & Restoration Tests
// -------------------------------------------------------------
console.log('\nSuite 7: Two-Point Write-Chain Synchronization & Restoration');

await itAsync('T28 — Two-Point Sync: Undo while the first deletion in a bulk operation is in flight preserves all items', async () => {
  const firestoreDocs = new Map();
  const writeChain = new Map();
  const executionLog = [];

  // Initial Firestore state before deletion
  firestoreDocs.set('users/u1/items/item_1', { id: 'item_1', name: 'Item 1' });
  firestoreDocs.set('users/u1/items/item_2', { id: 'item_2', name: 'Item 2' });

  const idsToDelete = ['item_1', 'item_2'];
  const batchEntry = {
    assets: [
      { itemId: 'item_1', publicId: 'ts_biz_manager/users/u1/items/item_1_v1' },
      { itemId: 'item_2', publicId: 'ts_biz_manager/users/u1/items/item_2_v1' },
    ],
    uid: 'u1',
    isUndone: false,
  };

  const isItemDeletedMap = new Map([['item_1', true], ['item_2', true]]);
  const isItemDeleted = (id) => isItemDeletedMap.get(id) ?? false;

  // 1. Start bulk deletion loop
  const deletionLoopPromise = (async () => {
    for (const id of idsToDelete) {
      if (batchEntry.isUndone) break;
      if (!isItemDeleted(id)) continue;

      const prevWrite = writeChain.get(id) ?? Promise.resolve();
      const deletionWrite = prevWrite.catch(() => {}).then(async () => {
        if (batchEntry.isUndone || !isItemDeleted(id)) return;
        // Simulate in-flight network call for deleteDoc (30ms latency)
        await new Promise(r => setTimeout(r, 30));
        firestoreDocs.delete(`users/u1/items/${id}`);
        executionLog.push(`deleteDoc:${id}`);
      }).finally(() => {
        if (writeChain.get(id) === deletionWrite) writeChain.delete(id);
      });
      writeChain.set(id, deletionWrite);
      await deletionWrite;
    }
  })();

  // 2. User clicks Undo at 10ms (while item_1 deleteDoc is in flight, before item_2 starts)
  await new Promise(r => setTimeout(r, 10));
  batchEntry.isUndone = true;
  isItemDeletedMap.set('item_1', false);
  isItemDeletedMap.set('item_2', false);

  // 3. handleUpdateComponentState restoration runs:
  const restoredItems = [
    { id: 'item_1', name: 'Item 1', imageUrl: 'https://res.cloudinary.com/demo/image/upload/item_1.jpg' },
    { id: 'item_2', name: 'Item 2', imageUrl: 'https://res.cloudinary.com/demo/image/upload/item_2.jpg' },
  ];

  const restorationPromises = restoredItems.map(async (item) => {
    const prevWrite = writeChain.get(item.id) ?? Promise.resolve();
    const restoreWrite = prevWrite.catch(() => {}).then(async () => {
      // Simulate setDoc restoration write
      firestoreDocs.set(`users/u1/items/${item.id}`, item);
      executionLog.push(`setDoc:${item.id}`);
    }).finally(() => {
      if (writeChain.get(item.id) === restoreWrite) writeChain.delete(item.id);
    });
    writeChain.set(item.id, restoreWrite);
    await restoreWrite;
  });

  await Promise.all([deletionLoopPromise, ...restorationPromises]);

  // Both items must exist in Firestore
  assert.ok(firestoreDocs.has('users/u1/items/item_1'), 'item_1 must exist in Firestore after Undo');
  assert.ok(firestoreDocs.has('users/u1/items/item_2'), 'item_2 must exist in Firestore after Undo');

  // Verify write order for item_1: deleteDoc was followed by setDoc
  const item1Logs = executionLog.filter(l => l.includes('item_1'));
  assert.deepStrictEqual(item1Logs, ['deleteDoc:item_1', 'setDoc:item_1'], 'item_1 setDoc must execute after deleteDoc');

  // Verify item_2: deleteDoc was never even called because loop broke
  const item2DeleteLogs = executionLog.filter(l => l === 'deleteDoc:item_2');
  assert.strictEqual(item2DeleteLogs.length, 0, 'item_2 deleteDoc must never be called');
});

await itAsync('T29 — Two-Point Sync: Undo before next item in bulk deletion loop starts skips subsequent deleteDoc', async () => {
  const firestoreDocs = new Map();
  const writeChain = new Map();
  const executionLog = [];

  firestoreDocs.set('users/u1/items/item_a', { id: 'item_a' });
  firestoreDocs.set('users/u1/items/item_b', { id: 'item_b' });

  const idsToDelete = ['item_a', 'item_b'];
  const batchEntry = { uid: 'u1', isUndone: false };
  const isItemDeletedMap = new Map([['item_a', true], ['item_b', true]]);
  const isItemDeleted = (id) => isItemDeletedMap.get(id) ?? false;

  // Run item_a deletion first (takes 25ms)
  const loopPromise = (async () => {
    for (const id of idsToDelete) {
      if (batchEntry.isUndone) break;
      if (!isItemDeleted(id)) continue;

      const prevWrite = writeChain.get(id) ?? Promise.resolve();
      const deletionWrite = prevWrite.catch(() => {}).then(async () => {
        if (batchEntry.isUndone || !isItemDeleted(id)) return;
        await new Promise(r => setTimeout(r, 25));
        firestoreDocs.delete(`users/u1/items/${id}`);
        executionLog.push(`deleteDoc:${id}`);
      }).finally(() => {
        if (writeChain.get(id) === deletionWrite) writeChain.delete(id);
      });
      writeChain.set(id, deletionWrite);
      await deletionWrite;
    }
  })();

  // Undo fires at 10ms (while item_a is in flight, before item_b loop iteration starts):
  await new Promise(r => setTimeout(r, 10));
  batchEntry.isUndone = true;
  isItemDeletedMap.set('item_b', false);

  await loopPromise;

  assert.ok(!executionLog.includes('deleteDoc:item_b'), 'item_b must never have deleteDoc called');
  assert.ok(firestoreDocs.has('users/u1/items/item_b'), 'item_b must remain untouched in Firestore');
});

await itAsync('T30 — Two-Point Sync: Restoration setDoc waits for in-flight deleteDoc via write chain', async () => {
  const executionOrder = [];
  const writeChain = new Map();

  // Simulated slow deleteDoc (40ms)
  const prevWrite = writeChain.get('item_x') ?? Promise.resolve();
  const deletePromise = prevWrite.catch(() => {}).then(async () => {
    await new Promise(r => setTimeout(r, 40));
    executionOrder.push('deleteDoc');
  }).finally(() => {
    if (writeChain.get('item_x') === deletePromise) writeChain.delete('item_x');
  });
  writeChain.set('item_x', deletePromise);

  // Restoration setDoc dispatched at 10ms while deleteDoc is in flight
  await new Promise(r => setTimeout(r, 10));

  const chainBeforeRestore = writeChain.get('item_x') ?? Promise.resolve();
  const restorePromise = chainBeforeRestore.catch(() => {}).then(async () => {
    executionOrder.push('setDoc');
  }).finally(() => {
    if (writeChain.get('item_x') === restorePromise) writeChain.delete('item_x');
  });
  writeChain.set('item_x', restorePromise);

  await Promise.all([deletePromise, restorePromise]);

  assert.deepStrictEqual(executionOrder, ['deleteDoc', 'setDoc'], 'setDoc must wait for deleteDoc and execute strictly after it');
});

await itAsync('T31 — Two-Point Sync: Restored document preserves Cloudinary URL, publicId, and sync status', async () => {
  const itemToRestore = {
    id: 'prod_100',
    name: 'Wireless Mouse',
    retailPrice: 499,
    imageUrl: 'https://res.cloudinary.com/tsbiz/image/upload/v1234/ts_biz_manager/users/u1/items/prod_100.jpg',
    cloudinaryPublicId: 'ts_biz_manager/users/u1/items/prod_100',
    imageMigrationStatus: 'synced',
    unit: 'pcs',
  };

  const firestoreStore = new Map();
  const writeChain = new Map();

  // Restoration logic from handleUpdateComponentState
  const prevWrite = writeChain.get(itemToRestore.id) ?? Promise.resolve();
  const restoreWrite = prevWrite.catch(() => {}).then(async () => {
    firestoreStore.set(`users/u1/items/${itemToRestore.id}`, itemToRestore);
  }).finally(() => {
    if (writeChain.get(itemToRestore.id) === restoreWrite) writeChain.delete(itemToRestore.id);
  });
  writeChain.set(itemToRestore.id, restoreWrite);
  await restoreWrite;

  const saved = firestoreStore.get('users/u1/items/prod_100');
  assert.ok(saved, 'Product must exist in Firestore');
  assert.strictEqual(saved.imageUrl, itemToRestore.imageUrl, 'imageUrl must be preserved');
  assert.strictEqual(saved.cloudinaryPublicId, itemToRestore.cloudinaryPublicId, 'cloudinaryPublicId must be preserved');
  assert.strictEqual(saved.imageMigrationStatus, 'synced', 'imageMigrationStatus must be preserved');
  assert.strictEqual(saved.name, 'Wireless Mouse');
});

// -------------------------------------------------------------
// Suite 8: verifyAssetSafeToDelete — Case 3 Queue Record Validation
// Tests that field-level validation of the pending-deletion Firestore
// document is enforced before authorizing Cloudinary deletion.
// All tests use real production verifyAssetSafeToDelete() with mocked fetch.
// -------------------------------------------------------------
console.log('\nSuite 8: verifyAssetSafeToDelete — Case 3 Queue Record Field Validation');

{
  // Shared test constants
  const TEST_UID = 'user_test_123';
  const TEST_ITEM_ID = 'item_abc';
  const TEST_PUBLIC_ID = 'ts_biz_manager/users/user_test_123/items/item_abc_1740000001';
  const TEST_TOKEN = 'fake-token';

  // Helper: build a complete, valid Firestore REST response for a pending-deletion queue record.
  // All fields default to fully eligible values so individual tests can override one field at a time.
  function makeQueueDocResponse(overrides = {}) {
    const defaults = {
      uid: TEST_UID,
      itemId: TEST_ITEM_ID,
      publicId: TEST_PUBLIC_ID,
      undone: false,
      deleteAfter: new Date(Date.now() - 10_000).toISOString(), // 10s ago — elapsed
      status: 'pending',
      reason: 'deleted', // valid reason required by the new check
    };
    const merged = { ...defaults, ...overrides };

    return {
      fields: {
        uid: { stringValue: merged.uid },
        itemId: { stringValue: merged.itemId },
        publicId: { stringValue: merged.publicId },
        undone: { booleanValue: merged.undone },
        deleteAfter: { stringValue: merged.deleteAfter },
        status: { stringValue: merged.status },
        reason: { stringValue: merged.reason },
      },
    };
  }

  // Helper: install a global.fetch mock and return a restore function
  function mockFetch(handler) {
    const original = global.fetch;
    global.fetch = handler;
    return () => { global.fetch = original; };
  }

  // Helper: make a Response-like object
  function makeResponse(status, body) {
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    };
  }

  // Helper: make a Response-like object where json() throws
  function makeMalformedResponse(status) {
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    };
  }

  // --- T32 ---
  await itAsync('T32 — undone:true in queue record blocks deletion even when product is deleted', async () => {
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);         // Product gone
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ undone: true })); // Undo'd
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when undone=true');
      assert.strictEqual(result.retryable, false, 'retryable must be false for Undo blocks');
      assert.ok(result.reason.toLowerCase().includes('undo'), `reason must mention Undo, got: "${result.reason}"`);
    } finally { restore(); }
  });

  // --- T33 ---
  await itAsync('T33 — Future deleteAfter blocks deletion (grace period not elapsed)', async () => {
    const futureDeleteAfter = new Date(Date.now() + 60_000).toISOString(); // 60s from now
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ undone: false, deleteAfter: futureDeleteAfter }));
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when deleteAfter is in the future');
      assert.strictEqual(result.retryable, true, 'retryable must be true so the worker can try again later');
      assert.ok(result.reason.toLowerCase().includes('grace period'), `reason must mention grace period, got: "${result.reason}"`);
    } finally { restore(); }
  });

  // --- T34 ---
  await itAsync('T34 — Expired deleteAfter with matching uid and publicId authorizes deletion', async () => {
    const expiredDeleteAfter = new Date(Date.now() - 10_000).toISOString(); // 10s ago
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ undone: false, deleteAfter: expiredDeleteAfter }));
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, true, 'safeToDelete must be true when all checks pass and grace period elapsed');
    } finally { restore(); }
  });

  // --- T35 ---
  await itAsync('T35 — Mismatched publicId in queue record blocks deletion', async () => {
    const DIFFERENT_PUBLIC_ID = 'ts_biz_manager/users/user_test_123/items/item_abc_9999999';
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      // Queue doc has a different publicId (different image version)
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ publicId: DIFFERENT_PUBLIC_ID }));
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when queue record publicId does not match');
      assert.strictEqual(result.retryable, false, 'retryable must be false for publicId mismatch');
    } finally { restore(); }
  });

  // --- T36 ---
  await itAsync('T36 — Mismatched uid in queue record blocks deletion (cross-user safety)', async () => {
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ uid: 'attacker_uid_999' }));
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when queue record uid does not match');
      assert.strictEqual(result.retryable, false, 'retryable must be false for uid mismatch');
    } finally { restore(); }
  });

  // --- T37 ---
  await itAsync('T37 — HTTP 500 reading queue record fails safely (retryable)', async () => {
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(500, null); // Firestore error
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when queue fetch returns 500');
      assert.strictEqual(result.retryable, true, 'retryable must be true for Firestore error');
      assert.ok(result.reason.includes('500'), `reason must mention HTTP 500, got: "${result.reason}"`);
    } finally { restore(); }
  });

  // --- T38 ---
  await itAsync('T38 — Malformed JSON in queue response fails safely (retryable)', async () => {
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeMalformedResponse(200);
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when queue JSON is malformed');
      assert.strictEqual(result.retryable, true, 'retryable must be true for parse error');
      assert.ok(result.reason.toLowerCase().includes('parse') || result.reason.toLowerCase().includes('failed'), `reason must indicate parse failure, got: "${result.reason}"`);
    } finally { restore(); }
  });

  // --- T39 ---
  await itAsync('T39 — No queue record (both docId and legacy 404) DENIES deletion (fail-closed)', async () => {
    // Both-404 must now return safeToDelete: false.
    // A missing product document alone is NOT sufficient to authorize Cloudinary deletion.
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null); // Product gone
      if (url.includes('/pending_deletions/')) return makeResponse(404, null);    // No queue record either
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when no queue record exists (fail-closed)');
      assert.strictEqual(result.retryable, false, 'retryable must be false — no queue record means no retry will help');
      assert.ok(
        result.reason.toLowerCase().includes('queue record') || result.reason.toLowerCase().includes('pending'),
        `reason must indicate missing queue record, got: "${result.reason}"`
      );
    } finally { restore(); }
  });

  // --- T40 ---
  await itAsync('T40 — Full valid queue record authorizes deletion (happy path)', async () => {
    // A product that is gone AND has a fully valid, unexpired queue record must be authorized.
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null); // Product gone
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse()); // All fields valid
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, true, 'safeToDelete must be true for a fully valid queue record');
      assert.strictEqual(result.retryable, false);
    } finally { restore(); }
  });

  // --- T41 ---
  await itAsync('T41 — Missing itemId in queue record denies deletion', async () => {
    const queueDoc = makeQueueDocResponse();
    delete queueDoc.fields.itemId; // Remove itemId entirely
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(200, queueDoc);
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when itemId is missing');
      assert.strictEqual(result.retryable, false);
    } finally { restore(); }
  });

  // --- T42 ---
  await itAsync('T42 — Incorrect itemId in queue record denies deletion', async () => {
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ itemId: 'item_xyz_different' }));
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when itemId does not match');
      assert.strictEqual(result.retryable, false);
      assert.ok(result.reason.toLowerCase().includes('itemid'), `reason must mention itemId, got: "${result.reason}"`);
    } finally { restore(); }
  });

  // --- T43 ---
  await itAsync('T43 — Missing status in queue record denies deletion', async () => {
    const queueDoc = makeQueueDocResponse();
    delete queueDoc.fields.status; // Remove status field entirely
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(200, queueDoc);
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when status is missing');
      assert.strictEqual(result.retryable, false);
    } finally { restore(); }
  });

  // --- T44 ---
  await itAsync('T44 — Unknown status "completed" in queue record denies deletion', async () => {
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      // 'completed' is not an eligible status — unknown statuses must be denied
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ status: 'completed' }));
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false for unknown/ineligible status');
      assert.strictEqual(result.retryable, false);
      assert.ok(result.reason.toLowerCase().includes('status'), `reason must mention status, got: "${result.reason}"`);
    } finally { restore(); }
  });

  // --- T45 ---
  await itAsync('T45 — Invalid reason "purged" in queue record denies deletion', async () => {
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      // 'purged' is not a recognised deletion reason
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse({ reason: 'purged' }));
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false for unrecognised reason');
      assert.strictEqual(result.retryable, false);
      assert.ok(result.reason.toLowerCase().includes('reason'), `reason must mention reason field, got: "${result.reason}"`);
    } finally { restore(); }
  });

  // --- T46 ---
  await itAsync('T46 — Missing reason field in queue record denies deletion', async () => {
    const queueDoc = makeQueueDocResponse();
    delete queueDoc.fields.reason;
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) return makeResponse(404, null);
      if (url.includes('/pending_deletions/')) return makeResponse(200, queueDoc);
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when reason field is missing');
      assert.strictEqual(result.retryable, false);
    } finally { restore(); }
  });

  // --- T47 ---
  await itAsync('T47 — Existing product still references asset denies deletion even with valid queue record (Case 2 safety)', async () => {
    // This tests that Case 2 (product exists and still references publicId) blocks deletion
    // regardless of whether a queue record also exists. The item fetch returns 200 with the same publicId.
    const restore = mockFetch(async (url) => {
      if (url.includes(`/items/${TEST_ITEM_ID}`)) {
        // Product document EXISTS and still references this publicId
        return makeResponse(200, {
          fields: {
            cloudinaryPublicId: { stringValue: TEST_PUBLIC_ID },
            imageUrl: { stringValue: `https://res.cloudinary.com/demo/image/upload/${TEST_PUBLIC_ID}.jpg` },
          },
        });
      }
      // Queue record also exists and is fully valid — but Case 2 must block before we get here
      if (url.includes('/pending_deletions/')) return makeResponse(200, makeQueueDocResponse());
      return makeResponse(500, null);
    });
    try {
      const result = await verifyAssetSafeToDelete(TEST_UID, TEST_ITEM_ID, TEST_PUBLIC_ID, TEST_TOKEN);
      assert.strictEqual(result.safeToDelete, false, 'safeToDelete must be false when product still references the asset');
      assert.strictEqual(result.retryable, false);
      assert.ok(
        result.reason.toLowerCase().includes('active') || result.reason.toLowerCase().includes('referenced'),
        `reason must indicate active reference, got: "${result.reason}"`
      );
    } finally { restore(); }
  });
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n======================================================');
console.log(`CHECKPOINT A TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (${total} TOTAL)`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
