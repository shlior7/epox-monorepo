# Repository Test Plan

## Overview

This document outlines all tests needed for complete repository coverage.

---

## 1. ProductRepository (`products.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, with all optional fields, with metadata |
| `list` | Returns all products for client, empty array for no products |
| `listWithImages` | Returns products with images, empty images array |
| `getWithImages` | Returns product with images, returns null for non-existent |
| `update` | Update single field, update multiple fields, optimistic locking |
| `listWithFiltersAndImages` | Filter by search, filter by category, filter by source, filter by sceneType, filter by analyzed, sort by name/price/category/created/updated, pagination (limit/offset), combine multiple filters |
| `countWithFilters` | Count all, count with filters |
| `getDistinctCategories` | Returns unique categories, empty array |
| `getDistinctSceneTypes` | Returns unique scene types from JSONB array |
| `getNamesByIds` | Batch lookup, empty array input |
| `getByIds` | Batch fetch, empty array input |
| `count` | Count for client |

---

## 2. GenerationFlowRepository (`generation-flows.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, with collection session, validates max products (3), validates max flows per product (10), links products in junction table |
| `createWithId` | Creates with specific ID, validates constraints |
| `createBatchWithIds` | Batch create, empty array, validates all constraints |
| `listByCollectionSession` | Returns flows for collection, empty array |
| `listByCollectionSessionWithDetails` | Returns enriched data with products/images/assets |
| `listByClient` | Returns all flows for client |
| `listByCollectionSessionIds` | Batch lookup, empty array |
| `listByProduct` | Returns flows containing product (via junction) |
| `deleteByCollectionSession` | Deletes all flows, cascade to junction |
| `delete` | Deletes flow, cascade to junction |
| `update` | Update fields, update productIds syncs junction table, merge settings |
| `addProducts` | Adds products, validates constraints, updates junction |
| `removeProduct` | Removes product, updates junction |
| `updateSettings` | Merges settings with defaults |
| `getLinkedProductIds` | Returns product IDs from junction |
| `countFlowsForProduct` | Counts via junction table |
| `canProductAcceptMoreFlows` | Returns true/false based on limit |

---

## 3. ProductImageRepository (`product-images.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, first image becomes primary, explicitly set primary clears others |
| `setPrimary` | Sets primary, clears other primaries, throws for non-existent |
| `getPrimary` | Returns primary image, fallback to first by sort order, returns null |
| `list` | Returns images ordered by sortOrder |
| `listByProductIds` | Batch fetch, groups by productId, empty array |
| `update` | Update fields with optimistic locking |
| `reorderByImageIds` | Reorders by filename-derived IDs |
| `reorder` | Reorders by image IDs, throws for missing IDs |

---

## 4. ClientRepository (`clients.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, with all optional fields |
| `createWithId` | Creates with specific ID |
| `list` | Returns all clients ordered by createdAt |
| `getBySlug` | Returns client by slug, returns null |
| `update` | Update fields with optimistic locking |
| `getById` | (inherited) Returns by ID, returns null |
| `delete` | (inherited) Deletes client |

---

## 5. ChatSessionRepository (`chat-sessions.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, with optional fields |
| `upsertWithId` | Creates if not exists, updates if exists |
| `list` | Returns sessions for product |
| `listByProductIds` | Batch fetch, empty array |
| `getWithMessages` | Returns session with messages, returns null |
| `update` | Update with optimistic locking |

---

## 6. UserRepository (`users.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, with all fields |
| `getByEmail` | Returns user, returns null |
| `update` | Update single field, update multiple, no-op for empty data, throws for not found |
| `getById` | (inherited) Returns by ID |

---

## 7. MemberRepository (`members.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, with role |
| `listByClient` | Returns members for client |
| `listByUser` | Returns memberships for user |
| `getByClientAndUser` | Returns member, returns null |

---

## 8. FavoriteImageRepository (`favorite-images.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path |
| `listByClient` | Returns favorites ordered by createdAt |

---

## 9. InvitationRepository (`invitations.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path, with role |
| `getByEmail` | Returns invitation for client, returns null |
| `getPendingByEmail` | Returns pending non-expired, returns null for expired |
| `listByClient` | Returns all invitations |
| `listPendingByClient` | Returns pending non-expired only |
| `accept` | Updates status to accepted, throws for not found |
| `revoke` | Updates status to revoked, throws for not found |
| `expireOld` | Expires old pending invitations, returns count |

---

## 10. AccountRepository (`accounts.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `listByUser` | Returns accounts for user |
| `getByProviderAndUser` | Returns account, returns null |
| `upsertPasswordForProvider` | Creates if not exists, updates if exists |

---

## 11. AdminUserRepository (`admin-users.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path |
| `getByEmail` | Returns user with passwordHash, returns null |
| `getById` | Returns user without passwordHash, returns null |
| `createSession` | Creates session with token |
| `getSessionByToken` | Returns session with adminUser, returns null |
| `deleteSession` | Deletes session |

---

## 12. StoreConnectionRepository (`store-connections.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `upsert` | Creates new, updates existing on conflict |
| `getByClientId` | Returns most recent, returns null |
| `getByClientAndType` | Returns by type, returns null |
| `listByClientId` | Returns all connections |
| `getInfoByClientId` | Returns info without credentials |
| `update` | Update various fields, update credentials |
| `updateStatusByClientId` | Updates status |
| `updateLastSync` | Updates lastSyncAt |
| `deleteByClientId` | Deletes all connections |
| `hasConnection` | Returns true/false |
| `getEncryptedCredentials` | Extracts credentials from row |

---

## 13. AICostTrackingRepository (`ai-cost-tracking.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `create` | Happy path with all fields, with optional fields |
| `getCostSummary` | Returns summary, with date filters, breakdown by type/model |
| `getRecentRecords` | Returns records, respects limit |
| `getCurrentMonthCost` | Returns cost for current month |
| `isOverBudget` | Returns true when over, false when under |

---

## 14. UsageRecordRepository (`usage.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `getByClientAndMonth` | Returns record, returns null, uses current month default |
| `getOrCreate` | Returns existing, creates new |
| `incrementUsage` | Increments count, creates if needed |
| `getCurrentUsage` | Returns count, returns 0 if no record |

---

## 15. QuotaLimitRepository (`usage.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `getByClientId` | Returns quota, returns null |
| `getOrCreate` | Returns existing, creates with defaults |
| `create` | Creates with values, uses defaults |
| `update` | Updates fields, throws for not found |

---

## 16. UserSettingsRepository (`user-settings.test.ts`)

### Methods to test:

| Method | Tests Needed |
|--------|--------------|
| `getByUserId` | Returns settings, returns null |
| `getOrCreate` | Returns existing, creates with defaults |
| `update` | Updates fields |
| `updateNotificationSettings` | Merges notification settings |
| `updateDefaultGenerationSettings` | Merges generation settings |

---

## Already Implemented (3 files)

1. ✅ `collection-sessions.test.ts` - 24 tests
2. ✅ `generated-assets.test.ts` - 33 tests
3. ✅ `message.test.ts` - 11 tests

---

## Test Coverage Summary

| Repository | Status | Methods | Est. Tests |
|------------|--------|---------|------------|
| CollectionSessionRepository | ✅ Done | 11 | 24 |
| GeneratedAssetRepository | ✅ Done | 14 | 33 |
| MessageRepository | ✅ Done | 5 | 11 |
| ProductRepository | ⏳ TODO | 13 | ~35 |
| GenerationFlowRepository | ⏳ TODO | 22 | ~50 |
| ProductImageRepository | ⏳ TODO | 9 | ~25 |
| ClientRepository | ⏳ TODO | 6 | ~15 |
| ChatSessionRepository | ⏳ TODO | 6 | ~15 |
| UserRepository | ⏳ TODO | 4 | ~10 |
| MemberRepository | ⏳ TODO | 4 | ~10 |
| FavoriteImageRepository | ⏳ TODO | 2 | ~5 |
| InvitationRepository | ⏳ TODO | 9 | ~20 |
| AccountRepository | ⏳ TODO | 3 | ~8 |
| AdminUserRepository | ⏳ TODO | 7 | ~15 |
| StoreConnectionRepository | ⏳ TODO | 13 | ~30 |
| AICostTrackingRepository | ⏳ TODO | 5 | ~15 |
| UsageRecordRepository | ⏳ TODO | 4 | ~10 |
| QuotaLimitRepository | ⏳ TODO | 4 | ~10 |
| UserSettingsRepository | ⏳ TODO | 5 | ~12 |

**Total estimated tests: ~350**
