/**
 * Test Suite: Checkpoint 2 - Image Validation, Firestore Sanitization & Cloud Sync Reconciliation
 * Standalone runner: zero external dependencies, uses native Node.js.
 * 
 * ALL TEST SUITES IN THIS FILE DIRECTLY EXECUTE PRODUCTION IMPLEMENTATIONS:
 * - Suite 1: isValidCloudinaryUrl (src/firebase.ts)
 * - Suite 2: sanitizeForFirestore (src/firebase.ts)
 * - Suite 3: detectImageFormatFromBytes & validateImageBuffer (src/utils/imageUtils.ts)
 * - Suite 4: validateImageFile (src/utils/imageUtils.ts)
 * - Suite 5: reconcileProductImageUrl (src/services/cloudSyncService.ts)
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

// Environment polyfill for Node runtime (initialState.ts reads localStorage on module evaluation)
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// Transparently bootstrap plain `node test_checkpoint2.mjs` execution through
// local workspace TypeScript runner (tsx) if native strip mode encounters enums.
if (!process.env.__CHECKPOINT2_RUNNER__) {
  try {
    await import('./src/firebase.ts');
  } catch (err) {
    if (err.code === 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX' || err.message?.includes('TypeScript enum')) {
      const tsxPath = './node_modules/tsx/dist/cli.mjs';
      const selfPath = fileURLToPath(import.meta.url);
      const res = spawnSync(process.execPath, [tsxPath, selfPath], {
        stdio: 'inherit',
        env: { ...process.env, __CHECKPOINT2_RUNNER__: '1' },
      });
      process.exit(res.status ?? 0);
    } else {
      throw err;
    }
  }
}

// --------------------------------------------------------------------
// Direct Production Function Imports
// --------------------------------------------------------------------
const { isValidCloudinaryUrl, sanitizeForFirestore } = await import('./src/firebase.ts');
const {
  detectImageFormatFromBytes,
  validateImageBuffer,
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
} = await import('./src/utils/imageUtils.ts');
const { reconcileProductImageUrl } = await import('./src/services/cloudSyncService.ts');

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

console.log('\n======================================================');
console.log('🧪 RUNNING CHECKPOINT 2 STANDALONE TEST SUITE');
console.log('   All suites directly test production code implementations');
console.log('======================================================\n');

// ====================================================================
// Test Suite 1: Strict Cloudinary HTTPS Hostname & URL Validation
// Target Function: isValidCloudinaryUrl (src/firebase.ts)
// ====================================================================
console.log('Test Suite 1: Direct Production Test - isValidCloudinaryUrl (src/firebase.ts)');

// 1.1 Valid Cloudinary HTTPS URLs
assert(
  isValidCloudinaryUrl('https://res.cloudinary.com/tsbiz/image/upload/v12345/item1.jpg') === true,
  'Accepts standard Cloudinary HTTPS URL'
);
assert(
  isValidCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/sample.webp') === true,
  'Accepts Cloudinary WebP HTTPS URL'
);
assert(
  isValidCloudinaryUrl('  https://res.cloudinary.com/tsbiz/image/upload/item2.png  ') === true,
  'Accepts valid URL with surrounding whitespace (trimmed)'
);

// 1.2 Insecure HTTP
assert(
  isValidCloudinaryUrl('http://res.cloudinary.com/demo/image/upload/sample.jpg') === false,
  'Rejects insecure HTTP Cloudinary URL'
);

// 1.3 Subdomain / Hostname Spoofing Attempts
assert(
  isValidCloudinaryUrl('https://res.cloudinary.com.attacker.com/upload/sample.jpg') === false,
  'Rejects subdomain spoofing attack (res.cloudinary.com.attacker.com)'
);
assert(
  isValidCloudinaryUrl('https://attacker.com/res.cloudinary.com/sample.jpg') === false,
  'Rejects path spoofing attack (attacker.com/res.cloudinary.com)'
);
assert(
  isValidCloudinaryUrl('https://evil-res.cloudinary.com/sample.jpg') === false,
  'Rejects prefix spoofing (evil-res.cloudinary.com)'
);
assert(
  isValidCloudinaryUrl('https://images.unsplash.com/photo-123') === false,
  'Rejects non-Cloudinary external image hosts (images.unsplash.com)'
);

// 1.4 Base64 Data URLs
assert(
  isValidCloudinaryUrl('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...') === false,
  'Rejects base64 Data URL'
);

// 1.5 Malicious XSS, Malformed & Empty Inputs
assert(
  isValidCloudinaryUrl('javascript:alert("xss")') === false,
  'Rejects javascript: URI scheme'
);
assert(
  isValidCloudinaryUrl('not a valid url at all') === false,
  'Rejects non-URL string'
);
assert(
  isValidCloudinaryUrl('') === false,
  'Rejects empty string'
);
assert(
  isValidCloudinaryUrl(null) === false,
  'Rejects null value'
);
assert(
  isValidCloudinaryUrl(undefined) === false,
  'Rejects undefined value'
);
assert(
  isValidCloudinaryUrl(12345) === false,
  'Rejects numeric input'
);

// ====================================================================
// Test Suite 2: Firestore Sanitization Guardrails
// Target Function: sanitizeForFirestore (src/firebase.ts)
// ====================================================================
console.log('\nTest Suite 2: Direct Production Test - sanitizeForFirestore (src/firebase.ts)');

// 2.1 Preserves valid Cloudinary HTTPS URL
const validProduct = {
  id: 'prod_101',
  name: 'Basmati Rice 1kg',
  imageUrl: 'https://res.cloudinary.com/tsbiz/image/upload/v1/prod_101.jpg',
  cloudinaryPublicId: 'ts_biz_manager/users/u1/items/prod_101_174000',
  imageMigrationStatus: 'synced',
  imageUpdatedAt: '2026-11-04T12:00:00Z',
  price: 120,
};
const sanitizedValid = sanitizeForFirestore(validProduct);
assert(
  sanitizedValid.imageUrl === 'https://res.cloudinary.com/tsbiz/image/upload/v1/prod_101.jpg',
  'Preserves authentic res.cloudinary.com HTTPS URL in sanitized Firestore payload'
);
assert(
  sanitizedValid.cloudinaryPublicId === 'ts_biz_manager/users/u1/items/prod_101_174000',
  'Preserves cloudinaryPublicId in Firestore payload'
);
assert(
  sanitizedValid.imageMigrationStatus === 'synced',
  'Preserves imageMigrationStatus in Firestore payload'
);
assert(
  sanitizedValid.price === 120,
  'Preserves general product properties'
);

// 2.2 Strips base64 image data URL unconditionally
const localBase64Product = {
  id: 'prod_102',
  name: 'Sunflower Oil 1L',
  imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
  price: 160,
};
const sanitizedBase64 = sanitizeForFirestore(localBase64Product);
assert(
  sanitizedBase64.imageUrl === undefined,
  'Strictly strips base64 Data URL so raw bytes never pollute Firestore'
);
assert(
  sanitizedBase64.name === 'Sunflower Oil 1L' && sanitizedBase64.price === 160,
  'Retains other product fields intact when base64 image is stripped'
);

// 2.3 Strips external non-Cloudinary HTTPS URL
const externalUrlProduct = {
  id: 'prod_103',
  name: 'Wheat Flour 5kg',
  imageUrl: 'https://external-cdn.com/products/wheat.jpg',
  price: 240,
};
const sanitizedExternal = sanitizeForFirestore(externalUrlProduct);
assert(
  sanitizedExternal.imageUrl === undefined,
  'Strictly strips non-Cloudinary external HTTPS URLs'
);

// 2.4 Strips insecure HTTP Cloudinary URL
const insecureUrlProduct = {
  id: 'prod_104',
  name: 'Sugar 1kg',
  imageUrl: 'http://res.cloudinary.com/tsbiz/image/upload/v1/sugar.jpg',
  price: 45,
};
const sanitizedInsecure = sanitizeForFirestore(insecureUrlProduct);
assert(
  sanitizedInsecure.imageUrl === undefined,
  'Strictly strips insecure HTTP Cloudinary URLs'
);

// 2.5 Recursive Array and Nested Object Sanitization
const complexState = {
  items: [
    { id: '1', imageUrl: 'https://res.cloudinary.com/demo/image/upload/1.jpg' },
    { id: '2', imageUrl: 'data:image/png;base64,iVBORw0KGgo...' },
    { id: '3', imageUrl: 'https://attacker.com/evil.jpg' },
  ],
};
const sanitizedComplex = sanitizeForFirestore(complexState);
assert(
  sanitizedComplex.items[0].imageUrl === 'https://res.cloudinary.com/demo/image/upload/1.jpg',
  'Nested array: preserves valid Cloudinary URL'
);
assert(
  sanitizedComplex.items[1].imageUrl === undefined,
  'Nested array: strips base64 URL'
);
assert(
  sanitizedComplex.items[2].imageUrl === undefined,
  'Nested array: strips attacker URL'
);

// ====================================================================
// Test Suite 3: Client-Side Binary Magic-Byte Header Validation
// Target Functions: detectImageFormatFromBytes & validateImageBuffer (src/utils/imageUtils.ts)
// ====================================================================
console.log('\nTest Suite 3: Direct Production Test - detectImageFormatFromBytes & validateImageBuffer (src/utils/imageUtils.ts)');

// 3.1 JPEG Magic Bytes (FF D8 FF)
const validJpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
assert(
  detectImageFormatFromBytes(validJpegHeader) === 'jpeg',
  'detectImageFormatFromBytes correctly detects JPEG from magic bytes FF D8 FF'
);
const validJpegBufferRes = validateImageBuffer(validJpegHeader);
assert(
  validJpegBufferRes.valid === true && validJpegBufferRes.format === 'jpeg',
  'validateImageBuffer validates JPEG buffer successfully'
);

// 3.2 PNG Magic Bytes (89 50 4E 47 0D 0A 1A 0A)
const validPngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
assert(
  detectImageFormatFromBytes(validPngHeader) === 'png',
  'detectImageFormatFromBytes correctly detects PNG from magic bytes 89 50 4E 47'
);
const validPngBufferRes = validateImageBuffer(validPngHeader);
assert(
  validPngBufferRes.valid === true && validPngBufferRes.format === 'png',
  'validateImageBuffer validates PNG buffer successfully'
);

// 3.3 WebP Magic Bytes (RIFF .... WEBP)
const validWebpHeader = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // 'RIFF'
  0x24, 0x00, 0x00, 0x00, // length
  0x57, 0x45, 0x42, 0x50, // 'WEBP'
]);
assert(
  detectImageFormatFromBytes(validWebpHeader) === 'webp',
  'detectImageFormatFromBytes correctly detects WebP from RIFF..WEBP header'
);
const validWebpBufferRes = validateImageBuffer(validWebpHeader);
assert(
  validWebpBufferRes.valid === true && validWebpBufferRes.format === 'webp',
  'validateImageBuffer validates WebP buffer successfully'
);

// 3.4 Reject Malicious / Spoofed Binary Buffers
const spoofedExeHeader = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]); // 'MZ' DOS/PE
assert(
  detectImageFormatFromBytes(spoofedExeHeader) === null,
  'Rejects Windows executable (MZ header) disguised as image buffer'
);
const spoofedBufferRes = validateImageBuffer(spoofedExeHeader);
assert(
  spoofedBufferRes.valid === false && spoofedBufferRes.error.includes('Unsupported image format'),
  'validateImageBuffer flags spoofed binary as invalid'
);

const htmlHeader = new Uint8Array(Buffer.from('<!DOCTYPE html><html>'));
assert(
  detectImageFormatFromBytes(htmlHeader) === null,
  'Rejects HTML/text document buffer uploaded as image'
);

// 3.5 Reject Empty and Oversized Buffers
const emptyBufferRes = validateImageBuffer(new Uint8Array(0));
assert(
  emptyBufferRes.valid === false && emptyBufferRes.error.includes('empty'),
  'Rejects empty buffer (0 bytes)'
);

const oversizedDummy = new Uint8Array(MAX_IMAGE_FILE_SIZE + 1024);
oversizedDummy[0] = 0xFF;
oversizedDummy[1] = 0xD8;
oversizedDummy[2] = 0xFF;
const oversizedRes = validateImageBuffer(oversizedDummy);
assert(
  oversizedRes.valid === false && oversizedRes.error.includes('exceeds maximum allowed size'),
  'Rejects buffer exceeding MAX_IMAGE_FILE_SIZE (5MB)'
);

// ====================================================================
// Test Suite 4: Client-Side File Object Validation
// Target Function: validateImageFile (src/utils/imageUtils.ts)
// ====================================================================
console.log('\nTest Suite 4: Direct Production Test - validateImageFile (src/utils/imageUtils.ts)');

// 4.1 Valid JPEG File
const jpegFile = new File([validJpegHeader], 'product.jpg', { type: 'image/jpeg' });
const jpegFileRes = await validateImageFile(jpegFile);
assert(
  jpegFileRes.valid === true && jpegFileRes.format === 'jpeg',
  'validateImageFile accepts authentic JPEG File'
);

// 4.2 Valid PNG File
const pngFile = new File([validPngHeader], 'product.png', { type: 'image/png' });
const pngFileRes = await validateImageFile(pngFile);
assert(
  pngFileRes.valid === true && pngFileRes.format === 'png',
  'validateImageFile accepts authentic PNG File'
);

// 4.3 Valid WebP File
const webpFile = new File([validWebpHeader], 'product.webp', { type: 'image/webp' });
const webpFileRes = await validateImageFile(webpFile);
assert(
  webpFileRes.valid === true && webpFileRes.format === 'webp',
  'validateImageFile accepts authentic WebP File'
);

// 4.4 Invalid / Spoofed File Content (e.g. .jpg filename but executable content)
const spoofedFile = new File([spoofedExeHeader], 'trojan.jpg', { type: 'image/jpeg' });
const spoofedFileRes = await validateImageFile(spoofedFile);
assert(
  spoofedFileRes.valid === false && spoofedFileRes.error.includes('does not match a valid JPEG, PNG, or WebP'),
  'validateImageFile rejects file with .jpg extension and image/jpeg MIME when magic bytes are invalid'
);

// 4.5 File Larger than 5 MB Limit
const oversizedContent = new Uint8Array(MAX_IMAGE_FILE_SIZE + 2048);
oversizedContent[0] = 0xFF;
oversizedContent[1] = 0xD8;
oversizedContent[2] = 0xFF;
const oversizedFile = new File([oversizedContent], 'huge_photo.jpg', { type: 'image/jpeg' });
const oversizedFileRes = await validateImageFile(oversizedFile);
assert(
  oversizedFileRes.valid === false && oversizedFileRes.error.includes('exceeds limit'),
  'validateImageFile rejects file exceeding 5MB limit before reading bytes'
);

// 4.6 Missing File Input (null / undefined)
const nullFileRes = await validateImageFile(null);
assert(
  nullFileRes.valid === false && nullFileRes.error === 'No file provided.',
  'validateImageFile rejects null input with "No file provided."'
);
const undefinedFileRes = await validateImageFile(undefined);
assert(
  undefinedFileRes.valid === false && undefinedFileRes.error === 'No file provided.',
  'validateImageFile rejects undefined input with "No file provided."'
);

// ====================================================================
// Test Suite 5: Cloud Sync Image Reconciliation
// Target Function: reconcileProductImageUrl (src/services/cloudSyncService.ts)
// ====================================================================
console.log('\nTest Suite 5: Direct Production Test - reconcileProductImageUrl (src/services/cloudSyncService.ts)');

// 5.1 Remote Cloudinary HTTPS URL present + local base64 present -> Remote Cloudinary wins
const syncCase1 = reconcileProductImageUrl(
  'https://res.cloudinary.com/tsbiz/image/upload/v1/remote_product.jpg',
  'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...'
);
assert(
  syncCase1 === 'https://res.cloudinary.com/tsbiz/image/upload/v1/remote_product.jpg',
  'Priority 1: Remote Cloudinary HTTPS URL takes precedence over local image'
);

// 5.2 Remote Cloudinary URL absent (undefined) + local base64 present -> Local image preserved
const syncCase2 = reconcileProductImageUrl(
  undefined,
  'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...'
);
assert(
  syncCase2 === 'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...',
  'Priority 2: Existing local image is fully preserved when remote URL is absent'
);

// 5.3 Remote Cloudinary URL empty string + local base64 present -> Local image preserved
const syncCase3 = reconcileProductImageUrl(
  '',
  'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...'
);
assert(
  syncCase3 === 'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...',
  'Priority 2: Local image is preserved when remote URL is empty string'
);

// 5.4 Remote URL is an invalid/unauthorized external host -> Local image preserved
const syncCase4 = reconcileProductImageUrl(
  'https://unauthorized-cdn.com/photo.jpg',
  'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...'
);
assert(
  syncCase4 === 'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...',
  'Priority 2: Local image is preserved when remote URL fails Cloudinary validation'
);

// 5.5 Remote URL is insecure HTTP -> Local image preserved
const syncCase5 = reconcileProductImageUrl(
  'http://res.cloudinary.com/tsbiz/image/upload/insecure.jpg',
  'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...'
);
assert(
  syncCase5 === 'data:image/jpeg;base64,/9j/4AAQSkZJRg_local_data...',
  'Priority 2: Local image is preserved when remote URL is insecure HTTP'
);

// 5.6 Neither remote nor local image exists -> undefined
const syncCase6 = reconcileProductImageUrl(undefined, undefined);
assert(
  syncCase6 === undefined,
  'Resolves cleanly to undefined when neither remote nor local image exists'
);

// ====================================================================
// Summary
// ====================================================================
console.log('\n======================================================');
console.log(`CHECKPOINT 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
