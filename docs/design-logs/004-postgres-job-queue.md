# Design Log #004: PostgreSQL Job Queue with Railway Worker

## Background

The current image generation architecture uses:

- **Redis (Upstash)** for job queue via BullMQ
- **Cloud Run** for worker deployment
- **scenergy-queue** package for queue abstraction

This adds complexity and cost (~$20-50/mo) for a workload that PostgreSQL can handle efficiently.

## Problem

We want to simplify to:

- Use **existing PostgreSQL (Neon)** for job persistence
- Deploy a **single Node.js worker on Railway** (~$5/mo)
- Remove Redis/BullMQ dependency entirely
- Support configurable concurrency and rate limits
- Handle errors with automatic retry and exponential backoff

## Questions and Answers

1. **Q: Should jobs be stored in a new table or extend `generation_flow`?**
   A: New table `generation_job`. Flows are user-facing concepts; jobs are internal processing units. One flow may spawn multiple jobs (variants).

2. **Q: How do we prevent multiple workers from claiming the same job?**
   A: PostgreSQL `FOR UPDATE SKIP LOCKED` provides atomic job claiming without distributed locks.

3. **Q: How do we handle rate limiting (e.g., 60 RPM Gemini limit)?**
   A: Token bucket implemented in-memory with configurable `maxJobsPerMinute`. Jobs wait if rate exceeded.

4. **Q: How do we handle retries?**
   A: Jobs have `attempts` counter and `maxAttempts`. Failed jobs are re-queued with exponential backoff via `scheduledFor` timestamp.

5. **Q: Where does the worker run?**
   A: Railway (or Fly.io) with always-on deployment. PostgreSQL `LISTEN/NOTIFY` for instant job notification (optional optimization).

6. **Q: How do we track job status for frontend polling?**
   A: Job status stored directly in `generation_job` table. Frontend polls `/api/jobs/:id` which queries PostgreSQL.

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      New Architecture                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐     ┌─────────────────────────────────────────┐│
│  │  Vercel    │────▶│  Node.js Worker (Railway)               ││
│  │ (Next.js)  │     │                                         ││
│  │            │     │  ┌─────────┐ ┌─────────┐ ┌─────────┐   ││
│  │ POST /api/ │     │  │Worker 1 │ │Worker 2 │ │Worker N │   ││
│  │ generate   │     │  │  await  │ │  await  │ │  await  │   ││
│  │            │     │  │ Gemini  │ │ Gemini  │ │ Gemini  │   ││
│  └────────────┘     │  └────┬────┘ └────┬────┘ └────┬────┘   ││
│        │            │       └───────────┼───────────┘         ││
│        │            │              Poll + Claim                ││
│        ▼            └──────────────────┬──────────────────────┘│
│  ┌─────────────────────────────────────┴───────────────────┐   │
│  │                    PostgreSQL (Neon)                     │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              generation_job table                │    │   │
│  │  │  - Pending jobs (status = 'pending')            │    │   │
│  │  │  - Processing jobs (status = 'processing')      │    │   │
│  │  │  - Completed/Failed with results                │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- New table: generation_job
CREATE TABLE generation_job (
  id TEXT PRIMARY KEY DEFAULT 'job_' || gen_random_uuid()::text,

  -- References
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  flow_id TEXT REFERENCES generation_flow(id) ON DELETE SET NULL,

  -- Job type and payload
  type TEXT NOT NULL CHECK (type IN ('image_generation', 'image_edit', 'batch_generation')),
  payload JSONB NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Results
  result JSONB,  -- { imageUrls: string[], imageIds: string[] }
  error TEXT,

  -- Retry handling
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- For delayed retry

  -- Worker tracking (prevents double-processing)
  locked_by TEXT,
  locked_at TIMESTAMPTZ,

  -- Priority (lower = higher priority)
  priority INTEGER NOT NULL DEFAULT 100,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Indexes for efficient polling
  CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100)
);

-- Index for claiming pending jobs efficiently
CREATE INDEX idx_generation_job_claimable ON generation_job(priority, created_at)
  WHERE status = 'pending' AND scheduled_for <= NOW();

-- Index for job lookup by flow
CREATE INDEX idx_generation_job_flow ON generation_job(flow_id);

-- Index for client's jobs
CREATE INDEX idx_generation_job_client ON generation_job(client_id, created_at DESC);

-- Function to notify on new jobs (optional optimization)
CREATE OR REPLACE FUNCTION notify_new_job() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_generation_job', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generation_job_notify
  AFTER INSERT ON generation_job
  FOR EACH ROW EXECUTE FUNCTION notify_new_job();
```

### Drizzle Schema

```typescript
// packages/visualizer-db/src/schema/jobs.ts
import { pgTable, text, timestamp, jsonb, integer, index, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { client } from './auth';
import { generationFlow } from './sessions';

export type JobType = 'image_generation' | 'image_edit' | 'batch_generation';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ImageGenerationPayload {
  prompt: string;
  productIds: string[];
  settings: {
    aspectRatio?: string;
    imageQuality?: string;
    variants?: number;
  };
  productImageUrls?: string[];
  inspirationImageUrl?: string;
}

export interface ImageEditPayload {
  sourceImageUrl: string;
  editPrompt: string;
  referenceImages?: Array<{ url: string; componentName: string }>;
}

export interface JobResult {
  imageUrls: string[];
  imageIds: string[];
  duration?: number;
}

export const generationJob = pgTable(
  'generation_job',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `job_${crypto.randomUUID()}`),

    // References
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    flowId: text('flow_id').references(() => generationFlow.id, { onDelete: 'set null' }),

    // Job type and payload
    type: text('type').$type<JobType>().notNull(),
    payload: jsonb('payload').$type<ImageGenerationPayload | ImageEditPayload>().notNull(),

    // Status
    status: text('status').$type<JobStatus>().notNull().default('pending'),
    progress: integer('progress').notNull().default(0),

    // Results
    result: jsonb('result').$type<JobResult>(),
    error: text('error'),

    // Retry handling
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull().defaultNow(),

    // Worker tracking
    lockedBy: text('locked_by'),
    lockedAt: timestamp('locked_at', { withTimezone: true }),

    // Priority
    priority: integer('priority').notNull().default(100),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_generation_job_claimable')
      .on(table.priority, table.createdAt)
      .where(sql`${table.status} = 'pending' AND ${table.scheduledFor} <= NOW()`),
    index('idx_generation_job_flow').on(table.flowId),
    index('idx_generation_job_client').on(table.clientId, table.createdAt),
  ]
);

export const generationJobRelations = relations(generationJob, ({ one }) => ({
  client: one(client, {
    fields: [generationJob.clientId],
    references: [client.id],
  }),
  flow: one(generationFlow, {
    fields: [generationJob.flowId],
    references: [generationFlow.id],
  }),
}));
```

### Worker Service

```typescript
// services/generation-worker/src/worker.ts
import { eq, and, sql, lte } from 'drizzle-orm';
import { db } from 'visualizer-db';
import { generationJob, type JobStatus } from 'visualizer-db/schema';
import { getGeminiService } from 'visualizer-ai';
import { saveGeneratedImage } from './persistence';

export interface WorkerConfig {
  concurrency: number; // Number of concurrent workers (default: 5)
  maxJobsPerMinute: number; // Rate limit (default: 60)
  pollIntervalMs: number; // How often to poll for jobs (default: 1000)
  jobTimeoutMs: number; // Max time per job (default: 120000)
  workerId: string; // Unique worker identifier
}

const DEFAULT_CONFIG: WorkerConfig = {
  concurrency: 5,
  maxJobsPerMinute: 60,
  pollIntervalMs: 1000,
  jobTimeoutMs: 120_000,
  workerId: `worker_${process.pid}_${Date.now()}`,
};

export class GenerationWorker {
  private config: WorkerConfig;
  private isRunning = false;
  private activeJobs = 0;

  // Rate limiter state
  private jobsThisMinute = 0;
  private minuteStart = Date.now();

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log(`🚀 Worker started: ${this.config.workerId}`);
    console.log(`   Concurrency: ${this.config.concurrency}`);
    console.log(`   Rate limit: ${this.config.maxJobsPerMinute} jobs/min`);

    // Start multiple worker loops
    const workers = Array(this.config.concurrency)
      .fill(0)
      .map((_, i) => this.workerLoop(i));

    await Promise.all(workers);
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping worker...');
    this.isRunning = false;

    // Wait for active jobs to complete
    while (this.activeJobs > 0) {
      console.log(`   Waiting for ${this.activeJobs} active jobs...`);
      await this.sleep(1000);
    }

    console.log('✅ Worker stopped');
  }

  private async workerLoop(workerId: number): Promise<void> {
    while (this.isRunning) {
      // Check rate limit
      if (!this.canProcessJob()) {
        await this.sleep(100);
        continue;
      }

      const job = await this.claimJob();

      if (!job) {
        await this.sleep(this.config.pollIntervalMs);
        continue;
      }

      this.activeJobs++;
      this.jobsThisMinute++;

      try {
        await this.processJob(job);
      } catch (err) {
        console.error(`❌ Worker ${workerId} job ${job.id} failed:`, err);
      } finally {
        this.activeJobs--;
      }
    }
  }

  private canProcessJob(): boolean {
    // Reset counter every minute
    const now = Date.now();
    if (now - this.minuteStart >= 60_000) {
      this.jobsThisMinute = 0;
      this.minuteStart = now;
    }

    return this.jobsThisMinute < this.config.maxJobsPerMinute;
  }

  private async claimJob() {
    // Atomic claim with FOR UPDATE SKIP LOCKED
    const [job] = await db.execute(sql`
      UPDATE generation_job
      SET 
        status = 'processing',
        locked_by = ${this.config.workerId},
        locked_at = NOW(),
        started_at = NOW(),
        attempts = attempts + 1
      WHERE id = (
        SELECT id FROM generation_job
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
        ORDER BY priority ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `);

    return job as typeof generationJob.$inferSelect | undefined;
  }

  private async processJob(job: typeof generationJob.$inferSelect): Promise<void> {
    const startTime = Date.now();
    console.log(`🎨 Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

    try {
      let result: { imageUrls: string[]; imageIds: string[] };

      switch (job.type) {
        case 'image_generation':
          result = await this.processImageGeneration(job);
          break;
        case 'image_edit':
          result = await this.processImageEdit(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark as completed
      await db
        .update(generationJob)
        .set({
          status: 'completed',
          progress: 100,
          result: { ...result, duration: Date.now() - startTime },
          completedAt: new Date(),
          lockedBy: null,
          lockedAt: null,
        })
        .where(eq(generationJob.id, job.id));

      console.log(`✅ Job ${job.id} completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.handleJobError(job, errorMsg);
    }
  }

  private async processImageGeneration(job: typeof generationJob.$inferSelect) {
    const payload = job.payload as ImageGenerationPayload;
    const gemini = getGeminiService();
    const savedImages: Array<{ url: string; id: string }> = [];
    const variants = payload.settings?.variants ?? 1;

    for (let i = 0; i < variants; i++) {
      // Update progress
      const progress = Math.round(((i + 1) / variants) * 90);
      await db.update(generationJob).set({ progress }).where(eq(generationJob.id, job.id));

      const result = await gemini.generateImages({
        prompt: payload.prompt,
        aspectRatio: payload.settings?.aspectRatio,
        imageQuality: payload.settings?.imageQuality,
        count: 1,
      });

      if (result.images[0]?.url) {
        const saved = await saveGeneratedImage({
          clientId: job.clientId,
          flowId: job.flowId,
          productIds: payload.productIds,
          prompt: payload.prompt,
          jobId: job.id,
          base64Data: result.images[0].url,
          settings: payload.settings,
        });
        savedImages.push(saved);
      }
    }

    return {
      imageUrls: savedImages.map((s) => s.url),
      imageIds: savedImages.map((s) => s.id),
    };
  }

  private async processImageEdit(job: typeof generationJob.$inferSelect) {
    const payload = job.payload as ImageEditPayload;
    const gemini = getGeminiService();

    const result = await gemini.editImage({
      baseImageDataUrl: payload.sourceImageUrl,
      prompt: payload.editPrompt,
      referenceImages: payload.referenceImages,
    });

    if (!result.editedImageDataUrl) {
      throw new Error('Edit returned no image');
    }

    const saved = await saveGeneratedImage({
      clientId: job.clientId,
      flowId: job.flowId,
      prompt: payload.editPrompt,
      jobId: job.id,
      base64Data: result.editedImageDataUrl,
    });

    return {
      imageUrls: [saved.url],
      imageIds: [saved.id],
    };
  }

  private async handleJobError(job: typeof generationJob.$inferSelect, errorMsg: string): Promise<void> {
    const canRetry = job.attempts < job.maxAttempts;

    if (canRetry) {
      // Exponential backoff: 10s, 40s, 90s, ...
      const delaySeconds = Math.pow(job.attempts, 2) * 10;
      const scheduledFor = new Date(Date.now() + delaySeconds * 1000);

      console.log(`⏳ Job ${job.id} failed, scheduling retry in ${delaySeconds}s`);

      await db
        .update(generationJob)
        .set({
          status: 'pending',
          error: errorMsg,
          scheduledFor,
          lockedBy: null,
          lockedAt: null,
        })
        .where(eq(generationJob.id, job.id));
    } else {
      console.log(`❌ Job ${job.id} failed permanently after ${job.attempts} attempts`);

      await db
        .update(generationJob)
        .set({
          status: 'failed',
          error: errorMsg,
          completedAt: new Date(),
          lockedBy: null,
          lockedAt: null,
        })
        .where(eq(generationJob.id, job.id));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Worker Entry Point

```typescript
// services/generation-worker/src/index.ts
import { GenerationWorker } from './worker';

const config = {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10),
  maxJobsPerMinute: parseInt(process.env.MAX_JOBS_PER_MINUTE ?? '60', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? '1000', 10),
  jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS ?? '120000', 10),
  workerId: process.env.WORKER_ID ?? `worker_${process.pid}`,
};

const worker = new GenerationWorker(config);

// Graceful shutdown
process.on('SIGTERM', () => worker.stop());
process.on('SIGINT', () => worker.stop());

worker.start().catch(console.error);
```

### API Routes (Vercel)

```typescript
// apps/scenergy-visualizer/app/api/jobs/enqueue/route.ts
import { db } from 'visualizer-db';
import { generationJob, type ImageGenerationPayload } from 'visualizer-db/schema';
import { getServerSession } from 'visualizer-auth';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.clientId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { type, payload, flowId, priority } = body;

  const [job] = await db
    .insert(generationJob)
    .values({
      clientId: session.clientId,
      flowId,
      type,
      payload,
      priority: priority ?? 100,
    })
    .returning();

  return Response.json({ jobId: job.id });
}

// apps/scenergy-visualizer/app/api/jobs/[id]/route.ts
import { db } from 'visualizer-db';
import { generationJob } from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const [job] = await db.select().from(generationJob).where(eq(generationJob.id, params.id));

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  return Response.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
}
```

## Implementation Plan

### Phase 1: Database Schema (Day 1)

1. Add `generation_job` table to `visualizer-db/src/schema/jobs.ts`
2. Export from schema index
3. Create and run migration
4. Add indexes for efficient polling

### Phase 2: Worker Service (Day 2-3)

1. Create `services/generation-worker/` directory
2. Implement `GenerationWorker` class with:
   - Concurrent job processing
   - Rate limiting
   - Retry with exponential backoff
3. Add persistence utilities (reuse from scenergy-queue)
4. Add health check endpoint

### Phase 3: API Integration (Day 4)

1. Update `/api/generate-images` to insert into `generation_job`
2. Add `/api/jobs/:id` for status polling
3. Add `/api/jobs/flow/:flowId` for flow job listing
4. Update frontend to use new endpoints

### Phase 4: Deployment (Day 5)

1. Deploy worker to Railway
2. Configure environment variables
3. Test end-to-end flow
4. Monitor and tune concurrency/rate limits

### Phase 5: Cleanup (Day 6)

1. Remove `scenergy-queue` package
2. Remove Cloud Run deployment files
3. Remove Redis/Upstash configuration
4. Update documentation

## Examples

### ✅ Good: Job Enqueue

```typescript
// Simple enqueue - just insert into database
const [job] = await db
  .insert(generationJob)
  .values({
    clientId: session.clientId,
    flowId: flowId,
    type: 'image_generation',
    payload: {
      prompt: 'A modern living room with oak furniture',
      productIds: ['prod_1', 'prod_2'],
      settings: { variants: 4, aspectRatio: '16:9' },
    },
  })
  .returning();

return { jobId: job.id };
```

### ✅ Good: Job Status Check

```typescript
// Direct database query - no Redis needed
const job = await db.query.generationJob.findFirst({
  where: eq(generationJob.id, jobId),
  columns: {
    id: true,
    status: true,
    progress: true,
    result: true,
    error: true,
  },
});
```

### ❌ Bad: No retry handling

```typescript
// Missing retry logic - job fails permanently
try {
  await processJob(job);
} catch (e) {
  await db.update(generationJob).set({ status: 'failed', error: e.message }).where(eq(generationJob.id, job.id));
}
```

### ✅ Good: Retry with backoff

```typescript
// Proper retry with exponential backoff
const canRetry = job.attempts < job.maxAttempts;
if (canRetry) {
  const delaySeconds = Math.pow(job.attempts, 2) * 10;
  await db
    .update(generationJob)
    .set({
      status: 'pending',
      scheduledFor: new Date(Date.now() + delaySeconds * 1000),
      error: errorMsg,
    })
    .where(eq(generationJob.id, job.id));
}
```

## Trade-offs

| Decision                         | Pros                                         | Cons                            |
| -------------------------------- | -------------------------------------------- | ------------------------------- |
| **PostgreSQL over Redis**        | Single DB, ACID, rich queries, no extra cost | ~10-20ms latency vs ~1-5ms      |
| **Polling over Pub/Sub**         | Simpler, no connection management            | Slight delay (1s poll interval) |
| **In-memory rate limiter**       | No external dependency                       | Resets on worker restart        |
| **Single worker service**        | Simple deployment, low cost                  | Manual scaling (add instances)  |
| **Job table separate from flow** | Clean separation, retryable                  | Extra join for flow context     |

## Configuration Reference

| Variable              | Default | Description                         |
| --------------------- | ------- | ----------------------------------- |
| `WORKER_CONCURRENCY`  | 5       | Number of concurrent job processors |
| `MAX_JOBS_PER_MINUTE` | 60      | Rate limit (match Gemini tier)      |
| `POLL_INTERVAL_MS`    | 1000    | How often to check for new jobs     |
| `JOB_TIMEOUT_MS`      | 120000  | Max time per job before timeout     |
| `WORKER_ID`           | auto    | Unique identifier for this worker   |

## Scaling Guide

| RPM Target | Concurrency | Workers | Railway Plan     |
| ---------- | ----------- | ------- | ---------------- |
| 60         | 5           | 1       | Hobby ($5/mo)    |
| 200        | 50          | 1       | Starter ($10/mo) |
| 500        | 50          | 2       | Starter × 2      |
| 1000       | 60          | 4       | Pro ($20/mo)     |

## What Gets Removed

```diff
- packages/scenergy-queue/           # Entire package
- services/ai-worker/                # Cloud Run worker
-   cloudbuild.yaml
-   Dockerfile
- Redis/Upstash dependency
- BullMQ dependency
```

## Migration Path

1. Deploy new worker alongside existing (both consume from their queues)
2. Switch API to enqueue to PostgreSQL
3. Wait for Redis queue to drain
4. Remove old infrastructure

---

## Implementation Results

### Completed Implementation (2025)

The PostgreSQL job queue was successfully implemented with the following architecture:

#### What Was Built

1. **Database Schema** (`visualizer-db/src/schema/jobs.ts`)
   - `generation_job` table with all planned fields
   - Support for `image_generation`, `image_edit`, and `video_generation` job types
   - Four indexes for efficient querying

2. **Repository Pattern** (`visualizer-db/src/repositories/generation-jobs.ts`)
   - Atomic `claimJob()` using `FOR UPDATE SKIP LOCKED`
   - Full retry scheduling with exponential backoff
   - CRUD operations with proper type mapping

3. **Worker Service** (`services/generation-worker/`)
   - LISTEN/NOTIFY for instant job pickup
   - Fallback polling for reliability
   - Graceful shutdown handling
   - Better Stack + Sentry logging

4. **Video Generation Support**
   - Two-phase async model (start → poll)
   - `operationName` preserved in payload
   - Special retry logic that doesn't clear video operation state

#### Deviations from Original Design

| Planned | Actual | Reason |
|---------|--------|--------|
| `batch_generation` job type | Removed | Not needed - use multiple `image_generation` jobs |
| `POLL_INTERVAL_MS` config | Changed to `FALLBACK_POLL_MS` | LISTEN/NOTIFY is primary; polling is fallback |
| Static `idx_generation_job_claimable` partial index | Regular composite index | Drizzle ORM doesn't support partial index WHERE clause well |
| Redis for rate limiting | In-memory only | Single worker instance doesn't need distributed rate limiting |

---

## Production Analysis

### Current Architecture Strengths

1. **Zero-polling with LISTEN/NOTIFY**: Jobs picked up instantly (~10ms) vs polling delay
2. **Atomic claiming**: `FOR UPDATE SKIP LOCKED` prevents race conditions with zero external locks
3. **Cost effective**: ~$5/mo Railway vs $20-50/mo Redis + Cloud Run
4. **Rich queryability**: Can filter by client, flow, status, priority with standard SQL
5. **ACID guarantees**: Job state is always consistent

### Current Limitations

#### 1. Stale Lock Problem
**Issue**: If worker crashes mid-job, `locked_by`/`locked_at` remain set indefinitely.

**Current mitigation**: Railway's `restartPolicyType: ON_FAILURE` eventually restarts, but orphaned jobs stay locked.

**Production necessity**: Add stale lock cleanup:
```sql
-- Jobs locked for >15 minutes are considered abandoned
UPDATE generation_job
SET status = 'pending', locked_by = NULL, locked_at = NULL
WHERE status = 'processing'
  AND locked_at < NOW() - INTERVAL '15 minutes';
```

#### 2. No Dead Letter Queue
**Issue**: Jobs that fail `maxAttempts` times are marked `failed` but never alerted on.

**Production necessity**:
- Sentry alerts for failed jobs (partially implemented)
- Consider: Separate `dead_letter_job` table for manual review

#### 3. Single Region Deployment
**Issue**: Worker runs in `us-west2` only; Neon may be in different region.

**Impact**: ~50-100ms added latency per DB call if cross-region.

**Recommendation**: Co-locate worker with Neon region (check Neon dashboard).

#### 4. No Job Deduplication
**Issue**: Nothing prevents enqueueing duplicate jobs (same payload).

**Mitigation**: Client-side dedup before enqueue, or add hash column:
```sql
payload_hash TEXT GENERATED ALWAYS AS (md5(payload::text)) STORED,
UNIQUE (client_id, payload_hash, status) WHERE status = 'pending'
```

#### 5. No Queue Depth Monitoring
**Issue**: No alerts when queue backs up.

**Production necessity**: Add monitoring for `pending` count threshold.

---

## Optimization Recommendations

### High Priority (Production Necessities)

#### 1. Stale Lock Cleanup Cron
Add to worker startup or as separate Railway cron:
```typescript
async function cleanupStaleLocks(db: DrizzleClient): Promise<number> {
  const result = await db.execute(sql`
    UPDATE generation_job
    SET status = 'pending', locked_by = NULL, locked_at = NULL,
        error = 'Lock expired - worker likely crashed'
    WHERE status = 'processing'
      AND locked_at < NOW() - INTERVAL '15 minutes'
    RETURNING id
  `);
  return result.rows.length;
}

// Call on startup and every 5 minutes
setInterval(() => cleanupStaleLocks(db), 5 * 60 * 1000);
```

#### 2. Queue Depth Alerting
Add to health endpoint or monitoring:
```typescript
const stats = await jobs.getStats();
if (stats.pending > 100) {
  logger.warn({ queueDepth: stats.pending }, 'Queue depth exceeds threshold');
  // Send to Sentry/PagerDuty
}
```

#### 3. Failed Job Alerts
Already logging to Sentry, but add explicit alert:
```typescript
// In handleJobError when canRetry === false
Sentry.captureMessage(`Job permanently failed: ${job.id}`, {
  level: 'error',
  tags: { jobType: job.type, clientId: job.clientId },
  extra: { attempts: job.attempts, error: errorMsg }
});
```

### Medium Priority (Performance)

#### 4. Batch Progress Updates
Current: One UPDATE per progress tick (0→10→20→...→90)
Optimization: Only update every 25% to reduce DB writes:
```typescript
const shouldUpdate = progress % 25 === 0 || progress === 100;
if (shouldUpdate) {
  await this.jobs.updateProgress(job.id, progress);
}
```

#### 5. Connection Pooling Tuning
Current: Default pool size for Neon serverless.
Recommendation: Tune based on concurrency:
```typescript
// In worker config
const poolSize = Math.min(this.config.concurrency + 2, 20);
```

#### 6. Partial Index for Claimable Jobs
Migrate to raw SQL migration for true partial index:
```sql
DROP INDEX IF EXISTS idx_generation_job_claimable;
CREATE INDEX idx_generation_job_claimable
ON generation_job(priority, created_at)
WHERE status = 'pending' AND scheduled_for <= NOW();
```

### Low Priority (Nice to Have)

#### 7. Job Metrics Dashboard
Expose Prometheus-compatible metrics:
```typescript
// /metrics endpoint
generation_jobs_total{status="completed"} 1234
generation_jobs_total{status="failed"} 12
generation_jobs_processing_seconds_bucket{le="30"} 1100
generation_jobs_queue_depth 5
```

#### 8. Priority Queue Tuning
Current: Single priority level (100 default).
Enhancement: Use priority for:
- Paid clients: priority = 50
- Free tier: priority = 100
- Retries: priority = original + (attempts * 10)

---

## Scaling Guidelines

### Current Capacity
- **1 worker, 5 concurrency**: ~60 jobs/minute (Gemini rate limit)
- **Queue throughput**: PostgreSQL handles 1000+ claims/second easily

### Horizontal Scaling
```
Workers × Concurrency ≤ Gemini RPM limit
```

| Target RPM | Workers | Concurrency/Worker | Config |
|------------|---------|-------------------|--------|
| 60 | 1 | 5 | Current |
| 200 | 2 | 10 | Scale tier |
| 1000 | 4 | 25 | Enterprise |

### Vertical Scaling
Railway Hobby → Pro unlocks:
- More memory (important for video processing)
- Better CPU burst
- Multiple replicas in same service

---

## Monitoring Checklist

### Required Alerts
- [ ] Queue depth > 100 for > 5 minutes
- [ ] Failed jobs > 10 in 1 hour
- [ ] Worker health check fails
- [ ] Processing time p99 > 2 minutes

### Dashboard Metrics
- [ ] Jobs completed/failed per hour
- [ ] Average processing time by job type
- [ ] Queue depth over time
- [ ] Retry rate (attempts > 1)

### Log Queries (Better Stack)
```
# Failed jobs
level:error jobId:* willRetry:false

# Slow jobs (>60s)
job_success durationMs:>60000

# High retry jobs
job_claimed attempt:>2
```

---

## Security Considerations

1. **Client isolation**: Jobs filtered by `clientId` in all queries ✓
2. **No credential exposure**: API keys in env vars only ✓
3. **Input validation**: Payload validated at API layer ✓
4. **Rate limiting**: Per-worker rate limit prevents abuse ✓

### Not Implemented (consider for enterprise)
- Per-client rate limiting (currently global)
- Job payload encryption at rest
- Audit log for job state changes

---

## Auto-Scaling Architecture (v2)

### Overview

Added auto-scaling worker pool with Redis coordination:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Auto-Scaling Generation System                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────────────────┐  │
│  │   Vercel     │─────▶│  PostgreSQL  │◀─────│     Autoscaler          │  │
│  │   (API)      │      │   (Neon)     │      │  (Railway - always on)  │  │
│  └──────────────┘      │              │      │                         │  │
│                        │ generation_  │      │  • Monitors queue depth │  │
│                        │ job table    │      │  • Scales workers 0→N   │  │
│                        └──────────────┘      │  • Calls Railway API    │  │
│                              ▲               └───────────┬──────────────┘  │
│                              │                           │                 │
│                              │                    Scale up/down            │
│                              │                           │                 │
│                        ┌─────┴─────┐                     ▼                 │
│                        │   Redis   │      ┌──────────────────────────────┐ │
│                        │ (Railway) │◀────▶│      Worker Pool (0-N)       │ │
│                        │           │      │  ┌────────┐ ┌────────┐      │ │
│                        │ • Rate    │      │  │Worker 1│ │Worker 2│ ...  │ │
│                        │   Limit   │      │  └────────┘ └────────┘      │ │
│                        │ • Config  │      │                              │ │
│                        └───────────┘      │  • Claim jobs from PG       │ │
│                                           │  • Check rate limit (Redis) │ │
│                                           │  • Process with Gemini      │ │
│                                           └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scaling Logic

| Queue Depth | Desired Workers | Reasoning |
|-------------|-----------------|-----------|
| 0 jobs | 0 workers | No work, save money |
| 1-10 jobs | 1 worker | Light load |
| 11-30 jobs | 2 workers | Moderate load |
| 31-60 jobs | 3 workers | Heavy load |
| 61-100 jobs | 4 workers | Very heavy |
| 100+ jobs | 5 workers (max) | Cap to respect rate limit |

**Cooldowns:**
- Scale up: 30 seconds between scaling actions
- Scale down: 2 minutes (prevent thrashing)

### Redis Keys

| Key | Purpose |
|-----|---------|
| `worker:rpm:<window>` | Current minute's request count |
| `worker:config:rpm_limit` | Global RPM limit (60) |
| `worker:config:per_worker_rpm` | Per-worker allocation (60/N) |
| `worker:config:max_workers` | Maximum worker count |
| `worker:count` | Current worker count |
| `worker:last_scale_up` | Timestamp of last scale up |
| `worker:last_scale_down` | Timestamp of last scale down |

### Cost Estimate

| Component | Always On | Monthly Cost |
|-----------|-----------|--------------|
| Autoscaler | Yes | ~$0.50-1.00 |
| Redis | Yes | ~$1.00-1.50 |
| Workers (idle) | No | $0.00 |
| Workers (per job burst) | Variable | ~$0.001-0.03 per burst |

**Total fixed cost:** ~$2.50/mo
**Variable cost:** Depends on job volume

### New Services

1. **`services/worker-autoscaler/`** - Monitors queue, scales workers via Railway API
2. **`services/generation-worker/src/rate-limiter.ts`** - Distributed rate limiting with Redis

### Environment Variables (Autoscaler)

| Variable | Required | Description |
|----------|----------|-------------|
| `RAILWAY_API_TOKEN` | Yes | Railway API token for scaling |
| `RAILWAY_PROJECT_ID` | Yes | Railway project ID |
| `RAILWAY_ENVIRONMENT_ID` | Yes | Railway environment ID |
| `RAILWAY_WORKER_SERVICE_ID` | Yes | Worker service ID to scale |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_URL` | Yes | Redis connection |
| `MAX_WORKERS` | No | Maximum workers (default: 5) |
| `MIN_WORKERS` | No | Minimum workers (default: 0) |
| `GLOBAL_RPM_LIMIT` | No | Total RPM limit (default: 60) |

### Environment Variables (Worker - Updated)

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | No | Redis for distributed rate limiting |
| (all existing vars) | | |

When `REDIS_URL` is set, workers use distributed rate limiting. Otherwise falls back to in-memory (single worker only).
