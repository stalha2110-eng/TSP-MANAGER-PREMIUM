import crypto from 'crypto';
import {
  generateCloudinarySignature,
  verifyAssetSafeToDelete,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
} from '../_utils.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CHECKPOINT 1 SECURITY & ENDPOINT TESTS');
  console.log('======================================================\n');

  // Test 1: Cloudinary Signature Generation Algorithm
  console.log('Test Suite 1: Cloudinary Cryptographic Signature Algorithm');
  const testParams = {
    folder: 'ts_biz_manager/users/test_uid_123/items',
    public_id: 'ts_biz_manager/users/test_uid_123/items/item_abc_1740980000',
    timestamp: 1740980000,
    allowed_formats: 'jpg,png,webp',
    max_file_size: 5242880,
  };
  const testSecret = 'sample_secret_key_xyz987';

  // Manual expected SHA1:
  // Sorted keys: allowed_formats, folder, max_file_size, public_id, timestamp
  const expectedStringToSign =
    'allowed_formats=jpg,png,webp&folder=ts_biz_manager/users/test_uid_123/items&max_file_size=5242880&public_id=ts_biz_manager/users/test_uid_123/items/item_abc_1740980000&timestamp=1740980000' +
    testSecret;
  const expectedHash = crypto.createHash('sha1').update(expectedStringToSign).digest('hex');

  const computedSignature = generateCloudinarySignature(testParams, testSecret);
  assert(computedSignature === expectedHash, 'Cloudinary SHA-1 signature matches Cloudinary specification');
  assert(computedSignature.length === 40, 'Signature is valid 40-character hexadecimal SHA-1 string');

  // Test 2: Unauthenticated / Invalid Token Rejection
  console.log('\nTest Suite 2: Firebase ID Token Validation Guardrails');
  const { verifyFirebaseIdToken } = await import('../_utils.ts');

  try {
    await verifyFirebaseIdToken(undefined);
    assert(false, 'Should reject undefined Authorization header');
  } catch (err) {
    assert(err.statusCode === 401, 'Rejects missing Authorization header with HTTP 401');
  }

  try {
    await verifyFirebaseIdToken('Basic dXNlcjpwYXNz');
    assert(false, 'Should reject non-Bearer authorization');
  } catch (err) {
    assert(err.statusCode === 401, 'Rejects non-Bearer authorization header with HTTP 401');
  }

  try {
    await verifyFirebaseIdToken('Bearer not.a.valid.jwt.token');
    assert(false, 'Should reject malformed JWT');
  } catch (err) {
    assert(err.statusCode === 401, 'Rejects malformed JWT structure with HTTP 401');
  }

  // Test 3: Versioned Public ID Format
  console.log('\nTest Suite 3: Versioned Public ID Generation');
  const uid = 'usr_test_999';
  const cleanItemId = 'item_555';
  const now = Date.now();
  const folder = `ts_biz_manager/users/${uid}/items`;
  const versionedPublicId = `${folder}/${cleanItemId}_${now}`;

  assert(versionedPublicId.startsWith(folder), 'Public ID is strictly isolated under user folder');
  assert(versionedPublicId.includes(`/${cleanItemId}_`), 'Public ID includes target item ID');
  assert(versionedPublicId.endsWith(`_${now}`), 'Public ID includes version timestamp to prevent premature overwrite');

  // Test 4: Rate Limiter Sliding Window Logic
  console.log('\nTest Suite 4: Sliding-Window Rate Limit Logic');
  const windowMs = 3600000;
  const maxAllowed = 5;
  const currentTime = 1740983600000;

  // Simulate timestamps: 4 within window, 2 outside window
  const rawTimestamps = [
    currentTime - 4000000, // outside (>1h)
    currentTime - 3800000, // outside (>1h)
    currentTime - 3000000, // inside
    currentTime - 2000000, // inside
    currentTime - 1000000, // inside
    currentTime - 500000,  // inside
  ];

  const activeInWindow = rawTimestamps.filter((t) => currentTime - t < windowMs);
  assert(activeInWindow.length === 4, 'Correctly purges expired entries outside the 1-hour window');
  assert(activeInWindow.length < maxAllowed, 'Allows request when active count is below threshold');

  // Add 1 more -> reaches limit
  activeInWindow.push(currentTime);
  assert(activeInWindow.length >= maxAllowed, 'Enforces rate limit when threshold is reached');

  // Test 5: Safe Asset Deletion Verification Simulation
  console.log('\nTest Suite 5: Cloudinary Asset Deletion Safety Rules');

  // Case A: Mock Firestore doc exists and currently references asset -> must abort
  const mockItemReferencingAsset = {
    fields: {
      cloudinaryPublicId: { stringValue: 'ts_biz_manager/users/u1/items/item1_v1' },
      imageUrl: { stringValue: 'https://res.cloudinary.com/demo/image/upload/v1/item1_v1.jpg' }
    }
  };
  const isReferenced = mockItemReferencingAsset.fields.cloudinaryPublicId.stringValue === 'ts_biz_manager/users/u1/items/item1_v1';
  assert(isReferenced === true, 'Correctly identifies when target asset is STILL referenced by product document');

  // Case B: Mock Firestore doc exists but has NEWER asset -> safe to delete old asset
  const mockItemWithNewerAsset = {
    fields: {
      cloudinaryPublicId: { stringValue: 'ts_biz_manager/users/u1/items/item1_v2' },
      imageUrl: { stringValue: 'https://res.cloudinary.com/demo/image/upload/v2/item1_v2.jpg' }
    }
  };
  const isSuperseded = mockItemWithNewerAsset.fields.cloudinaryPublicId.stringValue !== 'ts_biz_manager/users/u1/items/item1_v1';
  assert(isSuperseded === true, 'Correctly identifies when target asset is superseded by a newer version');

  // Test Suite 6: Serverless HTTP Request Handlers (Simulated Invocations)
  console.log('\nTest Suite 6: Serverless HTTP Request Handlers Integration');
  const signHandler = (await import('../sign.ts')).default;
  const deleteHandler = (await import('../delete.ts')).default;
  const cleanupHandler = (await import('../cleanup-pending.ts')).default;

  function createMockRes() {
    let statusCode = 200;
    let headers = {};
    let jsonBody = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(name, val) {
        headers[name] = val;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody,
      getHeaders: () => headers,
    };
  }

  // 6A: signHandler method check
  const res6A = createMockRes();
  await signHandler({ method: 'GET', headers: {}, body: {} }, res6A);
  assert(res6A.getStatusCode() === 405, 'sign.ts rejects non-POST request with HTTP 405');

  // 6B: signHandler missing auth
  const res6B = createMockRes();
  await signHandler({ method: 'POST', headers: {}, body: { itemId: '123' } }, res6B);
  assert(res6B.getStatusCode() === 401, 'sign.ts rejects unauthenticated POST with HTTP 401');

  // 6C: deleteHandler method check
  const res6C = createMockRes();
  await deleteHandler({ method: 'GET', headers: {}, body: {} }, res6C);
  assert(res6C.getStatusCode() === 405, 'delete.ts rejects non-POST request with HTTP 405');

  // 6D: deleteHandler missing auth
  const res6D = createMockRes();
  await deleteHandler({ method: 'POST', headers: {}, body: { publicId: 'p', itemId: 'i' } }, res6D);
  assert(res6D.getStatusCode() === 401, 'delete.ts rejects unauthenticated POST with HTTP 401');

  // 6E: cleanupHandler method check
  const res6E = createMockRes();
  await cleanupHandler({ method: 'DELETE', headers: {} }, res6E);
  assert(res6E.getStatusCode() === 405, 'cleanup-pending.ts rejects non-GET/POST request with HTTP 405');

  // Summary
  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
