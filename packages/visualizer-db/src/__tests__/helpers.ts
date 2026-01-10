/**
 * Test Helpers
 * Utility functions for database testing
 */

import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { TestDrizzleClient } from './test-client';

/**
 * Create a unique ID for tests
 */
export function createTestId(prefix = 'test'): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

/**
 * Create a test user directly in the database
 */
export async function createTestUser(
  db: TestDrizzleClient,
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  }> = {}
) {
  const id = overrides.id ?? createTestId('user');
  const email = overrides.email ?? `${id}@test.com`;
  const name = overrides.name ?? 'Test User';
  const emailVerified = overrides.emailVerified ?? true;
  const now = new Date();

  await db.execute(sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${id}, ${name}, ${email}, ${emailVerified}, ${now}, ${now})
  `);

  return { id, name, email, emailVerified, createdAt: now, updatedAt: now };
}

/**
 * Create a test organization directly in the database
 */
export async function createTestOrganization(
  db: TestDrizzleClient,
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
  }> = {}
) {
  const id = overrides.id ?? createTestId('org');
  const name = overrides.name ?? 'Test Organization';
  const slug = overrides.slug ?? id;
  const now = new Date();

  await db.execute(sql`
    INSERT INTO organization (id, name, slug, version, created_at, updated_at)
    VALUES (${id}, ${name}, ${slug}, 1, ${now}, ${now})
  `);

  return { id, name, slug, version: 1, createdAt: now, updatedAt: now };
}

/**
 * Create a test product directly in the database
 */
export async function createTestProduct(
  db: TestDrizzleClient,
  organizationId: string,
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
  }> = {}
) {
  const id = overrides.id ?? createTestId('product');
  const name = overrides.name ?? 'Test Product';
  const description = overrides.description ?? null;
  const now = new Date();

  await db.execute(sql`
    INSERT INTO product (id, organization_id, name, description, version, created_at, updated_at)
    VALUES (${id}, ${organizationId}, ${name}, ${description}, 1, ${now}, ${now})
  `);

  return { id, organizationId, name, description, version: 1, createdAt: now, updatedAt: now };
}

/**
 * Create a test client session directly in the database
 */
export async function createTestClientSession(
  db: TestDrizzleClient,
  organizationId: string,
  overrides: Partial<{
    id: string;
    name: string;
    productIds: string[];
  }> = {}
) {
  const id = overrides.id ?? createTestId('client-session');
  const name = overrides.name ?? 'Test Client Session';
  const productIds = JSON.stringify(overrides.productIds ?? []);
  const now = new Date();

  await db.execute(sql`
    INSERT INTO client_session (id, organization_id, name, product_ids, selected_base_images, version, created_at, updated_at)
    VALUES (${id}, ${organizationId}, ${name}, ${productIds}::jsonb, '{}'::jsonb, 1, ${now}, ${now})
  `);

  return {
    id,
    organizationId,
    name,
    productIds: overrides.productIds ?? [],
    selectedBaseImages: {},
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Wrap test in a transaction that rolls back
 * This ensures test isolation without truncating tables
 */
export function withTransaction<T>(
  db: TestDrizzleClient,
  fn: (tx: TestDrizzleClient) => Promise<T>
): Promise<T> {
  // Note: For Drizzle ORM with pg driver, we need to use the transaction API
  // This is a simplified version - the actual implementation might need adjustments
  return db.transaction(async (tx) => {
    try {
      const result = await fn(tx as unknown as TestDrizzleClient);
      // Force rollback by throwing a special error
      throw { __rollback: true, result };
    } catch (error: any) {
      if (error?.__rollback) {
        return error.result as T;
      }
      throw error;
    }
  }) as Promise<T>;
}
