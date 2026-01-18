# Migration Notes: Redis → PostgreSQL Queue

## Summary

Replaced Redis/BullMQ-based job queue with PostgreSQL-based queue.

## What Changed

### New Files
- `packages/visualizer-db/src/schema/jobs.ts` - Job schema
- `packages/visualizer-db/sql-migrations/004_add_generation_job.sql` - Migration
- `services/generation-worker/` - New PostgreSQL-based worker
- `apps/scenergy-visualizer/lib/services/job-queue/` - New queue client

### Modified Files  
- `apps/scenergy-visualizer/lib/services/image-generation/index.ts` - Now exports from job-queue

### Files to Remove (After Testing)

Once confirmed working, these can be deleted:

```
# Old Redis-based queue (in-process generation)
apps/scenergy-visualizer/lib/services/image-generation/queue.ts

# Old Redis client
apps/scenergy-visualizer/lib/services/redis/

# Old BullMQ-based queue package
packages/scenergy-queue/

# Old Cloud Run worker
services/ai-worker/
```

### Dependencies to Remove

From `apps/scenergy-visualizer/package.json`:
- `@upstash/redis` (if only used for job queue)

From root `package.json` workspace:
- Can remove `packages/scenergy-queue` from workspaces

## Environment Variables

### No Longer Needed
- `UPSTASH_REDIS_URL` / `REDIS_URL` (for queue - may still need for rate limiting)

### Still Needed
- `DATABASE_URL` (PostgreSQL)
- `GEMINI_API_KEY`
- `R2_*` (storage)

## Rollback Plan

If issues arise:
1. Revert `apps/scenergy-visualizer/lib/services/image-generation/index.ts`
2. Old Redis queue will resume working
3. New `generation_job` table can remain (no impact)

