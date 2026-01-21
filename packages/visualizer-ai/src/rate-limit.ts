/**
 * Rate Limiting for AI Service Calls
 *
 * Hybrid rate limiting with automatic Redis fallback:
 * - PRODUCTION: Uses distributed Redis rate limiting (multi-instance safe)
 * - DEVELOPMENT: Falls back to in-memory (when Redis unavailable)
 *
 * Rate limits are configurable per model and per operation type:
 * - Per-model: AI_RATE_LIMIT_MODEL_<MODEL_NAME>=<rpm>
 * - Per-category: AI_RATE_LIMIT_TEXT, AI_RATE_LIMIT_VISION, AI_RATE_LIMIT_IMAGE, AI_RATE_LIMIT_VIDEO
 *
 * Gemini/Vertex AI rate limits are per-model and per-project:
 * - RPM (Requests per minute)
 * - TPM (Tokens per minute) - not tracked here, handled by API
 * - RPD (Requests per day) - optional daily limits
 *
 * Model limits vary by tier (Free, Tier 1, Tier 2, Enterprise).
 * See: https://ai.google.dev/gemini-api/docs/quota
 */

import { isRedisAvailable, checkRateLimitRedis, withRateLimitRedis } from './rate-limit-redis';
export { initRedisRateLimiter, type RedisClient } from './rate-limit-redis';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Rate limit configuration for a specific model or category.
 * Gemini limits are typically RPM (requests per minute).
 */
export interface RateLimitConfig {
  /** Requests per minute (RPM) */
  rpm: number;
  /** Optional: Requests per day (RPD) - if set, enforces daily limit */
  rpd?: number;
  /** Window duration in seconds (default: 60 for RPM) */
  windowSeconds?: number;
}

/**
 * Default rate limits by category (fallback when model-specific not set).
 * These are conservative defaults for Tier 1 / low usage.
 * Adjust via environment variables for your tier.
 */
const DEFAULT_CATEGORY_LIMITS: Record<string, RateLimitConfig> = {
  text: { rpm: parseInt(process.env.AI_RATE_LIMIT_TEXT ?? '50', 10) },
  vision: { rpm: parseInt(process.env.AI_RATE_LIMIT_VISION ?? '30', 10) },
  image: { rpm: parseInt(process.env.AI_RATE_LIMIT_IMAGE ?? '20', 10) },
  video: { rpm: parseInt(process.env.AI_RATE_LIMIT_VIDEO ?? '10', 10) },
};

/**
 * Model-specific rate limits.
 * These override category defaults when a specific model is used.
 *
 * Format: AI_RATE_LIMIT_MODEL_<MODEL_KEY>=<rpm>
 * Example: AI_RATE_LIMIT_MODEL_GEMINI_2_5_PRO=1000
 *
 * Model keys are normalized: dots become underscores, dashes become underscores, uppercase.
 * e.g., "gemini-2.5-pro" -> "GEMINI_2_5_PRO"
 */
const MODEL_LIMITS: Record<string, RateLimitConfig> = {};

// Parse model-specific limits from environment
const MODEL_ENV_PREFIX = 'AI_RATE_LIMIT_MODEL_';
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith(MODEL_ENV_PREFIX) && value) {
    const modelKey = key.slice(MODEL_ENV_PREFIX.length).toLowerCase().replace(/_/g, '-');
    MODEL_LIMITS[modelKey] = { rpm: parseInt(value, 10) };
  }
}

/**
 * Map operation keys to categories for fallback lookup.
 */
const OPERATION_TO_CATEGORY: Record<string, string> = {
  // Text/analysis operations
  'gemini-text': 'text',
  'product-analysis': 'text',
  // Vision operations (image analysis)
  'gemini-vision-scene': 'vision',
  'gemini-vision-components': 'vision',
  'gemini-vision-product': 'vision',
  'gemini-vision-inspiration': 'vision',
  'gemini-vision-subject': 'vision',
  'gemini-vision-enhance-prompt': 'vision',
  'scene-analysis': 'vision',
  // Image generation operations
  'gemini-image-edit': 'image',
  'gemini-image-generate': 'image',
  'image-generation': 'image',
  // Video generation operations
  'gemini-video-generate': 'video',
  'video-generation': 'video',
};

/**
 * Get rate limit config for a given key.
 * Priority: 1) Model-specific, 2) Category default, 3) Text fallback
 */
function getRateLimitConfig(key: string): RateLimitConfig {
  // Check if key is a model name (contains version numbers or known model patterns)
  const normalizedKey = key.toLowerCase().replace(/_/g, '-');

  // Check model-specific limits first
  if (MODEL_LIMITS[normalizedKey]) {
    return MODEL_LIMITS[normalizedKey];
  }

  // Check category mapping
  const category = OPERATION_TO_CATEGORY[key] ?? OPERATION_TO_CATEGORY[normalizedKey];
  if (category && DEFAULT_CATEGORY_LIMITS[category]) {
    return DEFAULT_CATEGORY_LIMITS[category];
  }

  // Infer category from key prefix
  if (key.startsWith('gemini-text') || key.includes('analysis')) {
    return DEFAULT_CATEGORY_LIMITS.text;
  }
  if (key.startsWith('gemini-vision')) {
    return DEFAULT_CATEGORY_LIMITS.vision;
  }
  if (key.startsWith('gemini-image')) {
    return DEFAULT_CATEGORY_LIMITS.image;
  }
  if (key.startsWith('gemini-video')) {
    return DEFAULT_CATEGORY_LIMITS.video;
  }

  // Default to text category
  return DEFAULT_CATEGORY_LIMITS.text;
}

// =============================================================================
// IN-MEMORY LIMITER
// =============================================================================

interface CounterState {
  count: number;
  resetAt: number;
  limit: number;
  windowSeconds: number;
}

const windowCounters = new Map<string, CounterState>();
const dailyCounters = new Map<string, CounterState>();

function getCounterState(map: Map<string, CounterState>, key: string, limit: number, windowSeconds: number): CounterState {
  const now = Date.now();
  const existing = map.get(key);

  if (!existing || existing.resetAt <= now || existing.windowSeconds !== windowSeconds || existing.limit !== limit) {
    const state: CounterState = {
      count: 0,
      resetAt: now + windowSeconds * 1000,
      limit,
      windowSeconds,
    };
    map.set(key, state);
    return state;
  }

  return existing;
}

function getLimiterState(key: string, config: RateLimitConfig) {
  const windowSeconds = config.windowSeconds ?? 60;
  const windowState = getCounterState(windowCounters, key, config.rpm, windowSeconds);
  const dailyState = config.rpd ? getCounterState(dailyCounters, `${key}:daily`, config.rpd, 24 * 60 * 60) : null;

  const windowRemaining = config.rpm - windowState.count;
  const dailyRemaining = dailyState ? config.rpd! - dailyState.count : Number.POSITIVE_INFINITY;
  const remaining = Math.max(0, Math.min(windowRemaining, dailyRemaining));
  const reset = dailyRemaining <= 0 && dailyState ? dailyState.resetAt : windowState.resetAt;

  return { windowState, dailyState, windowRemaining, dailyRemaining, remaining, reset };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Result of a rate-limited operation
 */
export type RateLimitResult<T> = { success: true; data: T } | { success: false; retryAfter: number; remaining: number };

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(
    public readonly retryAfter: number,
    public readonly remaining: number,
    public readonly resetTime: number
  ) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Wrap an AI service call with rate limiting.
 * Checks capacity BEFORE making the API call.
 *
 * @param key - Rate limit key. Can be:
 *   - Operation type: 'gemini-image-generate', 'gemini-vision-scene', etc.
 *   - Model name: 'gemini-2.5-pro', 'gemini-2.0-flash', etc.
 *   - Custom key that maps to a category
 * @param operation - The async operation to execute if rate limit allows
 * @returns The operation result or a rate limit error with retry info
 *
 * @example
 * ```typescript
 * // By operation type (uses category limits)
 * const result = await withRateLimit('gemini-vision-scene', () =>
 *   geminiService.analyzeScene(imageUrl)
 * );
 *
 * // By model name (uses model-specific limits if configured)
 * const result = await withRateLimit('gemini-2.5-pro', () =>
 *   geminiService.generateImages(request)
 * );
 * ```
 */
export async function withRateLimit<T>(key: string, operation: () => Promise<T>): Promise<RateLimitResult<T>> {
  const config = getRateLimitConfig(key);

  // Use Redis if available (production), otherwise fall back to in-memory (development)
  if (isRedisAvailable()) {
    try {
      return await withRateLimitRedis(key, config, operation);
    } catch (error) {
      console.warn('⚠️ Redis rate limit failed, falling back to in-memory:', error);
      // Fall through to in-memory implementation
    }
  }

  // In-memory fallback
  const { windowState, dailyState, windowRemaining, dailyRemaining, remaining, reset } = getLimiterState(key, config);

  if (windowRemaining <= 0 || dailyRemaining <= 0) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { success: false, retryAfter, remaining };
  }

  windowState.count += 1;
  if (dailyState) {
    dailyState.count += 1;
  }

  const data = await operation();
  return { success: true, data };
}

/**
 * Check if rate limit is available without consuming a token.
 * Useful for pre-flight checks before expensive operations.
 */
export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
}> {
  const config = getRateLimitConfig(key);

  // Use Redis if available (production), otherwise fall back to in-memory (development)
  if (isRedisAvailable()) {
    try {
      return await checkRateLimitRedis(key, config);
    } catch (error) {
      console.warn('⚠️ Redis rate limit check failed, falling back to in-memory:', error);
      // Fall through to in-memory implementation
    }
  }

  // In-memory fallback
  const { remaining, reset } = getLimiterState(key, config);

  return {
    allowed: remaining > 0,
    remaining,
    reset,
  };
}

/**
 * Get current rate limit configuration for a key.
 * Useful for debugging or displaying limits to users.
 */
export function getRateLimitInfo(key: string): RateLimitConfig & { category: string; isModelSpecific: boolean } {
  const normalizedKey = key.toLowerCase().replace(/_/g, '-');
  const isModelSpecific = !!MODEL_LIMITS[normalizedKey];
  const config = getRateLimitConfig(key);
  const category = OPERATION_TO_CATEGORY[key] ?? OPERATION_TO_CATEGORY[normalizedKey] ?? 'text';

  return {
    ...config,
    category,
    isModelSpecific,
  };
}

/**
 * Set a rate limit for a specific model at runtime.
 * Useful for dynamic configuration or testing.
 */
export function setModelRateLimit(modelKey: string, config: RateLimitConfig): void {
  const normalizedKey = modelKey.toLowerCase().replace(/_/g, '-');
  MODEL_LIMITS[normalizedKey] = config;
  windowCounters.clear();
  dailyCounters.clear();
}

/**
 * Set a rate limit for a category at runtime.
 */
export function setCategoryRateLimit(category: string, config: RateLimitConfig): void {
  DEFAULT_CATEGORY_LIMITS[category] = config;
  windowCounters.clear();
  dailyCounters.clear();
}

/**
 * Reset all rate limiters (for testing)
 */
export function resetRateLimiters(): void {
  windowCounters.clear();
  dailyCounters.clear();
}

/**
 * Get all configured rate limits (for debugging/monitoring)
 */
export function getAllRateLimits(): {
  categories: Record<string, RateLimitConfig>;
  models: Record<string, RateLimitConfig>;
} {
  return {
    categories: { ...DEFAULT_CATEGORY_LIMITS },
    models: { ...MODEL_LIMITS },
  };
}
