---
phase: phase-1-credit-system
plan: "02"
subsystem: api
tags: [quota, credits, enforcement, nextjs-api, middleware]

# Dependency graph
requires:
  - phase: phase-1-credit-system/01
    provides: QuotaService factory, checkQuota, consumeQuota
provides:
  - Quota enforcement helper (enforceQuota, consumeCredits)
  - All 6 AI generation endpoints gated by credit checks
affects: [phase-2-subscriptions, phase-4-usage-dashboard, phase-7-video]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "enforceQuota returns NextResponse|null pattern for early 402 returns"
    - "consumeCredits called after successful enqueue/processing"

key-files:
  created:
    - apps/epox-platform/lib/services/quota.ts
  modified:
    - apps/epox-platform/app/api/generate-images/route.ts
    - apps/epox-platform/app/api/generate-video/route.ts
    - apps/epox-platform/app/api/edit-image/route.ts
    - apps/epox-platform/app/api/upscale-image/route.ts
    - apps/epox-platform/app/api/remove-background/route.ts
    - apps/epox-platform/app/api/collections/[id]/generate/route.ts

key-decisions:
  - "enforceQuota returns NextResponse|null instead of throwing to avoid middleware swallowing 402 as 500"
  - "upscale-image and remove-background needed context parameter added to access clientId"

patterns-established:
  - "Quota enforcement: enforceQuota() before processing, consumeCredits() after success"

# Metrics
duration: 4min
completed: 2026-01-28
---

# Phase 1 Plan 02: Quota Enforcement Summary

**Quota enforcement added to all 6 AI generation endpoints via enforceQuota/consumeCredits helper returning 402 when credits exhausted**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-28T09:43:48Z
- **Completed:** 2026-01-28T09:48:07Z
- **Tasks:** 7
- **Files modified:** 7

## Accomplishments
- Created quota enforcement helper module with singleton QuotaService, enforceQuota, and consumeCredits
- Added credit checking and consumption to all 6 AI-powered API endpoints
- Endpoints return 402 with usage details when credits exhausted
- Non-AI endpoints (image-transform, process-adjustments, art-director) remain ungated

## Task Commits

Each task was committed atomically:

1. **Task 1: Create quota enforcement helper** - `32f4942` (feat)
2. **Task 2: Add quota to generate-images** - `fe5826b` (feat)
3. **Task 3: Add quota to generate-video** - `03b087d` (feat)
4. **Task 4: Add quota to edit-image** - `86f6d65` (feat)
5. **Task 5: Add quota to upscale-image** - `b929e6b` (feat)
6. **Task 6: Add quota to remove-background** - `7030999` (feat)
7. **Task 7: Add quota to collection generate** - `0eb6407` (feat)

**Type fix:** `80fc81d` (fix: edit-image quota type compatibility)

## Files Created/Modified
- `apps/epox-platform/lib/services/quota.ts` - Singleton QuotaService, enforceQuota, consumeCredits helpers
- `apps/epox-platform/app/api/generate-images/route.ts` - Quota enforcement (cost = products * variants)
- `apps/epox-platform/app/api/generate-video/route.ts` - Quota enforcement (cost = 1)
- `apps/epox-platform/app/api/edit-image/route.ts` - Quota enforcement (cost = 1)
- `apps/epox-platform/app/api/upscale-image/route.ts` - Quota enforcement (cost = 1), added context param
- `apps/epox-platform/app/api/remove-background/route.ts` - Quota enforcement (cost = 1), added context param
- `apps/epox-platform/app/api/collections/[id]/generate/route.ts` - Quota enforcement (cost = total images across flows)

## Decisions Made
- enforceQuota returns `NextResponse | null` instead of throwing: the `withSecurity` middleware catch block converts all errors to 500, so returning a NextResponse directly preserves the 402 status code
- upscale-image and remove-background handlers needed `context` parameter added since they only used `request` before

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed enforceQuota from throw to return pattern**
- **Found during:** Task 2 (generate-images endpoint)
- **Issue:** withSecurity middleware catches all errors and returns 500, so throwing a 402 error would be converted to 500
- **Fix:** Changed enforceQuota to return NextResponse|null instead of throwing
- **Files modified:** apps/epox-platform/lib/services/quota.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** fe5826b (part of task 2 commit)

**2. [Rule 1 - Bug] Fixed edit-image return type mismatch**
- **Found during:** TypeScript verification
- **Issue:** enforceQuota returns `NextResponse<unknown>` but edit-image handler expects `NextResponse<EditImageResponse>`
- **Fix:** Added type cast `as NextResponse<EditImageResponse>`
- **Files modified:** apps/epox-platform/app/api/edit-image/route.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 80fc81d

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All AI generation endpoints now enforce credit quotas
- Phase 1 complete: quota schema, service, enforcement, and tests all in place
- Ready for Phase 2 (Subscription Tiers & Payment Integration)

---
*Phase: phase-1-credit-system*
*Completed: 2026-01-28*
