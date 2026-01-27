# E2E Feature-Based Testing

This directory contains E2E tests organized by feature for optimal parallelization and coverage.

**Uses:** Local seed helpers (`helpers/seed-helpers.ts`) for full database isolation with Docker containers.

📖 **Full Guide:** See `/E2E_TESTCONTAINERS_GUIDE.md` for complete documentation.

## Directory Structure

```
__tests__/e2e/
├── setup/
│   ├── auth-fixtures.ts         # Playwright fixtures with auth and db
│   ├── test-clients.ts          # Feature-based test client configs
│   ├── global-setup.ts          # Authenticates all test clients
│   └── seed-test-data.ts        # Legacy seed script (deprecated)
│
├── helpers/
│   ├── navigation.ts            # Navigation utilities
│   ├── seed-helpers.ts          # Reusable seed functions
│   └── constants.ts             # Common selectors
│
├── tests/
│   ├── collections/             # Collections feature tests
│   │   ├── seed.ts             # Collections-specific seeding
│   │   ├── test.spec.ts        # All collections tests (sequential)
│   │   └── screenshots/        # Collections screenshots
│   │
│   ├── products/               # Products feature tests
│   │   ├── seed.ts
│   │   ├── test.spec.ts
│   │   └── screenshots/
│   │
│   ├── store-new/              # Store feature tests
│   │   ├── seed.ts
│   │   ├── test.spec.ts
│   │   └── screenshots/
│   │
│   └── studio-new/             # Studio feature tests
│       ├── seed.ts
│       ├── test.spec.ts
│       └── screenshots/
│
├── seed-all-features.ts        # Seeds all features at once
└── README.md                   # This file
```

## Quick Start

### Prerequisites

1. **Docker Desktop** - Must be running (for PostgreSQL test container)
2. **Dev Server** - `yarn dev` in `apps/epox-platform`

### Run Tests

```bash
# That's it! Global setup handles everything:
# - Starts PostgreSQL Docker container
# - Pushes schema
# - Creates test users
# - Tests seed their own data

yarn test:e2e

# Or specific feature
yarn test:e2e:collections
yarn test:e2e:products

# Debug modes
yarn test:e2e:ui        # UI mode
yarn test:e2e:headed    # See browser
yarn test:e2e:debug     # Step through
```

### What Happens Automatically

1. **Global Setup** (once per run)
   - Starts `visualizer-db-test` Docker container on port 5434
   - Pushes schema to test database
   - Creates test users via Better Auth API
   - Saves authentication states

2. **Test Execution** (per feature)
   - Each feature seeds its own data in `beforeAll`
   - Tests run sequentially within the feature
   - Features run in parallel

3. **No Manual Seeding Needed!**
   - Tests seed data automatically
   - Container stays running for speed

## Test Clients

Each feature has its own dedicated test client:

| Feature      | Email                        | Client ID                   |
|--------------|------------------------------|----------------------------|
| Collections  | test-collections@epox.test   | test-client-collections    |
| Products     | test-products@epox.test      | test-client-products       |
| Store        | test-store@epox.test         | test-client-store          |
| Studio       | test-studio@epox.test        | test-client-studio         |
| Main (legacy)| hello@epox.ai                | test-client-main           |

## How It Works

### Feature-Based Organization

Tests are organized by **feature** (not by page or component):

- **Collections feature** - All tests related to creating, viewing, managing collections
- **Products feature** - All tests related to product list, detail, bulk actions
- **Store feature** - All tests related to store connection, import, sync
- **Studio feature** - All tests related to studio UI, config panel, generation

### Execution Strategy

1. **Parallel by Feature** - Different features run in parallel workers
2. **Sequential within Feature** - Tests within a feature run sequentially
3. **Shared State** - Tests share seeded data and can build on each other

Example:
```
Worker 1: Collections tests (sequential)
  ├─ Create collection
  ├─ Verify studio layout  (uses collection from previous test)
  └─ Verify list view      (uses collection from previous test)

Worker 2: Products tests (sequential)
  ├─ View products list
  ├─ Toggle grid view      (uses same page state)
  └─ Select product        (uses same page state)

Workers 1 & 2 run in PARALLEL
```

### Dual Verification

Each test performs both database and UI verification:

```typescript
// 🔍 DATABASE VERIFICATION (cheap, fast)
const collection = await db.query.collectionSession.findFirst({
  where: (coll, { eq }) => eq(coll.id, collectionId),
});
expect(collection!.productIds).toHaveLength(2);

// 📸 UI VERIFICATION (targeted screenshots)
await page.screenshot({
  path: path.join(SCREENSHOTS_DIR, 'collection-studio.png'),
});
await expect(page.locator(`[data-testid="collection-card-${collectionId}"]`)).toBeVisible();
```

## Writing New Tests

### 1. Choose the Right Feature

Put your test in the feature that best matches what you're testing:

- Testing collection creation → `collections/`
- Testing product detail page → `products/`
- Testing store import → `store-new/`
- Testing studio config panel → `studio-new/`

### 2. Use the Feature's Test Client

```typescript
// At the top of your test file
test.use({ testClientName: 'collections' }); // or 'products', 'store', 'studio'
```

### 3. Use Available Fixtures

```typescript
test('my test', async ({ authenticatedPage, clientId, db }) => {
  // authenticatedPage - Pre-authenticated Playwright Page
  // clientId - Current test client's ID
  // db - Database connection (Drizzle instance)
});
```

### 4. Follow the Pattern

```typescript
test.describe('My Feature', () => {
  // Run tests sequentially
  test.describe.configure({ mode: 'serial' });

  test('test name', async ({ authenticatedPage, clientId, db }) => {
    console.log('\n=== TEST NAME ===\n');

    // 1. Navigate
    const nav = createNavigationHelper(authenticatedPage, clientId);
    await nav.goToSomePage();

    // 2. Database verification (cheap)
    const data = await db.query.something.findFirst(...);
    expect(data).toBeTruthy();
    console.log('✅ Database: verified');

    // 3. UI verification (targeted)
    const uiState = await authenticatedPage.evaluate(() => ({
      hasElement: !!document.querySelector('[data-testid="my-element"]'),
    }));
    expect(uiState.hasElement).toBe(true);
    console.log('✅ UI: verified');

    // 4. Screenshot
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'my-test.png'),
    });
    console.log('📸 Saved: my-test.png');

    console.log('\n✅ Test complete!\n');
  });
});
```

### 5. Document Screenshots

At the top of your test file, list all screenshots:

```typescript
/**
 * My Feature Tests
 *
 * Screenshots captured:
 * - my-feature-list.png - Feature list view
 * - my-feature-detail.png - Feature detail page
 * - my-feature-action.png - Feature action modal
 */
```

## Seeding Data

### Seed Helpers

Use local seed helpers for common operations:

```typescript
import {
  cleanClientData,
  seedProducts,
  seedCollections,
  seedStoreConnection,
  seedGeneratedAssets,
} from '../../helpers/seed-helpers';

// Seed in beforeAll hook
test.beforeAll(async ({ db, clientId }) => {
  console.log('\n🌱 Seeding Feature Data...\n');

  // Clean existing data
  await cleanClientData(db, clientId);

  // Seed products
  const productIds = await seedProducts(db, clientId, [
    { name: 'Product 1', category: 'Furniture' },
    { name: 'Product 2', category: 'Lighting' },
  ]);

  // Seed collections
  const collectionIds = await seedCollections(db, clientId, productIds, [
    { name: 'Collection 1', status: 'draft', productCount: 2 },
  ]);

  console.log('✅ Feature data seeded\n');
});
```

### In-Test Seeding Pattern

Tests seed their own data in `beforeAll` hooks. No separate seed scripts are needed:

```typescript
import { test, expect } from '../../setup/auth-fixtures';
import { cleanClientData, seedProducts } from '../../helpers/seed-helpers';

test.use({ testClientName: 'my-feature' });

test.describe('My Feature', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ db, clientId }) => {
    // Clean and seed data for this feature
    await cleanClientData(db, clientId);
    await seedProducts(db, clientId, [
      { name: 'Test Product', category: 'Furniture' },
    ]);
  });

  test('my test', async ({ authenticatedPage, db, clientId }) => {
    // Test implementation
  });
});
```

## Benefits

### ✅ Minimal Containers
- One container per feature (not per test)
- 4 containers total instead of 20+

### ✅ Maximum Coverage
- Complete user flows tested
- Database + UI verification
- Comprehensive screenshots

### ✅ Fast Execution
- Features run in parallel
- Tests within feature share state
- No redundant setup/teardown

### ✅ Easy Maintenance
- Organized by feature
- Clear ownership
- Reusable helpers

## Troubleshooting

### Server Not Running

```bash
# Error: Server is not running on http://localhost:3000
# Solution: Start the dev server first
cd apps/epox-platform
yarn dev
```

### Authentication Failed

```bash
# Error: Failed to authenticate
# Solution: Check if you're on the right app (not admin console)
# Make sure epox-platform is running on port 3000, not scenergy-visualizer
```

### Tests Failing

```bash
# Run tests in headed mode to see what's happening
yarn test:e2e:headed

# Or use UI mode for interactive debugging
yarn test:e2e:ui

# Or debug mode to step through
yarn test:e2e:debug
```

### Clean Slate

```bash
# Re-seed all features from scratch
yarn test:seed-all

# Then run tests
yarn test:e2e
```

## Migration from Old Structure

The old structure had:
- One test client for all tests
- Tests organized by page (`collection-page/`, `store-page/`)
- Global seeding for all tests

The new structure has:
- One test client per feature
- Tests organized by feature (`collections/`, `products/`)
- Per-feature seeding

Both can coexist. Old tests in `test-page/` folders still work with the `main` client.
