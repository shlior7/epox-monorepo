#!/usr/bin/env tsx
/**
 * Seed script to create test clients with pre-populated data for Playwright tests
 * Usage: yarn test:seed (loads .env.local automatically via tsx --env-file)
 *
 * IMPORTANT: Server must be running on http://localhost:3000 before running this script.
 * Start with: yarn dev (in a separate terminal)
 *
 * Uses Better Auth signup endpoint for user/client creation to ensure consistency
 * with production signup flow. Organizations are auto-created via database hooks.
 */

import { getDb, Member } from 'visualizer-db';
import { user, product, collectionSession, generationFlow, member } from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { TEST_CLIENTS } from './test-clients';

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/auth/get-session', {
      method: 'GET',
    });
    return response.status === 200 || response.status === 401; // Either OK or unauthorized is fine
  } catch {
    return false;
  }
}

async function seedTestData() {
  const drizzle = getDb();

  // Check if server is running
  console.log('🔍 Checking if server is running...');
  const isServerRunning = await checkServerRunning();

  if (!isServerRunning) {
    console.error('❌ Server is not running on https://localhost:3000');
    console.error('   Please start the server first: yarn dev');
    process.exit(1);
  }

  console.log('✅ Server is running\n');
  console.log('🌱 Starting test data seeding...\n');

  for (const testClient of TEST_CLIENTS) {
    console.log(`📦 Processing client: ${testClient.name}`);

    let clientId: string;
    let userId: string;

    // 1. Check if user exists
    const existingUser = await drizzle
      .select()
      .from(user)
      .where(eq(user.email, testClient.email))
      .limit(1);

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`   ✅ User already exists: ${userId}`);

      // Find their organization
      const memberships = await drizzle
        .select()
        .from(member)
        .where(eq(member.userId, userId))
        .limit(1);

      if (memberships.length === 0) {
        console.log(`   ⚠️  Warning: User exists but has no organization`);
        continue;
      }

      clientId = memberships[0].clientId;
      console.log(`   ✅ Using existing organization: ${clientId}`);
    } else {
      // Create user via Better Auth signup endpoint
      // This ensures consistency with production flow and triggers our hooks
      console.log(`   🆕 Creating user via Better Auth signup...`);

      try {
        const signupResponse = await fetch('http://localhost:3000/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: testClient.userName,
            email: testClient.email,
            password: testClient.password,
          }),
        });

        if (!signupResponse.ok) {
          const errorText = await signupResponse.text();
          throw new Error(`Signup failed: ${signupResponse.status} ${errorText}`);
        }

        const signupData = await signupResponse.json();
        userId = signupData.user.id;
        console.log(`   ✅ Created user: ${userId}`);

        // Organization was auto-created by our user.create.after hook
        // Find it (retry a few times to account for async hooks)
        let memberships: Member[] = [];
        for (let i = 0; i < 5; i++) {
          memberships = await drizzle
            .select()
            .from(member)
            .where(eq(member.userId, userId))
            .limit(1);

          if (memberships.length > 0) break;

          // Wait a bit for hooks to complete
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (memberships.length === 0) {
          throw new Error('Organization was not auto-created by hooks');
        }

        clientId = memberships[0].clientId;
        console.log(`   ✅ Organization auto-created: ${clientId}`);
      } catch (error) {
        console.error(`   ❌ Failed to create user via Better Auth:`, error);
        continue;
      }
    }

    // 6. Delete existing products/collections for idempotency
    console.log(`   🧹 Cleaning up existing test data...`);
    await drizzle.delete(product).where(eq(product.clientId, clientId));
    await drizzle.delete(collectionSession).where(eq(collectionSession.clientId, clientId));
    // Generation flows will cascade delete with collections

    // 7. Create products
    const productIds: string[] = [];
    for (const productData of testClient.products || []) {
      const productId = uuidv4();
      await drizzle.insert(product).values({
        id: productId,
        clientId: clientId,
        name: productData.name,
        description: productData.description,
        category: productData.category,
        source: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      productIds.push(productId);
      console.log(`   ✅ Created product: ${productData.name}`);
    }

    // 8. Create collections
    for (const collectionData of testClient.collections || []) {
      const collectionId = uuidv4();
      await drizzle.insert(collectionSession).values({
        id: collectionId,
        clientId: clientId,
        name: collectionData.name,
        status: collectionData.status as 'draft' | 'generating' | 'completed',
        productIds: productIds.slice(0, 2), // Add first 2 products to collection
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`   ✅ Created collection: ${collectionData.name}`);

      // Create a generation flow for each collection
      const flowId = uuidv4();
      await drizzle.insert(generationFlow).values({
        id: flowId,
        collectionSessionId: collectionId,
        clientId: clientId,
        name: `${collectionData.name} - Flow`,
        productIds: productIds.slice(0, 2),
        settings: {} as any, // Simplified settings for testing
        status: 'empty',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`   ✅ Created generation flow for collection`);
    }

    console.log(`\n✨ Completed seeding for ${testClient.name}\n`);
  }

  console.log('🎉 Test data seeding completed!\n');
  console.log('📝 Test Credentials:');
  for (const testClient of TEST_CLIENTS) {
    console.log(`\n   ${testClient.name}:`);
    console.log(`   Email: ${testClient.email}`);
    console.log(`   Password: ${testClient.password}`);
    console.log(`   Client ID: ${testClient.id}`);
  }
}

// Run seeding if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
