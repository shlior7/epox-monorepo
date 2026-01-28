# Testing Patterns

**Analysis Date:** 2026-01-28

## Test Framework

**Runner:**
- Vitest 3.2.4 - Unit and integration tests
- Playwright 1.57.0 - E2E tests

**Assertion Library:**
- Vitest built-in `expect` (toBe, toEqual, toThrow, toMatchObject)
- Playwright built-in `expect` for E2E assertions

**Run Commands:**
```bash
# Unit/integration tests (per workspace)
cd packages/visualizer-db && yarn test              # DB repository tests
cd apps/epox-platform && yarn test                   # Platform unit tests

# E2E tests
cd apps/epox-platform && yarn test:e2e              # Playwright E2E

# Coverage
cd packages/visualizer-db && yarn test --coverage   # V8 coverage
```

## Test File Organization

**Location:**
- `packages/visualizer-db/src/__tests__/repositories/` - DB repository tests (19 files)
- `apps/epox-platform/__tests__/api/` - API route tests (18 files)
- `apps/epox-platform/__tests__/e2e/tests/` - Playwright E2E tests (11 files)
- `apps/epox-admin/__tests__/` - Admin component and service tests
- `apps/epox-admin/components/*/__tests__/` - Co-located component tests

**Naming:**
- `*.test.ts` for unit/integration tests
- `test.spec.ts` for E2E tests (feature-based directories)

**Structure:**
```
packages/visualizer-db/src/
├── __tests__/
│   ├── global-setup.ts          # DB container + migration setup
│   ├── setup.ts                 # Per-test environment setup
│   ├── helpers.ts               # Factory functions
│   ├── test-client.ts           # Test DB connection
│   └── repositories/
│       ├── products.test.ts
│       ├── clients.test.ts
│       └── ... (19 files)

apps/epox-platform/__tests__/
├── api/                          # Unit tests (18 files)
│   ├── products.test.ts
│   ├── collections.test.ts
│   └── ...
├── e2e/
│   ├── setup/
│   │   ├── global-setup.ts      # Auth + data seeding
│   │   ├── auth-fixtures.ts     # Playwright auth fixtures
│   │   └── test-clients.ts      # Test client definitions
│   ├── helpers/
│   │   ├── navigation.ts        # Navigation helper class
│   │   └── seed-helpers.ts      # Data seeding utilities
│   └── tests/
│       ├── home-page/test.spec.ts
│       ├── products/test.spec.ts
│       ├── collections/test.spec.ts
│       ├── studio-page/test.spec.ts
│       └── ... (11 files)
```

## Test Structure

**Suite Organization (Vitest):**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ProductRepository } from '../../repositories/products';
import { createTestClient, createTestId } from '../helpers';

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let testClientId: string;

  beforeEach(async () => {
    repo = new ProductRepository(testDb as any);
    const client = await createTestClient(testDb as any);
    testClientId = client.id;
  });

  describe('create', () => {
    it('should create a product with required fields', async () => {
      const product = await repo.create(testClientId, { name: 'Test Product' });
      expect(product).toBeDefined();
      expect(product.name).toBe('Test Product');
    });
  });
});
```

**Patterns:**
- Use `beforeEach` for per-test setup, avoid `beforeAll`
- Arrange/Act/Assert pattern
- One assertion focus per test (but multiple expects OK)
- Sequential execution for DB tests (`pool: 'forks'`, `singleFork: true`)

## Mocking

**Framework:**
- Vitest built-in mocking (`vi`)

**What to Mock:**
- External API calls (Gemini, Stripe)
- File system operations
- Database connections (in API tests)

**What NOT to Mock:**
- Database queries in repository tests (use real test DB)
- Pure utility functions

## Fixtures and Factories

**Test Data (DB tests):**
```typescript
// packages/visualizer-db/src/__tests__/helpers.ts
createTestId(prefix = 'test'): string      // Unique test IDs
createTestClient(db, overrides?)            // Test client
createTestProduct(db, clientId, overrides?) // Test product
createTestCollectionSession(db, clientId)   // Test collection
```

**Test Clients (E2E):**
- `test-client-main` - Default test client with products, collections, flows
- `test-client-secondary` - Secondary client for multi-client scenarios
- Auth fixtures in `apps/epox-platform/__tests__/e2e/setup/auth-fixtures.ts`

**Location:**
- Factory functions: `packages/visualizer-db/src/__tests__/helpers.ts`
- E2E fixtures: `apps/epox-platform/__tests__/e2e/setup/`

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracked for awareness
- Focus on critical paths (repositories, API routes, security)

**Configuration:**
```typescript
// packages/visualizer-db/vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.{test,spec}.ts', 'src/__tests__/**', 'src/index.ts'],
}
```

## Test Types

**Unit Tests (Vitest):**
- Scope: Test single function/module in isolation
- Location: `__tests__/api/`, co-located `__tests__/` directories
- Speed: Fast (<100ms per test for non-DB tests)

**Integration Tests (Vitest + real DB):**
- Scope: Test repositories against real PostgreSQL
- Location: `packages/visualizer-db/src/__tests__/repositories/`
- Setup: Docker PostgreSQL test container on port 5434
- Config: `packages/visualizer-db/docker-compose.test.yml`
- Timeout: 30s per test, 60s for setup

**E2E Tests (Playwright):**
- Scope: Full user flows through browser
- Location: `apps/epox-platform/__tests__/e2e/tests/`
- Config: `apps/epox-platform/playwright.config.ts`
- Features: Video recording (on), screenshots (on-failure), traces (on-first-retry)
- Timeout: 60s per test
- Strategy: Script-first, screenshot-last (text extraction preferred)

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operation', async () => {
  const result = await repo.create(clientId, { name: 'Test' });
  expect(result).toBeDefined();
});
```

**Error Testing:**
```typescript
it('should throw on non-existent ID', async () => {
  await expect(repo.requireById('non-existent'))
    .rejects.toThrow(NotFoundError);
});
```

**E2E Navigation (Playwright):**
```typescript
test('verify page layout', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);
  await nav.goToDashboard();
  const state = await nav.getPageStateSummary();
  expect(state.title).toBeDefined();
});
```

**DB Repository Test Requirements:**
Every new repository method must test:
1. Happy path - Normal successful operation
2. Edge cases - Empty arrays, null values
3. All options/parameters - Every filter, sort, pagination
4. Error cases - Invalid inputs, not found
5. Return types - Verify structure

---

*Testing analysis: 2026-01-28*
*Update when test patterns change*
