import {
  verifyFirebaseIdToken,
  generateCloudinarySignature,
  checkAndIncrementRateLimit,
} from './_utils.js';

export default async function handler(req: any, res: any) {
  // Allow only POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // 1. Verify Firebase Authentication ID Token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const { uid } = await verifyFirebaseIdToken(authHeader);

    // 2. Validate Request Body
    const { itemId } = req.body || {};
    if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid or missing itemId.' });
    }

    const cleanItemId = itemId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanItemId) {
      return res.status(400).json({ error: 'itemId contains no valid alphanumeric characters.' });
    }

    // 3. Environment Variable Check
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary server configuration missing. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in environment.',
      });
    }

    // 4. Concurrency-Safe Sliding Window Rate Limit Check in Firestore
    const rawToken = authHeader.slice(7).trim();
    const rateLimit = await checkAndIncrementRateLimit(uid, rawToken);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Hourly upload limit reached. Please retry in ${rateLimit.waitMinutes || 60} minute(s).`,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    // 5. Versioned Public ID & Upload Constraints
    const timestamp = Math.floor(Date.now() / 1000);
    const versionTimestamp = Date.now();
    const folder = `ts_biz_manager/users/${uid}/items`;
    const publicId = `${folder}/${cleanItemId}_${versionTimestamp}`;

    const paramsToSign = {
      allowed_formats: 'jpg,png,webp',
      folder,
      max_file_size: 5242880, // 5MB
      public_id: publicId,
      timestamp,
    };

    // 6. Generate Cryptographic Signature (API Secret is NEVER returned to client)
    const signature = generateCloudinarySignature(paramsToSign, apiSecret);

    return res.status(200).json({
      success: true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      publicId,
      folder,
      rateLimit: {
        remaining: rateLimit.remaining,
      },
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    return res.status(statusCode).json({ error: message });
  }
}
