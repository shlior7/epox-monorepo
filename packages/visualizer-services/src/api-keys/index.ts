/**
 * Multi-API Key Management
 *
 * Supports multiple API keys for increased throughput and rate limit management.
 * Keys are discovered from environment variables with pattern:
 *   GOOGLE_AI_STUDIO_API_KEY (primary)
 *   GOOGLE_AI_STUDIO_API_KEY_2, GOOGLE_AI_STUDIO_API_KEY_3, etc.
 */

/**
 * API Key pool entry
 */
interface APIKeyEntry {
  key: string;
  index: number;
  usageCount: number;
  lastUsed: number;
  errors: number;
  disabled: boolean;
  disabledUntil?: number;
}

/**
 * API Key pool for managing multiple keys
 */
export class APIKeyPool {
  private keys: APIKeyEntry[] = [];
  private currentIndex = 0;
  private readonly cooldownMs: number;
  private readonly maxErrors: number;

  constructor(options?: { cooldownMs?: number; maxErrors?: number }) {
    this.cooldownMs = options?.cooldownMs ?? 60000; // 1 minute cooldown after errors
    this.maxErrors = options?.maxErrors ?? 5; // Disable after 5 consecutive errors
    this.discoverKeys();
  }

  /**
   * Discover API keys from environment variables
   */
  private discoverKeys(): void {
    // Primary key
    const primaryKey = process.env.GOOGLE_AI_STUDIO_API_KEY ?? process.env.GEMINI_API_KEY;
    if (primaryKey) {
      this.keys.push({
        key: primaryKey,
        index: 1,
        usageCount: 0,
        lastUsed: 0,
        errors: 0,
        disabled: false,
      });
    }

    // Additional keys (GOOGLE_AI_STUDIO_API_KEY_2, _3, etc.)
    for (let i = 2; i <= 20; i++) {
      const key = process.env[`GOOGLE_AI_STUDIO_API_KEY_${i}`] ?? process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        this.keys.push({
          key,
          index: i,
          usageCount: 0,
          lastUsed: 0,
          errors: 0,
          disabled: false,
        });
      }
    }

    console.log(`[APIKeyPool] Discovered ${this.keys.length} API key(s)`);
  }

  /**
   * Get the next available API key using round-robin
   */
  getNextKey(): string | null {
    if (this.keys.length === 0) {
      return null;
    }

    const now = Date.now();
    const startIndex = this.currentIndex;
    let attempts = 0;

    // Find next available key
    while (attempts < this.keys.length) {
      const entry = this.keys[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;

      // Re-enable if cooldown has passed
      if (entry.disabled && entry.disabledUntil && now >= entry.disabledUntil) {
        entry.disabled = false;
        entry.errors = 0;
        console.log(`[APIKeyPool] Key ${entry.index} re-enabled after cooldown`);
      }

      if (!entry.disabled) {
        entry.usageCount++;
        entry.lastUsed = now;
        return entry.key;
      }
    }

    // All keys are disabled - return the one that will be re-enabled soonest
    const soonest = this.keys.reduce((a, b) => {
      if (!a.disabledUntil) return b;
      if (!b.disabledUntil) return a;
      return a.disabledUntil < b.disabledUntil ? a : b;
    });

    console.warn(`[APIKeyPool] All keys disabled, forcing key ${soonest.index}`);
    return soonest.key;
  }

  /**
   * Report a successful API call
   */
  reportSuccess(key: string): void {
    const entry = this.keys.find((e) => e.key === key);
    if (entry) {
      entry.errors = 0; // Reset consecutive error count
    }
  }

  /**
   * Report an API error (429, 500, etc.)
   */
  reportError(key: string, isRateLimitError = false): void {
    const entry = this.keys.find((e) => e.key === key);
    if (!entry) return;

    entry.errors++;

    if (isRateLimitError || entry.errors >= this.maxErrors) {
      entry.disabled = true;
      entry.disabledUntil = Date.now() + this.cooldownMs;
      console.log(`[APIKeyPool] Key ${entry.index} disabled until ${new Date(entry.disabledUntil).toISOString()}`);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    available: number;
    disabled: number;
    usage: Array<{ index: number; usageCount: number; errors: number; disabled: boolean }>;
  } {
    const now = Date.now();
    const available = this.keys.filter(
      (k) => !k.disabled || (k.disabledUntil && now >= k.disabledUntil)
    ).length;

    return {
      total: this.keys.length,
      available,
      disabled: this.keys.length - available,
      usage: this.keys.map((k) => ({
        index: k.index,
        usageCount: k.usageCount,
        errors: k.errors,
        disabled: k.disabled,
      })),
    };
  }

  /**
   * Get total number of keys
   */
  get size(): number {
    return this.keys.length;
  }

  /**
   * Check if any keys are available
   */
  hasAvailableKeys(): boolean {
    return this.keys.some((k) => !k.disabled);
  }
}

// Singleton instance
let _apiKeyPool: APIKeyPool | null = null;

/**
 * Get the singleton API key pool
 */
export function getAPIKeyPool(): APIKeyPool {
  _apiKeyPool ??= new APIKeyPool();
  return _apiKeyPool;
}

/**
 * Reset the API key pool (for testing)
 */
export function resetAPIKeyPool(): void {
  _apiKeyPool = null;
}

/**
 * Get the next available API key
 */
export function getNextAPIKey(): string | null {
  return getAPIKeyPool().getNextKey();
}

/**
 * Report a successful API call for key rotation tracking
 */
export function reportAPIKeySuccess(key: string): void {
  getAPIKeyPool().reportSuccess(key);
}

/**
 * Report an API error for key rotation tracking
 */
export function reportAPIKeyError(key: string, isRateLimitError = false): void {
  getAPIKeyPool().reportError(key, isRateLimitError);
}

