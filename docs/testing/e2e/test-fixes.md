# E2E Test Fixes

## Issues Fixed

### 1. beforeAll Fixture Access Issue
**Problem**: `beforeAll` hooks cannot access Playwright test fixtures like `authenticatedPage`.

**Files Affected**:
- `__tests__/e2e/tests/collections/test.spec.ts`
- `__tests__/e2e/tests/products/test.spec.ts`

**Solution**: Converted `beforeAll` hooks to regular "setup" tests that run first in serial mode.

**Before**:
```typescript
test.beforeAll(async ({ db, clientId, authenticatedPage }) => {
  // ❌ Error: authenticatedPage not available in beforeAll
  await seedProductsViaAPI(authenticatedPage, products);
});
```

**After**:
```typescript
test('setup: seed products feature data', async ({ db, clientId, authenticatedPage }) => {
  // ✅ Works: Setup test runs first in serial mode
  await seedProductsViaAPI(authenticatedPage, products);
});
```

### 2. Missing Test Data for Tests
**Problem**: Tests using 'main' test client had no data seeded, causing failures.

**Files Affected**:
- `__tests__/e2e/tests/image-editor/test.spec.ts` - Expected products to exist
- `__tests__/e2e/tests/selection-island/test.spec.ts` - Expected products to exist
- `__tests__/e2e/tests/config-panel/test.spec.ts` - Studio page needs products
- `__tests__/e2e/tests/store-page/test.spec.ts` - Store tests should use store client

**Solution**: Changed tests to use appropriate feature-specific test clients that have data seeded.

**Changes**:
- `image-editor` → Changed from 'main' to 'products' client
- `selection-island` → Changed from 'main' to 'products' client
- `config-panel` → Changed from 'main' to 'products' client
- `store-page` → Changed from 'main' to 'store' client

## Test Client Usage

| Test File | Test Client | Why |
|-----------|-------------|-----|
| collections/test.spec.ts | collections | Seeds collections data via API |
| products/test.spec.ts | products | Seeds products data via API |
| image-editor/test.spec.ts | products | Needs products to test image overlay |
| selection-island/test.spec.ts | products | Needs products to test selection |
| config-panel/test.spec.ts | products | Studio needs products loaded |
| store-page/test.spec.ts | store | Store-related navigation tests |

## Setup Test Pattern

Tests that need data now use a "setup" test as the first test in a serial suite:

```typescript
test.describe('My Feature', () => {
  test.describe.configure({ mode: 'serial' });

  let seededData: string[];

  // First test: Setup and seed data
  test('setup: seed feature data', async ({ db, clientId, authenticatedPage }) => {
    await cleanClientData(db, clientId);
    seededData = await seedProductsViaAPI(authenticatedPage, [
      { name: 'Product 1', category: 'Furniture' },
    ]);
  });

  // Subsequent tests: Use the seeded data
  test('test feature', async ({ authenticatedPage, db, clientId }) => {
    // Tests run in order, can use seededData
  });
});
```

## Running Tests

```bash
cd apps/epox-platform
yarn test:e2e
```

All tests should now pass:
- ✅ Collections tests seed via API
- ✅ Products tests seed via API
- ✅ Image editor tests use products client (has data)
- ✅ Selection island tests use products client (has data)
- ✅ Config panel tests use products client (has data)
- ✅ Store page tests use store client

## Benefits

1. **Each test is self-contained** - Seeds its own data via API
2. **No global seeding needed** - Tests are independent
3. **API testing built-in** - Data seeding tests the APIs
4. **Clear ownership** - Each feature has its own test client
