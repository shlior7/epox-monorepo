import { test as base, expect, type Page } from '@playwright/test';
import { TEST_CLIENTS } from './test-clients';
import path from 'path';

// Define test client types
export type TestClientName = 'main' | 'secondary';

export type TestClient = {
  id: string;
  name: string;
  email: string;
  password: string;
  storageState: string;
};

// Map client names to test client data
const TEST_CLIENT_MAP: Record<TestClientName, TestClient> = {
  main: {
    id: TEST_CLIENTS[0].id,
    name: TEST_CLIENTS[0].name,
    email: TEST_CLIENTS[0].email,
    password: TEST_CLIENTS[0].password,
    storageState: path.join(__dirname, '../.auth/test-client-main.json'),
  },
  secondary: {
    // Fallback to main client since we removed secondary
    id: TEST_CLIENTS[0].id,
    name: TEST_CLIENTS[0].name,
    email: TEST_CLIENTS[0].email,
    password: TEST_CLIENTS[0].password,
    storageState: path.join(__dirname, '../.auth/test-client-main.json'),
  },
};

// Extended fixture type
type AuthFixtures = {
  authenticatedPage: Page;
  clientId: string;
  testClient: TestClient;
};

/**
 * Create authenticated test fixtures
 * Usage:
 *   test.use({ testClientName: 'main' });
 *   test('my test', async ({ authenticatedPage, clientId }) => { ... });
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

  authenticatedPage: async ({ browser, testClient }, use) => {
    const context = await browser.newContext({
      storageState: testClient.storageState,
    });

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
export { TEST_CLIENT_MAP };
