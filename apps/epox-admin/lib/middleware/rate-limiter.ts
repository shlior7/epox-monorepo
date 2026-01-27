/**
 * Rate Limiter Middleware - Prevent API abuse and quota exhaustion
 * Uses in-memory counters (per-process, non-distributed)
 *
 * Configuration via environment variables:
 * - RATE_LIMIT_TIER: 'free' | 'standard' | 'vertex' | 'unlimited' (default: 'standard')
 * - RATE_LIMIT_IMAGE_GENERATION: Max requests per 5 min for single image (overrides tier)
 * - RATE_LIMIT_BATCH: Max requests per 5 min for batch (overrides tier)
 * - RATE_LIMIT_POLLING: Max requests per min for status polling (overrides tier)
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../services/redis/client';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis key prefix for this limiter
}

/**
 * Rate limit tiers for different API quota levels
 */
const RATE_LIMIT_TIERS = {
  // Free tier Gemini API (~15 RPM)
  free: {
    imageGeneration: 10,
    batch: 5,
    polling: 100,
  },
  // Standard paid tier (~60 RPM)
  standard: {
    imageGeneration: 30,
    batch: 15,
    polling: 200,
  },
  // Vertex AI tier (higher quotas, ~100-1000 RPM)
  vertex: {
    imageGeneration: 100,
    batch: 50,
    polling: 500,
  },
  // Unlimited (for development/testing only)
  unlimited: {
    imageGeneration: 10000,
    batch: 10000,
    polling: 10000,
  },
} as const;

type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

/**
 * Get current rate limit tier from environment
 */
function getRateLimitTier(): RateLimitTier {
  const tier = process.env.RATE_LIMIT_TIER?.toLowerCase() as RateLimitTier;
  if (tier && tier in RATE_LIMIT_TIERS) {
    return tier;
  }
  return 'standard';
}

/**
 * Get rate limit value with environment override support
 */
function getRateLimitValue(configKey: 'imageGeneration' | 'batch' | 'polling', envKey: string): number {
  // Check for explicit override first
  const override = process.env[envKey];
  if (override) {
    const parsed = parseInt(override, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  // Fall back to tier-based value
  const tier = getRateLimitTier();
  return RATE_LIMIT_TIERS[tier][configKey];
}

/**
 * Rate limiter configurations for different endpoints
 * Values are determined by RATE_LIMIT_TIER or specific env overrides
 */
export const RateLimitConfigs = {
  // Image generation: configurable requests per 5 minutes per client
  imageGeneration: {
    windowMs: 5 * 60 * 1000,
    get maxRequests() {
      return getRateLimitValue('imageGeneration', 'RATE_LIMIT_IMAGE_GENERATION');
    },
    keyPrefix: 'ratelimit:generate',
  },
  // Batch generation: configurable requests per 5 minutes per client
  batch: {
    windowMs: 5 * 60 * 1000,
    get maxRequests() {
      return getRateLimitValue('batch', 'RATE_LIMIT_BATCH');
    },
    keyPrefix: 'ratelimit:batch',
  },
  // Job status polling: configurable requests per minute per client
  jobStatus: {
    windowMs: 60 * 1000,
    get maxRequests() {
      return getRateLimitValue('polling', 'RATE_LIMIT_POLLING');
    },
    keyPrefix: 'ratelimit:status',
  },
} as const;

/**
 * Get client identifier from request
 * Uses clientId from body/query, or falls back to IP address
 */
function getClientId(request: NextRequest, body?: any): string {
  // Try to get clientId from request body or query params
  const clientId = body?.clientId || request.nextUrl.searchParams.get('clientId');

  if (clientId) {
    return `client:${clientId}`;
  }

  // Fallback to IP address
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  return `ip:${ip}`;
}

/**
 * Rate limit a request using Redis
 * Returns true if request should be allowed, false if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const key = `${config.keyPrefix}:${identifier}`;
    const ttlSeconds = Math.ceil(config.windowMs / 1000);
    const now = Date.now();

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }

    if (count > config.maxRequests) {
      const ttl = await redis.ttl(key);
      const resetTime = ttl > 0 ? now + ttl * 1000 : now + config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: true,
      remaining: Math.max(config.maxRequests - count, 0),
      resetTime: ttl > 0 ? now + ttl * 1000 : now + config.windowMs,
    };
  } catch (error) {
    console.error('❌ Rate limiter error:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    };
  }
}

/**
 * Middleware function to apply rate limiting
 */
export async function rateLimit(request: NextRequest, config: RateLimitConfig, body?: any): Promise<NextResponse | null> {
  const identifier = getClientId(request, body);
  const result = await checkRateLimit(identifier, config);

  if (!result.allowed) {
    console.warn(`⚠️  Rate limit exceeded for ${identifier}`);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again later.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to response (will be added later)
  // Store in request context for later use
  (request as any).rateLimitHeaders = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };

  return null; // Allow request to continue
}

/**
 * Get rate limit headers from request context
 */
export function getRateLimitHeaders(request: NextRequest): Record<string, string> {
  return (request as any).rateLimitHeaders || {};
}
