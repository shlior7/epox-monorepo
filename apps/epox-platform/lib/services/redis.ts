/**
 * Redis Client for epox-platform
 *
 * Used for:
 * - Distributed rate limiting (critical for multi-instance deployments)
 * - Caching
 * - Session management
 */

import Redis from 'ioredis';

let ioredis: Redis | null = null;

function createRedisClient(url?: string): Redis {
  const redisUrl = url || process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  const client = new Redis(redisUrl);

  client.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  client.on('connect', () => {
    console.log('Connected to Redis');
  });

  return client;
}

function getRedisClient(): Redis {
  if (!ioredis) {
    ioredis = createRedisClient();
  }
  return ioredis;
}

/**
 * Redis client wrapper with custom method signatures for backwards compatibility
 */
export const redis = {
  async set(key: string, value: string, options?: { ex?: number }): Promise<'OK'> {
    const client = getRedisClient();
    if (options?.ex) {
      await client.set(key, value, 'EX', options.ex);
    } else {
      await client.set(key, value);
    }
    return 'OK';
  },

  async get(key: string): Promise<string | null> {
    const client = getRedisClient();
    return client.get(key);
  },

  async getJson<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const value = await client.get(key);
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to parse JSON for key ${key}:`, error);
      return null;
    }
  },

  async incr(key: string): Promise<number> {
    const client = getRedisClient();
    return client.incr(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const client = getRedisClient();
    return client.expire(key, ttlSeconds);
  },

  async ttl(key: string): Promise<number> {
    const client = getRedisClient();
    return client.ttl(key);
  },

  async del(key: string): Promise<number> {
    const client = getRedisClient();
    return client.del(key);
  },
};
