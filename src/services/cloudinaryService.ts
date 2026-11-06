import { auth, isValidCloudinaryUrl } from '../firebase';
import {
  validateImageBuffer,
  detectImageFormatFromBytes,
  MAX_IMAGE_FILE_SIZE,
} from '../utils/imageUtils';

export interface CloudinaryUploadResult {
  imageUrl: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

export interface UploadImageOptions {
  signEndpoint?: string;
  customFetch?: typeof fetch;
  idToken?: string;
}

/**
 * Safely decodes a base64 string into a Uint8Array across browser and Node.js environments.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/\s/g, '');
  if (typeof atob === 'function') {
    const binaryStr = atob(clean);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }
  throw new Error('Base64 decoder is not available in this environment.');
}

/**
 * Converts a Base64 Data URL, File, or Blob into a validated Blob ready for Cloudinary upload.
 * Reuses existing validation utilities enforcing magic bytes and the 5MB size limit.
 */
export async function prepareAndValidateImage(
  imageInput: string | File | Blob
): Promise<{ blob: Blob; format: 'jpeg' | 'png' | 'webp'; byteLength: number }> {
  if (!imageInput) {
    throw new Error('No image file or data provided.');
  }

  // Case 1: Base64 Data URL string
  if (typeof imageInput === 'string') {
    if (!imageInput.startsWith('data:')) {
      throw new Error('String image input must be a valid Data URL (e.g. data:image/jpeg;base64,...).');
    }

    const commaIndex = imageInput.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Invalid Base64 Data URL structure: missing comma separator.');
    }

    const base64Content = imageInput.substring(commaIndex + 1);
    if (!base64Content.trim()) {
      throw new Error('Image file is empty (0 bytes).');
    }

    let bytes: Uint8Array;
    try {
      bytes = base64ToUint8Array(base64Content);
    } catch {
      throw new Error('Failed to decode Base64 image data.');
    }

    const validation = validateImageBuffer(bytes, MAX_IMAGE_FILE_SIZE);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image buffer.');
    }

    const format = validation.format!;
    const blob = new Blob([bytes], { type: `image/${format}` });
    return { blob, format, byteLength: bytes.byteLength };
  }

  // Case 2: File or Blob instance
  if (imageInput instanceof Blob) {
    if (imageInput.size === 0) {
      throw new Error('Image file is empty (0 bytes).');
    }

    if (imageInput.size > MAX_IMAGE_FILE_SIZE) {
      const sizeMb = (imageInput.size / (1024 * 1024)).toFixed(2);
      throw new Error(`Image file exceeds maximum allowed size of 5.0MB (received ${sizeMb}MB).`);
    }

    // Inspect first 16 bytes for magic number verification
    const slice = imageInput.slice(0, 16);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const format = detectImageFormatFromBytes(bytes);

    if (!format) {
      throw new Error('Unsupported image format or invalid image header. Only JPEG, PNG, and WebP are allowed.');
    }

    return { blob: imageInput, format, byteLength: imageInput.size };
  }

  throw new Error('Unsupported image input type. Expected Data URL, File, or Blob.');
}

/**
 * Cloudinary Upload Service
 * Manages signed backend authorization and direct client-to-Cloudinary image uploads.
 */
export class CloudinaryService {
  /**
   * Uploads a product image directly to Cloudinary using signed authorization from the backend.
   *
   * @param itemId Product identifier to scope the upload.
   * @param imageInput Base64 Data URL, File, or Blob.
   * @param options Optional configuration (customFetch, signEndpoint, idToken).
   */
  public static async uploadProductImage(
    itemId: string,
    imageInput: string | File | Blob,
    options?: UploadImageOptions
  ): Promise<CloudinaryUploadResult> {
    // 1. Validate itemId
    if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
      throw new Error('Valid itemId is required for image upload.');
    }
    const cleanItemId = itemId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanItemId) {
      throw new Error('itemId contains no valid alphanumeric characters.');
    }

    // 2. Prepare & Validate Image (magic bytes & 5MB limit)
    const { blob, format } = await prepareAndValidateImage(imageInput);

    // 3. Resolve Firebase Authentication ID Token
    let idToken = options?.idToken;
    if (!idToken) {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication required: no user is currently signed in.');
      }
      idToken = await currentUser.getIdToken();
      if (!idToken) {
        throw new Error('Failed to retrieve authentication token.');
      }
    }

    const fetchFn = options?.customFetch || fetch;

    // 4. Request Upload Signature from Backend
    const signUrl = options?.signEndpoint || '/api/cloudinary/sign';
    let signRes: Response;
    try {
      signRes = await fetchFn(signUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: cleanItemId }),
      });
    } catch (netErr: any) {
      throw new Error(`Network error requesting upload authorization: ${netErr?.message || String(netErr)}`);
    }

    if (!signRes.ok) {
      const errPayload = await signRes.json().catch(() => null);
      const errMsg = errPayload?.error || `Upload authorization failed with HTTP ${signRes.status}.`;
      throw new Error(errMsg);
    }

    let signData: any;
    try {
      signData = await signRes.json();
    } catch {
      throw new Error('Malformed JSON response from upload authorization service.');
    }

    if (!signData?.signature || !signData?.apiKey || !signData?.cloudName || !signData?.timestamp || !signData?.publicId) {
      throw new Error('Incomplete signature authorization payload returned by server.');
    }

    // 5. Construct Multipart Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', blob, `${cleanItemId}.${format}`);
    formData.append('api_key', String(signData.apiKey));
    formData.append('timestamp', String(signData.timestamp));
    formData.append('signature', String(signData.signature));
    formData.append('public_id', String(signData.publicId));
    formData.append('folder', String(signData.folder || ''));
    formData.append('allowed_formats', 'jpg,png,webp');
    formData.append('max_file_size', '5242880');

    let uploadRes: Response;
    try {
      uploadRes = await fetchFn(uploadUrl, {
        method: 'POST',
        body: formData,
      });
    } catch (netErr: any) {
      throw new Error(`Network error uploading to Cloudinary: ${netErr?.message || String(netErr)}`);
    }

    if (!uploadRes.ok) {
      const cErr = await uploadRes.json().catch(() => null);
      const cMsg = cErr?.error?.message || `Cloudinary rejected upload with HTTP ${uploadRes.status}.`;
      throw new Error(cMsg);
    }

    let cData: any;
    try {
      cData = await uploadRes.json();
    } catch {
      throw new Error('Malformed JSON response received from Cloudinary.');
    }

    const secureUrl = cData?.secure_url;
    if (!secureUrl || typeof secureUrl !== 'string') {
      throw new Error('Cloudinary response did not contain a secure_url.');
    }

    // 6. Strict validation: Ensure returned HTTPS URL is authentically hosted on res.cloudinary.com
    if (!isValidCloudinaryUrl(secureUrl)) {
      throw new Error(`Untrusted Cloudinary response URL: "${secureUrl}" is not a valid res.cloudinary.com HTTPS URL.`);
    }

    return {
      imageUrl: secureUrl.trim(),
      publicId: cData.public_id || signData.publicId,
      format: cData.format,
      bytes: cData.bytes,
      width: cData.width,
      height: cData.height,
    };
  }
}

// Convenient top-level export alias
export const uploadProductImage = CloudinaryService.uploadProductImage;

