/**
 * Local Device Storage for Product Images.
 * Product images are stored strictly on the local device (localStorage) and NEVER uploaded to Cloud Firestore.
 */

const LOCAL_IMAGES_STORAGE_KEY = 'price_manager_local_product_images';

// In-memory cache for synchronous instant access
let inMemoryImagesCache: Record<string, string> | null = null;

export const getAllLocalProductImages = (): Record<string, string> => {
  if (inMemoryImagesCache) return inMemoryImagesCache;
  try {
    const raw = localStorage.getItem(LOCAL_IMAGES_STORAGE_KEY);
    inMemoryImagesCache = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Failed to read local product images from storage", e);
    inMemoryImagesCache = {};
  }

  // Hydrate from existing price_manager_state if any items have imageUrl
  try {
    const rawState = localStorage.getItem('price_manager_state');
    if (rawState) {
      const parsed = JSON.parse(rawState);
      if (Array.isArray(parsed?.items)) {
        let added = false;
        for (const it of parsed.items) {
          if (it?.id && it?.imageUrl && !inMemoryImagesCache![it.id]) {
            inMemoryImagesCache![it.id] = it.imageUrl;
            added = true;
          }
        }
        if (added) {
          localStorage.setItem(LOCAL_IMAGES_STORAGE_KEY, JSON.stringify(inMemoryImagesCache));
        }
      }
    }
  } catch {
    // Ignore migration fallback errors
  }

  return inMemoryImagesCache || {};
};

export const getLocalProductImage = (itemId: string): string | undefined => {
  if (!itemId) return undefined;
  const all = getAllLocalProductImages();
  return all[itemId] || undefined;
};

export const saveLocalProductImage = (itemId: string, imageUrl: string): void => {
  if (!itemId || !imageUrl) return;
  const all = getAllLocalProductImages();
  all[itemId] = imageUrl;
  inMemoryImagesCache = all;
  try {
    localStorage.setItem(LOCAL_IMAGES_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("Failed to persist local product image to localStorage", e);
  }
};

export const removeLocalProductImage = (itemId: string): void => {
  if (!itemId) return;
  const all = getAllLocalProductImages();
  if (all[itemId]) {
    delete all[itemId];
    inMemoryImagesCache = all;
    try {
      localStorage.setItem(LOCAL_IMAGES_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn("Failed to remove local product image from localStorage", e);
    }
  }
};

export const removeMultipleLocalProductImages = (itemIds: string[]): void => {
  if (!itemIds || itemIds.length === 0) return;
  const all = getAllLocalProductImages();
  let changed = false;
  for (const id of itemIds) {
    if (all[id]) {
      delete all[id];
      changed = true;
    }
  }
  if (changed) {
    inMemoryImagesCache = all;
    try {
      localStorage.setItem(LOCAL_IMAGES_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn("Failed to update local product images in localStorage", e);
    }
  }
};
