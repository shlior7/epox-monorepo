import { Redis } from '@upstash/redis';

/**
 * Serverless-friendly Redis client powered by Upstash REST API
 */
export const redis = Redis.fromEnv();
