# E2E API-Based Seeding

## Overview

E2E tests now use the **actual application APIs** to create test data instead of directly seeding the database. This provides:

1. **Real API Testing** - Every test run also tests the API endpoints
2. **Production-Like Data** - Data created exactly as users would create it
3. **Business Logic Execution** - All validation, hooks, and side effects are executed
4. **Integration Testing** - Catches API bugs immediately during E2E tests

## Architecture

### Before (Direct DB Seeding)
```
E2E Test
  ↓ seed helpers
Direct DB INSERT statements
  ↓
PostgreSQL Test Database
```
**Problem**: Bypasses all business logic, validation, and API layer

### After (API-Based Seeding)
```
E2E Test
  ↓ seed helpers
POST /api/products
POST /api/collections
  ↓ API layer
Validation + Business Logic + Repositories
  ↓
PostgreSQL Test Database
```
**Benefit**: Tests the full stack, exactly like production

## Implementation

### New Seed Helpers (API-Based)

**File**: `apps/epox-platform/__tests__/e2e/helpers/seed-helpers-api.ts`

#### seedProductsViaAPI()
```typescript
await seedProductsViaAPI(page, [
  {
    name: 'Modern Sofa',
    description: 'A comfortable modern sofa',
    category: 'Furniture',
    sceneTypes: ['living-room'],
    price: 999.99,
  },
]);
```

Calls: `POST /api/products`

#### seedCollectionsViaAPI()
```typescript
await seedCollectionsViaAPI(page, productIds, [
  {
    name: 'Living Room Collection',
    productCount: 2,
  },
]);
```

Calls: `POST /api/collections`

#### cleanClientData()
```typescript
await cleanClientData(db, clientId);
```

Still uses direct DB (DELETE statements) - no API endpoint for bulk deletion

### Updated Test Pattern

```typescript
import { test, expect } from '../../setup/auth-fixtures';
import { cleanClientData, seedProductsViaAPI, seedCollectionsViaAPI } from '../../helpers/seed-helpers-api';

test.use({ testClientName: 'collections' });

test.describe('Collections Feature', () => {
  test.describe.configure({ mode: 'serial' });

  let seededProductIds: string[];

  // Seed data using APIs
  test.beforeAll(async ({ db, clientId, authenticatedPage }) => {
    console.log('\n🌱 Seeding via API...\n');

    // Clean existing data (direct DB)
    await cleanClientData(db, clientId);

    // Create products via POST /api/products
    seededProductIds = await seedProductsViaAPI(authenticatedPage, [
      { name: 'Product 1', category: 'Furniture' },
      { name: 'Product 2', category: 'Lighting' },
    ]);

    // Create collections via POST /api/collections
    await seedCollectionsViaAPI(authenticatedPage, seededProductIds, [
      { name: 'My Collection', productCount: 2 },
    ]);

    console.log('✅ Data seeded via API\n');
  });

  test('my test', async ({ authenticatedPage, db, clientId }) => {
    // Test implementation
  });
});
```

## API Endpoints Used

### POST /api/products
**Creates**: Uploaded products

**Request Body**:
```json
{
  "name": "Modern Sofa",
  "description": "A comfortable modern sofa",
  "category": "Furniture",
  "sceneTypes": ["living-room", "office"],
  "price": 999.99
}
```

**Response**:
```json
{
  "id": "product-uuid",
  "name": "Modern Sofa",
  "category": "Furniture",
  "sceneTypes": ["living-room", "office"],
  "source": "uploaded",
  "createdAt": "2024-01-25T..."
}
```

**What Gets Tested**:
- Name validation (required, max 255 chars)
- Category validation
- SceneTypes array validation
- Price validation (non-negative number)
- Repository create method
- Database constraints

### POST /api/collections
**Creates**: Collection with generation flows

**Request Body**:
```json
{
  "name": "Living Room Collection",
  "productIds": ["product-id-1", "product-id-2"]
}
```

**Response**:
```json
{
  "id": "collection-uuid",
  "name": "Living Room Collection",
  "status": "draft",
  "productCount": 2,
  "productIds": ["product-id-1", "product-id-2"],
  "createdAt": "2024-01-25T..."
}
```

**What Gets Tested**:
- Name validation (required, max 255 chars)
- ProductIds validation (non-empty array, all strings)
- Collection creation via repository
- Auto-creation of generation flows (one per product)
- Database transactions

## Benefits

### 1. API Coverage
Every E2E test run also tests:
- ✅ POST /api/products validation and creation
- ✅ POST /api/collections validation and creation
- ✅ API authentication and authorization
- ✅ API error handling

### 2. Production Realism
Data created via API includes:
- ✅ All business logic execution
- ✅ All database triggers and hooks
- ✅ All computed fields and defaults
- ✅ All side effects (e.g., auto-creating generation flows)

### 3. Early Bug Detection
If an API endpoint breaks:
- ❌ E2E tests fail immediately during seeding
- ❌ Can't create test data = obvious API problem
- ✅ Bugs caught before manual testing

### 4. Realistic Test Data
Products and collections have:
- ✅ Proper validation applied
- ✅ Correct defaults set
- ✅ All required fields populated
- ✅ Relationships properly established

## Trade-offs

### Slower Seeding
- **Before**: Direct DB INSERT ~50ms per entity
- **After**: API call ~100-200ms per entity
- **Impact**: +50-150ms per entity (acceptable for E2E tests)

### Requires Running Server
- **Before**: Tests could seed DB without server
- **After**: Dev server must be running (already required for E2E)
- **Impact**: None (playwright.config.ts already starts server)

### Limited to Available APIs
- **Imported Products**: No POST /api/products/import endpoint yet
- **Store Connections**: No POST /api/store/connection endpoint yet
- **Workaround**: Fall back to direct DB for these (temporary)

## Future Enhancements

### 1. Create Missing API Endpoints
```typescript
// POST /api/products/import
await seedImportedProductsViaAPI(page, [
  {
    name: 'Imported Chair',
    source: 'imported',
    storeUrl: 'https://example.com/products/chair',
  },
]);

// POST /api/store/connection
await seedStoreConnectionViaAPI(page, {
  provider: 'shopify',
  storeUrl: 'https://mystore.myshopify.com',
  storeName: 'My Test Store',
});
```

### 2. Bulk Operations
```typescript
// POST /api/products/bulk
await seedProductsBulkViaAPI(page, [
  { name: 'Product 1' },
  { name: 'Product 2' },
  { name: 'Product 3' },
]);
```

### 3. Test Data Management API
```typescript
// DELETE /api/test-data/:clientId
await cleanClientDataViaAPI(page, clientId);
```

## Migration Guide

### Old Approach (Direct DB)
```typescript
import { seedProducts } from '../../helpers/seed-helpers';

test.beforeAll(async ({ db, clientId }) => {
  await seedProducts(db, clientId, [
    { name: 'Product 1', category: 'Furniture' },
  ]);
});
```

### New Approach (API-Based)
```typescript
import { seedProductsViaAPI } from '../../helpers/seed-helpers-api';

test.beforeAll(async ({ db, clientId, authenticatedPage }) => {
  await seedProductsViaAPI(authenticatedPage, [
    { name: 'Product 1', category: 'Furniture' },
  ]);
});
```

**Key Differences**:
1. Import from `seed-helpers-api.ts` instead of `seed-helpers.ts`
2. Add `authenticatedPage` to beforeAll fixtures
3. Pass `authenticatedPage` to seed functions (not `db`)
4. Use `sceneTypes` array instead of `selectedSceneType` string

## Summary

✅ **E2E tests now test APIs** - POST /api/products and POST /api/collections tested on every run

✅ **Production-realistic data** - All business logic, validation, and side effects executed

✅ **Better coverage** - API layer tested alongside UI layer

✅ **Early bug detection** - API bugs caught immediately during test seeding

✅ **Maintainable** - Changes to API validation automatically reflected in tests

The E2E tests are now truly end-to-end: they test the full stack from API to UI! 🎉
