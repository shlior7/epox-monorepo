# E2E Testing Architecture Guide

## Overview

This project uses a **layered testing approach** with three levels of tests:
1. **Unit Tests** - Database repository methods (Vitest)
2. **Integration Tests** - API routes (Vitest)
3. **E2E Tests** - Full user flows (Playwright)

This guide explains how data is contained within tests and how tests verify operations like creating collections, uploading products, etc.

---

## Table of Contents

1. [Test Data Isolation Strategy](#test-data-isolation-strategy)
2. [Database Repository Tests (Unit Level)](#database-repository-tests-unit-level)
3. [API Integration Tests](#api-integration-tests)
4. [E2E Browser Tests (Playwright)](#e2e-browser-tests-playwright)
5. [How Collections Are Tested](#how-collections-are-tested)
6. [How Product Upload Is Tested](#how-product-upload-is-tested)
7. [Test Fixtures and Helpers](#test-fixtures-and-helpers)

---

## Test Data Isolation Strategy

### Three Approaches to Data Isolation:

#### 1. **Mocking (API Tests)**
API tests use **Vitest mocks** to replace database and external services:

```typescript
// Mock the db module
vi.mock('@/lib/services/db', () => ({
  db: {
    products: {
      list: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      // ... other methods
    },
  },
}));

// Mock storage module
vi.mock('@/lib/services/storage', () => ({
  storage: {
    getPublicUrl: vi.fn((key: string) => `https://cdn.example.com/${key}`),
  },
}));
```

**Benefits:**
- No database required
- Tests run in milliseconds
- Complete control over return values
- Tests edge cases easily (404s, errors, validation)

#### 2. **Test Database (Repository Tests)**
Repository tests use a **real PostgreSQL test database**:

```typescript
import { testDb } from '../setup';
import { createTestClient, createTestProduct } from '../helpers';

describe('ProductRepository', () => {
  let testClientId: string;

  beforeEach(async () => {
    const client = await createTestClient(testDb);
    testClientId = client.id;
  });

  it('should create a product', async () => {
    const product = await repo.create(testClientId, { name: 'Test Product' });
    expect(product.id).toBeDefined();
  });
});
```

**Benefits:**
- Tests actual SQL queries
- Verifies database constraints
- Tests relationships and joins
- Catches schema issues

#### 3. **Pre-seeded Test Users (E2E Tests)**
E2E tests use **fixed test credentials** with authentication state caching:

```typescript
// apps/epox-platform/__tests__/setup/global-setup.ts
const TEST_CLIENT = {
  email: 'hello@epox.ai',
  password: 'testtest',
  storageState: '../e2e/.auth/test-client-main.json',
};
```

**Benefits:**
- Realistic user flows
- Tests full authentication
- Validates UI/UX
- Catches integration issues

---

## Database Repository Tests (Unit Level)

**Location:** `packages/visualizer-db/src/__tests__/repositories/`

### How Data Is Created

Tests use **helper functions** to create isolated test data:

```typescript
// Create test client
const client = await createTestClient(testDb, {
  name: 'Test Client'
});

// Create test product
const product = await repo.create(client.id, {
  name: 'Test Chair',
  category: 'Furniture',
  sceneTypes: ['living-room'],
  price: '299.99',
});
```

### How Data Is Verified

Tests use **assertions** to verify data structure and values:

```typescript
it('should create a product with all optional fields', async () => {
  const product = await repo.create(testClientId, {
    name: 'Full Product',
    description: 'A test product',
    category: 'Furniture',
    sceneTypes: ['living-room', 'bedroom'],
    price: '199.99',
  });

  // Verify all fields
  expect(product.name).toBe('Full Product');
  expect(product.description).toBe('A test product');
  expect(product.category).toBe('Furniture');
  expect(product.sceneTypes).toEqual(['living-room', 'bedroom']);
  expect(product.price).toBe('199.99');

  // Verify timestamps
  expect(product.createdAt).toBeInstanceOf(Date);
  expect(product.updatedAt).toBeInstanceOf(Date);
});
```

### Data Isolation

Each test creates its own client and products:

```typescript
it('should not return products from other clients', async () => {
  const client2 = await createTestClient(testDb, { name: 'Other Client' });

  await repo.create(testClientId, { name: 'My Product' });
  await repo.create(client2.id, { name: 'Other Product' });

  const products = await repo.list(testClientId);

  expect(products.length).toBe(1);
  expect(products[0].name).toBe('My Product'); // ✅ Only sees own products
});
```

---

## API Integration Tests

**Location:** `apps/epox-platform/__tests__/api/`

### How Data Is Mocked

API tests **mock the entire database layer**:

```typescript
describe('Products API - POST /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new product with valid data', async () => {
    // 1️⃣ Mock the database response
    const mockProduct = {
      id: 'prod-1',
      clientId: 'test-client',
      name: 'Test Chair',
      category: 'Chairs',
      // ... all fields
    };

    vi.mocked(db.products.create).mockResolvedValue(mockProduct);

    // 2️⃣ Create HTTP request
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Chair',
        category: 'Chairs',
        price: 299.99,
      }),
    });

    // 3️⃣ Call the API route handler
    const response = await createProduct(request);
    const data = await response.json();

    // 4️⃣ Verify the response
    expect(response.status).toBe(201);
    expect(data.name).toBe('Test Chair');
    expect(data.category).toBe('Chairs');
    expect(data.price).toBe(299.99);
  });
});
```

### How Validation Is Tested

Tests verify **input validation** by checking error responses:

```typescript
it('should reject empty name', async () => {
  const request = new NextRequest('http://localhost:3000/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: '',  // ❌ Invalid: empty name
      category: 'Chairs',
    }),
  });

  const response = await createProduct(request);

  expect(response.status).toBe(400);  // ✅ Bad Request
  const data = await response.json();
  expect(data.error).toContain('Name');  // ✅ Error mentions "Name"
});

it('should reject name longer than 255 characters', async () => {
  const request = new NextRequest('http://localhost:3000/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'a'.repeat(256),  // ❌ Too long
      category: 'Chairs',
    }),
  });

  const response = await createProduct(request);

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toContain('255 characters');
});
```

### How Database Calls Are Verified

Tests verify that the **correct database methods are called** with the **correct parameters**:

```typescript
it('should filter by category', async () => {
  const request = new NextRequest('http://localhost:3000/api/products?category=Chairs');
  await getProducts(request);

  // ✅ Verify the database method was called with correct filter
  expect(db.products.listWithFiltersAndImages).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ category: 'Chairs' })
  );
});
```

---

## E2E Browser Tests (Playwright)

**Location:** `apps/epox-platform/__tests__/e2e/` (Not yet implemented, but architecture designed)

### How Authentication Works

E2E tests use **authentication fixtures** to avoid logging in for every test:

```typescript
// Setup runs once before all tests
export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1️⃣ Navigate to login
  await page.goto('http://localhost:3000/login');

  // 2️⃣ Fill credentials
  await page.fill('#email', 'hello@epox.ai');
  await page.fill('#password', 'testtest');

  // 3️⃣ Submit form
  await page.click('button[type="submit"]');

  // 4️⃣ Wait for redirect to authenticated page
  await page.waitForURL(/\/(home|dashboard|studio)/);

  // 5️⃣ Save authentication state to file
  await context.storageState({
    path: '../e2e/.auth/test-client-main.json'
  });

  await context.close();
  await browser.close();
}
```

### How Tests Reuse Authentication

Tests load the saved authentication state:

```typescript
test.use({
  storageState: '../e2e/.auth/test-client-main.json'
});

test('user can view dashboard', async ({ page }) => {
  // ✅ Already authenticated - no login needed
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### How Data Is Created in E2E Tests

E2E tests would use **API calls** or **UI interactions** to create data:

```typescript
test('user can create a collection', async ({ page }) => {
  // Option 1: Via UI
  await page.goto('/studio');
  await page.click('[data-testid="product-card-prod-1"]');
  await page.click('[data-testid="product-card-prod-2"]');
  await page.click('button:has-text("Create Collection")');
  await page.fill('input[name="name"]', 'Living Room Collection');
  await page.click('button[type="submit"]');

  // Verify collection was created
  await expect(page.locator('h1')).toContainText('Living Room Collection');

  // Option 2: Via API (faster for setup)
  const apiClient = new ApiClient();
  const collection = await apiClient.createCollection({
    name: 'Test Collection',
    productIds: ['prod-1', 'prod-2'],
  });

  await page.goto(`/studio/collections/${collection.id}`);
});
```

---

## How Collections Are Tested

### 1. Repository Level (Database)

```typescript
describe('CollectionSessionRepository', () => {
  it('should create a collection session', async () => {
    const collection = await repo.create(testClientId, {
      name: 'Living Room Collection',
      productIds: ['prod-1', 'prod-2'],
    });

    expect(collection.id).toBeDefined();
    expect(collection.name).toBe('Living Room Collection');
    expect(collection.productIds).toEqual(['prod-1', 'prod-2']);
    expect(collection.status).toBe('draft');
  });

  it('should update collection status', async () => {
    const collection = await repo.create(testClientId, {
      name: 'Test Collection',
      productIds: ['prod-1'],
    });

    const updated = await repo.update(collection.id, {
      status: 'generating',
    });

    expect(updated.status).toBe('generating');
  });
});
```

### 2. API Level (Integration)

```typescript
describe('Collections API - POST /api/collections', () => {
  it('should create a new collection with valid data', async () => {
    // 1️⃣ Mock database response
    const mockCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Living Room Collection',
      productIds: ['prod-1', 'prod-2'],
      status: 'draft',
      // ...
    };

    vi.mocked(db.collectionSessions.create).mockResolvedValue(mockCollection);

    // 2️⃣ Make API request
    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Living Room Collection',
        productIds: ['prod-1', 'prod-2'],
      }),
    });

    // 3️⃣ Call handler
    const response = await createCollection(request);
    const data = await response.json();

    // 4️⃣ Verify response
    expect(response.status).toBe(201);
    expect(data.name).toBe('Living Room Collection');
    expect(data.productIds).toHaveLength(2);
    expect(data.status).toBe('draft');
  });

  it('should reject empty productIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Collection',
        productIds: [],  // ❌ Empty array
      }),
    });

    const response = await createCollection(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('productIds must be a non-empty array');
  });
});
```

### 3. E2E Level (Browser)

```typescript
test('user can create and manage collection', async ({ page }) => {
  // Navigate to studio
  await page.goto('/studio');

  // Select products
  await page.click('[data-testid="product-card-prod-1"] [data-testid="select"]');
  await page.click('[data-testid="product-card-prod-2"] [data-testid="select"]');

  // Verify selection count
  await expect(page.locator('[data-testid="selection-island-count"]'))
    .toContainText('2 selected');

  // Create collection
  await page.click('button:has-text("Create Collection")');

  // Verify redirect to collection studio
  await page.waitForURL(/\/studio\/collections\/[a-z0-9-]+/);

  // Verify products are in collection
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(2);
});
```

---

## How Product Upload Is Tested

### 1. API Level (Integration)

```typescript
describe('Upload API - POST /api/upload', () => {
  it('should upload product image and create product image record', async () => {
    // 1️⃣ Mock database responses
    vi.mocked(db.productImages.list).mockResolvedValue([]);
    vi.mocked(db.productImages.create).mockResolvedValue({ id: 'img-1' });
    vi.mocked(db.products.getById).mockResolvedValue({ id: 'prod-1' });
    vi.mocked(db.products.update).mockResolvedValue({});

    // 2️⃣ Create form data with file
    const formData = new FormData();
    const file = new File(['test'], 'chair.jpg', { type: 'image/jpeg' });
    formData.set('file', file);
    formData.set('type', 'product');
    formData.set('productId', 'prod-1');

    // 3️⃣ Call upload handler
    const response = await upload(formData);
    const data = await response.json();

    // 4️⃣ Verify response
    expect(response.status).toBe(200);
    expect(data.productImageId).toBe('img-1');
    expect(data.key).toContain('clients/test-client/products/prod-1');

    // 5️⃣ Verify database was called correctly
    expect(db.productImages.create).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        sortOrder: 0,
      })
    );

    expect(db.products.update).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        analysisVersion: '2.0',
        sceneTypes: ['Living Room'],
      })
    );
  });

  it('should reject invalid file types', async () => {
    const formData = new FormData();
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    formData.set('file', file);

    const response = await upload(formData);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid file type');
  });

  it('should reject oversized files', async () => {
    const formData = new FormData();
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],  // 10MB + 1 byte
      'big.jpg',
      { type: 'image/jpeg' }
    );
    formData.set('file', file);

    const response = await upload(formData);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('File too large');
  });
});
```

### 2. E2E Level (Browser)

```typescript
test('user can upload product image', async ({ page }) => {
  // Navigate to product page
  await page.goto('/products/prod-1');

  // Click upload button
  await page.click('button:has-text("Upload Image")');

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('path/to/test-image.jpg');

  // Wait for upload to complete
  await expect(page.locator('.upload-progress')).toHaveText('Upload complete');

  // Verify image appears
  await expect(page.locator('[data-testid="product-image-1"]')).toBeVisible();
});
```

---

## Test Fixtures and Helpers

### Database Test Helpers

**Location:** `packages/visualizer-db/src/__tests__/helpers.ts`

```typescript
/**
 * Create a unique test ID
 */
export function createTestId(prefix = 'test'): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

/**
 * Create a test client
 */
export async function createTestClient(db, overrides = {}) {
  const id = overrides.id ?? createTestId('client');
  const name = overrides.name ?? 'Test Client';

  await db.execute(sql`
    INSERT INTO client (id, name, slug, version, created_at, updated_at)
    VALUES (${id}, ${name}, ${id}, 1, NOW(), NOW())
  `);

  return { id, name };
}

/**
 * Create a test product
 */
export async function createTestProduct(db, clientId, overrides = {}) {
  const id = overrides.id ?? createTestId('product');
  const name = overrides.name ?? 'Test Product';

  await db.execute(sql`
    INSERT INTO product (id, client_id, name, is_favorite, source, version, created_at, updated_at)
    VALUES (${id}, ${clientId}, ${name}, false, 'uploaded', 1, NOW(), NOW())
  `);

  return { id, clientId, name };
}
```

### API Test Helpers

**Location:** `apps/epox-platform/__tests__/api/` (inline)

```typescript
function createFormRequest(formData: FormData): NextRequest {
  const headers = new Headers();
  headers.set('x-test-client-id', 'test-client');

  return {
    formData: async () => formData,
    headers,
  } as NextRequest;
}
```

### E2E Test Fixtures

**Location:** `apps/epox-platform/__tests__/setup/auth-fixtures.ts` (would be created)

```typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Pre-authenticated page
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/dashboard');
    await use(page);
  },

  // Test client ID
  clientId: async ({}, use) => {
    await use('test-client-main');
  },
});
```

---

## Summary: How Data Is Contained and Verified

### Data Containment Strategies

| Test Level | Data Isolation Method | Benefits |
|------------|----------------------|----------|
| **Repository Tests** | Real test database with unique IDs per test | Tests actual SQL, catches schema issues |
| **API Tests** | Mocked database layer (Vitest mocks) | Fast, no database needed, tests validation |
| **E2E Tests** | Pre-seeded test user with fixed credentials | Tests realistic flows, validates UI |

### Verification Patterns

1. **Repository Tests:** Assert on returned database records
   ```typescript
   expect(product.id).toBeDefined();
   expect(product.name).toBe('Test Product');
   ```

2. **API Tests:** Assert on HTTP responses and mock calls
   ```typescript
   expect(response.status).toBe(201);
   expect(db.products.create).toHaveBeenCalledWith(...);
   ```

3. **E2E Tests:** Assert on DOM elements and page state
   ```typescript
   await expect(page.locator('h1')).toContainText('Product Created');
   await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
   ```

### Test Hierarchy

```
┌─────────────────────────────────────────┐
│     E2E Tests (Playwright)              │
│  - Full user flows                      │
│  - Browser automation                   │
│  - Pre-seeded test users                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│     API Tests (Vitest)                  │
│  - Route handlers                       │
│  - Mocked database                      │
│  - Validation testing                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Repository Tests (Vitest)             │
│  - Database operations                  │
│  - Real test database                   │
│  - SQL query validation                 │
└─────────────────────────────────────────┘
```

---

## Running Tests

```bash
# Run repository tests
cd packages/visualizer-db && yarn test

# Run API tests
cd apps/epox-platform && yarn test

# Run E2E tests (when implemented)
cd apps/epox-platform && yarn test:e2e

# Run all tests
yarn test:all
```

---

## Best Practices

1. **Use the right test level:**
   - Repository tests for database logic
   - API tests for validation and business logic
   - E2E tests for critical user flows

2. **Keep tests isolated:**
   - Each test creates its own data
   - Tests don't depend on each other
   - Use unique IDs to avoid conflicts

3. **Mock external services:**
   - Mock AI services (Gemini, etc.)
   - Mock storage services (R2)
   - Mock third-party APIs

4. **Use test helpers:**
   - `createTestClient()` for clients
   - `createTestProduct()` for products
   - `createTestCollection()` for collections

5. **Verify behavior, not implementation:**
   - Test outcomes, not internal details
   - Assert on responses, not mock call counts
   - Focus on user-facing behavior

---

## Next Steps

To fully implement E2E testing:

1. Create Playwright configuration
2. Set up test data seeding script
3. Create authentication fixtures
4. Write E2E test suites for:
   - Product upload flow
   - Collection creation flow
   - Studio generation flow
   - Store import flow

See `.claude/rules/test-clients.md` for the planned E2E test architecture.
