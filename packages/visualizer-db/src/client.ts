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
let _wsConfigured = false;

/**
 * Configure WebSocket for Neon in Node.js environment
 * Uses 'ws' package for WebSocket support since Node.js doesn't have native WebSocket
 */
function configureWebSocket() {
  if (_wsConfigured) return;
  _wsConfigured = true;

  const isNode = typeof process !== 'undefined' && process.versions?.node;

  if (isNode && !neonConfig.webSocketConstructor) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ws = require('ws');
      neonConfig.webSocketConstructor = ws.default || ws;
    } catch {
      // ws not available, will use native WebSocket if available
      const globalAny = globalThis as Record<string, unknown>;
      if (globalAny.WebSocket) {
        neonConfig.webSocketConstructor = globalAny.WebSocket as typeof WebSocket;
      }
    }
  }
}

function createPool() {
  configureWebSocket();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
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
