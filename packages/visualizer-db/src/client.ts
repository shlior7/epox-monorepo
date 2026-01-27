/**
 * Database Client (pooled)
 * - Uses standard pg driver for local PostgreSQL (localhost)
 * - Uses @neondatabase/serverless for Neon cloud database
 */

import { Pool as PgPool } from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index';

// Lazy initialization of the database client
let _db: ReturnType<typeof createDrizzleClient> | null = null;
let _pool: PgPool | NeonPool | null = null;

/**
 * Detect if DATABASE_URL points to a local PostgreSQL instance
 */
function isLocalDatabase(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('host.docker.internal');
}

/**
 * Detect if DATABASE_URL points to a production cloud database
 */
function isProductionDatabase(url: string): boolean {
  return (
    url.includes('neon.tech') ||
    url.includes('amazonaws.com') ||
    url.includes('supabase.co') ||
    url.includes('planetscale.com')
  );
}

/**
 * Validate database connection to prevent accidental production access
 * @throws Error if attempting to connect to production from local/test environment
 */
function validateDatabaseConnection(url: string): void {
  const isProd = isProductionDatabase(url);
  const isDevEnv = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
  const isLocalUrl = isLocalDatabase(url);

  // Allow explicit bypass for intentional production operations (db:push, migrations)
  const allowProdAccess = process.env.ALLOW_PRODUCTION_ACCESS === 'true';

  // CRITICAL: Block production database in development/test (unless explicitly allowed)
  if (isProd && (isDevEnv || isTest) && !allowProdAccess) {
    const maskedUrl = url.substring(0, 30) + '***';
    throw new Error(
      '\n' +
        '🚨 BLOCKED: Attempting to connect to PRODUCTION database from local environment!\n\n' +
        `DATABASE_URL: ${maskedUrl}\n` +
        `NODE_ENV: ${process.env.NODE_ENV || 'undefined'}\n\n` +
        'This connection has been blocked to prevent accidental data loss.\n\n' +
        'To fix:\n' +
        '1. Update .env.local to use local PostgreSQL:\n' +
        "   DATABASE_URL='postgresql://postgres:postgres@localhost:5432/epox_dev'\n\n" +
        '2. Move production URL to .env.production (Vercel deployment only)\n\n' +
        'To intentionally push to production:\n' +
        '   ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="your-prod-url" yarn db:push\n\n' +
        'See packages/visualizer-db/SECURITY_RECOMMENDATIONS.md for details.\n'
    );
  }

  // WARN: Local database in production (might be intentional for preview deployments)
  if (isLocalUrl && !isDevEnv && !isTest) {
    console.warn(
      '⚠️  WARNING: Using local database in production environment.\n' +
        'If this is unintentional, check your DATABASE_URL configuration.\n'
    );
  }
}

/**
 * Configure WebSocket for Neon in Node.js environment.
 * This must be called before any database operations in Node.js.
 */
export async function configureWebSocket(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  // Skip WebSocket configuration for local databases
  if (!databaseUrl || isLocalDatabase(databaseUrl)) {
    return;
  }

  const isNode = typeof process !== 'undefined' && process.versions?.node;

  if (isNode) {
    try {
      if (!neonConfig.webSocketConstructor) {
        // Use dynamic import for ESM compatibility
        const ws = await import('ws');
        neonConfig.webSocketConstructor = ws.default as unknown as typeof WebSocket;
      }
    } catch (err) {
      console.warn(
        '[visualizer-db] WebSocket configuration failed. Install "ws" package for Node.js support.',
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

function createPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Ensure we're in Node.js environment (not browser)
  const isNode = typeof process !== 'undefined' && process.versions?.node;
  if (!isNode) {
    throw new Error('[visualizer-db] Database client can only be created in Node.js environment');
  }

  // CRITICAL: Validate connection to prevent accidental production access
  validateDatabaseConnection(databaseUrl);

  // Use standard pg driver for local databases (test environment)
  if (isLocalDatabase(databaseUrl)) {
    return new PgPool({ connectionString: databaseUrl });
  }

  // Use Neon serverless driver for cloud databases (production)
  return new NeonPool({ connectionString: databaseUrl });
}

function createDrizzleClient() {
  _pool ??= createPool();

  const databaseUrl = process.env.DATABASE_URL!;

  // Use node-postgres drizzle adapter for local databases
  if (isLocalDatabase(databaseUrl)) {
    return pgDrizzle(_pool as PgPool, { schema });
  }

  // Use neon-serverless drizzle adapter for cloud databases
  return neonDrizzle(_pool as NeonPool, { schema });
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
