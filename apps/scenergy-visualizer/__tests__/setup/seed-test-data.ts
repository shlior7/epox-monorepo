#!/usr/bin/env tsx
/**
 * Seed script to create test clients with pre-populated data for Playwright tests
 * Usage: yarn test:seed
 */

import { getDb } from 'visualizer-db';
import { client, user, account, member, product, collectionSession, generationFlow } from 'visualizer-db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcrypt';

const TEST_CLIENTS = [
  {
    id: 'test-client-main',
    name: 'Test Client - Main',
    slug: 'test-client-main',
    email: 'test-main@epox.test',
    password: 'TestPassword123!',
    userName: 'Test Main User',
    products: [
      { name: 'Modern Sofa', description: 'A comfortable modern sofa', category: 'Furniture' },
      { name: 'Oak Dining Table', description: 'Solid oak dining table', category: 'Furniture' },
      { name: 'LED Floor Lamp', description: 'Adjustable LED floor lamp', category: 'Lighting' },
    ],
    collections: [
      { name: 'Living Room Collection', status: 'draft' },
      { name: 'Dining Room Set', status: 'completed' },
    ],
  },
  {
    id: 'test-client-secondary',
    name: 'Test Client - Secondary',
    slug: 'test-client-secondary',
    email: 'test-secondary@epox.test',
    password: 'TestPassword123!',
    userName: 'Test Secondary User',
    products: [
      { name: 'Office Chair', description: 'Ergonomic office chair', category: 'Furniture' },
      { name: 'Standing Desk', description: 'Electric standing desk', category: 'Furniture' },
    ],
    collections: [{ name: 'Office Setup', status: 'draft' }],
  },
];

async function seedTestData() {
  const drizzle = getDb();
  console.log('🌱 Starting test data seeding...\n');

  for (const testClient of TEST_CLIENTS) {
    console.log(`📦 Processing client: ${testClient.name}`);

    // 1. Check if client exists, delete if it does (for idempotency)
    const existingClient = await drizzle.select().from(client).where(eq(client.id, testClient.id)).limit(1);

    if (existingClient.length > 0) {
      console.log(`   ♻️  Client already exists, deleting old data...`);
      await drizzle.delete(client).where(eq(client.id, testClient.id));
    }

    // 2. Create client
    const [newClient] = await drizzle
      .insert(client)
      .values({
        id: testClient.id,
        name: testClient.name,
        slug: testClient.slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`   ✅ Created client: ${newClient.id}`);

    // 3. Check if user exists, delete if needed
    const existingUser = await drizzle.select().from(user).where(eq(user.email, testClient.email)).limit(1);

    let userId: string;

    if (existingUser.length > 0) {
      console.log(`   ♻️  User already exists, reusing...`);
      userId = existingUser[0].id;

      // Delete old account if exists
      await drizzle.delete(account).where(eq(account.userId, userId));
    } else {
      // Create user
      userId = uuidv4();
      await drizzle.insert(user).values({
        id: userId,
        email: testClient.email,
        name: testClient.userName,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`   ✅ Created user: ${userId}`);
    }

    // 4. Create password account
    const hashedPassword = await hash(testClient.password, 10);
    await drizzle.insert(account).values({
      id: uuidv4(),
      userId,
      accountId: testClient.email,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`   ✅ Created credential account`);

    // 5. Create membership
    const existingMembership = await drizzle
      .select()
      .from(member)
      .where(and(eq(member.clientId, testClient.id), eq(member.userId, userId)))
      .limit(1);

    if (existingMembership.length === 0) {
      await drizzle.insert(member).values({
        id: uuidv4(),
        clientId: testClient.id,
        userId,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`   ✅ Created membership`);
    }

    // 6. Create products
    const productIds: string[] = [];
    for (const productData of testClient.products) {
      const productId = uuidv4();
      await drizzle.insert(product).values({
        id: productId,
        clientId: testClient.id,
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

    // 7. Create collections
    for (const collectionData of testClient.collections) {
      const collectionId = uuidv4();
      await drizzle.insert(collectionSession).values({
        id: collectionId,
        clientId: testClient.id,
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
        clientId: testClient.id,
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

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedTestData, TEST_CLIENTS };
