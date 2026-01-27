# E2E Feature-Based Testing Guide

## Overview

This guide shows how to organize E2E tests by **feature** with dedicated test clients, per-feature seeding, and dual verification (database + screenshots). Tests are optimized for minimal containers with maximum coverage of real app flows.

## Architecture

### Current Structure

```
__tests__/e2e/
├── setup/
│   ├── auth-fixtures.ts         # Playwright fixtures for authenticated pages
│   ├── test-clients.ts          # Test client configurations
│   ├── global-setup.ts          # Global authentication setup
│   └── seed-test-data.ts        # Global seeding script
├── helpers/
│   ├── navigation.ts            # Navigation utilities
│   └── constants.ts             # Common selectors and constants
├── assets/
│   └── ...                      # Test assets (images, etc.)
└── tests/
    ├── collection-page/
    │   ├── test.spec.ts
    │   └── screenshots/
    ├── store-page/
    │   ├── test.spec.ts
    │   └── screenshots/
    └── ...
```

### New Feature-Based Organization

**Goal:** Group all tests for a feature under one folder with dedicated seeding, sequential execution, and comprehensive screenshots.

```
__tests__/e2e/tests/
├── collections/                 # Collection feature
│   ├── seed.ts                 # Collection-specific seeding
│   ├── test.spec.ts            # All collection tests (sequential)
│   └── screenshots/            # Collection screenshots
│       ├── create-collection.png
│       ├── collection-studio.png
│       └── collections-list.png
│
├── products/                    # Products feature
│   ├── seed.ts                 # Product-specific seeding
│   ├── test.spec.ts            # All product tests (sequential)
│   └── screenshots/
│       ├── products-list.png
│       ├── product-detail.png
│       ├── upload-product.png
│       └── bulk-actions.png
│
├── store/                       # Store integration feature
│   ├── seed.ts                 # Store-specific seeding
│   ├── test.spec.ts            # All store tests (sequential)
│   └── screenshots/
│       ├── store-connect.png
│       ├── store-import.png
│       └── store-sync.png
│
└── studio/                      # Studio feature
    ├── seed.ts                 # Studio-specific seeding
    ├── test.spec.ts            # All studio tests (sequential)
    └── screenshots/
        ├── studio-product.png
        ├── studio-collection.png
        └── config-panel.png
```

## Test Client Strategy

### Client-Per-Feature Pattern

Each feature uses its own dedicated test client. This allows:
- ✅ **Parallel execution** - Different features run in parallel
- ✅ **Sequential tests** - Tests within a feature run sequentially (shared seeded data)
- ✅ **Isolated state** - Each feature has clean, predictable data
- ✅ **Minimal containers** - One container per feature (not per test)

### Test Client Configuration

**File:** `__tests__/e2e/setup/test-clients.ts`

```typescript
export const TEST_CLIENTS = [
  {
    id: 'test-client-collections',
    name: 'Collections Test Client',
    slug: 'test-collections',
    email: 'test-collections@epox.test',
    password: 'TestPassword123!',
    userName: 'test-collections',
  },
  {
    id: 'test-client-products',
    name: 'Products Test Client',
    slug: 'test-products',
    email: 'test-products@epox.test',
    password: 'TestPassword123!',
    userName: 'test-products',
  },
  {
    id: 'test-client-store',
    name: 'Store Test Client',
    slug: 'test-store',
    email: 'test-store@epox.test',
    password: 'TestPassword123!',
    userName: 'test-store',
  },
  {
    id: 'test-client-studio',
    name: 'Studio Test Client',
    slug: 'test-studio',
    email: 'test-studio@epox.test',
    password: 'TestPassword123!',
    userName: 'test-studio',
  },
] as const;

export type TestClientId =
  | 'test-client-collections'
  | 'test-client-products'
  | 'test-client-store'
  | 'test-client-studio';
```

### Updated Auth Fixtures

**File:** `__tests__/e2e/setup/auth-fixtures.ts`

```typescript
import { test as base, expect, type Page } from '@playwright/test';
import { TEST_CLIENTS, type TestClientId } from './test-clients';
import path from 'path';

export type TestClientName =
  | 'collections'
  | 'products'
  | 'store'
  | 'studio';

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
    id: TEST_CLIENTS.find(c => c.id === 'test-client-collections')!.id,
    name: TEST_CLIENTS.find(c => c.id === 'test-client-collections')!.name,
    email: TEST_CLIENTS.find(c => c.id === 'test-client-collections')!.email,
    password: TEST_CLIENTS.find(c => c.id === 'test-client-collections')!.password,
    storageState: path.join(__dirname, '../.auth/test-client-collections.json'),
  },
  products: {
    id: TEST_CLIENTS.find(c => c.id === 'test-client-products')!.id,
    name: TEST_CLIENTS.find(c => c.id === 'test-client-products')!.name,
    email: TEST_CLIENTS.find(c => c.id === 'test-client-products')!.email,
    password: TEST_CLIENTS.find(c => c.id === 'test-client-products')!.password,
    storageState: path.join(__dirname, '../.auth/test-client-products.json'),
  },
  store: {
    id: TEST_CLIENTS.find(c => c.id === 'test-client-store')!.id,
    name: TEST_CLIENTS.find(c => c.id === 'test-client-store')!.name,
    email: TEST_CLIENTS.find(c => c.id === 'test-client-store')!.email,
    password: TEST_CLIENTS.find(c => c.id === 'test-client-store')!.password,
    storageState: path.join(__dirname, '../.auth/test-client-store.json'),
  },
  studio: {
    id: TEST_CLIENTS.find(c => c.id === 'test-client-studio')!.id,
    name: TEST_CLIENTS.find(c => c.id === 'test-client-studio')!.name,
    email: TEST_CLIENTS.find(c => c.id === 'test-client-studio')!.email,
    password: TEST_CLIENTS.find(c => c.id === 'test-client-studio')!.password,
    storageState: path.join(__dirname, '../.auth/test-client-studio.json'),
  },
};

// Extended fixture type
type AuthFixtures = {
  authenticatedPage: Page;
  clientId: string;
  testClient: TestClient;
  db: ReturnType<typeof getDb>; // Database connection for verification
};

export const test = base.extend<AuthFixtures & { testClientName: TestClientName }>({
  testClientName: ['collections', { option: true }],

  testClient: async ({ testClientName }, use) => {
    const client = TEST_CLIENT_MAP[testClientName];
    await use(client);
  },

  clientId: async ({ testClient }, use) => {
    await use(testClient.id);
  },

  db: async ({}, use) => {
    const { getDb } = await import('visualizer-db');
    const db = getDb();
    await use(db);
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
```

## Per-Feature Seeding

### Seed Helper Functions

**File:** `__tests__/e2e/helpers/seed-helpers.ts`

```typescript
import type { Drizzle } from 'visualizer-db';
import {
  user,
  product,
  collectionSession,
  generationFlow,
  member,
  storeConnection,
  generatedAsset,
} from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a test user via Better Auth signup endpoint
 * Returns userId and clientId
 */
export async function createTestUser(config: {
  email: string;
  password: string;
  userName: string;
}): Promise<{ userId: string; clientId: string }> {
  // Create user via Better Auth signup endpoint
  const signupResponse = await fetch('http://localhost:3000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: config.userName,
      email: config.email,
      password: config.password,
    }),
  });

  if (!signupResponse.ok) {
    const errorText = await signupResponse.text();
    throw new Error(`Signup failed: ${signupResponse.status} ${errorText}`);
  }

  const signupData = await signupResponse.json();
  const userId = signupData.user.id;

  // Wait for organization to be created by hooks
  const db = (await import('visualizer-db')).getDb();
  let clientId: string | null = null;

  for (let i = 0; i < 10; i++) {
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1);

    if (memberships.length > 0) {
      clientId = memberships[0].clientId;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!clientId) {
    throw new Error('Organization was not auto-created by hooks');
  }

  return { userId, clientId };
}

/**
 * Clean all data for a client (idempotent)
 */
export async function cleanClientData(db: Drizzle, clientId: string) {
  await db.delete(generatedAsset).where(eq(generatedAsset.clientId, clientId));
  await db.delete(generationFlow).where(eq(generationFlow.clientId, clientId));
  await db.delete(collectionSession).where(eq(collectionSession.clientId, clientId));
  await db.delete(product).where(eq(product.clientId, clientId));
  await db.delete(storeConnection).where(eq(storeConnection.clientId, clientId));
}

/**
 * Seed products for a client
 */
export async function seedProducts(
  db: Drizzle,
  clientId: string,
  products: Array<{
    name: string;
    description?: string;
    category?: string;
    source?: 'uploaded' | 'imported';
    storeUrl?: string;
  }>
): Promise<string[]> {
  const productIds: string[] = [];

  for (const productData of products) {
    const productId = uuidv4();
    await db.insert(product).values({
      id: productId,
      clientId,
      name: productData.name,
      description: productData.description || '',
      category: productData.category || 'Furniture',
      source: productData.source || 'uploaded',
      storeUrl: productData.storeUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    productIds.push(productId);
  }

  return productIds;
}

/**
 * Seed collections for a client
 */
export async function seedCollections(
  db: Drizzle,
  clientId: string,
  productIds: string[],
  collections: Array<{
    name: string;
    status?: 'draft' | 'generating' | 'completed';
    productCount?: number;
  }>
): Promise<string[]> {
  const collectionIds: string[] = [];

  for (const collectionData of collections) {
    const collectionId = uuidv4();
    const productCount = collectionData.productCount || 2;
    const collectionProductIds = productIds.slice(0, productCount);

    await db.insert(collectionSession).values({
      id: collectionId,
      clientId,
      name: collectionData.name,
      status: collectionData.status || 'draft',
      productIds: collectionProductIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    collectionIds.push(collectionId);

    // Create a generation flow for the collection
    const flowId = uuidv4();
    await db.insert(generationFlow).values({
      id: flowId,
      collectionSessionId: collectionId,
      clientId,
      name: `${collectionData.name} - Flow`,
      productIds: collectionProductIds,
      settings: {} as any,
      status: 'empty',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return collectionIds;
}

/**
 * Seed store connection for a client
 */
export async function seedStoreConnection(
  db: Drizzle,
  clientId: string,
  config: {
    provider: 'shopify' | 'woocommerce';
    storeUrl: string;
    storeName: string;
    status?: 'active' | 'inactive' | 'error';
  }
) {
  const connectionId = uuidv4();

  await db.insert(storeConnection).values({
    id: connectionId,
    clientId,
    provider: config.provider,
    storeUrl: config.storeUrl,
    storeName: config.storeName,
    status: config.status || 'active',
    lastSyncAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return connectionId;
}
```

### Example: Collections Feature Seeding

**File:** `__tests__/e2e/tests/collections/seed.ts`

```typescript
import { getDb } from 'visualizer-db';
import { eq } from 'drizzle-orm';
import { user } from 'visualizer-db/schema';
import {
  createTestUser,
  cleanClientData,
  seedProducts,
  seedCollections
} from '../../helpers/seed-helpers';

export async function seedCollectionsFeature() {
  const db = getDb();

  const testEmail = 'test-collections@epox.test';
  const testPassword = 'TestPassword123!';
  const testUserName = 'test-collections';

  console.log('\n🌱 Seeding Collections Feature...\n');

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.email, testEmail))
    .limit(1);

  let clientId: string;

  if (existingUser.length > 0) {
    console.log('   ✅ User already exists');

    // Find client ID from memberships
    const { member } = await import('visualizer-db/schema');
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, existingUser[0].id))
      .limit(1);

    if (memberships.length === 0) {
      throw new Error('User exists but has no organization');
    }

    clientId = memberships[0].clientId;
    console.log(`   ✅ Using existing organization: ${clientId}`);
  } else {
    // Create new user
    const result = await createTestUser({
      email: testEmail,
      password: testPassword,
      userName: testUserName,
    });
    clientId = result.clientId;
    console.log(`   ✅ Created user and organization: ${clientId}`);
  }

  // Clean existing data
  await cleanClientData(db, clientId);
  console.log('   🧹 Cleaned existing data');

  // Seed products
  const productIds = await seedProducts(db, clientId, [
    { name: 'Modern Sofa', description: 'A comfortable modern sofa', category: 'Furniture' },
    { name: 'Oak Dining Table', description: 'Solid oak dining table', category: 'Furniture' },
    { name: 'LED Floor Lamp', description: 'Adjustable LED floor lamp', category: 'Lighting' },
    { name: 'Leather Armchair', description: 'Luxury leather armchair', category: 'Furniture' },
  ]);
  console.log(`   ✅ Created ${productIds.length} products`);

  // Seed collections
  const collectionIds = await seedCollections(db, clientId, productIds, [
    { name: 'Living Room Collection', status: 'draft', productCount: 2 },
    { name: 'Dining Room Set', status: 'completed', productCount: 2 },
  ]);
  console.log(`   ✅ Created ${collectionIds.length} collections`);

  console.log('\n✨ Collections feature seeding complete!\n');

  return { clientId, productIds, collectionIds };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCollectionsFeature()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
```

## Writing Feature Tests

### Example: Collections Feature Tests

**File:** `__tests__/e2e/tests/collections/test.spec.ts`

```typescript
/**
 * Collections Feature Tests
 *
 * Tests the complete collection workflow:
 * - Creating collections from multiple products
 * - Collection studio page and config panel
 * - Collections list view
 * - Generation flows
 *
 * Screenshots captured:
 * - create-collection-selection.png - Product selection in studio
 * - collection-studio-page.png - Collection studio view
 * - collection-config-panel.png - Config panel detail
 * - collections-list.png - Collections list page
 * - collection-generation-flows.png - Generation flows view
 *
 * Database verification:
 * - Collection created with correct products
 * - Generation flow auto-created
 * - Collection appears in list
 */

import { test, expect } from '../../setup/auth-fixtures';
import { createNavigationHelper } from '../../helpers/navigation';
import { collectionSession, generationFlow } from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

// Use collections test client
test.use({ testClientName: 'collections' });

// Screenshots directory
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Collections Feature', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests sequentially

  let createdCollectionId: string;

  test('create collection from multiple products', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== CREATE COLLECTION TEST ===\n');

    // Navigate to studio
    await nav.goToStudio();

    // Wait for product grid
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();
    console.log(`Found ${cardCount} products`);

    expect(cardCount).toBeGreaterThanOrEqual(2);

    // Select first two products
    await productCards.nth(0).click();
    await authenticatedPage.waitForTimeout(300);
    await productCards.nth(1).click();
    await authenticatedPage.waitForTimeout(500);

    // Screenshot: Product selection
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'create-collection-selection.png'),
      fullPage: false,
    });
    console.log('📸 Saved: create-collection-selection.png');

    // Click create collection button
    const createBtn = authenticatedPage.locator(
      '[data-testid="selection-island-create-button"], button[class*="glow"]'
    ).first();

    const buttonText = await createBtn.textContent();
    expect(buttonText).toContain('Create Collection');

    await createBtn.click();

    // Wait for navigation to collection studio
    await authenticatedPage.waitForURL(/\/studio\/collections\/[^/]+$/, { timeout: 15000 });

    const finalUrl = authenticatedPage.url();
    const collectionIdMatch = finalUrl.match(/\/studio\/collections\/([a-f0-9-]+)$/);
    expect(collectionIdMatch).toBeTruthy();

    createdCollectionId = collectionIdMatch![1];
    console.log('Created collection ID:', createdCollectionId);

    // 🔍 DATABASE VERIFICATION
    const collection = await db.query.collectionSession.findFirst({
      where: (coll, { eq }) => eq(coll.id, createdCollectionId),
    });

    expect(collection).toBeTruthy();
    expect(collection!.clientId).toBe(clientId);
    expect(collection!.productIds).toHaveLength(2);
    console.log('✅ Database: Collection created with 2 products');

    // Verify generation flow was auto-created
    const flows = await db.query.generationFlow.findMany({
      where: (flow, { eq }) => eq(flow.collectionSessionId, createdCollectionId),
    });

    expect(flows.length).toBeGreaterThan(0);
    console.log(`✅ Database: ${flows.length} generation flow(s) created`);

    // 📸 UI VERIFICATION
    await authenticatedPage.waitForLoadState('networkidle');

    const collectionState = await authenticatedPage.evaluate(() => {
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        hasConfigPanel: !!document.querySelector('[data-testid="unified-config-panel"]'),
        hasGenerateButton: !!document.querySelector('[data-testid="unified-config-panel--generate-button"]'),
      };
    });

    expect(collectionState.hasConfigPanel).toBe(true);
    expect(collectionState.hasGenerateButton).toBe(true);
    console.log('✅ UI: Collection studio page loaded correctly');

    // Screenshot: Collection studio page
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'collection-studio-page.png'),
      fullPage: false,
    });
    console.log('📸 Saved: collection-studio-page.png');

    console.log('\n✅ Collection creation complete!\n');
  });

  test('verify collection studio layout', async ({
    authenticatedPage,
    clientId
  }) => {
    console.log('\n=== COLLECTION STUDIO LAYOUT TEST ===\n');

    // Navigate to the collection we created
    await authenticatedPage.goto(`/studio/collections/${createdCollectionId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify all studio elements
    const studioState = await authenticatedPage.evaluate(() => {
      return {
        hasConfigPanel: !!document.querySelector('[data-testid="unified-config-panel"]'),
        hasInspireSection: !!document.querySelector('[data-testid="inspire-section"]'),
        hasOutputSettings: !!document.querySelector('[data-testid="unified-config-panel--output-settings"]'),
        hasGenerateButton: !!document.querySelector('[data-testid="unified-config-panel--generate-button"]'),
        sceneTypeCount: document.querySelectorAll('[data-testid^="scene-type-accordion"]').length,
      };
    });

    console.log('Studio State:', studioState);

    expect(studioState.hasConfigPanel).toBe(true);
    expect(studioState.hasInspireSection).toBe(true);
    expect(studioState.hasGenerateButton).toBe(true);
    expect(studioState.sceneTypeCount).toBeGreaterThan(0);

    // Screenshot: Config panel detail
    const configPanel = authenticatedPage.locator('[data-testid="unified-config-panel"]');
    if (await configPanel.isVisible()) {
      await configPanel.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'collection-config-panel.png'),
      });
      console.log('📸 Saved: collection-config-panel.png');
    }

    console.log('\n✅ Studio layout verification complete!\n');
  });

  test('verify collection appears in collections list', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== COLLECTIONS LIST TEST ===\n');

    // Navigate to collections list
    await authenticatedPage.goto('/collections');
    await authenticatedPage.waitForLoadState('networkidle');

    // 🔍 DATABASE VERIFICATION
    const allCollections = await db.query.collectionSession.findMany({
      where: (coll, { eq }) => eq(coll.clientId, clientId),
    });

    console.log(`Database has ${allCollections.length} collections`);
    expect(allCollections.length).toBeGreaterThan(0);

    // 📸 UI VERIFICATION
    const listState = await authenticatedPage.evaluate(() => {
      const collectionCards = document.querySelectorAll('[data-testid^="collection-card--"]');
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        totalCollections: collectionCards.length,
        collectionNames: Array.from(collectionCards)
          .map((c) => c.textContent?.substring(0, 50)),
      };
    });

    console.log('Collections List State:');
    console.log('  Page Title:', listState.pageTitle);
    console.log('  Total Collections:', listState.totalCollections);
    console.log('  Collection Names:', listState.collectionNames);

    expect(listState.totalCollections).toBe(allCollections.length);
    console.log('✅ UI matches database: same number of collections');

    // Verify our created collection appears
    const ourCollectionCard = authenticatedPage.locator(
      `[data-testid="collection-card--${createdCollectionId}"]`
    );
    await expect(ourCollectionCard).toBeVisible();
    console.log('✅ Created collection visible in list');

    // Screenshot: Collections list
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'collections-list.png'),
      fullPage: false,
    });
    console.log('📸 Saved: collections-list.png');

    console.log('\n✅ Collections list verification complete!\n');
  });

  test('verify generation flows', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== GENERATION FLOWS TEST ===\n');

    // 🔍 DATABASE VERIFICATION
    const flows = await db.query.generationFlow.findMany({
      where: (flow, { eq }) => eq(flow.collectionSessionId, createdCollectionId),
    });

    console.log(`Database has ${flows.length} flow(s) for this collection`);
    expect(flows.length).toBeGreaterThan(0);

    const flow = flows[0];
    console.log('Flow details:');
    console.log('  ID:', flow.id);
    console.log('  Name:', flow.name);
    console.log('  Status:', flow.status);
    console.log('  Products:', flow.productIds.length);

    // Navigate to collection studio to see flows UI
    await authenticatedPage.goto(`/studio/collections/${createdCollectionId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // 📸 UI VERIFICATION (if there's a flows section visible)
    const flowsVisible = await authenticatedPage.evaluate(() => {
      const flowsList = document.querySelector('[data-testid*="generation-flow"]');
      return !!flowsList;
    });

    if (flowsVisible) {
      console.log('✅ Generation flows visible in UI');

      // Screenshot generation flows section (if exists)
      const flowsSection = authenticatedPage.locator('[data-testid*="generation-flow"]').first();
      if (await flowsSection.isVisible()) {
        await flowsSection.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'collection-generation-flows.png'),
        });
        console.log('📸 Saved: collection-generation-flows.png');
      }
    }

    console.log('\n✅ Generation flows verification complete!\n');
  });
});
```

### Example: Products Feature Tests

**File:** `__tests__/e2e/tests/products/test.spec.ts`

```typescript
/**
 * Products Feature Tests
 *
 * Tests:
 * - Products list view
 * - Product upload
 * - Product detail page
 * - Bulk actions (select, delete)
 * - Grid/table view toggle
 * - Scene type selection
 *
 * Screenshots captured:
 * - products-list-table.png
 * - products-list-grid.png
 * - product-detail.png
 * - product-upload.png
 * - products-bulk-selection.png
 */

import { test, expect } from '../../setup/auth-fixtures';
import { createNavigationHelper } from '../../helpers/navigation';
import { product } from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

test.use({ testClientName: 'products' });

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Products Feature', () => {
  test.describe.configure({ mode: 'serial' });

  test('verify products list table view', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== PRODUCTS LIST TABLE VIEW TEST ===\n');

    const nav = createNavigationHelper(authenticatedPage, clientId);
    await nav.goToProducts();

    // 🔍 DATABASE VERIFICATION
    const allProducts = await db.query.product.findMany({
      where: (prod, { eq }) => eq(prod.clientId, clientId),
    });

    console.log(`Database has ${allProducts.length} products`);

    // 📸 UI VERIFICATION
    const listState = await authenticatedPage.evaluate(() => {
      const productRows = document.querySelectorAll('[data-testid^="product-row--"]');
      return {
        viewMode: document.querySelector('[data-testid="view-toggle-table"]')?.getAttribute('aria-pressed') === 'true' ? 'table' : 'grid',
        totalProducts: productRows.length,
        hasCheckboxes: document.querySelectorAll('[data-testid^="product-row--"] input[type="checkbox"]').length > 0,
      };
    });

    console.log('Products List State:', listState);
    expect(listState.viewMode).toBe('table');
    expect(listState.totalProducts).toBe(allProducts.length);
    expect(listState.hasCheckboxes).toBe(true);

    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'products-list-table.png'),
      fullPage: false,
    });
    console.log('📸 Saved: products-list-table.png');

    console.log('\n✅ Table view verification complete!\n');
  });

  test('verify grid view toggle', async ({ authenticatedPage }) => {
    console.log('\n=== GRID VIEW TEST ===\n');

    // Click grid view toggle
    const gridToggle = authenticatedPage.locator('[data-testid="view-toggle-grid"]');
    await gridToggle.click();
    await authenticatedPage.waitForTimeout(500);

    // 📸 UI VERIFICATION
    const gridState = await authenticatedPage.evaluate(() => {
      const productCards = document.querySelectorAll('[data-testid^="product-grid-card--"]');
      return {
        viewMode: 'grid',
        totalProducts: productCards.length,
      };
    });

    console.log('Grid View State:', gridState);
    expect(gridState.totalProducts).toBeGreaterThan(0);

    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'products-list-grid.png'),
      fullPage: false,
    });
    console.log('📸 Saved: products-list-grid.png');

    console.log('\n✅ Grid view verification complete!\n');
  });

  test('verify bulk selection and actions', async ({ authenticatedPage }) => {
    console.log('\n=== BULK ACTIONS TEST ===\n');

    // Switch back to table view
    const tableToggle = authenticatedPage.locator('[data-testid="view-toggle-table"]');
    await tableToggle.click();
    await authenticatedPage.waitForTimeout(500);

    // Select first product
    const firstCheckbox = authenticatedPage.locator(
      '[data-testid^="product-row--"] input[type="checkbox"]'
    ).first();
    await firstCheckbox.click();
    await authenticatedPage.waitForTimeout(300);

    // 📸 UI VERIFICATION
    const selectionState = await authenticatedPage.evaluate(() => {
      const island = document.querySelector('[data-testid="selection-action-island"]');
      return {
        islandVisible: !!island && getComputedStyle(island).display !== 'none',
        selectedCount: island?.querySelector('[data-testid="selection-count"]')?.textContent?.trim(),
        hasDeleteButton: !!island?.querySelector('[data-testid="bulk-delete-button"]'),
      };
    });

    console.log('Selection State:', selectionState);
    expect(selectionState.islandVisible).toBe(true);
    expect(selectionState.hasDeleteButton).toBe(true);

    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'products-bulk-selection.png'),
      fullPage: false,
    });
    console.log('📸 Saved: products-bulk-selection.png');

    // Clear selection
    const clearButton = authenticatedPage.locator('[data-testid="selection-clear-button"]');
    await clearButton.click();

    console.log('\n✅ Bulk actions verification complete!\n');
  });

  test('verify product detail page', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== PRODUCT DETAIL TEST ===\n');

    // 🔍 DATABASE VERIFICATION - Get first product
    const firstProduct = await db.query.product.findFirst({
      where: (prod, { eq }) => eq(prod.clientId, clientId),
    });

    expect(firstProduct).toBeTruthy();
    console.log('Navigating to product:', firstProduct!.name);

    // Navigate to product detail
    await authenticatedPage.goto(`/products/${firstProduct!.id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // 📸 UI VERIFICATION
    const detailState = await authenticatedPage.evaluate(() => {
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        hasDescription: !!document.querySelector('[data-testid="product-description"]'),
        hasSceneType: !!document.querySelector('[data-testid="product-scene-type"]'),
        hasActions: !!document.querySelector('[data-testid="product-actions"]'),
      };
    });

    console.log('Product Detail State:', detailState);
    expect(detailState.pageTitle).toBe(firstProduct!.name);

    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'product-detail.png'),
      fullPage: false,
    });
    console.log('📸 Saved: product-detail.png');

    console.log('\n✅ Product detail verification complete!\n');
  });
});
```

## Running Tests

### Run All Tests (Parallel by Feature)

```bash
# Run all E2E tests
cd apps/epox-platform
npx playwright test __tests__/e2e/tests/

# Tests run in parallel by feature:
# - collections/ tests run sequentially in worker 1
# - products/ tests run sequentially in worker 2
# - store/ tests run sequentially in worker 3
# - studio/ tests run sequentially in worker 4
```

### Run Specific Feature

```bash
# Run only collections tests
npx playwright test __tests__/e2e/tests/collections/

# Run only products tests
npx playwright test __tests__/e2e/tests/products/

# Run only store tests
npx playwright test __tests__/e2e/tests/store/
```

### Seeding

Seed all features before running tests:

```bash
# Seed all features
cd apps/epox-platform
tsx __tests__/e2e/tests/collections/seed.ts
tsx __tests__/e2e/tests/products/seed.ts
tsx __tests__/e2e/tests/store/seed.ts
tsx __tests__/e2e/tests/studio/seed.ts

# Or create a convenience script
yarn test:seed-all
```

## Benefits of This Approach

### ✅ Minimal Containers

- **One container per feature** (not per test)
- Collections tests share one client/container
- Products tests share one client/container
- Store tests share one client/container
- Studio tests share one client/container

### ✅ Maximum Coverage

- **Complete user flows** tested within each feature
- **Sequential execution** within feature allows state building
- **Database + UI verification** ensures correctness
- **Comprehensive screenshots** for visual regression

### ✅ Parallel Execution

- **Different features run in parallel** (fast overall execution)
- **Same feature runs sequentially** (predictable state)
- Playwright workers map to test clients automatically

### ✅ Maintainability

- **Organized by feature** - easy to find related tests
- **Clear seeding** - each feature seeds its own data
- **Isolated state** - features don't interfere with each other
- **Reusable helpers** - navigation and seed helpers reduce duplication

## Migration Strategy

### Step 1: Create New Test Clients

Update `test-clients.ts` with feature-specific clients (collections, products, store, studio).

### Step 2: Create Seed Helpers

Extract seeding logic into `seed-helpers.ts` for reusability.

### Step 3: Migrate One Feature

1. Create `__tests__/e2e/tests/collections/` folder
2. Create `seed.ts` for collections-specific data
3. Move collection-related tests to `test.spec.ts`
4. Update tests to use `test.use({ testClientName: 'collections' })`
5. Add database verification using `db` fixture
6. Organize screenshots in `screenshots/` subfolder

### Step 4: Repeat for Other Features

Follow the same pattern for products, store, and studio features.

### Step 5: Update Global Setup

Modify `global-setup.ts` to authenticate all feature test clients.

## Best Practices

1. **Use `test.describe.configure({ mode: 'serial' })`** to run tests sequentially within a feature
2. **Share created IDs** between tests (e.g., `createdCollectionId`)
3. **Database verify first**, then UI screenshot
4. **Name screenshots descriptively** (e.g., `create-collection-selection.png`)
5. **Document what screenshots capture** in test file header
6. **Clean data before seeding** for idempotency
7. **Use meaningful test descriptions** that explain what's being verified

## Token Efficiency

- **Text extraction** before screenshots (cheap verification)
- **Element screenshots** instead of full page (when possible)
- **Database queries** for state verification (cheapest)
- **Navigation helpers** reduce repeated code
- **Selective screenshots** only where needed for visual verification
