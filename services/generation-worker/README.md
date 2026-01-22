# Generation Worker

PostgreSQL-based generation worker for Railway deployment. Processes image generation, image editing, and video generation jobs.

## Architecture

```
┌─────────────┐     ┌────────────────────────┐     ┌─────────────┐
│   Vercel    │────▶│  PostgreSQL (Neon)     │◀────│   Railway   │
│  (Next.js)  │     │  generation_job table  │     │   Worker    │
└─────────────┘     └────────────────────────┘     └──────┬──────┘
                              │                          │
                              │ LISTEN/NOTIFY            │
                              │ (instant pickup)         │
                              └──────────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                       ┌─────────────┐      ┌─────────────┐
                       │ Gemini API  │      │  R2 Storage │
                       └─────────────┘      └─────────────┘
```

## Job Claiming Mechanism

Uses PostgreSQL `FOR UPDATE SKIP LOCKED` for race-condition-free job claiming:

```sql
UPDATE generation_job
SET status = 'processing', locked_by = $workerId, locked_at = NOW()
WHERE id = (
  SELECT id FROM generation_job
  WHERE status = 'pending' AND scheduled_for <= NOW()
  ORDER BY priority ASC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *
```

**Key features:**
- Atomic claim (no race conditions)
- Priority ordering (lower = higher priority)
- Time-based scheduling (for retries with exponential backoff)
- FIFO within same priority

## Job Types

| Type | Description | Processing Model |
|------|-------------|------------------|
| `image_generation` | Generate images from prompt + reference | Synchronous |
| `image_edit` | Edit existing image with prompt | Synchronous |
| `video_generation` | Generate video from image | Async (start → poll) |

### Video Generation Flow

1. **Phase 1**: Start generation → get `operationName` → re-queue as pending
2. **Phase 2**: Poll every 10s until complete → save video → mark completed

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (Neon) |
| `GEMINI_API_KEY` | Yes | - | Google AI Studio API key |
| `R2_ACCOUNT_ID` | Yes | - | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | Yes | - | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | - | R2 secret key |
| `R2_BUCKET` | Yes | - | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | - | Public URL for R2 bucket |
| `WORKER_CONCURRENCY` | No | 5 | Concurrent job processors |
| `MAX_JOBS_PER_MINUTE` | No | 60 | Rate limit (match Gemini tier) |
| `FALLBACK_POLL_MS` | No | 5000 | Polling interval when LISTEN/NOTIFY unavailable |
| `ENABLE_LISTEN_NOTIFY` | No | true | Set to `false` for Neon free tier |
| `WORKER_ID` | No | auto | Unique worker identifier |
| `REDIS_URL` | No | - | Redis for distributed rate limiting |
| `BETTERSTACK_TOKEN` | No | - | Better Stack logging token |
| `SENTRY_DSN` | No | - | Sentry error tracking |
| `PORT` | No | 8080 | Health check server port |

## Local Development

```bash
# From monorepo root
yarn workspace @repo/generation-worker dev
```

## Railway Deployment

### railway.json

```json
{
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "yarn build",
    "watchPatterns": ["/services/generation-worker/**", "yarn.lock"]
  },
  "deploy": {
    "runtime": "V2",
    "numReplicas": 1,
    "startCommand": "yarn start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "healthcheckTimeout": 30,
    "restartPolicyMaxRetries": 3
  }
}
```

### Deployment Steps

1. Create Railway project
2. Connect GitHub repo
3. Set root directory to `services/generation-worker`
4. Add environment variables
5. Deploy

## Health Check

```
GET /health
```

Response:
```json
{ "status": "healthy", "worker": "running" }
```

## Scaling

### Gemini Tier → Config Mapping

| Gemini Tier | RPM | Recommended Config |
|-------------|-----|-------------------|
| Free | 10 | `MAX_JOBS_PER_MINUTE=10`, `WORKER_CONCURRENCY=2` |
| Pay-as-you-go | 60 | `MAX_JOBS_PER_MINUTE=60`, `WORKER_CONCURRENCY=5` |
| Scale | 1000 | `MAX_JOBS_PER_MINUTE=1000`, `WORKER_CONCURRENCY=50` |

### Horizontal Scaling

For throughput beyond single worker capacity, deploy multiple Railway instances:

```
Total RPM = Workers × MAX_JOBS_PER_MINUTE
```

Each worker claims jobs independently via `FOR UPDATE SKIP LOCKED`.

## Retry Mechanism

- **Max attempts**: 3 (configurable per job)
- **Backoff formula**: `attempts² × 10 seconds`
  - 1st retry: 10s
  - 2nd retry: 40s
  - 3rd retry: 90s
- **Video jobs**: On retry, `operationName` is cleared (restarts from Phase 1)

## Monitoring

### Logging (Better Stack)

| Event | Level | Fields |
|-------|-------|--------|
| `worker_started` | info | workerId, concurrency, mode |
| `job_claimed` | info | jobId, jobType, attempt, maxAttempts |
| `job_progress` | debug | jobId, progress, variant |
| `job_success` | info | jobId, durationMs, result |
| `job_failed` | error | jobId, error, attempt, willRetry |
| `worker_stopped` | info | workerId |

### Log Queries

```
# Failed jobs
level:error jobId:* willRetry:false

# Slow jobs (>60s)
job_success durationMs:>60000

# High retry jobs
job_claimed attempt:>2
```

### Queue Stats

Available via repository:
```typescript
const stats = await jobs.getStats();
// { pending: 5, processing: 2, completed: 100, failed: 3 }
```

## Production Checklist

### Required
- [ ] `DATABASE_URL` set to Neon production
- [ ] `GEMINI_API_KEY` set to production key
- [ ] R2 credentials configured
- [ ] `BETTERSTACK_TOKEN` for logging
- [ ] `SENTRY_DSN` for error tracking
- [ ] Railway health check enabled

### Recommended
- [ ] Set `MAX_JOBS_PER_MINUTE` to match Gemini tier
- [ ] Configure alerts for queue depth > 100
- [ ] Configure alerts for failed jobs > 10/hour
- [ ] Enable stale lock cleanup (see design log)

## Distributed Rate Limiting (Redis)

When `REDIS_URL` is set, workers use **distributed rate limiting** via Redis:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Worker 1   │────▶│    Redis    │◀────│  Worker 2   │
│  INCR rpm   │     │  Atomic     │     │  INCR rpm   │
└─────────────┘     │  Counter    │     └─────────────┘
                    └─────────────┘
                          │
                    Shared count
                    (60 RPM total)
```

**Redis Keys:**
- `worker:rpm:<window>` - Current minute's request count
- `worker:config:per_worker_rpm` - Per-worker allocation (set by autoscaler)

**Without Redis:** Falls back to in-memory rate limiting (single worker only!)

## Auto-Scaling Support

This worker is designed to work with the `worker-autoscaler` service:

1. Autoscaler monitors queue depth
2. Scales workers 0→N via Railway API
3. Updates `worker:config:per_worker_rpm` in Redis
4. Workers automatically respect the distributed rate limit

See `services/worker-autoscaler/` for the autoscaler service.

## Known Limitations

1. **Stale locks**: If worker crashes mid-job, lock remains. Implement cleanup cron.
2. **No deduplication**: Same job can be enqueued multiple times.
3. **Single region**: Worker in us-west2; ensure Neon co-located.
4. **Redis required for multi-worker**: Without Redis, only run 1 worker.

## Related Files

- Schema: `packages/visualizer-db/src/schema/jobs.ts`
- Repository: `packages/visualizer-db/src/repositories/generation-jobs.ts`
- Queue facade: `packages/visualizer-ai/src/generation-queue/index.ts`
- Design log: `docs/design-logs/004-postgres-job-queue.md`
