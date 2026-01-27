# Playwright Testing Setup - Complete Guide

This document provides a complete overview of the Playwright testing setup with authenticated test clients.

## What Was Created

### 1. Test Data Seeding (`__tests__/setup/seed-test-data.ts`)

A script that creates test clients with pre-populated data:

- **2 test clients** with fixed IDs
- **Test users** with password authentication
- **Products** (3 for main, 2 for secondary)
- **Collections** with generation flows
- **Idempotent** - safe to run multiple times

**Test Clients:**

- `test-client-main` (email: `test-main@epox.test`, password: `TestPassword123!`)
- `test-client-secondary` (email: `test-secondary@epox.test`, password: `TestPassword123!`)

### 2. Authentication Fixtures (`__tests__/setup/auth-fixtures.ts`)

Playwright fixtures that provide:

- Pre-authenticated page instances
- Client ID injection
- Storage state management
- Type-safe test client selection

### 3. Global Setup (`__tests__/setup/global-setup.ts`)

Runs once before all tests:

- Authenticates all test users
- Saves authentication state to `.auth/` directory
- Eliminates repeated login flows

### 4. Navigation Helpers (`__tests__/helpers/navigation.ts`)

Token-efficient utilities for:

- Page navigation (`goToDashboard`, `goToProductStudio`, etc.)
- Text-based state extraction (not screenshots!)
- Error capturing
- Common selectors

### 5. Claude Rules

Two new rule files to guide Claude:

- **`.claude/rules/playwright-testing.md`** - Efficient testing strategies (script-first, screenshot-last)
- **`.claude/rules/test-clients.md`** - When and how to use test clients

### 6. Configuration Updates

- **`playwright.config.ts`** - Added global setup
- **`package.json`** - Added `test:seed` script

### 7. Documentation

- **`__tests__/README.md`** - Complete testing guide
- **`__tests__/example.spec.ts`** - Example tests
- **`PLAYWRIGHT_SETUP.md`** - This file

## Quick Start

### Step 1: Seed Test Data

```bash
cd apps/scenergy-visualizer
yarn test:seed
```

Expected output:

```
🌱 Starting test data seeding...

📦 Processing client: Test Client - Main
   ✅ Created client: test-client-main
   ✅ Created user: <user-id>
   ✅ Created credential account
   ✅ Created membership
   ✅ Created product: Modern Sofa
   ✅ Created product: Oak Dining Table
   ✅ Created product: LED Floor Lamp
   ✅ Created collection: Living Room Collection
   ✅ Created generation flow for collection
   ✅ Created collection: Dining Room Set
   ✅ Created generation flow for collection

✨ Completed seeding for Test Client - Main

[... similar output for secondary client ...]

🎉 Test data seeding completed!

📝 Test Credentials:
   Test Client - Main:
   Email: test-main@epox.test
   Password: TestPassword123!
   Client ID: test-client-main
```

### Step 2: Run Tests

```bash
# Run all tests
yarn test:visual

# Run in UI mode (recommended)
yarn test:visual:ui

# Run example tests
yarn test:visual example.spec.ts
```

## How to Use in Tests

### Basic Test Structure

```typescript
import { test, expect } from './setup/auth-fixtures';
import { createNavigationHelper } from './helpers/navigation';

// Use main test client (default)
test.use({ testClientName: 'main' });

test('my test', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // Navigate
  await nav.goToDashboard();

  // Extract state as text (efficient!)
  const state = await nav.getPageStateSummary();
  console.log('Page loaded:', state.title);

  // Assertions
  expect(state.errorMessages).toHaveLength(0);
});
```

### Using Different Test Clients

```typescript
// Main client (3 products, 2 collections)
test.use({ testClientName: 'main' });

// Secondary client (2 products, 1 collection)
test.use({ testClientName: 'secondary' });
```

### Navigation Methods

```typescript
const nav = createNavigationHelper(page, clientId);

// Navigate to pages
await nav.goToDashboard();
await nav.goToProductStudio(productId);
await nav.goToCollectionStudio(studioId);
await nav.goToProductSettings(productId);
await nav.goToClientSettings();

// Extract state (text-only, efficient)
const configPanel = await nav.getConfigPanelState();
const flowList = await nav.getGenFlowListState();
const pageState = await nav.getPageStateSummary();
const errors = await nav.captureErrors();
```

## Token Efficiency

### The Problem

Playwright MCP with screenshots can burn tokens quickly:

- Full page screenshot: ~1,000-2,000 tokens
- HTML content dump: ~500-1,500 tokens
- Multiple screenshots: 5,000+ tokens per test

### The Solution

**Script-First, Screenshot-Last:**

1. **Text extraction** for logic verification (~100-500 tokens)
2. **Targeted screenshots** only when visuals matter (~200-500 tokens)
3. **Never use** full-page screenshots unless absolutely necessary

### Token Comparison

| Approach                    | Token Cost   | Use Case                      |
| --------------------------- | ------------ | ----------------------------- |
| `nav.getPageStateSummary()` | ~100-500     | ✅ Default - check page state |
| `nav.getConfigPanelState()` | ~200-500     | ✅ Extract form data          |
| `nav.captureErrors()`       | ~100-300     | ✅ Verify no errors           |
| Element screenshot          | ~200-500     | ⚠️ Visual verification only   |
| Full page screenshot        | ~1,000-2,000 | ❌ Avoid if possible          |

## When Claude Uses Test Clients

Claude will automatically use test clients when you ask:

- "Check the product studio"
- "Go to the config panel"
- "Look at the collection studio"
- "Test the generation flow list"
- "Navigate to [page]"
- "Verify [component]"

### Example Interactions

**You:** "Go to product studio and check the config panel"

**Claude:** Uses `test-client-main`, navigates to product studio, extracts config panel state as text, reports findings.

**You:** "Check the collection studio gen flow list view"

**Claude:** Uses `test-client-main`, navigates to collection studio, extracts flow list state, reports number of flows and their details.

## Maintenance

### Re-seed Test Data

```bash
yarn test:seed
```

Safe to run anytime. Deletes old test data and recreates it.

### Clear Authentication State

```bash
rm -rf __tests__/.auth
```

Then re-run tests to trigger re-authentication.

### Add New Test Client

1. Edit `__tests__/setup/seed-test-data.ts`:

```typescript
const TEST_CLIENTS = [
  // ... existing clients
  {
    id: 'test-client-new',
    name: 'Test Client - New',
    slug: 'test-client-new',
    email: 'test-new@epox.test',
    password: 'TestPassword123!',
    userName: 'Test New User',
    products: [
      // ... your products
    ],
    collections: [
      // ... your collections
    ],
  },
];
```

2. Update `__tests__/setup/auth-fixtures.ts`:

```typescript
const TEST_CLIENT_MAP: Record<TestClientName, TestClient> = {
  // ... existing clients
  new: {
    id: TEST_CLIENTS[2].id,
    name: TEST_CLIENTS[2].name,
    email: TEST_CLIENTS[2].email,
    password: TEST_CLIENTS[2].password,
    storageState: path.join(__dirname, '../.auth/test-client-new.json'),
  },
};
```

3. Update type:

```typescript
export type TestClientName = 'main' | 'secondary' | 'new';
```

4. Re-seed:

```bash
yarn test:seed
```

## File Structure Summary

```
apps/scenergy-visualizer/
├── __tests__/
│   ├── setup/
│   │   ├── seed-test-data.ts        # Creates test clients & data
│   │   ├── auth-fixtures.ts          # Playwright fixtures
│   │   └── global-setup.ts           # Pre-test authentication
│   ├── helpers/
│   │   └── navigation.ts             # Navigation utilities
│   ├── .auth/                        # Auth state (gitignored)
│   │   ├── test-client-main.json
│   │   └── test-client-secondary.json
│   ├── .gitignore                    # Ignores .auth/
│   ├── example.spec.ts               # Example tests
│   └── README.md                     # Testing guide
├── playwright.config.ts              # Updated with globalSetup
├── package.json                      # Added test:seed script
├── PLAYWRIGHT_SETUP.md               # This file
└── .claude/
    └── rules/
        ├── playwright-testing.md     # Testing efficiency rules
        └── test-clients.md           # Test client usage rules
```

## Benefits

### For You

1. **No manual login** - Authentication is handled automatically
2. **Consistent test data** - Same clients, products, collections every time
3. **Fast tests** - Auth state reused across all tests
4. **Easy debugging** - Predefined test data means reproducible issues

### For Claude

1. **Automatic test client selection** - Claude knows when to use test clients
2. **Token-efficient testing** - Text extraction instead of screenshots
3. **Guided behavior** - Rules define best practices
4. **Faster responses** - Less token usage = faster, cheaper responses

## Troubleshooting

### Tests fail with "Authentication failed"

1. Check server is running: `http://localhost:3000`
2. Re-seed data: `yarn test:seed`
3. Clear auth: `rm -rf __tests__/.auth`
4. Re-run tests

### "Cannot find test data"

Re-seed: `yarn test:seed`

### Tests are slow

1. Check auth state exists: `ls __tests__/.auth`
2. Use text extraction, not screenshots
3. Run in parallel: `yarn test:visual --workers=4`

### Want to see what's happening

```bash
# UI mode (recommended)
yarn test:visual:ui

# Debug mode
yarn test:visual:debug

# Headed mode (see browser)
yarn test:visual --headed
```

## Next Steps

1. **Run the example tests**: `yarn test:visual example.spec.ts`
2. **Write your first test** - See `__tests__/README.md` for patterns
3. **Ask Claude to test something** - Try: "Go to the product studio and check if it loads without errors"

## Resources

- [Testing Guide](__tests__/README.md) - Detailed testing patterns
- [Playwright Docs](https://playwright.dev) - Official documentation
- [Example Tests](__tests__/example.spec.ts) - Working examples
- [Claude Rules](.claude/rules/test-clients.md) - How Claude uses test clients

---

**Summary:** You now have a complete, token-efficient Playwright testing setup with authenticated test clients. Claude will automatically use these when you ask it to test or verify UI components.
