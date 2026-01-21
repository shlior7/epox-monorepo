/**
 * Test Database Client
 * Uses standard pg driver for local testing instead of Neon serverless
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema/index';

// Connection pool for tests
let _pool: Pool | null = null;
let _testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getTestConnectionString(): string {
  return process.env.DATABASE_URL || 'postgresql://test:test@localhost:5434/visualizer_test';
}

export function getTestPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: getTestConnectionString(),
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return _pool;
}

export function getTestDb() {
  if (!_testDb) {
    _testDb = drizzle(getTestPool(), { schema });
  }
  return _testDb;
}

export async function closeTestDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _testDb = null;
  }
}

// Re-export the test client type for repositories
export type TestDrizzleClient = ReturnType<typeof getTestDb>;
