# Design Log #012: Testing Plan

**Status**: Active
**Created**: 2026-01-18
**Author**: Claude
**Related**: Design Log #007 (API Design), Design Log #004 (User Flows), What's Missing Plan

---

## Overview

Comprehensive testing strategy covering unit, integration, and E2E tests for all epox-platform functionality. Tests are organized by feature area and test type.

### Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration test runner |
| **@testing-library/react** | React component testing |
| **Playwright** | E2E browser testing |
| **MSW (Mock Service Worker)** | API mocking for integration tests |
| **Testcontainers** | Database integration tests |

### Test Categories

| Type | Scope | Speed | Coverage Target |
|------|-------|-------|-----------------|
| **Unit** | Single function/component | <50ms each | 80%+ |
| **Integration** | API routes, DB queries, service interactions | <500ms each | 70%+ |
| **E2E** | Full user flows | <30s each | Critical paths |

---

## Epic 1: Authentication & Authorization Tests

### Unit Tests

#### 1.1 Auth Utilities (`lib/auth/`)

```typescript
// tests/unit/auth/session.test.ts
describe('Session Utilities', () => {
  describe('validateSession', () => {
    it('should return user when session is valid');
    it('should return null when session is expired');
    it('should return null when token is malformed');
  });

  describe('generateToken', () => {
    it('should create JWT with correct claims');
    it('should set expiration based on rememberMe flag');
  });
});

// tests/unit/auth/permissions.test.ts
describe('Permission Checks', () => {
  describe('canEditProducts', () => {
    it('should allow owner role');
    it('should allow editor role');
    it('should deny viewer role');
  });

  describe('canManageMembers', () => {
    it('should only allow owner role');
  });

  describe('isResourceOwner', () => {
    it('should match clientId with resource');
    it('should deny cross-client access');
  });
});
```

### Integration Tests

#### 1.2 Auth API Routes

```typescript
// tests/api/auth.test.ts
describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should return 200 with valid credentials');
    it('should return 401 with invalid password');
    it('should return 401 with non-existent email');
    it('should return 422 with missing email');
    it('should return session token in response');
    it('should set secure cookie');
  });

  describe('POST /api/auth/signup', () => {
    it('should create user with valid invitation token');
    it('should return 400 with expired token');
    it('should return 409 if email already exists');
    it('should hash password before storing');
    it('should link user to correct client');
  });

  describe('POST /api/auth/logout', () => {
    it('should invalidate session');
    it('should clear auth cookie');
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with client info');
    it('should return 401 without session');
    it('should include member role');
  });

  describe('POST /api/auth/password-reset/request', () => {
    it('should send reset email for existing user');
    it('should return 200 even for non-existent email (security)');
    it('should create reset token with expiration');
  });

  describe('POST /api/auth/password-reset/confirm', () => {
    it('should update password with valid token');
    it('should return 400 with expired token');
    it('should invalidate token after use');
  });
});
```

### E2E Tests

#### 1.3 Login Flow

```typescript
// tests/e2e/auth/login.spec.ts
describe('Login Flow', () => {
  it('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'ValidPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  it('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  it('should redirect authenticated users away from login page', async ({ page }) => {
    // Login first
    await loginAs(page, 'test@example.com');
    await page.goto('/login');
    await expect(page).toHaveURL('/dashboard');
  });

  it('should persist session after page refresh', async ({ page }) => {
    await loginAs(page, 'test@example.com');
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
  });
});
```

---

## Epic 2: Product Management Tests

### Unit Tests

#### 2.1 Product Utilities

```typescript
// tests/unit/products/validation.test.ts
describe('Product Validation', () => {
  describe('validateProductData', () => {
    it('should accept valid product with all fields');
    it('should accept product without optional fields');
    it('should reject empty name');
    it('should reject name over 255 characters');
    it('should reject negative price');
    it('should validate SKU format');
  });

  describe('parseCSVRow', () => {
    it('should parse standard CSV columns');
    it('should handle quoted values with commas');
    it('should trim whitespace');
    it('should convert empty strings to null');
  });
});

// tests/unit/products/analysis.test.ts
describe('Product Analysis', () => {
  describe('extractProductFeatures', () => {
    it('should extract colors from description');
    it('should identify material types');
    it('should detect furniture category');
    it('should handle empty descriptions');
  });

  describe('generateSearchKeywords', () => {
    it('should include name tokens');
    it('should include category');
    it('should normalize casing');
    it('should deduplicate keywords');
  });
});
```

### Integration Tests

#### 2.2 Products API

```typescript
// tests/api/products.test.ts
describe('Products API', () => {
  describe('GET /api/products', () => {
    it('should return paginated products for client');
    it('should filter by category');
    it('should filter by search term');
    it('should sort by name, createdAt, or price');
    it('should include image counts');
    it('should not return products from other clients');
  });

  describe('POST /api/products', () => {
    it('should create product with valid data');
    it('should return 400 for invalid data');
    it('should auto-analyze product on creation');
    it('should handle image upload');
    it('should set source as "uploaded"');
  });

  describe('GET /api/products/[id]', () => {
    it('should return product with full details');
    it('should include analysis data');
    it('should return 404 for non-existent product');
    it('should return 403 for other client product');
  });

  describe('PATCH /api/products/[id]', () => {
    it('should update product name');
    it('should update product category');
    it('should update product images');
    it('should re-analyze on significant changes');
    it('should return 404 for non-existent product');
  });

  describe('DELETE /api/products/[id]', () => {
    it('should delete product');
    it('should cascade delete related assets');
    it('should return 404 for non-existent product');
  });
});

// tests/api/products-import.test.ts
describe('Product Import API', () => {
  describe('POST /api/import/csv', () => {
    it('should parse and import valid CSV');
    it('should download images from URLs');
    it('should handle missing images gracefully');
    it('should report validation errors per row');
    it('should return import summary');
    it('should respect product limit');
  });

  describe('POST /api/import/store', () => {
    it('should fetch products from connected store');
    it('should map store categories to local categories');
    it('should preserve store product IDs');
    it('should handle store API rate limits');
    it('should create import job for large imports');
  });
});
```

### E2E Tests

#### 2.3 Product Management Flows

```typescript
// tests/e2e/products/crud.spec.ts
describe('Product Management', () => {
  it('should add product manually', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/products');
    await page.click('[data-testid="add-product-btn"]');

    await page.fill('[name="name"]', 'Modern Sofa');
    await page.fill('[name="description"]', 'A beautiful modern sofa');
    await page.fill('[name="price"]', '999.99');
    await page.setInputFiles('[data-testid="image-upload"]', 'fixtures/sofa.jpg');

    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="toast"]')).toContainText('Product created');
    await expect(page.locator('[data-testid="product-card"]')).toContainText('Modern Sofa');
  });

  it('should import products from CSV', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/products/import');

    await page.click('[data-testid="csv-import-tab"]');
    await page.setInputFiles('[data-testid="csv-upload"]', 'fixtures/products.csv');

    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();
    await page.click('[data-testid="confirm-import-btn"]');

    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    await page.waitForSelector('[data-testid="import-complete"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('10 products imported');
  });

  it('should search and filter products', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/products');

    await page.fill('[data-testid="search-input"]', 'sofa');
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(3);

    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-living-room"]');
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(2);
  });

  it('should edit product details', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/products');

    await page.click('[data-testid="product-card"]:first-child');
    await page.click('[data-testid="edit-btn"]');

    await page.fill('[name="name"]', 'Updated Product Name');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('Product updated');
  });

  it('should delete product with confirmation', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/products');

    const productCount = await page.locator('[data-testid="product-card"]').count();

    await page.click('[data-testid="product-card"]:first-child');
    await page.click('[data-testid="delete-btn"]');
    await page.click('[data-testid="confirm-delete-btn"]');

    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(productCount - 1);
  });
});
```

---

## Epic 3: Collection & Generation Tests

### Unit Tests

#### 3.1 Collection Utilities

```typescript
// tests/unit/collections/validation.test.ts
describe('Collection Validation', () => {
  describe('validateCollectionData', () => {
    it('should accept valid collection with products');
    it('should reject empty name');
    it('should reject empty productIds array');
    it('should reject non-string productIds');
    it('should validate status transitions');
  });

  describe('calculateCollectionStats', () => {
    it('should count products');
    it('should count total images');
    it('should count approved images');
    it('should count synced images');
  });
});

// tests/unit/generation/prompt-builder.test.ts
describe('Prompt Builder', () => {
  describe('buildGenerationPrompt', () => {
    it('should include product description');
    it('should include scene type');
    it('should include mood/lighting');
    it('should include style preferences');
    it('should handle missing optional fields');
    it('should truncate long descriptions');
  });

  describe('buildAnalysisPrompt', () => {
    it('should request color extraction');
    it('should request material identification');
    it('should request style categorization');
  });
});
```

### Integration Tests

#### 3.2 Collections API

```typescript
// tests/api/collections.test.ts
describe('Collections API', () => {
  describe('GET /api/collections', () => {
    it('should return paginated collections');
    it('should filter by status');
    it('should search by name');
    it('should include product counts');
    it('should include image counts');
  });

  describe('POST /api/collections', () => {
    it('should create collection with products');
    it('should validate product IDs exist');
    it('should set initial status to draft');
    it('should reject duplicate collection names');
  });

  describe('GET /api/collections/[id]', () => {
    it('should return collection with full details');
    it('should include products with images');
    it('should include generation settings');
  });

  describe('PATCH /api/collections/[id]', () => {
    it('should update collection name');
    it('should update product selection');
    it('should update generation settings');
    it('should validate status transitions');
  });

  describe('DELETE /api/collections/[id]', () => {
    it('should delete collection');
    it('should cascade delete generation jobs');
    it('should cascade delete generated assets');
  });
});

// tests/api/generation.test.ts
describe('Generation API', () => {
  describe('POST /api/collections/[id]/generate', () => {
    it('should create generation jobs for all products');
    it('should deduct credits for job count');
    it('should return 402 when insufficient credits');
    it('should update collection status to generating');
    it('should return job IDs for tracking');
  });

  describe('GET /api/collections/[id]/progress', () => {
    it('should return generation progress');
    it('should include per-product status');
    it('should include completed image count');
    it('should include failed count');
  });

  describe('POST /api/generate/single', () => {
    it('should generate single image');
    it('should deduct 1 credit');
    it('should return generated image URL');
    it('should support custom settings');
  });
});

// tests/api/assets.test.ts
describe('Assets API', () => {
  describe('GET /api/assets', () => {
    it('should return paginated assets');
    it('should filter by collection');
    it('should filter by product');
    it('should filter by status (approved/pending/rejected)');
    it('should include R2 URLs');
  });

  describe('PATCH /api/assets/[id]', () => {
    it('should update asset status');
    it('should allow approve action');
    it('should allow reject action');
    it('should track approval timestamp');
  });

  describe('POST /api/assets/[id]/regenerate', () => {
    it('should create new generation job');
    it('should deduct 1 credit');
    it('should link to original asset');
  });

  describe('DELETE /api/assets/[id]', () => {
    it('should delete asset');
    it('should remove from R2 storage');
    it('should update collection stats');
  });

  describe('GET /api/assets/[id]/download', () => {
    it('should return signed URL');
    it('should support multiple formats (jpg, png, webp)');
    it('should support multiple sizes');
  });
});
```

### E2E Tests

#### 3.3 Collection Creation Flow

```typescript
// tests/e2e/collections/create.spec.ts
describe('Collection Creation Wizard', () => {
  it('should complete full collection creation flow', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/new');

    // Step 1: Select Products
    await expect(page.locator('[data-testid="step-1"]')).toBeVisible();
    await page.click('[data-testid="product-checkbox"]:nth-child(1)');
    await page.click('[data-testid="product-checkbox"]:nth-child(2)');
    await page.click('[data-testid="next-btn"]');

    // Step 2: Configure Settings
    await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    await page.fill('[name="name"]', 'Living Room Collection');
    await page.selectOption('[name="sceneType"]', 'living-room');
    await page.selectOption('[name="mood"]', 'cozy');
    await page.click('[data-testid="next-btn"]');

    // Step 3: Review & Create
    await expect(page.locator('[data-testid="step-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="summary"]')).toContainText('2 products');
    await page.click('[data-testid="create-btn"]');

    await expect(page).toHaveURL(/\/collections\/[a-z0-9-]+/);
    await expect(page.locator('[data-testid="toast"]')).toContainText('Collection created');
  });

  it('should save draft and resume later', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/new');

    await page.click('[data-testid="product-checkbox"]:first-child');
    await page.click('[data-testid="next-btn"]');
    await page.fill('[name="name"]', 'Draft Collection');

    // Navigate away
    await page.goto('/products');

    // Return to drafts
    await page.goto('/collections?status=draft');
    await expect(page.locator('[data-testid="collection-card"]')).toContainText('Draft Collection');
  });
});

// tests/e2e/collections/generate.spec.ts
describe('Generation Flow', () => {
  it('should start generation and track progress', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/test-collection-id');

    await page.click('[data-testid="generate-btn"]');
    await page.click('[data-testid="confirm-generate-btn"]');

    // Progress tracking
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', /\d+/);

    // Wait for completion (with timeout)
    await page.waitForSelector('[data-testid="generation-complete"]', { timeout: 120000 });
    await expect(page.locator('[data-testid="generated-images"]')).toHaveCount(10);
  });

  it('should handle generation failure gracefully', async ({ page }) => {
    // Mock generation to fail
    await page.route('**/api/collections/*/generate', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Generation failed' }) });
    });

    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/test-collection-id');

    await page.click('[data-testid="generate-btn"]');
    await page.click('[data-testid="confirm-generate-btn"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Generation failed');
    await expect(page.locator('[data-testid="credit-refund-notice"]')).toBeVisible();
  });

  it('should block generation when no credits', async ({ page }) => {
    // Mock zero credits
    await page.route('**/api/credits', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ balance: 0 }) });
    });

    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/test-collection-id');

    await page.click('[data-testid="generate-btn"]');

    await expect(page.locator('[data-testid="no-credits-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-btn"]')).toBeVisible();
  });
});

// tests/e2e/collections/review.spec.ts
describe('Asset Review Flow', () => {
  it('should approve and reject assets', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/test-collection-id/review');

    // Approve first asset
    await page.click('[data-testid="asset-card"]:first-child [data-testid="approve-btn"]');
    await expect(page.locator('[data-testid="asset-card"]:first-child')).toHaveAttribute('data-status', 'approved');

    // Reject second asset
    await page.click('[data-testid="asset-card"]:nth-child(2) [data-testid="reject-btn"]');
    await expect(page.locator('[data-testid="asset-card"]:nth-child(2)')).toHaveAttribute('data-status', 'rejected');

    // Verify counts update
    await expect(page.locator('[data-testid="approved-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="rejected-count"]')).toContainText('1');
  });

  it('should regenerate asset', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/test-collection-id/review');

    await page.click('[data-testid="asset-card"]:first-child [data-testid="regenerate-btn"]');
    await expect(page.locator('[data-testid="regenerating-indicator"]')).toBeVisible();

    // New asset appears after regeneration
    await page.waitForSelector('[data-testid="new-asset-badge"]');
  });

  it('should bulk approve all pending', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/collections/test-collection-id/review');

    await page.click('[data-testid="bulk-actions-btn"]');
    await page.click('[data-testid="approve-all-btn"]');
    await page.click('[data-testid="confirm-bulk-action-btn"]');

    await expect(page.locator('[data-testid="pending-count"]')).toContainText('0');
  });
});
```

---

## Epic 4: Store Connection & Sync Tests

### Unit Tests

#### 4.1 Store Integration Utilities

```typescript
// tests/unit/store/woocommerce.test.ts
describe('WooCommerce Integration', () => {
  describe('mapWooCommerceProduct', () => {
    it('should map standard product fields');
    it('should extract images from gallery');
    it('should handle variable products');
    it('should preserve category hierarchy');
    it('should handle missing optional fields');
  });

  describe('buildWooCommerceRequest', () => {
    it('should sign request with consumer key/secret');
    it('should handle pagination parameters');
    it('should build correct URL structure');
  });
});

// tests/unit/store/shopify.test.ts
describe('Shopify Integration', () => {
  describe('mapShopifyProduct', () => {
    it('should map product fields');
    it('should extract variant images');
    it('should map collections to categories');
  });

  describe('buildShopifyHeaders', () => {
    it('should include access token');
    it('should set API version header');
  });
});

// tests/unit/store/sync.test.ts
describe('Sync Utilities', () => {
  describe('determineSyncAction', () => {
    it('should return "add" for new approved assets');
    it('should return "remove" for unapproved synced assets');
    it('should return "skip" for already synced');
  });

  describe('buildSyncPayload', () => {
    it('should include image data');
    it('should include position information');
    it('should format for store API');
  });
});
```

### Integration Tests

#### 4.2 Store Connection API

```typescript
// tests/api/store-connection.test.ts
describe('Store Connection API', () => {
  describe('POST /api/store/connect', () => {
    it('should connect WooCommerce store with valid credentials');
    it('should return 400 for invalid credentials');
    it('should encrypt and store credentials');
    it('should test connection before saving');
  });

  describe('GET /api/store/status', () => {
    it('should return connection status');
    it('should include last sync time');
    it('should include product count in store');
  });

  describe('DELETE /api/store/disconnect', () => {
    it('should remove store connection');
    it('should clear stored credentials');
    it('should mark imported products as disconnected');
  });

  describe('POST /api/store/test', () => {
    it('should verify credentials work');
    it('should return store name and product count');
    it('should not save credentials');
  });
});

// tests/api/store-sync.test.ts
describe('Store Sync API', () => {
  describe('GET /api/store/products', () => {
    it('should return products with sync status');
    it('should include generated asset counts');
    it('should include approved/synced counts');
  });

  describe('POST /api/store/sync', () => {
    it('should sync approved assets to store');
    it('should track synced asset IDs');
    it('should handle rate limits');
    it('should report sync results');
  });

  describe('DELETE /api/store/sync/[assetId]', () => {
    it('should remove image from store');
    it('should update synced_asset status');
    it('should only allow removing platform-synced images');
  });

  describe('GET /api/store/sync/history', () => {
    it('should return sync history');
    it('should include success/failure status');
    it('should include timestamps');
  });
});
```

### E2E Tests

#### 4.3 Store Connection Flow

```typescript
// tests/e2e/store/connect.spec.ts
describe('Store Connection', () => {
  it('should connect WooCommerce store', async ({ page }) => {
    await loginAs(page, 'owner@example.com');
    await page.goto('/settings/store');

    await page.click('[data-testid="connect-store-btn"]');
    await page.click('[data-testid="woocommerce-option"]');

    await page.fill('[name="storeUrl"]', 'https://test-store.com');
    await page.fill('[name="consumerKey"]', 'ck_test_key');
    await page.fill('[name="consumerSecret"]', 'cs_test_secret');

    await page.click('[data-testid="test-connection-btn"]');
    await expect(page.locator('[data-testid="connection-success"]')).toBeVisible();

    await page.click('[data-testid="save-connection-btn"]');
    await expect(page.locator('[data-testid="toast"]')).toContainText('Store connected');
  });

  it('should show error for invalid credentials', async ({ page }) => {
    await loginAs(page, 'owner@example.com');
    await page.goto('/settings/store');

    await page.click('[data-testid="connect-store-btn"]');
    await page.click('[data-testid="woocommerce-option"]');

    await page.fill('[name="storeUrl"]', 'https://invalid-store.com');
    await page.fill('[name="consumerKey"]', 'invalid_key');
    await page.fill('[name="consumerSecret"]', 'invalid_secret');

    await page.click('[data-testid="test-connection-btn"]');
    await expect(page.locator('[data-testid="connection-error"]')).toContainText('Invalid credentials');
  });
});

// tests/e2e/store/import.spec.ts
describe('Store Import', () => {
  it('should import products from connected store', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/products/import');

    await page.click('[data-testid="store-import-tab"]');

    // Select import method
    await page.click('[data-testid="import-by-category"]');
    await page.click('[data-testid="category-furniture"]');

    await expect(page.locator('[data-testid="product-count"]')).toContainText('25 products');

    await page.click('[data-testid="import-btn"]');

    await page.waitForSelector('[data-testid="import-complete"]', { timeout: 60000 });
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('25 products imported');
  });
});

// tests/e2e/store/sync.spec.ts
describe('Store Sync', () => {
  it('should sync approved images to store', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/store');

    await expect(page.locator('[data-testid="pending-sync-count"]')).toContainText('5');

    await page.click('[data-testid="sync-all-btn"]');
    await page.click('[data-testid="confirm-sync-btn"]');

    await page.waitForSelector('[data-testid="sync-complete"]');
    await expect(page.locator('[data-testid="synced-count"]')).toContainText('5');
  });

  it('should remove synced image from store', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/store');

    await page.click('[data-testid="product-row"]:first-child');
    await page.click('[data-testid="synced-image"]:first-child [data-testid="remove-btn"]');
    await page.click('[data-testid="confirm-remove-btn"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('Image removed from store');
  });
});
```

---

## Epic 5: Credit & Billing Tests

### Unit Tests

#### 5.1 Credit Utilities

```typescript
// tests/unit/credits/balance.test.ts
describe('Credit Balance', () => {
  describe('calculateNewBalance', () => {
    it('should add credits correctly');
    it('should subtract credits correctly');
    it('should prevent negative balance');
  });

  describe('validateCreditTransaction', () => {
    it('should accept valid generation deduction');
    it('should accept valid purchase addition');
    it('should accept valid refund');
    it('should require reason for admin adjustment');
  });
});

// tests/unit/credits/subscription.test.ts
describe('Subscription Utilities', () => {
  describe('calculateSubscriptionCredits', () => {
    it('should return correct credits for each tier');
    it('should prorate for mid-cycle upgrade');
  });

  describe('isSubscriptionActive', () => {
    it('should return true for active subscription');
    it('should return false for cancelled subscription');
    it('should return false for past_due subscription');
  });
});
```

### Integration Tests

#### 5.2 Credits API

```typescript
// tests/api/credits.test.ts
describe('Credits API', () => {
  describe('GET /api/credits', () => {
    it('should return current balance');
    it('should include subscription info');
    it('should include credits used this period');
  });

  describe('GET /api/credits/transactions', () => {
    it('should return transaction history');
    it('should paginate results');
    it('should filter by type');
    it('should filter by date range');
  });

  describe('POST /api/credits/purchase', () => {
    it('should create Stripe checkout session');
    it('should return checkout URL');
    it('should record pending transaction');
  });

  describe('POST /api/credits/webhook (Stripe)', () => {
    it('should verify Stripe signature');
    it('should add credits on successful payment');
    it('should handle subscription renewal');
    it('should handle payment failure');
  });

  describe('POST /api/credits/refund', () => {
    it('should refund credits for failed generation');
    it('should record refund transaction');
    it('should link to failed job');
  });
});

// tests/api/admin/credits.test.ts
describe('Admin Credits API', () => {
  describe('POST /api/admin/credits/add', () => {
    it('should add credits to client');
    it('should require reason');
    it('should record admin transaction');
    it('should require admin role');
  });

  describe('POST /api/admin/credits/adjust', () => {
    it('should adjust balance');
    it('should handle negative adjustments');
    it('should require admin role');
  });
});
```

### E2E Tests

#### 5.3 Credit Flow

```typescript
// tests/e2e/credits/purchase.spec.ts
describe('Credit Purchase', () => {
  it('should purchase credit package', async ({ page }) => {
    await loginAs(page, 'owner@example.com');
    await page.goto('/settings/billing');

    await page.click('[data-testid="buy-credits-btn"]');
    await page.click('[data-testid="package-100-credits"]');
    await page.click('[data-testid="checkout-btn"]');

    // Stripe checkout (mock in test)
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });

  it('should show no credits modal and block generation', async ({ page }) => {
    // Set balance to 0
    await page.route('**/api/credits', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ balance: 0 }) });
    });

    await loginAs(page, 'editor@example.com');
    await page.goto('/studio/test-id');

    await page.click('[data-testid="generate-btn"]');

    await expect(page.locator('[data-testid="no-credits-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="buy-credits-cta"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-cta"]')).toBeVisible();
  });

  it('should show credit deduction after generation', async ({ page }) => {
    await loginAs(page, 'editor@example.com');

    const initialBalance = 50;
    await page.goto('/studio/test-id');

    await page.click('[data-testid="generate-btn"]');
    await page.waitForSelector('[data-testid="generation-complete"]');

    await expect(page.locator('[data-testid="credit-balance"]')).toContainText('49');
  });
});

// tests/e2e/credits/refund.spec.ts
describe('Credit Refund', () => {
  it('should refund credits on generation failure', async ({ page }) => {
    // Mock generation failure
    await page.route('**/api/generate', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'AI service unavailable' }) });
    });

    await loginAs(page, 'editor@example.com');
    await page.goto('/studio/test-id');

    await page.click('[data-testid="generate-btn"]');

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-notice"]')).toContainText('1 credit refunded');
  });
});
```

---

## Epic 6: Edit Suite Tests

### Unit Tests

#### 6.1 Image Processing Utilities

```typescript
// tests/unit/edit/image-utils.test.ts
describe('Image Utilities', () => {
  describe('validateImageDimensions', () => {
    it('should accept images within size limits');
    it('should reject images too large');
    it('should reject images too small');
  });

  describe('calculateAspectRatio', () => {
    it('should return correct ratio for landscape');
    it('should return correct ratio for portrait');
    it('should handle square images');
  });

  describe('generateThumbnail', () => {
    it('should create thumbnail at specified size');
    it('should maintain aspect ratio');
  });
});

// tests/unit/edit/mask.test.ts
describe('Mask Utilities', () => {
  describe('encodeMask', () => {
    it('should encode canvas to base64');
    it('should handle empty mask');
  });

  describe('validateMaskCoverage', () => {
    it('should calculate mask percentage');
    it('should warn if mask too small');
    it('should warn if mask covers entire image');
  });
});
```

### Integration Tests

#### 6.2 Edit API

```typescript
// tests/api/edit.test.ts
describe('Edit API', () => {
  describe('POST /api/edit/remove-background', () => {
    it('should remove background from image');
    it('should return transparent PNG');
    it('should deduct 1 credit');
    it('should handle images with complex edges');
  });

  describe('POST /api/edit/upscale', () => {
    it('should upscale to 2K');
    it('should upscale to 4K');
    it('should deduct correct credits (1 for 2K, 2 for 4K)');
    it('should preserve image quality');
  });

  describe('POST /api/edit/inpaint', () => {
    it('should inpaint masked region');
    it('should accept prompt for replacement');
    it('should deduct 1 credit');
    it('should save as new revision');
  });

  describe('POST /api/edit/crop', () => {
    it('should crop to specified dimensions');
    it('should handle aspect ratio presets');
    it('should not deduct credits (client-side operation)');
  });

  describe('POST /api/edit/prompt', () => {
    it('should apply prompt-based edit');
    it('should return edited image');
    it('should deduct 1 credit');
  });
});
```

### E2E Tests

#### 6.3 Edit Flow

```typescript
// tests/e2e/edit/suite.spec.ts
describe('Edit Suite', () => {
  it('should remove background', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/assets/test-asset-id/edit');

    await page.click('[data-testid="remove-bg-btn"]');
    await page.waitForSelector('[data-testid="bg-removed-preview"]');

    await page.click('[data-testid="save-btn"]');
    await expect(page.locator('[data-testid="toast"]')).toContainText('Background removed');
  });

  it('should use inpainting tool', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/assets/test-asset-id/edit');

    await page.click('[data-testid="inpaint-btn"]');

    // Draw mask on canvas
    const canvas = page.locator('[data-testid="mask-canvas"]');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await page.mouse.move(200, 200);
    await page.mouse.up();

    await page.fill('[data-testid="inpaint-prompt"]', 'Add a small plant');
    await page.click('[data-testid="apply-inpaint-btn"]');

    await page.waitForSelector('[data-testid="inpaint-result"]');
    await page.click('[data-testid="accept-btn"]');
  });

  it('should upscale image', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/assets/test-asset-id/edit');

    await page.click('[data-testid="upscale-btn"]');
    await page.click('[data-testid="upscale-4k-option"]');

    await expect(page.locator('[data-testid="credit-cost"]')).toContainText('2 credits');

    await page.click('[data-testid="confirm-upscale-btn"]');
    await page.waitForSelector('[data-testid="upscale-complete"]', { timeout: 30000 });
  });

  it('should crop with aspect ratio preset', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/assets/test-asset-id/edit');

    await page.click('[data-testid="crop-btn"]');
    await page.click('[data-testid="aspect-1-1"]');

    await page.click('[data-testid="apply-crop-btn"]');
    await page.click('[data-testid="save-btn"]');
  });

  it('should apply prompt-based edit', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/assets/test-asset-id/edit');

    await page.click('[data-testid="prompt-edit-btn"]');
    await page.fill('[data-testid="edit-prompt"]', 'Make the lighting warmer');
    await page.click('[data-testid="apply-edit-btn"]');

    await page.waitForSelector('[data-testid="edit-preview"]');

    // Before/after comparison
    await expect(page.locator('[data-testid="before-image"]')).toBeVisible();
    await expect(page.locator('[data-testid="after-image"]')).toBeVisible();

    await page.click('[data-testid="accept-edit-btn"]');
  });
});
```

---

## Epic 7: Presets & Settings Tests

### Unit Tests

#### 7.1 Preset Utilities

```typescript
// tests/unit/presets/validation.test.ts
describe('Preset Validation', () => {
  describe('validatePresetSettings', () => {
    it('should accept valid settings object');
    it('should reject invalid scene type');
    it('should reject invalid mood value');
    it('should handle partial settings');
  });

  describe('mergePresetWithDefaults', () => {
    it('should override defaults with preset values');
    it('should keep defaults for missing preset fields');
  });
});

// tests/unit/presets/memory.test.ts
describe('Settings Memory', () => {
  describe('getSettingsForContext', () => {
    it('should return product-specific settings first');
    it('should fall back to collection settings');
    it('should fall back to category settings');
    it('should fall back to scene type settings');
    it('should return null if no memory');
  });

  describe('saveSettingsForContext', () => {
    it('should save settings with context');
    it('should overwrite existing for same context');
  });
});
```

### Integration Tests

#### 7.2 Presets API

```typescript
// tests/api/presets.test.ts
describe('Presets API', () => {
  describe('GET /api/presets', () => {
    it('should return user presets');
    it('should include thumbnail URLs');
  });

  describe('POST /api/presets', () => {
    it('should create preset with valid settings');
    it('should reject duplicate names');
    it('should save thumbnail from last generation');
  });

  describe('PATCH /api/presets/[id]', () => {
    it('should update preset name');
    it('should update preset settings');
    it('should update default status');
  });

  describe('DELETE /api/presets/[id]', () => {
    it('should delete preset');
    it('should return 404 for non-existent');
  });
});

// tests/api/settings-memory.test.ts
describe('Settings Memory API', () => {
  describe('GET /api/settings-memory', () => {
    it('should return settings for context');
    it('should follow priority chain');
    it('should return null for no memory');
  });

  describe('POST /api/settings-memory', () => {
    it('should save settings for context');
    it('should overwrite existing');
  });
});
```

### E2E Tests

#### 7.3 Preset Flow

```typescript
// tests/e2e/presets/manage.spec.ts
describe('Preset Management', () => {
  it('should save current settings as preset', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/studio/test-id');

    // Configure settings
    await page.selectOption('[name="sceneType"]', 'living-room');
    await page.selectOption('[name="mood"]', 'cozy');
    await page.selectOption('[name="lighting"]', 'warm');

    await page.click('[data-testid="save-preset-btn"]');
    await page.fill('[name="presetName"]', 'Cozy Living Room');
    await page.click('[data-testid="confirm-save-preset-btn"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('Preset saved');
  });

  it('should apply preset to studio settings', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/studio/test-id');

    await page.click('[data-testid="preset-dropdown"]');
    await page.click('[data-testid="preset-cozy-living-room"]');

    await expect(page.locator('[name="sceneType"]')).toHaveValue('living-room');
    await expect(page.locator('[name="mood"]')).toHaveValue('cozy');
    await expect(page.locator('[name="lighting"]')).toHaveValue('warm');
  });

  it('should auto-load remembered settings', async ({ page }) => {
    await loginAs(page, 'editor@example.com');

    // First, generate with settings
    await page.goto('/studio/product-123');
    await page.selectOption('[name="sceneType"]', 'bedroom');
    await page.click('[data-testid="generate-btn"]');
    await page.waitForSelector('[data-testid="generation-complete"]');

    // Navigate away and back
    await page.goto('/products');
    await page.goto('/studio/product-123');

    // Settings should be remembered
    await expect(page.locator('[name="sceneType"]')).toHaveValue('bedroom');
    await expect(page.locator('[data-testid="settings-toast"]')).toContainText('Using your previous settings');
  });
});
```

---

## Epic 8: Notifications Tests

### Unit Tests

#### 8.1 Notification Utilities

```typescript
// tests/unit/notifications/format.test.ts
describe('Notification Formatting', () => {
  describe('formatNotificationMessage', () => {
    it('should format generation complete message');
    it('should format sync complete message');
    it('should format credits low message');
    it('should include thumbnails where applicable');
  });

  describe('groupNotifications', () => {
    it('should group by date');
    it('should sort by most recent first');
  });
});
```

### Integration Tests

#### 8.2 Notifications API

```typescript
// tests/api/notifications.test.ts
describe('Notifications API', () => {
  describe('GET /api/notifications', () => {
    it('should return user notifications');
    it('should paginate results');
    it('should filter by read status');
    it('should include unread count');
  });

  describe('PATCH /api/notifications/[id]/read', () => {
    it('should mark notification as read');
    it('should set read timestamp');
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read');
  });

  describe('GET /api/notifications/preferences', () => {
    it('should return email notification preferences');
  });

  describe('PATCH /api/notifications/preferences', () => {
    it('should update email preferences');
  });
});
```

### E2E Tests

#### 8.3 Notification Flow

```typescript
// tests/e2e/notifications/bell.spec.ts
describe('Notification Bell', () => {
  it('should show unread count', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('3');
  });

  it('should show dropdown with notifications', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/dashboard');

    await page.click('[data-testid="notification-bell"]');

    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(3);
  });

  it('should mark as read on click', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/dashboard');

    await page.click('[data-testid="notification-bell"]');
    await page.click('[data-testid="notification-item"]:first-child');

    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('2');
  });

  it('should update email preferences', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/settings/notifications');

    await page.click('[data-testid="email-generation-complete"]');
    await page.click('[data-testid="save-preferences-btn"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('Preferences saved');
  });
});
```

---

## Epic 9: Analytics Tests

### Integration Tests

#### 9.1 Analytics API

```typescript
// tests/api/analytics.test.ts
describe('Analytics API', () => {
  describe('GET /api/analytics/usage', () => {
    it('should return usage stats');
    it('should include products imported');
    it('should include images generated');
    it('should include credits used');
  });

  describe('GET /api/analytics/generations', () => {
    it('should return generation stats over time');
    it('should filter by date range');
    it('should group by day/week/month');
  });

  describe('GET /api/analytics/top-assets', () => {
    it('should return most viewed assets');
    it('should include view counts');
    it('should filter by time period');
  });
});
```

### E2E Tests

#### 9.2 Analytics Dashboard

```typescript
// tests/e2e/analytics/dashboard.spec.ts
describe('Analytics Dashboard', () => {
  it('should display usage stats cards', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="stat-products"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-generated"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-credits"]')).toBeVisible();
  });

  it('should show generation chart', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/analytics');

    await expect(page.locator('[data-testid="generations-chart"]')).toBeVisible();
  });

  it('should show top performing assets', async ({ page }) => {
    await loginAs(page, 'editor@example.com');
    await page.goto('/analytics');

    await expect(page.locator('[data-testid="top-assets-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-view-count"]')).toHaveCount(5);
  });
});
```

---

## Epic 10: Onboarding Tests

### E2E Tests

#### 10.1 Onboarding Flow

```typescript
// tests/e2e/onboarding/tour.spec.ts
describe('Onboarding Tour', () => {
  it('should start tour on first login', async ({ page }) => {
    // Create new user via API
    const newUser = await createTestUser();

    await page.goto('/login');
    await page.fill('[name="email"]', newUser.email);
    await page.fill('[name="password"]', newUser.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="tour-step-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="tour-welcome"]')).toContainText('Welcome');
  });

  it('should navigate through all tour steps', async ({ page }) => {
    await loginAsNewUser(page);

    // Step 1: Welcome
    await expect(page.locator('[data-testid="tour-step-1"]')).toBeVisible();
    await page.click('[data-testid="tour-next-btn"]');

    // Step 2: Products
    await expect(page.locator('[data-testid="tour-step-2"]')).toBeVisible();
    await page.click('[data-testid="tour-next-btn"]');

    // Step 3: Collections
    await expect(page.locator('[data-testid="tour-step-3"]')).toBeVisible();
    await page.click('[data-testid="tour-next-btn"]');

    // Step 4: Studio
    await expect(page.locator('[data-testid="tour-step-4"]')).toBeVisible();
    await page.click('[data-testid="tour-next-btn"]');

    // Step 5: Assets
    await expect(page.locator('[data-testid="tour-step-5"]')).toBeVisible();
    await page.click('[data-testid="tour-finish-btn"]');

    await expect(page.locator('[data-testid="tour-modal"]')).not.toBeVisible();
  });

  it('should skip tour on click', async ({ page }) => {
    await loginAsNewUser(page);

    await page.click('[data-testid="tour-skip-btn"]');
    await expect(page.locator('[data-testid="tour-modal"]')).not.toBeVisible();
  });

  it('should show sample data for new users', async ({ page }) => {
    await loginAsNewUser(page);

    await page.click('[data-testid="tour-skip-btn"]');
    await page.goto('/products');

    await expect(page.locator('[data-testid="sample-badge"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(5);
  });

  it('should hide sample data when toggled', async ({ page }) => {
    await loginAsNewUser(page);

    await page.click('[data-testid="tour-skip-btn"]');
    await page.goto('/products');

    await page.click('[data-testid="hide-samples-toggle"]');
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
  });
});
```

---

## Database Integration Tests

### Repository Tests

```typescript
// tests/integration/repositories/products.test.ts
describe('Products Repository', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  beforeEach(async () => {
    await db.reset();
  });

  describe('create', () => {
    it('should create product with all fields');
    it('should auto-generate ID');
    it('should set timestamps');
    it('should link to client');
  });

  describe('list', () => {
    it('should return products for client');
    it('should paginate correctly');
    it('should filter by category');
    it('should search by name');
    it('should sort by multiple fields');
  });

  describe('update', () => {
    it('should update specified fields');
    it('should update timestamp');
    it('should not affect other fields');
  });

  describe('delete', () => {
    it('should soft delete product');
    it('should cascade to related assets');
  });
});

// tests/integration/repositories/credits.test.ts
describe('Credits Repository', () => {
  describe('getBalance', () => {
    it('should return current balance');
    it('should return 0 for new clients');
  });

  describe('deduct', () => {
    it('should reduce balance');
    it('should create transaction record');
    it('should throw if insufficient balance');
  });

  describe('add', () => {
    it('should increase balance');
    it('should create transaction record');
  });

  describe('getTransactions', () => {
    it('should return transaction history');
    it('should paginate correctly');
    it('should filter by type');
  });
});
```

---

## Test Infrastructure

### Test Utilities

```typescript
// tests/utils/auth.ts
export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function loginAsNewUser(page: Page): Promise<void> {
  const user = await createTestUser();
  await loginAs(page, user.email);
}

export async function createTestUser(): Promise<TestUser> {
  // Create user via API
}

// tests/utils/db.ts
export async function setupTestDatabase(): Promise<TestDatabase> {
  // Use Testcontainers for isolated database
}

export async function seedTestData(db: TestDatabase): Promise<void> {
  // Seed standard test data
}

// tests/utils/mocks.ts
export function mockR2Storage(): void {
  // Mock R2 storage operations
}

export function mockGeminiAPI(): void {
  // Mock Gemini API responses
}

export function mockStripeAPI(): void {
  // Mock Stripe checkout and webhooks
}
```

### Fixtures

```
tests/
├── fixtures/
│   ├── products.csv           # Sample CSV for import tests
│   ├── sofa.jpg              # Sample product image
│   ├── generated-image.jpg   # Sample generated image
│   ├── mask.png              # Sample mask for inpainting
│   └── test-data.json        # Standard test data
```

---

## CI/CD Integration

### Test Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm build
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Coverage Targets

| Area | Unit | Integration | E2E |
|------|------|-------------|-----|
| **Auth** | 90% | 85% | Critical paths |
| **Products** | 85% | 80% | CRUD + Import |
| **Collections** | 85% | 80% | Full wizard |
| **Generation** | 80% | 75% | Start + Progress |
| **Assets** | 85% | 80% | Review flow |
| **Store Sync** | 80% | 75% | Connect + Sync |
| **Credits** | 90% | 85% | Purchase + Block |
| **Edit Suite** | 75% | 70% | Each tool |
| **Presets** | 80% | 75% | Save + Apply |
| **Notifications** | 75% | 70% | Bell + Dropdown |
| **Analytics** | 70% | 65% | Dashboard |
| **Onboarding** | 70% | N/A | Full tour |

---

## Implementation Priority

### Phase 1: Foundation
1. Set up Playwright for E2E
2. Create test utilities and fixtures
3. Auth tests (unit + integration + E2E)
4. Products CRUD tests

### Phase 2: Core Features
5. Collections tests
6. Generation flow tests
7. Assets review tests
8. Credits tests

### Phase 3: Extended Features
9. Store connection tests
10. Edit suite tests
11. Presets tests
12. Notifications tests
13. Analytics tests
14. Onboarding tests

---

## Related Documents

- [Design Log #007: API Design](./007-api-design.md)
- [Design Log #004: User Flows](./004-user-flows-journey.md)
- [What's Missing Plan](./whats-missing.md)

---

## Implementation Results

- Date: 2026-01-18
- Scope: Added API test coverage for AI tools, dashboard, explore search, generated assets, jobs, studio sessions/settings, uploads, and collection flows/generation.
- Testkits: Local filesystem storage used via `visualizer-storage/testkit` for upload route validation; external services and DB facades mocked for API unit tests.
- Tests: Not run (Node/Yarn/Corepack/NPM not available in environment).

### Summary of Deviations

- Dockerized PostgreSQL integration tests remain pending; current work focuses on API unit tests with mocked DB facades.
- E2E/Playwright coverage is still deferred to later phases of the plan.
