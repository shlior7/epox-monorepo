# E2E Testing Guide

> End-to-end testing with Playwright and Testcontainers

---

## Overview

Complete E2E testing infrastructure using:
- **Playwright:** Browser automation
- **Testcontainers:** Isolated PostgreSQL containers
- **Feature-Based:** Tests organized by feature
- **Token-Efficient:** Script-first, screenshot-last

---

## Documents

### Core Guides
- **[Testcontainers Guide](./testcontainers-guide.md)** - Complete Docker setup
- **[Feature-Based Testing](./feature-based-testing.md)** - Organization strategy
- **[Test Status](./test-status.md)** - Current test status

### Additional Guides
- [Client-Based Testing](./client-based-testing.md) - Test client isolation
- [API-Based Seeding](./api-based-seeding.md) - Data seeding strategies
- [Testing Guide](./testing-guide.md) - General testing practices
- [Test Fixes](./test-fixes.md) - Common issues and fixes

---

## Quick Start

### Prerequisites

1. **Docker Desktop** must be running
2. **Dev server** on port 3000

### Run Tests

```bash
# Run all E2E tests
yarn test:e2e

# Run specific feature
yarn test:e2e:collections
yarn test:e2e:products

# Debug modes
yarn test:e2e:ui        # Interactive UI mode
yarn test:e2e:headed    # See browser
yarn test:e2e:debug     # Step through
```

### What Happens

1. **Global Setup** (once per run)
   - Starts PostgreSQL Docker container
   - Pushes schema
   - Creates test users
   - Saves auth states

2. **Test Execution** (per feature)
   - Each feature seeds its own data
   - Tests run sequentially within feature
   - Features run in parallel

3. **No Manual Seeding Needed!**
   - Tests seed data automatically
   - Container stays running for speed

---

## Test Organization

### Feature-Based Structure

```
__tests__/e2e/
├── setup/
│   ├── auth-fixtures.ts         # Playwright fixtures
│   ├── test-clients.ts          # Feature test clients
│   └── global-setup.ts          # Authentication setup
│
├── helpers/
│   ├── navigation.ts            # Navigation utilities
│   ├── seed-helpers.ts          # Data seeding functions
│   └── constants.ts             # Common selectors
│
└── tests/
    ├── collections/             # Collections feature
    │   ├── test.spec.ts
    │   └── screenshots/
    │
    ├── products/                # Products feature
    │   ├── test.spec.ts
    │   └── screenshots/
    │
    ├── store/                   # Store feature
    │   ├── test.spec.ts
    │   └── screenshots/
    │
    └── studio/                  # Studio feature
        ├── test.spec.ts
        └── screenshots/
```

### Test Clients

Each feature uses its own test client:

| Feature | Client ID | Email |
|---------|-----------|-------|
| Collections | test-client-collections | test-collections@epox.test |
| Products | test-client-products | test-products@epox.test |
| Store | test-client-store | test-store@epox.test |
| Studio | test-client-studio | test-studio@epox.test |

---

## Writing Tests

### Test Template

```typescript
import { test, expect } from '../../setup/auth-fixtures';
import { cleanClientData, seedProducts } from '../../helpers/seed-helpers';
import path from 'path';

test.use({ testClientName: 'products' });

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

test.describe('Products Feature', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ db, clientId }) => {
    console.log('\n🌱 Seeding Products Feature Data...\n');
    
    await cleanClientData(db, clientId);
    await seedProducts(db, clientId, [
      { name: 'Test Product', category: 'Furniture' },
    ]);
    
    console.log('✅ Products feature data seeded\n');
  });

  test('verify products exist', async ({ authenticatedPage, db, clientId }) => {
    console.log('\n=== VERIFY PRODUCTS EXIST ===\n');
    
    // 🔍 Database verification
    const products = await db.query.product.findMany({
      where: (p, { eq }) => eq(p.clientId, clientId),
    });
    expect(products).toHaveLength(1);
    console.log('✅ Database: verified');
    
    // 📸 UI verification
    await authenticatedPage.goto('/products');
    const count = await authenticatedPage.locator('[data-testid^="product"]').count();
    expect(count).toBe(1);
    console.log('✅ UI: verified');
    
    // Screenshot
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'products-list.png'),
    });
    console.log('📸 Saved: products-list.png');
    
    console.log('\n✅ Test complete!\n');
  });
});
```

### Dual Verification Pattern

Always verify both database and UI:

```typescript
// 1. Database (fast, reliable)
const data = await db.query.table.findFirst(...);
expect(data).toBeTruthy();

// 2. UI (slower, visual confirmation)
await page.locator('[data-testid="element"]').isVisible();
await page.screenshot({ path: 'screenshot.png' });
```

---

## Token Efficiency

### Efficient Patterns ✅

```typescript
// Text extraction (~100-500 tokens)
const state = await page.evaluate(() => ({
  hasElement: !!document.querySelector('[data-testid="my-element"]'),
  count: document.querySelectorAll('.item').length,
}));

// Navigation helpers
const nav = createNavigationHelper(page, clientId);
const state = await nav.getPageStateSummary();

// Error capture
const errors = await nav.captureErrors();
```

### Expensive Patterns ❌

```typescript
// Full page screenshot (~1000-2000 tokens)
await page.screenshot({ fullPage: true });

// Large HTML dumps
const html = await page.content();

// Multiple screenshots in loops
for (const item of items) {
  await page.locator(item).screenshot();
}
```

---

## Common Issues

### E2E Tests Failing with Auth Errors

**Issue:** 22 tests failing due to Better Auth WebSocket issues

**Temporary Fix:**
```bash
# Run in debug mode to see errors
yarn test:e2e:headed

# Check if dev server is running
curl http://localhost:3000

# Verify test database
docker ps | grep visualizer-db-test
```

**See:** [Test Status](./test-status.md) for details

### Database Out of Sync

```bash
# Reset test database
cd packages/visualizer-db
yarn test:db:reset

# Push schema again
yarn db:push
```

### Container Won't Start

```bash
# Check Docker logs
docker logs visualizer-db-test

# Restart container
docker compose -f packages/visualizer-db/docker-compose.test.yml restart
```

---

## Best Practices

### DO ✅
- Organize tests by feature
- Use separate test clients per feature
- Clean data before seeding
- Extract text before taking screenshots
- Use meaningful console logs
- Document screenshots in test file

### DON'T ❌
- Share data across features
- Take unnecessary screenshots
- Use hardcoded test IDs
- Skip database verification
- Forget to clean data
- Mix test concerns

---

## Performance

### Cold Start (First Run)
```
Container start: ~5s
Schema push: ~3s
User creation: ~2s
Total: ~10s
```

### Warm Start (Subsequent Runs)
```
Container exists: 0s
Schema exists: 0s
Users exist: 0s
Total: ~1s (just auth)
```

### Per-Test
```
cleanClientData(): ~50ms
seedProducts(2): ~100ms
seedCollections(1): ~150ms
Total: ~300ms
```

---

## Related Documentation

- [Testcontainers Guide](./testcontainers-guide.md)
- [Feature-Based Testing](./feature-based-testing.md)
- [Test Clients Guide](../../../.claude/rules/test-clients.md)
- [Playwright Verification](../../../.claude/rules/playwright-verification.md)

---

**Last Updated:** 2026-01-26
