/**
 * Compresses an image file client-side into a lightweight base64 Data URL.
 * Optimizes dimensions and quality for local device storage.
 */
export const compressImageFile = (
  file: File,
  maxWidth = 360,
  maxHeight = 360,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Using image/jpeg for compact data size
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Validates binary magic byte headers to determine authentic image format.
 * Guards against file extension and MIME spoofing.
 */
export function detectImageFormatFromBytes(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (!bytes || bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return 'png';
  }

  // WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // 'RIFF'
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50   // 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Validates an ArrayBuffer or Uint8Array representing image content.
 * Checks file size and verifies magic byte signatures.
 */
export function validateImageBuffer(
  buffer: ArrayBuffer | Uint8Array,
  maxSizeBytes = MAX_IMAGE_FILE_SIZE
): { valid: boolean; format?: 'jpeg' | 'png' | 'webp'; error?: string } {
  if (!buffer) {
    return { valid: false, error: 'Empty or missing image buffer.' };
  }

  const byteLength = buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength;
  if (byteLength === 0) {
    return { valid: false, error: 'Image file is empty (0 bytes).' };
  }

  if (byteLength > maxSizeBytes) {
    const sizeMb = (byteLength / (1024 * 1024)).toFixed(2);
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image file exceeds maximum allowed size of ${maxMb}MB (received ${sizeMb}MB).`,
    };
  }

  const bytes = buffer instanceof Uint8Array ? buffer.subarray(0, 12) : new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  const format = detectImageFormatFromBytes(bytes);

  if (!format) {
    return {
      valid: false,
      error: 'Unsupported image format or invalid image header. Only JPEG, PNG, and WebP are allowed.',
    };
  }

  return { valid: true, format };
}

/**
 * Client-side file validator for gallery or camera file selections.
 * Reads initial bytes to verify format before any upload or processing.
 */
export async function validateImageFile(
  file: File,
  maxSizeBytes = MAX_IMAGE_FILE_SIZE
): Promise<{ valid: boolean; format?: 'jpeg' | 'png' | 'webp'; error?: string }> {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb}MB) exceeds limit of ${maxMb}MB.`,
    };
  }

  // Read first 16 bytes for magic number verification
  try {
    const slice = file.slice(0, 16);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const format = detectImageFormatFromBytes(bytes);

    if (!format) {
      return {
        valid: false,
        error: 'File content does not match a valid JPEG, PNG, or WebP image.',
      };
    }

    return { valid: true, format };
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to inspect image file: ${err?.message || String(err)}`,
    };
  }
}
