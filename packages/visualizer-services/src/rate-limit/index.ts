/**
 * Rate Limiting for AI Service Calls
 *
 * Uses Upstash Rate Limiting to prevent 429 errors by checking capacity
 * BEFORE making API calls. Works in serverless environments (Vercel).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Default rate limits per minute
const DEFAULT_LIMITS = {
  text: parseInt(process.env.AI_RATE_LIMIT_TEXT ?? '50', 10),
  vision: parseInt(process.env.AI_RATE_LIMIT_VISION ?? '30', 10),
  image: parseInt(process.env.AI_RATE_LIMIT_IMAGE ?? '20', 10),
};

// Singleton rate limiters per operation type
let textLimiter: Ratelimit | null = null;
let visionLimiter: Ratelimit | null = null;
let imageLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function createLimiter(prefix: string, limit: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, '60 s'),
    prefix: `ai-ratelimit:${prefix}`,
    analytics: true,
  });
}

function getTextLimiter(): Ratelimit | null {
  textLimiter ??= createLimiter('text', DEFAULT_LIMITS.text);
  return textLimiter;
}

function getVisionLimiter(): Ratelimit | null {
  visionLimiter ??= createLimiter('vision', DEFAULT_LIMITS.vision);
  return visionLimiter;
}

function getImageLimiter(): Ratelimit | null {
  imageLimiter ??= createLimiter('image', DEFAULT_LIMITS.image);
  return imageLimiter;
}

function getLimiterForKey(key: string): Ratelimit | null {
  if (key.startsWith('gemini-text') || key === 'product-analysis') {
    return getTextLimiter();
  }
  if (key.startsWith('gemini-vision') || key === 'scene-analysis') {
    return getVisionLimiter();
  }
  if (key.startsWith('gemini-image') || key === 'image-generation') {
    return getImageLimiter();
  }
  // Default to text limiter
  return getTextLimiter();
}

/**
 * Result of a rate-limited operation
 */
export type RateLimitResult<T> =
  | { success: true; data: T }
  | { success: false; retryAfter: number; remaining: number };

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
 * @param key - Rate limit key (e.g., 'gemini-text', 'gemini-vision', 'product-analysis')
 * @param operation - The async operation to execute if rate limit allows
 * @returns The operation result or a rate limit error with retry info
 *
 * @example
 * ```typescript
 * const result = await withRateLimit('gemini-text', () =>
 *   productAnalysisService.analyzeProductWithAI(product)
 * );
 *
 * if (!result.success) {
 *   return NextResponse.json(
 *     { status: 'busy', retryAfter: result.retryAfter },
 *     { status: 503 }
 *   );
 * }
 *
 * return NextResponse.json(result.data);
 * ```
 */
export async function withRateLimit<T>(
  key: string,
  operation: () => Promise<T>
): Promise<RateLimitResult<T>> {
  const limiter = getLimiterForKey(key);

  // If rate limiting is not configured, just execute the operation
  if (!limiter) {
    const data = await operation();
    return { success: true, data };
  }

  const { success, remaining, reset } = await limiter.limit(key);

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return {
      success: false,
      retryAfter,
      remaining,
    };
  }

  const data = await operation();
  return { success: true, data };
}

/**
 * Check if rate limit is available without consuming a token.
 * Useful for pre-flight checks.
 */
export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
}> {
  const limiter = getLimiterForKey(key);

  if (!limiter) {
    return { allowed: true, remaining: 999, reset: 0 };
  }

  // Use remaining() to check without consuming
  const { remaining, reset } = await limiter.getRemaining(key);

  return {
    allowed: remaining > 0,
    remaining,
    reset,
  };
}

/**
 * Reset rate limiters (for testing)
 */
export function resetRateLimiters(): void {
  textLimiter = null;
  visionLimiter = null;
  imageLimiter = null;
}

