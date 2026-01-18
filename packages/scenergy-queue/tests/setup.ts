/**
 * Test Setup
 *
 * Configures environment and provides test utilities.
 * Supports both MOCK and REAL database strategies.
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

export const TEST_CONFIG = {
  redis: {
    url: process.env.TEST_REDIS_URL ?? 'redis://localhost:6399',
  },
  db: {
    // Uses visualizer-db's docker-compose.test.yml
    url: process.env.TEST_DATABASE_URL ?? 'postgresql://test:test@localhost:5434/visualizer_test',
  },
  storage: {
    rootDir: path.join(process.cwd(), 'tests/.test-storage'),
    publicUrl: 'http://localhost:3000/test-storage',
  },
};

// Set environment variables
process.env.REDIS_URL = TEST_CONFIG.redis.url;
process.env.DATABASE_URL = TEST_CONFIG.db.url;
process.env.NODE_ENV = 'test';

// ============================================================================
// REDIS UTILITIES
// ============================================================================

let testRedis: Redis | null = null;

export function getTestRedis(): Redis {
  if (!testRedis) {
    testRedis = new Redis(TEST_CONFIG.redis.url, { maxRetriesPerRequest: null });
  }
  return testRedis;
}

export async function cleanupRedis(patterns: string[] = ['*']): Promise<void> {
  const redis = getTestRedis();
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

export async function cleanupStorage(): Promise<void> {
  try {
    await fs.rm(TEST_CONFIG.storage.rootDir, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }
  await fs.mkdir(TEST_CONFIG.storage.rootDir, { recursive: true });
}

// ============================================================================
// GLOBAL SETUP / TEARDOWN
// ============================================================================

beforeAll(async () => {
  await cleanupStorage();
  await cleanupRedis();
});

beforeEach(async () => {
  await cleanupRedis(['bull:*', 'job-status:*']);
});

afterAll(async () => {
  await cleanupStorage();
  if (testRedis) {
    await testRedis.quit();
    testRedis = null;
  }
});

// ============================================================================
// TEST STRATEGY HELPERS
// ============================================================================

export type TestStrategy = 'mock' | 'real';

/**
 * Determine the test strategy based on environment
 */
export function getTestStrategy(): TestStrategy {
  // Default to mock for unit tests, real for integration/e2e
  const testPath = expect.getState().testPath ?? '';
  if (testPath.includes('/e2e/') || testPath.includes('/integration/')) {
    return 'real';
  }
  return 'mock';
}

/**
 * Log which test strategy is being used
 */
export function logTestStrategy(strategy: TestStrategy, context?: string): void {
  const emoji = strategy === 'mock' ? '🧪' : '🐘';
  const label = strategy === 'mock' ? 'MOCK (fast)' : 'REAL (PostgreSQL)';
  console.log(`\n${emoji} Test Strategy: ${label}${context ? ` - ${context}` : ''}\n`);
}
