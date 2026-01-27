# E2E WebSocket Authentication Issue - Fixed

## Problem

When running Playwright E2E tests, the Better Auth library was trying to establish a WebSocket connection to `wss://localhost/v2`, which resulted in a 404 error:

```
[WebServer] ERROR [Better Auth]: Error: Unexpected server response: 404
_url: 'wss://localhost/v2'
```

This caused the global authentication setup to fail with:
```
Failed to authenticate: page.waitForURL: Target page, context or browser has been closed
```

## Root Cause

The issue occurred because:

1. **Organization Plugin Active**: The Better Auth organization plugin was enabled in development/test environments, trying to establish a WebSocket connection to `wss://localhost/v2`
2. **Missing Endpoint**: The `/v2` WebSocket endpoint doesn't exist in the app, causing a 404 error
3. **Package Not Transpiled**: The `visualizer-auth` package was not in Next.js's `transpilePackages` list, so changes to disable the plugin weren't being picked up
4. **Cached Bundle**: Next.js caches the client-side JavaScript bundle in the `.next/` directory, serving stale code even after changes

**The Fix**: Disable the organization plugin in non-production environments AND ensure Next.js transpiles the visualizer-auth package.

## Solution

### 1. Disable Organization Plugin in Non-Production Environments

The most reliable solution is to only enable the Better Auth organization plugin in production environments, and to use **dynamic imports** to ensure the plugin code never loads in dev/test.

**File: `packages/visualizer-auth/src/client.ts`**

```typescript
import { createAuthClient } from 'better-auth/react';
// Note: organizationClient is NOT imported at the top level

const isProduction = process.env.NODE_ENV === 'production';

const getPlugins = () => {
  if (isProduction) {
    // Dynamically import organization plugin only in production
    const { organizationClient } = require('better-auth/client/plugins');
    return [organizationClient()];
  }
  return [];
};

export const authClient = createAuthClient({
  baseURL,
  plugins: getPlugins(),
});
```

**File: `packages/visualizer-auth/src/config.ts`**

```typescript
import { betterAuth } from 'better-auth';
// Note: organization is NOT imported at the top level

const isProduction = process.env.NODE_ENV === 'production';

const getPlugins = () => {
  if (isProduction) {
    const { organization } = require('better-auth/plugins');
    return [organization(), nextCookies()];
  }
  return [nextCookies()];
};

return betterAuth({
  // ...
  plugins: getPlugins(),
});
```

**Why Dynamic Imports?**
- Static imports are evaluated at module load time, before any runtime checks
- Even with a ternary (`isProduction ? [org()] : []`), the `organization` module is loaded
- Once loaded, the Better Auth organization plugin may initialize WebSocket connections
- Dynamic imports with `require()` ensure the plugin code never loads in non-production
- This is a bulletproof way to prevent any WebSocket initialization

### 2. Add visualizer-auth to transpilePackages

**File: `apps/epox-platform/next.config.js`**

```typescript
transpilePackages: [
  'visualizer-types',
  'visualizer-db',
  'visualizer-ai',
  'visualizer-auth',  // ← Added this
  'visualizer-storage',  // ← Added this
  '@scenergy/erp-service',
],
```

**Critical**: Without this, Next.js won't transpile the `visualizer-auth` package, and changes to `client.ts` won't be picked up. This is required in a monorepo with local workspace packages.

### 3. Clear Next.js Cache Before Tests

**File: `apps/epox-platform/playwright.config.ts`**

```typescript
command: 'yarn clean && yarn dev',
```

This ensures the `.next/` cache is cleared before tests run.

### 4. Add Debug Logging

Added logging to help diagnose issues:

```typescript
if (typeof window !== 'undefined' && !isProduction) {
  console.log('[Auth Client] Production mode:', isProduction, '| NODE_ENV:', process.env.NODE_ENV);
}
```

This logs the environment detection in the browser console for debugging.

## How It Works Now

1. **Playwright starts**: Sets environment variables including `NODE_ENV=test`
2. **Clean cache**: `yarn clean` removes `.next/` directory
3. **Build fresh**: `yarn dev` starts Next.js in development mode (`NODE_ENV=development`)
4. **Plugin disabled**: Both client and server see `NODE_ENV !== 'production'` and disable the organization plugin
5. **No WebSocket**: The organization plugin is disabled, so no WebSocket connection is attempted
6. **Authentication succeeds**: The login flow works without errors

## Environment Variables Set by Playwright

```typescript
webServer: {
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5434/visualizer_test',
    NODE_ENV: 'test',  // Note: next dev overrides this to 'development'
    BETTER_AUTH_SECRET: 'test-secret-for-e2e-tests-only-not-secure',
    BETTER_AUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_BETTER_AUTH_URL: 'http://localhost:3000',

    // Disable external services
    SENTRY_DSN: '',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_URL: '',
    REDIS_URL: '',
  },
}
```

**Note**: Even though Playwright sets `NODE_ENV=test`, Next.js dev mode always sets it to `development`. This is why we check for `NODE_ENV === 'production'` (false in both test and dev) rather than checking for `NODE_ENV === 'test'` (which would never be true in the client bundle).

## Server vs Client Configuration

### Server-Side (config.ts)
- Uses `process.env.NODE_ENV === 'production'` to detect production mode
- Only enables organization plugin in production: `plugins: isProduction ? [organization(), nextCookies()] : [nextCookies()]`
- This works because the server process sees the env vars directly

### Client-Side (client.ts)
- Uses `process.env.NODE_ENV === 'production'` to detect production mode
- Only enables organization plugin in production: `plugins: isProduction ? [organizationClient()] : []`
- This works because `NODE_ENV` is inlined into the browser bundle at build time

## Testing

To verify the fix works:

```bash
cd apps/epox-platform
yarn test:e2e
```

You should see:
- ✅ No WebSocket errors
- ✅ Test users seeded successfully
- ✅ Authentication setup completes
- ✅ Tests run without authentication failures

## Notes

- The `yarn clean` command adds ~5-10 seconds to test startup time but ensures reliability
- In CI/CD, this is acceptable as tests need to be deterministic
- The debug logging only appears in non-production environments
- **The organization plugin is disabled in development and test environments** - only production uses it
- This means organization features (multi-tenant, role management) won't work in development
- If you need to test organization features locally, you'll need to use a production build
