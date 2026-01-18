/**
 * Per-Test Setup
 * Runs before each test file - cleans database tables
 */

import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach, afterAll } from 'vitest';
import { getTestDb, closeTestDb, type TestDrizzleClient } from './test-client';

// Shared test database instance
export let testDb: TestDrizzleClient;

beforeAll(async () => {
  testDb = getTestDb();
});

beforeEach(async () => {
  // Truncate all tables before each test for isolation
  // Order matters due to foreign key constraints
  try {
    await testDb.execute(sql`
      TRUNCATE TABLE
        generated_asset_product,
        favorite_image,
        generated_asset,
        generation_event,
        store_sync_log,
        store_connection,
        message,
        generation_flow,
        collection_session,
        chat_session,
        product_image,
        product,
        member,
        invitation,
        session,
        account,
        verification,
        admin_session,
        admin_user,
        client,
        "user"
      RESTART IDENTITY CASCADE
    `);
  } catch (error) {
    // If tables don't exist (schema not fully pushed), warn and continue
    const isTableNotFoundError = error instanceof Error && error.message.includes('does not exist');
    if (isTableNotFoundError) {
      console.warn('⚠️  Some tables do not exist. Schema may be incomplete.');
    } else {
      throw error;
    }
  }
});

afterAll(async () => {
  // Close the connection after all tests in this file
  await closeTestDb();
});

// Helper to get the test database in tests
export function getDb(): TestDrizzleClient {
  return testDb;
}
