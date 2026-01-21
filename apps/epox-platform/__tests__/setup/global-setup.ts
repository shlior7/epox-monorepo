import { chromium, type FullConfig } from '@playwright/test';
import { TEST_CLIENT_MAP } from './auth-fixtures';
import path from 'path';
import fs from 'fs';

/**
 * Global setup for Playwright tests
 * - Authenticates all test users
 * - Saves authentication states for reuse
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication for test users...\n');

  // Create .auth directory if it doesn't exist
  const authDir = path.join(__dirname, '../.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();

  // Authenticate each test client
  for (const [clientName, client] of Object.entries(TEST_CLIENT_MAP)) {
    console.log(`🔑 Authenticating ${client.name}...`);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
      await page.goto(baseURL);

      // Check if already logged in (from previous session)
      const isLoggedIn = await page
        .locator('[data-testid="user-menu"]')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!isLoggedIn) {
        // Navigate to sign-in page
        const signInButton = page
          .locator('button:has-text("Sign In"), a:has-text("Sign In")')
          .first();

        const isSignInVisible = await signInButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (isSignInVisible) {
          await signInButton.click();
          await page.waitForURL('**/sign-in', { timeout: 5000 }).catch(() => {});
        }

        // Fill in credentials
        await page.locator('input[type="email"], input[name="email"]').fill(client.email);
        await page.locator('input[type="password"], input[name="password"]').fill(client.password);
        await page
          .locator('button[type="submit"]:has-text("Sign In"), button:has-text("Log In")')
          .click();

        // Wait for successful login
        await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 10000 });

        console.log(`   ✅ Successfully authenticated ${client.email}`);
      } else {
        console.log(`   ✅ Already authenticated ${client.email}`);
      }

      // Save authentication state
      await context.storageState({ path: client.storageState });
      console.log(`   💾 Saved auth state to ${path.basename(client.storageState)}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to authenticate ${client.name}:`, error);
      throw error;
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('✨ Authentication setup complete!\n');
}

export default globalSetup;
