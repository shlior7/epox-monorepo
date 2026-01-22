/**
 * Distributed Rate Limiter using Redis
 *
 * Coordinates rate limiting across multiple worker instances.
 * Uses sliding window counter algorithm with atomic Redis operations.
 *
 * Keys:
 * - worker:rpm:<window> - Current minute's request count
 * - worker:config:rpm_limit - Global RPM limit (set by autoscaler)
 * - worker:config:per_worker_rpm - Per-worker RPM (set by autoscaler)
 */

import Redis from 'ioredis';
import { logger } from './logger';

export interface RateLimiterConfig {
  redisUrl: string;
  fallbackRpm: number; // Used when Redis is unavailable
  windowSeconds?: number; // Default: 60 (1 minute)
}

export class DistributedRateLimiter {
  private redis: Redis | null = null;
  private config: RateLimiterConfig;
  private windowSeconds: number;

  // In-memory fallback state
  private fallbackCount = 0;
  private fallbackWindowStart = Date.now();

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.windowSeconds = config.windowSeconds ?? 60;
  }

  async connect(): Promise<boolean> {
    if (!this.config.redisUrl) {
      logger.warn('No REDIS_URL provided, using in-memory rate limiting (single worker only!)');
      return false;
    }

    try {
      this.redis = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop retrying
          return Math.min(times * 100, 1000);
        },
      });

      // Test connection
      await this.redis.ping();
      logger.info('✅ Redis rate limiter connected');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect to Redis, falling back to in-memory');
      this.redis = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  /**
   * Check if we can process a job (pre-claim check)
   * Does NOT consume a token - just checks availability
   */
  async canProcess(): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    if (this.redis) {
      return this.canProcessRedis();
    }
    return this.canProcessFallback();
  }

  /**
   * Consume a rate limit token (call after successfully claiming a job)
   */
  async consume(): Promise<void> {
    if (this.redis) {
      await this.consumeRedis();
    } else {
      this.consumeFallback();
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(): Promise<{
    used: number;
    limit: number;
    remaining: number;
    resetIn: number;
  }> {
    if (this.redis) {
      return this.getStatusRedis();
    }
    return this.getStatusFallback();
  }

  // ============================================================================
  // REDIS IMPLEMENTATION
  // ============================================================================

  private getWindowKey(): string {
    const windowStart = Math.floor(Date.now() / 1000 / this.windowSeconds) * this.windowSeconds;
    return `worker:rpm:${windowStart}`;
  }

  private async getRpmLimit(): Promise<number> {
    if (!this.redis) return this.config.fallbackRpm;

    try {
      // Try to get per-worker RPM first (set by autoscaler)
      const perWorkerRpm = await this.redis.get('worker:config:per_worker_rpm');
      if (perWorkerRpm) {
        return parseInt(perWorkerRpm, 10);
      }

      // Fall back to global RPM limit
      const globalRpm = await this.redis.get('worker:config:rpm_limit');
      if (globalRpm) {
        return parseInt(globalRpm, 10);
      }

      return this.config.fallbackRpm;
    } catch {
      return this.config.fallbackRpm;
    }
  }

  private async canProcessRedis(): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    try {
      const key = this.getWindowKey();
      const limit = await this.getRpmLimit();

      // Get current count without incrementing
      const currentCount = parseInt((await this.redis!.get(key)) ?? '0', 10);
      const remaining = Math.max(0, limit - currentCount);

      return {
        allowed: currentCount < limit,
        remaining,
        limit,
      };
    } catch (error) {
      logger.warn({ err: error }, 'Redis rate limit check failed, allowing request');
      return { allowed: true, remaining: this.config.fallbackRpm, limit: this.config.fallbackRpm };
    }
  }

  private async consumeRedis(): Promise<void> {
    try {
      const key = this.getWindowKey();

      // Atomic increment with expiry
      const count = await this.redis!.incr(key);
      if (count === 1) {
        // Set expiry on first request in window
        await this.redis!.expire(key, this.windowSeconds + 5); // +5s buffer
      }
    } catch (error) {
      logger.warn({ err: error }, 'Redis rate limit consume failed');
    }
  }

  private async getStatusRedis(): Promise<{
    used: number;
    limit: number;
    remaining: number;
    resetIn: number;
  }> {
    try {
      const key = this.getWindowKey();
      const limit = await this.getRpmLimit();

      const [countStr, ttl] = await Promise.all([this.redis!.get(key), this.redis!.ttl(key)]);

      const used = parseInt(countStr ?? '0', 10);
      const remaining = Math.max(0, limit - used);
      const resetIn = ttl > 0 ? ttl : this.windowSeconds;

      return { used, limit, remaining, resetIn };
    } catch {
      return {
        used: 0,
        limit: this.config.fallbackRpm,
        remaining: this.config.fallbackRpm,
        resetIn: this.windowSeconds,
      };
    }
  }

  // ============================================================================
  // FALLBACK (IN-MEMORY) IMPLEMENTATION
  // ============================================================================

  private canProcessFallback(): { allowed: boolean; remaining: number; limit: number } {
    this.maybeResetFallbackWindow();
    const limit = this.config.fallbackRpm;
    const remaining = Math.max(0, limit - this.fallbackCount);

    return {
      allowed: this.fallbackCount < limit,
      remaining,
      limit,
    };
  }

  private consumeFallback(): void {
    this.maybeResetFallbackWindow();
    this.fallbackCount++;
  }

  private getStatusFallback(): {
    used: number;
    limit: number;
    remaining: number;
    resetIn: number;
  } {
    this.maybeResetFallbackWindow();
    const limit = this.config.fallbackRpm;
    const used = this.fallbackCount;
    const remaining = Math.max(0, limit - used);
    const resetIn = Math.ceil((this.fallbackWindowStart + this.windowSeconds * 1000 - Date.now()) / 1000);

    return { used, limit, remaining, resetIn: Math.max(0, resetIn) };
  }

  private maybeResetFallbackWindow(): void {
    const now = Date.now();
    if (now - this.fallbackWindowStart >= this.windowSeconds * 1000) {
      this.fallbackCount = 0;
      this.fallbackWindowStart = now;
    }
  }
}
