---
phase: 1-credit-system
plan: 01
subsystem: api
tags: [quota, credits, dashboard, ssr, factory]

requires:
  - phase: none
    provides: foundation plan

provides:
  - QuotaService factory wired to real DB repositories
  - Dashboard API and SSR queries return live credit data
  - Dashboard client displays real quota status

affects: [phase-2-subscriptions, phase-4-usage-dashboard]

tech-stack:
  added: []
  patterns:
    - "createQuotaServiceFromDb(db) factory pattern for wiring services to DB"

key-files:
  created:
    - packages/visualizer-services/src/quota/factory.ts
  modified:
    - packages/visualizer-services/src/quota/index.ts
    - packages/visualizer-services/src/index.ts
    - apps/epox-platform/app/api/dashboard/route.ts
    - apps/epox-platform/lib/server/queries.ts
    - apps/epox-platform/lib/api-client.ts
    - apps/epox-platform/app/(dashboard)/dashboard/dashboard-client.tsx

key-decisions:
  - "Factory accepts DatabaseFacade, not individual repos, for simpler wiring"
  - "Added creditsTotal, plan, usagePercent, resetDate to DashboardStats type"

patterns-established:
  - "createQuotaServiceFromDb(db) to instantiate QuotaService with real DB deps"

duration: 2min
completed: 2026-01-28
---

# Phase 1 Plan 01: Wire QuotaService to Real DB & Replace Hardcoded Credits Summary

**QuotaService factory wired to DB repositories; dashboard API, SSR queries, and client now display live credit data from quota system**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-28T09:39:35Z
- **Completed:** 2026-01-28T09:41:52Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Created `createQuotaServiceFromDb()` factory that wires QuotaService to real UsageRecordRepository and QuotaLimitRepository
- Replaced hardcoded `creditsRemaining: 500` in both dashboard API route and SSR queries with live quota data
- Extended DashboardStats type with `creditsTotal`, `plan`, `usagePercent`, `resetDate`
- Updated dashboard client to use real `creditsTotal` and `resetDate` from API instead of hardcoded values

## Task Commits

Each task was committed atomically:

1. **Task 1: Create QuotaService factory wired to DB repositories** - `22d445e` (feat)
2. **Task 2: Replace hardcoded credits in dashboard API route** - `9eb9349` (feat)
3. **Task 3: Replace hardcoded credits in SSR queries** - `8b614a3` (feat)
4. **Task 4: Update dashboard client to use real quota data** - `486011a` (feat)

## Files Created/Modified
- `packages/visualizer-services/src/quota/factory.ts` - New factory function wiring QuotaService to DatabaseFacade
- `packages/visualizer-services/src/quota/index.ts` - Export new factory
- `packages/visualizer-services/src/index.ts` - Export new factory from package root
- `apps/epox-platform/app/api/dashboard/route.ts` - Live quota data in dashboard API
- `apps/epox-platform/lib/server/queries.ts` - Live quota data in SSR queries
- `apps/epox-platform/lib/api-client.ts` - Extended DashboardStats type
- `apps/epox-platform/app/(dashboard)/dashboard/dashboard-client.tsx` - Use real creditsTotal and resetDate

## Decisions Made
- Factory accepts `DatabaseFacade` rather than individual repos for cleaner API
- Added `creditsTotal`, `plan`, `usagePercent`, `resetDate` to DashboardStats so the client has full quota context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- QuotaService is now wired to real DB and usable across the platform
- Ready for 01-02-PLAN.md (next plan in phase)

---
*Phase: 1-credit-system*
*Completed: 2026-01-28*
