# Playwright E2E Testing Setup for epox-platform

Complete Playwright testing infrastructure with pre-configured test clients, authentication, and token-efficient navigation helpers.

## Quick Start

### 1. Seed Test Data

```bash
cd apps/epox-platform
yarn test:seed
```

This creates:

- 2 test clients with authentication
- Products (3 for main client, 2 for secondary)
- Collections with generation flows

### 2. Run Tests

```bash
# Run all E2E tests
yarn test:e2e

# Run in UI mode (recommended for development)
yarn test:e2e:ui

# Debug mode
yarn test:e2e:debug

# Headed mode (see browser)
yarn test:e2e:headed
```

## Test Clients

### Main Test Client (Default)

- **Client ID:** `test-client-main`
- **Email:** `test-main@epox.test`
- **Password:** `TestPassword123!`
- **Products:** 3 (Modern Sofa, Oak Dining Table, LED Floor Lamp)
- **Collections:** 2 (Living Room Collection, Dining Room Set)

### Secondary Test Client

- **Client ID:** `test-client-secondary`
- **Email:** `test-secondary@epox.test`
- **Password:** `TestPassword123!`
- **Products:** 2 (Office Chair, Standing Desk)
- **Collections:** 1 (Office Setup)

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from './setup/auth-fixtures';
import { createNavigationHelper } from './helpers/navigation';

// Use main test client
test.use({ testClientName: 'main' });

test('my test', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // Navigate and test
  await nav.goToDashboard();
  const state = await nav.getPageStateSummary();

  expect(state.errorMessages).toHaveLength(0);
});
```

### Token-Efficient Testing

**❌ Expensive (High Token Usage):**

```typescript
await page.screenshot(); // ~1,000-2,000 tokens
const html = await page.content(); // ~500-1,500 tokens
```

**✅ Efficient (Low Token Usage):**

```typescript
// Extract state as text (~100-500 tokens)
const state = await nav.getPageStateSummary();

// Check for errors (~100-300 tokens)
const errors = await nav.captureErrors();

// Get specific panel state (~200-500 tokens)
const panel = await nav.getConfigPanelState();
```

### Navigation Helpers

```typescript
const nav = createNavigationHelper(page, clientId);

// Navigate to pages
await nav.goToDashboard();
await nav.goToProducts();
await nav.goToProduct(productId);
await nav.goToCollections();
await nav.goToCollection(collectionId);
await nav.goToStudio();
await nav.goToStudioSession(studioId);
await nav.goToCollectionStudio(collectionId);
await nav.goToSettings();

// Extract state (text-only)
const pageState = await nav.getPageStateSummary();
const configPanel = await nav.getConfigPanelState();
const flowList = await nav.getGenFlowListState();

// Capture errors
const errors = await nav.captureErrors();
```

## Directory Structure

```
__tests__/
├── setup/
│   ├── seed-test-data.ts       # Database seeding
│   ├── auth-fixtures.ts         # Playwright fixtures
│   └── global-setup.ts          # Authentication setup
├── helpers/
│   └── navigation.ts            # Navigation utilities
├── .auth/                       # Auth state (gitignored)
│   ├── test-client-main.json
│   └── test-client-secondary.json
├── .gitignore
├── example.spec.ts              # Example tests
└── README.md                    # This file
```

## Authentication

- **Global Setup**: Authenticates all test users once before running tests
- **Storage State**: Saves auth state to `.auth/` directory
- **Reusability**: Auth state is reused across tests (fast!)

## Common Test Patterns

### Check Page Loads Without Errors

```typescript
test('dashboard loads without errors', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);
  const errors = await nav.captureErrors();

  await nav.goToDashboard();
  await authenticatedPage.waitForLoadState('networkidle');

  expect(errors.consoleErrors).toHaveLength(0);
  expect(errors.networkFailures).toHaveLength(0);
});
```

### Multi-Step User Flow

```typescript
test('user can navigate through app', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  await nav.goToDashboard();
  await nav.goToProducts();
  await nav.goToCollections();

  const state = await nav.getPageStateSummary();
  expect(state.errorMessages).toHaveLength(0);
});
```

## Token Usage Guide

| Action               | Token Cost   | When to Use                 |
| -------------------- | ------------ | --------------------------- |
| Text extraction      | ~100-500     | ✅ Always (default)         |
| Element screenshot   | ~200-500     | ⚠️ Visual verification only |
| Full page screenshot | ~1,000-2,000 | ❌ Avoid                    |

**Golden Rule:** Script-First, Screenshot-Last.

## Troubleshooting

### Authentication Failed

1. Check server running on `http://localhost:3000`
2. Re-seed: `yarn test:seed`
3. Clear auth: `rm -rf __tests__/.auth`

### Cannot Find Test Data

Re-seed: `yarn test:seed`

### Tests Are Slow

1. Ensure auth state exists: `ls __tests__/.auth`
2. Use text extraction, not screenshots
3. Run in parallel: `yarn test:e2e --workers=4`

## CI/CD

Example workflow:

```yaml
- name: Seed test data
  run: |
    cd apps/epox-platform
    yarn test:seed

- name: Run E2E tests
  run: yarn test:e2e
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Example Tests](./example.spec.ts)
- See also: `.claude/rules/playwright-testing.md` and `.claude/rules/test-clients.md`
