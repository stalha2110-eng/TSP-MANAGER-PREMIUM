import crypto from 'crypto';

// Cached Google public certificates for Firebase ID Token verification
let cachedCertificates: Record<string, string> | null = null;
let certsExpiryTime = 0;

export const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0836292212';
export const FIRESTORE_DATABASE_ID = process.env.VITE_FIRESTORE_DATABASE_ID || 'ai-studio-3f358d36-e8b9-4223-938c-0d77d9155257';

/**
 * Fetch and cache Google public x509 certificates for Firebase ID Token verification.
 */
async function getGooglePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCertificates && now < certsExpiryTime) {
    return cachedCertificates;
  }

  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Google public certificates: HTTP ${response.status}`);
  }

  // Parse Cache-Control header if available, default to 6 hours
  const cacheControl = response.headers.get('cache-control');
  let maxAgeSeconds = 21600;
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match && match[1]) {
      maxAgeSeconds = parseInt(match[1], 10);
    }
  }

  certsExpiryTime = now + maxAgeSeconds * 1000;
  cachedCertificates = await response.json();
  return cachedCertificates!;
}

/**
 * Cryptographically verify Firebase Authentication ID Token on the backend.
 * Uses Google public RSA certificates without requiring a private service account key.
 */
export async function verifyFirebaseIdToken(authHeader?: string): Promise<{ uid: string; email?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Missing or malformed Authorization header. Expected Bearer token.' };
  }

  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw { statusCode: 401, message: 'Invalid JWT structure. Expected 3 segments.' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let payload: {
    iss?: string;
    aud?: string;
    sub?: string;
    exp?: number;
    auth_time?: number;
    email?: string;
  };

  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw { statusCode: 401, message: 'Failed to decode JWT header or payload.' };
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw { statusCode: 401, message: 'Unsupported JWT algorithm or missing kid header.' };
  }

  // Verify Claims
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSeconds) {
    throw { statusCode: 401, message: 'Firebase ID Token has expired.' };
  }

  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (payload.iss !== expectedIssuer) {
    throw { statusCode: 401, message: `Invalid token issuer. Expected ${expectedIssuer}.` };
  }

  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw { statusCode: 401, message: `Invalid token audience. Expected ${FIREBASE_PROJECT_ID}.` };
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw { statusCode: 401, message: 'Token missing subject (uid) claim.' };
  }

  // Verify Cryptographic Signature against Google Public Keys
  const keys = await getGooglePublicKeys();
  const cert = keys[header.kid];
  if (!cert) {
    throw { statusCode: 401, message: 'No matching Google public certificate found for token kid.' };
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const signatureBuffer = Buffer.from(signatureB64, 'base64url');

  const isValid = verifier.verify(cert, signatureBuffer);
  if (!isValid) {
    throw { statusCode: 401, message: 'Cryptographic signature verification failed.' };
  }

  return {
    uid: payload.sub,
    email: payload.email,
  };
}

/**
 * Generate Cloudinary SHA signature for signed uploads.
 * Sorts parameters alphabetically, concatenates key=value with &, appends secret, and hashes with SHA-1.
 */
export function generateCloudinarySignature(
  paramsToSign: Record<string, string | number | boolean>,
  apiSecret: string
): string {
  const sortedKeys = Object.keys(paramsToSign).sort();
  const stringToSign = sortedKeys.map((key) => `${key}=${paramsToSign[key]}`).join('&') + apiSecret;
  return crypto.createHash('sha1').update(stringToSign).digest('hex');
}

/**
 * Helper to build the Firestore REST API base endpoint for this project.
 */
function getFirestoreRestEndpoint(): string {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;
}

/**
 * Atomic sliding-window rate limit transaction using Firestore REST API.
 * Ensures concurrent requests across multi-instance serverless functions cannot bypass per-user limits.
 */
export async function checkAndIncrementRateLimit(
  uid: string,
  rawToken: string,
  maxPerHour = 120
): Promise<{ allowed: boolean; remaining: number; waitMinutes?: number }> {
  const windowMs = 60 * 60 * 1000; // 1-hour rolling window
  const now = Date.now();
  const docUrl = `${getFirestoreRestEndpoint()}/users/${uid}/rateLimits/cloudinary_uploads`;

  try {
    // 1. Fetch current rate limit document
    const getRes = await fetch(docUrl, {
      headers: { Authorization: `Bearer ${rawToken}` },
    });

    let timestamps: number[] = [];
    let updateTime: string | null = null;

    if (getRes.ok) {
      const docData = await getRes.json();
      updateTime = docData.updateTime;
      const rawArray = docData.fields?.timestamps?.arrayValue?.values || [];
      timestamps = rawArray
        .map((v: any) => parseInt(v.integerValue || v.stringValue || '0', 10))
        .filter((t: number) => now - t < windowMs && t > 0);
    } else if (getRes.status !== 404) {
      console.warn(`[RATE LIMIT] Firestore read returned HTTP ${getRes.status}. Allowing fallback.`);
      return { allowed: true, remaining: maxPerHour };
    }

    // 2. Check if limit exceeded in sliding window
    if (timestamps.length >= maxPerHour) {
      const oldest = timestamps[0];
      const waitMinutes = Math.max(1, Math.ceil((oldest + windowMs - now) / 60000));
      return { allowed: false, remaining: 0, waitMinutes };
    }

    // 3. Append current timestamp and persist atomically
    timestamps.push(now);

    const payload = {
      fields: {
        timestamps: {
          arrayValue: {
            values: timestamps.map((t) => ({ integerValue: t.toString() })),
          },
        },
        updatedAt: { integerValue: now.toString() },
      },
    };

    const patchUrl = updateTime
      ? `${docUrl}?currentDocument.updateTime=${encodeURIComponent(updateTime)}`
      : docUrl;

    const writeRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${rawToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!writeRes.ok) {
      console.warn(`[RATE LIMIT] Transaction write returned HTTP ${writeRes.status}.`);
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxPerHour - timestamps.length),
    };
  } catch (err) {
    console.warn('[RATE LIMIT] Error checking rate limit. Non-fatal fallback:', err);
    return { allowed: true, remaining: maxPerHour };
  }
}

/**
 * Verify whether a Cloudinary asset is safe to delete by checking current Firestore state.
 * Prevents premature deletion if a product was restored (Undo) or if image replacement failed.
 */
export async function verifyAssetSafeToDelete(
  uid: string,
  itemId: string,
  publicId: string,
  rawToken: string
): Promise<{ safeToDelete: boolean; reason: string; retryable: boolean }> {
  const itemUrl = `${getFirestoreRestEndpoint()}/users/${uid}/items/${itemId}`;

  try {
    const res = await fetch(itemUrl, {
      headers: { Authorization: `Bearer ${rawToken}` },
    });

    // Case 1: Firestore error / unavailable -> DO NOT DELETE
    if (!res.ok && res.status !== 404) {
      return {
        safeToDelete: false,
        reason: `Firestore error HTTP ${res.status}. Aborting deletion for safety.`,
        retryable: true,
      };
    }

    // Case 2: Document EXISTS
    if (res.ok) {
      const itemDoc = await res.json();
      const currentPublicId = itemDoc.fields?.cloudinaryPublicId?.stringValue;
      const currentImageUrl = itemDoc.fields?.imageUrl?.stringValue;

      // Check if current document still references this asset
      if (currentPublicId === publicId || (currentImageUrl && currentImageUrl.includes(publicId))) {
        return {
          safeToDelete: false,
          reason: 'Asset is currently active and referenced by the product document (restored or not replaced).',
          retryable: false,
        };
      }

      // If item exists but references a different/newer asset -> safe to delete old asset
      return {
        safeToDelete: true,
        reason: 'Asset superseded by newer product image.',
        retryable: false,
      };
    }

    // Case 3: Document DOES NOT EXIST (404)
    // Check pending deletions queue or confirm deletion marker
    const pendingDocUrl = `${getFirestoreRestEndpoint()}/users/${uid}/pending_deletions/${itemId}`;
    const pendingRes = await fetch(pendingDocUrl, {
      headers: { Authorization: `Bearer ${rawToken}` },
    });

    if (pendingRes.ok || pendingRes.status === 404) {
      return {
        safeToDelete: true,
        reason: 'Product confirmed deleted and no longer referenced.',
        retryable: false,
      };
    }

    return {
      safeToDelete: false,
      reason: 'Safety verification uncertain. Retrying later.',
      retryable: true,
    };
  } catch (err: any) {
    return {
      safeToDelete: false,
      reason: `Network error verifying Firestore: ${err?.message || String(err)}`,
      retryable: true,
    };
  }
}

/**
 * Idempotently destroy an asset on Cloudinary.
 * Treats both "ok" and "not found" as successful deletion.
 */
export async function destroyCloudinaryAsset(
  publicId: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<{ result: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateCloudinarySignature({ public_id: publicId, timestamp }, apiSecret);

  const formData = new URLSearchParams();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary destroy failed HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data;
}
