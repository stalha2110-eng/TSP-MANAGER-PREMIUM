// Client-Side / Shared API Key Pool and Offline Pre-parser Utility

export interface RotationKey {
  id: string;
  name: string;
  key: string;
  lastUsed?: number;
  exhaustedUntil?: number; // Timestamp until which the key is in cooldown
  failCount: number;
}

class KeyPoolManager {
  private inMemoryKeys: RotationKey[] = [];
  private currentIdx = 0;

  /**
   * Initializes the pool with custom user keys and optional env keys
   */
  public syncKeys(customKeys: { id: string; name: string; key: string }[] = []) {
    const existingMap = new Map(this.inMemoryKeys.map(k => [k.key, k]));
    
    this.inMemoryKeys = customKeys.map((item, idx) => {
      const existing = existingMap.get(item.key);
      return {
        id: item.id || `key_${idx}`,
        name: item.name || `API Key #${idx + 1}`,
        key: item.key.trim(),
        lastUsed: existing?.lastUsed || 0,
        exhaustedUntil: existing?.exhaustedUntil || 0,
        failCount: existing?.failCount || 0
      };
    }).filter(k => Boolean(k.key));
  }

  /**
   * Gets the next active, non-exhausted API key
   */
  public getNextAvailableKey(preferredKeyId?: string | null): string | null {
    const now = Date.now();

    // 1. If user explicitly selected a preferred key and it's not exhausted
    if (preferredKeyId && preferredKeyId !== 'default') {
      const preferred = this.inMemoryKeys.find(k => k.id === preferredKeyId);
      if (preferred && (!preferred.exhaustedUntil || preferred.exhaustedUntil < now)) {
        preferred.lastUsed = now;
        return preferred.key;
      }
    }

    // 2. Filter keys that are not currently in cooldown
    const available = this.inMemoryKeys.filter(k => !k.exhaustedUntil || k.exhaustedUntil < now);
    if (available.length === 0) {
      // If all are exhausted, reset the one with the earliest expiration or return null
      return null;
    }

    // 3. Round-robin selection
    this.currentIdx = (this.currentIdx + 1) % available.length;
    const selected = available[this.currentIdx];
    selected.lastUsed = now;
    return selected.key;
  }

  /**
   * Marks a key as exhausted (HTTP 429 / Quota limit) for a given cooldown period
   */
  public markKeyExhausted(keyValue: string, cooldownMs = 60000) {
    const now = Date.now();
    const found = this.inMemoryKeys.find(k => k.key === keyValue.trim());
    if (found) {
      found.exhaustedUntil = now + cooldownMs;
      found.failCount += 1;
      console.warn(`[KeyPoolManager] Marked key "${found.name}" as exhausted until ${new Date(found.exhaustedUntil).toLocaleTimeString()}`);
    }
  }

  /**
   * Clears cooldown status for a key upon successful response
   */
  public markKeySuccess(keyValue: string) {
    const found = this.inMemoryKeys.find(k => k.key === keyValue.trim());
    if (found) {
      found.exhaustedUntil = 0;
      found.failCount = 0;
    }
  }

  /**
   * Returns list of configured keys with statuses
   */
  public getPoolStatus() {
    const now = Date.now();
    return this.inMemoryKeys.map(k => ({
      ...k,
      isCooldown: Boolean(k.exhaustedUntil && k.exhaustedUntil > now),
      remainingCooldownSec: k.exhaustedUntil && k.exhaustedUntil > now ? Math.ceil((k.exhaustedUntil - now) / 1000) : 0
    }));
  }
}

export const keyPoolManager = new KeyPoolManager();
