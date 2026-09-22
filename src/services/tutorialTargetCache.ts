export interface StoredTutorialTargetCoords {
  targetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  lastScannedAt: number;
}

const STORAGE_KEY = 'munshi_pos_tutorial_button_coords_v1';

export const tutorialTargetCache = {
  getStoredCoords(targetId: string): StoredTutorialTargetCoords | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed[targetId] || null;
    } catch {
      return null;
    }
  },

  saveTargetCoords(targetId: string, bounds: { top: number; left: number; width: number; height: number; cx: number; cy: number }) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      existing[targetId] = {
        targetId,
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
        cx: bounds.cx,
        cy: bounds.cy,
        lastScannedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {}
  },

  getAllStored(): Record<string, StoredTutorialTargetCoords> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
};
