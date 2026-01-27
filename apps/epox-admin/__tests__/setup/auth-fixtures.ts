import { test as base, expect, type Page } from '@playwright/test';
import { TEST_CLIENTS } from './seed-test-data';
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
    id: TEST_CLIENTS[1].id,
    name: TEST_CLIENTS[1].name,
    email: TEST_CLIENTS[1].email,
    password: TEST_CLIENTS[1].password,
    storageState: path.join(__dirname, '../.auth/test-client-secondary.json'),
  },
};

// Extended fixture type
type AuthFixtures = {
  authenticatedPage: Page;
  clientId: string;
  testClient: TestClient;
};

/**
 * Authenticate a user and save the authentication state
 */
async function authenticate(page: Page, client: TestClient) {
  await page.goto('/');

  // Check if already logged in
  const isLoggedIn = await page
    .locator('[data-testid="user-menu"]')
    .isVisible()
    .catch(() => false);

  if (isLoggedIn) {
    console.log(`✅ Already authenticated as ${client.email}`);
    return;
  }

  // Look for login form or sign in button
  const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first();
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();

  // Check if we're already on login page or need to click sign in
  const isOnLoginPage = await emailInput.isVisible().catch(() => false);

  if (!isOnLoginPage) {
    await signInButton.click();
    await page.waitForURL('**/sign-in', { timeout: 5000 }).catch(() => {});
  }

  // Fill in credentials
  await emailInput.fill(client.email);
  await page.locator('input[type="password"], input[name="password"]').fill(client.password);
  await page.locator('button[type="submit"]:has-text("Sign In"), button:has-text("Log In")').click();

  // Wait for redirect after login
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 10000 });

  console.log(`✅ Authenticated as ${client.email}`);
}

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
