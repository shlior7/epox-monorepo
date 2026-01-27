# E2E Isolated Testing with Per-Test Seeding

## Overview

Instead of using a single pre-seeded test user, **each E2E test creates its own isolated test client** with only the data it needs. This provides true test isolation and enables parallel test execution.

---

## Architecture Options

### Option 1: Database Transactions (Fastest)
Each test runs in a database transaction that **rolls back** after completion.

**Pros:**
- Very fast (no Docker overhead)
- True isolation
- All tests use same database instance

**Cons:**
- Requires transaction support in all queries
- Can't test transaction-specific logic
- Harder to debug (data disappears after test)

### Option 2: Docker Compose with Test Containers (Recommended)
Each test suite gets its own **PostgreSQL container** via Docker Compose.

**Pros:**
- True isolation with real databases
- Can inspect database after test failure
- Tests can run in parallel across containers
- Realistic environment (same as production)

**Cons:**
- Slower startup (few seconds per container)
- Requires Docker installed
- More resource intensive

### Option 3: Hybrid Approach (Best of Both Worlds)
Use **database transactions** for fast tests, **Docker containers** for critical flows.

---

## Implementation: Docker Compose Test Containers

### Step 1: Docker Compose Configuration

Create `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  # Template service for test databases
  # Each test suite will get its own instance
  test-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: visualizer_test
    ports:
      - "5432"  # Random port assigned by Docker
    volumes:
      # Mount migrations for schema setup
      - ./packages/visualizer-db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 2s
      timeout: 5s
      retries: 5
    tmpfs:
      # Use in-memory filesystem for speed
      - /var/lib/postgresql/data

  # R2-compatible storage (MinIO)
  test-storage:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: test
      MINIO_ROOT_PASSWORD: testtest
    ports:
      - "9000"
      - "9001"
    tmpfs:
      - /data
```

### Step 2: Playwright Test Container Fixture

Create `apps/epox-platform/__tests__/fixtures/test-container.ts`:

```typescript
import { test as base } from '@playwright/test';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '@/../../packages/visualizer-db/src/schema';
import { hash } from '@node-rs/bcrypt';

export interface TestClient {
  id: string;
  email: string;
  password: string;
  name: string;
  databaseUrl: string;
}

export interface TestContainerFixtures {
  testContainer: StartedTestContainer;
  testClient: TestClient;
  db: ReturnType<typeof drizzle>;
}

/**
 * Extended Playwright test with isolated database container
 */
export const test = base.extend<TestContainerFixtures>({
  /**
   * Start a PostgreSQL container for this test worker
   */
  testContainer: [
    async ({}, use, workerInfo) => {
      console.log(`🐳 Starting test database for worker ${workerInfo.workerIndex}...`);

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

      console.log(`✅ Test database started on port ${container.getMappedPort(5432)}`);

      await use(container);

      // Cleanup
      console.log(`🧹 Stopping test database...`);
      await container.stop();
    },
    { scope: 'worker', auto: true },
  ],

  /**
   * Create an isolated test client with seeded data
   */
  testClient: async ({ testContainer }, use) => {
    const port = testContainer.getMappedPort(5432);
    const databaseUrl = `postgresql://test:test@localhost:${port}/visualizer_test`;

    // Connect to database
    const connection = postgres(databaseUrl, { max: 1 });
    const db = drizzle(connection, { schema });

    // Run migrations
    await migrate(db, {
      migrationsFolder: './packages/visualizer-db/migrations',
    });

    // Generate unique test client data
    const clientId = `test-client-${uuidv4().slice(0, 8)}`;
    const email = `${clientId}@test.com`;
    const password = 'TestPassword123!';
    const hashedPassword = await hash(password, 10);

    // Seed test client
    await db.insert(schema.client).values({
      id: clientId,
      name: 'Test Client',
      slug: clientId,
      version: 1,
    });

    // Seed test user
    await db.insert(schema.user).values({
      id: `user-${clientId}`,
      email,
      name: 'Test User',
      emailVerified: true,
      password: hashedPassword,
    });

    // Link user to client
    await db.insert(schema.member).values({
      id: `member-${clientId}`,
      userId: `user-${clientId}`,
      clientId,
      role: 'owner',
    });

    const testClient: TestClient = {
      id: clientId,
      email,
      password,
      name: 'Test Client',
      databaseUrl,
    };

    console.log(`✅ Created test client: ${email}`);

    await use(testClient);

    // Cleanup
    await connection.end();
  },

  /**
   * Drizzle database instance connected to test container
   */
  db: async ({ testContainer }, use) => {
    const port = testContainer.getMappedPort(5432);
    const databaseUrl = `postgresql://test:test@localhost:${port}/visualizer_test`;

    const connection = postgres(databaseUrl, { max: 1 });
    const db = drizzle(connection, { schema });

    await use(db);

    await connection.end();
  },
});

export { expect } from '@playwright/test';
```

### Step 3: Test Seeding Helpers

Create `apps/epox-platform/__tests__/fixtures/seed-helpers.ts`:

```typescript
import type { DrizzleClient } from '@/lib/services/db';
import * as schema from '@/../../packages/visualizer-db/src/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed a product for testing
 */
export async function seedProduct(
  db: DrizzleClient,
  clientId: string,
  overrides?: Partial<{
    name: string;
    category: string;
    sceneTypes: string[];
    price: string;
  }>
) {
  const productId = `prod-${uuidv4().slice(0, 8)}`;

  const [product] = await db
    .insert(schema.product)
    .values({
      id: productId,
      clientId,
      name: overrides?.name || 'Test Product',
      category: overrides?.category || 'Furniture',
      sceneTypes: overrides?.sceneTypes || ['living-room'],
      price: overrides?.price || '299.99',
      source: 'uploaded',
      isFavorite: false,
      version: 1,
    })
    .returning();

  console.log(`  ✅ Seeded product: ${product.name} (${product.id})`);

  return product;
}

/**
 * Seed a product with images
 */
export async function seedProductWithImages(
  db: DrizzleClient,
  clientId: string,
  imageCount = 2,
  overrides?: Parameters<typeof seedProduct>[2]
) {
  const product = await seedProduct(db, clientId, overrides);

  const images = [];
  for (let i = 0; i < imageCount; i++) {
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

  console.log(`  ✅ Seeded ${imageCount} images for product ${product.id}`);

  return { product, images };
}

/**
 * Seed a collection session
 */
export async function seedCollection(
  db: DrizzleClient,
  clientId: string,
  productIds: string[],
  overrides?: Partial<{
    name: string;
    status: 'draft' | 'generating' | 'completed';
  }>
) {
  const collectionId = `coll-${uuidv4().slice(0, 8)}`;

  const [collection] = await db
    .insert(schema.collectionSession)
    .values({
      id: collectionId,
      clientId,
      name: overrides?.name || 'Test Collection',
      status: overrides?.status || 'draft',
      productIds,
      selectedBaseImages: {},
      settings: null,
      version: 1,
    })
    .returning();

  console.log(`  ✅ Seeded collection: ${collection.name} (${collection.id})`);

  return collection;
}

/**
 * Seed a generation flow
 */
export async function seedGenerationFlow(
  db: DrizzleClient,
  collectionId: string,
  productIds: string[],
  overrides?: Partial<{
    status: 'draft' | 'generating' | 'completed' | 'error';
    settings: any;
  }>
) {
  const flowId = `flow-${uuidv4().slice(0, 8)}`;

  const [flow] = await db
    .insert(schema.generationFlow)
    .values({
      id: flowId,
      collectionSessionId: collectionId,
      productIds,
      status: overrides?.status || 'draft',
      settings: overrides?.settings || {},
      selectedBaseImages: {},
    })
    .returning();

  console.log(`  ✅ Seeded generation flow: ${flow.id}`);

  return flow;
}

/**
 * Seed a store connection
 */
export async function seedStoreConnection(
  db: DrizzleClient,
  clientId: string,
  overrides?: Partial<{
    storeType: 'shopify' | 'woocommerce';
    storeUrl: string;
    storeName: string;
    status: 'active' | 'inactive' | 'error';
  }>
) {
  const connectionId = `store-${uuidv4().slice(0, 8)}`;

  const [connection] = await db
    .insert(schema.storeConnection)
    .values({
      id: connectionId,
      clientId,
      storeType: overrides?.storeType || 'shopify',
      storeUrl: overrides?.storeUrl || 'https://test-store.myshopify.com',
      storeName: overrides?.storeName || 'Test Store',
      status: overrides?.status || 'active',
      accessToken: 'test-token-encrypted',
      version: 1,
    })
    .returning();

  console.log(`  ✅ Seeded store connection: ${connection.storeName} (${connection.id})`);

  return connection;
}

/**
 * Seed a complete product catalog
 */
export async function seedProductCatalog(
  db: DrizzleClient,
  clientId: string,
  productCount = 5
) {
  console.log(`📦 Seeding product catalog (${productCount} products)...`);

  const products = [];
  for (let i = 0; i < productCount; i++) {
    const { product, images } = await seedProductWithImages(db, clientId, 2, {
      name: `Product ${i + 1}`,
      category: ['Furniture', 'Lighting', 'Decor'][i % 3],
      sceneTypes: [['living-room'], ['bedroom'], ['dining-room']][i % 3],
    });
    products.push({ product, images });
  }

  return products;
}
```

### Step 4: Example Test Usage

Create `apps/epox-platform/__tests__/e2e/product-upload.spec.ts`:

```typescript
import { test, expect } from '../fixtures/test-container';
import { seedProduct } from '../fixtures/seed-helpers';

test.describe('Product Upload Flow', () => {
  test('user can upload product images', async ({ page, testClient, db }) => {
    // 🌱 Seed: Create a product for this test only
    const product = await seedProduct(db, testClient.id, {
      name: 'Test Chair',
      category: 'Furniture',
    });

    // 🔐 Login as test client
    await page.goto('/login');
    await page.fill('#email', testClient.email);
    await page.fill('#password', testClient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|studio)/);

    // 📸 Navigate to product page
    await page.goto(`/products/${product.id}`);

    // 🖼️ Upload image
    await page.click('button:has-text("Upload Image")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-assets/chair.jpg');

    // ✅ Verify upload completed
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-image-1"]')).toBeVisible();

    // 🔍 Verify in database
    const images = await db.query.productImage.findMany({
      where: (image, { eq }) => eq(image.productId, product.id),
    });

    expect(images).toHaveLength(1);
    expect(images[0].r2KeyBase).toContain(product.id);
  });

  test('user can delete uploaded images', async ({ page, testClient, db }) => {
    // 🌱 Seed: Product with existing image
    const product = await seedProduct(db, testClient.id, {
      name: 'Product with Image',
    });

    await db.insert(schema.productImage).values({
      id: 'img-1',
      productId: product.id,
      r2KeyBase: `products/${product.id}/existing.jpg`,
      sortOrder: 0,
      isPrimary: true,
      version: 1,
    });

    // 🔐 Login
    await page.goto('/login');
    await page.fill('#email', testClient.email);
    await page.fill('#password', testClient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|studio)/);

    // 🗑️ Navigate and delete
    await page.goto(`/products/${product.id}`);
    await page.click('[data-testid="product-image-1"] [data-testid="delete-button"]');
    await page.click('button:has-text("Confirm Delete")');

    // ✅ Verify deletion
    await expect(page.locator('[data-testid="product-image-1"]')).not.toBeVisible();

    // 🔍 Verify in database (soft delete)
    const images = await db.query.productImage.findMany({
      where: (image, { eq }) => eq(image.productId, product.id),
    });

    expect(images).toHaveLength(1);
    expect(images[0].deletedAt).not.toBeNull();
  });
});
```

Create `apps/epox-platform/__tests__/e2e/collections.spec.ts`:

```typescript
import { test, expect } from '../fixtures/test-container';
import { seedProductWithImages, seedCollection } from '../fixtures/seed-helpers';

test.describe('Collection Studio Flow', () => {
  test('user can create collection from product selection', async ({ page, testClient, db }) => {
    // 🌱 Seed: Multiple products
    console.log('🌱 Seeding test data...');
    const product1 = await seedProductWithImages(db, testClient.id, 2, {
      name: 'Modern Sofa',
      category: 'Furniture',
      sceneTypes: ['living-room'],
    });
    const product2 = await seedProductWithImages(db, testClient.id, 2, {
      name: 'Coffee Table',
      category: 'Furniture',
      sceneTypes: ['living-room'],
    });

    // 🔐 Login
    await page.goto('/login');
    await page.fill('#email', testClient.email);
    await page.fill('#password', testClient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|studio)/);

    // 📋 Navigate to studio
    await page.goto('/studio');

    // ✅ Select products
    await page.click(`[data-testid="product-card-${product1.product.id}"] [data-testid="select"]`);
    await page.click(`[data-testid="product-card-${product2.product.id}"] [data-testid="select"]`);

    // ✅ Verify selection island
    await expect(page.locator('[data-testid="selection-island-count"]')).toContainText('2 selected');

    // 🎨 Create collection
    await page.click('button:has-text("Create Collection")');

    // ✅ Verify redirect to collection studio
    await page.waitForURL(/\/studio\/collections\/[a-z0-9-]+/);
    const collectionId = page.url().split('/').pop()!;

    // ✅ Verify products in collection
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(2);

    // 🔍 Verify in database
    const collection = await db.query.collectionSession.findFirst({
      where: (coll, { eq }) => eq(coll.id, collectionId),
    });

    expect(collection).toBeDefined();
    expect(collection!.productIds).toHaveLength(2);
    expect(collection!.productIds).toContain(product1.product.id);
    expect(collection!.productIds).toContain(product2.product.id);
  });

  test('user can add products to existing collection', async ({ page, testClient, db }) => {
    // 🌱 Seed: Collection with one product
    const product1 = await seedProductWithImages(db, testClient.id, 2, {
      name: 'Existing Product',
    });
    const product2 = await seedProductWithImages(db, testClient.id, 2, {
      name: 'New Product',
    });

    const collection = await seedCollection(db, testClient.id, [product1.product.id], {
      name: 'My Collection',
    });

    // 🔐 Login
    await page.goto('/login');
    await page.fill('#email', testClient.email);
    await page.fill('#password', testClient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|studio)/);

    // 📋 Navigate to collection
    await page.goto(`/studio/collections/${collection.id}`);

    // ➕ Add new product
    await page.click('button:has-text("Add Products")');
    await page.click(`[data-testid="product-card-${product2.product.id}"] [data-testid="select"]`);
    await page.click('button:has-text("Add Selected")');

    // ✅ Verify product added
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(2);

    // 🔍 Verify in database
    const updatedCollection = await db.query.collectionSession.findFirst({
      where: (coll, { eq }) => eq(coll.id, collection.id),
    });

    expect(updatedCollection!.productIds).toHaveLength(2);
    expect(updatedCollection!.productIds).toContain(product2.product.id);
  });
});
```

Create `apps/epox-platform/__tests__/e2e/store-import.spec.ts`:

```typescript
import { test, expect } from '../fixtures/test-container';
import { seedStoreConnection } from '../fixtures/seed-helpers';

test.describe('Store Import Flow', () => {
  test('user can import products from connected store', async ({ page, testClient, db }) => {
    // 🌱 Seed: Store connection
    const storeConnection = await seedStoreConnection(db, testClient.id, {
      storeType: 'shopify',
      storeName: 'Test Shopify Store',
      storeUrl: 'https://test.myshopify.com',
      status: 'active',
    });

    // Mock Shopify API responses (would use MSW or similar)
    // For now, assume API is mocked in test environment

    // 🔐 Login
    await page.goto('/login');
    await page.fill('#email', testClient.email);
    await page.fill('#password', testClient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|studio)/);

    // 🏪 Navigate to store page
    await page.goto('/store');

    // ✅ Verify store is connected
    await expect(page.locator('[data-testid="store-connected"]')).toBeVisible();
    await expect(page.locator('[data-testid="store-name"]')).toContainText('Test Shopify Store');

    // 📥 Click import
    await page.click('button:has-text("Import Products")');

    // ✅ Select products to import
    await page.click('[data-testid="store-product-1"] [data-testid="select"]');
    await page.click('[data-testid="store-product-2"] [data-testid="select"]');
    await page.click('button:has-text("Import Selected")');

    // ⏳ Wait for import to complete
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 10000 });

    // 🔍 Verify in database
    const importedProducts = await db.query.product.findMany({
      where: (product, { eq }) => eq(product.storeConnectionId, storeConnection.id),
    });

    expect(importedProducts).toHaveLength(2);
    expect(importedProducts[0].source).toBe('imported');
    expect(importedProducts[0].storeUrl).toBeTruthy();
  });

  test('user can sync existing imported products', async ({ page, testClient, db }) => {
    // 🌱 Seed: Store connection + imported product
    const storeConnection = await seedStoreConnection(db, testClient.id);

    const [importedProduct] = await db
      .insert(schema.product)
      .values({
        id: 'prod-imported',
        clientId: testClient.id,
        name: 'Imported Chair',
        source: 'imported',
        storeConnectionId: storeConnection.id,
        storeId: 'shopify-123',
        storeUrl: 'https://test.myshopify.com/products/chair',
        storeName: 'Chair in Store',
        version: 1,
      })
      .returning();

    // 🔐 Login
    await page.goto('/login');
    await page.fill('#email', testClient.email);
    await page.fill('#password', testClient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|studio)/);

    // 🏪 Navigate to store page
    await page.goto('/store');

    // 🔄 Click sync
    await page.click(`[data-testid="product-${importedProduct.id}"] [data-testid="sync-button"]`);

    // ✅ Verify sync completed
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();

    // 🔍 Verify lastSyncAt updated in database
    const updatedProduct = await db.query.product.findFirst({
      where: (product, { eq }) => eq(product.id, importedProduct.id),
    });

    expect(updatedProduct!.importedAt).not.toEqual(importedProduct.importedAt);
  });
});
```

---

## Running Tests

### Install Dependencies

```bash
# Install testcontainers
yarn add -D testcontainers

# Install Docker (if not already installed)
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Linux: https://docs.docker.com/engine/install/
```

### Run Tests

```bash
# Run all E2E tests
cd apps/epox-platform && yarn test:e2e

# Run specific test file
yarn test:e2e product-upload.spec.ts

# Run tests in headed mode (see browser)
yarn test:e2e --headed

# Run tests in parallel (each gets own container)
yarn test:e2e --workers=4
```

### Playwright Configuration

Update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 60000, // 60s per test (includes container startup)

  // Run tests in parallel
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Benefits of This Approach

### 1. **True Test Isolation**
Each test gets its own:
- PostgreSQL database
- Test client
- Seeded data

**No shared state = No test interference**

### 2. **Parallel Execution**
Tests can run simultaneously without conflicts:
```bash
# Run 4 tests at once, each with own database
yarn test:e2e --workers=4
```

### 3. **Clear Test Intent**
Each test explicitly seeds what it needs:
```typescript
// Clear what data this test uses
const product = await seedProduct(db, testClient.id, {
  name: 'Test Chair',
  category: 'Furniture',
});
```

### 4. **Easy Debugging**
After test failure, inspect the database:
```bash
# Container stays alive if test fails
docker ps
docker exec -it <container-id> psql -U test -d visualizer_test

# Query test data
SELECT * FROM product WHERE client_id = 'test-client-abc123';
```

### 5. **Realistic Environment**
Tests use real PostgreSQL, not mocks:
- Tests migrations
- Tests indexes
- Tests constraints
- Tests relationships

---

## Comparison: Approaches

| Approach | Isolation | Speed | Parallelization | Realism | Debugging |
|----------|-----------|-------|-----------------|---------|-----------|
| **Single pre-seeded user** | ❌ Shared | ⚡ Fast | ⚠️ Limited | ⚠️ Moderate | ❌ Hard |
| **Database transactions** | ✅ Isolated | ⚡⚡ Very Fast | ✅ Easy | ✅ High | ⚠️ Moderate |
| **Docker containers** | ✅ Isolated | ⚠️ Moderate | ✅ Easy | ✅ Highest | ✅ Easy |

---

## Migration Path

### Phase 1: Start with Docker Containers
Implement the test container fixture and seed helpers.

### Phase 2: Write E2E Tests with Seeding
Convert existing E2E tests to use per-test seeding.

### Phase 3: Optimize with Transactions (Optional)
For fast tests that don't need full isolation, add transaction-based fixtures.

---

## Next Steps

1. ✅ Install testcontainers: `yarn add -D testcontainers`
2. ✅ Create test container fixture
3. ✅ Create seed helpers
4. ✅ Write first E2E test with seeding
5. ✅ Convert remaining tests
6. ✅ Add to CI pipeline

This approach gives you **true test isolation** while maintaining **realistic test conditions**!
