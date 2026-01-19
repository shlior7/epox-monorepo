/**
 * Rate Limiting for AI Service Calls
 *
 * Uses Upstash Rate Limiting to prevent 429 errors by checking capacity
 * BEFORE making API calls. Works in serverless environments (Vercel).
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

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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
// REDIS & LIMITER MANAGEMENT
// =============================================================================

let redisInstance: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redisInstance = new Redis({ url, token });
  return redisInstance;
}

function getOrCreateLimiter(key: string, config: RateLimitConfig): Ratelimit | null {
  const cacheKey = `${key}:${config.rpm}:${config.windowSeconds ?? 60}`;

  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey)!;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const windowSeconds = config.windowSeconds ?? 60;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.rpm, `${windowSeconds} s`),
    prefix: `ai-ratelimit:${key}`,
    analytics: true,
  });

  limiterCache.set(cacheKey, limiter);
  return limiter;
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
  const limiter = getOrCreateLimiter(key, config);

  // If rate limiting is not configured (no Redis), just execute the operation
  if (!limiter) {
    const data = await operation();
    return { success: true, data };
  }

  const { success, remaining, reset } = await limiter.limit(key);

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { success: false, retryAfter, remaining };
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
  const limiter = getOrCreateLimiter(key, config);

  if (!limiter) {
    return { allowed: true, remaining: 999, reset: 0 };
  }

  const { remaining, reset } = await limiter.getRemaining(key);

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
  // Clear cached limiter for this model
  for (const [cacheKey] of limiterCache) {
    if (cacheKey.startsWith(normalizedKey)) {
      limiterCache.delete(cacheKey);
    }
  }
}

/**
 * Set a rate limit for a category at runtime.
 */
export function setCategoryRateLimit(category: string, config: RateLimitConfig): void {
  DEFAULT_CATEGORY_LIMITS[category] = config;
  // Clear cached limiters for this category
  for (const [key, cat] of Object.entries(OPERATION_TO_CATEGORY)) {
    if (cat === category) {
      for (const [cacheKey] of limiterCache) {
        if (cacheKey.startsWith(key)) {
          limiterCache.delete(cacheKey);
        }
      }
    }
  }
}

/**
 * Reset all rate limiters (for testing)
 */
export function resetRateLimiters(): void {
  limiterCache.clear();
  redisInstance = null;
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
