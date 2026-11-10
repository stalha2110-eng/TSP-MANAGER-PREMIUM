import {
  verifyFirebaseIdToken,
  verifyAssetSafeToDelete,
  destroyCloudinaryAsset,
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
    const { publicId, itemId } = req.body || {};
    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid publicId.' });
    }
    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid itemId.' });
    }

    // 3. Strict User Ownership Check
    const expectedPrefix = `ts_biz_manager/users/${uid}/items/`;
    if (!publicId.startsWith(expectedPrefix)) {
      return res.status(403).json({
        error: 'Forbidden. Asset does not belong to the authenticated user.',
      });
    }

    // 4. Server-Side Safety Verification against Firestore
    const rawToken = authHeader.slice(7).trim();
    const safetyCheck = await verifyAssetSafeToDelete(uid, itemId, publicId, rawToken);

    if (!safetyCheck.safeToDelete) {
      const statusCode = safetyCheck.retryable ? 503 : 409;
      return res.status(statusCode).json({
        success: false,
        error: safetyCheck.reason,
        retryable: safetyCheck.retryable,
      });
    }

    // 5. Cloudinary Credentials Check
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary server credentials missing in environment.',
      });
    }

    // 6. Idempotent Cloudinary Asset Destruction
    const destroyRes = await destroyCloudinaryAsset(publicId, cloudName, apiKey, apiSecret);

    return res.status(200).json({
      success: true,
      publicId,
      result: destroyRes.result || 'ok',
      reason: safetyCheck.reason,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    return res.status(statusCode).json({ error: message });
  }
}
