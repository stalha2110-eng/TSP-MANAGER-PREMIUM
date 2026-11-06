/**
 * Test Suite: Checkpoint 3 - Cloudinary Upload Service
 * Standalone runner: zero external dependencies, uses native Node.js and local tsx.
 * 
 * DIRECTLY EXECUTES PRODUCTION IMPLEMENTATION:
 * - src/services/cloudinaryService.ts
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import assert from 'node:assert';

// Environment polyfill for Node runtime
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// Bootstrap execution through local tsx for TypeScript resolution
if (!process.env.__CHECKPOINT3_RUNNER__) {
  const tsxPath = './node_modules/tsx/dist/cli.mjs';
  const selfPath = fileURLToPath(import.meta.url);
  const res = spawnSync(process.execPath, [tsxPath, selfPath], {
    stdio: 'inherit',
    env: { ...process.env, __CHECKPOINT3_RUNNER__: '1' },
  });
  process.exit(res.status ?? 0);
}

const {
  CloudinaryService,
  uploadProductImage,
  prepareAndValidateImage,
  base64ToUint8Array,
} = await import('./src/services/cloudinaryService.ts');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     ${err.message || err}`);
    failedTests++;
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     ${err.message || err}`);
    failedTests++;
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING CHECKPOINT 3 CLOUDINARY UPLOAD SERVICE TESTS');
console.log('   Testing production CloudinaryService implementation');
console.log('======================================================\n');

// Sample valid magic byte buffers
const validJpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
const validPngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
const validWebpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

function bytesToBase64DataUrl(bytes, mimeType) {
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
  return `data:${mimeType};base64,${Buffer.from(binary, 'binary').toString('base64')}`;
}

const validJpegDataUrl = bytesToBase64DataUrl(validJpegBytes, 'image/jpeg');
const validPngDataUrl = bytesToBase64DataUrl(validPngBytes, 'image/png');
const validWebpDataUrl = bytesToBase64DataUrl(validWebpBytes, 'image/webp');

// -----------------------------------------------------------------------------
// Test Suite 1: Image Preparation & Validation
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Image Preparation & Format Validation');

await itAsync('prepareAndValidateImage accepts authentic JPEG Base64 Data URL', async () => {
  const res = await prepareAndValidateImage(validJpegDataUrl);
  assert.strictEqual(res.format, 'jpeg');
  assert.ok(res.blob instanceof Blob);
});

await itAsync('prepareAndValidateImage accepts authentic PNG Base64 Data URL', async () => {
  const res = await prepareAndValidateImage(validPngDataUrl);
  assert.strictEqual(res.format, 'png');
  assert.ok(res.blob instanceof Blob);
});

await itAsync('prepareAndValidateImage accepts authentic WebP Base64 Data URL', async () => {
  const res = await prepareAndValidateImage(validWebpDataUrl);
  assert.strictEqual(res.format, 'webp');
  assert.ok(res.blob instanceof Blob);
});

await itAsync('prepareAndValidateImage accepts authentic File/Blob instance', async () => {
  const file = new File([validJpegBytes], 'photo.jpg', { type: 'image/jpeg' });
  const res = await prepareAndValidateImage(file);
  assert.strictEqual(res.format, 'jpeg');
  assert.ok(res.blob instanceof Blob);
});

await itAsync('prepareAndValidateImage rejects empty/null input', async () => {
  await assert.rejects(
    async () => prepareAndValidateImage(null),
    /No image file or data provided/
  );
  await assert.rejects(
    async () => prepareAndValidateImage(''),
    /No image file or data provided/
  );
});

await itAsync('prepareAndValidateImage rejects non-Data-URL string', async () => {
  await assert.rejects(
    async () => prepareAndValidateImage('https://example.com/photo.jpg'),
    /must be a valid Data URL/
  );
});

await itAsync('prepareAndValidateImage rejects Base64 Data URL with missing comma', async () => {
  await assert.rejects(
    async () => prepareAndValidateImage('data:image/jpeg;base64nocomma'),
    /missing comma separator/
  );
});

await itAsync('prepareAndValidateImage rejects corrupted / text disguised as image', async () => {
  const textBytes = new TextEncoder().encode('Hello, this is not an image');
  const fakeDataUrl = bytesToBase64DataUrl(textBytes, 'image/jpeg');
  await assert.rejects(
    async () => prepareAndValidateImage(fakeDataUrl),
    /Unsupported image format or invalid image header/
  );
});

await itAsync('prepareAndValidateImage rejects 0-byte image file', async () => {
  const emptyBlob = new Blob([], { type: 'image/png' });
  await assert.rejects(
    async () => prepareAndValidateImage(emptyBlob),
    /empty \(0 bytes\)/
  );
});

await itAsync('prepareAndValidateImage rejects file exceeding 5MB size limit', async () => {
  const fiveMbPlus = 5 * 1024 * 1024 + 1024;
  const oversizedBlob = new Blob([new Uint8Array(100), new ArrayBuffer(fiveMbPlus - 100)], { type: 'image/png' });
  await assert.rejects(
    async () => prepareAndValidateImage(oversizedBlob),
    /exceeds maximum allowed size of 5.0MB/
  );
});

// -----------------------------------------------------------------------------
// Test Suite 2: itemId Validation
// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: itemId Validation');

await itAsync('Rejects missing or empty itemId', async () => {
  await assert.rejects(
    async () => uploadProductImage('', validJpegDataUrl, { idToken: 'valid_token' }),
    /Valid itemId is required/
  );
  await assert.rejects(
    async () => uploadProductImage('   ', validJpegDataUrl, { idToken: 'valid_token' }),
    /Valid itemId is required/
  );
});

await itAsync('Rejects itemId with no alphanumeric characters', async () => {
  await assert.rejects(
    async () => uploadProductImage('!@#$%^&*()', validJpegDataUrl, { idToken: 'valid_token' }),
    /no valid alphanumeric characters/
  );
});

// -----------------------------------------------------------------------------
// Test Suite 3: Authentication Guardrails
// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: Authentication Guardrails');

await itAsync('Rejects upload when no user is signed in and no idToken provided', async () => {
  // Ensure currentUser is null by passing no token
  await assert.rejects(
    async () => uploadProductImage('item_1', validJpegDataUrl),
    /Authentication required/
  );
});

await itAsync('Rejects upload when backend signature endpoint returns HTTP 401', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/cloudinary/sign')) {
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Missing or malformed Authorization header. Expected Bearer token.' }),
      };
    }
    throw new Error('Unexpected URL');
  };

  await assert.rejects(
    async () =>
      uploadProductImage('item_1', validJpegDataUrl, {
        idToken: 'invalid_token',
        customFetch: mockFetch,
      }),
    /Missing or malformed Authorization header/
  );
});

// -----------------------------------------------------------------------------
// Test Suite 4: Backend Sign Endpoint Integration & Error Handling
// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: Backend Sign Endpoint Integration');

await itAsync('Handles network failure reaching backend sign endpoint', async () => {
  const mockFetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  await assert.rejects(
    async () =>
      uploadProductImage('item_1', validJpegDataUrl, {
        idToken: 'valid_token',
        customFetch: mockFetch,
      }),
    /Network error requesting upload authorization/
  );
});

await itAsync('Handles HTTP 429 Rate Limit Exceeded from backend sign endpoint', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/cloudinary/sign')) {
      return {
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Hourly upload limit reached. Please retry in 45 minute(s).',
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('item_1', validJpegDataUrl, {
        idToken: 'valid_token',
        customFetch: mockFetch,
      }),
    /Hourly upload limit reached/
  );
});

await itAsync('Handles HTTP 500 error from backend sign endpoint', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/cloudinary/sign')) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Cloudinary server configuration missing.' }),
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('item_1', validJpegDataUrl, {
        idToken: 'valid_token',
        customFetch: mockFetch,
      }),
    /Cloudinary server configuration missing/
  );
});

await itAsync('Handles malformed JSON from backend sign endpoint', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/cloudinary/sign')) {
      return {
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('item_1', validJpegDataUrl, {
        idToken: 'valid_token',
        customFetch: mockFetch,
      }),
    /Malformed JSON response from upload authorization service/
  );
});

await itAsync('Rejects incomplete signature authorization payload (missing signature / publicId)', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/cloudinary/sign')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, timestamp: 12345 }), // Missing signature, apiKey, etc.
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('item_1', validJpegDataUrl, {
        idToken: 'valid_token',
        customFetch: mockFetch,
      }),
    /Incomplete signature authorization payload returned by server/
  );
});

// -----------------------------------------------------------------------------
// Test Suite 5: Direct Cloudinary Upload & Contract Verification
// -----------------------------------------------------------------------------
console.log('\nTest Suite 5: Direct Cloudinary Upload');

await itAsync('Successfully uploads valid JPEG Data URL and validates parameters', async () => {
  let signHeadersChecked = false;
  let signBodyChecked = false;
  let cloudinaryUrlChecked = false;
  let cloudinaryFormDataChecked = false;

  const mockSignData = {
    success: true,
    signature: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    timestamp: 1700000000,
    apiKey: '123456789012345',
    cloudName: 'demo-cloud',
    publicId: 'ts_biz_manager/users/u123/items/prod_1_1700000000',
    folder: 'ts_biz_manager/users/u123/items',
    rateLimit: { remaining: 119 },
  };

  const mockCloudinaryResult = {
    secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/ts_biz_manager/users/u123/items/prod_1_1700000000.jpg',
    public_id: 'ts_biz_manager/users/u123/items/prod_1_1700000000',
    format: 'jpg',
    bytes: 12345,
    width: 400,
    height: 400,
  };

  const mockFetch = async (url, options) => {
    if (url === '/api/cloudinary/sign') {
      assert.strictEqual(options.headers.Authorization, 'Bearer my_test_token');
      assert.strictEqual(options.headers['Content-Type'], 'application/json');
      signHeadersChecked = true;

      const body = JSON.parse(options.body);
      assert.strictEqual(body.itemId, 'prod_1');
      signBodyChecked = true;

      return {
        ok: true,
        status: 200,
        json: async () => mockSignData,
      };
    }

    if (url === 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload') {
      cloudinaryUrlChecked = true;
      assert.ok(options.body instanceof FormData);

      const fd = options.body;
      assert.strictEqual(fd.get('api_key'), '123456789012345');
      assert.strictEqual(fd.get('timestamp'), '1700000000');
      assert.strictEqual(fd.get('signature'), 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
      assert.strictEqual(fd.get('public_id'), 'ts_biz_manager/users/u123/items/prod_1_1700000000');
      assert.strictEqual(fd.get('folder'), 'ts_biz_manager/users/u123/items');
      assert.strictEqual(fd.get('allowed_formats'), 'jpg,png,webp');
      assert.strictEqual(fd.get('max_file_size'), '5242880');
      assert.ok(fd.get('file') instanceof Blob);
      cloudinaryFormDataChecked = true;

      return {
        ok: true,
        status: 200,
        json: async () => mockCloudinaryResult,
      };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await uploadProductImage('prod_1', validJpegDataUrl, {
    idToken: 'my_test_token',
    customFetch: mockFetch,
  });

  assert.ok(signHeadersChecked, 'Sign headers must be checked');
  assert.ok(signBodyChecked, 'Sign body must be checked');
  assert.ok(cloudinaryUrlChecked, 'Cloudinary URL must be checked');
  assert.ok(cloudinaryFormDataChecked, 'Cloudinary FormData parameters must be checked');
  assert.strictEqual(result.imageUrl, mockCloudinaryResult.secure_url);
  assert.strictEqual(result.publicId, mockCloudinaryResult.public_id);
  assert.strictEqual(result.format, 'jpg');
  assert.strictEqual(result.bytes, 12345);
});

await itAsync('Successfully uploads File instance directly', async () => {
  const file = new File([validPngBytes], 'item.png', { type: 'image/png' });
  const mockFetch = async (url) => {
    if (url === '/api/cloudinary/sign') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          signature: 'sig_123',
          timestamp: 1700000001,
          apiKey: 'key_123',
          cloudName: 'demo-cloud',
          publicId: 'ts_biz_manager/users/u1/items/prod_2_1700000001',
          folder: 'ts_biz_manager/users/u1/items',
        }),
      };
    }
    if (url.includes('api.cloudinary.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1700000001/prod_2.png',
          public_id: 'ts_biz_manager/users/u1/items/prod_2_1700000001',
          format: 'png',
        }),
      };
    }
  };

  const result = await uploadProductImage('prod_2', file, {
    idToken: 'my_test_token',
    customFetch: mockFetch,
  });

  assert.strictEqual(result.imageUrl, 'https://res.cloudinary.com/demo-cloud/image/upload/v1700000001/prod_2.png');
  assert.strictEqual(result.format, 'png');
});

await itAsync('Handles Cloudinary HTTP 400 rejection with Cloudinary error details', async () => {
  const mockFetch = async (url) => {
    if (url === '/api/cloudinary/sign') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          signature: 'sig_123',
          timestamp: 1700000000,
          apiKey: 'key_123',
          cloudName: 'demo-cloud',
          publicId: 'prod_1_1700000000',
        }),
      };
    }
    if (url.includes('api.cloudinary.com')) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Invalid Signature a1b2c3d4e5f6. String to sign - ...' },
        }),
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('prod_1', validJpegDataUrl, {
        idToken: 'token',
        customFetch: mockFetch,
      }),
    /Invalid Signature/
  );
});

await itAsync('Handles network failure reaching Cloudinary', async () => {
  const mockFetch = async (url) => {
    if (url === '/api/cloudinary/sign') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          signature: 'sig_123',
          timestamp: 1700000000,
          apiKey: 'key_123',
          cloudName: 'demo-cloud',
          publicId: 'prod_1_1700000000',
        }),
      };
    }
    if (url.includes('api.cloudinary.com')) {
      throw new TypeError('Network connection reset');
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('prod_1', validJpegDataUrl, {
        idToken: 'token',
        customFetch: mockFetch,
      }),
    /Network error uploading to Cloudinary/
  );
});

await itAsync('Handles malformed JSON from Cloudinary response', async () => {
  const mockFetch = async (url) => {
    if (url === '/api/cloudinary/sign') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          signature: 'sig_123',
          timestamp: 1700000000,
          apiKey: 'key_123',
          cloudName: 'demo-cloud',
          publicId: 'prod_1_1700000000',
        }),
      };
    }
    if (url.includes('api.cloudinary.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('prod_1', validJpegDataUrl, {
        idToken: 'token',
        customFetch: mockFetch,
      }),
    /Malformed JSON response received from Cloudinary/
  );
});

await itAsync('Rejects Cloudinary response missing secure_url', async () => {
  const mockFetch = async (url) => {
    if (url === '/api/cloudinary/sign') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          signature: 'sig_123',
          timestamp: 1700000000,
          apiKey: 'key_123',
          cloudName: 'demo-cloud',
          publicId: 'prod_1_1700000000',
        }),
      };
    }
    if (url.includes('api.cloudinary.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ public_id: 'prod_1' }), // Missing secure_url
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('prod_1', validJpegDataUrl, {
        idToken: 'token',
        customFetch: mockFetch,
      }),
    /Cloudinary response did not contain a secure_url/
  );
});

await itAsync('Rejects untrusted / external URL returned in secure_url', async () => {
  const mockFetch = async (url) => {
    if (url === '/api/cloudinary/sign') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          signature: 'sig_123',
          timestamp: 1700000000,
          apiKey: 'key_123',
          cloudName: 'demo-cloud',
          publicId: 'prod_1_1700000000',
        }),
      };
    }
    if (url.includes('api.cloudinary.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          secure_url: 'https://evil-attacker.com/malicious.jpg',
          public_id: 'prod_1',
        }),
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('prod_1', validJpegDataUrl, {
        idToken: 'token',
        customFetch: mockFetch,
      }),
    /Untrusted Cloudinary response URL.*not a valid res\.cloudinary\.com HTTPS URL/
  );
});

await itAsync('Rejects insecure HTTP URL returned in secure_url', async () => {
  const mockFetch = async (url) => {
    if (url === '/api/cloudinary/sign') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          signature: 'sig_123',
          timestamp: 1700000000,
          apiKey: 'key_123',
          cloudName: 'demo-cloud',
          publicId: 'prod_1_1700000000',
        }),
      };
    }
    if (url.includes('api.cloudinary.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          secure_url: 'http://res.cloudinary.com/demo-cloud/image/upload/v1/prod.jpg', // HTTP insecure
          public_id: 'prod_1',
        }),
      };
    }
  };

  await assert.rejects(
    async () =>
      uploadProductImage('prod_1', validJpegDataUrl, {
        idToken: 'token',
        customFetch: mockFetch,
      }),
    /Untrusted Cloudinary response URL.*not a valid res\.cloudinary\.com HTTPS URL/
  );
});

console.log('\n======================================================');
console.log(`CHECKPOINT 3 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
