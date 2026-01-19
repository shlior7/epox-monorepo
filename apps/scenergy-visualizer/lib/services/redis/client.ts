/**
 * Redis Client for scenergy-visualizer
 *
 * Used for:
 * - Distributed rate limiting
 * - Job queue state management
 * - Caching
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

  async mget<T = string>(...keys: string[]): Promise<Array<T | null>> {
    const values = await ioredis.mget(...keys);
    return values as Array<T | null>;
  },

  async keys(pattern: string): Promise<string[]> {
    return ioredis.keys(pattern);
  },

  async del(key: string): Promise<number> {
    return ioredis.del(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return ioredis.expire(key, ttlSeconds);
  },

  async scan(
    cursor: string | number,
    options: { match?: string; count?: number } = {}
  ): Promise<[number, string[]]> {
    const numCursor = typeof cursor === 'string' ? parseInt(cursor, 10) : cursor;
    let result: [string, string[]];

    if (options.match && options.count) {
      result = await ioredis.scan(numCursor, 'MATCH', options.match, 'COUNT', options.count);
    } else if (options.match) {
      result = await ioredis.scan(numCursor, 'MATCH', options.match);
    } else if (options.count) {
      result = await ioredis.scan(numCursor, 'COUNT', options.count);
    } else {
      result = await ioredis.scan(numCursor);
    }

    return [parseInt(result[0], 10), result[1]];
  },

  async incr(key: string): Promise<number> {
    return ioredis.incr(key);
  },

  async ttl(key: string): Promise<number> {
    return ioredis.ttl(key);
  },
};
