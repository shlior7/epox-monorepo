/**
 * Neon Database Client (pooled)
 * Serverless Postgres connection using @neondatabase/serverless Pool
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index';

// Lazy initialization of the database client
let _db: ReturnType<typeof createDrizzleClient> | null = null;
let _pool: Pool | null = null;

function getWebSocketConstructor(): unknown {
  const globalAny = globalThis as Record<string, unknown>;
  return globalAny.WebSocket;
}

function createPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const webSocketConstructor = getWebSocketConstructor();
  if (webSocketConstructor) {
    neonConfig.webSocketConstructor = webSocketConstructor as any;
  }

  return new Pool({ connectionString: databaseUrl });
}

function createDrizzleClient() {
  _pool ??= createPool();
  return drizzle(_pool, { schema });
}

/**
 * Get the Drizzle database client (singleton)
 */
export function getDb() {
  _db ??= createDrizzleClient();
  return _db;
}

/**
 * Reset the database client (useful for testing)
 */
export function resetDb() {
  if (_pool) {
    void _pool.end();
  }
  _pool = null;
  _db = null;
}

// Export the Drizzle client type for use in repositories
export type DrizzleClient = ReturnType<typeof getDb>;
