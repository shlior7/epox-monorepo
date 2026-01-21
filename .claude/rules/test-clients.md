---
description: 'Test client setup and usage for Playwright testing with authentication'
alwaysApply: false
---

# Test Client Usage for Playwright Tests

## Overview

This project has pre-configured test clients with authentication and sample data for efficient Playwright testing. When the user asks you to check or test something in the application, use these test clients automatically.

**Available in:**

- `apps/epox-platform` - E2E tests (`yarn test:e2e`)
- `apps/scenergy-visualizer` - Visual tests (`yarn test:visual`)

## Available Test Clients

### 1. Test Client - Main (`test-client-main`)

**Use this as the default test client for most testing tasks.**

- **Client ID:** `test-client-main`
- **Email:** `test-main@epox.test`
- **Password:** `TestPassword123!`
- **User Name:** Test Main User

**Pre-populated Data:**

- **Products:**
  - Modern Sofa (Furniture)
  - Oak Dining Table (Furniture)
  - LED Floor Lamp (Lighting)

- **Collections:**
  - Living Room Collection (draft)
  - Dining Room Set (completed)

- **Generation Flows:**
  - One flow per collection with 2 products each

### 2. Test Client - Secondary (`test-client-secondary`)

**Use this for multi-client testing scenarios or when you need a second client.**

- **Client ID:** `test-client-secondary`
- **Email:** `test-secondary@epox.test`
- **Password:** `TestPassword123!`
- **User Name:** Test Secondary User

**Pre-populated Data:**

- **Products:**
  - Office Chair (Furniture)
  - Standing Desk (Furniture)

- **Collections:**
  - Office Setup (draft)

- **Generation Flows:**
  - One flow per collection

## When to Use Test Clients

### Automatic Usage Triggers

When the user says any of these, AUTOMATICALLY use the test client:

- "Check the product studio"
- "Go to the config panel"
- "Look at the collection studio"
- "Check the generation flow list"
- "Test the [feature name]"
- "Navigate to [page name]"
- "Verify [component name]"

### Example User Prompts → Actions

| User Request                                      | Action                                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| "Go to product studio and check the config panel" | 1. Use test-client-main<br>2. Navigate to product studio for "Modern Sofa"<br>3. Extract config panel state as text        |
| "Check the collection studio gen flow list"       | 1. Use test-client-main<br>2. Navigate to "Living Room Collection" studio<br>3. Extract generation flow list state as text |
| "Test the product settings page"                  | 1. Use test-client-main<br>2. Navigate to product settings<br>3. Verify page loads without errors                          |

## How to Use Test Clients

### Step 1: Choose the Right Test Fixture

```typescript
// Default: Use main test client
test.use({ testClientName: 'main' });

// For secondary client
test.use({ testClientName: 'secondary' });
```

### Step 2: Write Efficient Tests (Script-First, Screenshot-Last)

**❌ DON'T: Use browser automation with screenshots**

```typescript
// Inefficient - uses lots of tokens
test('check config panel', async ({ page }) => {
  await page.goto('http://localhost:3000/...');
  await page.screenshot(); // Expensive!
});
```

**✅ DO: Use navigation helpers with text extraction**

```typescript
import { test, expect } from '../setup/auth-fixtures';
import { createNavigationHelper } from '../helpers/navigation';

test.use({ testClientName: 'main' });

test('check config panel', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // Navigate to product studio
  await nav.goToProductStudio('product-id-here');

  // Extract config panel state as TEXT (not screenshot)
  const panelState = await nav.getConfigPanelState();

  expect(panelState.exists).toBe(true);
  console.log('Config Panel State:', panelState.state);
});
```

### Step 3: Use Navigation Helpers

The `NavigationHelper` class provides token-efficient methods:

```typescript
const nav = createNavigationHelper(page, clientId);

// Navigate efficiently
await nav.goToDashboard();
await nav.goToProductStudio(productId);
await nav.goToCollectionStudio(studioId);
await nav.goToClientSettings();

// Extract state as TEXT (efficient)
const configPanel = await nav.getConfigPanelState();
const flowList = await nav.getGenFlowListState();
const pageState = await nav.getPageStateSummary();

// Check for errors (text-only)
const errors = await nav.captureErrors();
console.log('Console Errors:', errors.consoleErrors);
console.log('Network Failures:', errors.networkFailures);
```

## Common Testing Patterns

### Pattern 1: Check a Specific Panel/Component

```typescript
test('verify config panel on product studio', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // Get the first product ID from test data
  // For test-client-main, we know we have "Modern Sofa", "Oak Dining Table", etc.
  await nav.goToDashboard();

  // Navigate to product studio (you'll need to get product ID first)
  // Or use known test product IDs

  // Check config panel exists
  const panel = await nav.checkPanelExists('[data-testid="config-panel"]');
  expect(panel.exists).toBe(true);

  // Get detailed state
  const state = await nav.getConfigPanelState();
  console.log('Panel inputs:', state.state?.inputs);
});
```

### Pattern 2: Check Generation Flow List

```typescript
test('verify generation flows in collection studio', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // For test-client-main, we know we have "Living Room Collection"
  const collectionId = 'living-room-collection-id'; // You'll need to query this

  await nav.goToCollectionStudio(collectionId);

  const flowList = await nav.getGenFlowListState();

  expect(flowList.exists).toBe(true);
  console.log('Total flows:', flowList.state?.totalFlows);
  console.log('Flows:', flowList.state?.flows);
});
```

### Pattern 3: Multi-Step User Flow

```typescript
test('complete user journey', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);
  const errors = await nav.captureErrors();

  // Step 1: Dashboard
  await nav.goToDashboard();
  let state = await nav.getPageStateSummary();
  console.log('Dashboard loaded:', state.title);

  // Step 2: Product Studio
  await nav.goToProductStudio('product-id');
  state = await nav.getPageStateSummary();
  console.log('Product Studio loaded:', state.title);

  // Step 3: Settings
  await nav.goToClientSettings();
  state = await nav.getPageStateSummary();
  console.log('Settings loaded:', state.title);

  // Check for errors throughout
  expect(errors.consoleErrors).toHaveLength(0);
  expect(errors.networkFailures).toHaveLength(0);
});
```

## Getting Product/Collection IDs

Since test data is seeded dynamically, you'll need to query for IDs:

```typescript
test('get test product IDs', async ({ authenticatedPage, clientId }) => {
  // Navigate to an API endpoint or dashboard that lists products
  await authenticatedPage.goto(`/api/clients/${clientId}/products`);

  // Or extract from the page
  const products = await authenticatedPage.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="product-card"]');
    return Array.from(cards).map((card) => ({
      id: card.getAttribute('data-product-id'),
      name: card.querySelector('[data-testid="product-name"]')?.textContent,
    }));
  });

  console.log('Available products:', products);
});
```

## Setup and Teardown

### Before Testing: Seed the Database

```bash
cd apps/scenergy-visualizer
tsx __tests__/setup/seed-test-data.ts
```

This creates:

- Test clients with IDs
- Test users with authentication
- Products and collections
- Generation flows

### Global Setup (Automatic)

The Playwright global setup automatically:

1. Authenticates all test users
2. Saves authentication state to `.auth/` directory
3. Reuses auth state across tests (fast!)

## Important Notes

### ⚡ Token Efficiency

- **Text extraction** = ~100-500 tokens ✅
- **Full page screenshot** = ~1,000-2,000 tokens ❌
- **Element screenshot** = ~200-500 tokens ⚠️

**Always prefer text extraction over screenshots.**

### 🔒 Authentication

- Authentication state is saved and reused
- No need to log in for every test
- Auth state is stored in `__tests__/.auth/`

### 📦 Test Data

- Test data is idempotent (safe to re-run seed script)
- Client IDs are fixed: `test-client-main`, `test-client-secondary`
- User emails are fixed: `test-main@epox.test`, `test-secondary@epox.test`

### 🎯 Data Test IDs

When adding new components, use data-testid attributes:

```tsx
<div data-testid="config-panel">
  <h2 data-testid="config-panel-heading">Configuration</h2>
  {/* ... */}
</div>
```

This makes it easier to extract state as text.

## Quick Reference

### Available Navigation Methods

```typescript
nav.goToDashboard();
nav.goToProductStudio(productId);
nav.goToProductSettings(productId);
nav.goToCollectionStudio(studioId);
nav.goToClientSettings();
nav.goToGenerationPage();
```

### Available State Extraction Methods

```typescript
nav.getConfigPanelState(selector?)
nav.getGenFlowListState(selector?)
nav.getPageStateSummary()
nav.checkPanelExists(selector)
nav.captureErrors()
```

### Common Selectors

Import from `__tests__/helpers/navigation`:

```typescript
import { SELECTORS } from '../helpers/navigation';

SELECTORS.configPanel;
SELECTORS.genFlowList;
SELECTORS.productCard;
SELECTORS.collectionCard;
SELECTORS.userMenu;
```

## Claude Behavior

When the user asks you to:

1. **Check something in the UI** → Use test-client-main automatically
2. **Navigate somewhere** → Use navigation helpers
3. **Verify a component** → Extract state as text, not screenshot
4. **Test a flow** → Use navigation helpers + error capture
5. **Debug an issue** → Capture errors first (text), screenshot only if necessary

**Remember:** Script-First, Screenshot-Last. Text is cheap, images are expensive.
