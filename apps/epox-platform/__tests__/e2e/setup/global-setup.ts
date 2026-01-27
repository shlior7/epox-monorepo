import { chromium, type FullConfig } from '@playwright/test';
import { TEST_CLIENT_MAP } from './auth-fixtures';
import path from 'path';
import fs from 'fs';
import { seedTestUsers } from './seed-test-users';
import { getDb } from 'visualizer-db';
import { session as sessionSchema } from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';

/**
 * Global setup for Playwright tests
 * - Seeds test users directly in database
 * - Authenticates users using Better Auth's sign-in API
 * - Saves authentication states for reuse
 *
 * This approach uses Better Auth's API to create sessions, which ensures:
 * - Sessions are created with proper cookie attributes
 * - Client-side hooks can validate sessions correctly
 * - We follow Better Auth best practices
 *
 * NOTE: This only creates users and authenticates them.
 * Test data (products, collections, etc.) is seeded within tests using beforeAll hooks.
 */
async function globalSetup(config: FullConfig) {
  // Set DATABASE_URL for the test database (used by global setup and seed scripts)
  // This must match the database in docker-compose.test.yml
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5434/visualizer_test';

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // Seed test users via Better Auth API
  await seedTestUsers(baseURL);

  console.log('\n🔐 Authenticating test clients using Better Auth API...\n');

  // Create .auth directory if it doesn't exist
  const authDir = path.join(__dirname, '../.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Launch a temporary browser for authentication
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });

  try {
    for (const [clientName, client] of Object.entries(TEST_CLIENT_MAP)) {
      console.log(`\n📧 Authenticating: ${client.email}`);

      try {
        const page = await context.newPage();

        // Step 1: Sign in using Better Auth's API
        console.log(`   🔑 Signing in via Better Auth API...`);

        const signInResponse = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
          data: {
            email: client.email,
            password: client.password,
          },
          headers: {
            'Content-Type': 'application/json',
            'Origin': baseURL,
          },
        });

        if (!signInResponse.ok()) {
          const errorText = await signInResponse.text();
          throw new Error(`Sign-in failed (${signInResponse.status()}): ${errorText}`);
        }

        console.log(`   ✅ Signed in successfully`);

        // Step 2: Update the session's activeClientId in the database
        // Better Auth doesn't have a built-in way to set this, so we update it directly
        const db = getDb();
        const cookies = await context.cookies();
        const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token');

        if (!sessionCookie) {
          throw new Error('No session cookie found after sign-in');
        }

        console.log(`   📝 Updating session with activeClientId: ${client.id}`);

        await db
          .update(sessionSchema)
          .set({ activeClientId: client.id })
          .where(eq(sessionSchema.token, sessionCookie.value));

        console.log(`   ✅ Updated session with activeClientId: ${client.id}`);

        // Step 3: Save the storage state (includes cookies)
        await context.storageState({ path: client.storageState });
        console.log(`   💾 Saved auth state to ${path.basename(client.storageState)}`);

        await page.close();
      } catch (error) {
        console.error(`   ❌ Failed to authenticate:`, error);
        // Create empty state as fallback
        const emptyState = { cookies: [], origins: [] };
        fs.writeFileSync(client.storageState, JSON.stringify(emptyState, null, 2));
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('\n✨ Global setup complete - all clients ready for testing!\n');
}

export default globalSetup;
