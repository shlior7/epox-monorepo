# Admin Tests

## Overview

Test suite for epox-admin functionality.

## Test Categories

### 1. Authentication Tests (`auth.test.ts`)
- Admin login with valid/invalid credentials
- Session validation
- Session expiry
- Logout

### 2. API Tests (`api/`)
- Dashboard metrics endpoint
- Client list/detail endpoints
- Client analytics endpoint
- Alerts generation endpoint
- Rate limiting behavior

### 3. E2E Tests (`e2e/`)
- Full admin workflows using Playwright
- Delete client flow with confirmation
- Alert generation and display
- Client search and pagination

## Running Tests

```bash
# Run all admin tests
yarn test __tests__/admin

# Run specific test file
yarn test __tests__/admin/auth.test.ts

# Run with coverage
yarn test:coverage

# Run E2E tests
yarn test:visual
```

## Test Data Setup

Before running tests:

1. Start development server: `yarn dev`
2. Seed test admin user: `tsx scripts/create-admin.ts`
3. Run tests: `yarn test`

## Writing Tests

### API Tests

Use fetch to test API endpoints:

```typescript
import { describe, it, expect } from 'vitest';

describe('GET /api/admin/dashboard', () => {
  it('should return dashboard metrics', async () => {
    const response = await fetch('http://localhost:3000/api/admin/dashboard', {
      headers: {
        Cookie: 'admin_session_token=YOUR_SESSION_TOKEN',
      },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.totalClients).toBeGreaterThanOrEqual(0);
  });
});
```

### E2E Tests

Use Playwright for full browser automation:

```typescript
import { test, expect } from '@playwright/test';

test('admin can delete client', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/admin/login');
  await page.fill('#admin-email', 'admin@epox.test');
  await page.fill('#admin-password', 'password');
  await page.click('button[type="submit"]');

  // Navigate to client
  await page.goto('http://localhost:3000/admin/clients/client-id');

  // Delete client
  await page.click('[data-testid="delete-client-button"]');
  await page.fill('[data-testid="confirm-name-input"]', 'Client Name');
  await page.click('[data-testid="modal-delete-button"]');

  // Verify redirect
  await expect(page).toHaveURL('/admin/clients');
});
```

## TODO

- [ ] Complete auth tests with full login/logout flow
- [ ] Add dashboard API tests
- [ ] Add client management API tests
- [ ] Add analytics API tests
- [ ] Add alerts API tests
- [ ] Add E2E delete client test
- [ ] Add E2E alert generation test
- [ ] Add rate limiting tests
- [ ] Add security tests (XSS, CSRF, SQL injection)
