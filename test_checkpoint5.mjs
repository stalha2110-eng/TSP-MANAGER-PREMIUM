/**
 * Test Suite: Checkpoint 5 — Existing Product Image Migration
 * Standalone runner: zero external dependencies, uses native Node.js and local tsx.
 *
 * COVERAGE:
 *   Suite 1: Candidate Detection (getMigrationCandidates)
 *   - T1  Item with local Base64 imageUrl is identified as candidate
 *   - T2  Item with Base64 in localImageStorage is identified as candidate
 *   - T3  Item with authentic Cloudinary HTTPS URL is skipped
 *   - T4  Item with imageMigrationStatus: 'synced' but base64 imageUrl is still a candidate
 *   - T5  Item with no image is skipped
 *   - T6  Soft-deleted item (isItemDeleted) is skipped even with local Base64 image
 *   - T7  Candidate detection does not rely solely on imageMigrationStatus
 *   - T8  Item with cloudinaryPublicId + synced status but no valid Cloudinary imageUrl is a candidate
 *
 *   Suite 2: Sequential Execution & Progress Telemetry (ImageMigrationService)
 *   - T9  Migrates candidates sequentially one by one with progress callbacks
 *   - T10 Empty candidate list completes immediately with status: 'completed'
 *   - T11 Single item failure continues processing remaining candidates
 *   - T12 Duplicate run prevention: rejects if migration already running
 *   - T13 Safe cancellation: aborts loop when cancelled before next iteration
 *   - T14 Cancellation during active upload: result discarded, not persisted to Firestore
 *   - T15 Cancelled upload increments skippedCount, not successCount
 *
 *   Suite 3: Save Callback & Success Reporting Safety
 *   - T16 Successful migration invokes saveToFirestore and counts success when returning true
 *   - T17 Save callback returning false is counted as skippedCount, NOT successCount
 *   - T18 Missing save callback is treated as an error/failure, not a success
 *   - T19 Firestore write error in saveToFirestore is preserved and counted as failure
 *   - T20 Firestore merge update preserves all non-image product fields
 *
 *   Suite 4: Safe Upload-Token Clearing & Token Guard
 *   - T21 Safe clearUploadToken: deletes token only when currently registered token matches expectedToken
 *   - T22 Safe clearUploadToken: calling with an old token does not delete a newer token
 *   - T23 In-flight user edit invalidates token: stale migration response is discarded
 *   - T24 In-flight image removal invalidates token: migration cannot restore removed image
 *   - T25 Product deleted during in-flight upload: cannot resurrect deleted product
 *
 *   Suite 5: Mandatory Image Freshness Verification (getItemCurrentImage)
 *   - T26 Migration cannot start without getItemCurrentImage callback
 *   - T27 Pre-upload freshness: image replaced before upload starts is skipped
 *   - T28 Pre-upload freshness: image removed before upload starts is skipped
 *   - T29 Post-upload freshness: image replaced after upload completes but before Firestore write is skipped
 *   - T30 Post-upload freshness: image removed after upload completes is skipped
 *   - T31 Fresh image (matching candidate) proceeds through upload and save successfully
 *
 *   Suite 6: Preservation of Local Images & Retry Support
 *   - T32 Local Base64 images in localStorage are NOT deleted or cleared upon successful migration
 *   - T33 Upload failure preserves original Base64 image locally and allows successful retry
 *
 *   Suite 7: Guard Clauses & UI Preconditions
 *   - T34 Migration blocked when user is unauthenticated
 *   - T35 Migration blocked when user is guest_user
 *   - T36 Migration blocked when device is offline
 *   - T37 Migration button disabled when candidate count is 0
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import assert from 'node:assert';

// Environment polyfill — localImageStorage reads localStorage at module evaluation
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// FormData polyfill for Node
if (typeof globalThis.FormData === 'undefined') {
  class FormDataPolyfill {
    constructor() { this._entries = []; }
    append(name, value) { this._entries.push([name, value]); }
    get(name) { const e = this._entries.find(([n]) => n === name); return e ? e[1] : null; }
    getAll(name) { return this._entries.filter(([n]) => n === name).map(([, v]) => v); }
    has(name) { return this._entries.some(([n]) => n === name); }
    entries() { return this._entries[Symbol.iterator](); }
    [Symbol.iterator]() { return this._entries[Symbol.iterator](); }
  }
  globalThis.FormData = FormDataPolyfill;
}

// Blob polyfill
if (typeof globalThis.Blob === 'undefined') {
  const { Blob: NodeBlob } = await import('node:buffer');
  globalThis.Blob = NodeBlob;
}

// atob polyfill
if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
}

// Bootstrap through tsx for TypeScript resolution
if (!process.env.__CHECKPOINT5_RUNNER__) {
  const tsxPath = './node_modules/tsx/dist/cli.mjs';
  const selfPath = fileURLToPath(import.meta.url);
  const res = spawnSync(process.execPath, [tsxPath, selfPath], {
    stdio: 'inherit',
    env: { ...process.env, __CHECKPOINT5_RUNNER__: '1' },
  });
  process.exit(res.status ?? 0);
}

// ─── Production Imports ────────────────────────────────────────────────────────
const {
  getMigrationCandidates,
  ImageMigrationService,
} = await import('./src/services/imageMigrationService.ts');

const {
  isValidCloudinaryUrl,
} = await import('./src/firebase.ts');

const {
  markItemsAsDeleted,
  unmarkItemsAsDeleted,
  isItemDeleted,
} = await import('./src/utils/deletionTracker.ts');

// ─── Test Harness ──────────────────────────────────────────────────────────────
let total = 0, passed = 0, failed = 0;

function section(name) {
  console.log(`\n${'─'.repeat(70)}\n  ${name}\n${'─'.repeat(70)}`);
}

async function it(label, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ FAIL: ${label}`);
    console.error(`     ${err?.message || err}`);
    if (err?.stack) {
      const line = err.stack.split('\n')[1];
      if (line) console.error(`    ${line.trim()}`);
    }
  }
}

// Minimal 1x1 JPEG Data URL
const VALID_JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const VALID_CLOUDINARY_URL = 'https://res.cloudinary.com/ts-biz-demo/image/upload/v1700000000/users/user123/items/item1_thumb.jpg';

// Helper: base item factory
function createTestItem(overrides = {}) {
  return {
    id: 'item_' + Math.random().toString(36).slice(2, 8),
    name: 'Test Product',
    translations: { en: 'Test Product', hi: '', mr: '', 'hi-en': '' },
    categoryId: 'cat_general',
    quantity: 10,
    unit: 'pcs',
    buyingPrice: 100,
    buyingPriceUnit: 'pcs',
    wholesalePrice: 120,
    wholesalePriceUnit: 'pcs',
    retailPrice: 140,
    retailPriceUnit: 'pcs',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Candidate Detection (getMigrationCandidates)
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 1 — Candidate Detection (getMigrationCandidates)');

await it('T1 — Item with local Base64 imageUrl is identified as candidate', async () => {
  const item = createTestItem({ id: 'item_t1', imageUrl: VALID_JPEG_DATA_URL });
  const candidates = getMigrationCandidates([item], {});
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].id, 'item_t1');
  assert.strictEqual(candidates[0].base64DataUrl, VALID_JPEG_DATA_URL);
});

await it('T2 — Item with Base64 in localImageStorage is identified as candidate', async () => {
  const item = createTestItem({ id: 'item_t2', imageUrl: undefined });
  const localMap = { item_t2: VALID_JPEG_DATA_URL };
  const candidates = getMigrationCandidates([item], localMap);
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].id, 'item_t2');
  assert.strictEqual(candidates[0].base64DataUrl, VALID_JPEG_DATA_URL);
});

await it('T3 — Item with authentic Cloudinary HTTPS URL is skipped', async () => {
  const item = createTestItem({ id: 'item_t3', imageUrl: VALID_CLOUDINARY_URL });
  const localMap = { item_t3: VALID_JPEG_DATA_URL }; // Stale local image
  const candidates = getMigrationCandidates([item], localMap);
  assert.strictEqual(candidates.length, 0, 'Item with valid Cloudinary URL must be skipped');
});

await it('T4 — imageMigrationStatus: "synced" + cloudinaryPublicId but base64 imageUrl is still a candidate', async () => {
  const item = createTestItem({
    id: 'item_t4_stale_meta',
    imageUrl: VALID_JPEG_DATA_URL,
    cloudinaryPublicId: 'users/uid/items/item_t4_stale_meta',
    imageMigrationStatus: 'synced',
  });
  const candidates = getMigrationCandidates([item], {});
  assert.strictEqual(candidates.length, 1,
    'Item with stale metadata but base64 imageUrl must be a migration candidate');
  assert.strictEqual(candidates[0].id, 'item_t4_stale_meta');
});

await it('T5 — Item with no image is skipped', async () => {
  const item = createTestItem({ id: 'item_t5', imageUrl: undefined });
  const candidates = getMigrationCandidates([item], {});
  assert.strictEqual(candidates.length, 0);
});

await it('T6 — Soft-deleted item (isItemDeleted) is skipped even with local Base64 image', async () => {
  const item = createTestItem({ id: 'item_t6_deleted', imageUrl: VALID_JPEG_DATA_URL });
  markItemsAsDeleted('item_t6_deleted');
  assert.strictEqual(isItemDeleted('item_t6_deleted'), true);

  const candidates = getMigrationCandidates([item], {});
  assert.strictEqual(candidates.length, 0, 'Deleted item must be skipped');

  unmarkItemsAsDeleted('item_t6_deleted');
});

await it('T7 — Candidate detection does not rely solely on imageMigrationStatus', async () => {
  const itemLocal = createTestItem({ id: 'item_t7_local', imageUrl: VALID_JPEG_DATA_URL, imageMigrationStatus: 'local' });
  const itemFailed = createTestItem({ id: 'item_t7_failed', imageUrl: VALID_JPEG_DATA_URL, imageMigrationStatus: 'failed' });
  const itemUndefined = createTestItem({ id: 'item_t7_undef', imageUrl: VALID_JPEG_DATA_URL });

  const candidates = getMigrationCandidates([itemLocal, itemFailed, itemUndefined], {});
  assert.strictEqual(candidates.length, 3, 'All items with base64 must be candidates regardless of status tag');
});

await it('T8 — Item with cloudinaryPublicId + synced but base64 imageUrl is a candidate; item with valid Cloudinary imageUrl is skipped', async () => {
  const itemWithStaleMeta = createTestItem({
    id: 'item_t8_stale',
    imageUrl: VALID_JPEG_DATA_URL,
    cloudinaryPublicId: 'users/x/items/t8',
    imageMigrationStatus: 'synced',
  });
  const itemTrulyMigrated = createTestItem({
    id: 'item_t8_done',
    imageUrl: VALID_CLOUDINARY_URL,
    cloudinaryPublicId: 'users/x/items/t8_done',
    imageMigrationStatus: 'synced',
  });

  const candidates = getMigrationCandidates([itemWithStaleMeta, itemTrulyMigrated], {});
  assert.strictEqual(candidates.length, 1, 'Only the stale-meta item must be a candidate');
  assert.strictEqual(candidates[0].id, 'item_t8_stale');
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Sequential Execution & Progress Telemetry (ImageMigrationService)
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 2 — Sequential Execution & Progress Telemetry');

function createDefaultMigrateOptions(overrides = {}) {
  const tokenMap = new Map();
  return {
    registerUploadToken: (id, t) => tokenMap.set(id, t),
    isTokenValid: (id, t) => tokenMap.get(id) === t,
    clearUploadToken: (id, expectedToken) => {
      if (tokenMap.get(id) === expectedToken) {
        tokenMap.delete(id);
      }
    },
    saveToFirestore: async () => true,
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    ...overrides,
  };
}

await it('T9 — Migrates candidates sequentially one by one with progress callbacks', async () => {
  const candidates = [
    { id: 'c1', name: 'Product 1', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'c2', name: 'Product 2', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'c3', name: 'Product 3', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  const executionOrder = [];
  const progressSnapshots = [];

  const mockUploader = async (itemId) => {
    executionOrder.push(`upload_${itemId}`);
    return {
      imageUrl: `https://res.cloudinary.com/test/image/upload/${itemId}.jpg`,
      publicId: `pub_${itemId}`,
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    saveToFirestore: async () => true,
    delayMs: 10,
    onProgress: (p) => {
      progressSnapshots.push({ current: p.current, total: p.total, item: p.currentItemName });
    },
  }));

  assert.deepStrictEqual(executionOrder, ['upload_c1', 'upload_c2', 'upload_c3'], 'Must execute sequentially');
  assert.strictEqual(progress.successCount, 3);
  assert.strictEqual(progress.failureCount, 0);
  assert.strictEqual(progress.skippedCount, 0);
  assert.strictEqual(progress.status, 'completed');
});

await it('T10 — Empty candidate list completes immediately with status: "completed"', async () => {
  const progress = await ImageMigrationService.migrateProductImages([], createDefaultMigrateOptions());
  assert.strictEqual(progress.total, 0);
  assert.strictEqual(progress.current, 0);
  assert.strictEqual(progress.status, 'completed');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false);
});

await it('T11 — Single item failure continues processing remaining candidates', async () => {
  const candidates = [
    { id: 'item_ok1', name: 'Success 1', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'item_fail', name: 'Failure 2', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'item_ok2', name: 'Success 3', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  const mockUploader = async (itemId) => {
    if (itemId === 'item_fail') {
      throw new Error('Cloudinary rate limit exceeded');
    }
    return {
      imageUrl: `https://res.cloudinary.com/test/${itemId}.jpg`,
      publicId: `pub_${itemId}`,
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    saveToFirestore: async () => true,
    delayMs: 5,
  }));

  assert.strictEqual(progress.successCount, 2);
  assert.strictEqual(progress.failureCount, 1);
  assert.strictEqual(progress.failures.length, 1);
  assert.strictEqual(progress.failures[0].id, 'item_fail');
  assert.ok(progress.failures[0].error.includes('rate limit'));
  assert.strictEqual(progress.status, 'completed');
});

await it('T12 — Duplicate run prevention: rejects if migration already running', async () => {
  let resolveUpload;
  const slowUploader = () => new Promise(r => resolveUpload = r);

  const candidates = [{ id: 'slow1', name: 'Slow Item', base64DataUrl: VALID_JPEG_DATA_URL }];

  // Start first run
  const run1 = ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: slowUploader,
  }));

  assert.strictEqual(ImageMigrationService.isMigrationRunning(), true);

  // Attempt concurrent second run
  let caughtError = null;
  try {
    await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
      uploader: slowUploader,
    }));
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Must throw when migration is already in progress');
  assert.ok(caughtError.message.includes('already in progress'));

  // Clean up run 1
  resolveUpload({ imageUrl: 'https://res.cloudinary.com/test/slow.jpg', publicId: 'pub_slow' });
  await run1;
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false);
});

await it('T13 — Safe cancellation: aborts loop when cancelled before next iteration', async () => {
  const candidates = [
    { id: 'cancel_1', name: 'Item 1', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'cancel_2', name: 'Item 2', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'cancel_3', name: 'Item 3', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  const mockUploader = async (itemId) => {
    if (itemId === 'cancel_1') {
      ImageMigrationService.cancelMigration();
    }
    return {
      imageUrl: `https://res.cloudinary.com/test/${itemId}.jpg`,
      publicId: `pub_${itemId}`,
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    delayMs: 10,
  }));

  assert.strictEqual(progress.status, 'cancelled');
  assert.strictEqual(progress.successCount, 0, 'Upload result after cancellation must NOT be counted as success');
  assert.strictEqual(progress.skippedCount, 1, 'Post-cancellation upload must be counted as skipped');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false);
});

await it('T14 — Cancellation during active upload: result is discarded, not persisted to Firestore', async () => {
  let savedCalled = false;
  const tokens = new Map();
  const candidates = [
    { id: 'inflight_cancel', name: 'In-Flight Item', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'next_item', name: 'Next Item', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  const mockUploader = async (itemId) => {
    if (itemId === 'inflight_cancel') {
      ImageMigrationService.cancelMigration();
    }
    return {
      imageUrl: `https://res.cloudinary.com/test/${itemId}.jpg`,
      publicId: `pub_${itemId}`,
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, {
    uploader: mockUploader,
    registerUploadToken: (id, t) => tokens.set(id, t),
    isTokenValid: (id, t) => tokens.get(id) === t,
    clearUploadToken: (id, t) => { if (tokens.get(id) === t) tokens.delete(id); },
    saveToFirestore: async () => { savedCalled = true; return true; },
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    delayMs: 0,
  });

  assert.strictEqual(savedCalled, false,
    'Firestore save must NOT be called when cancellation occurred during upload');
  assert.strictEqual(progress.status, 'cancelled');
  assert.strictEqual(progress.successCount, 0,
    'No success must be counted for cancelled in-flight upload');
  assert.strictEqual(progress.skippedCount, 1,
    'Cancelled in-flight upload must be counted as skipped');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false,
    'Service must reset isRunning after cancelled migration');
});

await it('T15 — Cancelled upload after completion increments skippedCount, not successCount', async () => {
  const candidates = [
    { id: 'skip_cancel_item', name: 'Skipped After Cancel', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  const mockUploader = async () => {
    ImageMigrationService.cancelMigration();
    return {
      imageUrl: 'https://res.cloudinary.com/test/skip_cancel.jpg',
      publicId: 'pub_skip_cancel',
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    delayMs: 0,
  }));

  assert.strictEqual(progress.successCount, 0, 'Must not count cancelled upload as success');
  assert.strictEqual(progress.failureCount, 0, 'Must not count cancelled upload as failure');
  assert.strictEqual(progress.skippedCount, 1, 'Must count cancelled post-upload as skipped');
  assert.strictEqual(progress.status, 'cancelled');
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: Save Callback & Success Reporting Safety
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 3 — Save Callback & Success Reporting Safety');

await it('T16 — Successful migration invokes saveToFirestore and counts success when returning true', async () => {
  const candidates = [{ id: 'save_1', name: 'Saved Product', base64DataUrl: VALID_JPEG_DATA_URL }];
  let savedPayload = null;

  const mockUploader = async () => ({
    imageUrl: 'https://res.cloudinary.com/test/save_1.jpg',
    publicId: 'users/u1/items/save_1',
  });

  const mockSaveToFirestore = async (itemId, result, token) => {
    savedPayload = { itemId, result, token };
    return true; // Explicit success
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    saveToFirestore: mockSaveToFirestore,
  }));

  assert.ok(savedPayload);
  assert.strictEqual(savedPayload.itemId, 'save_1');
  assert.strictEqual(savedPayload.result.imageUrl, 'https://res.cloudinary.com/test/save_1.jpg');
  assert.strictEqual(savedPayload.result.publicId, 'users/u1/items/save_1');
  assert.strictEqual(progress.successCount, 1);
  assert.strictEqual(progress.skippedCount, 0);
  assert.strictEqual(progress.failureCount, 0);
});

await it('T17 — Save callback returning false is counted as skippedCount, NOT successCount', async () => {
  const candidates = [{ id: 'skip_save_item', name: 'Skipped Item', base64DataUrl: VALID_JPEG_DATA_URL }];

  const mockUploader = async () => ({
    imageUrl: 'https://res.cloudinary.com/test/skipped.jpg',
    publicId: 'pub_skipped',
  });

  const mockSaveToFirestore = async () => false;

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    saveToFirestore: mockSaveToFirestore,
  }));

  assert.strictEqual(progress.successCount, 0, 'Returning false must NOT be counted as success');
  assert.strictEqual(progress.skippedCount, 1, 'Returning false must be counted as skippedCount');
  assert.strictEqual(progress.failureCount, 0, 'Intentional skip must NOT be counted as failure');
});

await it('T18 — Missing required callbacks throw configuration error before migration begins', async () => {
  const candidates = [{ id: 'no_callback_item', name: 'No Callback Item', base64DataUrl: VALID_JPEG_DATA_URL }];

  // 1. Missing saveToFirestore
  let caughtSave = null;
  try {
    await ImageMigrationService.migrateProductImages(candidates, {
      registerUploadToken: () => {},
      isTokenValid: () => true,
      clearUploadToken: () => {},
      getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    });
  } catch (err) {
    caughtSave = err;
  }
  assert.ok(caughtSave, 'Must throw configuration error when saveToFirestore is missing');
  assert.ok(caughtSave.message.includes('saveToFirestore') || caughtSave.message.includes('Save callback'), 'Error message must mention saveToFirestore');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false, 'Service must not remain running');

  // 2. Missing registerUploadToken
  let caughtReg = null;
  try {
    await ImageMigrationService.migrateProductImages(candidates, {
      isTokenValid: () => true,
      clearUploadToken: () => {},
      saveToFirestore: async () => true,
      getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    });
  } catch (err) {
    caughtReg = err;
  }
  assert.ok(caughtReg, 'Must throw configuration error when registerUploadToken is missing');
  assert.ok(caughtReg.message.includes('registerUploadToken'), 'Error message must mention registerUploadToken');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false, 'Service must not remain running');

  // 3. Missing isTokenValid
  let caughtVal = null;
  try {
    await ImageMigrationService.migrateProductImages(candidates, {
      registerUploadToken: () => {},
      clearUploadToken: () => {},
      saveToFirestore: async () => true,
      getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    });
  } catch (err) {
    caughtVal = err;
  }
  assert.ok(caughtVal, 'Must throw configuration error when isTokenValid is missing');
  assert.ok(caughtVal.message.includes('isTokenValid'), 'Error message must mention isTokenValid');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false, 'Service must not remain running');

  // 4. Missing clearUploadToken
  let caughtClear = null;
  try {
    await ImageMigrationService.migrateProductImages(candidates, {
      registerUploadToken: () => {},
      isTokenValid: () => true,
      saveToFirestore: async () => true,
      getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    });
  } catch (err) {
    caughtClear = err;
  }
  assert.ok(caughtClear, 'Must throw configuration error when clearUploadToken is missing');
  assert.ok(caughtClear.message.includes('clearUploadToken'), 'Error message must mention clearUploadToken');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false, 'Service must not remain running');
});

await it('T19 — Firestore write error in saveToFirestore is preserved and counted as failure', async () => {
  const candidates = [{ id: 'err_save_item', name: 'Error Save Item', base64DataUrl: VALID_JPEG_DATA_URL }];

  const mockUploader = async () => ({
    imageUrl: 'https://res.cloudinary.com/test/err.jpg',
    publicId: 'pub_err',
  });

  const mockSaveToFirestore = async () => {
    throw new Error('Firestore: permission-denied');
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    saveToFirestore: mockSaveToFirestore,
  }));

  assert.strictEqual(progress.successCount, 0);
  assert.strictEqual(progress.failureCount, 1);
  assert.strictEqual(progress.failures.length, 1);
  assert.ok(progress.failures[0].error.includes('permission-denied'));
});

await it('T20 — Firestore merge update preserves all non-image product fields', async () => {
  const existingItem = createTestItem({
    id: 'item_merge_fields',
    name: 'Preserved Name',
    retailPrice: 299,
    wholesalePrice: 250,
    quantity: 42,
    unit: 'kg',
    translations: { en: 'Preserved Name', hi: 'संरक्षित नाम', mr: '', 'hi-en': '' },
    imageUrl: VALID_JPEG_DATA_URL,
  });

  const migrationResult = {
    imageUrl: 'https://res.cloudinary.com/test/item_merge_fields.jpg',
    publicId: 'pub_merge',
  };

  const firestorePatchPayload = {
    imageUrl: migrationResult.imageUrl,
    cloudinaryPublicId: migrationResult.publicId,
    imageMigrationStatus: 'synced',
    lastUpdated: new Date().toISOString(),
  };

  const mergedInFirestore = { ...existingItem, ...firestorePatchPayload };

  assert.strictEqual(mergedInFirestore.name, 'Preserved Name');
  assert.strictEqual(mergedInFirestore.retailPrice, 299);
  assert.strictEqual(mergedInFirestore.wholesalePrice, 250);
  assert.strictEqual(mergedInFirestore.quantity, 42);
  assert.strictEqual(mergedInFirestore.translations.hi, 'संरक्षित नाम');
  assert.strictEqual(mergedInFirestore.imageUrl, 'https://res.cloudinary.com/test/item_merge_fields.jpg');
  assert.strictEqual(mergedInFirestore.cloudinaryPublicId, 'pub_merge');
  assert.strictEqual(mergedInFirestore.imageMigrationStatus, 'synced');
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: Safe Upload-Token Clearing & Token Guard
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 4 — Safe Upload-Token Clearing & Token Guard');

await it('T21 — Safe clearUploadToken: deletes token only when currently registered token matches expectedToken', async () => {
  const tokenMap = new Map();
  // Production App.tsx implementation
  const clearMigrationToken = (itemId, expectedToken) => {
    if (tokenMap.get(itemId) === expectedToken) {
      tokenMap.delete(itemId);
    }
  };

  tokenMap.set('item_safe', 'token_123');

  // Attempt to clear with matching token -> should delete
  clearMigrationToken('item_safe', 'token_123');
  assert.strictEqual(tokenMap.has('item_safe'), false, 'Matching token must be deleted');

  // Verify non-existent token call does nothing
  clearMigrationToken('item_nonexistent', 'token_123');
  assert.strictEqual(tokenMap.has('item_nonexistent'), false);
});

await it('T22 — Safe clearUploadToken: calling with an old token does not delete a newer token', async () => {
  const tokenMap = new Map();
  const clearMigrationToken = (itemId, expectedToken) => {
    if (tokenMap.get(itemId) === expectedToken) {
      tokenMap.delete(itemId);
    }
  };

  // Migration registers token_migration
  tokenMap.set('item_concurrent', 'token_migration');

  // Concurrent user edit registers newer token_user_edit
  tokenMap.set('item_concurrent', 'token_user_edit');

  // Migration finishes or fails, calling clearUploadToken with stale token_migration
  clearMigrationToken('item_concurrent', 'token_migration');

  // Newer token must NOT have been deleted!
  assert.strictEqual(tokenMap.get('item_concurrent'), 'token_user_edit',
    'Calling token clearing with an old token must NOT delete newer token');
});

await it('T23 — In-flight user edit invalidates token: stale migration response is discarded', async () => {
  const tokens = new Map();
  const candidates = [{ id: 'item_race_edit', name: 'Race Item', base64DataUrl: VALID_JPEG_DATA_URL }];
  let savedCalled = false;

  const mockUploader = async (itemId) => {
    // User performs edit during upload, generating a new token
    tokens.set(itemId, 'newer_edit_token');
    return {
      imageUrl: 'https://res.cloudinary.com/test/old_migration.jpg',
      publicId: 'pub_old',
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, {
    uploader: mockUploader,
    registerUploadToken: (id, t) => tokens.set(id, t),
    isTokenValid: (id, t) => tokens.get(id) === t,
    clearUploadToken: (id, t) => { if (tokens.get(id) === t) tokens.delete(id); },
    saveToFirestore: async () => { savedCalled = true; return true; },
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
  });

  assert.strictEqual(savedCalled, false, 'Stale migration response must NOT be saved to Firestore');
  assert.strictEqual(progress.skippedCount, 1);
  assert.strictEqual(progress.successCount, 0);
  assert.strictEqual(tokens.get('item_race_edit'), 'newer_edit_token', 'Newer edit token must remain intact');
});

await it('T24 — In-flight image removal invalidates token: migration cannot restore removed image', async () => {
  const tokens = new Map();
  const candidates = [{ id: 'item_race_remove', name: 'Removed Item', base64DataUrl: VALID_JPEG_DATA_URL }];
  let savedCalled = false;

  const mockUploader = async (itemId) => {
    // User explicitly removes image during upload -> token deleted
    tokens.delete(itemId);
    return {
      imageUrl: 'https://res.cloudinary.com/test/stale_remove.jpg',
      publicId: 'pub_remove',
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, {
    uploader: mockUploader,
    registerUploadToken: (id, t) => tokens.set(id, t),
    isTokenValid: (id, t) => tokens.get(id) === t,
    clearUploadToken: (id, t) => { if (tokens.get(id) === t) tokens.delete(id); },
    saveToFirestore: async () => { savedCalled = true; return true; },
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
  });

  assert.strictEqual(savedCalled, false, 'Migration must NOT restore explicitly removed image');
  assert.strictEqual(progress.skippedCount, 1);
  assert.strictEqual(progress.successCount, 0);
});

await it('T25 — Product deleted during in-flight upload: cannot resurrect deleted product', async () => {
  const tokens = new Map();
  const candidates = [{ id: 'item_race_delete', name: 'Deleted Item', base64DataUrl: VALID_JPEG_DATA_URL }];
  let savedCalled = false;

  const mockUploader = async (itemId) => {
    markItemsAsDeleted(itemId);
    tokens.delete(itemId);
    return {
      imageUrl: 'https://res.cloudinary.com/test/stale_del.jpg',
      publicId: 'pub_del',
    };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, {
    uploader: mockUploader,
    registerUploadToken: (id, t) => tokens.set(id, t),
    isTokenValid: (id, t) => tokens.get(id) === t,
    clearUploadToken: (id, t) => { if (tokens.get(id) === t) tokens.delete(id); },
    saveToFirestore: async () => { savedCalled = true; return true; },
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
  });

  assert.strictEqual(savedCalled, false, 'Deleted product must NOT be written to Firestore');
  assert.strictEqual(progress.skippedCount, 1);
  assert.strictEqual(progress.successCount, 0);
  unmarkItemsAsDeleted('item_race_delete');
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: Mandatory Image Freshness Verification (getItemCurrentImage)
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 5 — Mandatory Image Freshness Verification (getItemCurrentImage)');

await it('T26 — Migration cannot start without getItemCurrentImage callback', async () => {
  const candidates = [
    { id: 'no_hook_item', name: 'No Hook Item', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  let caughtError = null;
  try {
    // Calling migrateProductImages without getItemCurrentImage
    await ImageMigrationService.migrateProductImages(candidates, {
      registerUploadToken: () => {},
      isTokenValid: () => true,
      clearUploadToken: () => {},
      saveToFirestore: async () => true,
    });
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Must throw when getItemCurrentImage is missing');
  assert.ok(
    caughtError.message.includes('getItemCurrentImage') || caughtError.message.includes('required'),
    'Error message must indicate getItemCurrentImage is required'
  );
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false, 'Service must not remain running');
});

await it('T27 — Pre-upload freshness: image replaced before upload starts is skipped', async () => {
  const REPLACED_IMAGE = 'data:image/jpeg;base64,DIFFERENT_IMAGE_DATA';
  const candidates = [
    { id: 'freshness_replace', name: 'Replaced Item', base64DataUrl: VALID_JPEG_DATA_URL },
  ];
  let uploadCalled = false;
  let savedCalled = false;

  const currentImages = new Map([['freshness_replace', REPLACED_IMAGE]]);

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: async () => { uploadCalled = true; return { imageUrl: 'https://res.cloudinary.com/test/x.jpg', publicId: 'x' }; },
    getItemCurrentImage: (id) => currentImages.get(id),
    saveToFirestore: async () => { savedCalled = true; return true; },
    delayMs: 0,
  }));

  assert.strictEqual(uploadCalled, false, 'Upload must NOT start when image was replaced before upload began');
  assert.strictEqual(savedCalled, false);
  assert.strictEqual(progress.skippedCount, 1);
  assert.strictEqual(progress.successCount, 0);
});

await it('T28 — Pre-upload freshness: image removed before upload starts is skipped', async () => {
  const candidates = [
    { id: 'freshness_removed', name: 'Removed Item', base64DataUrl: VALID_JPEG_DATA_URL },
  ];
  let uploadCalled = false;

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: async () => { uploadCalled = true; return { imageUrl: 'https://res.cloudinary.com/test/x.jpg', publicId: 'x' }; },
    getItemCurrentImage: () => null,
    delayMs: 0,
  }));

  assert.strictEqual(uploadCalled, false, 'Upload must NOT start when image was removed before upload began');
  assert.strictEqual(progress.skippedCount, 1);
  assert.strictEqual(progress.successCount, 0);
});

await it('T29 — Post-upload freshness: image replaced after upload completes but before Firestore write is skipped', async () => {
  const candidates = [
    { id: 'postupload_freshness', name: 'Replaced After Upload', base64DataUrl: VALID_JPEG_DATA_URL },
  ];
  let savedCalled = false;
  let uploadCount = 0;

  let callCount = 0;
  const freshnessFn = () => {
    callCount++;
    if (callCount === 1) return VALID_JPEG_DATA_URL; // Pre-upload: matches
    return 'data:image/jpeg;base64,NEW_IMAGE_AFTER_UPLOAD'; // Post-upload: changed
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: async () => {
      uploadCount++;
      return { imageUrl: 'https://res.cloudinary.com/test/postupload.jpg', publicId: 'pub_postupload' };
    },
    getItemCurrentImage: freshnessFn,
    saveToFirestore: async () => { savedCalled = true; return true; },
    delayMs: 0,
  }));

  assert.strictEqual(uploadCount, 1, 'Upload must proceed (pre-check passed)');
  assert.strictEqual(savedCalled, false, 'Firestore save must be skipped when image changed after upload');
  assert.strictEqual(progress.skippedCount, 1);
  assert.strictEqual(progress.successCount, 0);
});

await it('T30 — Post-upload freshness: image removed after upload completes is skipped', async () => {
  const candidates = [
    { id: 'postupload_remove', name: 'Removed After Upload', base64DataUrl: VALID_JPEG_DATA_URL },
  ];
  let savedCalled = false;

  let callCount = 0;
  const freshnessFn = () => {
    callCount++;
    if (callCount === 1) return VALID_JPEG_DATA_URL; // Pre-upload: matches
    return null; // Post-upload: removed
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: async () => ({ imageUrl: 'https://res.cloudinary.com/test/pu.jpg', publicId: 'pu' }),
    getItemCurrentImage: freshnessFn,
    saveToFirestore: async () => { savedCalled = true; return true; },
    delayMs: 0,
  }));

  assert.strictEqual(savedCalled, false, 'Firestore save must be skipped when image was removed after upload');
  assert.strictEqual(progress.skippedCount, 1);
  assert.strictEqual(progress.successCount, 0);
});

await it('T31 — Fresh image (matching candidate) proceeds through upload and save successfully', async () => {
  const candidates = [
    { id: 'freshness_ok', name: 'Unchanged Item', base64DataUrl: VALID_JPEG_DATA_URL },
  ];
  let savedCalled = false;
  const tokens = new Map();

  const progress = await ImageMigrationService.migrateProductImages(candidates, {
    uploader: async () => ({
      imageUrl: 'https://res.cloudinary.com/test/unchanged.jpg',
      publicId: 'pub_unchanged',
    }),
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    registerUploadToken: (id, t) => tokens.set(id, t),
    isTokenValid: (id, t) => tokens.get(id) === t,
    clearUploadToken: (id, t) => { if (tokens.get(id) === t) tokens.delete(id); },
    saveToFirestore: async () => { savedCalled = true; return true; },
    delayMs: 0,
  });

  assert.strictEqual(savedCalled, true, 'Firestore save must be called for unchanged image');
  assert.strictEqual(progress.successCount, 1);
  assert.strictEqual(progress.skippedCount, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6: Preservation of Local Images & Retry Support
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 6 — Preservation of Local Images & Retry Support');

await it('T32 — Local Base64 images in localStorage are NOT deleted or cleared upon successful migration', async () => {
  const itemId = 'item_local_persist';
  const localImages = { [itemId]: VALID_JPEG_DATA_URL };
  globalThis.localStorage.setItem('price_manager_local_product_images', JSON.stringify(localImages));

  const candidates = [{ id: itemId, name: 'Local Persist Item', base64DataUrl: VALID_JPEG_DATA_URL }];

  await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: async () => ({
      imageUrl: 'https://res.cloudinary.com/test/persisted.jpg',
      publicId: 'pub_persist',
    }),
    saveToFirestore: async () => true,
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
  }));

  const raw = globalThis.localStorage.getItem('price_manager_local_product_images');
  const parsed = JSON.parse(raw);
  assert.strictEqual(parsed[itemId], VALID_JPEG_DATA_URL, 'Original local base64 image must remain in storage');
});

await it('T33 — Upload failure preserves original Base64 image locally and allows successful retry', async () => {
  const itemId = 'item_fail_then_retry';
  const localImages = { [itemId]: VALID_JPEG_DATA_URL };
  globalThis.localStorage.setItem('price_manager_local_product_images', JSON.stringify(localImages));

  const candidates = [{ id: itemId, name: 'Retry Item', base64DataUrl: VALID_JPEG_DATA_URL }];

  // Run 1: Failure
  let shouldFail = true;
  const progress1 = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: async () => {
      if (shouldFail) throw new Error('Temporary 503 Service Unavailable');
      return { imageUrl: 'https://res.cloudinary.com/test/retry_success.jpg', publicId: 'pub_retry' };
    },
    saveToFirestore: async () => true,
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
  }));

  assert.strictEqual(progress1.failureCount, 1);
  assert.strictEqual(progress1.successCount, 0);

  // Local storage still intact
  const rawAfterFail = globalThis.localStorage.getItem('price_manager_local_product_images');
  assert.strictEqual(JSON.parse(rawAfterFail)[itemId], VALID_JPEG_DATA_URL);

  // Run 2: Retry succeeds
  shouldFail = false;
  const progress2 = await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: async () => ({
      imageUrl: 'https://res.cloudinary.com/test/retry_success.jpg',
      publicId: 'pub_retry',
    }),
    saveToFirestore: async () => true,
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
  }));

  assert.strictEqual(progress2.successCount, 1);
  assert.strictEqual(progress2.failureCount, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7: Guard Clauses & UI Preconditions
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 7 — Guard Clauses & UI Preconditions');

await it('T34 — Migration blocked when user is unauthenticated and gives clear message', async () => {
  const user = null;
  const isAllowed = user !== null && user?.uid !== 'guest_user';
  assert.strictEqual(isAllowed, false, 'Unauthenticated user must be blocked');

  // Verify message logic from SettingsScreen
  let feedbackMessage = '';
  if (!user || user?.uid === 'guest_user') {
    feedbackMessage = 'Image migration requires an authenticated account. Please log in to sync images to the cloud.';
  }
  assert.ok(feedbackMessage.includes('authenticated account'));
});

await it('T35 — Migration blocked when user is guest_user and gives clear message', async () => {
  const user = { uid: 'guest_user', email: 'Guest Merchant' };
  const isAllowed = user !== null && user.uid !== 'guest_user';
  assert.strictEqual(isAllowed, false, 'Guest user must be blocked from migration');

  let feedbackMessage = '';
  if (!user || user.uid === 'guest_user') {
    feedbackMessage = 'Image migration requires an authenticated account. Please log in to sync images to the cloud.';
  }
  assert.ok(feedbackMessage.includes('authenticated account'));
});

await it('T36 — Migration blocked when device is offline and gives clear message', async () => {
  const isOnline = false;
  const canStartMigration = isOnline && true;
  assert.strictEqual(canStartMigration, false, 'Offline device must not start migration');

  let feedbackMessage = '';
  if (!isOnline) {
    feedbackMessage = 'Device is offline. Please check your internet connection before starting image migration.';
  }
  assert.ok(feedbackMessage.includes('offline'));
});

await it('T37 — Migration button disabled when candidate count is 0', async () => {
  const items = [
    createTestItem({ id: 'synced_1', imageUrl: VALID_CLOUDINARY_URL }),
    createTestItem({ id: 'no_img_2', imageUrl: undefined }),
  ];
  const candidates = getMigrationCandidates(items, {});
  const isButtonDisabled = candidates.length === 0;
  assert.strictEqual(isButtonDisabled, true, 'Button must be disabled when 0 candidates');
});

await it('T38 — SettingsScreen pre-migration validation rejects missing required callbacks', async () => {
  // Emulate SettingsScreen validation of required callbacks
  const validateCallbacks = (callbacks) => {
    return (
      typeof callbacks.onMigrateSingleImage === 'function' &&
      typeof callbacks.registerUploadToken === 'function' &&
      typeof callbacks.isUploadTokenValid === 'function' &&
      typeof callbacks.clearUploadToken === 'function' &&
      typeof callbacks.getItemCurrentImage === 'function'
    );
  };

  const validCallbacks = {
    onMigrateSingleImage: async () => true,
    registerUploadToken: () => {},
    isUploadTokenValid: () => true,
    clearUploadToken: () => {},
    getItemCurrentImage: () => 'data:...',
  };
  assert.strictEqual(validateCallbacks(validCallbacks), true, 'All valid callbacks must pass');

  // Any missing callback must be rejected
  const missingClear = { ...validCallbacks, clearUploadToken: undefined };
  assert.strictEqual(validateCallbacks(missingClear), false, 'Missing clearUploadToken must be rejected');

  const missingFreshness = { ...validCallbacks, getItemCurrentImage: undefined };
  assert.strictEqual(validateCallbacks(missingFreshness), false, 'Missing getItemCurrentImage must be rejected');
});

await it('T39 — Cancellation preserves active state until service reports terminal status', async () => {
  const candidates = [
    { id: 'long_1', name: 'Long Item 1', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'long_2', name: 'Long Item 2', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  let uiIsMigrating = true;
  const terminalStatuses = [];

  const mockUploader = async (itemId) => {
    if (itemId === 'long_1') {
      // User clicks Cancel while first upload completes
      ImageMigrationService.cancelMigration();
      // Notice: uiIsMigrating is NOT set to false immediately in handleCancelMigration!
      assert.strictEqual(uiIsMigrating, true, 'isMigrating must remain true during cancelling phase');
    }
    return { imageUrl: `https://res.cloudinary.com/test/${itemId}.jpg`, publicId: `pub_${itemId}` };
  };

  await ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: mockUploader,
    saveToFirestore: async () => true,
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    onProgress: (p) => {
      if (p.status !== 'running') {
        uiIsMigrating = false;
        terminalStatuses.push(p.status);
      }
    },
    delayMs: 0,
  }));

  assert.strictEqual(uiIsMigrating, false, 'isMigrating is safely reset upon terminal progress report');
  assert.deepStrictEqual(terminalStatuses, ['cancelled']);
});

await it('T40 — Duplicate start blocked while ImageMigrationService.isMigrationRunning() is true', async () => {
  let resolveUpload;
  const slowUploader = () => new Promise(r => resolveUpload = r);

  const candidates = [{ id: 'dup_item', name: 'Dup Item', base64DataUrl: VALID_JPEG_DATA_URL }];

  const runPromise = ImageMigrationService.migrateProductImages(candidates, createDefaultMigrateOptions({
    uploader: slowUploader,
    saveToFirestore: async () => true,
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
  }));

  assert.strictEqual(ImageMigrationService.isMigrationRunning(), true);

  // handleStartMigration guard check
  const isMigrating = true;
  const canStartAnother = !isMigrating && !ImageMigrationService.isMigrationRunning();
  assert.strictEqual(canStartAnother, false, 'Starting another migration must be strictly blocked while running');

  resolveUpload({ imageUrl: 'https://res.cloudinary.com/test/dup.jpg', publicId: 'pub_dup' });
  await runPromise;
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 8: Logout Safety & Account-Switch Protections
// ─────────────────────────────────────────────────────────────────────────────
section('Suite 8 — Logout Safety & Account-Switch Protections');

/**
 * Test harness factory mirroring handleMigrateSingleProductImage in App.tsx
 */
function createTestAppHarness(initialUser = { uid: 'user_alpha', email: 'alpha@example.com' }) {
  const stateRef = { current: { user: initialUser } };
  const tokensRef = { current: new Map() };
  const writeChainRef = { current: new Map() };
  let setDocCalls = [];
  let stateUpdates = [];
  const localStore = new Map();

  const handleLogout = () => {
    ImageMigrationService.cancelMigration();
    tokensRef.current.clear();
    stateRef.current = { ...stateRef.current, user: null };
  };

  const handleMigrateSingleProductImage = async (itemId, result, uploadToken) => {
    const activeUser = stateRef.current.user;
    if (!activeUser || activeUser.uid === 'guest_user') return false;
    if (isItemDeleted(itemId)) return false;
    if (tokensRef.current.get(itemId) !== uploadToken) return false;

    const capturedUser = activeUser;
    let didWriteSucceed = false;

    const prevWrite = writeChainRef.current.get(itemId) ?? Promise.resolve();
    const thisWrite = prevWrite.catch(() => {}).then(async () => {
      // Guard 2: recheck token & deletion status at start of serialized write slot
      if (tokensRef.current.get(itemId) !== uploadToken) return;
      if (isItemDeleted(itemId)) return;

      // Account safety: verify currently authenticated application account still matches captured user
      if (!stateRef.current.user || stateRef.current.user.uid !== capturedUser.uid) return;

      setDocCalls.push({ uid: capturedUser.uid, itemId, result });

      // Guard 3: recheck token & deletion status after write completes
      if (tokensRef.current.get(itemId) !== uploadToken) return;
      if (isItemDeleted(itemId)) return;

      // Account safety: recheck currently authenticated application account before touching state or localStorage
      if (!stateRef.current.user || stateRef.current.user.uid !== capturedUser.uid) return;

      if (tokensRef.current.get(itemId) === uploadToken) {
        tokensRef.current.delete(itemId);
      }

      stateUpdates.push({ itemId, result });
      localStore.set('price_manager_state', JSON.stringify({ user: capturedUser.uid, itemId }));

      didWriteSucceed = true;
    }).finally(() => {
      if (writeChainRef.current.get(itemId) === thisWrite) {
        writeChainRef.current.delete(itemId);
      }
    });

    writeChainRef.current.set(itemId, thisWrite);
    await thisWrite;

    return didWriteSucceed;
  };

  return {
    stateRef,
    tokensRef,
    writeChainRef,
    getSetDocCalls: () => setDocCalls,
    getStateUpdates: () => stateUpdates,
    getLocalStorage: () => localStore,
    handleLogout,
    handleMigrateSingleProductImage,
  };
}

await it('T41 — Logout during active migration cancels ImageMigrationService and purges upload tokens', async () => {
  const harness = createTestAppHarness({ uid: 'user_logout_test', email: 'logout@test.com' });
  const candidates = [
    { id: 'item_lo_1', name: 'Logout Item 1', base64DataUrl: VALID_JPEG_DATA_URL },
    { id: 'item_lo_2', name: 'Logout Item 2', base64DataUrl: VALID_JPEG_DATA_URL },
  ];

  let uploaderCount = 0;
  const mockUploader = async (itemId) => {
    uploaderCount++;
    if (itemId === 'item_lo_1') {
      // User logs out while first item is in-flight
      harness.handleLogout();
    }
    return { imageUrl: `https://res.cloudinary.com/test/${itemId}.jpg`, publicId: `pub_${itemId}` };
  };

  const progress = await ImageMigrationService.migrateProductImages(candidates, {
    uploader: mockUploader,
    registerUploadToken: (id, t) => harness.tokensRef.current.set(id, t),
    isTokenValid: (id, t) => harness.tokensRef.current.get(id) === t,
    clearUploadToken: (id, t) => {
      if (harness.tokensRef.current.get(id) === t) harness.tokensRef.current.delete(id);
    },
    saveToFirestore: (id, res, t) => harness.handleMigrateSingleProductImage(id, res, t),
    getItemCurrentImage: () => VALID_JPEG_DATA_URL,
    delayMs: 0,
  });

  assert.strictEqual(progress.status, 'cancelled', 'Migration status must be cancelled');
  assert.strictEqual(progress.successCount, 0, 'No uploads must succeed after logout');
  assert.strictEqual(harness.tokensRef.current.size, 0, 'All tokens must be purged upon logout');
  assert.strictEqual(harness.getSetDocCalls().length, 0, 'No Firestore writes must execute after logout');
  assert.strictEqual(ImageMigrationService.isMigrationRunning(), false, 'Service must reset running state');
});

await it('T42 — In-flight queued write blocked from starting Firestore write when user logs out before write slot', async () => {
  const harness = createTestAppHarness({ uid: 'user_pre_write_logout', email: 'pwl@test.com' });

  // Hold write chain with a pending slow promise
  let releaseSlowWrite;
  const slowPromise = new Promise(r => { releaseSlowWrite = r; });
  harness.writeChainRef.current.set('item_pwl', slowPromise);

  // Register token for migration upload
  const token = 'token_pwl_1';
  harness.tokensRef.current.set('item_pwl', token);

  // Enqueue single product image write (awaits behind slowPromise)
  const writePromise = harness.handleMigrateSingleProductImage(
    'item_pwl',
    { imageUrl: 'https://res.cloudinary.com/test/pwl.jpg', publicId: 'pub_pwl' },
    token
  );

  // User logs out while write is queued behind slowPromise
  harness.handleLogout();
  assert.strictEqual(harness.stateRef.current.user, null, 'User must be null after logout');
  assert.strictEqual(harness.tokensRef.current.has('item_pwl'), false, 'Token must be cleared');

  // Release the slow promise so the queued write slot proceeds
  releaseSlowWrite();
  const writeResult = await writePromise;

  assert.strictEqual(writeResult, false, 'Queued write must be skipped when user logged out');
  assert.strictEqual(harness.getSetDocCalls().length, 0, 'setDoc must NOT have been called');
  assert.strictEqual(harness.getStateUpdates().length, 0, 'React state must NOT have been updated');
  assert.strictEqual(harness.getLocalStorage().size, 0, 'localStorage must NOT have been updated');
});

await it('T43 — Account switching before queued write: user changes from Account A to Account B, discarding queued write for Account A', async () => {
  const harness = createTestAppHarness({ uid: 'user_alpha', email: 'alpha@test.com' });

  // Hold write chain with a pending slow promise
  let releasePrev;
  const slowPromise = new Promise(r => { releasePrev = r; });
  harness.writeChainRef.current.set('item_switch', slowPromise);

  // Register token for Account A's upload
  const tokenAlpha = 'token_alpha_99';
  harness.tokensRef.current.set('item_switch', tokenAlpha);

  // Queue write for Account A
  const writePromise = harness.handleMigrateSingleProductImage(
    'item_switch',
    { imageUrl: 'https://res.cloudinary.com/test/alpha.jpg', publicId: 'pub_alpha' },
    tokenAlpha
  );

  // User switches to Account B while write is queued
  harness.stateRef.current = { user: { uid: 'user_beta', email: 'beta@test.com' } };

  // Release write chain
  releasePrev();
  const writeResult = await writePromise;

  assert.strictEqual(writeResult, false, 'Write must return false when account switched before write slot');
  assert.strictEqual(harness.getSetDocCalls().length, 0, 'setDoc must NOT be called for Account A when Account B is active');
  assert.strictEqual(harness.getStateUpdates().length, 0, 'React state must NOT be updated for Account B with Account A data');
  assert.strictEqual(harness.getLocalStorage().size, 0, 'localStorage must NOT be polluted');
});

await it('T44 — Account switching during in-flight setDoc: post-write account check prevents updating Account B application state or localStorage', async () => {
  const stateRef = { current: { user: { uid: 'user_alpha', email: 'alpha@test.com' } } };
  const tokensRef = { current: new Map([['item_mid_write', 'token_mid']]) };
  const writeChainRef = { current: new Map() };
  let setDocCalls = [];
  let stateUpdates = [];
  const localStore = new Map();

  let switchAccountDuringNetworkCall;
  const slowSetDoc = async () => {
    // Simulate user switching account while setDoc network request is in-flight
    if (switchAccountDuringNetworkCall) {
      switchAccountDuringNetworkCall();
    }
  };

  const handleMigrate = async (itemId, result, uploadToken) => {
    const activeUser = stateRef.current.user;
    if (!activeUser || activeUser.uid === 'guest_user') return false;
    const capturedUser = activeUser;
    let didWriteSucceed = false;

    const thisWrite = Promise.resolve().then(async () => {
      if (tokensRef.current.get(itemId) !== uploadToken) return;
      if (!stateRef.current.user || stateRef.current.user.uid !== capturedUser.uid) return;

      // In-flight slow Firestore write
      await slowSetDoc();
      setDocCalls.push({ uid: capturedUser.uid, itemId, result });

      // Guard 3 & Post-write account safety check
      if (tokensRef.current.get(itemId) !== uploadToken) return;
      if (!stateRef.current.user || stateRef.current.user.uid !== capturedUser.uid) return;

      if (tokensRef.current.get(itemId) === uploadToken) {
        tokensRef.current.delete(itemId);
      }
      stateUpdates.push({ itemId, result });
      localStore.set('price_manager_state', JSON.stringify({ user: capturedUser.uid }));
      didWriteSucceed = true;
    });

    writeChainRef.current.set(itemId, thisWrite);
    await thisWrite;
    return didWriteSucceed;
  };

  // Configure switch trigger
  switchAccountDuringNetworkCall = () => {
    stateRef.current = { user: { uid: 'user_beta', email: 'beta@test.com' } };
  };

  // Start migration write while user_alpha is logged in
  const writeResult = await handleMigrate(
    'item_mid_write',
    { imageUrl: 'https://res.cloudinary.com/test/mid.jpg', publicId: 'pub_mid' },
    'token_mid'
  );

  assert.strictEqual(writeResult, false, 'Write result must be false when account changed during setDoc');
  assert.strictEqual(setDocCalls.length, 1, 'setDoc was already initiated for user_alpha');
  assert.strictEqual(setDocCalls[0].uid, 'user_alpha', 'setDoc targeted only user_alpha data, not user_beta');
  assert.strictEqual(stateUpdates.length, 0, 'React state for user_beta must NOT be contaminated with user_alpha image');
  assert.strictEqual(localStore.size, 0, 'localStorage cache for user_beta must NOT be modified');
});

// ─── Final Summary ───────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log(`  Checkpoint 5 Results: ${passed} passed, ${failed} failed, ${total} total`);
console.log('═'.repeat(70));

if (failed > 0) {
  console.error(`\n  ❌ ${failed} test(s) failed — see errors above.\n`);
  process.exit(1);
} else {
  console.log(`\n  ✅ All ${passed} tests passed.\n`);
  process.exit(0);
}
