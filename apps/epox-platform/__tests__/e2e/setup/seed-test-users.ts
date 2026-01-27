/**
 * Seed Test Users via Better Auth API
 *
 * Creates test users using Better Auth's sign-up API to ensure proper password hashing
 * and follow Better Auth best practices.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { TEST_CLIENTS } from './test-clients';

const TEST_DB_URL = 'postgresql://test:test@localhost:5434/visualizer_test';

/**
 * Clean up all test data from the database
 * Deletes all entities in correct order to respect foreign key constraints
 */
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test database...\n');

  const pool = new Pool({ connectionString: TEST_DB_URL });

  try {
    // Delete in reverse dependency order (child tables first, parent tables last)
    const tables = [
      // Job and event tracking
      'generation_event',
      'ai_cost_tracking',
      'usage_record',

      // Generation flows and assets
      'generation_flow_product',
      'generation_flow',
      'generated_asset_product',
      'generated_asset',
      'generation_job',
      'favorite_image',

      // Messages and sessions
      'message',
      'chat_session',
      'collection_session',

      // Products and collections
      'product_image',
      'product',

      // Store integrations
      'store_sync_log',
      'store_connection',

      // Auth and user data
      'verification',
      'session',
      'account',
      'admin_session',
      'admin_user',

      // Organization/client data
      'invitation',
      'member',
      'user_settings',
      'quota_limit',
      'user',
      'client',
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`DELETE FROM "${table}"`);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`   🗑️  Deleted ${result.rowCount} rows from "${table}"`);
        }
      } catch (error: any) {
        // Ignore errors for tables that don't exist
        if (!error.message.includes('does not exist')) {
          console.warn(`   ⚠️  Warning: Could not delete from "${table}":`, error.message);
        }
      }
    }

    console.log('\n✅ Database cleaned!\n');
  } catch (error) {
    console.error('❌ Failed to clean database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Seed test users using Better Auth API
 * This ensures passwords are hashed correctly and users are created following Better Auth conventions
 */
async function seedTestUsers(baseURL: string = 'http://localhost:3000') {
  // Clean database first
  await cleanupTestData();

  console.log('🌱 Seeding test users via Better Auth API...\n');

  // Create new pool connection for seeding
  const pool = new Pool({ connectionString: TEST_DB_URL });

  try {
    for (const clientConfig of TEST_CLIENTS) {
    try {
      // Create user via Better Auth sign-up API
      console.log(`   📝 Creating user via Better Auth API: ${clientConfig.email}`);

      const signUpResponse = await fetch(`${baseURL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientConfig.name,
          email: clientConfig.email,
          password: clientConfig.password,
        }),
      });

      if (!signUpResponse.ok) {
        const errorText = await signUpResponse.text();
        throw new Error(`Sign-up failed (${signUpResponse.status}): ${errorText}`);
      }

      const signUpData = await signUpResponse.json();
      let userId = signUpData.user?.id;

      if (!userId) {
        // If API didn't return user ID, query it from database
        const userQuery = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [
          clientConfig.email,
        ]);
        userId = userQuery.rows[0]?.id;
      }

      console.log(`   ✅ Created user via API: ${clientConfig.email}`)

      if (!userId) {
        throw new Error(`Failed to get user ID for ${clientConfig.email}`);
      }

      // Always ensure client (organization) exists with fixed ID
      await pool.query(
        `INSERT INTO "client" (id, name, slug, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           updated_at = EXCLUDED.updated_at`,
        [clientConfig.id, clientConfig.name, clientConfig.slug, new Date(), new Date()]
      );

      // Add user as owner (if not already a member)
      await pool.query(
        `INSERT INTO "member" (id, client_id, user_id, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (client_id, user_id) DO NOTHING`,
        [uuidv4(), clientConfig.id, userId, 'owner', new Date(), new Date()]
      );

      console.log(`   ✅ Ensured client exists: ${clientConfig.id}`);
    } catch (error) {
      console.error(`   ❌ Failed to setup ${clientConfig.email}:`, error);
    }
  }

  console.log('\n✨ Test users seeded!\n');
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  seedTestUsers(baseURL).catch(console.error);
}

export { seedTestUsers, cleanupTestData };
