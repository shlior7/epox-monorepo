import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test client credentials
const TEST_CLIENT = {
  email: 'hello@epox.ai',
  password: 'testtest',
  storageState: path.join(__dirname, '../e2e/.auth/test-client-main.json'),
};

/**
 * Global setup for Playwright tests
 * - Authenticates test user
 * - Saves authentication state for reuse
 */
export default async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication...\n');

  // Create .auth directory if it doesn't exist
  const authDir = path.join(__dirname, '../e2e/.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

    // Navigate directly to login page
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    const emailInput = page.locator('input[type="email"], input[placeholder*="@"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(TEST_CLIENT.email);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_CLIENT.password);

    // Click sign in
    const signInButton = page.locator('button:has-text("Sign in")').first();
    await signInButton.click();

    // Wait for redirect to authenticated page
    await page.waitForURL(/\/(home|dashboard|studio)/, { timeout: 10000 });

    console.log(`   ✅ Successfully authenticated ${TEST_CLIENT.email}`);

    // Save authentication state
    await context.storageState({ path: TEST_CLIENT.storageState });
    console.log(`   💾 Saved auth state to ${path.basename(TEST_CLIENT.storageState)}\n`);
  } catch (error) {
    console.error('   ❌ Failed to authenticate:', error);
    // Don't throw - allow tests to handle auth themselves
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('Global setup complete');
}
