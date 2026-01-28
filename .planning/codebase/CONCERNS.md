# Codebase Concerns

**Analysis Date:** 2026-01-28

## Tech Debt

**Hardcoded values in API routes:**
- Issue: Credits hardcoded to 500 instead of dynamic quota
- Files: `apps/epox-platform/app/api/dashboard/route.ts`, `apps/epox-platform/lib/server/queries.ts`
- Impact: All clients show same credit balance regardless of plan
- Fix approach: Integrate with quota service, add credits field to client schema

**Incomplete pinned/favorites implementation:**
- Issue: Multiple components reference unimplemented pinned asset functionality
- Files:
  - `apps/epox-admin/app/[clientId]/settings/page.tsx`
  - `apps/epox-admin/components/SceneStudioView/SceneLibraryModal.tsx`
  - `apps/epox-admin/components/SceneStudioView/SceneStudioView.tsx`
  - `apps/epox-admin/lib/contexts/DataContext.tsx`
  - `apps/epox-admin/components/modals/AllClientGeneratedImagesModal.tsx`
  - `apps/epox-admin/components/ChatView/MessageBubble/MessageBubble.tsx`
- Impact: Pinned assets feature is non-functional
- Fix approach: Add pinned field to generated_asset schema, implement repository methods

**Assets page action handlers not implemented:**
- Issue: Pin, favorite, approve, edit, delete actions all marked as TODO
- File: `apps/epox-platform/app/(dashboard)/assets/assets-client.tsx`
- Impact: Asset management actions don't work on assets page
- Fix approach: Implement handlers connecting to existing API endpoints

**Store sync not implemented in worker:**
- Issue: `processSyncProduct()` throws "not yet implemented"
- File: `services/generation-worker/src/worker.ts`
- Impact: Store product sync via worker is non-functional
- Fix approach: Implement credential decryption and store sync logic

## Known Bugs

No reproducible bugs identified in code review. However, several incomplete features (listed above as tech debt) could manifest as user-facing issues.

## Security Considerations

**Missing .env.example files:**
- Risk: No template for required environment variables across workspaces
- Current mitigation: `.env.local` files (gitignored) used directly
- Recommendations: Create `.env.example` for each workspace documenting required variables without values

**Manual input validation:**
- Risk: Inconsistent validation patterns across API routes
- Files: Various `apps/epox-platform/app/api/*/route.ts`
- Current mitigation: Manual type checks in route handlers (`if (!name || typeof name !== 'string'`)
- Recommendations: Standardize on Zod schemas for all API input validation

**`dangerouslySetInnerHTML` usage:**
- File: `apps/epox-admin/app/layout.tsx` - Theme persistence script (acceptable, hardcoded content)
- File: `apps/epox-admin/components/modals/ImportProductsFromProviderModal.tsx` - Potential XSS if external HTML not sanitized
- Recommendations: Review HTML content sources in ImportProductsFromProviderModal

## Performance Bottlenecks

No specific measurements available. Potential areas to monitor:

**Large components:**
- Several components exceed 1,200+ lines which may affect bundle size and render performance
- Files:
  - `apps/epox-platform/app/(dashboard)/studio/collections/[id]/page.tsx` (1,562 lines)
  - `apps/epox-platform/components/studio/modals/ImageEditorModal.tsx` (1,429 lines)
  - `apps/epox-platform/app/(dashboard)/studio/[id]/page.tsx` (1,425 lines)
  - `apps/epox-admin/lib/contexts/DataContext.tsx` (1,562 lines)
  - `apps/epox-platform/lib/api-client.ts` (1,012 lines)

## Fragile Areas

**DataContext (Admin):**
- File: `apps/epox-admin/lib/contexts/DataContext.tsx` (1,562 lines)
- Why fragile: Single context handles multiple domains (products, collections, generation, settings)
- Impact: Changes affect all consumers
- Fix approach: Split into domain-specific contexts

**Large studio pages:**
- Files: `apps/epox-platform/app/(dashboard)/studio/[id]/page.tsx`, `studio/collections/[id]/page.tsx`
- Why fragile: 1,400+ lines mixing UI, state management, and API calls
- Impact: Difficult to test and modify safely
- Fix approach: Extract state logic into hooks, UI into sub-components

## Test Coverage Gaps

**Generation jobs repository:**
- What's not tested: `packages/visualizer-db/src/repositories/generation-jobs.ts` has no test file
- Risk: Job processing logic changes could break silently
- Priority: High (critical path for AI generation)

**Store sync logs repository:**
- What's not tested: `packages/visualizer-db/src/repositories/store-sync-logs.ts` has no test file
- Risk: Store sync audit trail could have regressions
- Priority: Medium

**Admin auth tests incomplete:**
- File: `apps/epox-admin/__tests__/admin/auth.test.ts`
- What's not tested: TODO comments at lines 98, 114 indicate incomplete coverage

## Dependencies at Risk

No critically outdated or unmaintained dependencies detected. The stack uses actively maintained packages (Next.js 16, React 19, Drizzle ORM).

---

*Concerns audit: 2026-01-28*
*Update as issues are fixed or new ones discovered*
