# E2E Testing Approach - In-Test Seeding

## Overview

Tests seed their own data using `beforeAll` hooks. No separate seeding scripts needed.

## How It Works

### 1. Global Setup (One-Time)
**File:** `__tests__/e2e/setup/global-setup.ts`

- Creates test users via Better Auth API (if they don't exist)
- Authenticates all test users
- Saves authentication state to `.auth/` directory
- **Does NOT seed test data** (products, collections, etc.)

### 2. Test Execution (Per Feature)
**Each test file seeds its own data in `beforeAll` hook:**

```typescript
import {  test, expect } from '../../setup/auth-fixtures';
import { cleanClientData, seedProducts, seedCollections } from '../../helpers/seed-helpers';

test.use({ testClientName: 'collections' });

test.describe('Collections Feature', () => {
  test.describe.configure({ mode: 'serial' });

  // Seed data once before all tests
  test.beforeAll(async ({ db, clientId }) => {
    console.log('\n🌱 Seeding Collections Feature Data...\n');

    // Clean existing data
    await cleanClientData(db, clientId);

    // Seed products
    const productIds = await seedProducts(db, clientId, [
      { name: 'Modern Sofa', category: 'Furniture' },
      { name: 'Oak Table', category: 'Furniture' },
    ]);

    // Seed collections
    await seedCollections(db, clientId, productIds, [
      { name: 'Living Room', productCount: 2 },
    ]);

    console.log('✅ Data seeded\n');
  });

  test('create collection', async ({ authenticatedPage, db, clientId }) => {
    // Test has access to:
    // - authenticatedPage: Pre-authenticated browser page
    // - db: Database connection (uses configured database)
    // - clientId: Current test client's ID
  });
});
```

## Database Configuration

The `db` fixture uses whatever database is configured in your environment:

- **Development:** Uses your `.env.local` database
- **CI/Test Container:** Configure via environment variables to use isolated test DB
- **Local Testing:** Can point to a separate test database

## Benefits

✅ **No production DB pollution** - Tests seed their own data
✅ **Test isolation** - Each feature has its own client and data
✅ **No manual seeding** - Data is created automatically when tests run
✅ **Fast execution** - Features run in parallel, tests within feature are sequential
✅ **Clean slate** - `cleanClientData()` ensures each run starts fresh

## File Structure

```
__tests__/e2e/
├── setup/
│   ├── test-clients.ts          # 5 test client configs
│   ├── auth-fixtures.ts         # Fixtures: authenticatedPage, db, clientId
│   └── global-setup.ts          # Creates users + authenticates
│
├── helpers/
│   ├── navigation.ts            # Navigation utilities
│   └── seed-helpers.ts          # Data seeding functions
│
└── tests/
    ├── collections/
    │   ├── test.spec.ts         # Seeds own data in beforeAll
    │   └── screenshots/
    │
    ├── products/
    │   ├── test.spec.ts         # Seeds own data in beforeAll
    │   └── screenshots/
    │
    ├── store-new/
    │   └── screenshots/
    │
    └── studio-new/
        └── screenshots/
```

## Running Tests

```bash
# 1. Start development server
yarn dev

# 2. Run tests (global setup creates users, tests seed data)
yarn test:e2e

# Or run specific feature
yarn test:e2e:collections
yarn test:e2e:products
```

## What Happens When You Run Tests

1. **Global Setup Runs** (once)
   - Creates test users via `/api/auth/sign-up/email` if they don't exist
   - Authenticates users and saves auth state

2. **Tests Run** (in parallel by feature)
   - Collections tests run in Worker 1
     - `beforeAll` seeds collections data
     - Tests execute sequentially using that data

   - Products tests run in Worker 2
     - `beforeAll` seeds products data
     - Tests execute sequentially using that data

3. **Clean Up** (automatic)
   - Next test run calls `cleanClientData()` in beforeAll
   - Fresh data is seeded for each run

## Seed Helpers Available

```typescript
import {
  cleanClientData,      // Delete all data for a client
  seedProducts,         // Create products
  seedCollections,      // Create collections + flows
  seedStoreConnection,  // Create store connection
  seedGeneratedAssets,  // Create generated assets
} from '../../helpers/seed-helpers';
```

## Example: Full Test File

```typescript
import { test, expect } from '../../setup/auth-fixtures';
import { cleanClientData, seedProducts } from '../../helpers/seed-helpers';
import path from 'path';
import fs from 'fs';

test.use({ testClientName: 'products' });

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Products Feature', () => {
  test.describe.configure({ mode: 'serial' });

  // Seed data once before all tests
  test.beforeAll(async ({ db, clientId }) => {
    await cleanClientData(db, clientId);
    await seedProducts(db, clientId, [
      { name: 'Sofa', category: 'Furniture', source: 'uploaded' },
      { name: 'Chair', category: 'Furniture', source: 'imported', storeUrl: 'https://...' },
    ]);
  });

  test('products list shows all products', async ({ authenticatedPage, db, clientId }) => {
    // Navigate to products
    await authenticatedPage.goto('/products');

    // Verify in database
    const products = await db.query.product.findMany({
      where: (p, { eq }) => eq(p.clientId, clientId),
    });
    expect(products).toHaveLength(2);

    // Verify in UI
    const count = await authenticatedPage.locator('[data-testid^="product-card"]').count();
    expect(count).toBe(2);

    // Screenshot
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'products-list.png'),
    });
  });
});
```

## Key Points

1. **No separate seed scripts** - Data is seeded in `beforeAll` hooks
2. **Tests own their data** - Each feature seeds exactly what it needs
3. **Database isolation** - Configure via environment (test DB, containers, etc.)
4. **Global setup only creates users** - Does not seed test data
5. **Clean slate every run** - `cleanClientData()` ensures fresh state

## Configuring Test Database

To avoid hitting production DB, set up a test database:

**Option 1: Separate Test Database**
```bash
# .env.test.local
DATABASE_URL="postgresql://user:pass@localhost:5432/epox_test"
```

**Option 2: Docker Test Container**
```bash
# Use testcontainers or docker-compose for isolated DB
```

**Option 3: Transaction Rollback**
```typescript
// Wrap tests in transactions and rollback after
```

The `db` fixture will use whatever `DATABASE_URL` is configured in your environment.
