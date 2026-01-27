/**
 * Redis Client for scenergy-visualizer
 *
 * Used for:
 * - Distributed rate limiting
 * - Job queue state management
 * - Caching
 */

import Redis from 'ioredis';

let ioredis: Redis | null = null;

function getRedisClient(): Redis {
  if (ioredis) {
    return ioredis;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  ioredis = new Redis(redisUrl);

  ioredis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  ioredis.on('connect', () => {
    console.log('Connected to Redis');
  });

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

  async get<T = string>(key: string): Promise<T | null> {
    const value = await getRedisClient().get(key);
    return value as T | null;
  },

  async mget<T = string>(...keys: string[]): Promise<Array<T | null>> {
    const values = await getRedisClient().mget(...keys);
    return values as Array<T | null>;
  },

  async keys(pattern: string): Promise<string[]> {
    return getRedisClient().keys(pattern);
  },

  async del(key: string): Promise<number> {
    return getRedisClient().del(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return getRedisClient().expire(key, ttlSeconds);
  },

  async scan(cursor: string | number, options: { match?: string; count?: number } = {}): Promise<[number, string[]]> {
    const client = getRedisClient();
    const numCursor = typeof cursor === 'string' ? parseInt(cursor, 10) : cursor;
    let result: [string, string[]];

    if (options.match && options.count) {
      result = await client.scan(numCursor, 'MATCH', options.match, 'COUNT', options.count);
    } else if (options.match) {
      result = await client.scan(numCursor, 'MATCH', options.match);
    } else if (options.count) {
      result = await client.scan(numCursor, 'COUNT', options.count);
    } else {
      result = await client.scan(numCursor);
    }

    return [parseInt(result[0], 10), result[1]];
  },

  async incr(key: string): Promise<number> {
    return getRedisClient().incr(key);
  },

  async ttl(key: string): Promise<number> {
    return getRedisClient().ttl(key);
  },
};
