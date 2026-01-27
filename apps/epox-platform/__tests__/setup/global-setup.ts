import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_CLIENTS } from '../e2e/setup/test-clients';

/**
 * Global setup for Playwright tests
 * - Authenticates all feature test clients
 * - Saves authentication state for reuse
 * - Supports parallel test execution by feature
 */
export default async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication for all test clients...\n');

  // Create .auth directory if it doesn't exist
  const authDir = path.join(__dirname, '../e2e/.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // Authenticate each test client
  for (const testClient of TEST_CLIENTS) {
    console.log(`\n📧 Authenticating: ${testClient.email}`);

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const storageStatePath = path.join(authDir, `${testClient.id}.json`);

      // Navigate directly to login page
      await page.goto(`${baseURL}/login`);
      await page.waitForLoadState('networkidle');

      // Check if we got redirected
      const currentUrl = page.url();

      // Check if already authenticated
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/home') || currentUrl.includes('/studio')) {
        console.log(`   ✅ Already authenticated`);
      } else if (currentUrl.includes('/admin/login')) {
        // Handle admin login (better-auth admin panel)
        console.log(`   ⚠️  Detected admin login page (wrong app running)`);

        // Try multiple selectors that might exist on the admin login page
        const emailSelectors = ['input[name="email"]', 'input[type="email"]', '#email'];
        const passwordSelectors = ['input[name="password"]', 'input[type="password"]', '#password'];

        let emailFilled = false;
        for (const selector of emailSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            await page.fill(selector, testClient.email);
            emailFilled = true;
            break;
          } catch {
            // Try next selector
          }
        }

        let passwordFilled = false;
        for (const selector of passwordSelectors) {
          try {
            await page.fill(selector, testClient.password);
            passwordFilled = true;
            break;
          } catch {
            // Try next selector
          }
        }

        if (emailFilled && passwordFilled) {
          await page.click('button[type="submit"]').catch(() => {});
          await page.waitForURL(/\/(home|dashboard|studio)/, { timeout: 15000 }).catch(() => {});
          console.log(`   ✅ Successfully authenticated`);
        }
      } else {
        // Standard login page with #email and #password
        await page.waitForSelector('#email', { timeout: 5000 });
        await page.fill('#email', testClient.email);
        await page.fill('#password', testClient.password);

        // Click sign in
        await page.click('button[type="submit"]');

        // Wait for redirect to authenticated page
        await page.waitForURL(/\/(home|dashboard|studio)/, { timeout: 15000 });

        console.log(`   ✅ Successfully authenticated`);
      }

      // Save authentication state
      await context.storageState({ path: storageStatePath });
      console.log(`   💾 Saved auth state to ${path.basename(storageStatePath)}`);
    } catch (error) {
      console.error(`   ❌ Failed to authenticate ${testClient.email}:`, error);
      // Continue with other clients
    } finally {
      await context.close();
      await browser.close();
    }
  }

  console.log('\n✨ Global setup complete - all clients authenticated!\n');
}
