# Epox Platform - Testing Guide

## Overview

Comprehensive test suite for epox-platform covering:
- **CRUD operations** for Products and Collections
- **Collection flows and studio sessions** (create/list/update)
- **Image generation flow** with queue service integration
- **Generated assets listing/deletion** and job status tracking
- **AI analysis/editing tools** (analyze, edit, remove background, upscale, vision scan)
- **Uploads** with product linkage and subject analysis
- **Dashboard and explore search** aggregation/mapping
- **Storage integration** for file handling
- **Input validation** and error handling

## Setup

Install dependencies:
```bash
yarn install
```

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
```

## Test Structure

```
tests/
├── setup.ts                          # Test environment configuration
├── api/
│   ├── analyze-products.test.ts      # Product analysis tests
│   ├── art-director.test.ts          # Prompt assembly tests
│   ├── collections-flows.test.ts     # Collection flows tests
│   ├── collections-generate.test.ts  # Collection generation tests
│   ├── collections.test.ts           # Collections CRUD tests
│   ├── dashboard.test.ts             # Dashboard aggregation tests
│   ├── explore-search.test.ts        # Unsplash search mapping tests
│   ├── generate-images.test.ts       # Image generation flow tests
│   ├── generate-video.test.ts        # Video generation flow tests
│   ├── gemini-tools.test.ts          # Analyze/edit/remove/upscale/vision tests
│   ├── generated-images.test.ts      # Generated assets list/delete tests
│   ├── jobs.test.ts                  # Job status tests
│   ├── products.test.ts              # Products CRUD tests
│   ├── studio-settings.test.ts       # Studio settings tests
│   ├── studio.test.ts                # Studio session tests
│   └── upload.test.ts                # Upload flow tests
└── integration/
    └── storage.test.ts               # Storage integration tests
```

## Test Coverage

### Products API Tests (`tests/api/products.test.ts`)

**GET /api/products**
- ✅ Returns empty list when no products exist
- ✅ Validates pagination parameters (page, limit)
- ✅ Filters by category
- ✅ Filters by source (imported/uploaded)
- ✅ Respects limit parameter
- ✅ SQL-level filtering and sorting

**POST /api/products**
- ✅ Creates product with valid data
- ✅ Rejects empty name
- ✅ Rejects name longer than 255 characters
- ✅ Rejects invalid roomTypes (must be array)
- ✅ Rejects negative price
- ✅ Validates all input fields

**GET /api/products/[id]**
- ✅ Returns product with ALL images and proper URLs
- ✅ Returns 404 for non-existent product
- ✅ Includes analysis data if product is analyzed

**PATCH /api/products/[id]**
- ✅ Updates product name
- ✅ Validates name (non-empty, max 255 chars)
- ✅ Returns 404 for non-existent product
- ✅ Only updates provided fields

**DELETE /api/products/[id]**
- ✅ Deletes existing product
- ✅ Returns 404 for non-existent product

### Collections API Tests (`tests/api/collections.test.ts`)

**GET /api/collections**
- ✅ Returns empty list when no collections exist
- ✅ Validates pagination parameters
- ✅ Filters by status (draft/generating/completed)
- ✅ Searches by name (case-insensitive)
- ✅ Sorts by name, productCount, or recent

**POST /api/collections**
- ✅ Creates collection with valid data
- ✅ Rejects empty name
- ✅ Rejects name longer than 255 characters
- ✅ Rejects empty productIds array
- ✅ Rejects non-array productIds
- ✅ Rejects non-string productIds elements

**GET /api/collections/[id]**
- ✅ Returns collection with stats (generatedCount, totalImages)
- ✅ Uses SQL COUNT for asset aggregation
- ✅ Returns 404 for non-existent collection

**PATCH /api/collections/[id]**
- ✅ Updates collection name
- ✅ Updates collection status
- ✅ Validates status (draft/generating/completed only)
- ✅ Returns 404 for non-existent collection
- ✅ Only updates provided fields

**DELETE /api/collections/[id]**
- ✅ Deletes existing collection
- ✅ Returns 404 for non-existent collection

### Image Generation Flow Tests (`tests/api/generate-images.test.ts`)

**POST /api/generate-images**
- ✅ Creates generation jobs for multiple products
- ✅ Validates required fields (sessionId, productIds)
- ✅ Validates productIds is non-empty array
- ✅ Passes prompt and settings to queue service
- ✅ Includes inspiration image if provided
- ✅ Returns job IDs for tracking
- ✅ Returns expected image count (products × variants)
- ✅ Returns first job ID for backward compatibility
- ✅ Returns truncated prompt in response
- ✅ Handles queue service errors gracefully

### Video Generation Flow Tests (`tests/api/generate-video.test.ts`)

**POST /api/generate-video**
- ✅ Validates required fields (sessionId, productId, sourceImageUrl, prompt)
- ✅ Creates video generation job with settings + inspiration
- ✅ Supports urgent priority
- ✅ Trims prompt before enqueuing
- ✅ Uses explicit clientId when provided
- ✅ Handles queue service errors gracefully

### Additional API Coverage

- **Analyze & AI Tools** (`tests/api/gemini-tools.test.ts`, `tests/api/analyze-products.test.ts`, `tests/api/art-director.test.ts`)
  - ✅ Validation + success/error for analyze/edit/remove/upscale/vision endpoints
  - ✅ AI analysis + fallback paths for product analysis
  - ✅ Prompt assembly and scene matching for Art Director
- **Collection Flows & Generation** (`tests/api/collections-flows.test.ts`, `tests/api/collections-generate.test.ts`)
  - ✅ Flow listing with assets/base images
  - ✅ Flow creation with scene-type matching
  - ✅ Collection generation job creation + flow updates
- **Assets & Jobs** (`tests/api/generated-images.test.ts`, `tests/api/jobs.test.ts`)
  - ✅ Generated images list with filters + flowId path
  - ✅ Generated image deletion with storage cleanup
  - ✅ Job status mapping and error handling
- **Studio & Uploads** (`tests/api/studio.test.ts`, `tests/api/studio-settings.test.ts`, `tests/api/upload.test.ts`)
  - ✅ Studio session create/list + settings update/get
  - ✅ Upload validation, product image linkage, and subject analysis
- **Dashboard & Explore** (`tests/api/dashboard.test.ts`, `tests/api/explore-search.test.ts`)
  - ✅ Dashboard aggregation + error handling
  - ✅ Unsplash search mapping + failure handling

### Storage Integration Tests (`tests/integration/storage.test.ts`)

**Storage Public URLs**
- ✅ Generates public URL for stored file
- ✅ Handles paths with different formats
- ✅ Returns consistent URLs for same key
- ✅ Provides storage path helpers

**Path Helpers**
- ✅ Generates product image paths
- ✅ Generates generated image paths
- ✅ Generates session flow image paths
- ✅ Generates inspiration image paths
- ✅ Handles filename sanitization
- ✅ Generates unique paths per client
- ✅ Generates unique paths per product

## Test Features

### Mocking

Tests use Vitest's mocking capabilities to isolate units:

```typescript
// Mock database
vi.mock('@/lib/services/db', () => ({
  db: {
    products: {
      list: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock storage
vi.mock('@/lib/services/storage', () => ({
  storage: {
    getPublicUrl: vi.fn((key) => `https://cdn.example.com/${key}`),
  },
}));
```

### Test Environment

Tests run with filesystem storage adapter (no R2 required):

```typescript
// tests/setup.ts
process.env.STORAGE_DRIVER = 'filesystem';
process.env.LOCAL_STORAGE_DIR = '.test-storage';
```

### Coverage

Generate coverage reports:

```bash
yarn test:coverage
```

Coverage reports are generated in:
- `coverage/index.html` - HTML report
- `coverage/coverage-final.json` - JSON report

## Production Readiness

### What's Tested

✅ **All CRUD Operations** - Full coverage of Products and Collections APIs
✅ **Input Validation** - Name length, required fields, type checking
✅ **Error Handling** - 404s, 400s, 500s handled correctly
✅ **SQL Queries** - Filtering, sorting, pagination all use SQL
✅ **Image Generation** - Queue integration, job creation
✅ **Storage** - URL generation, path helpers

### What's NOT Tested (Future Work)

- ⚠️ Database integration tests (requires running PostgreSQL)
- ⚠️ End-to-end API tests (requires running Next.js server)
- ⚠️ Actual AI generation (requires Gemini API)
- ⚠️ Authentication flows (deferred)
- ⚠️ Cloud storage (R2/S3) integration

## Running Tests in CI/CD

Add to your CI pipeline:

```yaml
- name: Install dependencies
  run: yarn install

- name: Run tests
  run: yarn test --run

- name: Generate coverage
  run: yarn test:coverage
```

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    const mockData = { ... };
    vi.mocked(db.something).mockResolvedValue(mockData);

    // Act
    const request = new NextRequest('http://localhost/api/endpoint');
    const response = await apiHandler(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.something).toBe('expected value');
  });
});
```

### Best Practices

1. **Clear test names** - Describe what is being tested
2. **Arrange-Act-Assert** - Structure tests clearly
3. **Mock external dependencies** - Database, storage, APIs
4. **Test edge cases** - Empty inputs, invalid data, missing fields
5. **Clean up** - Use `beforeEach` and `afterEach`

## Troubleshooting

**Tests fail with "Module not found"**
- Run `yarn install` to ensure all dependencies are installed
- Check that paths in `vitest.config.ts` are correct

**Tests timeout**
- Increase timeout in vitest.config.ts: `testTimeout: 10000`
- Check for missing `await` in async tests

**Coverage is low**
- Add more test cases for uncovered code paths
- Check `coverage/index.html` for detailed report

## Next Steps

1. **Add database integration tests** - Test against real PostgreSQL
2. **Add E2E tests** - Test full API flows with Playwright
3. **Add performance tests** - Ensure SQL queries are fast
4. **Add load tests** - Test with 10k+ products
5. **Add authentication tests** - When auth is implemented

## Useful Commands

```bash
# Run specific test file
yarn test tests/api/products.test.ts

# Run tests matching pattern
yarn test --grep "Products API"

# Run tests with UI
yarn test --ui

# Debug tests
yarn test --inspect-brk
```

---

**Last Updated:** 2026-01-18
