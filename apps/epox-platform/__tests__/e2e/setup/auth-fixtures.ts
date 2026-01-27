import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { hideNextDevOverlay } from '../helpers/hide-next-dev-overlay';
import { getTestClientByFeature } from './test-clients';

// Define test client types - feature-based
export type TestClientName = 'collections' | 'products' | 'store' | 'studio' | 'main';

export type TestClient = {
  id: string;
  name: string;
  email: string;
  password: string;
  storageState: string;
};

// Map client names to test client data
const TEST_CLIENT_MAP: Record<TestClientName, TestClient> = {
  collections: {
    id: getTestClientByFeature('collections').id,
    name: getTestClientByFeature('collections').name,
    email: getTestClientByFeature('collections').email,
    password: getTestClientByFeature('collections').password,
    storageState: path.join(__dirname, '../.auth/test-client-collections.json'),
  },
  products: {
    id: getTestClientByFeature('products').id,
    name: getTestClientByFeature('products').name,
    email: getTestClientByFeature('products').email,
    password: getTestClientByFeature('products').password,
    storageState: path.join(__dirname, '../.auth/test-client-products.json'),
  },
  store: {
    id: getTestClientByFeature('store').id,
    name: getTestClientByFeature('store').name,
    email: getTestClientByFeature('store').email,
    password: getTestClientByFeature('store').password,
    storageState: path.join(__dirname, '../.auth/test-client-store.json'),
  },
  studio: {
    id: getTestClientByFeature('studio').id,
    name: getTestClientByFeature('studio').name,
    email: getTestClientByFeature('studio').email,
    password: getTestClientByFeature('studio').password,
    storageState: path.join(__dirname, '../.auth/test-client-studio.json'),
  },
  main: {
    id: getTestClientByFeature('main').id,
    name: getTestClientByFeature('main').name,
    email: getTestClientByFeature('main').email,
    password: getTestClientByFeature('main').password,
    storageState: path.join(__dirname, '../.auth/test-client-main.json'),
  },
};

// Extended fixture type with database access
type AuthFixtures = {
  authenticatedPage: Page;
  clientId: string;
  testClient: TestClient;
  db: any; // Database connection for verification
};

/**
 * Create authenticated test fixtures
 * Usage:
 *   test.use({ testClientName: 'collections' });
 *   test('my test', async ({ authenticatedPage, clientId, db }) => { ... });
 */
export const test = base.extend<AuthFixtures & { testClientName: TestClientName }>({
  testClientName: ['main', { option: true }],

  testClient: async ({ testClientName }, use) => {
    const client = TEST_CLIENT_MAP[testClientName];
    await use(client);
  },

  clientId: async ({ testClient }, use) => {
    await use(testClient.id);
  },

  db: async ({}, use) => {
    // Import database connection using pg (node-postgres)
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { Pool } = await import('pg');
    const { schema } = await import('../helpers/schema-tables');

    const connectionString = 'postgresql://test:test@localhost:5434/visualizer_test';
    const pool = new Pool({ connectionString });
    const db = drizzle(pool, { schema });

    await use(db);

    // Close pool after use
    await pool.end();
  },

  authenticatedPage: async ({ browser, testClient }, use) => {
    const context = await browser.newContext({
      storageState: testClient.storageState,
    });

    const page = await context.newPage();

    // Hide Next.js development overlays and indicators
    await hideNextDevOverlay(page);

    await use(page);
    await context.close();
  },
});

export { TEST_CLIENT_MAP, expect };
