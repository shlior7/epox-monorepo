# Playwright Test Setup with Authenticated Test Clients

This directory contains the Playwright test setup with pre-configured test clients, authentication fixtures, and navigation helpers for efficient, token-conscious testing.

## Quick Start

### 1. Setup Test Data

First, seed the database with test clients and sample data:

```bash
# From the project root
cd apps/scenergy-visualizer

# Seed test data
tsx __tests__/setup/seed-test-data.ts
```

This creates:

- 2 test clients with authentication
- Multiple products per client
- Collections with generation flows
- Idempotent (safe to run multiple times)

### 2. Run Tests

```bash
# Run all tests
yarn test:visual

# Run in UI mode (recommended for development)
yarn test:visual:ui

# Run in debug mode
yarn test:visual:debug

# Update snapshots
yarn test:visual:update
```

## Architecture

### Directory Structure

```
__tests__/
├── setup/
│   ├── seed-test-data.ts       # Database seeding script
│   ├── auth-fixtures.ts         # Playwright authentication fixtures
│   └── global-setup.ts          # Global test setup (authentication)
├── helpers/
│   └── navigation.ts            # Navigation utilities (text-based)
├── .auth/                       # Authentication state (gitignored)
│   ├── test-client-main.json
│   └── test-client-secondary.json
├── example.spec.ts              # Example test file
└── README.md                    # This file
```

## Test Clients

### Main Test Client

**Use this as your default for most tests.**

- **ID:** `test-client-main`
- **Email:** `test-main@epox.test`
- **Password:** `TestPassword123!`
- **Products:** 3 (Modern Sofa, Oak Dining Table, LED Floor Lamp)
- **Collections:** 2 (Living Room Collection, Dining Room Set)

### Secondary Test Client

**Use this for multi-client scenarios.**

- **ID:** `test-client-secondary`
- **Email:** `test-secondary@epox.test`
- **Password:** `TestPassword123!`
- **Products:** 2 (Office Chair, Standing Desk)
- **Collections:** 1 (Office Setup)

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from './setup/auth-fixtures';
import { createNavigationHelper } from './helpers/navigation';

// Choose test client
test.use({ testClientName: 'main' }); // or 'secondary'

test('my test', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // Your test logic here
  await nav.goToDashboard();
});
```

### Token-Efficient Testing (Important!)

**❌ BAD: High Token Usage**

```typescript
// Taking full-page screenshots = ~1,000-2,000 tokens each
await page.screenshot({ path: 'dashboard.png' });

// Parsing full HTML dumps
const html = await page.content();
```

**✅ GOOD: Low Token Usage**

```typescript
// Extract state as text = ~100-500 tokens
const pageState = await nav.getPageStateSummary();
console.log('Page loaded:', pageState.title);

// Check for errors as text
const errors = await nav.captureErrors();
expect(errors.consoleErrors).toHaveLength(0);

// Get specific element state
const panel = await nav.getConfigPanelState();
console.log('Panel inputs:', panel.state?.inputs);
```

### Navigation Helpers

The `NavigationHelper` class provides efficient, text-based navigation:

```typescript
const nav = createNavigationHelper(page, clientId);

// Navigate to pages
await nav.goToDashboard();
await nav.goToProductStudio(productId);
await nav.goToCollectionStudio(studioId);
await nav.goToClientSettings();

// Extract state (text-only, efficient)
const configPanel = await nav.getConfigPanelState();
const flowList = await nav.getGenFlowListState();
const pageState = await nav.getPageStateSummary();

// Check for errors
const errors = await nav.captureErrors();

// Utility methods
await nav.click(selector);
await nav.fill(selector, value);
const text = await nav.getText(selector);
```

## Authentication

### How It Works

1. **Global Setup** (`global-setup.ts`):
   - Runs once before all tests
   - Authenticates each test client
   - Saves auth state to `.auth/*.json`

2. **Test Fixtures** (`auth-fixtures.ts`):
   - Loads saved auth state
   - Provides authenticated `page` and `clientId`
   - No login required per test!

3. **Reusability**:
   - Auth state is reused across tests
   - Fast test execution
   - No repeated login flows

### Re-authenticating

If authentication state becomes stale:

```bash
# Delete auth state
rm -rf __tests__/.auth

# Re-run tests (global setup will re-authenticate)
yarn test:visual
```

## Common Patterns

### Pattern 1: Check Page Loads Without Errors

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

### Pattern 2: Verify Component State

```typescript
test('config panel has correct structure', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  await nav.goToDashboard();

  const panel = await nav.getConfigPanelState();

  expect(panel.exists).toBe(true);
  expect(panel.state?.inputs).toBeDefined();
  expect(panel.state?.labels).toContain('Configuration');
});
```

### Pattern 3: Multi-Step User Flow

```typescript
test('user can navigate through app', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);
  const errors = await nav.captureErrors();

  // Step 1
  await nav.goToDashboard();
  let state = await nav.getPageStateSummary();
  expect(state.errorMessages).toHaveLength(0);

  // Step 2
  await nav.goToClientSettings();
  state = await nav.getPageStateSummary();
  expect(state.errorMessages).toHaveLength(0);

  // Verify no errors
  expect(errors.consoleErrors).toHaveLength(0);
});
```

### Pattern 4: Compare Multiple Clients

```typescript
test('both clients can access dashboard', async () => {
  for (const clientName of ['main', 'secondary'] as const) {
    test.use({ testClientName: clientName });

    await test.step(`Test ${clientName} client`, async ({ authenticatedPage, clientId }) => {
      const nav = createNavigationHelper(authenticatedPage, clientId);
      await nav.goToDashboard();

      const state = await nav.getPageStateSummary();
      expect(state.url).toContain(clientId);
    });
  }
});
```

## Selectors

Use predefined selectors from `helpers/navigation.ts`:

```typescript
import { SELECTORS } from './helpers/navigation';

await nav.checkPanelExists(SELECTORS.configPanel);
await nav.checkPanelExists(SELECTORS.genFlowList);
await nav.checkPanelExists(SELECTORS.productCard);
```

**Add data-testid attributes to your components:**

```tsx
<div data-testid="config-panel">
  <h2 data-testid="config-panel-heading">Config</h2>
</div>
```

## Debugging

### View Test Report

```bash
yarn test:visual
npx playwright show-report
```

### Run in UI Mode

```bash
yarn test:visual:ui
```

### Debug Mode

```bash
yarn test:visual:debug
```

### Check Auth State

```bash
cat __tests__/.auth/test-client-main.json
```

## Token Usage Guide

| Action               | Token Cost   | Use When                   |
| -------------------- | ------------ | -------------------------- |
| Text extraction      | ~100-500     | Always (default)           |
| Element screenshot   | ~200-500     | Visual verification needed |
| Full page screenshot | ~1,000-2,000 | Avoid if possible          |
| HTML dump            | ~500-1,500   | Avoid if possible          |

**Golden Rule:** Script-First, Screenshot-Last.

## Maintenance

### Update Test Data

```bash
# Re-seed database
tsx __tests__/setup/seed-test-data.ts
```

### Clear Auth State

```bash
rm -rf __tests__/.auth
```

### Add New Test Client

1. Edit `__tests__/setup/seed-test-data.ts`:

   ```typescript
   const TEST_CLIENTS = [
     // ... existing clients
     {
       id: 'test-client-new',
       name: 'Test Client - New',
       // ... other properties
     },
   ];
   ```

2. Update `__tests__/setup/auth-fixtures.ts`:

   ```typescript
   const TEST_CLIENT_MAP = {
     // ... existing clients
     new: {
       id: TEST_CLIENTS[2].id,
       // ... other properties
     },
   };
   ```

3. Re-seed: `tsx __tests__/setup/seed-test-data.ts`

## CI/CD

The setup is CI-friendly:

- Idempotent seeding
- Fast auth reuse
- Configurable workers
- Automatic retries on failure

Example CI workflow:

```yaml
- name: Seed test data
  run: |
    cd apps/scenergy-visualizer
    tsx __tests__/setup/seed-test-data.ts

- name: Run Playwright tests
  run: yarn test:visual
```

## Troubleshooting

### "Authentication failed"

- Check if server is running on `http://localhost:3000`
- Verify test data was seeded: `tsx __tests__/setup/seed-test-data.ts`
- Clear auth state: `rm -rf __tests__/.auth`

### "Cannot find test data"

- Re-seed database: `tsx __tests__/setup/seed-test-data.ts`
- Check DATABASE_URL environment variable

### "Tests are slow"

- Ensure auth state is being reused (check `.auth/` directory)
- Use text extraction instead of screenshots
- Run tests in parallel: `yarn test:visual --workers=4`

## Examples

See `__tests__/example.spec.ts` for comprehensive examples of:

- Using authenticated fixtures
- Navigation helpers
- Text-based state extraction
- Error capturing
- Multi-client testing

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Project Testing Rule](./.claude/rules/playwright-testing.md)
- [Test Client Usage Guide](./.claude/rules/test-clients.md)
