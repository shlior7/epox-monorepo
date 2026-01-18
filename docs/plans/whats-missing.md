# Epox Platform - What's Missing

**Status**: Active Backlog
**Created**: 2026-01-18
**Last Updated**: 2026-01-18
**Owner**: Engineering Team

---

## Overview

This document identifies gaps between the current implementation and the target user experience for the epox-platform app. Organized as Epic > Task > Subtask for clear prioritization and tracking.

## Key Design Decisions

| Area | Decision |
|------|----------|
| **Product Import** | All 3 methods equally important (Store, CSV, Manual) |
| **Generation Workflow** | Unified Studio for both single and collections |
| **Edit Features** | Full Suite (BG removal, inpainting, upscaling, crop, prompt-based) |
| **Store Sync** | Management page tracking synced vs platform-uploaded images |
| **Organization** | Categories (from store) + Collections + Products + optional tags |
| **Onboarding** | Sample data + product tour |
| **Inspiration** | Upload priority (brand consistency) |
| **Analytics** | Basic counts + R2 usage tracking for image views |
| **Credits** | Subscription tiers + buy more + admin can add + hard block |
| **Error Handling** | Credit refund for failed generations |
| **Presets** | User presets + auto-remember per scene-type/product/category/collection |
| **Analysis** | Automatic on import/upload |
| **Notifications** | In-app + configurable real-time email |
| **Multi-Store** | One store per account (MVP) |

---

## Epic 1: Store Connection & Product Import

**Goal**: Enable users to connect their e-commerce store and import products with full metadata preservation.

**Priority**: HIGH (Critical Path)

### Task 1.1: Store Connection Infrastructure

| Subtask | Description | Status |
|---------|-------------|--------|
| 1.1.1 | **OAuth Integration Framework**: Create `store_connection` table with OAuth tokens, refresh logic, secure token storage with encryption, token refresh scheduler | Not Started |
| 1.1.2 | **WooCommerce Integration (PRIORITY)**: Implement REST API auth (Consumer Key/Secret), product/category schema mapping, variable products, webhooks | Not Started |
| 1.1.3 | **Shopify Integration**: OAuth flow (Admin API), product schema mapping, webhooks, Collections for category mapping | Not Started |
| 1.1.4 | **BigCommerce Integration**: OAuth flow, catalog structure mapping, BigCommerce-specific metadata | Not Started |

### Task 1.2: Product Import Wizard

| Subtask | Description | Status |
|---------|-------------|--------|
| 1.2.1 | **Import Method Selection UI**: "By Product IDs" textarea, "By Category" selector with counts, "All Products" with limit warning, plan limits display | Not Started |
| 1.2.2 | **Import Preview & Confirmation**: Preview grid, deselect individual products, image count and metadata completeness, import time estimate | Not Started |
| 1.2.3 | **Import Progress Tracking**: Real-time progress bar, per-product status, background job with resume, email notification | Not Started |

### Task 1.3: CSV Bulk Import

| Subtask | Description | Status |
|---------|-------------|--------|
| 1.3.1 | **CSV Upload & Parsing**: Drag-drop upload, column auto-detection (name, SKU, description, image URLs), column mapping interface | Not Started |
| 1.3.2 | **CSV Validation & Preview**: Validate required fields, preview first 10 rows, warnings for missing images/duplicate SKUs, error report download | Not Started |
| 1.3.3 | **Batch Image Download**: Download images from URLs, handle redirects/auth headers, progress tracking, retry failed downloads | Not Started |

### Task 1.4: Manual Product Entry

| Subtask | Description | Status |
|---------|-------------|--------|
| 1.4.1 | **Single Product Form**: Name, description, category, price, SKU fields, multi-image upload with reorder, "Uploaded" badge indicator | Partial |
| 1.4.2 | **Link to Store Product**: "Link to Store" action, search store products by name/SKU, map to ERP ID, convert badge to "Imported" | Not Started |

---

## Epic 2: Store Management & Sync

**Goal**: Sophisticated store management page tracking sync status and allowing granular control.

**Priority**: HIGH

### Task 2.1: Store Management Page

| Subtask | Description | Status |
|---------|-------------|--------|
| 2.1.1 | **Product Sync Overview Dashboard**: Grid/table with sync status, columns for Generated/Approved/Synced/Pending counts, filter by status, search | Not Started |
| 2.1.2 | **Per-Product Sync Detail View**: Show all generated images for product, status badges, thumbnail grid with overlays, quick actions | Not Started |
| 2.1.3 | **Sync History & Audit Trail**: Log all sync events (pushed, removed, failed), timestamp/image ID/action/result, CSV export | Not Started |

### Task 2.2: Image Tracking System

| Subtask | Description | Status |
|---------|-------------|--------|
| 2.2.1 | **Platform-Synced Image Tracking**: `synced_asset` table (assetId, storeImageId, syncedAt, syncedBy), track platform vs pre-existing | Not Started |
| 2.2.2 | **Store Image Diffing**: Snapshot current images before sync, compare to identify platform-uploaded, only allow removing platform-synced | Not Started |
| 2.2.3 | **Remove from Store Action**: Button (only for platform-synced), confirmation dialog, API call to store, update status to "Removed" | Not Started |

### Task 2.3: Sync Execution Engine

| Subtask | Description | Status |
|---------|-------------|--------|
| 2.3.1 | **Sync Job Queue**: Queue approved images, rate-limited execution, retry with exponential backoff | Not Started |
| 2.3.2 | **Sync Status Polling**: Poll store API to verify success, update `synced_asset` status, handle failures | Not Started |
| 2.3.3 | **Bulk Sync Actions**: "Sync All Approved" button, progress modal, cancel/pause capability | Not Started |

---

## Epic 3: Credit & Billing System

**Goal**: Subscription tiers with included credits, ability to buy more, admin controls.

**Priority**: HIGH (Blocks Monetization)

**Note**: Build flexible infrastructure first. Specific pricing tiers will be decided before launch.

### Task 3.1: Credit Infrastructure

| Subtask | Description | Status |
|---------|-------------|--------|
| 3.1.1 | **Database Schema**: `subscription`, `credit_balance`, `credit_transaction`, `credit_package` tables | Not Started |
| 3.1.2 | **Credit Deduction Logic**: Deduct 1 credit per image, check balance before generation, transaction logging | Not Started |
| 3.1.3 | **Subscription Credit Grants**: Monthly grant based on plan, webhook for renewal, pro-rated upgrades | Not Started |

### Task 3.2: Credit Purchase Flow

| Subtask | Description | Status |
|---------|-------------|--------|
| 3.2.1 | **Credit Package Display**: Available packages with prices, current balance, "Best Value" badge | Not Started |
| 3.2.2 | **Stripe Checkout Integration**: Checkout session, payment webhook, add credits, receipt email | Not Started |
| 3.2.3 | **Credit Purchase History**: List purchases in settings, date/amount/method, invoice downloads | Not Started |

### Task 3.3: Upgrade & Block Flow

| Subtask | Description | Status |
|---------|-------------|--------|
| 3.3.1 | **No Credits Modal**: Trigger when balance=0, show plan and upgrade options, hard block | Not Started |
| 3.3.2 | **Upgrade Plan Flow**: Plan comparison table, Stripe subscription checkout, immediate credit grant | Not Started |
| 3.3.3 | **Admin Credit Management**: Search client, view balance, "Add Credits" with reason, audit log | Not Started |

### Task 3.4: Credit Refund System

| Subtask | Description | Status |
|---------|-------------|--------|
| 3.4.1 | **Failed Generation Refund**: Detect failures, auto-refund, transaction record, toast notification | Not Started |
| 3.4.2 | **Refund Audit Trail**: Log all refunds with reason, link to failed job, admin visibility | Not Started |

---

## Epic 4: Full Edit Suite

**Goal**: Comprehensive image editing capabilities post-generation.

**Priority**: MEDIUM

### Task 4.1: Background Removal

| Subtask | Description | Status |
|---------|-------------|--------|
| 4.1.1 | **BG Removal API Integration**: Integrate remove.bg or Cloudflare AI, handle high-res, return transparent PNG | Partial (endpoint exists) |
| 4.1.2 | **BG Removal UI**: Button in editor, before/after preview, download PNG, save as variant | Not Started |

### Task 4.2: Inpainting (Mask & Regenerate)

| Subtask | Description | Status |
|---------|-------------|--------|
| 4.2.1 | **Mask Drawing Canvas**: Brush with size slider, eraser, clear, opacity preview | Not Started |
| 4.2.2 | **Inpaint Prompt Input**: Text input, "Remove object" vs "Replace with...", preview | Not Started |
| 4.2.3 | **Inpaint Execution**: Send mask + prompt to Gemini, save as revision, track history | Not Started |

### Task 4.3: Upscaling

| Subtask | Description | Status |
|---------|-------------|--------|
| 4.3.1 | **Upscale Options**: 2K (1 credit), 4K (2 credits), show cost before action | Partial (endpoint exists) |
| 4.3.2 | **Upscale Execution**: Real-ESRGAN or Gemini, progress indicator, save as variant | Partial |

### Task 4.4: Crop & Resize

| Subtask | Description | Status |
|---------|-------------|--------|
| 4.4.1 | **Crop Tool**: Drag corners, aspect ratio presets (1:1, 16:9, 4:3, 9:16), free-form | Not Started |
| 4.4.2 | **Resize Tool**: Dimension inputs, maintain aspect toggle, quality slider | Not Started |

### Task 4.5: Prompt-Based Edits

| Subtask | Description | Status |
|---------|-------------|--------|
| 4.5.1 | **Edit Prompt Input**: Textarea, examples ("Make lighting warmer"), send with image | Partial (endpoint exists) |
| 4.5.2 | **Edit Preview & Accept**: Side-by-side, Accept/Try Again/Cancel | Not Started |

---

## Epic 5: Presets & Smart Defaults

**Goal**: User presets + auto-remember settings for "read my mind" experience.

**Priority**: MEDIUM

### Task 5.1: User Presets

| Subtask | Description | Status |
|---------|-------------|--------|
| 5.1.1 | **Save Preset Flow**: "Save as Preset" button, name input, capture all settings | Not Started |
| 5.1.2 | **Preset Library**: List presets, preview thumbnail, Apply/Edit/Delete, "Set as Default" | Not Started |
| 5.1.3 | **Apply Preset**: Dropdown in studio, fills all fields, user can override | Not Started |

### Task 5.2: Auto-Remember System

| Subtask | Description | Status |
|---------|-------------|--------|
| 5.2.1 | **Settings Memory Schema**: `settings_memory` table, context types (scene/product/category/collection), JSON settings | Not Started |
| 5.2.2 | **Settings Capture**: On successful generation save settings, overwrite for same context | Not Started |
| 5.2.3 | **Settings Auto-Load**: Check remembered on studio open, priority chain, toast notification, "Reset" link | Not Started |

---

## Epic 6: Analytics & Insights

**Goal**: Usage stats + R2 analytics showing which images are most viewed.

**Priority**: LOW (Phase 3)

### Task 6.1: Basic Usage Dashboard

| Subtask | Description | Status |
|---------|-------------|--------|
| 6.1.1 | **Dashboard Stats Cards**: Products imported, images generated, credits used/remaining | Partial |
| 6.1.2 | **Usage Charts**: Generations over time, credits over time, most active products | Not Started |

### Task 6.2: R2 Image View Analytics

| Subtask | Description | Status |
|---------|-------------|--------|
| 6.2.1 | **R2 Analytics Collection**: Enable Cloudflare Analytics, filter by client, identify store user-agents | Not Started |
| 6.2.2 | **View Count Aggregation**: Daily job to fetch analytics, aggregate per asset, store in `asset_analytics` | Not Started |
| 6.2.3 | **Most Viewed Assets UI**: "Top Performing Images" section, view count, filter by time period | Not Started |

---

## Epic 7: Onboarding Experience

**Goal**: Sample data + interactive product tour for new users.

**Priority**: MEDIUM

### Task 7.1: Sample Data Setup

| Subtask | Description | Status |
|---------|-------------|--------|
| 7.1.1 | **Sample Products Creation**: 5 varied products, professional images, pre-analyzed | Not Started |
| 7.1.2 | **Sample Collection & Generations**: 1 collection, pre-generated in multiple styles | Not Started |
| 7.1.3 | **Sample Data Injection**: Add on client creation, flag as "sample", "Hide Samples" toggle | Not Started |

### Task 7.2: Interactive Product Tour

| Subtask | Description | Status |
|---------|-------------|--------|
| 7.2.1 | **Tour Framework**: driver.js or react-joyride, step-based highlights, Skip/Next/Previous | Not Started |
| 7.2.2 | **Tour Steps**: Dashboard, Products, Collection wizard, Studio, Assets, Settings | Not Started |
| 7.2.3 | **Tour Triggers**: Auto-start first login, "Take Tour Again" in help, resume if abandoned | Not Started |

---

## Epic 8: Notification System

**Goal**: In-app notifications + configurable email alerts.

**Priority**: LOW (Phase 3)

### Task 8.1: In-App Notifications

| Subtask | Description | Status |
|---------|-------------|--------|
| 8.1.1 | **Notification Bell Component**: Bell icon with unread count, dropdown, mark as read, "View All" | Not Started |
| 8.1.2 | **Notification Types**: Generation complete, sync complete/failed, credits low, weekly summary | Not Started |
| 8.1.3 | **Notification Storage**: `notification` table, 90-day retention, batch mark as read | Not Started |

### Task 8.2: Email Notifications

| Subtask | Description | Status |
|---------|-------------|--------|
| 8.2.1 | **Email Preferences UI**: Settings section, toggle per type, master toggle | Not Started |
| 8.2.2 | **Email Templates**: Generation complete, sync summary, credits low, weekly digest | Not Started |
| 8.2.3 | **Email Sending Service**: Resend or SendGrid, queue batch sending, delivery tracking, unsubscribe | Not Started |

---

## Epic 9: Organization & Categories

**Goal**: Categories from store + collections + optional tags.

**Priority**: LOW (Phase 3)

### Task 9.1: Category System

| Subtask | Description | Status |
|---------|-------------|--------|
| 9.1.1 | **Category Import from Store**: Extract during import, `category` table with hierarchy | Not Started |
| 9.1.2 | **Category Management UI**: Tree view in sidebar, filter products, show counts | Not Started |
| 9.1.3 | **Manual Category Assignment**: Assign uploaded products, multi-category, suggestions | Not Started |

### Task 9.2: Tag System

| Subtask | Description | Status |
|---------|-------------|--------|
| 9.2.1 | **Tag CRUD**: Create (name, color), edit, delete, merge | Partial (schema exists) |
| 9.2.2 | **Tag Assignment**: Quick-add, bulk assignment, remove, auto-suggest | Not Started |
| 9.2.3 | **Tag Filtering**: Filter by tags, multi-tag AND/OR, save as "Smart Collection" | Not Started |

---

## Epic 10: Production Readiness

**Goal**: Error handling, performance, and reliability improvements.

**Priority**: MEDIUM (Ongoing)

### Task 10.1: Error Handling

| Subtask | Description | Status |
|---------|-------------|--------|
| 10.1.1 | **Graceful Generation Failures**: Per-image isolation, "Retry Failed" button, credit refund notification | Partial |
| 10.1.2 | **Network Error Recovery**: Auto-retry with backoff, offline indicator, queue failed actions | Not Started |
| 10.1.3 | **Validation Errors**: Inline form errors, file upload validation, user-friendly API errors | Partial |

### Task 10.2: Performance Optimization

| Subtask | Description | Status |
|---------|-------------|--------|
| 10.2.1 | **Image Lazy Loading**: Virtual scrolling, thumbnail placeholders, progressive loading | Partial |
| 10.2.2 | **API Caching**: React Query stale-while-revalidate, cache product list, invalidate on mutations | Implemented |
| 10.2.3 | **Background Job Optimization**: Batch similar operations, priority queue, worker health monitoring | Partial |

---

## Implementation Phases

### Phase 1: Core Gaps (Weeks 1-4)
- **Epic 1**: Store Connection & Import (WooCommerce first)
- **Epic 3**: Credit System
- **Epic 7**: Onboarding
- **Testing**: Auth, Products, Collections unit/integration tests

### Phase 2: Enhanced Features (Weeks 5-8)
- **Epic 2**: Store Management & Sync
- **Epic 4**: Full Edit Suite
- **Epic 5**: Presets System
- **Testing**: Store sync, Edit suite, Generation E2E tests

### Phase 3: Polish & Scale (Weeks 9-12)
- **Epic 6**: Analytics
- **Epic 8**: Notifications
- **Epic 9**: Organization & Categories
- **Epic 10**: Production Readiness
- **Testing**: Full E2E coverage, CI/CD integration, coverage targets

---

## Verification Checklist

- [ ] Store Import: Connect WooCommerce test store, import 50 products, verify metadata
- [ ] Credit Flow: Generate with 0 credits, verify block modal appears
- [ ] Sync Flow: Approve images, verify appear in store, remove and verify deletion
- [ ] Edit Suite: Test each edit type on generated image
- [ ] Presets: Save preset, apply to new generation, verify settings match
- [ ] Analytics: Generate images, fetch from store, verify view counts appear
- [ ] Onboarding: Create new test account, verify sample data and tour work
- [ ] Testing: Unit tests 80%+ coverage, Integration tests passing, E2E critical paths green

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/epox-platform/app/api/store-connection/route.ts` | Store OAuth endpoints |
| `apps/epox-platform/app/api/import/route.ts` | Product import endpoints |
| `apps/epox-platform/app/api/credits/route.ts` | Credit management endpoints |
| `apps/epox-platform/app/api/sync/route.ts` | Store sync endpoints |
| `apps/epox-platform/app/(dashboard)/store/page.tsx` | Store management page |
| `apps/epox-platform/app/(dashboard)/onboarding/page.tsx` | Onboarding flow |
| `packages/visualizer-db/src/schema/credits.ts` | Credit system tables |
| `packages/visualizer-db/src/schema/store-sync.ts` | Sync tracking tables |
| `packages/visualizer-db/src/schema/presets.ts` | Preset system tables |
| `packages/visualizer-db/src/repositories/credits.ts` | Credit repository |
| `packages/visualizer-db/src/repositories/sync.ts` | Sync repository |

### Test Files to Create

| File | Purpose |
|------|---------|
| `apps/epox-platform/tests/unit/auth/` | Auth unit tests |
| `apps/epox-platform/tests/unit/products/` | Product utility tests |
| `apps/epox-platform/tests/unit/collections/` | Collection utility tests |
| `apps/epox-platform/tests/unit/credits/` | Credit utility tests |
| `apps/epox-platform/tests/unit/store/` | Store integration utility tests |
| `apps/epox-platform/tests/unit/edit/` | Image editing utility tests |
| `apps/epox-platform/tests/unit/presets/` | Preset utility tests |
| `apps/epox-platform/tests/api/auth.test.ts` | Auth API integration tests |
| `apps/epox-platform/tests/api/store-connection.test.ts` | Store connection API tests |
| `apps/epox-platform/tests/api/store-sync.test.ts` | Store sync API tests |
| `apps/epox-platform/tests/api/credits.test.ts` | Credits API tests |
| `apps/epox-platform/tests/api/presets.test.ts` | Presets API tests |
| `apps/epox-platform/tests/api/edit.test.ts` | Edit API tests |
| `apps/epox-platform/tests/api/notifications.test.ts` | Notifications API tests |
| `apps/epox-platform/tests/api/analytics.test.ts` | Analytics API tests |
| `apps/epox-platform/tests/integration/repositories/` | Repository integration tests |
| `apps/epox-platform/tests/e2e/auth/` | Auth E2E flows |
| `apps/epox-platform/tests/e2e/products/` | Products E2E flows |
| `apps/epox-platform/tests/e2e/collections/` | Collections E2E flows |
| `apps/epox-platform/tests/e2e/store/` | Store connection & sync E2E flows |
| `apps/epox-platform/tests/e2e/credits/` | Credits & billing E2E flows |
| `apps/epox-platform/tests/e2e/edit/` | Edit suite E2E flows |
| `apps/epox-platform/tests/e2e/presets/` | Presets E2E flows |
| `apps/epox-platform/tests/e2e/notifications/` | Notifications E2E flows |
| `apps/epox-platform/tests/e2e/analytics/` | Analytics E2E flows |
| `apps/epox-platform/tests/e2e/onboarding/` | Onboarding tour E2E flows |
| `apps/epox-platform/tests/utils/` | Test utilities (auth, db, mocks) |
| `apps/epox-platform/tests/fixtures/` | Test fixtures (CSV, images, JSON) |
| `apps/epox-platform/playwright.config.ts` | Playwright E2E configuration |
| `.github/workflows/test.yml` | CI/CD test pipeline |

---

## Related Design Logs

- See `010-store-management.md` for detailed store sync tracking design
- See `011-presets-system.md` for preset and auto-remember design
- See `000-product-requirements-overview.md` for updated user flows
- See `012-testing-plan.md` for comprehensive unit, integration, and E2E test specifications
