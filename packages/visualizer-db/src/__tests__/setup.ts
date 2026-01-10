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
  await testDb.execute(sql`
    TRUNCATE TABLE
      favorite_image,
      generated_image,
      message,
      flow,
      client_session,
      chat_session,
      product_image,
      product,
      member,
      invitation,
      session,
      account,
      verification,
      organization,
      "user"
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  // Close the connection after all tests in this file
  await closeTestDb();
});

// Helper to get the test database in tests
export function getDb(): TestDrizzleClient {
  return testDb;
}
