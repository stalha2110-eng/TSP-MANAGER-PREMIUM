const CATEGORY_USAGE_STORAGE_KEY = 'ts_category_usage';

export interface CategoryUsageEntry {
  clicks: number;
  lastUsed: number;
}

export function getCategoryUsageMap(): Record<string, CategoryUsageEntry> {
  try {
    const raw = localStorage.getItem(CATEGORY_USAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function trackCategoryUsage(categoryId: string): void {
  if (!categoryId) return;
  try {
    const map = getCategoryUsageMap();
    const current = map[categoryId] || { clicks: 0, lastUsed: 0 };
    map[categoryId] = {
      clicks: (current.clicks || 0) + 1,
      lastUsed: Date.now(),
    };
    localStorage.setItem(CATEGORY_USAGE_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to track category usage', err);
  }
}

export function sortCategoriesByUsage<T extends { id: string; name: string }>(
  categories: T[],
  usageMap?: Record<string, CategoryUsageEntry>
): T[] {
  const map = usageMap || getCategoryUsageMap();
  return [...categories].sort((a, b) => {
    const usageA = map[a.id];
    const usageB = map[b.id];

    const lastUsedA = usageA?.lastUsed || 0;
    const lastUsedB = usageB?.lastUsed || 0;

    const clicksA = usageA?.clicks || 0;
    const clicksB = usageB?.clicks || 0;

    // Primary: Last used (most recently selected)
    if (lastUsedA !== lastUsedB) {
      return lastUsedB - lastUsedA;
    }

    // Secondary: Click / usage count
    if (clicksA !== clicksB) {
      return clicksB - clicksA;
    }

    // Fallback: Alphabetical
    return a.name.localeCompare(b.name);
  });
}
