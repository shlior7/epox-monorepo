# E2E Client-Based Testing with Visual Verification

## Overview

Each test explicitly chooses a **test client** (e.g., `test-client-1`, `test-client-2`). Each client gets its own:
- Docker PostgreSQL container
- Isolated database
- Authentication credentials

Tests that use the same client run **sequentially** (share data). Tests with different clients run **in parallel**.

Tests verify both:
- ✅ **Database state** - Data was created correctly
- ✅ **UI state** - Data appears correctly in screenshots

---

## Architecture

### Client-Based Workers

```
┌─────────────────────────────────────────┐
│  Test Client 1 (Worker 1)               │
│  ├─ PostgreSQL Container (port 5433)    │
│  ├─ Email: test-client-1@test.com       │
│  ├─ Password: TestPassword123!          │
│  └─ Tests: collection-create.spec.ts    │
│            collection-edit.spec.ts      │
│            (run sequentially)           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Test Client 2 (Worker 2)               │
│  ├─ PostgreSQL Container (port 5434)    │
│  ├─ Email: test-client-2@test.com       │
│  ├─ Password: TestPassword123!          │
│  └─ Tests: product-upload.spec.ts       │
│            product-edit.spec.ts         │
│            (run sequentially)           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Test Client 3 (Worker 3)               │
│  ├─ PostgreSQL Container (port 5435)    │
│  ├─ Email: test-client-3@test.com       │
│  ├─ Password: TestPassword123!          │
│  └─ Tests: store-import.spec.ts         │
│            store-sync.spec.ts           │
│            (run sequentially)           │
└─────────────────────────────────────────┘
```

**Tests using different clients run in parallel ⚡**
**Tests using the same client run sequentially 📋**

---

## Implementation

### Step 1: Client-Based Fixture

Create `apps/epox-platform/__tests__/fixtures/client-fixture.ts`:

```typescript
import { test as base, expect } from '@playwright/test';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { hash } from '@node-rs/bcrypt';
import * as schema from '@/../../packages/visualizer-db/src/schema';

/**
 * Test client configuration
 */
export interface TestClientConfig {
  id: string;
  email: string;
  password: string;
  name: string;
}

/**
 * Available test clients
 * Each client gets its own database container and worker
 */
export const TEST_CLIENTS: Record<string, TestClientConfig> = {
  'client-1': {
    id: 'test-client-1',
    email: 'test-client-1@test.com',
    password: 'TestPassword123!',
    name: 'Test Client 1',
  },
  'client-2': {
    id: 'test-client-2',
    email: 'test-client-2@test.com',
    password: 'TestPassword123!',
    name: 'Test Client 2',
  },
  'client-3': {
    id: 'test-client-3',
    email: 'test-client-3@test.com',
    password: 'TestPassword123!',
    name: 'Test Client 3',
  },
  'client-4': {
    id: 'test-client-4',
    email: 'test-client-4@test.com',
    password: 'TestPassword123!',
    name: 'Test Client 4',
  },
};

/**
 * Test fixtures with client-based isolation
 */
export interface TestFixtures {
  // The test client configuration
  testClient: TestClientConfig;

  // Database connection for this client
  db: ReturnType<typeof drizzle>;

  // Authenticated page (already logged in)
  authenticatedPage: typeof base.prototype.page;
}

/**
 * Worker fixtures (one per test client)
 */
export interface WorkerFixtures {
  // PostgreSQL container for this worker
  container: StartedTestContainer;

  // Database URL for this worker
  databaseUrl: string;
}

/**
 * Extended test with client-based fixtures
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  /**
   * Start a PostgreSQL container per worker (one worker per test client)
   */
  container: [
    async ({ }, use, workerInfo) => {
      const clientKey = Object.keys(TEST_CLIENTS)[workerInfo.workerIndex % Object.keys(TEST_CLIENTS).length];
      const client = TEST_CLIENTS[clientKey];

      console.log(`\n🐳 Starting PostgreSQL container for ${client.id}...`);

      const container = await new GenericContainer('postgres:15-alpine')
        .withEnvironment({
          POSTGRES_USER: 'test',
          POSTGRES_PASSWORD: 'test',
          POSTGRES_DB: 'visualizer_test',
        })
        .withExposedPorts(5432)
        .withWaitStrategy(Wait.forHealthCheck())
        .withHealthCheck({
          test: ['CMD-SHELL', 'pg_isready -U test'],
          interval: 2000,
          timeout: 5000,
          retries: 5,
        })
        .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
        .start();

      const port = container.getMappedPort(5432);
      console.log(`✅ PostgreSQL ready for ${client.id} on port ${port}\n`);

      await use(container);

      console.log(`\n🧹 Stopping container for ${client.id}...`);
      await container.stop();
    },
    { scope: 'worker', auto: true },
  ],

  /**
   * Database URL for this worker
   */
  databaseUrl: [
    async ({ container }, use) => {
      const port = container.getMappedPort(5432);
      const databaseUrl = `postgresql://test:test@localhost:${port}/visualizer_test`;
      await use(databaseUrl);
    },
    { scope: 'worker' },
  ],

  /**
   * Test client configuration
   * Each test explicitly chooses which client to use
   */
  testClient: async ({ }, use, testInfo) => {
    // Extract client from test title or use annotation
    const clientMatch = testInfo.title.match(/\[client-(\d+)\]/) ||
                       testInfo.annotations.find(a => a.type === 'client');

    const clientKey = clientMatch
      ? `client-${clientMatch[1] || clientMatch.description}`
      : 'client-1'; // Default to client-1

    const client = TEST_CLIENTS[clientKey];

    if (!client) {
      throw new Error(`Unknown test client: ${clientKey}`);
    }

    console.log(`  📋 Test using: ${client.email}`);

    await use(client);
  },

  /**
   * Database connection for this test's client
   */
  db: async ({ databaseUrl, testClient }, use) => {
    const connection = postgres(databaseUrl, { max: 1 });
    const db = drizzle(connection, { schema });

    // Run migrations (only first time per worker)
    try {
      await migrate(db, {
        migrationsFolder: './packages/visualizer-db/migrations',
      });
    } catch (error) {
      // Migrations already run for this worker
    }

    // Seed client and user (idempotent - won't fail if already exists)
    try {
      await db.insert(schema.client).values({
        id: testClient.id,
        name: testClient.name,
        slug: testClient.id,
        version: 1,
      }).onConflictDoNothing();

      const hashedPassword = await hash(testClient.password, 10);

      await db.insert(schema.user).values({
        id: `user-${testClient.id}`,
        email: testClient.email,
        name: testClient.name,
        emailVerified: true,
        password: hashedPassword,
      }).onConflictDoNothing();

      await db.insert(schema.member).values({
        id: `member-${testClient.id}`,
        userId: `user-${testClient.id}`,
        clientId: testClient.id,
        role: 'owner',
      }).onConflictDoNothing();
    } catch (error) {
      // Already exists, continue
    }

    await use(db);

    await connection.end();
  },

  /**
   * Authenticated page (already logged in as test client)
   */
  authenticatedPage: async ({ page, testClient }, use) => {
    console.log(`  🔐 Logging in as ${testClient.email}...`);

    await page.goto('/login');
    await page.fill('#email', testClient.email);
    await page.fill('#password', testClient.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|home|studio)/, { timeout: 15000 });

    console.log(`  ✅ Authenticated\n`);

    await use(page);
  },
});

export { expect };
```

### Step 2: Screenshot Helpers

Create `apps/epox-platform/__tests__/helpers/screenshot.ts`:

```typescript
import { Page } from '@playwright/test';
import path from 'path';

/**
 * Screenshot configuration
 */
export interface ScreenshotOptions {
  // Name of the screenshot (without extension)
  name: string;

  // Full page or specific element
  fullPage?: boolean;

  // Element selector to screenshot
  selector?: string;

  // Mask elements (hide dynamic content)
  mask?: string[];

  // Animations: 'allow' | 'disabled'
  animations?: 'allow' | 'disabled';
}

/**
 * Take a screenshot and save with test name prefix
 */
export async function takeScreenshot(
  page: Page,
  options: ScreenshotOptions,
  testInfo: { title: string }
): Promise<void> {
  const {
    name,
    fullPage = false,
    selector,
    mask = [],
    animations = 'disabled',
  } = options;

  // Disable animations for stable screenshots
  if (animations === 'disabled') {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  }

  // Wait for images and fonts to load
  await page.waitForLoadState('networkidle');

  // Generate filename from test name
  const sanitizedTestName = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const filename = `${sanitizedTestName}-${name}.png`;
  const screenshotPath = path.join('__tests__/e2e/screenshots', filename);

  // Mask dynamic elements
  const maskSelectors = mask.map((sel) => page.locator(sel));

  if (selector) {
    // Screenshot specific element
    const element = page.locator(selector);
    await element.screenshot({
      path: screenshotPath,
      mask: maskSelectors,
    });
  } else {
    // Screenshot full page or viewport
    await page.screenshot({
      path: screenshotPath,
      fullPage,
      mask: maskSelectors,
    });
  }

  console.log(`  📸 Screenshot saved: ${filename}`);
}

/**
 * Compare screenshot with baseline (visual regression)
 */
export async function compareScreenshot(
  page: Page,
  options: ScreenshotOptions,
  testInfo: { title: string }
): Promise<void> {
  const { name, selector } = options;

  const sanitizedTestName = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const screenshotName = `${sanitizedTestName}-${name}`;

  if (selector) {
    const element = page.locator(selector);
    await element.screenshot({
      path: `__tests__/e2e/screenshots/${screenshotName}.png`,
    });
  } else {
    await page.screenshot({
      path: `__tests__/e2e/screenshots/${screenshotName}.png`,
    });
  }
}
```

### Step 3: Seed Helpers (Enhanced)

Create `apps/epox-platform/__tests__/helpers/seed.ts`:

```typescript
import type { DrizzleClient } from '@/lib/services/db';
import * as schema from '@/../../packages/visualizer-db/src/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed a product with optional images
 */
export async function seedProduct(
  db: DrizzleClient,
  clientId: string,
  options?: {
    name?: string;
    category?: string;
    sceneTypes?: string[];
    price?: string;
    imageCount?: number;
  }
) {
  const productId = `prod-${uuidv4().slice(0, 8)}`;

  const [product] = await db
    .insert(schema.product)
    .values({
      id: productId,
      clientId,
      name: options?.name || 'Test Product',
      category: options?.category || 'Furniture',
      sceneTypes: options?.sceneTypes || ['living-room'],
      price: options?.price || '299.99',
      source: 'uploaded',
      isFavorite: false,
      version: 1,
    })
    .returning();

  console.log(`  🌱 Seeded product: ${product.name} (${product.id})`);

  // Seed images if requested
  const images = [];
  if (options?.imageCount && options.imageCount > 0) {
    for (let i = 0; i < options.imageCount; i++) {
      const [image] = await db
        .insert(schema.productImage)
        .values({
          id: `img-${uuidv4().slice(0, 8)}`,
          productId: product.id,
          r2KeyBase: `products/${product.id}/image-${i}.jpg`,
          r2KeyPreview: null,
          sortOrder: i,
          isPrimary: i === 0,
          version: 1,
        })
        .returning();

      images.push(image);
    }

    console.log(`  🌱 Seeded ${images.length} images for product ${product.id}`);
  }

  return { product, images };
}

/**
 * Seed a collection session
 */
export async function seedCollection(
  db: DrizzleClient,
  clientId: string,
  productIds: string[],
  options?: {
    name?: string;
    status?: 'draft' | 'generating' | 'completed';
  }
) {
  const collectionId = `coll-${uuidv4().slice(0, 8)}`;

  const [collection] = await db
    .insert(schema.collectionSession)
    .values({
      id: collectionId,
      clientId,
      name: options?.name || 'Test Collection',
      status: options?.status || 'draft',
      productIds,
      selectedBaseImages: {},
      settings: null,
      version: 1,
    })
    .returning();

  console.log(`  🌱 Seeded collection: ${collection.name} (${collection.id})`);

  return collection;
}

/**
 * Seed a generation flow
 */
export async function seedGenerationFlow(
  db: DrizzleClient,
  collectionId: string,
  productIds: string[],
  options?: {
    status?: 'draft' | 'generating' | 'completed' | 'error';
  }
) {
  const flowId = `flow-${uuidv4().slice(0, 8)}`;

  const [flow] = await db
    .insert(schema.generationFlow)
    .values({
      id: flowId,
      collectionSessionId: collectionId,
      productIds,
      status: options?.status || 'draft',
      settings: {},
      selectedBaseImages: {},
    })
    .returning();

  console.log(`  🌱 Seeded generation flow: ${flow.id}`);

  return flow;
}

/**
 * Seed a store connection
 */
export async function seedStoreConnection(
  db: DrizzleClient,
  clientId: string,
  options?: {
    storeType?: 'shopify' | 'woocommerce';
    storeUrl?: string;
    storeName?: string;
    status?: 'active' | 'inactive' | 'error';
  }
) {
  const connectionId = `store-${uuidv4().slice(0, 8)}`;

  const [connection] = await db
    .insert(schema.storeConnection)
    .values({
      id: connectionId,
      clientId,
      storeType: options?.storeType || 'shopify',
      storeUrl: options?.storeUrl || 'https://test-store.myshopify.com',
      storeName: options?.storeName || 'Test Store',
      status: options?.status || 'active',
      accessToken: 'encrypted-test-token',
      version: 1,
    })
    .returning();

  console.log(`  🌱 Seeded store connection: ${connection.storeName} (${connection.id})`);

  return connection;
}

/**
 * Seed a complete product catalog
 */
export async function seedProductCatalog(
  db: DrizzleClient,
  clientId: string,
  count = 5
) {
  console.log(`  🌱 Seeding ${count} products...`);

  const products = [];
  for (let i = 0; i < count; i++) {
    const { product, images } = await seedProduct(db, clientId, {
      name: `Product ${i + 1}`,
      category: ['Furniture', 'Lighting', 'Decor'][i % 3],
      sceneTypes: [['living-room'], ['bedroom'], ['dining-room']][i % 3],
      imageCount: 2,
    });
    products.push({ product, images });
  }

  return products;
}
```

---

## Test Examples

### Example 1: Collection Creation with Screenshots

Create `apps/epox-platform/__tests__/e2e/collections.spec.ts`:

```typescript
import { test, expect } from '../fixtures/client-fixture';
import { seedProduct } from '../helpers/seed';
import { takeScreenshot } from '../helpers/screenshot';

test.describe('Collection Creation Flow', () => {
  /**
   * Test: Create collection from product selection
   * Client: test-client-1
   */
  test('[client-1] user can create collection and see it in UI', async ({
    authenticatedPage: page,
    testClient,
    db,
  }, testInfo) => {
    // 🌱 SEED: Create 2 products for this test
    console.log('🌱 Seeding test data...');
    const { product: product1 } = await seedProduct(db, testClient.id, {
      name: 'Modern Sofa',
      category: 'Furniture',
      sceneTypes: ['living-room'],
      imageCount: 2,
    });
    const { product: product2 } = await seedProduct(db, testClient.id, {
      name: 'Coffee Table',
      category: 'Furniture',
      sceneTypes: ['living-room'],
      imageCount: 2,
    });

    // 📋 Navigate to studio page
    console.log('📋 Navigating to studio...');
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    // 📸 Screenshot: Studio with products
    await takeScreenshot(page, {
      name: 'studio-with-products',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'], // Mask dynamic timestamps
    }, testInfo);

    // ✅ Select products
    console.log('✅ Selecting products...');
    await page.click(`[data-testid="product-card-${product1.id}"] [data-testid="select"]`);
    await page.click(`[data-testid="product-card-${product2.id}"] [data-testid="select"]`);

    // Verify selection island appears
    await expect(page.locator('[data-testid="selection-island"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-island-count"]')).toContainText('2 selected');

    // 📸 Screenshot: Products selected
    await takeScreenshot(page, {
      name: 'products-selected',
      selector: '[data-testid="selection-island"]',
    }, testInfo);

    // 🎨 Create collection
    console.log('🎨 Creating collection...');
    await page.click('button:has-text("Create Collection")');

    // Wait for redirect to collection studio
    await page.waitForURL(/\/studio\/collections\/[a-z0-9-]+/, { timeout: 10000 });
    const collectionId = page.url().split('/').pop()!;

    console.log(`✅ Collection created: ${collectionId}`);

    // 📸 Screenshot: Collection studio page
    await takeScreenshot(page, {
      name: 'collection-studio',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    }, testInfo);

    // ✅ Verify products are shown in collection
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(2);
    await expect(page.locator('h1')).toContainText('Collection');

    // 🔍 VERIFY IN DATABASE
    console.log('🔍 Verifying in database...');
    const collection = await db.query.collectionSession.findFirst({
      where: (coll, { eq }) => eq(coll.id, collectionId),
    });

    expect(collection).toBeDefined();
    expect(collection!.clientId).toBe(testClient.id);
    expect(collection!.productIds).toHaveLength(2);
    expect(collection!.productIds).toContain(product1.id);
    expect(collection!.productIds).toContain(product2.id);
    expect(collection!.status).toBe('draft');

    // 📋 Navigate to collections list
    console.log('📋 Navigating to collections list...');
    await page.goto('/collections');
    await page.waitForLoadState('networkidle');

    // ✅ Verify collection appears in list
    await expect(page.locator(`[data-testid="collection-card-${collectionId}"]`)).toBeVisible();

    // 📸 Screenshot: Collections list showing new collection
    await takeScreenshot(page, {
      name: 'collections-list',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    }, testInfo);

    console.log('✅ Test completed successfully');
  });

  /**
   * Test: Add products to existing collection
   * Client: test-client-1 (same client, will run after previous test)
   */
  test('[client-1] user can add products to existing collection', async ({
    authenticatedPage: page,
    testClient,
    db,
  }, testInfo) => {
    // 🌱 SEED: Create collection with 1 product, plus 1 new product to add
    const { product: existingProduct } = await seedProduct(db, testClient.id, {
      name: 'Existing Product',
      imageCount: 2,
    });
    const collection = await db
      .insert(schema.collectionSession)
      .values({
        id: `coll-test-${Date.now()}`,
        clientId: testClient.id,
        name: 'Test Collection',
        productIds: [existingProduct.id],
        selectedBaseImages: {},
        status: 'draft',
        version: 1,
      })
      .returning()
      .then((rows) => rows[0]);

    const { product: newProduct } = await seedProduct(db, testClient.id, {
      name: 'New Product',
      imageCount: 2,
    });

    // 📋 Navigate to collection studio
    await page.goto(`/studio/collections/${collection.id}`);
    await page.waitForLoadState('networkidle');

    // 📸 Screenshot: Collection before adding product
    await takeScreenshot(page, {
      name: 'collection-before-add',
      fullPage: true,
    }, testInfo);

    // ✅ Verify only 1 product initially
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(1);

    // ➕ Add new product
    await page.click('button:has-text("Add Products")');
    await page.click(`[data-testid="product-card-${newProduct.id}"] [data-testid="select"]`);
    await page.click('button:has-text("Add Selected")');

    // ✅ Verify 2 products now
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(2);

    // 📸 Screenshot: Collection after adding product
    await takeScreenshot(page, {
      name: 'collection-after-add',
      fullPage: true,
    }, testInfo);

    // 🔍 VERIFY IN DATABASE
    const updatedCollection = await db.query.collectionSession.findFirst({
      where: (coll, { eq }) => eq(coll.id, collection.id),
    });

    expect(updatedCollection!.productIds).toHaveLength(2);
    expect(updatedCollection!.productIds).toContain(newProduct.id);
  });
});
```

### Example 2: Product Upload with Screenshots

Create `apps/epox-platform/__tests__/e2e/products.spec.ts`:

```typescript
import { test, expect } from '../fixtures/client-fixture';
import { seedProduct } from '../helpers/seed';
import { takeScreenshot } from '../helpers/screenshot';

test.describe('Product Management', () => {
  /**
   * Test: Upload product image
   * Client: test-client-2
   */
  test('[client-2] user can upload product image and see it in gallery', async ({
    authenticatedPage: page,
    testClient,
    db,
  }, testInfo) => {
    // 🌱 SEED: Create product without images
    const { product } = await seedProduct(db, testClient.id, {
      name: 'Chair Without Images',
      imageCount: 0,
    });

    // 📋 Navigate to product page
    await page.goto(`/products/${product.id}`);
    await page.waitForLoadState('networkidle');

    // 📸 Screenshot: Product page before upload
    await takeScreenshot(page, {
      name: 'product-before-upload',
      fullPage: true,
    }, testInfo);

    // ✅ Verify no images shown
    await expect(page.locator('[data-testid="product-image"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="empty-images"]')).toBeVisible();

    // 🖼️ Upload image
    await page.click('button:has-text("Upload Image")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-assets/sample-chair.jpg');

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

    // 📸 Screenshot: Upload success notification
    await takeScreenshot(page, {
      name: 'upload-success-notification',
      selector: '[data-testid="upload-success"]',
    }, testInfo);

    // ✅ Verify image appears in gallery
    await expect(page.locator('[data-testid="product-image-0"]')).toBeVisible();

    // 📸 Screenshot: Product page after upload
    await takeScreenshot(page, {
      name: 'product-after-upload',
      fullPage: true,
    }, testInfo);

    // 🔍 VERIFY IN DATABASE
    const images = await db.query.productImage.findMany({
      where: (image, { eq, isNull }) =>
        eq(image.productId, product.id) && isNull(image.deletedAt),
    });

    expect(images).toHaveLength(1);
    expect(images[0].productId).toBe(product.id);
    expect(images[0].r2KeyBase).toContain(product.id);
    expect(images[0].isPrimary).toBe(true);
  });

  /**
   * Test: Edit product details
   * Client: test-client-2
   */
  test('[client-2] user can edit product name and category', async ({
    authenticatedPage: page,
    testClient,
    db,
  }, testInfo) => {
    // 🌱 SEED: Create product
    const { product } = await seedProduct(db, testClient.id, {
      name: 'Old Product Name',
      category: 'Old Category',
      imageCount: 1,
    });

    // 📋 Navigate to product edit page
    await page.goto(`/products/${product.id}`);
    await page.click('button:has-text("Edit Details")');
    await page.waitForLoadState('networkidle');

    // 📸 Screenshot: Edit form
    await takeScreenshot(page, {
      name: 'product-edit-form',
      selector: '[data-testid="product-edit-form"]',
    }, testInfo);

    // ✏️ Edit name and category
    await page.fill('input[name="name"]', 'New Product Name');
    await page.selectOption('select[name="category"]', 'Lighting');
    await page.click('button[type="submit"]');

    // Wait for save
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

    // 📸 Screenshot: After save
    await takeScreenshot(page, {
      name: 'product-after-edit',
      fullPage: true,
    }, testInfo);

    // ✅ Verify updated values shown
    await expect(page.locator('h1')).toContainText('New Product Name');
    await expect(page.locator('[data-testid="product-category"]')).toContainText('Lighting');

    // 🔍 VERIFY IN DATABASE
    const updatedProduct = await db.query.product.findFirst({
      where: (p, { eq }) => eq(p.id, product.id),
    });

    expect(updatedProduct!.name).toBe('New Product Name');
    expect(updatedProduct!.category).toBe('Lighting');
  });
});
```

### Example 3: Store Import with Screenshots

Create `apps/epox-platform/__tests__/e2e/store.spec.ts`:

```typescript
import { test, expect } from '../fixtures/client-fixture';
import { seedStoreConnection } from '../helpers/seed';
import { takeScreenshot } from '../helpers/screenshot';

test.describe('Store Import Flow', () => {
  /**
   * Test: Connect store and import products
   * Client: test-client-3
   */
  test('[client-3] user can connect store and import products', async ({
    authenticatedPage: page,
    testClient,
    db,
  }, testInfo) => {
    // 📋 Navigate to store page (no connection yet)
    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    // 📸 Screenshot: Store page before connection
    await takeScreenshot(page, {
      name: 'store-not-connected',
      fullPage: true,
    }, testInfo);

    // ✅ Verify "Connect Store" CTA is shown
    await expect(page.locator('[data-testid="connect-store-cta"]')).toBeVisible();

    // 🌱 SEED: Simulate store connection (in real test, this would go through OAuth flow)
    const storeConnection = await seedStoreConnection(db, testClient.id, {
      storeType: 'shopify',
      storeName: 'My Test Store',
      storeUrl: 'https://my-test-store.myshopify.com',
      status: 'active',
    });

    // 🔄 Refresh page to show connection
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 📸 Screenshot: Store connected
    await takeScreenshot(page, {
      name: 'store-connected',
      fullPage: true,
    }, testInfo);

    // ✅ Verify connection is shown
    await expect(page.locator('[data-testid="store-connected"]')).toBeVisible();
    await expect(page.locator('[data-testid="store-name"]')).toContainText('My Test Store');

    // 📥 Click import products
    await page.click('button:has-text("Import Products")');

    // 📸 Screenshot: Import modal
    await takeScreenshot(page, {
      name: 'import-modal',
      selector: '[data-testid="import-modal"]',
    }, testInfo);

    // ✅ Select products to import (mock data would be shown via MSW)
    await page.click('[data-testid="store-product-1"] [data-testid="select"]');
    await page.click('[data-testid="store-product-2"] [data-testid="select"]');

    // 📸 Screenshot: Products selected for import
    await takeScreenshot(page, {
      name: 'import-products-selected',
      selector: '[data-testid="import-modal"]',
    }, testInfo);

    // 📥 Import selected products
    await page.click('button:has-text("Import Selected")');

    // Wait for import to complete
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 15000 });

    // 📸 Screenshot: Import success
    await takeScreenshot(page, {
      name: 'import-success',
      fullPage: true,
    }, testInfo);

    // 📋 Navigate to products page
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // ✅ Verify imported products shown with "Imported" badge
    await expect(page.locator('[data-testid="source-badge"]:has-text("Imported")')).toHaveCount(2);

    // 📸 Screenshot: Products list with imported products
    await takeScreenshot(page, {
      name: 'products-list-with-imports',
      fullPage: true,
    }, testInfo);

    // 🔍 VERIFY IN DATABASE
    const importedProducts = await db.query.product.findMany({
      where: (p, { eq }) => eq(p.storeConnectionId, storeConnection.id),
    });

    expect(importedProducts).toHaveLength(2);
    expect(importedProducts[0].source).toBe('imported');
    expect(importedProducts[0].storeConnectionId).toBe(storeConnection.id);
  });

  /**
   * Test: Sync imported products
   * Client: test-client-3 (runs after previous test)
   */
  test('[client-3] user can sync imported products', async ({
    authenticatedPage: page,
    testClient,
    db,
  }, testInfo) => {
    // 🌱 SEED: Store connection with imported product
    const storeConnection = await seedStoreConnection(db, testClient.id);
    const [importedProduct] = await db
      .insert(schema.product)
      .values({
        id: 'prod-imported-test',
        clientId: testClient.id,
        name: 'Imported Chair',
        source: 'imported',
        storeConnectionId: storeConnection.id,
        storeId: 'shopify-prod-123',
        storeUrl: 'https://store.com/products/chair',
        storeName: 'Chair Product',
        version: 1,
      })
      .returning();

    // 📋 Navigate to store page
    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    // 📸 Screenshot: Before sync
    await takeScreenshot(page, {
      name: 'before-sync',
      fullPage: true,
    }, testInfo);

    // 🔄 Click sync button for product
    await page.click(`[data-testid="product-${importedProduct.id}"] [data-testid="sync-button"]`);

    // Wait for sync to complete
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();

    // 📸 Screenshot: Sync success
    await takeScreenshot(page, {
      name: 'sync-success',
      selector: `[data-testid="product-${importedProduct.id}"]`,
    }, testInfo);

    // 🔍 VERIFY IN DATABASE - importedAt timestamp updated
    const syncedProduct = await db.query.product.findFirst({
      where: (p, { eq }) => eq(p.id, importedProduct.id),
    });

    expect(syncedProduct!.importedAt).not.toEqual(importedProduct.importedAt);
  });
});
```

---

## Test Organization by Client

### Recommended Structure:

```
__tests__/e2e/
├── client-1/
│   ├── collections-create.spec.ts
│   ├── collections-edit.spec.ts
│   └── collections-delete.spec.ts
├── client-2/
│   ├── products-upload.spec.ts
│   ├── products-edit.spec.ts
│   └── products-delete.spec.ts
├── client-3/
│   ├── store-connect.spec.ts
│   ├── store-import.spec.ts
│   └── store-sync.spec.ts
└── client-4/
    ├── generation-image.spec.ts
    ├── generation-video.spec.ts
    └── generation-batch.spec.ts
```

Or use client annotations:

```typescript
// All tests in this file use client-1
test.describe('Collections [client-1]', () => {
  test('create collection', async ({ ... }) => { ... });
  test('edit collection', async ({ ... }) => { ... });
});

// All tests in this file use client-2
test.describe('Products [client-2]', () => {
  test('upload image', async ({ ... }) => { ... });
  test('delete image', async ({ ... }) => { ... });
});
```

---

## Running Tests

### Run All Tests

```bash
cd apps/epox-platform
yarn test:e2e
```

### Run Specific Client Tests

```bash
# Run all tests using client-1
yarn test:e2e --grep "client-1"

# Run collection tests (client-1)
yarn test:e2e collections.spec.ts

# Run product tests (client-2)
yarn test:e2e products.spec.ts
```

### Parallel Execution

```bash
# Run with 4 workers (4 test clients in parallel)
yarn test:e2e --workers=4
```

### View Screenshots

Screenshots are saved to:
```
__tests__/e2e/screenshots/
├── client-1-user-can-create-collection-studio-with-products.png
├── client-1-user-can-create-collection-products-selected.png
├── client-1-user-can-create-collection-collection-studio.png
├── client-1-user-can-create-collection-collections-list.png
├── client-2-user-can-upload-product-before-upload.png
├── client-2-user-can-upload-product-after-upload.png
└── ...
```

---

## Playwright Configuration

Update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 90000, // 90s (includes container startup)

  // Parallel execution
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,

  // Retries
  retries: process.env.CI ? 2 : 0,

  // Screenshots
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure', // Auto-screenshot on failure
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## Benefits

### ✅ Database + UI Verification

Each test verifies:
1. **Database state** - Data was created correctly
2. **UI state** - Data appears in screenshots

```typescript
// 1️⃣ Database verification
const collection = await db.query.collectionSession.findFirst(...);
expect(collection!.productIds).toHaveLength(2);

// 2️⃣ UI verification
await takeScreenshot(page, { name: 'collections-list' }, testInfo);
await expect(page.locator(`[data-testid="collection-card-${collectionId}"]`)).toBeVisible();
```

### ✅ Test-Level Client Control

Each test chooses its client:
```typescript
test('[client-1] test A', async ({ ... }) => { ... });
test('[client-2] test B', async ({ ... }) => { ... });
test('[client-1] test C', async ({ ... }) => { ... });
```

**Result:**
- Test A and Test C run **sequentially** (same client)
- Test B runs **in parallel** (different client)

### ✅ Visual Regression Testing

Screenshots capture UI changes:
- Before/after comparisons
- Visual regressions detected
- UI bugs caught early

### ✅ Clear Test Intent

Each test explicitly seeds its data:
```typescript
// Clear what this test needs
const { product: product1 } = await seedProduct(db, testClient.id, {
  name: 'Modern Sofa',
  imageCount: 2,
});
const { product: product2 } = await seedProduct(db, testClient.id, {
  name: 'Coffee Table',
  imageCount: 2,
});
```

### ✅ Easy Debugging

After test failure:
1. View screenshot: `__tests__/e2e/screenshots/test-name-step.png`
2. Inspect database: `docker exec -it <container> psql`
3. Check logs: Playwright trace viewer

---

## Summary

This approach gives you:

- 🐳 **Isolated containers per client**
- 📋 **Explicit client selection per test**
- 🌱 **Per-test data seeding**
- 🔍 **Database verification**
- 📸 **Screenshot verification**
- ⚡ **Parallel execution for different clients**

Each test is **fully isolated**, **explicitly seeded**, and **visually verified**!
