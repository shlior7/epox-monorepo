# Testing Documentation

> Complete testing guides and strategies

---

## Overview

Comprehensive testing infrastructure including:
- **E2E Testing:** Playwright with Testcontainers
- **Unit Testing:** Vitest for API and components
- **Integration Testing:** Database and service tests
- **Security Testing:** Regular security audits

---

## Testing Guides

### [E2E Testing](./e2e/README.md)
End-to-end testing with Playwright:
- [Testcontainers Guide](./e2e/testcontainers-guide.md)
- [Feature-Based Testing](./e2e/feature-based-testing.md)
- [Test Status](./e2e/test-status.md)
- [Test Clients](../../.claude/rules/test-clients.md)

### [Unit Testing](./unit-testing.md)
API and component testing:
- Products API
- Collections API
- Generated Images API
- Component tests

### [Security Testing](./security-audit.md)
Security audits and best practices:
- Authentication testing
- Authorization checks
- Input validation
- SQL injection prevention

---

## Quick Start

### Running Tests

```bash
# Unit tests
yarn test                  # All unit tests
yarn test:watch            # Watch mode
yarn test:coverage         # With coverage

# E2E tests
yarn test:e2e              # All E2E tests
yarn test:e2e:ui           # UI mode (interactive)
yarn test:e2e:headed       # See browser
yarn test:e2e:debug        # Debug mode

# Specific features
yarn test:e2e:collections  # Collections feature
yarn test:e2e:products     # Products feature
```

### Test Structure

```
apps/epox-platform/__tests__/
├── api/                    # Unit tests for API routes
│   ├── products.test.ts
│   ├── collections.test.ts
│   └── generated-images.test.ts
│
├── e2e/                    # E2E tests
│   ├── setup/              # Test setup and fixtures
│   ├── helpers/            # Test utilities
│   └── tests/              # Feature-based tests
│       ├── collections/
│       ├── products/
│       ├── store/
│       └── studio/
│
└── components/             # Component tests
    └── bubble-system/
```

---

## Testing Strategy

### Feature-Based E2E Testing

Tests are organized by feature, not by page:

```
✅ Benefits:
- Tests share seeded data
- Faster execution (parallel features)
- Clear ownership
- Realistic user flows

❌ Avoid:
- Page-based tests
- Shared test data across features
- Screenshot-heavy tests
```

### Test Isolation

Each feature uses its own test client:

| Feature | Test Client | Email |
|---------|-------------|-------|
| Collections | test-client-collections | test-collections@epox.test |
| Products | test-client-products | test-products@epox.test |
| Store | test-client-store | test-store@epox.test |
| Studio | test-client-studio | test-studio@epox.test |

### Token Efficiency

**Script-First, Screenshot-Last:**

```typescript
// ✅ Efficient (100-500 tokens)
const state = await nav.getPageStateSummary();
const errors = await nav.captureErrors();

// ❌ Expensive (1000-2000 tokens)
await page.screenshot({ fullPage: true });
```

---

## Test Coverage

### Current Status

#### Unit Tests
- ✅ Products API: 100%
- ✅ Collections API: 100%
- ✅ Generated Images API: 100%
- ✅ Image Generation Flow: 100%
- ⚠️ Component tests: 60%

#### E2E Tests
- ⚠️ 22 tests failing (Better Auth issues)
- ✅ 13 tests passing
- 🔄 11 tests skipped

**See:** [Test Status](./e2e/test-status.md)

---

## Common Patterns

### E2E Test Template

```typescript
import { test, expect } from '../../setup/auth-fixtures';
import { cleanClientData, seedProducts } from '../../helpers/seed-helpers';

test.use({ testClientName: 'products' });

test.describe('Products Feature', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ db, clientId }) => {
    await cleanClientData(db, clientId);
    await seedProducts(db, clientId, [
      { name: 'Test Product', category: 'Furniture' },
    ]);
  });

  test('verify products exist', async ({ db, clientId }) => {
    const products = await db.query.product.findMany({
      where: (p, { eq }) => eq(p.clientId, clientId),
    });
    expect(products).toHaveLength(1);
  });
});
```

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return products list', async () => {
    const request = new NextRequest('http://localhost/api/products');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.products).toBeInstanceOf(Array);
  });
});
```

---

## Testing Best Practices

### DO ✅
- Use feature-based organization
- Clean data before each feature
- Extract text, not screenshots
- Test database first, then UI
- Use meaningful test names
- Add data-testid to components

### DON'T ❌
- Share data across features
- Take full-page screenshots
- Test implementation details
- Use sleep/wait unnecessarily
- Hardcode test data IDs
- Skip error handling

---

## Troubleshooting

### E2E Tests Failing

```bash
# Check if dev server is running
curl http://localhost:3000

# Check if test database is running
docker ps | grep visualizer-db-test

# Re-seed test data
yarn test:seed

# Run in headed mode to see what's happening
yarn test:e2e:headed
```

### Authentication Errors

```bash
# Clear auth state
rm -rf __tests__/.auth/*

# Re-run global setup
yarn test:e2e --project=setup
```

### Database Issues

```bash
# Reset test database
cd packages/visualizer-db
yarn test:db:reset

# Push schema again
yarn db:push
```

---

## Related Documentation

- [Testcontainers Guide](./e2e/testcontainers-guide.md)
- [Test Clients Guide](../../.claude/rules/test-clients.md)
- [Playwright Verification](../../.claude/rules/playwright-verification.md)
- [Unit Testing Guide](./unit-testing.md)

---

**Last Updated:** 2026-01-26
