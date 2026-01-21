# Playwright Testing Setup for epox-platform - Complete ✅

Playwright E2E testing has been successfully set up for epox-platform with authenticated test clients and token-efficient navigation helpers.

## What Was Created

### Core Files

```
apps/epox-platform/
├── __tests__/
│   ├── setup/
│   │   ├── seed-test-data.ts       ✅ Creates test clients & data
│   │   ├── auth-fixtures.ts         ✅ Playwright authentication fixtures
│   │   └── global-setup.ts          ✅ Pre-test authentication
│   ├── helpers/
│   │   └── navigation.ts            ✅ Token-efficient navigation utilities
│   ├── .gitignore                   ✅ Ignores .auth/ directory
│   ├── example.spec.ts              ✅ Example tests
│   └── README.md                    ✅ Complete testing guide
├── playwright.config.ts             ✅ Playwright configuration
└── package.json                     ✅ Updated with test scripts
```

### Configuration Updates

**package.json** - New scripts:

- `yarn test:seed` - Seed test data
- `yarn test:e2e` - Run E2E tests
- `yarn test:e2e:ui` - Run in UI mode (recommended)
- `yarn test:e2e:debug` - Debug mode
- `yarn test:e2e:headed` - Headed mode (see browser)

**playwright.config.ts** - Configured with:

- Base URL: `http://localhost:3000`
- Global setup for authentication
- Test directory: `__tests__`
- Video/screenshots on failure only

### Claude Rules

Updated `.claude/rules/test-clients.md` to include epox-platform.

## Quick Start Guide

### Step 1: Seed Test Data

```bash
cd apps/epox-platform
yarn test:seed
```

**Expected Output:**

```
🌱 Starting test data seeding...

📦 Processing client: Test Client - Main
   ✅ Created client: test-client-main
   ✅ Created user
   ✅ Created credential account
   ✅ Created membership
   ✅ Created product: Modern Sofa
   ✅ Created product: Oak Dining Table
   ✅ Created product: LED Floor Lamp
   ✅ Created collection: Living Room Collection
   ✅ Created generation flow for collection
   ✅ Created collection: Dining Room Set
   ✅ Created generation flow for collection

🎉 Test data seeding completed!

📝 Test Credentials:
   Test Client - Main:
   Email: test-main@epox.test
   Password: TestPassword123!
   Client ID: test-client-main
```

### Step 2: Run Tests

```bash
# Run all E2E tests
yarn test:e2e

# Run in UI mode (best for development)
yarn test:e2e:ui
```

## Test Clients

### Main Client (Default)

- **ID**: `test-client-main`
- **Email**: `test-main@epox.test`
- **Password**: `TestPassword123!`
- **Data**: 3 products, 2 collections

### Secondary Client

- **ID**: `test-client-secondary`
- **Email**: `test-secondary@epox.test`
- **Password**: `TestPassword123!`
- **Data**: 2 products, 1 collection

## Writing Your First Test

Create a new file in `__tests__/`:

```typescript
import { test, expect } from './setup/auth-fixtures';
import { createNavigationHelper } from './helpers/navigation';

test.use({ testClientName: 'main' });

test('dashboard loads without errors', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // Navigate
  await nav.goToDashboard();

  // Extract state as TEXT (efficient!)
  const state = await nav.getPageStateSummary();

  // Assertions
  expect(state.url).toContain('/dashboard');
  expect(state.errorMessages).toHaveLength(0);
});
```

## How Claude Will Use This

When you ask Claude to test something:

**You:** "Check the product studio page"

**Claude will:**

1. Use `test-client-main` automatically
2. Navigate using navigation helpers
3. Extract page state as text (not screenshots)
4. Report findings efficiently

**You:** "Go to the collections page and check the flow list"

**Claude will:**

1. Use `test-client-main`
2. Navigate to `/collections`
3. Extract flow list state as text
4. Report the number of flows and their details

## Token Efficiency

### The Problem

Screenshots and HTML dumps consume many tokens:

- Full page screenshot: ~1,000-2,000 tokens
- HTML dump: ~500-1,500 tokens

### The Solution

Text extraction consumes far fewer tokens:

- Page state summary: ~100-500 tokens
- Config panel state: ~200-500 tokens
- Error capture: ~100-300 tokens

**Result:** 5-10x token savings per test operation!

## Navigation Methods

All routes in epox-platform are supported:

```typescript
const nav = createNavigationHelper(page, clientId);

await nav.goToDashboard(); // /dashboard
await nav.goToProducts(); // /products
await nav.goToProduct(id); // /products/:id
await nav.goToCollections(); // /collections
await nav.goToCollection(id); // /collections/:id
await nav.goToNewCollection(); // /collections/new
await nav.goToStudio(); // /studio
await nav.goToStudioSession(id); // /studio/:id
await nav.goToCollectionStudio(id); // /studio/collections/:id
await nav.goToAssets(); // /assets
await nav.goToSettings(); // /settings
```

## State Extraction Methods

```typescript
// Get overall page state
const pageState = await nav.getPageStateSummary();

// Get config panel state
const configPanel = await nav.getConfigPanelState();

// Get generation flow list
const flowList = await nav.getGenFlowListState();

// Capture errors
const errors = await nav.captureErrors();

// Check if panel exists
const panel = await nav.checkPanelExists(selector);
```

## Example Tests

See `apps/epox-platform/__tests__/example.spec.ts` for:

- Dashboard loading tests
- Products page tests
- Collections page tests
- Studio page tests
- Multi-step user flows
- Multi-client testing

## Authentication

- **Global Setup**: Runs once before all tests
- **Storage State**: Saved to `__tests__/.auth/`
- **Reusability**: No re-login needed across tests
- **Fast**: Authentication state is reused

## Maintenance

### Re-seed Test Data

```bash
yarn test:seed
```

### Clear Authentication

```bash
rm -rf __tests__/.auth
```

### View Test Report

```bash
yarn test:e2e
npx playwright show-report
```

## CI/CD Ready

The setup is CI-friendly:

- Idempotent seeding (safe to re-run)
- Fast auth reuse
- Configurable workers
- Automatic retries

## Comparison: epox-platform vs scenergy-visualizer

Both apps now have Playwright setup:

| Feature      | epox-platform                                    | scenergy-visualizer                         |
| ------------ | ------------------------------------------------ | ------------------------------------------- |
| Test Command | `yarn test:e2e`                                  | `yarn test:visual`                          |
| Seed Command | `yarn test:seed`                                 | `yarn test:seed`                            |
| Test Clients | Same (test-client-main, test-client-secondary)   | Same                                        |
| Navigation   | Dashboard, Products, Collections, Studio, Assets | Product Studio, Collection Studio, Settings |
| Database     | Shared (visualizer-db)                           | Shared (visualizer-db)                      |
| Auth         | Shared (visualizer-auth)                         | Shared (visualizer-auth)                    |

## Next Steps

1. **Seed the database**: `yarn test:seed`
2. **Run example tests**: `yarn test:e2e:ui`
3. **Write your tests**: See `__tests__/README.md`
4. **Ask Claude to test**: "Go to the dashboard and check for errors"

## Resources

- **Testing Guide**: `apps/epox-platform/__tests__/README.md`
- **Example Tests**: `apps/epox-platform/__tests__/example.spec.ts`
- **Playwright Docs**: https://playwright.dev
- **Claude Rules**: `.claude/rules/test-clients.md` and `.claude/rules/playwright-testing.md`

---

**Summary:** epox-platform now has a complete, token-efficient Playwright E2E testing setup with authenticated test clients. Claude will automatically use these when you ask it to test UI components or user flows.

**First Command:** `cd apps/epox-platform && yarn test:seed && yarn test:e2e:ui`
