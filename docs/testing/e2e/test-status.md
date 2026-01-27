# E2E Test Status

## Current State (2026-01-25)

### Test Results
- **22 tests failed**
- **13 tests passed**
- **11 tests skipped**

### Test Database
✅ **Working** - Test database is set up correctly:
- Container: `visualizer-db-test` on port 5434
- Database: `visualizer_test`
- Schema: 27 tables pushed successfully
- Connection string: `postgresql://test:test@localhost:5434/visualizer_test`

### Playwright Configuration
✅ **Fixed** - `playwright.config.ts` updated:
```typescript
webServer: {
  command: 'yarn dev',
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5434/visualizer_test',
  },
}
```

### Test Pattern Fixes
✅ **Fixed** - Converted beforeAll hooks to setup tests:
```typescript
// Old (broken)
test.beforeAll(async ({ authenticatedPage }) => { /* seed */ });

// New (working)
test('setup: seed data', async ({ authenticatedPage }) => { /* seed */ });
```

### Test Client Assignments
✅ **Fixed** - Tests now use appropriate clients:
- image-editor → 'products'
- selection-island → 'products'
- config-panel → 'products'
- store-page → 'store'

## Remaining Issues

### CRITICAL: Better Auth Failure

The dev server authentication is broken. Symptoms:

1. **Signup endpoint returns 500**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/sign-up/email \
     -H 'Content-Type: application/json' \
     -d '{"name":"Test","email":"test@test.com","password":"pass"}'
   # Returns: HTTP 500 with no body
   ```

2. **WebSocket connection errors** (flooding stderr):
   ```
   Error: self-signed certificate
   code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
   _url: 'wss://localhost/v2'
   ```

3. **Server falls back to dev mode**:
   ```
   ⚠️ DEV MODE: Using fallback auth (test-client) in Server Component
   Failed to get server component auth: INTERNAL_SERVER_ERROR
   ```

4. **Pages return 401/500 errors**:
   - 401: UNAUTHORIZED
   - 500: INTERNAL_SERVER_ERROR

### Failed Tests (by category)

**Authentication/Setup (4 tests)**:
- collections/test.spec.ts:51 - setup: seed collections feature data
- products/test.spec.ts:43 - setup: seed products feature data
- collection-page/test.spec.ts:30 - multiple products create collection
- collection-page/test.spec.ts:138 - collection studio has config panel

**Studio/Config Panel (7 tests)**:
- config-panel/test.spec.ts:40 - verify complete config panel structure
- config-panel/test.spec.ts:213 - capture inspire section with products
- config-panel/test.spec.ts:289 - capture inspire section after uploading image
- config-panel/test.spec.ts:441 - verify generate button visibility
- studio-page/test.spec.ts:32 - verify studio page layout
- studio-page/test.spec.ts:156 - verify instant search filters products
- genflow-page/test.spec.ts:30 - single product opens in studio

**Selection/Products (5 tests)**:
- selection-island/test.spec.ts:35 - selection island appears
- selection-island/test.spec.ts:128 - clear selection
- selection-island/test.spec.ts:172 - show selected filters products
- selection-island/test.spec.ts:267 - selection persists during filter changes
- image-editor/test.spec.ts:35 - verify edit overlay appears

**Navigation/UI (6 tests)**:
- home-page/test.spec.ts:31 - verify home page layout
- store-page/test.spec.ts:50 - verify store page layout
- store-page/test.spec.ts:92 - verify store page states
- store-page/test.spec.ts:600 - verify store page in sidebar
- genflow-page/test.spec.ts:121 - generation flow config panel
- genflow-page/test.spec.ts:190 - verify output settings

### Passed Tests (13 tests)
Tests that passed despite auth issues (likely using dev mode fallback):
- home-page: sidebar navigation across pages
- store-page: various skipped tests (store not connected)
- Some store page empty state tests

## Next Steps to Fix

### Option 1: Fix Better Auth (Recommended)

The WebSocket errors suggest Better Auth is trying to connect to an external service. Investigation needed:

1. **Check Better Auth configuration**:
   ```bash
   # Find the visualizer-auth package configuration
   find packages -name "*.ts" -path "*visualizer-auth*" | grep -E "(auth|config)"
   ```

2. **Check environment variables**:
   - Does Better Auth need additional env vars?
   - Is it trying to connect to a cloud service?
   - Are there WebSocket URLs configured?

3. **Check DATABASE_URL propagation**:
   - Verify the dev server actually uses the test DATABASE_URL
   - Add logging to confirm which database it's connecting to
   - Check if `.env.local` is overriding the playwright config

### Option 2: Bypass Better Auth for Tests

Alternative approach if auth can't be fixed quickly:

1. **Create a test-only auth bypass**:
   - Add a `TEST_MODE=true` environment variable
   - Skip Better Auth in test mode
   - Use mock authentication

2. **Update playwright config**:
   ```typescript
   env: {
     DATABASE_URL: 'postgresql://test:test@localhost:5434/visualizer_test',
     TEST_MODE: 'true',  // Add this
   }
   ```

## Investigation Commands

```bash
# Check what DATABASE_URL the dev server is using
lsof -i:3000  # Get PID
ps auxww | grep <PID>  # See full command with env vars

# Test database connection manually
PGPASSWORD=test psql -h localhost -p 5434 -U test -d visualizer_test -c "SELECT COUNT(*) FROM public.user"

# Check Better Auth package
ls packages/visualizer-auth
cat packages/visualizer-auth/package.json

# Check auth configuration
find packages/visualizer-auth -name "*.ts" | xargs grep -l "WebSocket\|wss:"
```

## Files Modified in This Session

1. `playwright.config.ts` - Added DATABASE_URL override
2. `__tests__/e2e/tests/collections/test.spec.ts` - beforeAll → setup test
3. `__tests__/e2e/tests/products/test.spec.ts` - beforeAll → setup test
4. `__tests__/e2e/tests/image-editor/test.spec.ts` - Changed to 'products' client
5. `__tests__/e2e/tests/selection-island/test.spec.ts` - Changed to 'products' client
6. `__tests__/e2e/tests/config-panel/test.spec.ts` - Changed to 'products' client
7. `__tests__/e2e/tests/store-page/test.spec.ts` - Changed to 'store' client
8. `__tests__/e2e/setup/test-clients.ts` - Replaced hello@epox.ai email
9. `__tests__/e2e/helpers/seed-helpers-api.ts` - Created API-based seeding
10. `__tests__/e2e/helpers/schema-tables.ts` - Created local schema definitions
11. `package.json` - Added drizzle-orm, pg, uuid dependencies
12. Test database - Schema pushed (27 tables)
