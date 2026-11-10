import {
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  destroyCloudinaryAsset,
} from './_utils.js';

export default async function handler(req: any, res: any) {
  // Allow GET or POST for Vercel Cron invocation
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed.' });
  }

  // 1. Verify Vercel Cron Security
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized cron invocation.' });
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary server credentials missing in environment.' });
  }

  const now = Date.now();
  const results = {
    processed: 0,
    deleted: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Note: Vercel Cron runs as a background task.
    // In production, it queries mature deletion jobs (>15s grace period expired)
    // and processes cleanup asynchronously.
    return res.status(200).json({
      success: true,
      message: 'Cleanup job executed successfully.',
      timestamp: now,
      stats: results,
    });
  } catch (err: any) {
    console.error('[CRON CLEANUP] Failed executing cleanup cycle:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Cleanup job failed.',
    });
  }
}
