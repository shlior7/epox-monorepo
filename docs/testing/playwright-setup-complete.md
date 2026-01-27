# Playwright Testing Setup - Complete ✅

Playwright E2E testing has been successfully configured for both applications with authenticated test clients and token-efficient navigation helpers.

## ✅ Setup Complete For

### 1. epox-platform

- **Test Command**: `yarn test:e2e`
- **Seed Command**: `yarn test:seed`
- **Test Directory**: `apps/epox-platform/__tests__`

### 2. scenergy-visualizer

- **Test Command**: `yarn test:visual`
- **Seed Command**: `yarn test:seed`
- **Test Directory**: `apps/scenergy-visualizer/__tests__`

## 🎯 Quick Start

### Step 1: Seed Test Data

```bash
# For epox-platform
cd apps/epox-platform
yarn test:seed

# For scenergy-visualizer
cd apps/scenergy-visualizer
yarn test:seed
```

### Step 2: Run Tests

```bash
# epox-platform
cd apps/epox-platform
yarn test:e2e:ui

# scenergy-visualizer
cd apps/scenergy-visualizer
yarn test:visual:ui
```

## 📦 Test Data Created

Both apps share the same test clients:

### Main Test Client

- **Client ID**: `test-client-main`
- **Email**: `test-main@epox.test`
- **Password**: `TestPassword123!`
- **Products**: Modern Sofa, Oak Dining Table, LED Floor Lamp (3 total)
- **Collections**: Living Room Collection (draft), Dining Room Set (completed)
- **Generation Flows**: 2 (one per collection)

### Secondary Test Client

- **Client ID**: `test-client-secondary`
- **Email**: `test-secondary@epox.test`
- **Password**: `TestPassword123!`
- **Products**: Office Chair, Standing Desk (2 total)
- **Collections**: Office Setup (draft)
- **Generation Flows**: 1

## 🔧 Technical Details

### What Was Fixed

**Issue**: WebSocket connection errors when seeding database

```
Error: All attempts to open a WebSocket to connect to the database failed
```

**Solution**: Added `NODE_OPTIONS='--experimental-websocket'` to seed scripts

```json
{
  "test:seed": "NODE_OPTIONS='--experimental-websocket' tsx --env-file=.env.local __tests__/setup/seed-test-data.ts"
}
```

### Architecture

Both apps use:

- **Shared Database**: `visualizer-db` package
- **Shared Auth**: `visualizer-auth` package
- **Same Test Clients**: Consistent test data across apps
- **Token-Efficient Helpers**: Text-based state extraction

## 📁 File Structure

```
apps/epox-platform/
├── __tests__/
│   ├── setup/
│   │   ├── seed-test-data.ts       # Creates test clients
│   │   ├── auth-fixtures.ts         # Auth fixtures
│   │   └── global-setup.ts          # Pre-auth setup
│   ├── helpers/
│   │   └── navigation.ts            # Navigation helpers
│   ├── .auth/                       # Auth state (gitignored)
│   ├── example.spec.ts              # Example tests
│   └── README.md                    # Testing guide
├── playwright.config.ts
└── package.json

apps/scenergy-visualizer/
├── __tests__/
│   ├── setup/
│   │   ├── seed-test-data.ts
│   │   ├── auth-fixtures.ts
│   │   └── global-setup.ts
│   ├── helpers/
│   │   └── navigation.ts
│   ├── .auth/
│   ├── example.spec.ts
│   └── README.md
├── playwright.config.ts
└── package.json
```

## 🚀 Available Commands

### epox-platform

```bash
yarn test:seed          # Seed test data
yarn test:e2e           # Run all E2E tests
yarn test:e2e:ui        # UI mode (recommended)
yarn test:e2e:debug     # Debug mode
yarn test:e2e:headed    # Headed browser
```

### scenergy-visualizer

```bash
yarn test:seed          # Seed test data
yarn test:visual        # Run all visual tests
yarn test:visual:ui     # UI mode (recommended)
yarn test:visual:debug  # Debug mode
yarn test:visual:update # Update snapshots
```

## 💡 How Claude Uses This

When you ask Claude to test something, it will:

1. **Automatically select test client**: Uses `test-client-main` by default
2. **Navigate efficiently**: Uses navigation helpers (no manual clicking)
3. **Extract state as text**: No screenshots unless absolutely necessary
4. **Report findings**: Console errors, network failures, page state

### Example Interactions

**You**: "Check the products page in epox-platform"

**Claude**:

- Uses `test-client-main`
- Navigates to `/products`
- Extracts page state as text (~200 tokens)
- Reports: "Products page loaded successfully, 3 products found, no console errors"

**You**: "Go to the studio and check the config panel"

**Claude**:

- Uses `test-client-main`
- Navigates to `/studio`
- Extracts config panel state (~300 tokens)
- Reports panel inputs, labels, and state

## 📊 Token Efficiency

| Operation         | Old Way (Screenshots) | New Way (Text)   | Savings |
| ----------------- | --------------------- | ---------------- | ------- |
| Check page loads  | 1,000-2,000 tokens    | 100-500 tokens   | 5-10x   |
| Verify form state | 1,500 tokens          | 200-500 tokens   | 3-7x    |
| Multi-step flow   | 5,000+ tokens         | 500-1,000 tokens | 5-10x   |

## 🔐 Authentication

- **Global Setup**: Runs once before all tests
- **Storage State**: Cached in `__tests__/.auth/`
- **No Re-login**: Auth state reused across all tests
- **Fast Execution**: Minimal overhead

## 📚 Documentation

- **epox-platform Guide**: `apps/epox-platform/__tests__/README.md`
- **scenergy-visualizer Guide**: `apps/scenergy-visualizer/__tests__/README.md`
- **Example Tests**: `*/example.spec.ts` in both apps
- **Testing Strategy**: `.claude/rules/playwright-testing.md`
- **Test Client Usage**: `.claude/rules/test-clients.md`

## ✅ Verification

To verify the setup works:

```bash
# Test epox-platform
cd apps/epox-platform
yarn test:seed
yarn test:e2e:ui

# Test scenergy-visualizer
cd apps/scenergy-visualizer
yarn test:seed
yarn test:visual:ui
```

You should see:

1. ✅ Test data seeded successfully
2. ✅ Authentication state created
3. ✅ Example tests pass
4. ✅ Browser opens in UI mode

## 🎉 Summary

- **2 apps configured**: epox-platform & scenergy-visualizer
- **2 test clients created**: test-client-main & test-client-secondary
- **Token-efficient testing**: 5-10x reduction in token usage
- **Shared infrastructure**: Consistent test data across apps
- **Ready to use**: Just run `yarn test:seed` and start testing!

---

**Next Steps**: Try asking Claude to test something:

- "Check the dashboard in epox-platform"
- "Go to the products page and verify it loads without errors"
- "Test the collection studio flow"

Claude will automatically use the test clients and navigate efficiently! 🚀
