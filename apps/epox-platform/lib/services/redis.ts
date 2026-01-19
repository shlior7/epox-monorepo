/**
 * Redis Client for epox-platform
 *
 * Used for:
 * - Distributed rate limiting (critical for multi-instance deployments)
 * - Caching
 * - Session management
 */

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not set');
}

const ioredis = new Redis(redisUrl);

ioredis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

ioredis.on('connect', () => {
  console.log('Connected to Redis');
});

/**
 * Redis client wrapper with custom method signatures for backwards compatibility
 */
export const redis = {
  async set(key: string, value: string, options?: { ex?: number }): Promise<'OK'> {
    if (options?.ex) {
      await ioredis.set(key, value, 'EX', options.ex);
    } else {
      await ioredis.set(key, value);
    }
    return 'OK';
  },

  async get<T = string>(key: string): Promise<T | null> {
    const value = await ioredis.get(key);
    return value as T | null;
  },

  async incr(key: string): Promise<number> {
    return ioredis.incr(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return ioredis.expire(key, ttlSeconds);
  },

  async ttl(key: string): Promise<number> {
    return ioredis.ttl(key);
  },

  async del(key: string): Promise<number> {
    return ioredis.del(key);
  },
};
