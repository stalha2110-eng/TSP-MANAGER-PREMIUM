import { Item } from '../types';
import { isValidCloudinaryUrl } from '../firebase';
import { isItemDeleted } from '../utils/deletionTracker';
import { getAllLocalProductImages } from '../utils/localImageStorage';
import { uploadProductImage, CloudinaryUploadResult } from './cloudinaryService';

export interface MigrationCandidate {
  id: string;
  name: string;
  base64DataUrl: string;
}

export interface MigrationFailure {
  id: string;
  name: string;
  error: string;
}

export interface MigrationProgress {
  current: number;
  total: number;
  currentItemName?: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  successCount: number;
  failureCount: number;
  /**
   * Number of uploads that were skipped because the token was superseded by a user
   * edit/removal, the item was deleted, migration was cancelled after the upload
   * already finished, the image was replaced/removed before or after upload, or the
   * save callback indicated the write was intentionally skipped. These are distinct
   * from failures (no unexpected upload error occurred) and from successes (the result
   * was not persisted to Firestore).
   */
  skippedCount: number;
  failures: MigrationFailure[];
}

export interface MigrateOptions {
  onProgress?: (progress: MigrationProgress) => void;
  signal?: AbortSignal;
  registerUploadToken: (itemId: string, token: string) => void;
  isTokenValid: (itemId: string, token: string) => boolean;
  clearUploadToken: (itemId: string, expectedToken: string) => void;
  saveToFirestore: (itemId: string, result: CloudinaryUploadResult, token: string) => Promise<boolean>;
  uploader?: (itemId: string, imageInput: string) => Promise<CloudinaryUploadResult>;
  /**
   * Mandatory hook to verify candidate image freshness against live application state
   * before upload starts and again after upload completes. Migration cannot proceed without it.
   */
  getItemCurrentImage: (itemId: string) => string | undefined | null;
  delayMs?: number;
}

/**
 * Identifies existing products that possess a local Base64 image and still require
 * Cloudinary migration.
 *
 * Rules:
 * 1. Checks both `item.imageUrl` in state and `localImages[item.id]` in localStorage.
 * 2. Skips soft-deleted products (`isItemDeleted(item.id)`).
 * 3. Skips products that already have an authentic Cloudinary HTTPS URL as their active
 *    `imageUrl` — the definitive signal that the image is accessible cross-device.
 *    `cloudinaryPublicId` and `imageMigrationStatus` alone are NOT sufficient to skip:
 *    a product can hold those fields while `imageUrl` is still base64 (e.g., a previous
 *    migration that failed mid-write). Using the validated URL as the single source of
 *    truth prevents both duplicate uploads and missed re-migrations.
 * 4. Skips products without any usable local image.
 */
export function getMigrationCandidates(
  items: Item[],
  localImagesMap?: Record<string, string>
): MigrationCandidate[] {
  const localImages = localImagesMap || getAllLocalProductImages();
  const candidates: MigrationCandidate[] = [];

  for (const item of items) {
    if (!item?.id) continue;
    if (isItemDeleted(item.id)) continue;

    // Primary skip condition: the item's active imageUrl is already a valid Cloudinary URL.
    // We deliberately do NOT also skip on cloudinaryPublicId + imageMigrationStatus === 'synced'
    // because those metadata fields can be stale when the imageUrl write did not fully complete.
    if (isValidCloudinaryUrl(item.imageUrl)) continue;

    // Locate the best candidate local Base64 image: prefer the in-memory item.imageUrl,
    // then fall back to the localStorage device backup.
    let candidateDataUrl: string | undefined = undefined;
    if (typeof item.imageUrl === 'string' && item.imageUrl.startsWith('data:')) {
      candidateDataUrl = item.imageUrl;
    } else if (
      localImages[item.id] &&
      typeof localImages[item.id] === 'string' &&
      localImages[item.id].startsWith('data:')
    ) {
      if (!isValidCloudinaryUrl(localImages[item.id])) {
        candidateDataUrl = localImages[item.id];
      }
    }

    if (candidateDataUrl) {
      candidates.push({
        id: item.id,
        name: item.name || 'Unnamed Product',
        base64DataUrl: candidateDataUrl,
      });
    }
  }

  return candidates;
}

/**
 * Existing Product Image Migration Service.
 * Manages manual batch migration of local Base64 images to Cloudinary sequentially.
 */
export class ImageMigrationService {
  private static isRunning = false;
  private static isCancelled = false;
  private static activeAbortController: AbortController | null = null;

  public static isMigrationRunning(): boolean {
    return this.isRunning;
  }

  public static cancelMigration(): void {
    this.isCancelled = true;
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
  }

  /**
   * Returns true if cancellation has been requested (regardless of whether the
   * current upload has finished). Used to discard upload results that completed
   * after the user cancelled.
   */
  private static isCancellationRequested(): boolean {
    return (
      this.isCancelled ||
      (this.activeAbortController?.signal.aborted ?? false)
    );
  }

  /**
   * Sequentially migrates a list of candidate products.
   *
   * @param candidates Products to migrate.
   * @param options Configuration, progress callbacks, and hooks.
   */
  public static async migrateProductImages(
    candidates: MigrationCandidate[],
    options: MigrateOptions
  ): Promise<MigrationProgress> {
    if (this.isRunning) {
      throw new Error('Migration is already in progress.');
    }

    if (!options?.getItemCurrentImage || typeof options.getItemCurrentImage !== 'function') {
      throw new Error('Live image freshness hook (getItemCurrentImage) is required to start migration.');
    }

    if (!options?.registerUploadToken || typeof options.registerUploadToken !== 'function') {
      throw new Error('Upload token registration hook (registerUploadToken) is required to start migration.');
    }

    if (!options?.isTokenValid || typeof options.isTokenValid !== 'function') {
      throw new Error('Upload token validation hook (isTokenValid) is required to start migration.');
    }

    if (!options?.clearUploadToken || typeof options.clearUploadToken !== 'function') {
      throw new Error('Upload token clearing hook (clearUploadToken) is required to start migration.');
    }

    if (!options?.saveToFirestore || typeof options.saveToFirestore !== 'function') {
      throw new Error('Save callback (saveToFirestore) is required to start migration.');
    }

    this.isRunning = true;
    this.isCancelled = false;
    this.activeAbortController = new AbortController();

    const progress: MigrationProgress = {
      current: 0,
      total: candidates.length,
      status: candidates.length === 0 ? 'completed' : 'running',
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      failures: [],
    };

    options?.onProgress?.({ ...progress });

    if (candidates.length === 0) {
      this.isRunning = false;
      this.isCancelled = false;
      this.activeAbortController = null;
      return progress;
    }

    const uploader = options?.uploader || uploadProductImage;
    const delayMs = options?.delayMs ?? 150;

    try {
      for (let i = 0; i < candidates.length; i++) {
        // Check for cancellation before processing each candidate.
        if (this.isCancellationRequested() || options?.signal?.aborted) {
          progress.status = 'cancelled';
          break;
        }

        const candidate = candidates[i];
        progress.current = i + 1;
        progress.currentItemName = candidate.name;
        options?.onProgress?.({ ...progress });

        // Skip soft-deleted items before starting upload.
        if (isItemDeleted(candidate.id)) {
          progress.skippedCount++;
          options?.onProgress?.({ ...progress });
          continue;
        }

        // Live image freshness verification (pre-upload):
        // Verify candidate's captured image is still the actual current image.
        // If the user replaced or removed the image since candidates were gathered,
        // skip this candidate without uploading.
        const currentImage = options.getItemCurrentImage(candidate.id);
        if (!currentImage || currentImage !== candidate.base64DataUrl) {
          progress.skippedCount++;
          options?.onProgress?.({ ...progress });
          continue;
        }

        // Register unique upload request token for this migration attempt.
        // A newer token registered by a user edit will supersede this one.
        const uploadToken = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        options.registerUploadToken(candidate.id, uploadToken);

        try {
          const result = await uploader(candidate.id, candidate.base64DataUrl);

          // Cancellation safety (post-upload):
          // If the user cancelled while upload was in-flight, discard the result without
          // persisting to Firestore, and safely clear the token only if it still matches.
          // Note: Clearing the upload token does NOT delete or enqueue the uploaded Cloudinary asset;
          // orphaned-asset cleanup requires a separate future checkpoint and backend job.
          if (this.isCancellationRequested() || options?.signal?.aborted) {
            options.clearUploadToken(candidate.id, uploadToken);
            progress.skippedCount++;
            progress.status = 'cancelled';
            break;
          }

          // Guard 1: Verify token has not been superseded or invalidated during upload.
          if (!options.isTokenValid(candidate.id, uploadToken)) {
            // Note: do NOT clear token here because a newer token was registered by user edit
            progress.skippedCount++;
            options?.onProgress?.({ ...progress });
            continue;
          }

          // Check if item was deleted while uploading.
          if (isItemDeleted(candidate.id)) {
            options.clearUploadToken(candidate.id, uploadToken);
            progress.skippedCount++;
            options?.onProgress?.({ ...progress });
            continue;
          }

          // Live image freshness verification (post-upload):
          // Verify candidate's image was not replaced or removed during upload.
          const currentImageAfterUpload = options.getItemCurrentImage(candidate.id);
          if (!currentImageAfterUpload || currentImageAfterUpload !== candidate.base64DataUrl) {
            options.clearUploadToken(candidate.id, uploadToken);
            progress.skippedCount++;
            options?.onProgress?.({ ...progress });
            continue;
          }

          // Save to Firestore and local state.
          const didSave = await options.saveToFirestore(candidate.id, result, uploadToken);

          if (didSave === true) {
            progress.successCount++;
          } else {
            // Write was intentionally skipped (e.g. token superseded in write chain, item deleted, guest user)
            options.clearUploadToken(candidate.id, uploadToken);
            progress.skippedCount++;
          }
        } catch (itemErr: any) {
          console.error(`[ImageMigration] Failed to migrate image for item ${candidate.id} (${candidate.name}):`, itemErr);
          progress.failureCount++;
          progress.failures.push({
            id: candidate.id,
            name: candidate.name,
            error: itemErr?.message || String(itemErr),
          });
          // Safely clear token on failure only if it still matches this migration attempt's token
          options.clearUploadToken(candidate.id, uploadToken);
        }

        options?.onProgress?.({ ...progress });

        // Small delay between sequential uploads to respect rate limits.
        if (delayMs > 0 && i < candidates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      if (progress.status === 'running') {
        progress.status =
          progress.failureCount > 0 && progress.successCount === 0 ? 'error' : 'completed';
      }
    } finally {
      this.isRunning = false;
      this.isCancelled = false;
      this.activeAbortController = null;
      options?.onProgress?.({ ...progress });
    }

    return progress;
  }
}
