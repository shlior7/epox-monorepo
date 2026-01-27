# E2E Testing with Testcontainers - Complete Guide

## Overview

E2E tests use the `visualizer-db/testkit` for full database isolation with Docker containers. Each test run uses a real PostgreSQL database in a Docker container, ensuring tests never touch production data.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Playwright E2E Tests                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Global Setup (Once per test run)                           │
│  ├─ Start PostgreSQL Docker container (port 5434)           │
│  ├─ Push schema using drizzle-kit                           │
│  ├─ Create test users via Better Auth API                   │
│  └─ Save auth states                                        │
│                                                              │
│  Test Execution (Per feature worker)                        │
│  ├─ Worker 1: Collections                                   │
│  │  ├─ beforeAll: Seed collections data                     │
│  │  ├─ Test 1: Create collection                            │
│  │  ├─ Test 2: Verify studio                                │
│  │  └─ Test 3: Verify list                                  │
│  │                                                           │
│  ├─ Worker 2: Products                                      │
│  │  ├─ beforeAll: Seed products data                        │
│  │  ├─ Test 1: View products list                           │
│  │  └─ Test 2: Product detail                               │
│  │                                                           │
│  └─ Workers share same PostgreSQL container                 │
│     (Each uses cleanClientData() for isolation)             │
│                                                              │
│  Global Teardown (End of run)                               │
│  └─ Container stays running for next test run (fast!)       │
└─────────────────────────────────────────────────────────────┘
```

## Docker Container Setup

### Automatic Management

The testkit automatically manages a PostgreSQL Docker container:

```yaml
# packages/visualizer-db/docker-compose.test.yml
services:
  postgres:
    container_name: visualizer-db-test
    image: postgres:16
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: visualizer_test
    ports:
      - '5434:5432'  # Isolated from production (5432)
```

### Manual Commands

```bash
# Start test database (automatic via global setup, but can be manual)
cd packages/visualizer-db
yarn test:db:start

# Check status
docker ps | grep visualizer-db-test

# Stop (only when needed - usually left running)
yarn test:db:stop

# Reset completely (wipes all data)
yarn test:db:reset
```

## Using the Testkit

### Import Test Utilities

```typescript
// Seed helpers are in the E2E helpers directory
import { cleanClientData, seedProducts, seedCollections } from '../../helpers/seed-helpers';
```

### Available Functions

#### Database Connection

The database connection is automatically provided by the `db` fixture in auth-fixtures.ts. You don't need to manually create connections.

#### Data Seeding (E2E)

Available in `__tests__/e2e/helpers/seed-helpers.ts`:

```typescript
cleanClientData(db, clientId)                    // Delete all data for a client
seedProducts(db, clientId, products[])           // Seed products
seedCollections(db, clientId, productIds[], collections[])  // Seed collections + flows
seedStoreConnection(db, clientId, config)        // Seed store connection
seedGeneratedAssets(db, clientId, productId, assets[])     // Seed assets
```

## E2E Test Pattern

### Complete Example

```typescript
/**
 * Collections Feature Tests
 */
import { test, expect } from '../../setup/auth-fixtures';
import { cleanClientData, seedProducts, seedCollections } from '../../helpers/seed-helpers';
import path from 'path';
import fs from 'fs';

test.use({ testClientName: 'collections' });

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Collections Feature', () => {
  test.describe.configure({ mode: 'serial' });

  let seededProductIds: string[];

  // Seed data once before all tests
  test.beforeAll(async ({ db, clientId }) => {
    console.log('\n🌱 Seeding Collections Feature Data...\n');

    // Clean existing data for this client
    await cleanClientData(db, clientId);

    // Seed products
    seededProductIds = await seedProducts(db, clientId, [
      {
        name: 'Modern Sofa',
        category: 'Furniture',
        selectedSceneType: 'living-room',
      },
      {
        name: 'Oak Table',
        category: 'Furniture',
        selectedSceneType: 'dining-room',
      },
    ]);

    // Seed collections
    await seedCollections(db, clientId, seededProductIds, [
      { name: 'Living Room', productCount: 2, createFlow: true },
    ]);

    console.log('✅ Collections feature data seeded\n');
  });

  test('verify collections exist', async ({ db, clientId }) => {
    // 🔍 Database verification
    const collections = await db.query.collectionSession.findMany({
      where: (coll, { eq }) => eq(coll.clientId, clientId),
    });

    expect(collections).toHaveLength(1);
    expect(collections[0].name).toBe('Living Room');
    console.log('✅ Database: Collection verified');
  });

  test('verify UI shows collections', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/collections');

    // 📸 UI verification
    const count = await authenticatedPage.locator('[data-testid^="collection-card"]').count();
    expect(count).toBe(1);

    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'collections-list.png'),
    });
    console.log('📸 Saved: collections-list.png');
  });
});
```

## Test Isolation Strategies

### Strategy 1: Client-Based Isolation (Current)

Each feature test uses a different test client:

```typescript
// collections/test.spec.ts
test.use({ testClientName: 'collections' });  // Uses test-client-collections

// products/test.spec.ts
test.use({ testClientName: 'products' });     // Uses test-client-products
```

**Pros:**
- ✅ Simple - just call `cleanClientData()` in beforeAll
- ✅ Fast - no transaction overhead
- ✅ Works well with sequential tests in a feature

**Cons:**
- ⚠️ Multiple features share same database (use different clients for isolation)

### Strategy 2: Transaction Rollback (Future)

For even stronger isolation:

```typescript
import { withTransaction } from 'visualizer-db/testkit';

test('my test', async ({ db }) => {
  await withTransaction(db, async (tx) => {
    // All database operations here
    // Automatically rolled back after test
  });
});
```

**Pros:**
- ✅ Perfect isolation - each test completely independent
- ✅ No need to clean data

**Cons:**
- ⚠️ More complex
- ⚠️ Doesn't work well with Better Auth API calls

## Running Tests

### Prerequisites

1. **Docker Desktop** must be running
2. **No database port conflicts** (5434 must be free)

### Commands

```bash
# Run all E2E tests (starts container automatically)
cd apps/epox-platform
yarn test:e2e

# Run specific feature
yarn test:e2e:collections
yarn test:e2e:products

# Debug with UI mode
yarn test:e2e:ui

# Run headed (see browser)
yarn test:e2e:headed
```

### What Happens

1. **Global Setup** (once)
   - Checks if Docker is running
   - Starts `visualizer-db-test` container (if not already running)
   - Waits for PostgreSQL to be ready
   - Pushes schema using `drizzle-kit push`
   - Creates test users via Better Auth API
   - Saves authentication states

2. **Test Execution** (per feature)
   - Each feature worker runs in parallel
   - `beforeAll` cleans and seeds data for that feature
   - Tests run sequentially within the feature
   - Share the seeded data

3. **Global Teardown** (once)
   - Closes database connections
   - Leaves container running (for speed)

## Troubleshooting

### Docker Not Running

```
Error: Docker is not running
```

**Solution:** Start Docker Desktop

### Port Already in Use

```
Error: port 5434 is already allocated
```

**Solution:**
```bash
# Stop the conflicting container
docker ps | grep 5434
docker stop <container-id>

# Or use a different port in docker-compose.test.yml
```

### Schema Out of Sync

```
Error: column "settings" does not exist
```

**Solution:**
```bash
# Reset the test database
cd packages/visualizer-db
yarn test:db:reset
```

### Container Won't Start

```
Error: PostgreSQL not ready after 30 retries
```

**Solution:**
```bash
# Check Docker logs
docker logs visualizer-db-test

# Restart container
docker compose -f packages/visualizer-db/docker-compose.test.yml restart
```

### Tests Fail with Auth Errors

```
Error: Failed to authenticate
```

**Solution:**
- Make sure dev server is running (`yarn dev`)
- Check if you're on the right app (epox-platform on port 3000)
- Verify test user credentials in `test-clients.ts`

## Best Practices

### 1. Use Clean Client Data

Always start fresh:

```typescript
test.beforeAll(async ({ db, clientId }) => {
  await cleanClientData(db, clientId);
  // Now seed fresh data
});
```

### 2. Seed What You Need

Only seed data relevant to your tests:

```typescript
// ❌ Don't seed everything
await seedCompleteScenario(db, clientId, {
  products: [...100 products...],
  collections: [...50 collections...],
});

// ✅ Seed what you test
await seedProducts(db, clientId, [
  { name: 'Sofa', category: 'Furniture' },
]);
```

### 3. Verify Database First, Then UI

Database queries are faster and more reliable:

```typescript
// 1. Verify in database (fast)
const products = await db.query.product.findMany(...);
expect(products).toHaveLength(2);

// 2. Then verify in UI (slower)
const count = await page.locator('[data-testid^="product"]').count();
expect(count).toBe(2);
```

### 4. Use Screenshots Sparingly

Screenshots are expensive:

```typescript
// ❌ Don't screenshot everything
await page.screenshot({ fullPage: true });  // 1000-2000 tokens

// ✅ Screenshot specific elements
await page.locator('[data-testid="navbar"]').screenshot();  // 200-500 tokens
```

### 5. Share Data Within Features

Use `test.describe.configure({ mode: 'serial' })`:

```typescript
test.describe('My Feature', () => {
  test.describe.configure({ mode: 'serial' });  // Tests run in order

  let createdId: string;

  test('create item', async ({ db }) => {
    createdId = await createItem(db);
  });

  test('verify item', async ({ db }) => {
    const item = await db.query.item.findFirst({ where: ... });
    expect(item.id).toBe(createdId);  // Uses ID from previous test
  });
});
```

## Performance

### Cold Start (First Run)

```
Docker container start:      ~5s
Schema push:                 ~3s
User creation:              ~2s
Total global setup:          ~10s
```

### Warm Start (Subsequent Runs)

```
Container already running:    0s
Schema exists (skip push):    0s
Users exist (skip creation):  0s
Total global setup:          ~1s (just auth)
```

### Per-Test Performance

```
cleanClientData():           ~50ms
seedProducts(2):             ~100ms
seedCollections(1):          ~150ms
Total seed time:             ~300ms
```

## Summary

✅ **Full isolation** - Real PostgreSQL in Docker
✅ **Fast** - Container stays running between runs
✅ **No production impact** - Separate port and database
✅ **Reusable** - Same testkit for unit and E2E tests
✅ **Clean** - No manual seeding scripts needed
✅ **Documented** - This guide covers everything!

Now run your tests: `yarn test:e2e` 🚀
